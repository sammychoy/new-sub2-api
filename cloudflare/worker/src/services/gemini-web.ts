/**
 * Service for interacting with Google Gemini Web interface (Reverse-Engineered).
 * Ported from ntthanh2603/gemini-web-to-api with full Cloudflare Worker compatibility.
 */

export interface GeminiWebCredentials {
    auth_type?: string;
    secure_1psid: string;
    secure_1psidts?: string;
    at?: string;
    cookie_header?: string;
    push_id?: string;
    build_label?: string;
    session_id?: string;
    language?: string;
    cached_models?: string[];
    proxy_id?: number | null;
    updated_at?: string;
    [key: string]: unknown;
}

export interface GeminiWebSession {
    at: string;
    cookieHeader: string;
    pushID: string;
    buildLabel: string;
    sessionID: string;
    language: string;
    models: string[];
    newPSIDTS?: string;
}

const ACCESS_TOKEN_REGEX = /"SNlM0e":"([^"]+)"/;
const ACCESS_TOKEN_FALLBACK_REGEX = /\["SNlM0e","([^"]+)"\]/;
const PUSH_ID_REGEX = /"qKIAYe":"([^"]+)"/;
const BUILD_LABEL_REGEX = /"cfb2h":"([^"]+)"/;
const SESSION_ID_REGEX = /"FdrFJe":"([^"]+)"/;
const LANGUAGE_REGEX = /"TuX5cc":"([^"]+)"/;
const MODEL_ID_REGEX = /gemini-[a-zA-Z0-9.-]+/g;
const VALID_MODEL_PREFIX_REGEX = /^gemini-(\d|advanced)/;

const ENDPOINT_INIT = "https://gemini.google.com/app";
const ENDPOINT_GENERATE = "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate";
const ENDPOINT_ROTATE_COOKIES = "https://accounts.google.com/RotateCookies";

