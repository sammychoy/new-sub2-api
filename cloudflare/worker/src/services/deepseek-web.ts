/**
 * Service for interacting with DeepSeek Web interface (Reverse-Engineered).
 * Ported from CJackHwang/ds2api with full Cloudflare Worker compatibility.
 */

import { solveAndBuildHeader, type DeepSeekChallenge } from "./deepseek-pow.ts";

export interface DeepSeekWebCredentials {
    auth_type?: string;
    token?: string;
    deepseek_token?: string;
    user_token?: string;
    session_id?: string;
    proxy_id?: number | null;
    updated_at?: string;
    [key: string]: unknown;
}

export interface DeepSeekWebValidationResult {
    valid: boolean;
    sessionId?: string;
    models: string[];
    error?: string;
    userId?: string;
    email?: string;
    name?: string;
}

const DEEPSEEK_HOST = "chat.deepseek.com";
const ENDPOINT_USER_CURRENT = `https://${DEEPSEEK_HOST}/api/v0/users/current`;
const ENDPOINT_CREATE_POW = `https://${DEEPSEEK_HOST}/api/v0/chat/create_pow_challenge`;
const ENDPOINT_CREATE_SESSION = `https://${DEEPSEEK_HOST}/api/v0/chat_session/create`;
const ENDPOINT_DELETE_SESSION = `https://${DEEPSEEK_HOST}/api/v0/chat_session/delete`;
const ENDPOINT_COMPLETION = `https://${DEEPSEEK_HOST}/api/v0/chat/completion`;
const COMPLETION_TARGET_PATH = "/api/v0/chat/completion";

const DEFAULT_HEADERS: Record<string, string> = {
    "Host": DEEPSEEK_HOST,
    "Accept": "application/json",
    "Content-Type": "application/json",
    "accept-charset": "UTF-8",
    "User-Agent": "DeepSeek/2.0.4 Android/35",
    "x-client-platform": "android",
    "x-client-version": "2.0.4",
    "x-client-locale": "zh_CN",
};

export const DEEPSEEK_SUPPORTED_MODELS = [
    "deepseek-chat",
    "deepseek-reasoner",
    "deepseek-v4-flash",
    "deepseek-v4-pro",
    "deepseek-v3",
    "deepseek-r1",
];

const tokenPowCache = new Map<string, { header: string; expireAt: number }>();

