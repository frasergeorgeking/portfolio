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
	rotationSpeed?: number;
}

export default function GameCase({
	position = [0, 0, 24],
	fov = 8,
	transparent = true,
	rotationSpeed = 0.45,
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
				<GameCaseModel rotationSpeed={rotationSpeed} />
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

function GameCaseModel({ rotationSpeed }: { rotationSpeed: number }) {
	const gltfData = useGLTF(caseGLB);

	const { scene, animations } = useMemo(
		() => GameCaseGLTFSchema.parse(gltfData),
		[gltfData],
	);

	const sceneGroupRef = useRef<THREE.Group>(null);
	const { actions, mixer } = useAnimations(animations, sceneGroupRef);
	const [caseState, setCaseState] = useState<CaseState>("closed");
	const isAnimatingRef = useRef(false);
	const caseActionRef = useRef<THREE.AnimationAction>(null);
	const discActionRef = useRef<THREE.AnimationAction>(null);
	const [hovered, hover] = useState(false);
	const [processedActions, setProcessedActions] = useState<z.infer<
		typeof GameCaseActionsSchema
	> | null>(null);

	// Validate and store actions once mixer initializes them
	useEffect(() => {
		if (mixer) {
			const parsed = GameCaseActionsSchema.parse(actions);
			setProcessedActions(parsed);
		}
	}, [mixer, actions]);

	useFrame((_, delta) => {
		if (sceneGroupRef.current) {
			sceneGroupRef.current.rotation.y += delta * rotationSpeed;
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

	const playAction = (action: THREE.AnimationAction) => {
		// Reset time scale in case previously sped up.
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

		// If actions are not ready, do nothing.
		if (processedActions == null) {
			return;
		}

		// Prevent new animations while one is playing, but speed up the current one.
		if (isAnimatingRef.current) {
			mixer.timeScale = 4;
			return;
		}

		const objectName = e.object.name;

		if (objectName.startsWith("case_")) {
			if (caseState === "closed") {
				caseActionRef.current?.stop();

				caseActionRef.current = processedActions.case_open;
				playAction(caseActionRef.current);
				setCaseState("opened");
			} else if (caseState === "opened") {
				caseActionRef.current?.stop();

				caseActionRef.current = processedActions.case_close;
				playAction(caseActionRef.current);
				setCaseState("closed");
			} else if (caseState === "disc_revealed") {
				discActionRef.current?.stop();

				// Reverse the disc reveal animation
				playAction(processedActions.disc_hide);
				setCaseState("opened");
			}
		} else if (objectName.startsWith("disc_")) {
			if (caseState === "closed") {
				return;
			}

			discActionRef.current?.stop();

			if (caseState === "opened") {
				discActionRef.current = processedActions.disc_reveal;
				playAction(discActionRef.current);
				setCaseState("disc_revealed");
			}

			if (caseState === "disc_revealed") {
				discActionRef.current = processedActions.disc_spin;
				playAction(discActionRef.current);
			}
		} else {
			throw new Error(`Unhandled object name: ${objectName}`);
		}
	};

	return (
		<primitive
			ref={sceneGroupRef}
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

/**
 * Zod schema for validating the game case animation actions.
 */
const GameCaseActionsSchema = z
	.object({
		case_open: z.instanceof(THREE.AnimationAction),
		case_close: z.instanceof(THREE.AnimationAction),
		disc_reveal: z.instanceof(THREE.AnimationAction),
		disc_hide: z.instanceof(THREE.AnimationAction),
		disc_spin: z.instanceof(THREE.AnimationAction),
	})
	.strict();
