/// <reference path="../../../types/global.d.ts" />
"use client";
import {
	Environment,
	Lightformer,
	useAnimations,
	useGLTF,
} from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { z } from "astro/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import caseGLB from "./game_case.glb";

type CaseState = "closed" | "opened" | "disc_revealed";

interface GameCaseProps {
	position?: [number, number, number];
	fov?: number;
	transparent?: boolean;
}

export default function GameCase({
	position = [0, 0, 24],
	fov = 8,
	transparent = true,
}: GameCaseProps) {
	useEffect(() => {
		// TODO FK: Do I care about dispatching an event for the case being loaded?
		// window.dispatchEvent(GlobalEvents.LanyardLoaded);
	}, []);

	/**
	 * TODO FK:
	 * - Add loading state
	 * - Add clear coat to case front/back materials
	 * - Tweak lighting
	 * - Figure out texturing approach to swap disc designs
	 * - Code optimisation sweep (check this class and Lanyard.tsx for similar patterns)
	 */

	return (
		<div className="relative z-0 w-full h-full flex justify-center items-center transform scale-100 origin-center select-none [-webkit-user-select:none]">
			<Canvas
				camera={{ position, fov }}
				gl={{ alpha: transparent }}
				onCreated={({ gl }) =>
					gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)
				}
			>
				<Model />
				<ambientLight intensity={0.25} />
				<Environment>
					<Lightformer
						intensity={2}
						color="white"
						position={[0, -1, 5]}
						rotation={[0, 0, Math.PI / 3]}
						scale={[100, 0.1, 1]}
					/>
					<Lightformer
						intensity={3}
						color="white"
						position={[-1, -1, 1]}
						rotation={[0, 0, Math.PI / 3]}
						scale={[100, 0.1, 1]}
					/>
					<Lightformer
						intensity={3}
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

function Model() {
	const gltfData = useGLTF(caseGLB);

	const { scene, animations } = useMemo(
		() => GameCaseGLTFSchema.parse(gltfData),
		[gltfData],
	);

	const modelRef = useRef<THREE.Group>(null);
	const { actions, mixer } = useAnimations(animations, modelRef);
	const [caseState, setCaseState] = useState<CaseState>("closed");
	const isAnimatingRef = useRef(false);
	const caseActionRef = useRef<THREE.AnimationAction | null>(null);
	const discActionRef = useRef<THREE.AnimationAction | null>(null);
	const [hovered, hover] = useState(false);

	useFrame((_, delta) => {
		if (modelRef.current) {
			modelRef.current.rotation.y += delta * 0.45;
		}
	});

	useEffect(() => {
		if (hovered) {
			document.body.style.cursor = "pointer";
		}
		return () => {
			document.body.style.cursor = "auto";
		};
	}, [hovered]);

	const playAction = (action: THREE.AnimationAction | null) => {
		// TODO FK: It's better practice to not support null in the function body.
		if (action == null) return;

		mixer.timeScale = 1;

		// Handle case open/close
		isAnimatingRef.current = true;
		action.reset();
		action.setLoop(THREE.LoopOnce, 1);
		action.clampWhenFinished = true;
		action.play();

		const onFinished = () => {
			isAnimatingRef.current = false;
			mixer.removeEventListener("finished", onFinished);
		};
		mixer.addEventListener("finished", onFinished);
	};

	const handleClick = (e: ThreeEvent<PointerEvent>) => {
		e.stopPropagation();

		// Prevent new animations while one is playing
		if (isAnimatingRef.current) {
			console.log("Blocked: animation in progress");
			mixer.timeScale = 4;
			return;
		}

		const objectName = e.object.name;

		if (objectName.startsWith("case_")) {
			if (caseState === "closed") {
				caseActionRef.current?.stop();

				caseActionRef.current = actions.case_open;
				playAction(caseActionRef.current);
				setCaseState("opened");
			} else if (caseState === "opened") {
				caseActionRef.current?.stop();

				caseActionRef.current = actions.case_close;
				playAction(caseActionRef.current);
				setCaseState("closed");
			} else if (caseState === "disc_revealed") {
				discActionRef.current?.stop();

				// Reverse the disc reveal animation
				// TODO FK: Play disc hide.
				playAction(actions.disc_hide);
				setCaseState("opened");
			}
		} else if (objectName.startsWith("disc_")) {
			if (caseState === "closed") {
				return;
			}

			discActionRef.current?.stop();

			if (caseState === "opened") {
				discActionRef.current = actions.disc_reveal;
				playAction(discActionRef.current);
				setCaseState("disc_revealed");
			}

			if (caseState === "disc_revealed") {
				discActionRef.current = actions.disc_spin;
				playAction(discActionRef.current);
			}
		} else {
			throw new Error(`Unhandled object name: ${objectName}`);
		}
	};

	return (
		<primitive
			ref={modelRef}
			object={scene}
			onPointerOver={() => hover(true)}
			onPointerOut={() => hover(false)}
			onPointerUp={handleClick}
		/>
	);
}

/**
 * Zod schema for validating the game case GLTF structure.
 */
const GameCaseGLTFSchema = z
	.object({
		scene: z.instanceof(THREE.Group),
		animations: z.array(z.instanceof(THREE.AnimationClip)),
	})
	.passthrough();
