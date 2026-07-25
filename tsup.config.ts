import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
	name: string;
	version: string;
};

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	sourcemap: true,
	clean: true,
	splitting: false,
	target: "node20",
	define: {
		__PACKAGE_NAME__: JSON.stringify(packageJson.name),
		__PACKAGE_VERSION__: JSON.stringify(packageJson.version),
	},
});
