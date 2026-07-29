import rule from "./rule";
import type { ESLint, Linter } from "eslint";

/* eslint-disable @typescript-eslint/naming-convention, @stylistic/padding-line-between-statements -- tsup define injects these from package.json */
declare const __PACKAGE_NAME__: string;
declare const __PACKAGE_VERSION__: string;
/* eslint-enable @typescript-eslint/naming-convention, @stylistic/padding-line-between-statements */

const plugin = {
	meta: {
		name: __PACKAGE_NAME__,
		version: __PACKAGE_VERSION__,
	},
	rules: {
		"no-restricted-comments": rule,
	},
	configs: {} as Record<string, Linter.Config>,
} satisfies ESLint.Plugin;

function policyConfig(name: "none" | "safe" | "docs" | "docs-report"): Linter.Config {
	return {
		name: `comment-rules/${name}`,
		plugins: {
			"comment-rules": plugin,
		},
		rules: {
			"comment-rules/no-restricted-comments": ["error", name],
		},
	};
}

plugin.configs.none = policyConfig("none");
plugin.configs.safe = policyConfig("safe");
plugin.configs.docs = policyConfig("docs");
plugin.configs["docs-report"] = policyConfig("docs-report");

export default plugin;
export { plugin as "module.exports" };
