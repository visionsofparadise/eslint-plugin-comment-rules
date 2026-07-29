import type { Entry } from "./criteria";

const docSelector =
	"Program > *, ClassBody > *, TSInterfaceBody > *, TSTypeLiteral > *, TSModuleBlock > *, TSEnumBody > *";

const propertySelector = "TSPropertySignature, PropertyDefinition, TSEnumMember, Property";

const blockTagPattern = "(^|\\n)\\s*\\*?\\s*@\\w+";

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
	"/ <reference",
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
	{ terms: ["FIX", "TODO"], location: "start", decoration: ["*"], action: "allow" },
	{ markers: [...docsMarkers], action: "allow" },
	{
		jsdoc: true,
		lines: "multi",
		pattern: blockTagPattern,
		selector: docSelector,
		action: "allow",
	},
	{
		jsdoc: true,
		lines: "multi",
		selector: propertySelector,
		action: "allow",
	},
];

const docsReport: ReadonlyArray<Entry> = [{ action: "report" }, ...docs.slice(1)];

export const policies = {
	none,
	safe,
	docs,
	"docs-report": docsReport,
} as const;

export type PolicyName = keyof typeof policies;