export class DeepSeekWebService {
    static cleanToken(v?: string): string {
        if (!v) return "";
        let s = v.trim();
        if (s.startsWith("{") && s.endsWith("}")) {
            try {
                const parsed = JSON.parse(s);
                if (parsed && typeof parsed === "object" && typeof parsed.value === "string") {
                    s = parsed.value.trim();
                }
            } catch {
                // Ignore parse errors and treat as raw string
            }
        }
        s = s.replace(/^Bearer\s+/i, "");
        s = s.replace(/^["']+|["']+$/g, "").trim();
        return s;
    }

    /**
     * Obtains and solves the PoW challenge from chat.deepseek.com.
     */
    static async getPow(
        token: string,
        proxyUrl?: string,
        signal?: AbortSignal
    ): Promise<string> {
        const now = Date.now();
        const cached = tokenPowCache.get(token);
        if (cached && cached.expireAt > now + 30000) {
            return cached.header;
        }

        const resp = await this.performFetch(ENDPOINT_CREATE_POW, {
            method: "POST",
            headers: {
                ...DEFAULT_HEADERS,
                "authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ target_path: COMPLETION_TARGET_PATH }),
            signal: signal ?? AbortSignal.timeout(15000),
        }, proxyUrl);

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`PoW request failed with status ${resp.status}: ${errText.slice(0, 200)}`);
        }

        const data = await resp.json() as Record<string, any>;
        if (data.code !== 0 || !data.data?.biz_data?.challenge) {
            throw new Error(`Invalid PoW challenge response: ${data.msg || JSON.stringify(data)}`);
        }

        const challenge = data.data.biz_data.challenge as DeepSeekChallenge;
        const header = solveAndBuildHeader(challenge, signal);
        const rawExpire = Number(challenge.expire_at);
        const expireAt = Number.isFinite(rawExpire) && rawExpire > 0 ? (rawExpire < 1e12 ? rawExpire * 1000 : rawExpire) : now + 300000;
        tokenPowCache.set(token, { header, expireAt });
        return header;
    }

    /**
     * Creates a new chat session on chat.deepseek.com.
     */
    static async createSession(
        token: string,
        proxyUrl?: string,
        signal?: AbortSignal
    ): Promise<string> {
        const resp = await this.performFetch(ENDPOINT_CREATE_SESSION, {
            method: "POST",
            headers: {
                ...DEFAULT_HEADERS,
                "authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ agent: "chat" }),
            signal: signal ?? AbortSignal.timeout(15000),
        }, proxyUrl);

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Create session failed with status ${resp.status}: ${errText.slice(0, 200)}`);
        }

        const data = await resp.json() as Record<string, any>;
        if (data.code !== 0) {
            throw new Error(`Create session failed: ${data.msg || "unknown error"}`);
        }

        const sessionId = data.data?.biz_data?.chat_session?.id || data.data?.biz_data?.id;
        if (!sessionId || typeof sessionId !== "string") {
            throw new Error("Create session succeeded but returned no session ID");
        }

        return sessionId;
    }

    /**
     * Deletes a chat session on chat.deepseek.com (cleanup).
     */
    static async deleteSession(
        token: string,
        sessionId: string,
        proxyUrl?: string
    ): Promise<boolean> {
        try {
            const resp = await this.performFetch(ENDPOINT_DELETE_SESSION, {
                method: "POST",
                headers: {
                    ...DEFAULT_HEADERS,
                    "authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ chat_session_id: sessionId }),
                signal: AbortSignal.timeout(10000),
            }, proxyUrl);
            return resp.ok;
        } catch {
            return false;
        }
    }

    /**
     * Retrieves current user profile from chat.deepseek.com.
     */
    static async getUserProfile(
        token: string,
        proxyUrl?: string,
        signal?: AbortSignal
    ): Promise<{ id: string; email: string; name: string } | null> {
        try {
            const resp = await this.performFetch(ENDPOINT_USER_CURRENT, {
                method: "GET",
                headers: {
                    ...DEFAULT_HEADERS,
                    "authorization": `Bearer ${token}`,
                },
                signal: signal ?? AbortSignal.timeout(10000),
            }, proxyUrl);
            if (!resp.ok) return null;
            const data = await resp.json() as Record<string, any>;
            if (data.code === 0 && data.data?.biz_data) {
                const b = data.data.biz_data;
                const profile = b.id_profile || (Array.isArray(b.id_profiles) && b.id_profiles[0]) || {};
                return {
                    id: String(b.id || ""),
                    email: String(b.email || profile.email || ""),
                    name: String(profile.name || b.name || "DeepSeek User"),
                };
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Validates a DeepSeek user token by checking user profile and creating a test session.
     */
    static async validateSession(
        rawToken: string,
        proxyUrl?: string
    ): Promise<DeepSeekWebValidationResult> {
        const token = this.cleanToken(rawToken);
        if (!token) {
            return { valid: false, models: [], error: "Token is empty" };
        }

        try {
            // 1. Fetch user profile - direct, lightweight validation without CPU PoW
            const user = await this.getUserProfile(token, proxyUrl);

            // 2. Test session creation and cleanup
            let sessionId: string | undefined;
            try {
                sessionId = await this.createSession(token, proxyUrl);
                void this.deleteSession(token, sessionId, proxyUrl);
            } catch (sessionErr) {
                // If profile succeeded, session creation failure may be non-fatal or informative
                if (!user) {
                    throw sessionErr;
                }
            }

            if (!user && !sessionId) {
                return {
                    valid: false,
                    models: [],
                    error: "Invalid DeepSeek user token",
                };
            }

            return {
                valid: true,
                sessionId,
                userId: user?.id,
                email: user?.email,
                name: user?.name,
                models: [...DEEPSEEK_SUPPORTED_MODELS],
            };
        } catch (err) {
            return {
                valid: false,
                models: [],
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }

    /**
     * Parses a single SSE data payload from DeepSeek's stream.
     * Extracts text fragments, marking whether they are 'thinking' or 'text'.
     */
    static parseSSELine(
        payloadStr: string,
        state: { mode: "thinking" | "text" } = { mode: "text" }
    ): { parts: Array<{ text: string; type: "thinking" | "text" }>; finished: boolean; error?: string } {
        const trimmed = payloadStr.trim();
        if (!trimmed || trimmed === "[DONE]") {
            return { parts: [], finished: trimmed === "[DONE]" };
        }

        let chunk: Record<string, any>;
        try {
            chunk = JSON.parse(trimmed);
        } catch {
            return { parts: [], finished: false };
        }

        if (chunk.error) {
            return { parts: [], finished: true, error: typeof chunk.error === "string" ? chunk.error : JSON.stringify(chunk.error) };
        }

        const pathValue = typeof chunk.p === "string" ? chunk.p : "";
        const parts: Array<{ text: string; type: "thinking" | "text" }> = [];

        // Check if finished
        if (pathValue === "response/status" && (chunk.v === "FINISHED" || chunk.v === "STOP")) {
            return { parts: [], finished: true };
        }

        // Initial response structure with fragments
        if (chunk.v?.response?.fragments && Array.isArray(chunk.v.response.fragments)) {
            for (const frag of chunk.v.response.fragments) {
                if (!frag || typeof frag !== "object") continue;
                const fragType = String(frag.type || "").toUpperCase();
                const content = typeof frag.content === "string" ? frag.content : "";
                if (!content) continue;

                if (fragType === "THINK" || fragType === "THINKING") {
                    parts.push({ text: content, type: "thinking" });
                    state.mode = "thinking";
                } else {
                    parts.push({ text: content, type: "text" });
                    state.mode = "text";
                }
            }
        }

        // Incremental fragment append by path:
        if (pathValue.includes("thinking")) {
            state.mode = "thinking";
            if (typeof chunk.v === "string" && chunk.v) {
                parts.push({ text: chunk.v, type: "thinking" });
            }
        } else if (pathValue.includes("content") && !pathValue.includes("status") && !pathValue.includes("accumulated")) {
            state.mode = "text";
            if (typeof chunk.v === "string" && chunk.v) {
                parts.push({ text: chunk.v, type: "text" });
            }
        } else if (!pathValue && typeof chunk.v === "string" && chunk.v) {
            // Unprefixed streaming delta e.g. {"v":"..."} -> inherit active mode
            parts.push({ text: chunk.v, type: state.mode });
        }

        // Check whole fragments append
        if (pathValue === "response/fragments" && String(chunk.o).toUpperCase() === "APPEND" && Array.isArray(chunk.v)) {
            for (const frag of chunk.v) {
                if (!frag || typeof frag !== "object") continue;
                const fragType = String(frag.type || "").toUpperCase();
                const content = typeof frag.content === "string" ? frag.content : "";
                if (!content) continue;

                if (fragType === "THINK" || fragType === "THINKING") {
                    parts.push({ text: content, type: "thinking" });
                    state.mode = "thinking";
                } else {
                    parts.push({ text: content, type: "text" });
                    state.mode = "text";
                }
            }
        }

        return { parts, finished: false };
    }

    /**
     * Executes chat completion against chat.deepseek.com and converts the response into OpenAI format.
     */
    static async executeChatCompletion(
        prompt: string,
        requestedModel: string,
        credentials: DeepSeekWebCredentials,
        stream: boolean,
        proxyUrl?: string
    ): Promise<Response> {
        const token = this.cleanToken(credentials.token || credentials.deepseek_token || credentials.user_token);
        if (!token) {
            return new Response(JSON.stringify({
                error: {
                    message: "DeepSeek Web authentication failed: Missing token in credentials",
                    type: "invalid_request_error",
                    code: "missing_token"
                }
            }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const model = requestedModel || "deepseek-chat";
        const isThinking = model.toLowerCase().includes("reasoner") ||
            model.toLowerCase().includes("r1") ||
            model.toLowerCase().includes("thinking") ||
            model.toLowerCase().includes("pro");

        // 1. Solve PoW
        let powHeader = "";
        try {
            powHeader = await this.getPow(token, proxyUrl);
        } catch (err) {
            return new Response(JSON.stringify({
                error: {
                    message: `DeepSeek Web PoW challenge failed: ${err instanceof Error ? err.message : String(err)}`,
                    type: "pow_error",
                    code: "pow_failed"
                }
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }

        // 2. Create remote session
        let sessionId = "";
        try {
            sessionId = await this.createSession(token, proxyUrl);
        } catch (err) {
            return new Response(JSON.stringify({
                error: {
                    message: `DeepSeek Web session creation failed: ${err instanceof Error ? err.message : String(err)}`,
                    type: "session_error",
                    code: "session_failed"
                }
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }

        // 3. Send Completion request
        const payload = {
            chat_session_id: sessionId,
            model_type: "default",
            parent_message_id: null,
            prompt,
            ref_file_ids: [],
            thinking_enabled: isThinking,
            search_enabled: false,
        };

        const completionHeaders: Record<string, string> = {
            ...DEFAULT_HEADERS,
            "Accept": "text/event-stream",
            "authorization": `Bearer ${token}`,
            "x-ds-pow-response": powHeader,
        };

        let upstreamResp: Response;
        try {
            upstreamResp = await this.performFetch(ENDPOINT_COMPLETION, {
                method: "POST",
                headers: completionHeaders,
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(90000),
            }, proxyUrl);
        } catch (err) {
            void this.deleteSession(token, sessionId, proxyUrl);
            return new Response(JSON.stringify({
                error: {
                    message: `DeepSeek Web completion network error: ${err instanceof Error ? err.message : String(err)}`,
                    type: "upstream_error",
                    code: 502
                }
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }

        if (!upstreamResp.ok) {
            const errText = await upstreamResp.text();
            void this.deleteSession(token, sessionId, proxyUrl);
            return new Response(JSON.stringify({
                error: {
                    message: `DeepSeek Web returned HTTP ${upstreamResp.status}: ${errText.slice(0, 300)}`,
                    type: "upstream_error",
                    code: upstreamResp.status
                }
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }

        const responseId = `chatcmpl-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
        const created = Math.floor(Date.now() / 1000);

        // 4. Handle Streaming Response
        if (stream) {
            const upstreamBody = upstreamResp.body;
            if (!upstreamBody) {
                void this.deleteSession(token, sessionId, proxyUrl);
                return new Response(JSON.stringify({
                    error: { message: "No upstream response body", type: "upstream_error" }
                }), { status: 502, headers: { "Content-Type": "application/json" } });
            }

            const reader = upstreamBody.getReader();
            const textDecoder = new TextDecoder();
            const textEncoder = new TextEncoder();

            let buffer = "";
            let sentRole = false;
            const sseState: { mode: "thinking" | "text" } = { mode: "text" };

            const transformedStream = new ReadableStream({
                async pull(controller) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            // Emit finish chunk and DONE
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
                            controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(finishChunk)}\n\ndata: [DONE]\n\n`));
                            controller.close();
                            void DeepSeekWebService.deleteSession(token, sessionId, proxyUrl);
                            return;
                        }

                        buffer += textDecoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed.startsWith("data:")) continue;
                            const dataPayload = trimmed.slice(5).trim();
                            if (!dataPayload) continue;

                            if (dataPayload === "[DONE]") {
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
                                controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(finishChunk)}\n\ndata: [DONE]\n\n`));
                                controller.close();
                                void DeepSeekWebService.deleteSession(token, sessionId, proxyUrl);
                                return;
                            }

                            const parsed = DeepSeekWebService.parseSSELine(dataPayload, sseState);
                            for (const part of parsed.parts) {
                                const delta: Record<string, any> = {};
                                if (!sentRole) {
                                    delta.role = "assistant";
                                    sentRole = true;
                                }
                                if (part.type === "thinking") {
                                    delta.reasoning_content = part.text;
                                } else {
                                    delta.content = part.text;
                                }

                                const chunkObj = {
                                    id: responseId,
                                    object: "chat.completion.chunk",
                                    created,
                                    model,
                                    choices: [{
                                        index: 0,
                                        delta,
                                        finish_reason: null
                                    }]
                                };
                                controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(chunkObj)}\n\n`));
                            }

                            if (parsed.finished) {
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
                                controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(finishChunk)}\n\ndata: [DONE]\n\n`));
                                controller.close();
                                void DeepSeekWebService.deleteSession(token, sessionId, proxyUrl);
                                return;
                            }
                        }
                    }
                },
                cancel() {
                    void reader.cancel();
                    void DeepSeekWebService.deleteSession(token, sessionId, proxyUrl);
                }
            });

            return new Response(transformedStream, {
                headers: {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            });
        }

        // 5. Handle Non-Streaming Response
        try {
            const rawBody = await upstreamResp.text();
            let fullContent = "";
            let fullReasoning = "";
            const sseState: { mode: "thinking" | "text" } = { mode: "text" };

            const lines = rawBody.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const dataPayload = trimmed.slice(5).trim();
                if (!dataPayload || dataPayload === "[DONE]") continue;

                const parsed = this.parseSSELine(dataPayload, sseState);
                for (const part of parsed.parts) {
                    if (part.type === "thinking") {
                        fullReasoning += part.text;
                    } else {
                        fullContent += part.text;
                    }
                }
            }

            void this.deleteSession(token, sessionId, proxyUrl);

            const estPromptTokens = Math.ceil(prompt.length / 4);
            const estCompletionTokens = Math.ceil((fullContent.length + fullReasoning.length) / 4);

            const messageObj: Record<string, any> = {
                role: "assistant",
                content: fullContent,
            };
            if (fullReasoning) {
                messageObj.reasoning_content = fullReasoning;
            }

            const openAIResponse = {
                id: responseId,
                object: "chat.completion",
                created,
                model,
                choices: [{
                    index: 0,
                    message: messageObj,
                    finish_reason: "stop"
                }],
                usage: {
                    prompt_tokens: estPromptTokens,
                    completion_tokens: estCompletionTokens,
                    total_tokens: estPromptTokens + estCompletionTokens
                }
            };

            return new Response(JSON.stringify(openAIResponse), {
                status: 200,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store"
                }
            });
        } catch (err) {
            void this.deleteSession(token, sessionId, proxyUrl);
            return new Response(JSON.stringify({
                error: {
                    message: `DeepSeek Web response parsing failed: ${err instanceof Error ? err.message : String(err)}`,
                    type: "parse_error"
                }
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }
    }

    /**
     * Performs fetch, routing through proxyUrl if configured.
     */
    private static async performFetch(
        url: string,
        init: RequestInit,
        proxyUrl?: string
    ): Promise<Response> {
        if (!proxyUrl || proxyUrl.trim() === "") {
            return fetch(url, init);
        }

        const cleanProxy = proxyUrl.trim();
        try {
            if (cleanProxy.includes("%s") || cleanProxy.includes("?url=")) {
                const targetUrl = cleanProxy.includes("%s")
                    ? cleanProxy.replace("%s", encodeURIComponent(url))
                    : `${cleanProxy}${encodeURIComponent(url)}`;
                return fetch(targetUrl, init);
            }

            return fetch(url, init);
        } catch {
            return fetch(url, init);
        }
    }
}
