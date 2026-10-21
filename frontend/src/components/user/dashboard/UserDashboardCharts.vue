<template>
  <div class="space-y-6">
    <!-- Date Range Filter Toolbar -->
    <div class="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-5">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2.5">
          <span class="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.timeRange') }}:</span>
          <DateRangePicker :start-date="startDate" :end-date="endDate" @update:startDate="(val: any) => emit('update:startDate', val)" @update:endDate="(val: any) => emit('update:endDate', val)" @change="(val: any) => emit('dateRangeChange', val)" />
        </div>
        <button
          @click="emit('refresh')"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <Icon name="refresh" size="xs" :class="{ 'animate-spin': loading }" />
          <span>{{ t('common.refresh') }}</span>
        </button>
        <div class="ml-auto flex items-center gap-2.5">
          <span class="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">{{ t('dashboard.granularity') }}:</span>
          <div class="w-28">
            <Select :model-value="granularity" :options="[{value:'day', label:t('dashboard.day')}, {value:'hour', label:t('dashboard.hour')}]" @update:model-value="(val: any) => emit('update:granularity', String(val))" @change="emit('granularityChange')" />
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Model Distribution Chart -->
      <div class="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-7">
        <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-xs dark:bg-zinc-950/60">
          <LoadingSpinner size="md" />
        </div>
        <div class="mb-4 flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-500">02</span>
          <h3 class="text-sm font-bold text-zinc-900 dark:text-white">{{ t('dashboard.modelDistribution') }}</h3>
        </div>
        <div class="flex flex-col items-center gap-6 sm:flex-row">
          <div class="h-44 w-44 shrink-0">
            <Doughnut v-if="modelData" :data="modelData" :options="doughnutOptions" />
            <div v-else class="flex h-full items-center justify-center text-xs text-zinc-400">{{ t('dashboard.noDataAvailable') }}</div>
          </div>
          <div class="max-h-48 w-full flex-1 overflow-y-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-zinc-400">
                  <th class="pb-2 text-left font-semibold">{{ t('dashboard.model') }}</th>
                  <th class="pb-2 text-right font-semibold">{{ t('dashboard.requests') }}</th>
                  <th class="pb-2 text-right font-semibold">{{ t('dashboard.tokens') }}</th>
                  <th class="pb-2 text-right font-semibold">{{ t('dashboard.actual') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                <tr v-for="model in models" :key="model.model" class="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td class="max-w-[100px] truncate py-2 font-mono font-medium text-zinc-900 dark:text-white" :title="model.model">{{ model.model }}</td>
                  <td class="py-2 text-right font-mono text-zinc-600 dark:text-zinc-400">{{ formatNumber(model.requests) }}</td>
                  <td class="py-2 text-right font-mono text-zinc-600 dark:text-zinc-400">{{ formatTokens(model.total_tokens) }}</td>
                  <td class="py-2 text-right font-mono font-medium text-zinc-900 dark:text-white">${{ formatCost(model.actual_cost) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Token Usage Trend Chart -->
      <div class="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-7">
        <div class="mb-4 flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-500">03</span>
          <h3 class="text-sm font-bold text-zinc-900 dark:text-white">{{ t('dashboard.usageTrend') }}</h3>
        </div>
        <TokenUsageTrend :trend-data="trend" :loading="loading" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import Select from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'
import TokenUsageTrend from '@/components/charts/TokenUsageTrend.vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { TrendDataPoint, ModelStat } from '@/types'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  startDate: string
  endDate: string
  granularity: string
  loading: boolean
  trend: TrendDataPoint[]
  models: ModelStat[]
}>()

const emit = defineEmits<{
  (e: 'update:startDate', value: string): void
  (e: 'update:endDate', value: string): void
  (e: 'update:granularity', value: string): void
  (e: 'dateRangeChange', range: { startDate: string; endDate: string }): void
  (e: 'granularityChange'): void
  (e: 'refresh'): void
}>()

const { t } = useI18n()

const formatNumber = (n: number) => n.toLocaleString()
const formatCost = (c: number) => c.toFixed(4)
const formatTokens = (t: number) => {
  if (t >= 1_000_000) return `${(t / 1_000_000).toFixed(1)}M`
  if (t >= 1000) return `${(t / 1000).toFixed(1)}K`
  return t.toString()
}

const colors = [
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#64748b'
]

const modelData = computed(() => {
  if (!props.models || props.models.length === 0) return null
  return {
    labels: props.models.map(m => m.model),
    datasets: [{
      data: props.models.map(m => m.total_tokens),
      backgroundColor: colors.slice(0, props.models.length),
      borderWidth: 0
    }]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const val = context.raw || 0
          return ` ${formatTokens(val)} tokens`
        }
      }
    }
  },
  cutout: '70%'
}
</script>
