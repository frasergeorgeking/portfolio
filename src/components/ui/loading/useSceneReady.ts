import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { observeSceneReady } from "@/components/ui/loading/sceneLifecycle";

/**
 * Reports scene readiness after the loaded model's first render.
 *
 * Call inside the model that suspends while loading its assets so readiness
 * cannot be reported before the model is available to render.
 *
 * @param boundaryId - The ID of the lazy scene element to mark as ready.
 */
export function useSceneReady(boundaryId: string): void {
	const scene = useThree((state) => state.scene);
	const invalidate = useThree((state) => state.invalidate);

	useLayoutEffect(() => {
		const disconnect = observeSceneReady(scene, boundaryId);
		// Demand-rendered scenes also need a first frame after their assets commit.
		invalidate();
		return disconnect;
	}, [boundaryId, invalidate, scene]);
}
