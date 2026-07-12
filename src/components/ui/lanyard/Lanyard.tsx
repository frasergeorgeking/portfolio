/// <reference path="../../../types/global.d.ts" />
"use client";
import {
	Environment,
	Lightformer,
	useGLTF,
	useTexture,
} from "@react-three/drei";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import {
	BallCollider,
	CuboidCollider,
	Physics,
	type RapierRigidBody,
	RigidBody,
	type RigidBodyProps,
	useRopeJoint,
	useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GlobalEvents } from "@/events/GlobalEvents";
import { StrictWeakMap } from "@/lib/StrictWeakMap";
import { assertNotNullish } from "@/lib/Utils";
import cardGLB from "./card.glb?url";
import holographicFragment from "./holographic.frag";
import holographicPostFragment from "./holographic_post.frag";
import lanyardImg from "./lanyard.png";

extend({ MeshLineGeometry, MeshLineMaterial });

interface LanyardProps {
	position?: [number, number, number];
	gravity?: [number, number, number];
	fov?: number;
	transparent?: boolean;
}

export default function Lanyard({
	position = [0, 0, 24],
	gravity = [0, -40, 0],
	fov = 8,
	transparent = true,
}: LanyardProps) {
	useEffect(() => {
		window.dispatchEvent(GlobalEvents.LanyardLoaded);
	}, []);

	return (
		<div className="relative z-0 w-full h-full flex justify-center items-center transform scale-100 origin-center select-none [-webkit-user-select:none]">
			<Canvas
				camera={{ position, fov }}
				gl={{ alpha: transparent }}
				onCreated={({ gl }) =>
					gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)
				}
			>
				<ambientLight intensity={0.25} />
				<Physics gravity={gravity} timeStep={1 / 30}>
					<Band />
				</Physics>
				<Environment>
					<Lightformer
						intensity={2.5}
						color="white"
						position={[0, -1, 5]}
						rotation={[0, 0, Math.PI / 3]}
						scale={[100, 0.1, 1]}
					/>
					<Lightformer
						intensity={4}
						color="white"
						position={[-1, -1, 1]}
						rotation={[0, 0, Math.PI / 3]}
						scale={[100, 0.1, 1]}
					/>
					<Lightformer
						intensity={4}
						color="white"
						position={[1, 1, 1]}
						rotation={[0, 0, Math.PI / 3]}
						scale={[100, 0.1, 1]}
					/>
					<Lightformer
						intensity={6}
						color="white"
						position={[-10, 0, 14]}
						rotation={[0, Math.PI / 2, Math.PI / 3]}
						scale={[100, 10, 1]}
					/>
				</Environment>
			</Canvas>
		</div>
	);
}

interface BandProps {
	maxSpeed?: number;
	minSpeed?: number;
}

interface HoloUniforms {
	holoIntensity: THREE.IUniform<number>;
	holoLineStrength: THREE.IUniform<number>;
	holoEdgeStrength: THREE.IUniform<number>;
	holoArtworkProtection: THREE.IUniform<number>;
	holoBandScale: THREE.IUniform<number>;
	holoViewShift: THREE.IUniform<number>;
	holoLineFrequency: THREE.IUniform<number>;
	holoSheenStrength: THREE.IUniform<number>;
	holoDiffractionStrength: THREE.IUniform<number>;
	holoIdlePresence: THREE.IUniform<number>;
}

const HOLO_DEFAULTS = {
	intensity: 1.4,
	lineStrength: 0.025,
	edgeStrength: 0.7,
	artworkProtection: 0.7,
	bandScale: 1.0,
	viewShift: 1.0,
	lineFrequency: 55.0,
	sheenStrength: 0.1,
	diffractionStrength: 0.4,
	idlePresence: 0.1,
} as const;

