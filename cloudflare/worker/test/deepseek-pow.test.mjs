import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
    deepSeekHashV1,
    bytesToHex,
    solvePow,
    buildPowHeader,
    solveAndBuildHeader,
    buildPrefix
} from "../src/services/deepseek-pow.ts";

describe("DeepSeek PoW (DeepSeekHashV1)", () => {
    test("DeepSeekHashV1 matches official test vectors", () => {
        const encoder = new TextEncoder();
        const testCases = [
            { in: "", want: "e594808bc5b7151ac160c6d39a02e0a8e261ed588578403099e3561dc40c26b3" },
            { in: "testsalt_1700000000_42", want: "d4a2ea58c89e40887c933484868380c6f803eaa8dc53a3b9df8e431b921a4f09" },
            { in: "testsalt_1700000000_100000", want: "abea2f35796b65486e9be1b36f7878c66cab021e96faa473fdf4decd31f9ba30" },
            { in: "abc123salt_1700000000_12345", want: "74b3b7452745b70e85eb32ee7f0a9ec0381d42dd5137b695da915e104fc390e1" }
        ];

        for (const tc of testCases) {
            const hash = deepSeekHashV1(encoder.encode(tc.in));
            const hex = bytesToHex(hash);
            assert.equal(hex, tc.want, `Hash mismatch for input "${tc.in}"`);
        }
    });

    test("solvePow finds expected nonces for challenge", () => {
        const encoder = new TextEncoder();
        const testCases = [
            { salt: "testsalt", expire: 1700000000, answer: 42, diff: 1000 },
            { salt: "testsalt", expire: 1700000000, answer: 500, diff: 2000 },
            { salt: "abc123salt", expire: 1700000000, answer: 12345, diff: 20000 },
        ];

        for (const tc of testCases) {
            const targetInput = encoder.encode(buildPrefix(tc.salt, tc.expire) + tc.answer);
            const targetHash = bytesToHex(deepSeekHashV1(targetInput));
            const foundAnswer = solvePow(targetHash, tc.salt, tc.expire, tc.diff);
            assert.equal(foundAnswer, tc.answer, `Failed to solve PoW for answer ${tc.answer}`);
        }
    });

    test("solveAndBuildHeader produces valid Base64 payload", () => {
        const encoder = new TextEncoder();
        const targetInput = encoder.encode("salt_1712345678_777");
        const challengeHex = bytesToHex(deepSeekHashV1(targetInput));

        const challenge = {
            algorithm: "DeepSeekHashV1",
            challenge: challengeHex,
            salt: "salt",
            expire_at: 1712345678,
            difficulty: 2000,
            signature: "sig_abc_123",
            target_path: "/api/v0/chat/completion",
        };

        const header = solveAndBuildHeader(challenge);
        assert.ok(typeof header === "string" && header.length > 0);

        const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
        assert.equal(decoded.algorithm, "DeepSeekHashV1");
        assert.equal(decoded.challenge, challengeHex);
        assert.equal(decoded.answer, 777);
        assert.equal(decoded.signature, "sig_abc_123");
        assert.equal(decoded.target_path, "/api/v0/chat/completion");
    });
});
