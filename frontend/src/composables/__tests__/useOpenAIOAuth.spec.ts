import { describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    showError: vi.fn()
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'admin.accounts.oauth.openai.failedToExchangeCode': 'OpenAI 授权码兑换失败',
        'admin.accounts.oauth.openai.errors.OPENAI_OAUTH_PROXY_REQUIRED':
          '未设置代理，当前服务器无法直连 OpenAI，导致 OpenAI OAuth 请求失败。请先选择可访问 OpenAI 的代理后重试；如果授权码已失效，请重新生成授权链接。'
      }
      return messages[key] ?? key
    }
  })
}))

vi.mock('@/api/admin', () => ({
  adminAPI: {
    accounts: {
      generateAuthUrl: vi.fn(),
      exchangeCode: vi.fn(),
      refreshOpenAIToken: vi.fn()
    }
  }
}))

import {
  useOpenAIOAuth,
  parseOpenAIJwtPayload,
  parseSmartOpenAILine,
  OPENAI_MOBILE_RT_CLIENT_ID
} from '@/composables/useOpenAIOAuth'
import { adminAPI } from '@/api/admin'

describe('useOpenAIOAuth.buildCredentials', () => {
  it('should keep client_id when token response contains it', () => {
    const oauth = useOpenAIOAuth()
    const creds = oauth.buildCredentials({
      access_token: 'at',
      refresh_token: 'rt',
      client_id: 'app_test_client',
      expires_at: 1700000000
    })

    expect(creds.client_id).toBe('app_test_client')
    expect(creds.access_token).toBe('at')
    expect(creds.refresh_token).toBe('rt')
  })

  it('should keep legacy behavior when client_id is missing', () => {
    const oauth = useOpenAIOAuth()
    const creds = oauth.buildCredentials({
      access_token: 'at',
      refresh_token: 'rt',
      expires_at: 1700000000
    })

    expect(Object.prototype.hasOwnProperty.call(creds, 'client_id')).toBe(false)
    expect(creds.access_token).toBe('at')
    expect(creds.refresh_token).toBe('rt')
  })

  it('should keep ChatGPT subscription expiration from token response', () => {
    const oauth = useOpenAIOAuth()
    const creds = oauth.buildCredentials({
      access_token: 'at',
      refresh_token: 'rt',
      expires_at: 1700000000,
      plan_type: 'team',
      subscription_expires_at: '2026-07-20T19:22:48+00:00'
    })

    expect(creds.plan_type).toBe('team')
    expect(creds.subscription_expires_at).toBe('2026-07-20T19:22:48+00:00')
  })
})

describe('useOpenAIOAuth.exchangeAuthCode', () => {
  it('shows a clear proxy hint when code exchange fails without a proxy', async () => {
    vi.mocked(adminAPI.accounts.exchangeCode).mockRejectedValueOnce({
      status: 502,
      reason: 'OPENAI_OAUTH_PROXY_REQUIRED',
      message: 'OpenAI OAuth token exchange failed: no proxy is configured.'
    })
    const oauth = useOpenAIOAuth()

    const tokenInfo = await oauth.exchangeAuthCode('code', 'session-id', 'state')

    expect(tokenInfo).toBeNull()
    expect(oauth.error.value).toBe(
      '未设置代理，当前服务器无法直连 OpenAI，导致 OpenAI OAuth 请求失败。请先选择可访问 OpenAI 的代理后重试；如果授权码已失效，请重新生成授权链接。'
    )
  })
})

describe('parseOpenAIJwtPayload', () => {
  it('decodes standard OpenAI JWT claims accurately', () => {
    // payload: { exp: 1800000000, "https://api.openai.com/profile": { email: "user@example.com" }, "https://api.openai.com/auth": { plan_type: "plus", user_id: "user-123" } }
    const payload = {
      exp: 1800000000,
      'https://api.openai.com/profile': { email: 'user@example.com' },
      'https://api.openai.com/auth': { plan_type: 'plus', user_id: 'user-123' }
    }
    const token = 'header.' + btoa(JSON.stringify(payload)).replace(/=/g, '') + '.sig'
    const result = parseOpenAIJwtPayload(token)

    expect(result).not.toBeNull()
    expect(result?.email).toBe('user@example.com')
    expect(result?.plan_type).toBe('plus')
    expect(result?.chatgpt_user_id).toBe('user-123')
    expect(result?.expires_at).toBe(1800000000000)
  })

  it('returns null for non-JWT strings', () => {
    expect(parseOpenAIJwtPayload('not-a-jwt')).toBeNull()
  })
})

describe('parseSmartOpenAILine', () => {
  it('parses structured line with delimiter (email----pwd----RT)', () => {
    const line = 'alice@example.com----secretPass----rt-abc123xyz'
    const result = parseSmartOpenAILine(line)

    expect(result).toEqual({
      type: 'refresh_token',
      token: 'rt-abc123xyz',
      email: 'alice@example.com',
      raw: line
    })
  })

  it('parses cookie format __Secure-next-auth.session-token', () => {
    const line = '__Secure-next-auth.session-token=sess-cookie-token-123; path=/; HttpOnly'
    const result = parseSmartOpenAILine(line)

    expect(result?.type).toBe('session_token')
    expect(result?.token).toBe('sess-cookie-token-123')
  })

  it('parses JSON format with accessToken', () => {
    const line = JSON.stringify({ accessToken: 'eyToken', user: { email: 'bob@example.com' } })
    const result = parseSmartOpenAILine(line)

    expect(result?.type).toBe('access_token')
    expect(result?.token).toBe('eyToken')
    expect(result?.email).toBe('bob@example.com')
  })

  it('identifies OPENAI_MOBILE_RT_CLIENT_ID constant', () => {
    expect(OPENAI_MOBILE_RT_CLIENT_ID).toBe('app_LlGpXReQgckcGGUo2JrYvtJK')
  })
})

