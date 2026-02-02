import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { monaco } from "@bithero/monaco-editor-vite-plugin";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		monaco({
			features: "all",
			languages: ["sql"],
			globalAPI: true,
		}),
	],
	server: {
		proxy: {
			"/api": "http://localhost:5000", // only works for development server
		},
	},
});
