export const LAZY_SCENE_READY_EVENT = "lazy-scene:ready";
export const LAZY_SCENE_ERROR_EVENT = "lazy-scene:error";

function getBoundary(boundaryId: string): HTMLElement | null {
	return document.getElementById(boundaryId);
}

export function signalLazySceneReady(boundaryId: string): void {
	getBoundary(boundaryId)?.dispatchEvent(
		new CustomEvent(LAZY_SCENE_READY_EVENT, {
			bubbles: false,
		}),
	);
}

export function signalLazySceneError(boundaryId: string, error: unknown): void {
	console.error(`Unable to load lazy scene "${boundaryId}".`, error);
	getBoundary(boundaryId)?.dispatchEvent(
		new CustomEvent(LAZY_SCENE_ERROR_EVENT, {
			bubbles: false,
		}),
	);
}
