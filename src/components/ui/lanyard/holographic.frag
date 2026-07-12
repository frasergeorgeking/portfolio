#include <common>

uniform float holoIntensity;
uniform float holoLineStrength;
uniform float holoEdgeStrength;
uniform float holoArtworkProtection;
uniform float holoBandScale;
uniform float holoViewShift;
uniform float holoLineFrequency;
uniform float holoSheenStrength;
uniform float holoDiffractionStrength;
uniform float holoIdlePresence;

const float HOLO_TAU = 6.2831853;
const vec3 HOLO_LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec2 HOLO_BAND_DIRECTION = vec2(0.82, 0.57);
const vec2 HOLO_GROOVE_DIRECTION = vec2(0.94, 0.34);
const vec2 HOLO_GROOVE_VIEW_DIRECTION = vec2(0.34, -0.94);

const float HOLO_FACING_START = 0.04;
const float HOLO_FACING_END = 0.42;
const float HOLO_REVEAL_START = 0.01;
const float HOLO_REVEAL_END = 0.05;
const float HOLO_EDGE_INNER = 0.015;
const float HOLO_EDGE_OUTER = 0.08;
const float HOLO_DARK_LUMA = 0.08;
const float HOLO_LIGHT_LUMA = 0.55;

// A compact spectral palette with the cyan, magenta, green and gold peaks
// characteristic of diffraction foil.
vec3 holoSpectrum(float phase) {
    vec3 offsets = vec3(0.00, 0.33, 0.67);
    vec3 color = 0.55 + 0.45 * cos(HOLO_TAU * (phase + offsets));
    return pow(color, vec3(1.15));
}

// Builds a view-space tangent frame from screen-space derivatives. The card
// model does not need precomputed tangents for the directional foil bands.
mat3 holoTangentFrame(vec3 normal, vec3 viewPosition, vec2 uv) {
    vec3 positionDx = dFdx(viewPosition);
    vec3 positionDy = dFdy(viewPosition);
    vec2 uvDx = dFdx(uv);
    vec2 uvDy = dFdy(uv);

    vec3 tangent = normalize(positionDx * uvDy.y - positionDy * uvDx.y);
    vec3 bitangent = normalize(-positionDx * uvDy.x + positionDy * uvDx.x);

    return mat3(tangent, bitangent, normal);
}

float holoPresenceFromAngle(float ndotv) {
    float reveal = smoothstep(HOLO_REVEAL_START, HOLO_REVEAL_END, 1.0 - ndotv);
    return mix(holoIdlePresence, 1.0, reveal);
}

float holoEdgeMaskFromUv(vec2 uv) {
    float edgeDistance = min(
        min(uv.x, 1.0 - uv.x),
        min(uv.y, 1.0 - uv.y)
    );
    return 1.0 - smoothstep(HOLO_EDGE_INNER, HOLO_EDGE_OUTER, edgeDistance);
}

float holoArtworkMaskFromColor(vec3 color) {
    float luminance = dot(color, HOLO_LUMA);
    float lightArtwork = smoothstep(HOLO_DARK_LUMA, HOLO_LIGHT_LUMA, luminance);
    return mix(1.0, mix(0.2, 1.0, lightArtwork), holoArtworkProtection);
}

vec3 holoScreen(vec3 base, vec3 layer) {
    return 1.0 - (1.0 - base) * (1.0 - layer);
}
