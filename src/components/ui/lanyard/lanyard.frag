#include <logdepthbuf_pars_fragment>

uniform sampler2D map;
uniform vec2 repeat;

varying vec2 vUV;

void main() {
	#include <logdepthbuf_fragment>

	gl_FragColor = texture2D(map, vUV * repeat);

	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
