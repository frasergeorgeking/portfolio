/**
 * Global events that are dispatched to the window.
 */
export namespace GlobalEvents {
	/**
	 * Notified when the lanyard component has been loaded.
	 */
	export const LanyardLoaded = new CustomEvent("lanyard_loaded");
}
