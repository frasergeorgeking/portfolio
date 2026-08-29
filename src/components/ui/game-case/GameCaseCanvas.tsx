import {
	Environment,
	Lightformer,
	useGLTF,
	useTexture,
} from "@react-three/drei";
import {
	Canvas,
	type ThreeEvent,
	useFrame,
	useThree,
} from "@react-three/fiber";
import {
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import * as THREE from "three";
import { signalLazySceneReady } from "@/components/ui/loading/lazySceneEvents";
import LazySceneErrorBoundary from "@/components/ui/loading/SceneErrorBoundary";
import caseGLB from "./psx-case.glb?url";
import type { GameCaseTextureUrls } from "./types";
import { useGameCaseAnimations } from "./useGameCaseAnimations";

const CAMERA_CONFIG = {
	fov: 30,
	subjectRadius: 1.25,
	padding: 1.14,
} as const;

const INTERACTION_CONFIG = {
	turntableSpeed: 0.18,
	dragRotationSpeed: 0.008,
	dragIntentThreshold: 6,
	horizontalIntentRatio: 1.15,
} as const;

const MOMENTUM_CONFIG = {
	damping: 1.85,
	velocitySmoothingMin: 24,
	velocitySmoothingMax: 72,
	maxSpeed: 12,
	settleThreshold: 0.01,
	releaseGrace: 0.05,
	releaseDamping: 8,
} as const;

const MODEL_CONFIG = {
	centerY: -0.794357,
	defaultRotationY: -0.25,
} as const;

const MATERIAL_FINISH = {
	plastic: {
		roughness: 0.22,
		clearcoat: 1,
		clearcoatRoughness: 0.1,
		envMapIntensity: 1.2,
	},
	disc: {
		roughness: 0.02,
		clearcoat: 1,
		clearcoatRoughness: 0,
		envMapIntensity: 1.2,
	},
} as const;

const SURFACE_MESHES = {
	caseBack: "case_back",
	caseFront: "case_front",
	casePromo: "case_promo",
	caseInner: "case_inner",
	discBack: "disc_back",
	discFront: "disc_front",
} as const satisfies Record<keyof GameCaseTextureUrls, string>;

const SURFACES = Object.keys(SURFACE_MESHES) as (keyof GameCaseTextureUrls)[];

interface Props {
	boundaryId: string;
	textureUrls: GameCaseTextureUrls;
	initialRotationY?: number;
}

export default function GameCaseCanvas({
	boundaryId,
	textureUrls,
	initialRotationY = MODEL_CONFIG.defaultRotationY,
}: Props) {
	const canvasMissHandler = useRef<() => void>(() => undefined);

	return (
		<div className="h-full min-h-[420px] w-full select-none">
			<LazySceneErrorBoundary boundaryId={boundaryId}>
				<Canvas
					camera={{ position: [0, 0, 5], fov: CAMERA_CONFIG.fov }}
					frameloop="demand"
					gl={{ alpha: true, antialias: true }}
					style={{ touchAction: "pan-y" }}
					onPointerMissed={() => canvasMissHandler.current()}
					onCreated={({ gl }) => {
						gl.setClearColor(new THREE.Color(0x000000), 0);
					}}
				>
					<ResponsiveCamera />
					<hemisphereLight args={[0xffffff, 0x35354a, 3.25]} />
					<directionalLight intensity={2.4} position={[4, 5, 3]} />
					<directionalLight intensity={1.1} position={[-4, 1, -2]} />
					<Environment resolution={256}>
						<Lightformer
							color="#ffffff"
							intensity={3.75}
							position={[0, 4, -1]}
							rotation={[Math.PI / 2, 0, 0]}
							scale={[5, 1, 1]}
						/>
						<Lightformer
							color="#dbeafe"
							intensity={3.25}
							position={[-4, 0.5, 0]}
							rotation={[0, Math.PI / 2, 0]}
							scale={[4, 1, 1]}
						/>
						<Lightformer
							color="#fef3c7"
							intensity={2.75}
							position={[4, -1, -1]}
							rotation={[0, -Math.PI / 2, 0]}
							scale={[3, 0.8, 1]}
						/>
					</Environment>
					<GameCaseModel
						boundaryId={boundaryId}
						textureUrls={textureUrls}
						initialRotationY={initialRotationY}
						canvasMissHandler={canvasMissHandler}
					/>
				</Canvas>
			</LazySceneErrorBoundary>
		</div>
	);
}

interface GameCaseModelProps extends Omit<Props, "initialRotationY"> {
	initialRotationY: number;
	canvasMissHandler: RefObject<() => void>;
}

function GameCaseModel({
	boundaryId,
	textureUrls,
	initialRotationY,
	canvasMissHandler,
}: GameCaseModelProps) {
	const group = useRef<THREE.Group>(null);
	const readySent = useRef(false);
	const isDragging = useRef(false);
	const isGliding = useRef(false);
	const momentumVelocity = useRef(0);
	const suppressNextClick = useRef(false);
	const { renderEnabled, turntableEnabled } = useRenderActivity();
	const { animations, scene } = useGLTF(caseGLB);
	const textureUrlList = useMemo(
		() => SURFACES.map((surface) => textureUrls[surface]),
		[textureUrls],
	);
	const sourceTextures = useTexture(textureUrlList);
	const canvas = useThree((state) => state.gl.domElement);
	const invalidate = useThree((state) => state.invalidate);
	const maxAnisotropy = useThree((state) =>
		state.gl.capabilities.getMaxAnisotropy(),
	);

	const prepared = useMemo(() => {
		const textures = sourceTextures.map((sourceTexture) => {
			const texture = sourceTexture.clone();
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.flipY = false;
			texture.anisotropy = maxAnisotropy;
			texture.needsUpdate = true;
			return texture;
		});
		const texturesByMesh = new Map<string, THREE.Texture>(
			SURFACES.map((surface, index) => [
				SURFACE_MESHES[surface],
				textures[index],
			]),
		);
		const model = scene.clone(true);
		const materials: THREE.Material[] = [];
		const missingMeshes = new Set(texturesByMesh.keys());

		model.traverse((object) => {
			if (!(object instanceof THREE.Mesh)) {
				return;
			}

			const texture = texturesByMesh.get(object.name);
			if (!texture) {
				return;
			}

			if (!(object.material instanceof THREE.MeshStandardMaterial)) {
				throw new Error(
					`Game case mesh "${object.name}" must use a standard material.`,
				);
			}

			const isDisc =
				object.name === SURFACE_MESHES.discBack ||
				object.name === SURFACE_MESHES.discFront;
			const finish = isDisc ? MATERIAL_FINISH.disc : MATERIAL_FINISH.plastic;
			const isTransparent = object.name === SURFACE_MESHES.caseFront;
			const material = new THREE.MeshPhysicalMaterial({
				name: object.material.name,
				color: object.material.color,
				map: texture,
				metalness: 0,
				roughness: finish.roughness,
				clearcoat: finish.clearcoat,
				clearcoatRoughness: finish.clearcoatRoughness,
				envMapIntensity: finish.envMapIntensity,
				ior: 1.49,
				specularIntensity: 0.85,
				opacity: object.material.opacity,
				side: object.material.side,
				transparent: isTransparent,
				alphaTest: isTransparent ? 0.01 : 0,
			});
			object.material = material;
			materials.push(material);
			missingMeshes.delete(object.name);
		});

		if (missingMeshes.size > 0) {
			throw new Error(
				`Game case GLB is missing required meshes: ${[...missingMeshes].join(", ")}.`,
			);
		}

		return { materials, model, textures };
	}, [maxAnisotropy, scene, sourceTextures]);
	const { dismissActiveLayer, interactWithModel } = useGameCaseAnimations(
		animations,
		prepared.model,
		renderEnabled,
	);
	const handleModelClick = (event: ThreeEvent<MouseEvent>) => {
		event.stopPropagation();
		if (suppressNextClick.current) {
			suppressNextClick.current = false;
			return;
		}
		interactWithModel(hasNamedAncestor(event.object, "disc"));
	};
	useEffect(() => {
		canvasMissHandler.current = dismissActiveLayer;
		return () => {
			canvasMissHandler.current = () => undefined;
		};
	}, [canvasMissHandler, dismissActiveLayer]);

	useEffect(() => {
		let activePointerId: number | null = null;
		let startX = 0;
		let startY = 0;
		let previousX = 0;
		let previousTimestamp = 0;
		let intent: "pending" | "horizontal" | "vertical" = "pending";
		let clickResetTimer: number | undefined;

		const resetGesture = (event?: PointerEvent) => {
			if (event && event.pointerId !== activePointerId) {
				return;
			}

			if (isDragging.current) {
				suppressNextClick.current = true;
				const reducedMotion = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				).matches;

				if (reducedMotion) {
					momentumVelocity.current = 0;
				} else if (event) {
					const releaseDelay = Math.max(
						(event.timeStamp - previousTimestamp) / 1000 -
							MOMENTUM_CONFIG.releaseGrace,
						0,
					);
					momentumVelocity.current = THREE.MathUtils.damp(
						momentumVelocity.current,
						0,
						MOMENTUM_CONFIG.releaseDamping,
						releaseDelay,
					);
				}
				isGliding.current =
					Math.abs(momentumVelocity.current) > MOMENTUM_CONFIG.settleThreshold;
				if (isGliding.current) {
					invalidate();
				}
				window.clearTimeout(clickResetTimer);
				clickResetTimer = window.setTimeout(() => {
					suppressNextClick.current = false;
				}, 0);
			}

			if (
				activePointerId !== null &&
				canvas.hasPointerCapture(activePointerId)
			) {
				canvas.releasePointerCapture(activePointerId);
			}

			activePointerId = null;
			isDragging.current = false;
			intent = "pending";
			canvas.style.removeProperty("cursor");
		};

		const handlePointerDown = (event: PointerEvent) => {
			if (
				activePointerId !== null ||
				(event.pointerType === "mouse" && event.button !== 0)
			) {
				return;
			}

			activePointerId = event.pointerId;
			startX = event.clientX;
			startY = event.clientY;
			previousX = event.clientX;
			previousTimestamp = event.timeStamp;
			intent = "pending";
		};

		const handlePointerMove = (event: PointerEvent) => {
			if (event.pointerId !== activePointerId || !group.current) {
				return;
			}

			const totalX = event.clientX - startX;
			const totalY = event.clientY - startY;

			if (intent === "pending") {
				if (
					Math.max(Math.abs(totalX), Math.abs(totalY)) <
					INTERACTION_CONFIG.dragIntentThreshold
				) {
					return;
				}

				if (
					Math.abs(totalX) <
					Math.abs(totalY) * INTERACTION_CONFIG.horizontalIntentRatio
				) {
					intent = "vertical";
					return;
				}

				intent = "horizontal";
				isDragging.current = true;
				isGliding.current = false;
				momentumVelocity.current = 0;
				canvas.setPointerCapture(event.pointerId);
				canvas.style.setProperty("cursor", "grabbing");
				previousX = event.clientX;
				previousTimestamp = event.timeStamp;
			}

			if (intent !== "horizontal") {
				return;
			}

			event.preventDefault();
			const elapsedSeconds = Math.max(
				(event.timeStamp - previousTimestamp) / 1000,
				0.001,
			);
			const rotationDelta =
				(event.clientX - previousX) * INTERACTION_CONFIG.dragRotationSpeed;
			const instantVelocity = THREE.MathUtils.clamp(
				rotationDelta / elapsedSeconds,
				-MOMENTUM_CONFIG.maxSpeed,
				MOMENTUM_CONFIG.maxSpeed,
			);
			const speedRatio = Math.abs(instantVelocity) / MOMENTUM_CONFIG.maxSpeed;
			const velocitySmoothing = THREE.MathUtils.lerp(
				MOMENTUM_CONFIG.velocitySmoothingMin,
				MOMENTUM_CONFIG.velocitySmoothingMax,
				speedRatio * speedRatio,
			);

			group.current.rotation.y += rotationDelta;
			invalidate();
			momentumVelocity.current = THREE.MathUtils.lerp(
				momentumVelocity.current,
				instantVelocity,
				1 - Math.exp(-velocitySmoothing * elapsedSeconds),
			);
			previousX = event.clientX;
			previousTimestamp = event.timeStamp;
		};

		canvas.addEventListener("pointerdown", handlePointerDown);
		canvas.addEventListener("pointermove", handlePointerMove, {
			passive: false,
		});
		window.addEventListener("pointerup", resetGesture);
		window.addEventListener("pointercancel", resetGesture);

		return () => {
			window.clearTimeout(clickResetTimer);
			canvas.removeEventListener("pointerdown", handlePointerDown);
			canvas.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", resetGesture);
			window.removeEventListener("pointercancel", resetGesture);
			canvas.style.removeProperty("cursor");
		};
	}, [canvas, invalidate]);

	useEffect(() => {
		return () => {
			for (const material of prepared.materials) {
				material.dispose();
			}
			for (const texture of prepared.textures) {
				texture.dispose();
			}
		};
	}, [prepared]);

	useFrame((_, delta) => {
		if (!readySent.current) {
			readySent.current = true;
			signalLazySceneReady(boundaryId);
		}

		if (!group.current || isDragging.current) {
			return;
		}

		if (isGliding.current) {
			const targetVelocity = turntableEnabled.current
				? INTERACTION_CONFIG.turntableSpeed
				: 0;
			momentumVelocity.current = THREE.MathUtils.damp(
				momentumVelocity.current,
				targetVelocity,
				MOMENTUM_CONFIG.damping,
				delta,
			);
			group.current.rotation.y += momentumVelocity.current * delta;

			if (
				Math.abs(momentumVelocity.current - targetVelocity) <
				MOMENTUM_CONFIG.settleThreshold
			) {
				isGliding.current = false;
				momentumVelocity.current = 0;
			}

			if (renderEnabled.current) {
				invalidate();
			}
			return;
		}

		if (turntableEnabled.current) {
			group.current.rotation.y += delta * INTERACTION_CONFIG.turntableSpeed;
			invalidate();
		}
	});

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: This is an interactive Three.js scene object, not a DOM element.
		<group
			ref={group}
			position={[0, MODEL_CONFIG.centerY, 0]}
			rotation={[-0.1, initialRotationY, 0]}
			onClick={handleModelClick}
			onPointerEnter={() => canvas.style.setProperty("cursor", "grab")}
			onPointerLeave={() => canvas.style.removeProperty("cursor")}
		>
			<primitive object={prepared.model} dispose={null} />
		</group>
	);
}

