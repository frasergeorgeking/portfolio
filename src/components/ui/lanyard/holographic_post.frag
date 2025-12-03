#include <dithering_fragment>

// Get UV coordinates
vec2 holoUv = vMapUv;

// Calculate viewing angle
vec3 viewDir = normalize(vViewPosition);
float viewAngle = abs(dot(vNormal, viewDir));

// Angle-dependent visibility with minimum base value
float angleVisibility = smoothstep(minAngle, maxAngle, viewAngle) *
    (1.0 - smoothstep(maxAngle, 1.0, viewAngle));
// Ensure there's always some visibility
angleVisibility = max(angleVisibility, baseHoloAmount);

// Fresnel effect (stronger at edges)
float fresnel = pow(1.0 - viewAngle, 2.0);

// Holographic pattern
float pattern = holoPattern(holoUv, time);

// Rainbow color
float rainbowPos = holoUv.x + holoUv.y * 0.3 + pattern * 0.2 + time * 0.08;
vec3 rainbowColor = rainbow(rainbowPos);

// Sparkles
float sparkles = sparkle(holoUv, time);

// Base iridescence (always visible)
vec3 baseIridescence = rainbow(holoUv.x + holoUv.y * 0.5 + time * 0.05) * baseHoloAmount * 0.3;
gl_FragColor.rgb += baseIridescence;

// Apply angle-dependent holographic effect
float holoStrength = angleVisibility * pattern * holoIntensity;
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + rainbowColor * 0.7, holoStrength * 0.5);

// Add fresnel shimmer (always somewhat visible)
gl_FragColor.rgb += rainbowColor * fresnel * max(angleVisibility, 0.15) * 0.3;

// Add sparkles
gl_FragColor.rgb += vec3(1.0, 0.95, 1.0) * sparkles * angleVisibility * 2.0;

// Overall iridescence layer
gl_FragColor.rgb += rainbowColor * angleVisibility * 0.15;