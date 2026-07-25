import type { Entry } from "./criteria";

const docSelector =
	"Program > *, ClassBody > *, TSInterfaceBody > *, TSTypeLiteral > *, TSModuleBlock > *, TSEnumBody > *";

const docsMarkers = [
	"@ts-expect-error",
	"@ts-ignore",
	"@ts-nocheck",
	"prettier-ignore",
	"istanbul ignore",
	"v8 ignore",
	"c8 ignore",
	"#__PURE__",
	"webpackChunkName",
	"@vite-ignore",
] as const;

const none: ReadonlyArray<Entry> = [{ action: "delete" }];

const safe: ReadonlyArray<Entry> = [
	{ action: "delete" },
	{ shebang: true, action: "allow" },
	{ inlineConfig: true, action: "allow" },
];

const docs: ReadonlyArray<Entry> = [
	{ action: "delete" },
	{ shebang: true, action: "allow" },
	{ inlineConfig: true, action: "allow" },
	{ terms: ["FIX", "TODO"], location: "start", action: "allow" },
	{ markers: [...docsMarkers], action: "allow" },
	{
		jsdoc: true,
		lines: "multi",
		selector: docSelector,
		action: "allow",
	},
];

export const policies = {
	none,
	safe,
	docs,
} as const;

export type PolicyName = keyof typeof policies;
