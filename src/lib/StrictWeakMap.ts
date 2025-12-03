import { assertNotNullish } from "./Utils";

/**
 * A strict implementation of WeakMap, guaranteeing all retrieved values
 * exist.
 */
export class StrictWeakMap<K extends WeakKey, V> extends WeakMap<K, V> {
	/**
	 * Returns a specific element, internally throwing an
	 * error if undefined.
	 * @param key Key to retrieve the value for.
	 * @returns Retrieved value.
	 */
	public get(key: K): V {
		const retrieved = super.get(key);
		assertNotNullish(retrieved);

		return retrieved;
	}
}
