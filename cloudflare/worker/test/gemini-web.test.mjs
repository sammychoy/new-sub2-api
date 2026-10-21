import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GeminiWebService } from "../src/services/gemini-web.ts";

describe("GeminiWebService", () => {
    test("cleanCookie trims and strips quotes and trailing semicolons", () => {
        assert.equal(GeminiWebService.cleanCookie(`"abc123xyz";`), "abc123xyz");
        assert.equal(GeminiWebService.cleanCookie(`'hello-world'; `), "hello-world");
        assert.equal(GeminiWebService.cleanCookie(`cookie_value`), "cookie_value");
        assert.equal(GeminiWebService.cleanCookie(""), "");
        assert.equal(GeminiWebService.cleanCookie(undefined), "");
    });

    test("mergeCookies merges base and Set-Cookie headers correctly", () => {
        const base = "__Secure-1PSID=val1; foo=bar";
        const setCookie = "__Secure-1PSIDTS=val2; Path=/; Domain=.google.com, foo=newbar; Path=/";
        const merged = GeminiWebService.mergeCookies(base, setCookie);
        assert.match(merged, /__Secure-1PSID=val1/);
        assert.match(merged, /__Secure-1PSIDTS=val2/);
        assert.match(merged, /foo=newbar/);
    });

    test("extractThinking separates <thought> tags from response text", () => {
        const raw = "<thought>Thinking through the reasoning step by step.</thought> Here is the final output.";
        const { thinking, cleanText } = GeminiWebService.extractThinking(raw);
        assert.equal(thinking, "Thinking through the reasoning step by step.");
        assert.equal(cleanText, "Here is the final output.");
    });

    test("parseResponse extracts content from Google chunked array format", () => {
        const chunkInner = [
            null,
            null,
            null,
            null,
            [
                [
                    "candidate_1",
                    ["Hello! I am Gemini."],
                    null,
                    null,
                    null
                ]
            ]
        ];
        const envelope = [
            ["wrb.fr", null, JSON.stringify(chunkInner)]
        ];
        const rawPayload = `)]}'\n${JSON.stringify(envelope)}`;

        const result = GeminiWebService.parseResponse(rawPayload);
        assert.equal(result.found, true);
        assert.equal(result.text, "Hello! I am Gemini.");
    });

    test("parseResponse extracts content with thinking traces", () => {
        const chunkInner = [
            null,
            null,
            null,
            null,
            [
                [
                    "candidate_1",
                    ["<thought>Thinking about answer</thought> The answer is 42."],
                    null,
                    null,
                    null
                ]
            ]
        ];
        const envelope = [
            ["wrb.fr", null, JSON.stringify(chunkInner)]
        ];
        const rawPayload = `)]}'\n${JSON.stringify(envelope)}`;

        const result = GeminiWebService.parseResponse(rawPayload);
        assert.equal(result.found, true);
        assert.equal(result.text, "The answer is 42.");
        assert.equal(result.reasoning, "Thinking about answer");
    });
});
