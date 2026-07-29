# eslint-plugin-comment-rules

Express a comment policy as ESLint configuration. One rule, `comment-rules/no-restricted-comments`, filters every comment kind (line, block, JSDoc, shebang) by kind, position, content, AST selector, and more, with fixers that delete or rewrite.

For JSDoc *content* (tags, types, descriptions), use [`eslint-plugin-jsdoc`](https://github.com/gajus/eslint-plugin-jsdoc) as a companion. This package owns whether a comment may exist and where.

## Install

```bash
npm install -D eslint-plugin-comment-rules
```

Requires ESLint 9 or 10 and Node `^18.18.0 || ^20.9.0 || >=21.1.0`. Flat config only.

## Configure

### Named policy

```js
// eslint.config.js
import commentRules from "eslint-plugin-comment-rules";

export default [
	{
		plugins: {
			"comment-rules": commentRules,
		},
		rules: {
			"comment-rules/no-restricted-comments": ["error", "docs"],
		},
	},
];
```

Or use a shipped flat config:

```js
import commentRules from "eslint-plugin-comment-rules";

export default [
	commentRules.configs.docs,
];
```

One config per policy, under the policy's own name. `docs-report` is hyphenated, so it needs the bracket form: `commentRules.configs["docs-report"]`.

Policies: `none` (ban everything), `safe` (shebang + ESLint inline config), `docs` (`safe` plus `FIX`/`TODO`, machine directives, and multiline JSDoc that carries a block tag or documents a property), `docs-report` (`docs`, reporting instead of deleting).

### Custom entries

```js
"comment-rules/no-restricted-comments": ["error", [
	{ action: "delete" },
	{ shebang: true, action: "allow" },
	{ terms: ["TODO"], location: "start", action: "allow" },
]]
```

Last matching entry wins. Criteria within an entry conjoin.

### CommonJS projects

On Node below the `require(esm)` range, name the config `eslint.config.mjs` so ESLint loads it as ESM and can default-import this package.

### Mixed severity

Register the plugin under two keys:

```js
plugins: {
	comments: commentRules,
	"comments-warn": commentRules,
},
rules: {
	"comments/no-restricted-comments": ["error", [/* hard bans */]],
	"comments-warn/no-restricted-comments": ["warn", [/* soft ones */]],
},
```

## Capabilities

| Capability | Key / form | Covered by tests |
| --- | --- | --- |
| Line comments | `line: true` | yes |
| Block comments | `block: true` | yes |
| JSDoc blocks | `jsdoc: true` | yes |
| Shebang | `shebang: true` | yes |
| Single / multi line | `lines: "single" \| "multi"` | yes |
| Position facts | `position: "above" \| "beside" \| "file-start" \| "dangling"` (or array, all required) | yes |
| Terms | `terms`, `location`, `decoration` (same model as `no-warning-comments`) | yes |
| Markers | `markers` (match after the opener) | yes |
| Pattern | `pattern` (regex source) | yes |
| AST selector | `selector` (esquery on the leading node) | yes |
| Inline config | `inlineConfig: true` | yes |
| Commented-out code | `code: true` | yes |
| Custom message | `message` | yes |
| Allow | `action: "allow"` | yes |
| Report | `action: "report"` | yes |
| Delete (fix) | `action: "delete"` | yes |
| Replace (fix) | `action: "replace"`, `replacement` with `$1` | yes |
| Policy `none` | option `"none"` | yes |
| Policy `safe` | option `"safe"` | yes |
| Policy `docs` | option `"docs"` | yes |
| Policy `docs-report` | option `"docs-report"` | yes |
| Schema: missing option | throws | yes |
| Schema: unknown policy | throws | yes |
| Schema: unknown key | throws | yes |
| `require()` / default `import` interop | package entry | yes (integration) |

## Policies in detail

| Policy | Permits |
| --- | --- |
| `none` | nothing |
| `safe` | shebang; ESLint inline config (`eslint-disable*`, `globals`, `exported`, …) |
| `docs` | `safe`, plus `FIX`/`TODO` at start (leading `*` decoration allowed), markers (`@ts-expect-error`, `prettier-ignore`, `istanbul ignore`, TypeScript's `/// <reference …>`, …), and the two JSDoc cases below |
| `docs-report` | the same as `docs`; what `docs` deletes, this reports. Deletion is the one fix whose output cannot be recovered from its input, so a project running an autofix pass over comment prose takes this one |

`docs` permits a multiline JSDoc block on two grounds, and prose in JSDoc delimiters satisfies neither:

| Ground | Requires | Rationale |
| --- | --- | --- |
| It uses JSDoc syntax | a block tag (`@param`, `@returns`, `@type`, …) on its own line, in doc position | a tag is the author declaring the block documents the API rather than explaining the code |
| It documents a property | an anchor of `TSPropertySignature`, `PropertyDefinition`, `TSEnumMember`, or `Property` | JSDoc offers no tag for a property description, so a tagless block is the only way to write one |

A tagless block on a function, method, class, interface, type alias, or plain binding is a plain comment wearing JSDoc delimiters, and is deleted.

## License

ISC
