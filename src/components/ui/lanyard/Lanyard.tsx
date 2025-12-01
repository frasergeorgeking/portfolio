/// <reference path="../../../types/global.d.ts" />
"use client";
import {
	Environment,
	Lightformer,
	useGLTF,
	useTexture,
} from "@react-three/drei";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import type { RigidBodyProps } from "@react-three/rapier";
import {
	BallCollider,
	CuboidCollider,
	Physics,
	RigidBody,
	useRopeJoint,
	useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// TODO FK: Clean all of this up.
// replace with your own imports, see the usage snippet for details
import cardGLB from "./card.glb?url";
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
	// TODO FK: Add considerations for blocking certains inputs (e.g. scrolling, selection).

	return (
		<div className="relative z-0 w-full h-full flex justify-center items-center transform scale-100 origin-center">
			<Canvas
				camera={{ position, fov }}
				gl={{ alpha: transparent }}
				onCreated={({ gl }) =>
					gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)
				}
			>
				<ambientLight intensity={1.25} />
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

function Band({ maxSpeed = 50, minSpeed = 0 }: BandProps) {
	// Using "any" for refs since the exact types depend on Rapier's internals
	// biome-ignore lint/suspicious/noExplicitAny: Rapier internal types
	const band = useRef<any>(null);
	// biome-ignore lint/suspicious/noExplicitAny: Rapier internal types
	const fixed = useRef<any>(null);
	// biome-ignore lint/suspicious/noExplicitAny: Rapier internal types
	const j1 = useRef<any>(null);
	// biome-ignore lint/suspicious/noExplicitAny: Rapier internal types
	const j2 = useRef<any>(null);
	// biome-ignore lint/suspicious/noExplicitAny: Rapier internal types
	const j3 = useRef<any>(null);
	// biome-ignore lint/suspicious/noExplicitAny: Rapier internal types
	const card = useRef<any>(null);
	// Reference for the holographic card material
	// biome-ignore lint/suspicious/noExplicitAny: Material type
	const cardMaterial = useRef<any>(null);

	const vec = new THREE.Vector3();
	const ang = new THREE.Vector3();
	const rot = new THREE.Vector3();
	const dir = new THREE.Vector3();

	// biome-ignore lint/suspicious/noExplicitAny: Dynamic RigidBody props
	const segmentProps: any = {
		type: "dynamic" as RigidBodyProps["type"],
		canSleep: true,
		colliders: false,
		angularDamping: 4,
		linearDamping: 4,
	};

	// biome-ignore lint/suspicious/noExplicitAny: GLTF nodes are dynamic
	const { nodes, materials } = useGLTF(cardGLB) as any;

	// Handle Astro's image import - convert ImageMetadata to string URL // TODO FK: Is this true? See how image is imported.
	const lanyardUrl =
		typeof lanyardImg === "string" ? lanyardImg : lanyardImg.src;
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

	// Create holographic material with proper lighting
	const holoMaterial = useMemo(() => {
		const mat = new THREE.MeshPhysicalMaterial({
			map: materials.base.map,
			metalness: 0.4,
			roughness: 0.12,
			roughnessMap: materials.base.roughnessMap,
			clearcoat: 1.0,
			clearcoatRoughness: 0.05,
		});

		// Custom uniforms for holographic effect
		mat.userData.holoUniforms = {
			time: { value: 0 },
			holoIntensity: { value: 1.6 },
			rainbowScale: { value: 12.0 },
			sparkleSize: { value: 40.0 },
			minAngle: { value: 0.1 },
			maxAngle: { value: 0.85 },
			baseHoloAmount: { value: 0.02 },
		};

		mat.onBeforeCompile = (shader) => {
			// Add custom uniforms
			shader.uniforms.time = mat.userData.holoUniforms.time;
			shader.uniforms.holoIntensity = mat.userData.holoUniforms.holoIntensity;
			shader.uniforms.rainbowScale = mat.userData.holoUniforms.rainbowScale;
			shader.uniforms.sparkleSize = mat.userData.holoUniforms.sparkleSize;
			shader.uniforms.minAngle = mat.userData.holoUniforms.minAngle;
			shader.uniforms.maxAngle = mat.userData.holoUniforms.maxAngle;
			shader.uniforms.baseHoloAmount = mat.userData.holoUniforms.baseHoloAmount;

			// TODO FK: Add vite shader plugin thingy.

			// Add holographic functions to fragment shader (vViewPosition already exists)
			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <common>",
				`
			#include <common>

			uniform float time;
			uniform float holoIntensity;
			uniform float rainbowScale;
			uniform float sparkleSize;
			uniform float minAngle;
			uniform float maxAngle;
			uniform float baseHoloAmount;

			// Rainbow colors
			vec3 rainbow(float t) {
				float r = sin(t * 6.28318) * 0.5 + 0.5;
				float g = sin(t * 6.28318 + 2.094) * 0.5 + 0.5;
				float b = sin(t * 6.28318 + 4.189) * 0.5 + 0.5;
				return vec3(r, g, b);
			}

			// Sparkle effect
			float sparkle(vec2 uv, float time) {
				vec2 sparkleUV = uv * sparkleSize;
				sparkleUV.x += time * 0.15;
				sparkleUV.y += time * 0.1;
				float n1 = fract(sin(dot(sparkleUV, vec2(12.9898, 78.233))) * 43758.5453);
				float n2 = fract(sin(dot(sparkleUV + vec2(1.0, 1.0), vec2(93.989, 67.345))) * 28653.1234);
				return step(0.985, n1) * n2;
			}

			// Holographic pattern
			float holoPattern(vec2 uv, float time) {
				float stripes = sin((uv.x + uv.y) * rainbowScale + time * 1.0) * 0.5 + 0.5;
				vec2 center = vec2(0.5, 0.5);
				float dist = length(uv - center);
				float waves = sin(dist * 10.0 - time * 2.0) * 0.5 + 0.5;
				return mix(stripes, waves, 0.3);
			}
			`,
			);

			// Add holographic effect after all lighting calculations
			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <dithering_fragment>",
				`
			#include <dithering_fragment>

			// Get UV coordinates
			vec2 holoUv = vMapUv;

			// Calculate viewing angle
			vec3 viewDir = normalize(vViewPosition);
			float viewAngle = abs(dot(vNormal, viewDir));

			// Angle-dependent visibility with minimum base value
			float angleVisibility = smoothstep(minAngle, maxAngle, viewAngle) * 
			                        (1.0 - smoothstep(maxAngle, 1.0, viewAngle));
			// Ensure there's always some visibility
			angleVisibility = max(angleVisibility, baseHoloAmount);

			// Fresnel effect (stronger at edges)
			float fresnel = pow(1.0 - viewAngle, 2.0);

			// Holographic pattern
			float pattern = holoPattern(holoUv, time);

			// Rainbow color
			float rainbowPos = holoUv.x + holoUv.y * 0.3 + pattern * 0.2 + time * 0.08;
			vec3 rainbowColor = rainbow(rainbowPos);

			// Sparkles
			float sparkles = sparkle(holoUv, time);

			// Base iridescence (always visible)
			vec3 baseIridescence = rainbow(holoUv.x + holoUv.y * 0.5 + time * 0.05) * baseHoloAmount * 0.3;
			gl_FragColor.rgb += baseIridescence;

			// Apply angle-dependent holographic effect
			float holoStrength = angleVisibility * pattern * holoIntensity;
			gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + rainbowColor * 0.7, holoStrength * 0.5);

			// Add fresnel shimmer (always somewhat visible)
			gl_FragColor.rgb += rainbowColor * fresnel * max(angleVisibility, 0.15) * 0.3;

			// Add sparkles
			gl_FragColor.rgb += vec3(1.0, 0.95, 1.0) * sparkles * angleVisibility * 2.0;

			// Overall iridescence layer
			gl_FragColor.rgb += rainbowColor * angleVisibility * 0.15;
			`,
			);

			mat.userData.shader = shader;
		};

		return mat;
	}, [materials.base.map, materials.base.roughnessMap]);

	useEffect(() => {
		const handleResize = (): void => {
			setIsSmall(window.innerWidth < 1024);
		};

		window.addEventListener("resize", handleResize);
		return (): void => window.removeEventListener("resize", handleResize);
	}, []);

	// Add global pointer up listener to handle cases where pointer is released outside bounds
	useEffect(() => {
		const handlePointerUp = () => {
			if (dragged) {
				drag(false);
			}
		};

		window.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("pointercancel", handlePointerUp);

		return () => {
			window.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("pointercancel", handlePointerUp);
		};
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
			return () => {
				document.body.style.cursor = "auto";
			};
		}
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
				if (!ref.current.lerped)
					ref.current.lerped = new THREE.Vector3().copy(
						ref.current.translation(),
					);
				const clampedDistance = Math.max(
					0.1,
					Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())),
				);
				ref.current.lerped.lerp(
					ref.current.translation(),
					delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)),
				);
			});
			curve.points[0].copy(j3.current.translation());
			curve.points[1].copy(j2.current.lerped);
			curve.points[2].copy(j1.current.lerped);
			curve.points[3].copy(fixed.current.translation());
			band.current.geometry.setPoints(curve.getPoints(32));
			ang.copy(card.current.angvel());
			rot.copy(card.current.rotation());
			card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
		}

		// Update holographic card effect
		if (holoMaterial.userData?.holoUniforms) {
			holoMaterial.userData.holoUniforms.time.value = state.clock.elapsedTime;
		}
	});

	curve.curveType = "chordal";
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

	return (
		<>
			<group position={[0, 4.4, 0]}>
				<RigidBody
					ref={fixed}
					{...segmentProps}
					type={"fixed" as RigidBodyProps["type"]}
				/>
				<RigidBody
					position={[0.5, 0, 0]}
					ref={j1}
					{...segmentProps}
					type={"dynamic" as RigidBodyProps["type"]}
				>
					<BallCollider args={[0.1]} />
				</RigidBody>
				<RigidBody
					position={[1, 0, 0]}
					ref={j2}
					{...segmentProps}
					type={"dynamic" as RigidBodyProps["type"]}
				>
					<BallCollider args={[0.1]} />
				</RigidBody>
				<RigidBody
					position={[1.5, 0, 0]}
					ref={j3}
					{...segmentProps}
					type={"dynamic" as RigidBodyProps["type"]}
				>
					<BallCollider args={[0.1]} />
				</RigidBody>
				<RigidBody
					position={[2, 0, 0]}
					ref={card}
					{...segmentProps}
					type={
						dragged
							? ("kinematicPosition" as RigidBodyProps["type"])
							: ("dynamic" as RigidBodyProps["type"])
					}
				>
					<CuboidCollider args={[0.8, 1.125, 0.01]} />
					<group
						scale={2.25}
						position={[0, -1.2, -0.05]}
						onPointerOver={() => hover(true)}
						onPointerOut={() => hover(false)}
						// biome-ignore lint/suspicious/noExplicitAny: ThreeEvent type is complex
						onPointerUp={(e: any) => {
							if (e.target.hasPointerCapture(e.pointerId)) {
								e.target.releasePointerCapture(e.pointerId);
							}
							drag(false);
						}}
						// biome-ignore lint/suspicious/noExplicitAny: ThreeEvent type is complex
						onPointerDown={(e: any) => {
							e.stopPropagation();
							e.target.setPointerCapture(e.pointerId);
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
