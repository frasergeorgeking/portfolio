#include <common>

uniform float time;
uniform float holoIntensity;
uniform float rainbowScale;
uniform float sparkleSize;
uniform float minAngle;
uniform float maxAngle;
uniform float baseHoloAmount;

// Rainbow colors
vec3 rainbow(float t) {
    float r = sin(t * 6.28318) * 0.5 + 0.5;
    float g = sin(t * 6.28318 + 2.094) * 0.5 + 0.5;
    float b = sin(t * 6.28318 + 4.189) * 0.5 + 0.5;
    return vec3(r, g, b);
}

// Sparkle effect
float sparkle(vec2 uv, float time) {
    vec2 sparkleUV = uv * sparkleSize;
    sparkleUV.x += time * 0.15;
    sparkleUV.y += time * 0.1;
    float n1 = fract(sin(dot(sparkleUV, vec2(12.9898, 78.233))) * 43758.5453);
    float n2 = fract(sin(dot(sparkleUV + vec2(1.0, 1.0), vec2(93.989, 67.345))) * 28653.1234);
    return step(0.985, n1) * n2;
}

// Holographic pattern
float holoPattern(vec2 uv, float time) {
    float stripes = sin((uv.x + uv.y) * rainbowScale + time * 1.0) * 0.5 + 0.5;
    vec2 center = vec2(0.5, 0.5);
    float dist = length(uv - center);
    float waves = sin(dist * 10.0 - time * 2.0) * 0.5 + 0.5;
    return mix(stripes, waves, 0.3);
}