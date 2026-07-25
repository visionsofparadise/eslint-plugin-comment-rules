import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const distPath = join(root, "dist", "index.js");

describe("dist interop", () => {
	it("require returns the plugin object", () => {
		const plugin = require(distPath) as { rules?: Record<string, unknown>; default?: unknown };

		expect(plugin.rules?.["no-restricted-comments"]).toBeDefined();
		expect(plugin.default).toBeUndefined();
	});

	it("default import returns the plugin object", async () => {
		const module = (await import(distPath)) as {
			default: { rules?: Record<string, unknown> };
		};

		expect(module.default.rules?.["no-restricted-comments"]).toBeDefined();
	});
});
