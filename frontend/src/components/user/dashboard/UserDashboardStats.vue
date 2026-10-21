<template>
  <div class="space-y-4">
    <!-- Row 1: Core Stats -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <!-- Balance -->
      <div v-if="!isSimple" class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="dollar" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.balance') }}</p>
            <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">
              ${{ formatBalance(balance) }}
            </p>
            <p class="text-[11px] text-zinc-400">{{ t('common.available') }}</p>
          </div>
        </div>
      </div>

      <!-- API Keys -->
      <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="key" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.apiKeys') }}</p>
            <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ stats?.total_api_keys || 0 }}</p>
            <p class="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{{ stats?.active_api_keys || 0 }} {{ t('common.active') }}</p>
          </div>
        </div>
      </div>

      <!-- Today Requests -->
      <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="chart" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.todayRequests') }}</p>
            <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ stats?.today_requests || 0 }}</p>
            <p class="text-[11px] text-zinc-400">{{ t('common.total') }}: {{ formatNumber(stats?.total_requests || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Today Cost -->
      <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="swap" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.todayCost') }}</p>
            <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">
              <span :title="t('dashboard.actual')">${{ formatCost(stats?.today_actual_cost || 0) }}</span>
              <span class="text-xs font-normal text-zinc-400" :title="t('dashboard.standard')"> / ${{ formatCost(stats?.today_cost || 0) }}</span>
            </p>
            <p class="text-[11px]">
              <span class="text-zinc-400">{{ t('common.total') }}: </span>
              <span class="font-mono text-zinc-700 dark:text-zinc-300" :title="t('dashboard.actual')">${{ formatCost(stats?.total_actual_cost || 0) }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: Token Stats & Performance -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <!-- Today Tokens -->
      <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="cube" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.todayTokens') }}</p>
            <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ formatTokens(stats?.today_tokens || 0) }}</p>
            <p class="text-[10px] text-zinc-400">{{ t('dashboard.input') }}: {{ formatTokens(stats?.today_input_tokens || 0) }} / {{ t('dashboard.output') }}: {{ formatTokens(stats?.today_output_tokens || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Total Tokens -->
      <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="server" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.totalTokens') }}</p>
            <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ formatTokens(stats?.total_tokens || 0) }}</p>
            <p class="text-[10px] text-zinc-400">{{ t('dashboard.input') }}: {{ formatTokens(stats?.total_input_tokens || 0) }} / {{ t('dashboard.output') }}: {{ formatTokens(stats?.total_output_tokens || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Performance (RPM/TPM) -->
      <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="bolt" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div class="flex-1">
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.performance') }}</p>
            <div class="flex items-baseline gap-2">
              <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ formatTokens(stats?.rpm || 0) }}</p>
              <span class="font-mono text-[10px] text-zinc-400">RPM</span>
            </div>
            <div class="flex items-baseline gap-2">
              <p class="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">{{ formatTokens(stats?.tpm || 0) }}</p>
              <span class="font-mono text-[10px] text-zinc-400">TPM</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Avg Response Time -->
      <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            <Icon name="clock" size="sm" class="text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.avgResponse') }}</p>
            <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ formatDuration(stats?.average_duration_ms || 0) }}</p>
            <p class="text-[11px] text-zinc-400">{{ t('dashboard.averageTime') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Per-platform breakdown -->
    <div v-if="!isSimple && platformCards.length > 0" class="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-7">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-500">01.1</span>
          <h3 class="text-sm font-bold text-zinc-900 dark:text-white">{{ t('dashboard.platformBreakdown') }}</h3>
        </div>
        <span class="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          {{ t('dashboard.platformCount', { count: sortedPlatforms.length }) }}
        </span>
      </div>
      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="item in platformCards"
          :key="item.platform"
          :class="[
            'rounded-2xl border p-4 transition-all duration-200 hover:border-zinc-400 dark:hover:border-zinc-700',
            item.isOther
              ? 'border-dashed border-zinc-300 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/40'
              : 'border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-950/40'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-zinc-900 dark:text-white">
              {{ item.isOther ? t('dashboard.platformOther') : platformLabel(item.platform) }}
            </span>
            <span class="font-mono text-xs font-bold text-zinc-900 dark:text-white" :title="t('dashboard.actual')">
              ${{ formatCost(item.total_actual_cost) }}
            </span>
          </div>
          <div class="mt-2.5 space-y-1.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 dark:text-zinc-400">{{ t('dashboard.todayCost') }}</span>
              <span class="font-mono font-medium text-zinc-900 dark:text-white">${{ formatCost(item.today_actual_cost) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 dark:text-zinc-400">{{ t('dashboard.requests') }}</span>
              <span class="font-mono text-zinc-700 dark:text-zinc-300">
                {{ item.total_requests > 0 ? formatNumber(item.total_requests) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 dark:text-zinc-400">{{ t('dashboard.tokens') }}</span>
              <span class="font-mono text-zinc-700 dark:text-zinc-300">
                {{ item.total_tokens > 0 ? formatTokens(item.total_tokens) : '-' }}
              </span>
            </div>
          </div>

          <!-- Quota Section -->
          <div v-if="hasAnyLimit(item.quota) && !item.isOther" class="mt-3.5 space-y-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
            <p class="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
              {{ t('dashboard.platformQuota.title') }}
            </p>
            <template v-for="w in (['daily', 'weekly', 'monthly'] as const)" :key="w">
              <div v-if="quotaVal(item.quota, `${w}_limit_usd`) != null" class="space-y-1">
                <template v-if="(quotaVal(item.quota, `${w}_limit_usd`) as number) === 0">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-zinc-600 dark:text-zinc-300">{{ t(`dashboard.platformQuota.${w}`) }}</span>
                    <span class="font-mono text-rose-500">{{ t('dashboard.platformQuota.disabled') }}</span>
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div class="h-full w-full rounded-full bg-rose-500" />
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-zinc-600 dark:text-zinc-300">{{ t(`dashboard.platformQuota.${w}`) }}</span>
                    <span class="font-mono text-zinc-700 dark:text-zinc-200">
                      ${{ formatUsd((quotaVal(item.quota, `${w}_usage_usd`) as number) ?? 0) }} / ${{ formatUsd(quotaVal(item.quota, `${w}_limit_usd`) as number) }}
                    </span>
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="quotaBarClass(calcPercent((quotaVal(item.quota, `${w}_usage_usd`) as number) ?? 0, quotaVal(item.quota, `${w}_limit_usd`) as number))"
                      :style="{ width: calcPercent((quotaVal(item.quota, `${w}_usage_usd`) as number) ?? 0, quotaVal(item.quota, `${w}_limit_usd`) as number) + '%' }"
                    />
                  </div>
                  <p v-if="quotaVal(item.quota, `${w}_window_resets_at`)" class="text-[10px] text-zinc-400">
                    {{ t('dashboard.platformQuota.resetsAt', { time: formatResetTime(quotaVal(item.quota, `${w}_window_resets_at`) as string) }) }}
                  </p>
                </template>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { UserDashboardStats as UserStatsType } from '@/api/usage'
import type { PlatformQuotaItem } from '@/types'

interface FusedPlatformCard {
  platform: string
  total_actual_cost: number
  today_actual_cost: number
  total_requests: number
  total_tokens: number
  isOther?: boolean
  quota?: PlatformQuotaItem
}

const props = defineProps<{
  stats: UserStatsType
  balance: number
  isSimple: boolean
  platformQuotas?: PlatformQuotaItem[] | null
}>()
const { t } = useI18n()

const PLATFORM_LABELS: Record<string, string> = {
  anthropic: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
  antigravity: 'Antigravity',
  grok: 'Grok',
  deepseek: 'DeepSeek'
}

const platformLabel = (p: string) => PLATFORM_LABELS[p] ?? p

const sortedPlatforms = computed(() => {
  const list = props.stats?.by_platform ?? []
  return [...list].sort((a, b) => b.total_actual_cost - a.total_actual_cost)
})

const OTHER_THRESHOLD = 0.0001
const platformCards = computed<FusedPlatformCard[]>(() => {
  const byPlat = new Map<string, (typeof sortedPlatforms.value)[number]>()
  for (const item of props.stats?.by_platform ?? []) byPlat.set(item.platform, item)

  const byQuota = new Map<string, PlatformQuotaItem>()
  for (const q of props.platformQuotas ?? []) byQuota.set(q.platform, q)

  const platforms = new Set<string>([...byPlat.keys(), ...byQuota.keys()])
  const PLATFORM_ORDER = ['anthropic', 'openai', 'gemini', 'antigravity', 'grok', 'deepseek', 'glm', 'minimax', 'qwen', 'kimi', 'moonshot']
  const cards: FusedPlatformCard[] = []

  for (const p of platforms) {
    const stat = byPlat.get(p)
    cards.push({
      platform: p,
      total_actual_cost: stat?.total_actual_cost ?? 0,
      today_actual_cost: stat?.today_actual_cost ?? 0,
      total_requests: stat?.total_requests ?? 0,
      total_tokens: stat?.total_tokens ?? 0,
      quota: byQuota.get(p),
    })
  }

  cards.sort((a, b) => {
    const ai = PLATFORM_ORDER.indexOf(a.platform)
    const bi = PLATFORM_ORDER.indexOf(b.platform)
    if (ai === -1 && bi === -1) return a.platform.localeCompare(b.platform)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const total = props.stats?.total_actual_cost ?? 0
  const today = props.stats?.today_actual_cost ?? 0
  const sumTotal = cards.reduce((s, c) => s + c.total_actual_cost, 0)
  const sumToday = cards.reduce((s, c) => s + c.today_actual_cost, 0)
  const diffTotal = Math.max(0, total - sumTotal)
  const diffToday = Math.max(0, today - sumToday)

  if (diffTotal > OTHER_THRESHOLD || diffToday > OTHER_THRESHOLD) {
    cards.push({
      platform: '__other__',
      total_actual_cost: diffTotal,
      today_actual_cost: diffToday,
      total_requests: 0,
      total_tokens: 0,
      isOther: true,
    })
  }

  return cards
})

type QuotaWindow = 'daily' | 'weekly' | 'monthly'
type QuotaField = `${QuotaWindow}_limit_usd` | `${QuotaWindow}_usage_usd` | `${QuotaWindow}_window_resets_at`

function quotaVal(q: PlatformQuotaItem | undefined, key: QuotaField): PlatformQuotaItem[QuotaField] {
  return q?.[key]
}

function hasAnyLimit(q: PlatformQuotaItem | undefined): boolean {
  if (!q) return false
  return q.daily_limit_usd != null || q.weekly_limit_usd != null || q.monthly_limit_usd != null
}

function calcPercent(usage: number, limit: number): number {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((usage / limit) * 100)))
}

function quotaBarClass(p: number): string {
  if (p >= 95) return 'bg-rose-500'
  if (p >= 75) return 'bg-amber-500'
  return 'bg-zinc-800 dark:bg-zinc-200'
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '0.00'
  return usdFormatter.format(n)
}

function formatResetTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const formatBalance = (b: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(b)

const formatNumber = (n: number) => n.toLocaleString()
const formatCost = (c: number) => c.toFixed(4)
const formatTokens = (t: number) => {
  if (t >= 1_000_000) return `${(t / 1_000_000).toFixed(1)}M`
  if (t >= 1000) return `${(t / 1000).toFixed(1)}K`
  return t.toString()
}
const formatDuration = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`
</script>
