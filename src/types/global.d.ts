import type { ThreeElement } from "@react-three/fiber";
import type { MeshLineGeometry } from "meshline";
import type { LanyardMaterial } from "../components/ui/lanyard/LanyardMaterial";

declare module "*.glb" {
	const value: string;
	export default value;
}

declare module "*.png" {
	const value: import("astro").ImageMetadata;
	export default value;
}

// Extend the ThreeElements from react-three-fiber
declare module "@react-three/fiber" {
	interface ThreeElements {
		lanyardMaterial: ThreeElement<typeof LanyardMaterial>;
		meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
	}
}
