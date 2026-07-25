import type { CommentFacts } from "./comment";
import type { SourceCode } from "eslint";
import type { Node } from "estree";

export interface Anchor {
	node: Node;
	ancestry: Array<Node>;
}

type NodeWithParent = Node & {
	parent?: NodeWithParent;
	range?: [number, number];
};

function ancestryOf(node: NodeWithParent): Array<Node> {
	const ancestry: Array<Node> = [];
	let current: NodeWithParent | null | undefined = node.parent;

	while (current !== undefined) {
		ancestry.push(current);
		current = current.parent ?? undefined;
	}

	return ancestry;
}

export function resolveAnchor(sourceCode: SourceCode, facts: CommentFacts): Anchor | null {
	if (!facts.startsLine) {
		return null;
	}

	const token = sourceCode.getTokenAfter(facts.comment, { includeComments: false });

	if (token === null) {
		return null;
	}

	const found = sourceCode.getNodeByRangeIndex(token.range[0]);

	if (found === null) {
		return null;
	}

	let node = found as NodeWithParent;

	if (node.range?.[0] !== token.range[0]) {
		return null;
	}

	let parent = node.parent;

	while (parent !== undefined && parent.type !== "Program" && parent.range?.[0] === node.range?.[0]) {
		node = parent;
		parent = node.parent;
	}

	return {
		node,
		ancestry: ancestryOf(node),
	};
}