function hasNamedAncestor(object: THREE.Object3D, name: string) {
	let current: THREE.Object3D | null = object;
	while (current) {
		if (current.name === name) {
			return true;
		}
		current = current.parent;
	}
	return false;
}

function ResponsiveCamera() {
	const camera = useThree((state) => state.camera);
	const size = useThree((state) => state.size);
	const invalidate = useThree((state) => state.invalidate);

	useLayoutEffect(() => {
		if (!(camera instanceof THREE.PerspectiveCamera) || size.height === 0) {
			return;
		}

		const verticalFov = THREE.MathUtils.degToRad(CAMERA_CONFIG.fov);
		const horizontalFov =
			2 * Math.atan(Math.tan(verticalFov / 2) * (size.width / size.height));
		const limitingFov = Math.min(verticalFov, horizontalFov);
		const distance =
			(CAMERA_CONFIG.subjectRadius * CAMERA_CONFIG.padding) /
			Math.sin(Math.max(limitingFov / 2, 0.01));

		camera.fov = CAMERA_CONFIG.fov;
		camera.position.set(0, 0, distance);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();
		invalidate();
	}, [camera, invalidate, size]);

	return null;
}

function useRenderActivity() {
	const canvas = useThree((state) => state.gl.domElement);
	const clock = useThree((state) => state.clock);
	const invalidate = useThree((state) => state.invalidate);
	const renderEnabled = useRef(false);
	const turntableEnabled = useRef(false);

	useEffect(() => {
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let isIntersecting = false;

		const update = () => {
			const nextRenderEnabled =
				isIntersecting && document.visibilityState === "visible";
			const nextTurntableEnabled = nextRenderEnabled && !reducedMotion.matches;
			const shouldResume =
				nextRenderEnabled &&
				(!renderEnabled.current ||
					(nextTurntableEnabled && !turntableEnabled.current));
			renderEnabled.current = nextRenderEnabled;
			turntableEnabled.current = nextTurntableEnabled;
			if (shouldResume) {
				clock.getDelta();
				invalidate();
			}
		};
		const observer = new IntersectionObserver(([entry]) => {
			isIntersecting = entry?.isIntersecting ?? false;
			update();
		});

		observer.observe(canvas);
		document.addEventListener("visibilitychange", update);
		reducedMotion.addEventListener("change", update);

		return () => {
			observer.disconnect();
			document.removeEventListener("visibilitychange", update);
			reducedMotion.removeEventListener("change", update);
		};
	}, [canvas, clock, invalidate]);

	return { renderEnabled, turntableEnabled };
}

useGLTF.preload(caseGLB);
