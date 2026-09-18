/**
 * Regression test for dsh 0.1.6-alpha.2: the sessions list store
 * (useSessions / SessionListState) dropped its `current` field, so the
 * Git and Files views lost the session's working directory and the panel
 * showed no repository. The conversation.view slot now passes the active
 * `sessionId` as a framework prop; the bundle must read that first and keep
 * `current` only as a fallback for older runtimes.
 *
 * Run with: node --test test/client-cwd.test.js
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bundle = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
const patchScript = readFileSync(new URL("../scripts/patch-client.mjs", import.meta.url), "utf8");

/** Pull every `props.useSessions((s) => { ... })` selector out of the bundle. */
function extractSelectors(source) {
  const re = /const sessionCwd = props\.useSessions\((\s*\(s\) => \{[\s\S]*?\n      \})\);/g;
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}

test("bundle resolves cwd from the slot-provided sessionId (Git + Files views)", () => {
  const selectors = extractSelectors(bundle);
  assert.equal(selectors.length, 2, "expected the Git and Files session-cwd selectors");

  for (const selector of selectors) {
    assert.match(selector, /props\.sessionId \|\| s\.current/,
      "selector must prefer props.sessionId and only fall back to s.current");
    // Build the selector with `props` bound so the closure resolves.
    const run = new Function("props", `return (${selector})`);
    const props = { sessionId: "session-1" };
    const sel = run(props);

    // New 0.1.6-alpha.2 store: no `current`, cwd keyed by sessionId.
    assert.equal(
      sel({ byId: { "session-1": { cwd: "/Users/me/project" } } }),
      "/Users/me/project",
      "must read the cwd of the active session from byId",
    );

    // Legacy store (pre-0.1.6): `current` still drives the selection.
    const legacy = new Function("props", `return (${selector})`)({});
    assert.equal(
      legacy({ current: "session-old", byId: { "session-old": { cwd: "/legacy/repo" } } }),
      "/legacy/repo",
      "older runtimes without sessionId must keep working via s.current",
    );

    // No selection / unknown session → empty (manual path entry stays available).
    assert.equal(sel({ byId: {} }), "");
  }
});

test("no selector still relies on the removed s.current alone", () => {
  assert.doesNotMatch(bundle, /const cur = s\.current;/,
    "the old s.current-only selector must be gone");
});

test("patch-client.mjs records the 0.1.6 cwd fix", () => {
  assert.match(patchScript, /Patch 16: dsh 0\.1\.6-alpha\.2 removed/);
  assert.match(patchScript, /props\.sessionId \|\| s\.current/);
});
