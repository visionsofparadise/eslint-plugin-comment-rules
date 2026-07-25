import rule from "./rule";
import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

const ruleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
});

const tsRuleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		parser: tsParser,
	},
});

ruleTester.run("no-restricted-comments", rule, {
	valid: [
		{
			code: "const x = 1;",
			options: ["none"],
		},
		{
			code: "#! /usr/bin/env node\nconst x = 1;",
			options: ["safe"],
		},
		{
			code: "/* eslint-disable no-console */\nconst x = 1;",
			options: ["safe"],
		},
		{
			code: "// TODO: later\nconst x = 1;",
			options: ["docs"],
		},
		{
			code: "// FIX: now\nconst x = 1;",
			options: ["docs"],
		},
		{
			code: "// @ts-expect-error intentional\nconst x = 1;",
			options: ["docs"],
		},
		{
			code: "/**\n * Module docs\n */\nexport const plugin = 1;",
			options: ["docs"],
		},
		{
			code: "// note\nconst x = 1;",
			options: [[{ action: "delete" }, { line: true, action: "allow" }]],
		},
		{
			code: "const x = 1; // trailing",
			options: [[{ action: "delete" }, { position: "beside", action: "allow" }]],
		},
		{
			code: "/* single */\nconst x = 1;",
			options: [[{ lines: "multi", action: "delete" }]],
		},
		{
			code: "// alpha\nconst x = 1;",
			options: [[{ terms: ["beta"], action: "delete" }]],
		},
		{
			code: "// keep this\nconst x = 1;",
			options: [[{ markers: ["@ts-ignore"], action: "delete" }]],
		},
		{
			code: "// foo bar\nconst x = 1;",
			options: [[{ pattern: "baz", action: "delete" }]],
		},
		{
			code: "// widget\nconst x = 1;",
			options: [[{ code: true, action: "delete" }]],
		},
		{
			code: "// TODO: fix\nconst x = 1;",
			options: [[{ code: true, action: "delete" }]],
		},
		{
			code: '// "a quoted phrase"\nconst x = 1;',
			options: [[{ code: true, action: "delete" }]],
		},
		{
			code: "// This is a sentence ending in a period.\nconst x = 1;",
			options: [[{ code: true, action: "delete" }]],
		},
		{
			code: "function f() {\n  /** inner */\n  return 1;\n}",
			options: [
				[
					{ action: "delete" },
					{
						jsdoc: true,
						selector: "FunctionDeclaration > BlockStatement > *",
						action: "allow",
					},
				],
			],
		},
		{
			code: "// only line fails second criterion\nconst x = 1;",
			options: [[{ line: true, terms: ["MISSING"], action: "delete" }]],
		},
		{
			code: "// early\nconst x = 1;",
			options: [
				[
					{ action: "delete", message: "first" },
					{ line: true, action: "allow" },
				],
			],
		},
		{
			code: "const x = 1; // trailing\nfunction g() {}",
			options: [[{ selector: "Program > *", action: "delete" }]],
		},
		{
			code: "function f() {\n  // dangling\n}",
			options: [[{ selector: "Program > *", action: "delete" }]],
		},
		{
			code: "const x = 1;\n// eof",
			options: [[{ selector: "Program > *", action: "delete" }]],
		},
	],
	invalid: [
		{
			code: "// ban me\nconst x = 1;",
			options: ["none"],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// ban me\nconst x = 1;",
			options: ["safe"],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// prose\nconst x = 1;",
			options: ["docs"],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "const x = 1; // trailing",
			options: ["docs"],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "function f() {\n  /** inner */\n  return 1;\n}",
			options: ["docs"],
			errors: [{ messageId: "restricted" }],
			output: "function f() {\n  return 1;\n}",
		},
		{
			code: "const x = 1; /**\n * trailing\n */\nfunction g() {}",
			options: ["docs"],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;\nfunction g() {}",
		},
		{
			code: "// line only\nconst x = 1;",
			options: [[{ line: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "/* block only */\nconst x = 1;",
			options: [[{ block: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "/** jsdoc only */\nconst x = 1;",
			options: [[{ jsdoc: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "#! /usr/bin/env node\nconst x = 1;",
			options: [[{ shebang: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "/*\n * multi\n */\nconst x = 1;",
			options: [[{ lines: "multi", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "const x = 1; // beside",
			options: [[{ position: "beside", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// above\nconst x = 1;",
			options: [[{ position: "above", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// header\nconst x = 1;",
			options: [[{ position: "file-start", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "function f() {\n  // dangling\n}",
			options: [[{ position: "dangling", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "function f() {\n}",
		},
		{
			code: "// TODO: later\nconst x = 1;",
			options: [[{ terms: ["TODO"], location: "start", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// see TODO later\nconst x = 1;",
			options: [[{ terms: ["TODO"], location: "anywhere", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "//*TODO later\nconst x = 1;",
			options: [[{ terms: ["TODO"], decoration: ["*"], action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// @ts-ignore bad\nconst x = 1;",
			options: [[{ markers: ["@ts-ignore"], action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// secret code\nconst x = 1;",
			options: [[{ pattern: "secret", action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "/** module */\nexport const a = 1;",
			options: [
				[
					{
						jsdoc: true,
						selector: "Program > *",
						action: "delete",
					},
				],
			],
			errors: [{ messageId: "restricted" }],
			output: "export const a = 1;",
		},
		{
			code: "/* eslint-disable no-console */\nconst x = 1;",
			options: [[{ inlineConfig: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// const y = 1;\nconst x = 1;",
			options: [[{ code: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// let go\nconst x = 1;",
			options: [[{ code: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// var it\nconst x = 1;",
			options: [[{ code: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// throw away\nconst x = 1;",
			options: [[{ code: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// function f() {\n//   return 1;\n// }\nconst y = 1;",
			options: [[{ code: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }, { messageId: "restricted" }, { messageId: "restricted" }],
			output: "const y = 1;",
		},
		{
			code: "// const a = 1;\n\n// note\nconst y = 1;",
			options: [[{ code: true, action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "\n// note\nconst y = 1;",
		},
		{
			code: "// early\nconst x = 1;",
			options: [[{ action: "allow" }, { line: true, action: "delete", message: "last wins" }]],
			errors: [{ messageId: "restricted", data: { message: "last wins" } }],
			output: "const x = 1;",
		},
		{
			code: "const x = 1; // beside",
			options: [[{ action: "delete" }]],
			errors: [{ messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// a\n// b\nconst x = 1;",
			options: [[{ action: "delete" }]],
			errors: [{ messageId: "restricted" }, { messageId: "restricted" }],
			output: "const x = 1;",
		},
		{
			code: "// rename me\nconst x = 1;",
			options: [[{ pattern: "rename (\\w+)", action: "replace", replacement: "keep $1" }]],
			errors: [{ messageId: "restricted" }],
			output: "// keep me\nconst x = 1;",
		},
		{
			code: "// only report\nconst x = 1;",
			options: [[{ action: "report", message: "reported" }]],
			errors: [{ messageId: "restricted", data: { message: "reported" } }],
		},
	],
});

tsRuleTester.run("no-restricted-comments typescript", rule, {
	valid: [
		{
			code: "/**\n * Module docs\n */\nexport const plugin = 1;",
			options: ["docs"],
		},
	],
	invalid: [
		{
			code: "// ban\nexport const plugin = 1;",
			options: ["docs"],
			errors: [{ messageId: "restricted" }],
			output: "export const plugin = 1;",
		},
	],
});

describe("schema", () => {
	it("rejects a missing option", () => {
		expect(() => {
			ruleTester.run("missing-option", rule, {
				valid: [{ code: "const x = 1;" }],
				invalid: [],
			});
		}).toThrow();
	});

	it("rejects an unknown policy name", () => {
		expect(() => {
			ruleTester.run("unknown-policy", rule, {
				valid: [],
				invalid: [
					{
						code: "// x\nconst y = 1;",
						options: ["strict" as "none"],
						errors: [{ messageId: "restricted" }],
					},
				],
			});
		}).toThrow();
	});

	it("rejects an unknown entry key", () => {
		expect(() => {
			ruleTester.run("unknown-key", rule, {
				valid: [],
				invalid: [
					{
						code: "// x\nconst y = 1;",
						options: [[{ unknown: true, action: "delete" } as { action: "delete" }]],
						errors: [{ messageId: "restricted" }],
					},
				],
			});
		}).toThrow();
	});
});
