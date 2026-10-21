import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { classifyBackendRoute } from "../src/routes.ts";

test("every statically extracted Go route is owned by the Worker classifier", (t) => {
    const extractor = fileURLToPath(new URL("../../scripts/extract-go-route-contract.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [extractor], {
        encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    const contract = JSON.parse(result.stdout);
    if (contract.routeCount === 0) {
        t.skip("legacy Go route sources are not present");
        return;
    }
    assert.equal(contract.unresolvedCount, 0);
    assert.ok(contract.routeCount > 0);

    for (const route of contract.routes) {
        assert.notEqual(
            classifyBackendRoute(route.path),
            null,
            `${route.method} ${route.path} (${route.source}:${route.line})`
        );
    }
});

