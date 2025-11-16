declare module "*.glb" {
	const value: string;
	export default value;
}

declare module "*.png" {
	const value: import("astro").ImageMetadata;
	export default value;
}

import type { Object3DNode } from "@react-three/fiber";
// Type definitions for meshline extended components
import type { MeshLineGeometry, MeshLineMaterial } from "meshline";

// Extend the ThreeElements from react-three-fiber
declare module "@react-three/fiber" {
	interface ThreeElements {
		meshLineGeometry: Object3DNode<MeshLineGeometry, typeof MeshLineGeometry>;
		meshLineMaterial: Object3DNode<MeshLineMaterial, typeof MeshLineMaterial>;
	}
}
