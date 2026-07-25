import type { CommentFacts } from "./comment";
import type { Linter } from "eslint";
import type { Node } from "estree";

export interface CommentGroup {
	members: ReadonlyArray<CommentFacts>;
	source: string;
}

const structuralTypes = new Set([
	"FunctionDeclaration",
	"VariableDeclaration",
	"ClassDeclaration",
	"ImportDeclaration",
	"ExportNamedDeclaration",
	"ExportDefaultDeclaration",
	"ExportAllDeclaration",
	"AssignmentExpression",
	"CallExpression",
	"NewExpression",
	"MemberExpression",
	"OptionalMemberExpression",
	"IfStatement",
	"ForStatement",
	"ForInStatement",
	"ForOfStatement",
	"WhileStatement",
	"DoWhileStatement",
	"SwitchStatement",
	"TryStatement",
	"ThrowStatement",
	"ReturnStatement",
	"BreakStatement",
	"ContinueStatement",
	"WithStatement",
	"DebuggerStatement",
	"TSTypeAliasDeclaration",
	"TSInterfaceDeclaration",
	"TSEnumDeclaration",
	"TSModuleDeclaration",
	"TSImportEqualsDeclaration",
	"TSExportAssignment",
]);

function isNode(value: unknown): value is Node {
	return value !== null && typeof value === "object" && "type" in value && typeof value.type === "string";
}

function hasStructuralNode(node: Node): boolean {
	if (structuralTypes.has(node.type)) {
		return true;
	}

	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				if (isNode(item) && hasStructuralNode(item)) {
					return true;
				}
			}

			continue;
		}

		if (isNode(value) && hasStructuralNode(value)) {
			return true;
		}
	}

	return false;
}

function unwrapParser(parser: Linter.Parser): Linter.Parser {
	for (const symbol of Object.getOwnPropertySymbols(parser)) {
		if (!String(symbol).includes("RuleTester.parser")) {
			continue;
		}

		const underlying = (parser as unknown as Record<symbol, Linter.Parser | undefined>)[symbol];

		if (underlying !== undefined) {
			return underlying;
		}
	}

	return parser;
}

export function fragmentParserOptions(parserOptions: Linter.ParserOptions): Linter.ParserOptions {
	const {
		project: _project,
		projectService: _projectService,
		programs: _programs,
		EXPERIMENTAL_useProjectService: _experimentalUseProjectService,
		...rest
	} = parserOptions as Linter.ParserOptions & {
		project?: unknown;
		projectService?: unknown;
		programs?: unknown;
		EXPERIMENTAL_useProjectService?: unknown;
	};

	return rest;
}

function parseFragment(parser: Linter.Parser, source: string, parserOptions: Linter.ParserOptions): Node {
	const active = unwrapParser(parser);
	const options = fragmentParserOptions(parserOptions);

	if ("parseForESLint" in active && typeof active.parseForESLint === "function") {
		const result = active.parseForESLint(source, options) as { ast: Node };

		return result.ast;
	}

	if ("parse" in active && typeof active.parse === "function") {
		return active.parse(source, options) as Node;
	}

	throw new Error("parser exposes neither parseForESLint nor parse");
}

export function groupComments(facts: ReadonlyArray<CommentFacts>): ReadonlyArray<CommentGroup> {
	const groups: Array<CommentGroup> = [];
	let current: Array<CommentFacts> = [];

	const flush = (): void => {
		if (current.length === 0) {
			return;
		}

		groups.push({
			members: current,
			source: current.map((member) => member.comment.value).join("\n"),
		});
		current = [];
	};

	for (const fact of facts) {
		if (!fact.startsLine) {
			flush();
			groups.push({
				members: [fact],
				source: fact.comment.value,
			});

			continue;
		}

		const previous = current[current.length - 1];

		if (previous === undefined) {
			current = [fact];

			continue;
		}

		const previousEnd = previous.comment.loc?.end.line;
		const factStart = fact.comment.loc?.start.line;
		const blankLineBetween = previousEnd !== undefined && factStart !== undefined && factStart - previousEnd > 1;
		const sameKind = fact.kind === previous.kind;

		if (sameKind && !blankLineBetween) {
			current.push(fact);

			continue;
		}

		flush();
		current = [fact];
	}

	flush();

	return groups;
}

export function containsCode(group: CommentGroup, parser: Linter.Parser, parserOptions: Linter.ParserOptions): boolean {
	try {
		const program = parseFragment(parser, group.source, parserOptions);

		return hasStructuralNode(program);
	} catch {
		return false;
	}
}
