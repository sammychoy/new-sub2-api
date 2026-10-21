/**
 * Admin Gemini API endpoints
 * Handles Gemini OAuth flows for administrators
 */

import { apiClient } from '../client'

export interface GeminiAuthUrlResponse {
  auth_url: string
  session_id: string
  state: string
}

export interface GeminiOAuthCapabilities {
  ai_studio_oauth_enabled: boolean
  required_redirect_uris: string[]
}

export interface GeminiAuthUrlRequest {
  proxy_id?: number
  project_id?: string
  oauth_type?: 'code_assist' | 'google_one' | 'gemini_education' | 'ai_studio'
  tier_id?: string
}

export interface GeminiExchangeCodeRequest {
  session_id: string
  state: string
  code: string
  proxy_id?: number
  oauth_type?: 'code_assist' | 'google_one' | 'gemini_education' | 'ai_studio'
  tier_id?: string
}

export type GeminiTokenInfo = {
  access_token?: string
  refresh_token?: string
  token_type?: string
  scope?: string
  expires_in?: number
  expires_at?: number
  project_id?: string
  oauth_type?: string
  tier_id?: string
  extra?: Record<string, unknown>
  [key: string]: unknown
}

export async function generateAuthUrl(
  payload: GeminiAuthUrlRequest
): Promise<GeminiAuthUrlResponse> {
  const { data } = await apiClient.post<GeminiAuthUrlResponse>(
    '/admin/gemini/oauth/auth-url',
    payload
  )
  return data
}

export async function exchangeCode(payload: GeminiExchangeCodeRequest): Promise<GeminiTokenInfo> {
  const { data } = await apiClient.post<GeminiTokenInfo>(
    '/admin/gemini/oauth/exchange-code',
    payload
  )
  return data
}

export async function getCapabilities(): Promise<GeminiOAuthCapabilities> {
  const { data } = await apiClient.get<GeminiOAuthCapabilities>('/admin/gemini/oauth/capabilities')
  return data
}

export interface GeminiWebValidateRequest {
  secure_1psid: string
  secure_1psidts?: string
  proxy_id?: number
}

export interface GeminiWebValidateResponse {
  valid: boolean
  models: string[]
  at?: string
  session_id?: string
  new_psidts?: string
  metadata?: Record<string, any>
  error?: string
}

export interface GeminiWebQuickSyncRequest {
  name?: string
  secure_1psid: string
  secure_1psidts?: string
  proxy_id?: number
  group_ids?: number[]
}

export interface GeminiWebQuickSyncResponse {
  success: boolean
  account_id: number
  name: string
  models: string[]
}

export async function validateWebCookies(
  payload: GeminiWebValidateRequest
): Promise<GeminiWebValidateResponse> {
  const { data } = await apiClient.post<GeminiWebValidateResponse>(
    '/admin/gemini/web/validate',
    payload
  )
  return data
}

export async function quickSyncWebAccount(
  payload: GeminiWebQuickSyncRequest
): Promise<GeminiWebQuickSyncResponse> {
  const { data } = await apiClient.post<GeminiWebQuickSyncResponse>(
    '/admin/gemini/web/quick-sync',
    payload
  )
  return data
}

export async function rotateWebCookies(
  accountId: number
): Promise<{ success: boolean; rotated: boolean; updated_at?: string }> {
  const { data } = await apiClient.post<{ success: boolean; rotated: boolean; updated_at?: string }>(
    `/admin/gemini/web/accounts/${accountId}/rotate`
  )
  return data
}

export default {
  generateAuthUrl,
  exchangeCode,
  getCapabilities,
  validateWebCookies,
  quickSyncWebAccount,
  rotateWebCookies
}

