import { resolveAnchor } from "./anchor";
import { describeComment } from "./comment";
import { Linter } from "eslint";
import tsParser from "@typescript-eslint/parser";

const source = "/** module doc */\nexport const plugin = 1;";

function anchorKind(parser: Linter.Parser | undefined): string | null {
	const linter = new Linter({ configType: "flat" });
	let result: string | null = null;

	linter.verify(
		source,
		[
			{
				languageOptions: {
					ecmaVersion: "latest",
					sourceType: "module",
					...(parser === undefined ? {} : { parser }),
				},
				plugins: {
					test: {
						rules: {
							capture: {
								create(context) {
									return {
										"Program:exit"() {
											const sourceCode = context.sourceCode;
											const comment = sourceCode.getAllComments()[0];

											if (comment === undefined) {
												return;
											}

											const facts = describeComment(sourceCode, comment);
											const anchor = resolveAnchor(sourceCode, facts);
											result = anchor?.node.type ?? null;
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

	return result;
}

describe("resolveAnchor", () => {
	it("stops below Program for espree and typescript-eslint", () => {
		expect(anchorKind(undefined)).toBe("ExportNamedDeclaration");
		expect(anchorKind(tsParser as Linter.Parser)).toBe("ExportNamedDeclaration");
	});
});
