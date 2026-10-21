import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminAPI } from '@/api/admin'
import { extractApiErrorMessage, extractI18nErrorMessage } from '@/utils/apiError'

export interface OpenAITokenInfo {
  access_token?: string
  refresh_token?: string
  session_token?: string
  client_id?: string
  id_token?: string
  token_type?: string
  expires_in?: number
  expires_at?: number
  scope?: string
  email?: string
  name?: string
  plan_type?: string
  subscription_expires_at?: string
  privacy_mode?: string
  // OpenAI specific IDs (extracted from ID Token or profile)
  chatgpt_account_id?: string
  chatgpt_user_id?: string
  organization_id?: string
  [key: string]: unknown
}

export type OpenAIOAuthPlatform = 'openai'

export const OPENAI_MOBILE_RT_CLIENT_ID = 'app_LlGpXReQgckcGGUo2JrYvtJK'

/**
 * Client-side decode of OpenAI JWT claims (zero-latency validation)
 */
export function parseOpenAIJwtPayload(token: string): Partial<OpenAITokenInfo> | null {
  try {
    const parts = token.trim().split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    const profile = payload['https://api.openai.com/profile'] || {}
    const auth = payload['https://api.openai.com/auth'] || {}
    return {
      access_token: token.trim(),
      expires_at: typeof payload.exp === 'number' ? payload.exp * 1000 : undefined,
      email: profile.email || payload.email || undefined,
      name: profile.name || undefined,
      chatgpt_user_id: auth.user_id || payload.sub || undefined,
      chatgpt_account_id: auth.chatgpt_account_id || undefined,
      organization_id: auth.organization_id || undefined,
      plan_type: auth.plan_type || undefined
    }
  } catch {
    return null
  }
}

export interface ParsedSmartCredentialLine {
  type: 'access_token' | 'refresh_token' | 'session_token'
  token: string
  email?: string
  name?: string
  expires_at?: number
  raw: string
}

/**
 * Smart line parser for multiple OpenAI token formats
 * Supports:
 * - Direct AT (eyJ... JWT)
 * - Direct RT (rt-... or alphanumeric)
 * - ChatGPT Session Token (__Secure-next-auth.session-token=... or sess-...)
 * - Structured lines (email----password----token or email:password:token)
 * - JSON string ({ accessToken, user: { email } })
 */
