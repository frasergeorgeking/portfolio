import { MathUtils } from "three";

interface CameraFitOptions {
	subjectWidth: number;
	viewportWidth: number;
	viewportHeight: number;
	verticalFov: number;
	minimumDistance: number;
	padding?: number;
}

/**
 * Calculates the distance required for a perspective camera to contain a
 * subject horizontally while preserving the authored camera distance as the
 * minimum. Wide canvases retain the original composition; narrow canvases move
 * the camera backwards just far enough to fit the padded subject width.
 *
 * @param options - Camera and viewport values used to calculate the fit.
 * @param options.subjectWidth - Width of the subject's framing envelope in
 * world units.
 * @param options.viewportWidth - Current viewport width in CSS pixels.
 * @param options.viewportHeight - Current viewport height in CSS pixels.
 * @param options.verticalFov - Camera's vertical field of view in degrees.
 * @param options.minimumDistance - Authored camera distance that must not be
 * reduced.
 * @param options.padding - Multiplier applied to the subject width. Defaults to
 * `1.12`, providing 12 percent horizontal padding.
 * @returns The absolute camera distance in world units, or `null` when any
 * required dimension or camera setting is not yet valid.
 */
export function calculateCameraDistance({
	subjectWidth,
	viewportWidth,
	viewportHeight,
	verticalFov,
	minimumDistance,
	padding = 1.12,
}: CameraFitOptions): number | null {
	if (
		viewportWidth <= 0 ||
		viewportHeight <= 0 ||
		subjectWidth <= 0 ||
		verticalFov <= 0 ||
		verticalFov >= 180 ||
		padding <= 0 ||
		minimumDistance <= 0
	) {
		return null;
	}

	const aspectRatio = viewportWidth / viewportHeight;
	const halfVerticalFov = MathUtils.degToRad(verticalFov / 2);
	const horizontalFitDistance =
		(subjectWidth * padding) / (2 * Math.tan(halfVerticalFov) * aspectRatio);

	return Math.max(minimumDistance, horizontalFitDistance);
}
