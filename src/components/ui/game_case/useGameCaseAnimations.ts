import { useAnimations } from "@react-three/drei";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

const ANIMATION_NAMES = {
	caseClose: "case_close",
	caseOpen: "case_open",
	discReveal: "disc_reveal",
	discHide: "disc_hide",
	discSpin: "disc_spin",
} as const;

type AnimationName = (typeof ANIMATION_NAMES)[keyof typeof ANIMATION_NAMES];
type CaseState = "closed" | "opening" | "open" | "closing";
type DiscState = "hidden" | "revealing" | "revealed" | "spinning" | "hiding";

export function useGameCaseAnimations(
	animations: THREE.AnimationClip[],
	model: THREE.Object3D,
) {
	const caseState = useRef<CaseState>("closed");
	const discState = useRef<DiscState>("hidden");
	const { actions, mixer } = useAnimations(animations, model);

	const playAnimation = useCallback(
		(name: AnimationName) => {
			const action = actions[name];
			if (!action) {
				throw new Error(`Game case GLB is missing animation "${name}".`);
			}

			const relatedNames = name.startsWith("case_")
				? [ANIMATION_NAMES.caseClose, ANIMATION_NAMES.caseOpen]
				: [
						ANIMATION_NAMES.discReveal,
						ANIMATION_NAMES.discHide,
						ANIMATION_NAMES.discSpin,
					];
			for (const relatedName of relatedNames) {
				actions[relatedName]?.stop();
			}

			action.clampWhenFinished = true;
			action.setLoop(THREE.LoopOnce, 1);
			action.reset();
			action.setEffectiveTimeScale(1);
			action.play();
		},
		[actions],
	);
	const startCaseAnimation = useCallback(
		(
			name: typeof ANIMATION_NAMES.caseOpen | typeof ANIMATION_NAMES.caseClose,
		) => {
			playAnimation(name);
			caseState.current =
				name === ANIMATION_NAMES.caseOpen ? "opening" : "closing";
		},
		[playAnimation],
	);
	const startDiscAnimation = useCallback(
		(
			name: typeof ANIMATION_NAMES.discReveal | typeof ANIMATION_NAMES.discHide,
		) => {
			playAnimation(name);
			discState.current =
				name === ANIMATION_NAMES.discReveal ? "revealing" : "hiding";
		},
		[playAnimation],
	);

	const hideDisc = useCallback(() => {
		if (discState.current !== "revealed" && discState.current !== "spinning") {
			return;
		}

		startDiscAnimation(ANIMATION_NAMES.discHide);
	}, [startDiscAnimation]);
	const revealDisc = useCallback(() => {
		if (discState.current === "hidden") {
			startDiscAnimation(ANIMATION_NAMES.discReveal);
		}
	}, [startDiscAnimation]);
	const dismissActiveLayer = useCallback(() => {
		if (discState.current === "revealed" || discState.current === "spinning") {
			hideDisc();
			return;
		}

		if (discState.current === "hidden" && caseState.current === "open") {
			startCaseAnimation(ANIMATION_NAMES.caseClose);
		}
	}, [hideDisc, startCaseAnimation]);

	const interactWithModel = useCallback(
		(clickedDisc: boolean) => {
			if (discState.current === "revealed") {
				if (clickedDisc) {
					discState.current = "spinning";
					playAnimation(ANIMATION_NAMES.discSpin);
				} else {
					hideDisc();
				}
				return;
			}

			if (discState.current === "spinning") {
				if (clickedDisc) {
					playAnimation(ANIMATION_NAMES.discSpin);
				} else {
					hideDisc();
				}
				return;
			}

			if (discState.current !== "hidden") {
				return;
			}

			if (caseState.current === "closed") {
				startCaseAnimation(ANIMATION_NAMES.caseOpen);
				return;
			}

			if (caseState.current !== "open") {
				return;
			}

			if (clickedDisc) {
				revealDisc();
			} else {
				startCaseAnimation(ANIMATION_NAMES.caseClose);
			}
		},
		[hideDisc, playAnimation, revealDisc, startCaseAnimation],
	);

	useEffect(() => {
		const handleFinished = ({ action }: { action: THREE.AnimationAction }) => {
			switch (action.getClip().name) {
				case ANIMATION_NAMES.caseOpen:
					caseState.current = "open";
					break;
				case ANIMATION_NAMES.caseClose:
					caseState.current = "closed";
					break;
				case ANIMATION_NAMES.discReveal:
					discState.current = "revealed";
					break;
				case ANIMATION_NAMES.discHide:
					discState.current = "hidden";
					break;
				case ANIMATION_NAMES.discSpin:
					discState.current = "revealed";
					break;
			}
		};

		mixer.addEventListener("finished", handleFinished);
		return () => mixer.removeEventListener("finished", handleFinished);
	}, [mixer]);

	return { dismissActiveLayer, interactWithModel };
}
