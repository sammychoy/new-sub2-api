import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountQuotaInfo from '../AccountQuotaInfo.vue'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.time) return `${key}:${params.time}`
      return key
    }
  })
}))

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 1,
    name: 'test-account',
    platform: 'gemini',
    type: 'oauth',
    proxy_id: null,
    concurrency: 1,
    priority: 1,
    status: 'active',
    error_message: null,
    last_used_at: null,
    expires_at: null,
    auto_pause_on_expired: true,
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
    schedulable: true,
    rate_limited_at: null,
    rate_limit_reset_at: null,
    overload_until: null,
    temp_unschedulable_until: null,
    temp_unschedulable_reason: null,
    session_window_start: null,
    session_window_end: null,
    session_window_status: null,
    ...overrides
  }
}

describe('AccountQuotaInfo', () => {
  it('renders Gemini Education standard tier badge', () => {
    const wrapper = mount(AccountQuotaInfo, {
      props: {
        account: makeAccount({
          credentials: {
            oauth_type: 'gemini_education',
            tier_id: 'gemini_education'
          }
        })
      }
    })

    expect(wrapper.text()).toContain('Gemini Education')
    expect(wrapper.find('.badge').classes()).toContain('bg-teal-100')
  })

  it('renders Gemini Education Premium tier badge', () => {
    const wrapper = mount(AccountQuotaInfo, {
      props: {
        account: makeAccount({
          credentials: {
            oauth_type: 'gemini_education',
            tier_id: 'gemini_education_premium'
          }
        })
      }
    })

    expect(wrapper.text()).toContain('Gemini Education Premium')
    expect(wrapper.find('.badge').classes()).toContain('bg-emerald-100')
  })

  it('renders Google One Pro tier badge', () => {
    const wrapper = mount(AccountQuotaInfo, {
      props: {
        account: makeAccount({
          credentials: {
            oauth_type: 'google_one',
            tier_id: 'google_ai_pro'
          }
        })
      }
    })

    expect(wrapper.text()).toContain('Google AI Pro')
    expect(wrapper.find('.badge').classes()).toContain('bg-blue-100')
  })

  it('renders Google One Ultra tier badge', () => {
    const wrapper = mount(AccountQuotaInfo, {
      props: {
        account: makeAccount({
          credentials: {
            oauth_type: 'google_one',
            tier_id: 'google_ai_ultra'
          }
        })
      }
    })

    expect(wrapper.text()).toContain('Google AI Ultra')
    expect(wrapper.find('.badge').classes()).toContain('bg-purple-100')
  })
})
