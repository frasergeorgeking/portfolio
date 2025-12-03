// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import glsl from "vite-plugin-glsl";

// https://astro.build/config
export default defineConfig({
	integrations: [react()],
	vite: {
		plugins: [tailwindcss(), glsl({ minify: true })],
		assetsInclude: ["**/*.glb"],
	},
});
