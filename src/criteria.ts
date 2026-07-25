import esquery from "esquery";
import type { Anchor } from "./anchor";
import type { CommentFacts } from "./comment";
import type { Comment } from "estree";

type Action = "allow" | "report" | "delete" | "replace";

type Position = "above" | "beside" | "file-start" | "dangling";

type Kind = "line" | "block" | "jsdoc" | "shebang";

export interface Entry {
	line?: boolean;
	block?: boolean;
	jsdoc?: boolean;
	shebang?: boolean;
	lines?: "single" | "multi";
	position?: Position | ReadonlyArray<Position>;
	terms?: ReadonlyArray<string>;
	location?: "start" | "anywhere";
	decoration?: ReadonlyArray<string>;
	markers?: ReadonlyArray<string>;
	pattern?: string;
	selector?: string;
	inlineConfig?: boolean;
	code?: boolean;
	message?: string;
	action: Action;
	replacement?: string;
}

export interface CompiledEntry {
	kinds: ReadonlySet<Kind> | null;
	lines: "single" | "multi" | null;
	positions: ReadonlyArray<Position> | null;
	termPatterns: ReadonlyArray<RegExp> | null;
	markerPattern: RegExp | null;
	pattern: RegExp | null;
	selector: ReturnType<typeof esquery.parse> | null;
	inlineConfig: boolean | undefined;
	code: boolean | undefined;
	action: Action;
	message: string | undefined;
	replacement: string | undefined;
}

export interface MatchContext {
	getAnchor: (facts: CommentFacts) => Anchor | null;
	isInlineConfig: (comment: Comment) => boolean;
	isCode: (facts: CommentFacts) => boolean;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function termToRegExp(term: string, location: "start" | "anywhere", decoration: ReadonlyArray<string>): RegExp {
	const escaped = escapeRegExp(term);
	const wordBoundary = "\\b";

	if (location === "start") {
		const decorationClass = decoration.map(escapeRegExp).join("");
		const prefix = `^[\\s${decorationClass}]*`;
		const suffix = /\w$/u.test(term) ? wordBoundary : "";

		return new RegExp(`${prefix}${escaped}${suffix}`, "iu");
	}

	const prefix = /^\w/u.test(term) ? wordBoundary : "";
	const suffix = /\w$/u.test(term) ? wordBoundary : "";

	return new RegExp(`${prefix}${escaped}${suffix}`, "iu");
}

function markerRegExp(markers: ReadonlyArray<string>): RegExp {
	const body = markers.map((marker) => escapeRegExp(marker)).join("|");

	return new RegExp(`^\\s*(?:${body})`, "u");
}

function compileKinds(entry: Entry): ReadonlySet<Kind> | null {
	const kinds = new Set<Kind>();

	if (entry.line === true) {
		kinds.add("line");
	}

	if (entry.shebang === true) {
		kinds.add("shebang");
	}

	if (entry.jsdoc === true) {
		kinds.add("jsdoc");
	} else if (entry.block === true) {
		kinds.add("block");
		kinds.add("jsdoc");
	}

	return kinds.size === 0 ? null : kinds;
}

export function compileEntries(entries: ReadonlyArray<Entry>): ReadonlyArray<CompiledEntry> {
	return entries.map((entry) => {
		const location = entry.location ?? "start";
		const decoration = entry.decoration ?? [];
		const termPatterns =
			entry.terms === undefined ? null : entry.terms.map((term) => termToRegExp(term, location, decoration));
		const positions =
			entry.position === undefined ? null : Array.isArray(entry.position) ? entry.position : [entry.position];

		return {
			kinds: compileKinds(entry),
			lines: entry.lines ?? null,
			positions,
			termPatterns,
			markerPattern: entry.markers === undefined ? null : markerRegExp(entry.markers),
			pattern: entry.pattern === undefined ? null : new RegExp(entry.pattern, "u"),
			selector: entry.selector === undefined ? null : esquery.parse(entry.selector),
			inlineConfig: entry.inlineConfig,
			code: entry.code,
			action: entry.action,
			message: entry.message,
			replacement: entry.replacement,
		};
	});
}

function matchesEntry(compiled: CompiledEntry, facts: CommentFacts, matchContext: MatchContext): boolean {
	if (compiled.kinds !== null && !compiled.kinds.has(facts.kind)) {
		return false;
	}

	if (compiled.lines !== null && facts.lines !== compiled.lines) {
		return false;
	}

	if (compiled.positions !== null) {
		const hit = compiled.positions.every((position) => facts.position.has(position));

		if (!hit) {
			return false;
		}
	}

	if (compiled.termPatterns !== null) {
		const value = facts.comment.value;
		const hit = compiled.termPatterns.some((pattern) => pattern.test(value));

		if (!hit) {
			return false;
		}
	}

	if (compiled.markerPattern !== null && !compiled.markerPattern.test(facts.comment.value)) {
		return false;
	}

	if (compiled.pattern !== null && !compiled.pattern.test(facts.comment.value)) {
		return false;
	}

	if (compiled.inlineConfig !== undefined) {
		if (matchContext.isInlineConfig(facts.comment) !== compiled.inlineConfig) {
			return false;
		}
	}

	if (compiled.selector !== null) {
		const anchor = matchContext.getAnchor(facts);

		if (anchor === null || !esquery.matches(anchor.node, compiled.selector, anchor.ancestry)) {
			return false;
		}
	}

	if (compiled.code !== undefined) {
		if (matchContext.isCode(facts) !== compiled.code) {
			return false;
		}
	}

	return true;
}

export function decide(
	compiled: ReadonlyArray<CompiledEntry>,
	facts: CommentFacts,
	matchContext: MatchContext,
): CompiledEntry | null {
	for (let index = compiled.length - 1; index >= 0; index -= 1) {
		const entry = compiled[index];

		if (entry !== undefined && matchesEntry(entry, facts, matchContext)) {
			return entry;
		}
	}

	return null;
}
