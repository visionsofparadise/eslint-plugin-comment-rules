import rule from "./rule";
import type { ESLint, Linter } from "eslint";

const plugin = {
	meta: {
		name: "eslint-plugin-comment-rules",
		version: "0.1.0",
	},
	rules: {
		"no-restricted-comments": rule,
	},
	configs: {} as Record<string, Linter.Config>,
} satisfies ESLint.Plugin;

function policyConfig(name: "none" | "safe" | "docs"): Linter.Config {
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

export default plugin;
export { plugin as "module.exports" };
