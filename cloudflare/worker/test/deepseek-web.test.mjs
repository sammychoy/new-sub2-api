import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DeepSeekWebService, DEEPSEEK_SUPPORTED_MODELS } from "../src/services/deepseek-web.ts";

describe("DeepSeekWebService", () => {
    test("cleanToken sanitizes bearer prefix and quotes", () => {
        assert.equal(DeepSeekWebService.cleanToken(`"token_123"`), "token_123");
        assert.equal(DeepSeekWebService.cleanToken(`'token_456'`), "token_456");
        assert.equal(DeepSeekWebService.cleanToken("Bearer token_abc"), "token_abc");
        assert.equal(DeepSeekWebService.cleanToken("bearer   xyz-789  "), "xyz-789");
        assert.equal(DeepSeekWebService.cleanToken(""), "");
        assert.equal(DeepSeekWebService.cleanToken(undefined), "");
    });

    test("parseSSELine correctly extracts thinking and response fragments", () => {
        const payload = JSON.stringify({
            p: "response/fragments",
            o: "APPEND",
            v: [
                { type: "THINK", content: "Let me think about this step by step. " },
                { type: "RESPONSE", content: "Hello! " },
                { type: "RESPONSE", content: "I am DeepSeek." }
            ]
        });

        const res = DeepSeekWebService.parseSSELine(payload);
        assert.equal(res.finished, false);
        assert.equal(res.parts.length, 3);
        assert.equal(res.parts[0].type, "thinking");
        assert.equal(res.parts[0].text, "Let me think about this step by step. ");
        assert.equal(res.parts[1].type, "text");
        assert.equal(res.parts[1].text, "Hello! ");
        assert.equal(res.parts[2].type, "text");
        assert.equal(res.parts[2].text, "I am DeepSeek.");
    });

    test("parseSSELine detects finished status", () => {
        const finishPayload = JSON.stringify({
            p: "response/status",
            v: "FINISHED"
        });

        const res = DeepSeekWebService.parseSSELine(finishPayload);
        assert.equal(res.finished, true);

        const doneRes = DeepSeekWebService.parseSSELine("[DONE]");
        assert.equal(doneRes.finished, true);
    });

    test("parseSSELine extracts direct content and thinking_content", () => {
        const contentPayload = JSON.stringify({
            p: "response/content",
            v: "Direct answer text"
        });
        const cRes = DeepSeekWebService.parseSSELine(contentPayload);
        assert.equal(cRes.parts.length, 1);
        assert.equal(cRes.parts[0].type, "text");
        assert.equal(cRes.parts[0].text, "Direct answer text");

        const thinkPayload = JSON.stringify({
            p: "response/thinking_content",
            v: "Direct thinking trace"
        });
        const tRes = DeepSeekWebService.parseSSELine(thinkPayload);
        assert.equal(tRes.parts.length, 1);
        assert.equal(tRes.parts[0].type, "thinking");
        assert.equal(tRes.parts[0].text, "Direct thinking trace");
    });

    test("parseSSELine extracts initial response fragments and incremental path appends", () => {
        const initialPayload = JSON.stringify({
            v: {
                response: {
                    fragments: [
                        { type: "THINK", content: "Thinking trace" },
                        { type: "RESPONSE", content: "Initial text" }
                    ]
                }
            }
        });
        const initRes = DeepSeekWebService.parseSSELine(initialPayload);
        assert.equal(initRes.parts.length, 2);
        assert.equal(initRes.parts[0].type, "thinking");
        assert.equal(initRes.parts[0].text, "Thinking trace");
        assert.equal(initRes.parts[1].type, "text");
        assert.equal(initRes.parts[1].text, "Initial text");

        const appendPayload = JSON.stringify({
            p: "response/fragments/-1/content",
            o: "APPEND",
            v: " more text"
        });
        const appRes = DeepSeekWebService.parseSSELine(appendPayload);
        assert.equal(appRes.parts.length, 1);
        assert.equal(appRes.parts[0].type, "text");
        assert.equal(appRes.parts[0].text, " more text");
    });

    test("supported models include chat and reasoner", () => {
        assert.ok(DEEPSEEK_SUPPORTED_MODELS.includes("deepseek-chat"));
        assert.ok(DEEPSEEK_SUPPORTED_MODELS.includes("deepseek-reasoner"));
    });
});

import { ChannelPricingCatalogService } from "../src/services/channel-pricing-catalog.ts";

describe("DeepSeek Pricing and Platforms", () => {
    test("pricing catalog lists deepseek models", () => {
        const catalog = new ChannelPricingCatalogService();
        const models = catalog.listModelNamesByPlatform("deepseek");
        assert.deepEqual(models, ["deepseek-chat", "deepseek-reasoner"]);

        const chatPrice = catalog.getModelPricing("deepseek-chat");
        assert.equal(chatPrice.found, true);
        assert.equal(chatPrice.inputPrice, 2.7e-7);
        assert.equal(chatPrice.outputPrice, 1.1e-6);

        const r1Price = catalog.getModelPricing("deepseek-reasoner");
        assert.equal(r1Price.found, true);
        assert.equal(r1Price.inputPrice, 5.5e-7);
        assert.equal(r1Price.outputPrice, 2.19e-6);
    });
});