function Band({ maxSpeed = 50, minSpeed = 0 }: BandProps) {
	const band = useRef<THREE.Mesh<MeshLineGeometry>>(null);
	const fixed = useRigidBodyRef();
	const j1 = useRigidBodyRef();
	const j2 = useRigidBodyRef();
	const j3 = useRigidBodyRef();
	const card = useRigidBodyRef();
	const cardMaterial = useRef<THREE.Mesh>(null);

	const lerpedPositions = useRef(
		new StrictWeakMap<RapierRigidBody, THREE.Vector3>(),
	);

	const vec = new THREE.Vector3();
	const ang = new THREE.Vector3();
	const rot = new THREE.Vector3();
	const dir = new THREE.Vector3();

	const segmentProps: RigidBodyProps = {
		type: "dynamic",
		canSleep: true,
		colliders: false,
		angularDamping: 4,
		linearDamping: 4,
	} as const;

	const { nodes, materials } = useGLTF(cardGLB) as unknown as CardGLTF;

	const lanyardUrl = lanyardImg.src;
	const texture = useTexture(lanyardUrl);
	const [curve] = useState(
		() =>
			new THREE.CatmullRomCurve3([
				new THREE.Vector3(),
				new THREE.Vector3(),
				new THREE.Vector3(),
				new THREE.Vector3(),
			]),
	);
	const [dragged, drag] = useState<false | THREE.Vector3>(false);
	const [hovered, hover] = useState(false);

	const [isSmall, setIsSmall] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			return window.innerWidth < 1024;
		}
		return false;
	});

	const holoMaterial = useMemo(() => {
		const mat = new THREE.MeshPhysicalMaterial({
			map: materials.base.map,
			metalness: 0.4,
			roughness: 0.12,
			roughnessMap: materials.base.roughnessMap,
			clearcoat: 1.0,
			clearcoatRoughness: 0.05,
		});

		const holoUniforms: HoloUniforms = {
			holoIntensity: { value: HOLO_DEFAULTS.intensity },
			holoLineStrength: { value: HOLO_DEFAULTS.lineStrength },
			holoEdgeStrength: { value: HOLO_DEFAULTS.edgeStrength },
			holoArtworkProtection: { value: HOLO_DEFAULTS.artworkProtection },
			holoBandScale: { value: HOLO_DEFAULTS.bandScale },
			holoViewShift: { value: HOLO_DEFAULTS.viewShift },
			holoLineFrequency: { value: HOLO_DEFAULTS.lineFrequency },
			holoSheenStrength: { value: HOLO_DEFAULTS.sheenStrength },
			holoDiffractionStrength: {
				value: HOLO_DEFAULTS.diffractionStrength,
			},
			holoIdlePresence: { value: HOLO_DEFAULTS.idlePresence },
		};
		mat.userData.holoUniforms = holoUniforms;

		mat.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, holoUniforms);

			// Add holographic functions to fragment shader
			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <common>",
				holographicFragment,
			);

			// Add holographic effect after all lighting calculations
			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <dithering_fragment>",
				holographicPostFragment,
			);

			mat.userData.shader = shader;
		};

		return mat;
	}, [materials.base.map, materials.base.roughnessMap]);

	useEffect(() => {
		const handleResize = (): void => {
			setIsSmall(window.innerWidth < 1024);
		};

		const controller = new AbortController();
		const { signal } = controller;

		window.addEventListener("resize", handleResize, { signal });

		return (): void => controller.abort();
	}, []);

	// Add global pointer up listener to handle cases where pointer is released outside bounds
	useEffect(() => {
		const handlePointerUp = () => {
			if (dragged) {
				drag(false);
			}
		};

		const controller = new AbortController();
		const { signal } = controller;

		window.addEventListener("pointerup", handlePointerUp, { signal });
		window.addEventListener("pointercancel", handlePointerUp, { signal });

		return () => controller.abort();
	}, [dragged]);

	useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
	useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
	useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
	useSphericalJoint(j3, card, [
		[0, 0, 0],
		[0, 1.45, 0],
	]);

	useEffect(() => {
		if (hovered) {
			document.body.style.cursor = dragged ? "grabbing" : "grab";
		}
		return () => {
			document.body.style.cursor = "auto";
		};
	}, [hovered, dragged]);

	useFrame((state, delta) => {
		if (dragged && typeof dragged !== "boolean") {
			vec.set(state.pointer.x, state.pointer.y, 0.75).unproject(state.camera);
			dir.copy(vec).sub(state.camera.position).normalize();
			vec.add(dir.multiplyScalar(state.camera.position.length()));
			for (const ref of [card, j1, j2, j3, fixed]) {
				ref.current?.wakeUp();
			}
			card.current?.setNextKinematicTranslation({
				x: vec.x - dragged.x,
				y: vec.y - dragged.y,
				z: vec.z - dragged.z,
			});
		}
		if (fixed.current) {
			[j1, j2].forEach((ref) => {
				const body = ref.current;
				assertNotNullish(body);

				if (!lerpedPositions.current.has(body)) {
					lerpedPositions.current.set(
						body,
						new THREE.Vector3().copy(body.translation()),
					);
				}

				const lerped = lerpedPositions.current.get(body);
				const clampedDistance = Math.max(
					0.1,
					Math.min(1, lerped.distanceTo(body.translation())),
				);
				lerped.lerp(
					body.translation(),
					delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)),
				);
			});

			const j1Pos = lerpedPositions.current.get(j1.current);
			const j2Pos = lerpedPositions.current.get(j2.current);

			curve.points[0].copy(j3.current.translation());
			curve.points[1].copy(j2Pos);
			curve.points[2].copy(j1Pos);
			curve.points[3].copy(fixed.current.translation());
			band.current?.geometry.setPoints(curve.getPoints(32));
			ang.copy(card.current.angvel());
			rot.copy(card.current.rotation());
			card.current.setAngvel(
				{ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
				true,
			);
		}
	});

	curve.curveType = "chordal";
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

	return (
		<>
			<group position={[0, 4.3, 0]}>
				<RigidBody ref={fixed} {...segmentProps} type={"fixed"} />
				<RigidBody
					position={[0.5, 0, 0]}
					ref={j1}
					{...segmentProps}
					type={"dynamic"}
				>
					<BallCollider args={[0.1]} />
				</RigidBody>
				<RigidBody
					position={[1, 0, 0]}
					ref={j2}
					{...segmentProps}
					type={"dynamic"}
				>
					<BallCollider args={[0.1]} />
				</RigidBody>
				<RigidBody
					position={[1.5, 0, 0]}
					ref={j3}
					{...segmentProps}
					type={"dynamic"}
				>
					<BallCollider args={[0.1]} />
				</RigidBody>
				<RigidBody
					position={[2, 0, 0]}
					ref={card}
					{...segmentProps}
					type={dragged ? "kinematicPosition" : "dynamic"}
				>
					<CuboidCollider args={[0.8, 1.125, 0.01]} />
					<group
						scale={2.25}
						position={[0, -1.2, -0.05]}
						onPointerOver={() => hover(true)}
						onPointerOut={() => hover(false)}
						onPointerUp={(e) => {
							const target = e.nativeEvent.target;

							if (
								target instanceof Element &&
								target.hasPointerCapture(e.pointerId)
							) {
								target.releasePointerCapture(e.pointerId);
							}

							drag(false);
						}}
						onPointerDown={(e) => {
							e.stopPropagation();

							const target = e.nativeEvent.target;

							if (target instanceof Element) {
								target.setPointerCapture(e.pointerId);
							}

							drag(
								new THREE.Vector3()
									.copy(e.point)
									.sub(vec.copy(card.current.translation())),
							);
						}}
					>
						<mesh
							geometry={nodes.card.geometry}
							material={holoMaterial}
							ref={cardMaterial}
						/>
						<mesh
							geometry={nodes.clip.geometry}
							material={materials.metal}
							material-roughness={0.3}
						/>
						<mesh geometry={nodes.clamp.geometry} material={materials.metal} />
					</group>
				</RigidBody>
			</group>
			<mesh ref={band}>
				<meshLineGeometry />
				<meshLineMaterial
					color="white"
					depthTest={false}
					resolution={isSmall ? [1000, 2000] : [1000, 1000]}
					useMap
					map={texture}
					repeat={[-4, 1]}
					lineWidth={1}
				/>
			</mesh>
		</>
	);
}

/**
 * Custom wrapper for rigid body references to workaround incorrect
 * Rapier Use function typing.
 * @returns Cast reference.
 */
function useRigidBodyRef(): React.RefObject<RapierRigidBody> {
	return useRef<RapierRigidBody>(null) as React.RefObject<RapierRigidBody>;
}

type CardGLTF = {
	nodes: {
		card: THREE.Mesh;
		clip: THREE.Mesh;
		clamp: THREE.Mesh;
	};
	materials: {
		base: THREE.MeshStandardMaterial;
		metal: THREE.Material;
	};
};
