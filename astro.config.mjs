// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
	site: "https://diskpress.app",
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
});
