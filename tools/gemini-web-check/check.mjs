// Live check for the Gemini Web -> API path, run against the worker's own GeminiWebService.
//
//   npm run check           read the cookies from the clipboard (or GEMINI_SECURE_1PSID), run every check
//   npm run check:stored    reuse the session saved by the last run (no cookies needed)
//
// Clipboard: the Gemini Cookie Exporter JSON, or "__Secure-1PSID=...; __Secure-1PSIDTS=..." text.
// Cookie and token values are never printed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GeminiWebService } from "../../cloudflare/worker/src/services/gemini-web.ts";

const PROMPT = "Reply with exactly one word: pong";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

const stateDir = path.join(process.env.LOCALAPPDATA || os.homedir(), "sub2api-gemini-web-check");
const sessionFile = path.join(stateDir, "session.json");

const flags = new Set(process.argv.slice(2));
const results = [];

function record(name, status, detail = "") {
  results.push({ name, status });
  console.log(`[${status}] ${name}${detail ? `：${detail}` : ""}`);
}

async function main() {
  if (flags.has("--stored")) {
    await runStored();
  } else {
    const cookies = loadCookies();
    if (cookies) await checkApiPath(cookies);
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n${passed} 項通過、${failed} 項失敗`);
  process.exit(failed === 0 ? 0 : 1);
}

function loadCookies() {
  if (process.env.GEMINI_SECURE_1PSID) {
    record("Cookie 來源", "PASS", "環境變數");
    return { psid: process.env.GEMINI_SECURE_1PSID, psidts: process.env.GEMINI_SECURE_1PSIDTS || "" };
  }

  let text;
  try {
    text = execFileSync("powershell.exe", ["-NoProfile", "-STA", "-Command", "Get-Clipboard -Raw"], { encoding: "utf8" });
  } catch (err) {
    record("讀取剪貼簿", "FAIL", err.message.split("\n")[0]);
    return null;
  }
  const cookies = parseCookies(text);
  if (!cookies) {
    record("Cookie 來源", "FAIL", "剪貼簿中沒有 __Secure-1PSID；請先在 Chrome 的擴充功能按「一鍵複製憑證」");
    return null;
  }
  record("Cookie 來源", "PASS", `剪貼簿；__Secure-1PSIDTS ${cookies.psidts ? "有" : "無（之後會自動輪換）"}`);
  return cookies;
}

function parseCookies(text) {
  try {
    const parsed = JSON.parse(text);
    const psid = parsed["__Secure-1PSID"] || parsed.secure_1psid;
    if (psid) return { psid, psidts: parsed["__Secure-1PSIDTS"] || parsed.secure_1psidts || "" };
  } catch {
    // Not JSON; try the cookie-string form below.
  }
  const psid = /__Secure-1PSID=([^;\s"']+)/.exec(text)?.[1];
  if (!psid) return null;
  return { psid, psidts: /__Secure-1PSIDTS=([^;\s"']+)/.exec(text)?.[1] ?? "" };
}

async function runStored() {
  if (!fs.existsSync(sessionFile)) {
    record("讀取已儲存的 session", "FAIL", "找不到 session.json，請先執行一次 npm run check");
    return;
  }
  const saved = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
  const hours = ((Date.now() - Date.parse(saved.savedAt)) / 3_600_000).toFixed(1);
  record("讀取已儲存的 session", "PASS", `儲存於 ${hours} 小時前；直接使用其中的 at 與 cookie，不重新初始化`);
  await checkGenerate("API 路徑：非串流（已儲存的 session）", saved.credentials, false);
  await checkGenerate("API 路徑：串流（已儲存的 session）", saved.credentials, true);
}

async function checkApiPath(cookies) {
  let session;
  try {
    session = await GeminiWebService.initSession({ secure_1psid: cookies.psid, secure_1psidts: cookies.psidts }, "");
  } catch (err) {
    record("API 路徑：initSession（抓取 SNlM0e）", "FAIL", err.message);
    return;
  }
  record(
    "API 路徑：initSession（抓取 SNlM0e）",
    "PASS",
    `access token 長度 ${session.at.length}；模型：${session.models.slice(0, 6).join(", ")}`
  );

  // Same shape as an account created by quick-sync, so the saved file can be reused by --stored.
  const credentials = {
    secure_1psid: cookies.psid,
    secure_1psidts: session.newPSIDTS || cookies.psidts,
    at: session.at,
    cookie_header: session.cookieHeader,
    build_label: session.buildLabel,
    session_id: session.sessionID,
    language: session.language,
  };
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(sessionFile, JSON.stringify({ savedAt: new Date().toISOString(), credentials }, null, 2));

  await checkGenerate("API 路徑：非串流對話", credentials, false);
  await checkGenerate("API 路徑：串流對話", credentials, true);
}

async function checkGenerate(name, credentials, stream) {
  try {
    const resp = await GeminiWebService.executeChatCompletion(PROMPT, MODEL, credentials, stream, "");
    const text = await resp.text();
    if (!resp.ok) {
      record(name, "FAIL", `HTTP ${resp.status}：${text.slice(0, 200)}`);
      return;
    }
    if (stream) {
      const events = text.split("\n\n").filter(Boolean);
      const done = events.at(-1) === "data: [DONE]";
      const reply = events
        .filter((event) => event.startsWith("data: ") && event !== "data: [DONE]")
        .map((event) => JSON.parse(event.slice("data: ".length)).choices[0].delta.content ?? "")
        .join("");
      record(name, done && reply ? "PASS" : "FAIL", `結束標記${done ? "正常" : "缺少"}；回覆：「${reply.slice(0, 40)}」`);
      return;
    }
    const body = JSON.parse(text);
    const message = body.choices?.[0]?.message ?? {};
    const reply = message.content ?? "";
    record(name, reply ? "PASS" : "FAIL", `model=${body.model}；role=${message.role}；回覆：「${reply.slice(0, 40)}」`);
  } catch (err) {
    record(name, "FAIL", `丟出例外：${err.message}`);
  }
}

main().catch((err) => {
  console.error(`檢查腳本發生未預期的錯誤：${err.message}`);
  process.exit(1);
});
