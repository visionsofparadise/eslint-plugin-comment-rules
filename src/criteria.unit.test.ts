import { compileEntries, decide, type MatchContext } from "./criteria";
import type { CommentFacts } from "./comment";
import type { Comment } from "estree";

function facts(partial: Partial<CommentFacts> & { value?: string }): CommentFacts {
	const comment = {
		type: "Line",
		value: partial.value ?? "body",
		range: [0, 10],
		loc: {
			start: { line: 1, column: 0 },
			end: { line: 1, column: 10 },
		},
	} as Comment;

	return {
		comment,
		kind: partial.kind ?? "line",
		lines: partial.lines ?? "single",
		position: partial.position ?? new Set(["above"]),
		startsLine: partial.startsLine ?? true,
		ownsLine: partial.ownsLine ?? true,
	};
}

const matchContext: MatchContext = {
	getAnchor: () => null,
	isInlineConfig: () => false,
	isCode: () => false,
};

describe("decide", () => {
	it("returns the last matching entry", () => {
		const compiled = compileEntries([
			{ action: "delete", message: "first" },
			{ line: true, action: "allow", message: "second" },
		]);
		const match = decide(compiled, facts({ kind: "line" }), matchContext);

		expect(match?.action).toBe("allow");
		expect(match?.message).toBe("second");
	});

	it("requires every criterion in an entry", () => {
		const compiled = compileEntries([{ line: true, terms: ["TODO"], action: "delete" }]);
		const match = decide(compiled, facts({ kind: "line", value: " note" }), matchContext);

		expect(match).toBeNull();
	});
});
