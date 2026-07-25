import { Linter } from "eslint";
import type { Comment } from "estree";

const forms = [
	"/* eslint-disable no-console */",
	"// eslint-disable-next-line no-console",
	"/* eslint-enable no-console */",
	"/* eslint-env node */",
	"/* global foo */",
	"/* globals bar */",
	"/* exported baz */",
];

describe("getInlineConfigNodes", () => {
	it("returns the seven directive forms and excludes the shebang", () => {
		const source = `#! /usr/bin/env node\n${forms.join("\n")}\nconst x = 1;`;
		const linter = new Linter({ configType: "flat" });
		let nodes: Array<Comment> = [];

		linter.verify(
			source,
			[
				{
					languageOptions: {
						ecmaVersion: "latest",
						sourceType: "module",
					},
					plugins: {
						test: {
							rules: {
								capture: {
									create(context) {
										return {
											"Program:exit"() {
												const sourceCode = context.sourceCode as typeof context.sourceCode & {
													getInlineConfigNodes?: () => Array<Comment>;
												};

												nodes = sourceCode.getInlineConfigNodes?.() ?? [];
											},
										};
									},
								},
							},
						},
					},
					rules: {
						"test/capture": "error",
					},
				},
			],
			"file.js",
		);

		expect(nodes).toHaveLength(7);
		expect(nodes.some((node) => (node.type as string) === "Shebang")).toBe(false);
	});
});
