<template>
  <div class="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-7">
    <div class="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-500">04</span>
        <h2 class="text-sm font-bold text-zinc-900 dark:text-white">{{ t('dashboard.recentUsage') }}</h2>
      </div>
      <span class="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        {{ t('dashboard.last7Days') }}
      </span>
    </div>
    <div class="pt-4">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
      <div v-else-if="data.length === 0" class="py-8">
        <EmptyState :title="t('dashboard.noUsageRecords')" :description="t('dashboard.startUsingApi')" />
      </div>
      <div v-else class="space-y-2.5">
        <div
          v-for="log in data"
          :key="log.id"
          class="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-100/80 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              <Icon name="server" size="xs" class="text-zinc-800 dark:text-zinc-200" />
            </div>
            <div>
              <p class="font-mono text-xs font-bold text-zinc-900 dark:text-white">{{ log.model }}</p>
              <p class="font-mono text-[11px] text-zinc-400">{{ formatDateTime(log.created_at) }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-mono text-xs font-bold">
              <span class="text-zinc-900 dark:text-white" :title="t('dashboard.actual')">${{ formatCost(log.actual_cost) }}</span>
              <span class="font-normal text-zinc-400" :title="t('dashboard.standard')"> / ${{ formatCost(log.total_cost) }}</span>
            </p>
            <p class="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{{ (log.input_tokens + log.output_tokens).toLocaleString() }} tokens</p>
          </div>
        </div>

        <router-link
          to="/usage"
          class="group mt-2 flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white py-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-50 hover:border-zinc-400 hover:scale-[1.01] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <span>{{ t('dashboard.viewAllUsage') }}</span>
          <span class="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Icon from '@/components/icons/Icon.vue'
import { formatDateTime } from '@/utils/format'
import type { UsageLog } from '@/types'

defineProps<{
  data: UsageLog[]
  loading: boolean
}>()
const { t } = useI18n()
const formatCost = (c: number) => c.toFixed(4)
</script>
