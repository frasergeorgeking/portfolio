#include <common>
#include <logdepthbuf_pars_vertex>

attribute vec3 previous;
attribute vec3 next;
attribute float side;
attribute float width;

uniform vec2 resolution;
uniform float lineWidth;

varying vec2 vUV;

const float ENDPOINT_EPSILON = 0.00001;

vec2 toScreenSpace(vec4 position, float aspect) {
	vec2 screenPosition = position.xy / position.w;
	screenPosition.x *= aspect;
	return screenPosition;
}

void main() {
	float aspect = resolution.x / resolution.y;
	mat4 transform = projectionMatrix * modelViewMatrix;

	vec4 finalPosition = transform * vec4(position, 1.0) * aspect;
	vec2 currentPosition = toScreenSpace(finalPosition, aspect);
	vec2 previousPosition = toScreenSpace(
		transform * vec4(previous, 1.0),
		aspect
	);
	vec2 nextPosition = toScreenSpace(transform * vec4(next, 1.0), aspect);

	vec2 direction;
	if (distance(nextPosition, currentPosition) < ENDPOINT_EPSILON) {
		direction = normalize(currentPosition - previousPosition);
	} else if (distance(previousPosition, currentPosition) < ENDPOINT_EPSILON) {
		direction = normalize(nextPosition - currentPosition);
	} else {
		vec2 incomingDirection = normalize(currentPosition - previousPosition);
		vec2 outgoingDirection = normalize(nextPosition - currentPosition);
		direction = normalize(incomingDirection + outgoingDirection);
	}

	vec2 normal = vec2(-direction.y, direction.x) * 0.5 * lineWidth * width;
	normal *= finalPosition.w;
	normal /= (vec4(resolution, 0.0, 1.0) * projectionMatrix).xy * aspect;

	finalPosition.xy += normal * side;
	gl_Position = finalPosition;
	vUV = uv;

	#include <logdepthbuf_vertex>
}
