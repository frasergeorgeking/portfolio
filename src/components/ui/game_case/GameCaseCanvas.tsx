import {
	Environment,
	Lightformer,
	useGLTF,
	useTexture,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { signalLazySceneReady } from "@/components/ui/loading/lazySceneEvents";
import LazySceneErrorBoundary from "@/components/ui/loading/SceneErrorBoundary";
import caseGLB from "./psx_case.glb?url";
import type { GameCaseTextureUrls } from "./types";

const CAMERA_FOV = 30;
const SUBJECT_RADIUS = 1.25;
const CAMERA_PADDING = 1.15;
const TURNTABLE_SPEED = 0.18;
const MODEL_CENTER_Y = -0.794357;

const MATERIAL_FINISH = {
	plastic: {
		roughness: 0.1,
		clearcoat: 1,
		clearcoatRoughness: 0.05,
		envMapIntensity: 1.2,
	},
	disc: {
		roughness: 0.28,
		clearcoat: 0.65,
		clearcoatRoughness: 0.14,
		envMapIntensity: 1.1,
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
}

export default function GameCaseCanvas({ boundaryId, textureUrls }: Props) {
	return (
		<div className="h-full min-h-[420px] w-full select-none">
			<LazySceneErrorBoundary boundaryId={boundaryId}>
				<Canvas
					camera={{ position: [0, 0, 5], fov: CAMERA_FOV }}
					gl={{ alpha: true, antialias: true }}
					onCreated={({ gl }) => {
						gl.setClearColor(new THREE.Color(0x000000), 0);
					}}
				>
					<ResponsiveCamera />
					<hemisphereLight args={[0xffffff, 0x35354a, 3.75]} />
					<directionalLight intensity={2.4} position={[4, 5, 3]} />
					<directionalLight intensity={1.1} position={[-4, 1, -2]} />
					<Environment resolution={256}>
						<Lightformer
							color="#ffffff"
							intensity={3.5}
							position={[0, 4, -1]}
							rotation={[Math.PI / 2, 0, 0]}
							scale={[5, 1, 1]}
						/>
						<Lightformer
							color="#dbeafe"
							intensity={3}
							position={[-4, 0.5, 0]}
							rotation={[0, Math.PI / 2, 0]}
							scale={[4, 1, 1]}
						/>
						<Lightformer
							color="#fef3c7"
							intensity={2.5}
							position={[4, -1, -1]}
							rotation={[0, -Math.PI / 2, 0]}
							scale={[3, 0.8, 1]}
						/>
					</Environment>
					<GameCaseModel boundaryId={boundaryId} textureUrls={textureUrls} />
				</Canvas>
			</LazySceneErrorBoundary>
		</div>
	);
}

function GameCaseModel({ boundaryId, textureUrls }: Props) {
	const group = useRef<THREE.Group>(null);
	const readySent = useRef(false);
	const turntableEnabled = useTurntableEnabled();
	const { scene } = useGLTF(caseGLB);
	const textureUrlList = useMemo(
		() => SURFACES.map((surface) => textureUrls[surface]),
		[textureUrls],
	);
	const sourceTextures = useTexture(textureUrlList);
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

		if (turntableEnabled.current && group.current) {
			group.current.rotation.y += delta * TURNTABLE_SPEED;
		}
	});

	return (
		<group
			ref={group}
			position={[0, MODEL_CENTER_Y, 0]}
			rotation={[-0.1, -0.25, 0]}
		>
			<primitive object={prepared.model} dispose={null} />
		</group>
	);
}

function ResponsiveCamera() {
	const camera = useThree((state) => state.camera);
	const size = useThree((state) => state.size);
	const invalidate = useThree((state) => state.invalidate);

	useLayoutEffect(() => {
		if (!(camera instanceof THREE.PerspectiveCamera) || size.height === 0) {
			return;
		}

		const verticalFov = THREE.MathUtils.degToRad(CAMERA_FOV);
		const horizontalFov =
			2 * Math.atan(Math.tan(verticalFov / 2) * (size.width / size.height));
		const limitingFov = Math.min(verticalFov, horizontalFov);
		const distance =
			(SUBJECT_RADIUS * CAMERA_PADDING) /
			Math.sin(Math.max(limitingFov / 2, 0.01));

		camera.fov = CAMERA_FOV;
		camera.position.set(0, 0, distance);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();
		invalidate();
	}, [camera, invalidate, size]);

	return null;
}

function useTurntableEnabled() {
	const canvas = useThree((state) => state.gl.domElement);
	const enabled = useRef(false);

	useEffect(() => {
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let isIntersecting = false;

		const update = () => {
			enabled.current =
				isIntersecting &&
				document.visibilityState === "visible" &&
				!reducedMotion.matches;
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
	}, [canvas]);

	return enabled;
}

useGLTF.preload(caseGLB);