const DEFAULT_HEADERS: Record<string, string> = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    "Origin": "https://gemini.google.com",
    "Referer": "https://gemini.google.com/",
    "Sec-Ch-Ua": `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`,
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": `"Windows"`,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "X-Same-Domain": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export class GeminiWebService {
    static cleanCookie(v?: string): string {
        if (!v) return "";
        let s = v.trim().replace(/;+$/, "").trim();
        s = s.replace(/^["']+|["']+$/g, "").trim();
        return s;
    }

    /**
     * Initializes a session from __Secure-1PSID and optionally __Secure-1PSIDTS.
     * Fetches https://gemini.google.com/app to extract SNlM0e, build labels, and available models.
     */
    static async initSession(
        credentials: GeminiWebCredentials,
        proxyUrl?: string
    ): Promise<GeminiWebSession> {
        const psid = this.cleanCookie(credentials.secure_1psid);
        let psidts = this.cleanCookie(credentials.secure_1psidts);

        if (!psid) {
            throw new Error("Missing __Secure-1PSID cookie");
        }

        // 1. If psidts is missing, attempt to rotate cookies to obtain one
        let newPSIDTS: string | undefined;
        if (!psidts) {
            const rotResult = await this.rotateCookies({ secure_1psid: psid }, proxyUrl);
            if (rotResult.newPSIDTS) {
                psidts = rotResult.newPSIDTS;
                newPSIDTS = rotResult.newPSIDTS;
            }
        }

        let cookieHeader = `__Secure-1PSID=${psid}`;
        if (psidts) {
            cookieHeader += `; __Secure-1PSIDTS=${psidts}`;
        }

        // 2. Initial hit to google.com to get extra cookies if possible
        try {
            const googleResp = await this.performFetch("https://www.google.com/", {
                headers: {
                    "User-Agent": DEFAULT_HEADERS["User-Agent"],
                    "Cookie": cookieHeader,
                },
                signal: AbortSignal.timeout(15000),
            }, proxyUrl);
            const extraCookieHeader = googleResp.headers.get("set-cookie");
            if (extraCookieHeader) {
                cookieHeader = this.mergeCookies(cookieHeader, extraCookieHeader);
            }
        } catch {
            // Non-critical, continue
        }

        // 3. Main INIT hit to gemini.google.com/app?hl=en
        const initResp = await this.performFetch(`${ENDPOINT_INIT}?hl=en`, {
            headers: {
                ...DEFAULT_HEADERS,
                "Cookie": cookieHeader,
            },
            signal: AbortSignal.timeout(20000),
        }, proxyUrl);

        if (!initResp.ok) {
            throw new Error(`Failed to reach Gemini Web (Status: ${initResp.status})`);
        }

        const body = await initResp.text();
        const setCookieHeaders = initResp.headers.get("set-cookie");
        if (setCookieHeaders) {
            cookieHeader = this.mergeCookies(cookieHeader, setCookieHeaders);
        }

        // Extract SNlM0e token
        let at = "";
        const m1 = ACCESS_TOKEN_REGEX.exec(body);
        if (m1 && m1[1]) {
            at = m1[1];
        } else {
            const m2 = ACCESS_TOKEN_FALLBACK_REGEX.exec(body);
            if (m2 && m2[1]) {
                at = m2[1];
            }
        }

        if (!at) {
            if (body.includes("Sign in") || body.includes("login") || body.includes("accounts.google.com")) {
                throw new Error("Gemini Web authentication failed: Cookies are expired or invalid. Please check __Secure-1PSID and __Secure-1PSIDTS.");
            }
            throw new Error("Gemini Web authentication failed: SNlM0e token not found in page response.");
        }

        const pushMatch = PUSH_ID_REGEX.exec(body);
        const pushID = pushMatch ? pushMatch[1] : "feeds/mcudyrk2a4khkz";

        const buildMatch = BUILD_LABEL_REGEX.exec(body);
        const buildLabel = buildMatch ? buildMatch[1] : "";

        const sessionMatch = SESSION_ID_REGEX.exec(body);
        const sessionID = sessionMatch ? sessionMatch[1] : "";

        const langMatch = LANGUAGE_REGEX.exec(body);
        const language = langMatch ? langMatch[1] : "en";

        // Discover models
        const modelsFound = new Set<string>();
        const modelMatches = body.match(MODEL_ID_REGEX) || [];
        for (const m of modelMatches) {
            const trimmed = m.replace(/["'\\]/g, "");
            if (trimmed.length > 10 && VALID_MODEL_PREFIX_REGEX.test(trimmed)) {
                modelsFound.add(trimmed);
            }
        }

        // Fallback default models if none parsed
        if (modelsFound.size === 0) {
            modelsFound.add("gemini-2.5-pro");
            modelsFound.add("gemini-2.5-flash");
        }

        return {
            at,
            cookieHeader,
            pushID,
            buildLabel,
            sessionID,
            language,
            models: Array.from(modelsFound),
            newPSIDTS,
        };
    }

    /**
     * Rotates cookies by calling accounts.google.com/RotateCookies.
     */
    static async rotateCookies(
        credentials: GeminiWebCredentials,
        proxyUrl?: string
    ): Promise<{ success: boolean; newPSIDTS?: string }> {
        const psid = this.cleanCookie(credentials.secure_1psid);
        const psidts = this.cleanCookie(credentials.secure_1psidts);

        const parts: string[] = [];
        if (psid) parts.push(`__Secure-1PSID=${psid}`);
        if (psidts) parts.push(`__Secure-1PSIDTS=${psidts}`);
        const cookieStr = parts.join("; ");

        const payload = '[000,"-0000000000000000000"]';

        try {
            const resp = await this.performFetch(ENDPOINT_ROTATE_COOKIES, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": DEFAULT_HEADERS["User-Agent"],
                    "Cookie": cookieStr,
                },
                body: payload,
                signal: AbortSignal.timeout(15000),
            }, proxyUrl);

            if (!resp.ok) {
                return { success: false };
            }

            const setCookie = resp.headers.get("set-cookie") || "";
            const match = /__Secure-1PSIDTS=([^;]+)/.exec(setCookie);
            if (match && match[1]) {
                return { success: true, newPSIDTS: match[1].trim() };
            }
            return { success: true };
        } catch {
            return { success: false };
        }
    }

    /**
     * Builds the Google internal 69-item nested sparse array payload for StreamGenerate.
     */
    static buildGenerateInner(
        prompt: string,
        model: string,
        language: string,
        requestId: string,
        isTemporary = false
    ): unknown[] {
        const messageContent = [prompt];
        const defaultMetadata = ["", "", "", null, null, null, null, null, null, ""];
        const inner: unknown[] = new Array(69).fill(null);

        inner[0] = messageContent;
        inner[1] = [language];
        inner[2] = defaultMetadata;
        inner[3] = model;
        inner[6] = [1];
        inner[7] = 1;
        inner[10] = 1;
        inner[11] = 0;
        inner[17] = [[0]];
        inner[18] = 0;
        inner[27] = 1;
        inner[30] = [4];
        inner[41] = [1];
        inner[53] = 0;
        inner[59] = requestId;
        inner[61] = [];
        inner[68] = 2;

        if (isTemporary) {
            inner[45] = 1;
            inner[67] = 0;
        }

        return inner;
    }

    /**
     * Executes chat completion by proxying to StreamGenerate and converting the stream to OpenAI format.
     */
    static async executeChatCompletion(
        prompt: string,
        requestedModel: string,
        credentials: GeminiWebCredentials,
        stream: boolean,
        proxyUrl?: string
    ): Promise<Response> {
        let at = credentials.at;
        let cookieHdr = credentials.cookie_header;
        let buildLabel = credentials.build_label || "";
        let sessionID = credentials.session_id || "";
        let language = credentials.language || "en";

        // If credentials lack session state, initialize on the fly
        if (!at || !cookieHdr) {
            const session = await this.initSession(credentials, proxyUrl);
            at = session.at;
            cookieHdr = session.cookieHeader;
            buildLabel = session.buildLabel;
            sessionID = session.sessionID;
            language = session.language;
        }

        const model = requestedModel || "gemini-2.5-pro";
        const requestId = crypto.randomUUID().toUpperCase();
        const inner = this.buildGenerateInner(prompt, model, language, requestId, false);
        const outer = [null, JSON.stringify(inner)];

        const formValues = new URLSearchParams();
        formValues.set("at", at);
        formValues.set("f.req", JSON.stringify(outer));

        const queryValues = new URLSearchParams();
        queryValues.set("at", at);
        queryValues.set("hl", language);
        queryValues.set("_reqid", String(Math.floor(Math.random() * 90000) + 10000));
        queryValues.set("rt", "c");
        if (buildLabel) queryValues.set("bl", buildLabel);
        if (sessionID) queryValues.set("f.sid", sessionID);

        const generateUrl = `${ENDPOINT_GENERATE}?${queryValues.toString()}`;

        const traceID = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        const extHeader = `[1,null,null,null,"${traceID}",null,null,0,[4,5,6,8],null,null,2,null,null,6,1,"${crypto.randomUUID().toUpperCase()}"]`;

        const resp = await this.performFetch(generateUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                "Origin": "https://gemini.google.com",
                "Referer": "https://gemini.google.com/",
                "User-Agent": DEFAULT_HEADERS["User-Agent"],
                "X-Same-Domain": "1",
                "x-goog-ext-525001261-jspb": extHeader,
                "Cookie": cookieHdr,
            },
            body: formValues.toString(),
            signal: AbortSignal.timeout(60000),
        }, proxyUrl);

        if (!resp.ok) {
            const errText = await resp.text();
            return new Response(JSON.stringify({
                error: {
                    message: `Gemini Web returned HTTP ${resp.status}: ${errText.slice(0, 300)}`,
                    type: "upstream_error",
                    code: resp.status
                }
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }

        const fullBody = await resp.text();
        const parsed = this.parseResponse(fullBody);

        if (!parsed.found && !parsed.text) {
            return new Response(JSON.stringify({
                error: {
                    message: "Failed to parse content from Gemini Web response. Check cookies or prompt.",
                    type: "parse_error",
                }
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }

        const created = Math.floor(Date.now() / 1000);
        const responseId = `chatcmpl-${crypto.randomUUID().slice(0, 8)}`;

        if (stream) {
            // Return OpenAI-compatible SSE stream
            const encoder = new TextEncoder();
            const streamBody = new ReadableStream({
                start(controller) {
                    // Send thinking trace if available
                    if (parsed.reasoning) {
                        const thinkingChunk = {
                            id: responseId,
                            object: "chat.completion.chunk",
                            created,
                            model,
                            choices: [{
                                index: 0,
                                delta: { reasoning_content: parsed.reasoning },
                                finish_reason: null
                            }]
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(thinkingChunk)}\n\n`));
                    }

                    // Send content
                    const contentChunk = {
                        id: responseId,
                        object: "chat.completion.chunk",
                        created,
                        model,
                        choices: [{
                            index: 0,
                            delta: { content: parsed.text },
                            finish_reason: null
                        }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`));

                    // Send finish
                    const finishChunk = {
                        id: responseId,
                        object: "chat.completion.chunk",
                        created,
                        model,
                        choices: [{
                            index: 0,
                            delta: {},
                            finish_reason: "stop"
                        }]
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                }
            });

            return new Response(streamBody, {
                headers: {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            });
        }

        // Return non-streaming response
        const openAIResponse = {
            id: responseId,
            object: "chat.completion",
            created,
            model,
            choices: [{
                index: 0,
                message: {
                    role: "assistant",
                    content: parsed.text,
                    ...(parsed.reasoning ? { reasoning_content: parsed.reasoning } : {})
                },
                finish_reason: "stop"
            }],
            usage: {
                prompt_tokens: Math.ceil(prompt.length / 4),
                completion_tokens: Math.ceil(parsed.text.length / 4),
                total_tokens: Math.ceil((prompt.length + parsed.text.length) / 4)
            }
        };

        return new Response(JSON.stringify(openAIResponse), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }

    /**
     * Parses the Google Gemini Web chunked batch response (starts with )]}' ).
     */
    static parseResponse(text: string): { found: boolean; text: string; reasoning?: string } {
        let finalResText = "";
        let found = false;

        const lines = text.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            if (line.startsWith(")]}'")) {
                line = line.slice(4).trim();
            }

            try {
                const root = JSON.parse(line);
                if (!Array.isArray(root)) continue;

                for (const item of root) {
                    if (!Array.isArray(item) || item.length < 3) continue;
                    const payloadStr = item[2];
                    if (typeof payloadStr !== "string") continue;

                    const payload = JSON.parse(payloadStr);
                    if (!Array.isArray(payload) || payload.length <= 4) continue;

                    const candidates = payload[4];
                    if (!Array.isArray(candidates) || candidates.length === 0) continue;

                    const firstCandidate = candidates[0];
                    if (!Array.isArray(firstCandidate) || firstCandidate.length < 2) continue;

                    const contentParts = firstCandidate[1];
                    if (Array.isArray(contentParts) && contentParts.length > 0) {
                        const resText = contentParts[0];
                        if (typeof resText === "string") {
                            finalResText = resText;
                            found = true;
                        }
                    }
                }
            } catch {
                // Ignore parse errors on individual line chunks
            }
        }

        if (found || finalResText) {
            const { thinking, cleanText } = this.extractThinking(finalResText);
            return {
                found: true,
                text: cleanText,
                reasoning: thinking || undefined
            };
        }

        return { found: false, text: "" };
    }

    static extractThinking(raw: string): { thinking: string; cleanText: string } {
        const thoughtMatch = /<thought>([\s\S]*?)<\/thought>/i.exec(raw);
        if (thoughtMatch) {
            const thinking = thoughtMatch[1].trim();
            const cleanText = raw.replace(/<thought>[\s\S]*?<\/thought>/i, "").trim();
            return { thinking, cleanText };
        }
        return { thinking: "", cleanText: raw };
    }

    /**
     * Merges Set-Cookie headers into an existing Cookie string.
     */
    static mergeCookies(base: string, setCookieHeader: string): string {
        const map = new Map<string, string>();
        for (const part of base.split(";")) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const idx = trimmed.indexOf("=");
            if (idx > 0) {
                map.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim());
            }
        }

        const newParts = setCookieHeader.split(/,(?=\s*[a-zA-Z0-9_%-]+=[^;]+)/);
        for (const p of newParts) {
            const firstSegment = p.split(";")[0].trim();
            const idx = firstSegment.indexOf("=");
            if (idx > 0) {
                map.set(firstSegment.slice(0, idx).trim(), firstSegment.slice(idx + 1).trim());
            }
        }

        const res: string[] = [];
        for (const [k, v] of map.entries()) {
            res.push(`${k}=${v}`);
        }
        return res.join("; ");
    }

    /**
     * Performs a fetch request, optionally routing through an HTTP Forward Proxy or Gateway.
     */
    private static async performFetch(
        url: string,
        init: RequestInit,
        proxyUrl?: string
    ): Promise<Response> {
        if (!proxyUrl || proxyUrl.trim() === "") {
            return fetch(url, init);
        }

        // If proxy is an HTTP Gateway (e.g. http://proxy.com/target?url=...)
        const cleanProxy = proxyUrl.trim();
        try {
            if (cleanProxy.includes("%s") || cleanProxy.includes("?url=")) {
                const targetUrl = cleanProxy.includes("%s") ? cleanProxy.replace("%s", encodeURIComponent(url)) : `${cleanProxy}${encodeURIComponent(url)}`;
                return fetch(targetUrl, init);
            }

            return fetch(url, init);
        } catch {
            return fetch(url, init);
        }
    }
}
