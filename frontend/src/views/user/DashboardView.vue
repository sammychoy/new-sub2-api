<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Top StudyMind Style Greeting Header -->
      <div class="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 sm:p-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <!-- Live Status Pill -->
            <div class="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-0.5 text-[11px] font-mono font-semibold text-zinc-700 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
              </span>
              <span>{{ t('dashboard.statusLive') }}</span>
            </div>

            <h1 class="mt-3 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {{ t('dashboard.greeting', { name: userName }) }}<span class="text-zinc-400">.</span>
            </h1>
            <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400 sm:text-base">
              {{ t('dashboard.tagline') }}
            </p>
          </div>

          <!-- Top Quick Pill CTAs -->
          <div class="flex flex-wrap items-center gap-2.5">
            <router-link
              to="/keys"
              class="group inline-flex items-center gap-1.5 rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:bg-zinc-800 hover:scale-105 active:scale-95 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <Icon name="key" size="xs" />
              <span>{{ t('dashboard.createKey') }}</span>
              <span class="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </router-link>

            <router-link
              to="/redeem"
              class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition-all duration-200 hover:bg-zinc-50 hover:border-zinc-400 hover:scale-105 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Icon name="gift" size="xs" />
              <span>{{ t('dashboard.redeemQuota') }}</span>
            </router-link>

            <button
              @click="refreshAll"
              :disabled="loading"
              class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 shadow-xs transition-all duration-200 hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
              :title="t('dashboard.refreshData')"
            >
              <Icon name="refresh" size="xs" :class="{ 'animate-spin': loading }" />
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !stats" class="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>

      <!-- Main Dashboard Grid -->
      <template v-else-if="stats">
        <!-- 1. Stats Row -->
        <UserDashboardStats
          :stats="stats"
          :balance="user?.balance || 0"
          :is-simple="authStore.isSimpleMode"
          :platform-quotas="platformQuotas"
        />

        <!-- 2. Charts Row -->
        <UserDashboardCharts
          v-model:startDate="startDate"
          v-model:endDate="endDate"
          v-model:granularity="granularity"
          :loading="loadingCharts"
          :trend="trendData"
          :models="modelStats"
          @dateRangeChange="loadCharts"
          @granularityChange="loadCharts"
          @refresh="refreshAll"
        />

        <!-- 3. Bottom Grid: Recent Usage & Quick Actions -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <UserDashboardRecentUsage :data="recentUsage" :loading="loadingUsage" />
          </div>
          <div class="lg:col-span-1">
            <UserDashboardQuickActions />
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { usageAPI, type UserDashboardStats as UserStatsType } from '@/api/usage'
import AppLayout from '@/components/layout/AppLayout.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Icon from '@/components/icons/Icon.vue'
import UserDashboardStats from '@/components/user/dashboard/UserDashboardStats.vue'
import UserDashboardCharts from '@/components/user/dashboard/UserDashboardCharts.vue'
import UserDashboardRecentUsage from '@/components/user/dashboard/UserDashboardRecentUsage.vue'
import UserDashboardQuickActions from '@/components/user/dashboard/UserDashboardQuickActions.vue'
import type { UsageLog, TrendDataPoint, ModelStat, PlatformQuotaItem } from '@/types'
import { getMyPlatformQuotas } from '@/api/user'
import { formatDateLocalInput } from '@/utils/format'

const { t } = useI18n()
const authStore = useAuthStore()
const user = computed(() => authStore.user)
const userName = computed(() => user.value?.username || user.value?.email?.split('@')[0] || t('dashboard.developer'))

const stats = ref<UserStatsType | null>(null)
const loading = ref(false)
const loadingUsage = ref(false)
const loadingCharts = ref(false)
const trendData = ref<TrendDataPoint[]>([])
const modelStats = ref<ModelStat[]>([])
const recentUsage = ref<UsageLog[]>([])
const platformQuotas = ref<PlatformQuotaItem[] | null>(null)

const startDate = ref(formatDateLocalInput(new Date(Date.now() - 6 * 86400000)))
const endDate = ref(formatDateLocalInput(new Date()))
const granularity = ref('day')

const loadStats = async () => {
  loading.value = true
  try {
    await authStore.refreshUser()
    stats.value = await usageAPI.getDashboardStats()
  } catch (error) {
    console.error('Failed to load dashboard stats:', error)
  } finally {
    loading.value = false
  }
}

const loadCharts = async () => {
  loadingCharts.value = true
  try {
    const res = await Promise.all([
      usageAPI.getDashboardTrend({
        start_date: startDate.value,
        end_date: endDate.value,
        granularity: granularity.value as any
      }),
      usageAPI.getDashboardModels({
        start_date: startDate.value,
        end_date: endDate.value
      })
    ])
    trendData.value = res[0].trend || []
    modelStats.value = res[1].models || []
  } catch (error) {
    console.error('Failed to load charts:', error)
  } finally {
    loadingCharts.value = false
  }
}

const loadRecent = async () => {
  loadingUsage.value = true
  try {
    const res = await usageAPI.getByDateRange(startDate.value, endDate.value)
    recentUsage.value = res.items.slice(0, 5)
  } catch (error) {
    console.error('Failed to load recent usage:', error)
  } finally {
    loadingUsage.value = false
  }
}

const loadPlatformQuotas = async () => {
  try {
    const data = await getMyPlatformQuotas()
    platformQuotas.value = data.platform_quotas ?? []
  } catch (error) {
    console.warn('Failed to load platform quotas:', error)
    platformQuotas.value = []
  }
}

const refreshAll = () => {
  loadStats()
  loadCharts()
  loadRecent()
  loadPlatformQuotas()
}

onMounted(() => {
  refreshAll()
})
</script>
