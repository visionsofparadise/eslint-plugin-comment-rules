import { resolveAnchor } from "./anchor";
import { containsCode, groupComments } from "./code";
import { describeComment } from "./comment";
import { compileEntries, decide, type CompiledEntry, type Entry, type MatchContext } from "./criteria";
import { policies, type PolicyName } from "./policies";
import type { Rule, SourceCode } from "eslint";
import type { Comment } from "estree";

const positionEnum = ["above", "beside", "file-start", "dangling"] as const;
const policyNames = ["none", "safe", "docs", "docs-report"] as const;
const actionEnum = ["allow", "report", "delete", "replace"] as const;

const entrySchema = {
	type: "object",
	properties: {
		line: { type: "boolean" },
		block: { type: "boolean" },
		jsdoc: { type: "boolean" },
		shebang: { type: "boolean" },
		lines: { enum: ["single", "multi"] },
		position: {
			oneOf: [
				{ enum: [...positionEnum] },
				{
					type: "array",
					items: { enum: [...positionEnum] },
					minItems: 1,
					uniqueItems: true,
				},
			],
		},
		terms: {
			type: "array",
			items: { type: "string" },
			minItems: 1,
		},
		location: { enum: ["start", "anywhere"] },
		decoration: {
			type: "array",
			items: { type: "string", pattern: "^\\S$" },
			minItems: 1,
		},
		markers: {
			type: "array",
			items: { type: "string" },
			minItems: 1,
		},
		pattern: { type: "string" },
		selector: { type: "string" },
		inlineConfig: { type: "boolean" },
		code: { type: "boolean" },
		message: { type: "string" },
		action: { enum: [...actionEnum] },
		replacement: { type: "string" },
	},
	required: ["action"],
	additionalProperties: false,
} as const;

function resolveEntries(option: PolicyName | ReadonlyArray<Entry>): ReadonlyArray<Entry> {
	if (typeof option === "string") {
		return policies[option];
	}

	return option;
}

function contentRange(comment: Comment): [number, number] {
	const range = comment.range;

	if (range === undefined) {
		throw new Error("comment is missing range information");
	}

	if ((comment.type as string) === "Shebang" || comment.type === "Line") {
		return [range[0] + 2, range[1]];
	}

	return [range[0] + 2, range[1] - 2];
}

function deleteRange(sourceText: string, facts: ReturnType<typeof describeComment>): [number, number] {
	const range = facts.comment.range;

	if (range === undefined) {
		throw new Error("comment is missing range information");
	}

	let start = range[0];

	while (start > 0) {
		const previous = sourceText[start - 1];

		if (previous !== " " && previous !== "\t") {
			break;
		}

		start -= 1;
	}

	let end = range[1];

	if (facts.ownsLine) {
		if (sourceText[end] === "\r" && sourceText[end + 1] === "\n") {
			end += 2;
		} else if (sourceText[end] === "\n" || sourceText[end] === "\r") {
			end += 1;
		}
	}

	return [start, end];
}

function replacedContents(facts: ReturnType<typeof describeComment>, compiled: CompiledEntry): string | null {
	if (compiled.replacement === undefined) {
		return null;
	}

	if (compiled.pattern === null) {
		return compiled.replacement;
	}

	return facts.comment.value.replace(compiled.pattern, compiled.replacement);
}

function reportLoc(comment: Comment): {
	start: { line: number; column: number };
	end: { line: number; column: number };
} {
	return comment.loc ?? { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };
}

