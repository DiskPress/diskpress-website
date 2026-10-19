// @ts-check
import { defineConfig } from "astro/config";
import { localizedNotFound } from "./src/i18n/build.mjs";

export default defineConfig({
	site: "https://diskpress.app",
	output: "static",
	compressHTML: true,
	trailingSlash: "always",
	devToolbar: { enabled: false },
	build: { inlineStylesheets: "always" },
	integrations: [localizedNotFound()],
});
