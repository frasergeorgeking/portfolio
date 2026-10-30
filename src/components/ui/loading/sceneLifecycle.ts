import type { Scene } from "three";

type SceneState = "loading" | "ready" | "error";

class SceneLifecycle {
	private state: SceneState = "loading";
	private loadingTimer?: ReturnType<typeof setTimeout>;
	private readonly element: HTMLElement;

	constructor(element: HTMLElement) {
		this.element = element;
	}

	connect(): () => void {
		this.clearLoadingTimer();
		if (this.state === "loading") {
			this.loadingTimer = setTimeout(() => {
				this.element
					.querySelector<HTMLElement>("[data-loading]")
					?.classList.add("opacity-100", "animate-pulse");
			}, 1000);
		}
		return () => this.clearLoadingTimer();
	}

	ready(): void {
		if (this.state === "loading") {
			this.transition("ready");
		}
	}

	fail(): void {
		if (this.state !== "error") {
			this.transition("error");
		}
	}

	private clearLoadingTimer(): void {
		clearTimeout(this.loadingTimer);
		this.loadingTimer = undefined;
	}

	private transition(state: "ready" | "error"): void {
		this.state = state;
		this.element.dataset.state = state;
		this.clearLoadingTimer();

		const loading = this.element.querySelector<HTMLElement>("[data-loading]");
		loading?.classList.add("hidden");
		loading?.classList.remove("opacity-100", "animate-pulse");
		this.element
			.querySelector<HTMLElement>("[data-content]")
			?.classList.toggle("invisible", state !== "ready");
		const error = this.element.querySelector<HTMLElement>("[data-error]");
		error?.classList.toggle("hidden", state !== "error");
		error?.classList.toggle("flex", state === "error");
	}
}

const lifecycles = new WeakMap<HTMLElement, SceneLifecycle>();

function getLifecycle(element: HTMLElement): SceneLifecycle {
	let lifecycle = lifecycles.get(element);
	if (!lifecycle) {
		lifecycle = new SceneLifecycle(element);
		lifecycles.set(element, lifecycle);
	}
	return lifecycle;
}

export function connectLazyScene(element: HTMLElement): () => void {
	return getLifecycle(element).connect();
}

function signalLazySceneReady(boundaryId: string): void {
	const element = document.getElementById(boundaryId);
	if (element) {
		getLifecycle(element).ready();
	}
}

/** Observe the loaded model's first render without changing the render loop. */
export function observeSceneReady(
	scene: Scene,
	boundaryId: string,
): () => void {
	const previousAfterRender = scene.onAfterRender;
	let pending = true;
	const disconnect = () => {
		pending = false;
		if (scene.onAfterRender === afterRender) {
			scene.onAfterRender = previousAfterRender;
		}
	};
	const afterRender: typeof scene.onAfterRender = (...args) => {
		previousAfterRender.apply(scene, args);
		if (pending) {
			disconnect();
			signalLazySceneReady(boundaryId);
		}
	};
	scene.onAfterRender = afterRender;
	return disconnect;
}

export function signalLazySceneError(boundaryId: string, error: unknown): void {
	console.error(`Unable to load lazy scene "${boundaryId}".`, error);
	const element = document.getElementById(boundaryId);
	if (element) {
		getLifecycle(element).fail();
	}
}