const rule: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow comments that match a configured restriction policy",
		},
		fixable: "code",
		schema: {
			type: "array",
			minItems: 1,
			maxItems: 1,
			items: [
				{
					oneOf: [
						{ enum: [...policyNames] },
						{
							type: "array",
							items: entrySchema,
							minItems: 1,
						},
					],
				},
			],
		},
		messages: {
			restricted: "{{message}}",
		},
	},

	create(context) {
		const option = context.options[0] as PolicyName | ReadonlyArray<Entry> | undefined;

		if (option === undefined) {
			throw new Error("comment-rules/no-restricted-comments requires a policy name or entry array");
		}

		const compiled = compileEntries(resolveEntries(option));
		const needsCode = compiled.some((entry) => entry.code !== undefined);
		const parser = context.languageOptions.parser;
		const parserOptions = {
			...context.languageOptions.parserOptions,
			ecmaVersion: context.languageOptions.ecmaVersion ?? "latest",
			sourceType: context.languageOptions.sourceType ?? "module",
		};

		const listeners: Rule.RuleListener = {};

		listeners["Program:exit"] = () => {
			const sourceCode = context.sourceCode;
			const comments = sourceCode.getAllComments();
			const allFacts = comments.map((comment) => describeComment(sourceCode, comment));
			const groups = needsCode ? groupComments(allFacts) : [];
			const groupByComment = new Map<Comment, (typeof groups)[number]>();

			for (const group of groups) {
				for (const member of group.members) {
					groupByComment.set(member.comment, group);
				}
			}

			let inlineConfigSet: Set<Comment> | undefined;
			const anchorCache = new Map<Comment, ReturnType<typeof resolveAnchor>>();
			const codeCache = new Map<(typeof groups)[number], boolean>();
			const sourceCodeWithInline = sourceCode as SourceCode & {
				getInlineConfigNodes?: () => Array<Comment>;
			};

			const matchContext: MatchContext = {
				getAnchor(facts) {
					if (anchorCache.has(facts.comment)) {
						return anchorCache.get(facts.comment) ?? null;
					}

					const anchor = resolveAnchor(sourceCode, facts);

					anchorCache.set(facts.comment, anchor);

					return anchor;
				},
				isInlineConfig(comment) {
					if (inlineConfigSet === undefined) {
						const nodes =
							typeof sourceCodeWithInline.getInlineConfigNodes === "function"
								? sourceCodeWithInline.getInlineConfigNodes()
								: [];

						inlineConfigSet = new Set(nodes);
					}

					return inlineConfigSet.has(comment);
				},
				isCode(facts) {
					const group = groupByComment.get(facts.comment);

					if (group === undefined) {
						return false;
					}

					const cached = codeCache.get(group);

					if (cached !== undefined) {
						return cached;
					}

					if (parser === undefined) {
						codeCache.set(group, false);

						return false;
					}

					const result = containsCode(group, parser, parserOptions);

					codeCache.set(group, result);

					return result;
				},
			};

			const sourceText = sourceCode.text;
			const outcomes: Array<{
				facts: ReturnType<typeof describeComment>;
				match: NonNullable<ReturnType<typeof decide>>;
				deleteRange: [number, number] | null;
			}> = [];

			for (const facts of allFacts) {
				const match = decide(compiled, facts, matchContext);

				if (match === null || match.action === "allow") {
					continue;
				}

				outcomes.push({
					facts,
					match,
					deleteRange: match.action === "delete" ? deleteRange(sourceText, facts) : null,
				});
			}

			const deleteFixRange = new Map<Comment, [number, number]>();
			let runStart = 0;

			while (runStart < outcomes.length) {
				const current = outcomes[runStart];

				if (current?.deleteRange === null || !current?.facts.ownsLine) {
					if (current?.deleteRange !== null && current !== undefined) {
						deleteFixRange.set(current.facts.comment, current.deleteRange);
					}

					runStart += 1;

					continue;
				}

				let runEnd = runStart;
				let range: [number, number] = current.deleteRange;

				while (runEnd + 1 < outcomes.length) {
					const next = outcomes[runEnd + 1];

					if (
						next?.deleteRange === null ||
						next === undefined ||
						!next.facts.ownsLine ||
						next.deleteRange[0] !== range[1]
					) {
						break;
					}

					range = [range[0], next.deleteRange[1]];
					runEnd += 1;
				}

				deleteFixRange.set(current.facts.comment, range);
				runStart = runEnd + 1;
			}

			for (const outcome of outcomes) {
				const message = outcome.match.message ?? "This comment is restricted by the comment policy.";
				const loc = reportLoc(outcome.facts.comment);

				if (outcome.match.action === "report") {
					context.report({
						loc,
						messageId: "restricted",
						data: { message },
					});

					continue;
				}

				if (outcome.match.action === "delete") {
					const range = deleteFixRange.get(outcome.facts.comment);

					context.report({
						loc,
						messageId: "restricted",
						data: { message },
						fix: range === undefined ? undefined : (fixer) => fixer.removeRange(range),
					});

					continue;
				}

				const next = replacedContents(outcome.facts, outcome.match);

				if (next === null) {
					context.report({
						loc,
						messageId: "restricted",
						data: { message },
					});

					continue;
				}

				const range = contentRange(outcome.facts.comment);

				context.report({
					loc,
					messageId: "restricted",
					data: { message },
					fix(fixer) {
						return fixer.replaceTextRange(range, next);
					},
				});
			}
		};

		return listeners;
	},
};

export default rule;
