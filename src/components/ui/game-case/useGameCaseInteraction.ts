import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { useGameCaseAnimations } from "@/components/ui/game-case/useGameCaseAnimations";

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

interface GameCaseInteractionOptions {
	animations: THREE.AnimationClip[];
	model: THREE.Object3D;
	canvasMissHandler: RefObject<() => void>;
}

export function useGameCaseInteraction({
	animations,
	model,
	canvasMissHandler,
}: GameCaseInteractionOptions) {
	const group = useRef<THREE.Group>(null);
	const isDragging = useRef(false);
	const isGliding = useRef(false);
	const momentumVelocity = useRef(0);
	const suppressNextClick = useRef(false);
	const { renderEnabled, turntableEnabled } = useRenderActivity();
	const canvas = useThree((state) => state.gl.domElement);
	const clock = useThree((state) => state.clock);
	const invalidate = useThree((state) => state.invalidate);
	const { dismissActiveLayer, interactWithModel, isAnimating } =
		useGameCaseAnimations(animations, model);
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
				// A stationary release must also wake the automatic turntable.
				if (isGliding.current || turntableEnabled.current) {
					if (!isGliding.current) {
						// Advance the clock's last-read time, discarding the idle interval.
						clock.getDelta();
					}
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
	}, [canvas, clock, invalidate, turntableEnabled]);

	// Drei's animation mixer runs first, including its finished notifications.
	useFrame((_, delta) => {
		let shouldContinue = isAnimating.current && renderEnabled.current;

		if (group.current && !isDragging.current) {
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

				// Keep the final continuation frame even when this glide settles.
				shouldContinue ||= renderEnabled.current;
			} else if (turntableEnabled.current) {
				group.current.rotation.y += delta * INTERACTION_CONFIG.turntableSpeed;
				shouldContinue = true;
			}
		}

		if (shouldContinue) {
			invalidate();
		}
	});

	return {
		ref: group,
		onClick: handleModelClick,
		onPointerEnter: () => canvas.style.setProperty("cursor", "grab"),
		onPointerLeave: () => canvas.style.removeProperty("cursor"),
	};
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
