import {
	Environment,
	Lightformer,
	useGLTF,
	useTexture,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import * as THREE from "three";
import { useGameCaseInteraction } from "@/components/ui/game-case/useGameCaseInteraction";
import LazySceneErrorBoundary from "@/components/ui/loading/SceneErrorBoundary";
import { useSceneReady } from "@/components/ui/loading/useSceneReady";
import caseGLB from "./assets/psx-case.glb?url";
import type { GameCaseTextureUrls } from "./types";

const CAMERA_CONFIG = {
	fov: 30,
	subjectRadius: 1.25,
	padding: 1.14,
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
	useSceneReady(boundaryId);
	const { animations, scene } = useGLTF(caseGLB);
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
	const interaction = useGameCaseInteraction({
		animations,
		model: prepared.model,
		canvasMissHandler,
	});

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

	return (
		<group
			{...interaction}
			position={[0, MODEL_CONFIG.centerY, 0]}
			rotation={[-0.1, initialRotationY, 0]}
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

useGLTF.preload(caseGLB);
