import { containsCode, fragmentParserOptions, groupComments } from "./code";
import type { CommentFacts } from "./comment";
import tsParser from "@typescript-eslint/parser";
import * as espree from "espree";
import type { Linter } from "eslint";
import type { Comment } from "estree";

function lineFact(value: string, line: number, startsLine = true): CommentFacts {
	const comment = {
		type: "Line",
		value,
		range: [0, value.length + 2],
		loc: {
			start: { line, column: 0 },
			end: { line, column: value.length + 2 },
		},
	} as Comment;

	return {
		comment,
		kind: "line",
		lines: "single",
		position: new Set(["above"]),
		startsLine,
		ownsLine: startsLine,
	};
}

const parser = espree as unknown as import("eslint").Linter.Parser;
const parserOptions = { ecmaVersion: "latest" as const, sourceType: "module" as const };

describe("groupComments", () => {
	it("joins consecutive same-kind own-line comments", () => {
		const groups = groupComments([lineFact("if (x) {", 1), lineFact("  return 1;", 2), lineFact("}", 3)]);

		expect(groups).toHaveLength(1);
		expect(groups[0]?.source).toBe("if (x) {\n  return 1;\n}");
	});

	it("splits on a blank line", () => {
		const groups = groupComments([lineFact("if (x) {", 1), lineFact("return 1;", 3)]);

		expect(groups).toHaveLength(2);
	});
});

describe("containsCode", () => {
	it("rejects measured residue forms", () => {
		expect(containsCode({ members: [], source: "widget" }, parser, parserOptions)).toBe(false);
		expect(containsCode({ members: [], source: "TODO: fix" }, parser, parserOptions)).toBe(false);
		expect(containsCode({ members: [], source: '"a quoted phrase"' }, parser, parserOptions)).toBe(false);
	});

	it("rejects ordinary prose at the parse gate", () => {
		expect(
			containsCode({ members: [], source: "This is a sentence ending in a period." }, parser, parserOptions),
		).toBe(false);
	});

	it("accepts structural code and the accepted false positives", () => {
		expect(containsCode({ members: [], source: "const y = 1;" }, parser, parserOptions)).toBe(true);
		expect(containsCode({ members: [], source: "let go" }, parser, parserOptions)).toBe(true);
		expect(containsCode({ members: [], source: "var it" }, parser, parserOptions)).toBe(true);
		expect(containsCode({ members: [], source: "throw away" }, parser, parserOptions)).toBe(true);
	});

	it("parses a joined group that fails line-by-line", () => {
		const group = {
			members: [lineFact("function f() {", 1), lineFact("  return 1;", 2), lineFact("}", 3)],
			source: "function f() {\n  return 1;\n}",
		};

		expect(containsCode(group, parser, parserOptions)).toBe(true);
		expect(containsCode({ members: [], source: "function f() {" }, parser, parserOptions)).toBe(false);
	});

	it("detects code when type-aware parser options are present", () => {
		const typeAwareOptions = {
			ecmaVersion: "latest" as const,
			sourceType: "module" as const,
			projectService: true,
		};

		expect(
			containsCode(
				{ members: [], source: "const y = 1;" },
				tsParser as Linter.Parser,
				typeAwareOptions as Linter.ParserOptions,
			),
		).toBe(true);
	});
});

describe("fragmentParserOptions", () => {
	it("strips type-aware keys and keeps the rest", () => {
		const stripped = fragmentParserOptions({
			ecmaVersion: "latest",
			sourceType: "module",
			project: true,
			projectService: true,
			programs: [],
			EXPERIMENTAL_useProjectService: true,
		} as Linter.ParserOptions);

		expect(stripped).toEqual({
			ecmaVersion: "latest",
			sourceType: "module",
		});
		expect("project" in stripped).toBe(false);
		expect("projectService" in stripped).toBe(false);
	});
});
