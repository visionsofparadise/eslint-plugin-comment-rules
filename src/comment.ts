import type { SourceCode } from "eslint";
import type { Comment } from "estree";

export interface CommentFacts {
	comment: Comment;
	kind: "line" | "block" | "jsdoc" | "shebang";
	lines: "single" | "multi";
	position: ReadonlySet<"above" | "beside" | "file-start" | "dangling">;
	startsLine: boolean;
	ownsLine: boolean;
}

const closingTokens = new Set([")", "]", "}"]);

function kindOf(comment: Comment): CommentFacts["kind"] {
	if ((comment.type as string) === "Shebang") {
		return "shebang";
	}

	if (comment.type === "Line") {
		return "line";
	}

	if (comment.value.startsWith("*")) {
		return "jsdoc";
	}

	return "block";
}

export function describeComment(sourceCode: SourceCode, comment: Comment): CommentFacts {
	const start = comment.loc?.start;
	const end = comment.loc?.end;

	if (start === undefined || end === undefined) {
		throw new Error("comment is missing location information");
	}

	const startLineText = sourceCode.lines[start.line - 1] ?? "";
	const endLineText = sourceCode.lines[end.line - 1] ?? "";
	const before = startLineText.slice(0, start.column);
	const after = endLineText.slice(end.column);
	const startsLine = /^\s*$/.test(before);
	const ownsLine = startsLine && /^\s*$/.test(after);
	const lines: CommentFacts["lines"] = start.line === end.line ? "single" : "multi";
	const position = new Set<"above" | "beside" | "file-start" | "dangling">();

	if (startsLine) {
		position.add("above");
	} else {
		position.add("beside");
	}

	const firstToken = sourceCode.getFirstToken(sourceCode.ast, { includeComments: false });
	const commentEnd = comment.range?.[1];

	if (firstToken === null || commentEnd === undefined || commentEnd <= firstToken.range[0]) {
		position.add("file-start");
	}

	const nextToken = sourceCode.getTokenAfter(comment, { includeComments: false });

	if (nextToken === null || closingTokens.has(nextToken.value)) {
		position.add("dangling");
	}

	return {
		comment,
		kind: kindOf(comment),
		lines,
		position,
		startsLine,
		ownsLine,
	};
}
