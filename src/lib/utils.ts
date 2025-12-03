import { type ClassValue, clsx } from "clsx";
import type { RefObject } from "react";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names with intelligent Tailwind CSS conflict resolution.
 *
 * Combines multiple class name inputs and automatically resolves conflicting
 * Tailwind classes by keeping the last occurrence. Accepts strings, objects,
 * arrays, and conditional class names.
 *
 * @param inputs - Class names to merge. Accepts:
 *   - Strings: "text-red-500 font-bold"
 *   - Objects: { "active": true, "disabled": false }
 *   - Arrays: ["px-4", "py-2"]
 *   - Mixed/nested combinations
 *
 * @returns A single merged class name string with conflicts resolved
 *
 * @example
 * ```tsx
 * // Basic usage
 * classNames("px-2 py-1", "px-4")
 * // Returns: "py-1 px-4"
 *
 * // Conditional classes
 * classNames("btn", { "btn-active": isActive, "btn-disabled": !isActive })
 *
 * // Component with prop overrides
 * function Button({ className, ...props }) {
 *   return (
 *     <button
 *       className={classNames("px-4 py-2 bg-blue-500 rounded", className)}
 *       {...props}
 *     />
 *   );
 * }
 * ```
 */
export function mergeClassNames(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Asserts that the provided input is not nullish.
 * @param input Input to validate.
 */
export function assertNotNullish<T>(
	input: T | null | undefined,
): asserts input is T {
	if (input === null) {
		throw new Error("Assertion as not nullish failed. Input is null.");
	}

	if (input === undefined) {
		throw new Error("Assertion as not nullish failed. Input is undefined.");
	}
}
