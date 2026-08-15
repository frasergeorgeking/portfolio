import type { ImageMetadata } from "astro";

export interface GameCaseSkin {
	caseBack: ImageMetadata;
	caseFront: ImageMetadata;
	casePromo: ImageMetadata;
	caseInner: ImageMetadata;
	discBack: ImageMetadata;
	discFront: ImageMetadata;
}

export type GameCaseTextureUrls = {
	[Surface in keyof GameCaseSkin]: string;
};
