import * as THREE from "three";
import fragmentShader from "./lanyard.frag";
import vertexShader from "./lanyard.vert";

const TEXTURE_REPEAT = new THREE.Vector2(-4, 1);

/**
 * Screen-space material for the textured lanyard strap.
 */
export class LanyardMaterial extends THREE.ShaderMaterial {
	public constructor(map: THREE.Texture, lineWidth: number) {
		super({
			depthTest: false,
			fragmentShader,
			uniforms: {
				lineWidth: { value: lineWidth },
				map: { value: map },
				repeat: { value: TEXTURE_REPEAT.clone() },
				resolution: { value: new THREE.Vector2(1, 1) },
			},
			vertexShader,
		});

		this.name = "LanyardMaterial";
	}

	/** Screen dimensions used to maintain a consistent strap width. */
	public get resolution(): THREE.Vector2 {
		return this.uniforms.resolution.value as THREE.Vector2;
	}

	public set resolution(value: THREE.Vector2) {
		this.resolution.copy(value);
	}
}
