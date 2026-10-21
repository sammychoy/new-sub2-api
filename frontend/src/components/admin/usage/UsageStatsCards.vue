<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <!-- Total Requests -->
    <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <div class="flex items-center gap-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
          <Icon name="document" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div>
          <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('usage.totalRequests') }}</p>
          <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ stats?.total_requests?.toLocaleString() || '0' }}</p>
          <p class="text-[11px] text-zinc-400">{{ t('usage.inSelectedRange') }}</p>
        </div>
      </div>
    </div>

    <!-- Total Tokens -->
    <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <div class="flex items-center gap-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
          <Icon name="cube" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('usage.totalTokens') }}</p>
          <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ formatTokens(stats?.total_tokens || 0) }}</p>
          <p class="flex flex-wrap items-center gap-x-1 text-[11px] text-zinc-400">
            <span>{{ t('usage.in') }}: {{ formatTokens(stats?.total_input_tokens || 0) }}</span>
            <span>/</span>
            <span>{{ t('usage.out') }}: {{ formatTokens(stats?.total_output_tokens || 0) }}</span>
            <span>/</span>
            <span class="group relative inline-flex cursor-help items-center gap-0.5" tabindex="0">
              <span class="text-zinc-600 dark:text-zinc-300">{{ cacheLabel() }}: {{ formatTokens(stats?.total_cache_tokens || 0) }}</span>
              <span
                class="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-3 text-left text-xs text-zinc-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <span class="mb-2 block font-semibold text-zinc-900 dark:text-white">
                  {{ cacheDetailLabel() }}
                </span>
                <span class="flex items-center justify-between gap-3">
                  <span>{{ t('usage.cacheCreationTokensLabel') }}</span>
                  <span class="font-mono tabular-nums">
                    {{ formatTokens(stats?.total_cache_creation_tokens || 0) }}
                  </span>
                </span>
                <span class="mt-1 flex items-center justify-between gap-3">
                  <span>{{ t('usage.cacheReadTokensLabel') }}</span>
                  <span class="font-mono tabular-nums">
                    {{ formatTokens(stats?.total_cache_read_tokens || 0) }}
                  </span>
                </span>
              </span>
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Total Cost -->
    <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <div class="flex items-center gap-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
          <Icon name="dollar" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('usage.totalCost') }}</p>
          <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">
            ${{ (stats?.total_actual_cost || 0).toFixed(4) }}
          </p>
          <p class="text-[11px] text-zinc-400">
            <template v-if="showAccountCost && totalAccountCost != null">
              <span class="text-amber-500 font-mono">{{ t('usage.accountCost') }} ${{ totalAccountCost.toFixed(4) }}</span>
              <span> · </span>
            </template>
            <span>
              {{ t('usage.standardCost') }}
              <span class="font-mono" :class="{ 'line-through': strikeStandardCost }">${{ (stats?.total_cost || 0).toFixed(4) }}</span>
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Avg Duration -->
    <div class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
      <div class="flex items-center gap-3.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
          <Icon name="clock" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div>
          <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('usage.avgDuration') }}</p>
          <p class="font-mono text-xl font-black tracking-tight text-zinc-900 dark:text-white">{{ formatDuration(stats?.average_duration_ms || 0) }}</p>
          <p class="text-[11px] text-zinc-400">{{ t('dashboard.averageTime') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminUsageStatsResponse } from '@/api/admin/usage'
import type { UsageStatsResponse } from '@/types'
import Icon from '@/components/icons/Icon.vue'

const props = withDefaults(defineProps<{
  stats: (AdminUsageStatsResponse | UsageStatsResponse) | null
  showAccountCost?: boolean
  strikeStandardCost?: boolean
}>(), {
  showAccountCost: true,
  strikeStandardCost: false,
})

const { t } = useI18n()

const totalAccountCost = computed(() => {
  const stats = props.stats as (AdminUsageStatsResponse & { total_account_cost?: number }) | null
  return stats?.total_account_cost ?? null
})
const showAccountCost = computed(() => props.showAccountCost)
const strikeStandardCost = computed(() => props.strikeStandardCost)

const formatDuration = (ms: number) =>
  ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`

const formatTokens = (value: number) => {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M'
  if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K'
  return value.toLocaleString()
}

const cacheLabel = () => t('usage.cacheTotal')
const cacheDetailLabel = () => t('usage.cacheBreakdown')
</script>
