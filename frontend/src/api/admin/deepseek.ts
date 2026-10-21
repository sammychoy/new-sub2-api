/**
 * Admin DeepSeek API endpoints
 * Handles DeepSeek Web session validation and quick sync for administrators.
 */

import { apiClient } from '../client'

export interface DeepSeekValidateRequest {
  token: string
  proxy_id?: number | null
}

export interface DeepSeekValidateResponse {
  valid: boolean
  models?: string[]
  session_id?: string
  user_id?: string
  email?: string
  name?: string
  user?: {
    user_id?: string
    email?: string
    name?: string
  }
  error?: string
}

export interface DeepSeekQuickSyncRequest {
  name: string
  token: string
  group_ids?: number[]
  proxy_id?: number | null
  rate_multiplier?: number
  concurrency?: number
}

export interface DeepSeekQuickSyncResponse {
  success: boolean
  account_id: number
  user_id?: string
  email?: string
  name?: string
}

export interface DeepSeekModelsResponse {
  models: string[]
}

export const deepseekAPI = {
  async validateWebSession(data: DeepSeekValidateRequest): Promise<DeepSeekValidateResponse> {
    const { data: resData } = await apiClient.post<DeepSeekValidateResponse>('/admin/deepseek/web/validate', data)
    return resData
  },

  async quickSyncWebSession(data: DeepSeekQuickSyncRequest): Promise<DeepSeekQuickSyncResponse> {
    const { data: resData } = await apiClient.post<DeepSeekQuickSyncResponse>('/admin/deepseek/web/quick-sync', data)
    return resData
  },

  async getModels(): Promise<DeepSeekModelsResponse> {
    const { data: resData } = await apiClient.get<DeepSeekModelsResponse>('/admin/deepseek/web/models')
    return resData
  },
}

export default deepseekAPI
