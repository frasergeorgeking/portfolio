#include <dithering_fragment>

vec2 holoUv = vMapUv;
vec3 holoViewDirection = normalize(vViewPosition);
vec3 holoSurfaceNormal = normalize(vNormal);

float holoNdotV = clamp(abs(dot(holoSurfaceNormal, holoViewDirection)), 0.0, 1.0);

mat3 holoFrame = holoTangentFrame(holoSurfaceNormal, -vViewPosition, holoUv);
vec2 holoViewAcrossFoil = vec2(dot(holoViewDirection, holoFrame[0]), dot(holoViewDirection, holoFrame[1]));

// Broad UV bands make the spectrum legible across pale artwork. The viewing
// direction shifts those bands. There is deliberately no time term here.
float holoBands = (holoUv.x * 1.15 + holoUv.y * 0.35 + sin((holoUv.y - holoUv.x) * 5.0) * 0.06) * holoBandScale;
float holoPhase = holoBands + ((1.0 - holoNdotV) * 2.8 + dot(holoViewAcrossFoil, HOLO_BAND_DIRECTION) * 1.7) * holoViewShift;
vec3 holoColor = holoSpectrum(holoPhase);

float holoFacing = smoothstep(HOLO_FACING_START, HOLO_FACING_END, 1.0 - holoNdotV);
// Use the unperturbed card surface for a broad, predictable reveal. A small
// idle presence keeps the foil readable head-on; modest tilts bring it forward.
float holoPresence = holoPresenceFromAngle(holoNdotV);
float holoBroadSheen = holoPresence * (0.35 + holoFacing * 0.65);

vec3 holoSheen = holoColor * holoBroadSheen * holoIntensity;
// A narrow spectral peak adds the bright colour separation associated with
// diffraction foil without duplicating the scene's physical white reflections.
float holoDiffractionPeak = pow(0.5 + 0.5 * cos(HOLO_TAU * holoPhase), 10.0) * holoPresence;

// Fine directional grooves add a second scale of colour separation. The
// sinusoidal profile stays soft enough to avoid a printed-line appearance.
float holoFinePhase = dot(holoUv, HOLO_GROOVE_DIRECTION) * holoLineFrequency + dot(holoViewAcrossFoil, HOLO_GROOVE_VIEW_DIRECTION) * 2.2;
float holoFineVisibility = 1.0 - smoothstep(0.25, 0.75, fwidth(holoFinePhase));
float holoFineLines = pow(0.5 + 0.5 * cos(HOLO_TAU * holoFinePhase), 4.0) * holoPresence * holoFineVisibility;

// Keep the colour close to the card perimeter, then strengthen it as the
// surface turns away. The small base response remains legible when head-on.
float holoEdgeMask = holoEdgeMaskFromUv(holoUv);
float holoEdgeFresnel = pow(1.0 - holoNdotV, 1.5);
float holoEdge = holoEdgeMask * (0.15 + holoEdgeFresnel * 0.85) * holoPresence * holoEdgeStrength;
vec3 holoEdgeColor = holoSpectrum(holoPhase + 0.18);

// Protect darker artwork from additive foil light. Pale substrate keeps the
// full effect, while text and fine facial features retain their contrast.
float holoArtworkMask = holoArtworkMaskFromColor(gl_FragColor.rgb);

// Multiplicative tint preserves dark print and remains visible on white areas,
// where screen blending alone would wash the rainbow out.
vec3 holoTintedBase = gl_FragColor.rgb * (0.62 + holoColor * 0.76);
float holoTintAmount = holoPresence * (0.18 + holoFacing * 0.1) * holoIntensity * mix(0.55, 1.0, holoArtworkMask);
gl_FragColor.rgb = mix(gl_FragColor.rgb, holoTintedBase, holoTintAmount);

// A restrained screen sheen keeps a reflective highlight without exposing the
// microstructure as a layer of white noise.
gl_FragColor.rgb = holoScreen(gl_FragColor.rgb, holoSheen * holoArtworkMask * holoSheenStrength);

gl_FragColor.rgb = holoScreen(gl_FragColor.rgb, holoColor * holoDiffractionPeak * holoArtworkMask * holoDiffractionStrength);
gl_FragColor.rgb = holoScreen(gl_FragColor.rgb, holoColor * holoFineLines * holoLineStrength * holoArtworkMask);
gl_FragColor.rgb = holoScreen(gl_FragColor.rgb, holoEdgeColor * holoEdge);