export function parseSmartOpenAILine(line: string): ParsedSmartCredentialLine | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // 1. Structured line with ---- delimiter: email----password----token
  if (trimmed.includes('----')) {
    const parts = trimmed.split('----').map((p) => p.trim())
    if (parts.length >= 3) {
      const email = parts[0]
      const token = parts[parts.length - 1]
      const isJwt = token.startsWith('ey') && token.split('.').length >= 3
      return {
        type: isJwt ? 'access_token' : 'refresh_token',
        token,
        email,
        raw: trimmed
      }
    }
  }

  // 2. Cookie format: __Secure-next-auth.session-token=...
  if (trimmed.includes('__Secure-next-auth.session-token=')) {
    const match = trimmed.match(/__Secure-next-auth\.session-token=([^;\s\r\n"']+)/)
    if (match && match[1]) {
      return {
        type: 'session_token',
        token: match[1],
        raw: trimmed
      }
    }
  }

  // 3. JSON format: { "accessToken": "...", "user": { "email": "..." } }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed)
      const at = obj.accessToken || obj.access_token
      if (at) {
        return {
          type: 'access_token',
          token: at,
          email: obj.user?.email || obj.email,
          raw: trimmed
        }
      }
      if (obj.refresh_token) {
        return {
          type: 'refresh_token',
          token: obj.refresh_token,
          email: obj.email,
          raw: trimmed
        }
      }
      if (obj.session_token || obj['__Secure-next-auth.session-token']) {
        return {
          type: 'session_token',
          token: obj.session_token || obj['__Secure-next-auth.session-token'],
          email: obj.email,
          raw: trimmed
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. JWT Access Token (starts with ey... and 3 segments)
  if (trimmed.startsWith('ey') && trimmed.split('.').length >= 3) {
    const jwt = parseOpenAIJwtPayload(trimmed)
    return {
      type: 'access_token',
      token: trimmed,
      email: jwt?.email,
      expires_at: jwt?.expires_at,
      raw: trimmed
    }
  }

  // 5. Session token (sess-... or long alphanumeric)
  if (trimmed.startsWith('sess-')) {
    return {
      type: 'session_token',
      token: trimmed,
      raw: trimmed
    }
  }

  // Default to refresh token
  return {
    type: 'refresh_token',
    token: trimmed,
    raw: trimmed
  }
}


export function useOpenAIOAuth() {
  const appStore = useAppStore()
  const { t } = useI18n()
  const endpointPrefix = '/admin/openai'

  // State
  const authUrl = ref('')
  const sessionId = ref('')
  const oauthState = ref('')
  const loading = ref(false)
  const error = ref('')

  // Reset state
  const resetState = () => {
    authUrl.value = ''
    sessionId.value = ''
    oauthState.value = ''
    loading.value = false
    error.value = ''
  }

  // Generate auth URL for OpenAI OAuth (default to platform SPA mode)
  const generateAuthUrl = async (
    proxyId?: number | null,
    redirectUri?: string,
    oauthMode: 'platform' | 'codex' = 'platform'
  ): Promise<boolean> => {
    loading.value = true
    authUrl.value = ''
    sessionId.value = ''
    oauthState.value = ''
    error.value = ''

    try {
      const payload: Record<string, unknown> = {
        oauth_mode: oauthMode
      }
      if (proxyId) {
        payload.proxy_id = proxyId
      }
      if (redirectUri) {
        payload.redirect_uri = redirectUri
      }

      const response = await adminAPI.accounts.generateAuthUrl(
        `${endpointPrefix}/generate-auth-url`,
        payload
      )
      authUrl.value = response.auth_url
      sessionId.value = response.session_id
      try {
        const parsed = new URL(response.auth_url)
        oauthState.value = parsed.searchParams.get('state') || ''
      } catch {
        oauthState.value = ''
      }
      return true
    } catch (err: any) {
      error.value = extractApiErrorMessage(err, t('admin.accounts.oauth.openai.failedToGenerateUrl'))
      appStore.showError(error.value)
      return false
    } finally {
      loading.value = false
    }
  }

  // Exchange auth code for tokens
  const exchangeAuthCode = async (
    code: string,
    currentSessionId: string,
    state: string,
    proxyId?: number | null
  ): Promise<OpenAITokenInfo | null> => {
    let resolvedSessionId = currentSessionId
    if (!resolvedSessionId && state.includes('.')) {
      resolvedSessionId = state.split('.')[0]
    }

    if (!code.trim() || !resolvedSessionId || !state.trim()) {
      error.value = 'Missing auth code, session ID, or state'
      return null
    }

    loading.value = true
    error.value = ''

    try {
      const payload: { session_id: string; code: string; state: string; proxy_id?: number } = {
        session_id: resolvedSessionId,
        code: code.trim(),
        state: state.trim()
      }
      if (proxyId) {
        payload.proxy_id = proxyId
      }

      const tokenInfo = await adminAPI.accounts.exchangeCode(`${endpointPrefix}/exchange-code`, payload)
      return tokenInfo as OpenAITokenInfo
    } catch (err: any) {
      error.value = extractI18nErrorMessage(
        err,
        t,
        'admin.accounts.oauth.openai.errors',
        t('admin.accounts.oauth.openai.failedToExchangeCode')
      )
      appStore.showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  // Validate refresh token and get full token info
  // clientId: 指定 OAuth client_id（用于第三方渠道获取的 RT，如 app_LlGpXReQgckcGGUo2JrYvtJK）
  const validateRefreshToken = async (
    refreshToken: string,
    proxyId?: number | null,
    clientId?: string
  ): Promise<OpenAITokenInfo | null> => {
    if (!refreshToken.trim()) {
      error.value = 'Missing refresh token'
      return null
    }

    loading.value = true
    error.value = ''

    try {
      // Use dedicated refresh-token endpoint
      const tokenInfo = await adminAPI.accounts.refreshOpenAIToken(
        refreshToken.trim(),
        proxyId,
        `${endpointPrefix}/refresh-token`,
        clientId
      )
      return tokenInfo as OpenAITokenInfo
    } catch (err: any) {
      error.value = extractI18nErrorMessage(
        err,
        t,
        'admin.accounts.oauth.openai.errors',
        t('admin.accounts.oauth.openai.failedToValidateRT')
      )
      appStore.showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  // Validate ChatGPT Session Token via chatgpt.com/api/auth/session
  const validateSessionToken = async (
    sessionToken: string,
    proxyId?: number | null
  ): Promise<OpenAITokenInfo | null> => {
    if (!sessionToken.trim()) {
      error.value = 'Missing session token'
      return null
    }

    loading.value = true
    error.value = ''

    try {
      const tokenInfo = await adminAPI.accounts.validateOpenAISessionToken(
        sessionToken.trim(),
        proxyId,
        `${endpointPrefix}/validate-session-token`
      )
      return tokenInfo as OpenAITokenInfo
    } catch (err: any) {
      error.value = extractI18nErrorMessage(
        err,
        t,
        'admin.accounts.oauth.openai.errors',
        t('admin.accounts.oauth.openai.failedToValidateSession')
      )
      appStore.showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  // Build credentials for OpenAI OAuth account (aligned with backend BuildAccountCredentials)
  const buildCredentials = (tokenInfo: OpenAITokenInfo): Record<string, unknown> => {
    const creds: Record<string, unknown> = {
      access_token: tokenInfo.access_token,
      expires_at: tokenInfo.expires_at
    }

    // 仅在返回了新的 refresh_token 时才写入，防止用空值覆盖已有令牌
    if (tokenInfo.refresh_token) {
      creds.refresh_token = tokenInfo.refresh_token
    }
    if (tokenInfo.session_token) {
      creds.session_token = tokenInfo.session_token
    }
    if (tokenInfo.id_token) {
      creds.id_token = tokenInfo.id_token
    }
    if (tokenInfo.email) {
      creds.email = tokenInfo.email
    }
    if (tokenInfo.chatgpt_account_id) {
      creds.chatgpt_account_id = tokenInfo.chatgpt_account_id
    }
    if (tokenInfo.chatgpt_user_id) {
      creds.chatgpt_user_id = tokenInfo.chatgpt_user_id
    }
    if (tokenInfo.organization_id) {
      creds.organization_id = tokenInfo.organization_id
    }
    if (tokenInfo.plan_type) {
      creds.plan_type = tokenInfo.plan_type
    }
    if (tokenInfo.subscription_expires_at) {
      creds.subscription_expires_at = tokenInfo.subscription_expires_at
    }
    if (tokenInfo.client_id) {
      creds.client_id = tokenInfo.client_id
    }

    return creds
  }

  // Build extra info from token response
  const buildExtraInfo = (tokenInfo: OpenAITokenInfo): Record<string, string> | undefined => {
    const extra: Record<string, string> = {}
    if (tokenInfo.email) {
      extra.email = tokenInfo.email
    }
    if (tokenInfo.name) {
      extra.name = tokenInfo.name
    }
    if (tokenInfo.privacy_mode) {
      extra.privacy_mode = tokenInfo.privacy_mode
    }
    return Object.keys(extra).length > 0 ? extra : undefined
  }

  return {
    // State
    authUrl,
    sessionId,
    oauthState,
    loading,
    error,
    // Methods
    resetState,
    generateAuthUrl,
    exchangeAuthCode,
    validateRefreshToken,
    validateSessionToken,
    buildCredentials,
    buildExtraInfo
  }
}
