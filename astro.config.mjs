// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://diskpress.app",
	output: "static",
	compressHTML: true,
	trailingSlash: "always",
	devToolbar: { enabled: false },
	build: { inlineStylesheets: "always" },
});
