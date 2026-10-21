<template>
  <div class="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-7">
    <div class="border-b border-zinc-100 pb-4 dark:border-zinc-800">
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-500">05</span>
        <h2 class="text-sm font-bold text-zinc-900 dark:text-white">{{ t('dashboard.quickActions') }}</h2>
      </div>
    </div>
    <div class="space-y-2.5 pt-4">
      <button
        @click="router.push('/keys')"
        class="group flex w-full items-center gap-3.5 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 text-left transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:scale-[1.02] hover:shadow-xs active:scale-95 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-900"
      >
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <Icon name="key" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-zinc-900 dark:text-white">{{ t('dashboard.createApiKey') }}</p>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">{{ t('dashboard.generateNewKey') }}</p>
        </div>
        <span class="text-zinc-400 transition-transform duration-200 group-hover:translate-x-1 dark:text-zinc-500">→</span>
      </button>

      <button
        @click="router.push('/usage')"
        class="group flex w-full items-center gap-3.5 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 text-left transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:scale-[1.02] hover:shadow-xs active:scale-95 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-900"
      >
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <Icon name="chart" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-zinc-900 dark:text-white">{{ t('dashboard.viewUsage') }}</p>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">{{ t('dashboard.checkDetailedLogs') }}</p>
        </div>
        <span class="text-zinc-400 transition-transform duration-200 group-hover:translate-x-1 dark:text-zinc-500">→</span>
      </button>

      <button
        v-if="canUseBatchImage"
        @click="router.push('/batch-image')"
        class="group flex w-full items-center gap-3.5 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 text-left transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:scale-[1.02] hover:shadow-xs active:scale-95 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-900"
      >
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <Icon name="sparkles" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-zinc-900 dark:text-white">{{ t('dashboard.batchImageAgent') }}</p>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">{{ t('dashboard.batchImageAgentDesc') }}</p>
        </div>
        <span class="text-zinc-400 transition-transform duration-200 group-hover:translate-x-1 dark:text-zinc-500">→</span>
      </button>

      <button
        @click="router.push('/redeem')"
        class="group flex w-full items-center gap-3.5 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 text-left transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:scale-[1.02] hover:shadow-xs active:scale-95 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-900"
      >
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-2xs transition-transform duration-300 group-hover:scale-110 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <Icon name="gift" size="sm" class="text-zinc-800 dark:text-zinc-200" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-zinc-900 dark:text-white">{{ t('dashboard.redeemCode') }}</p>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">{{ t('dashboard.addBalanceWithCode') }}</p>
        </div>
        <span class="text-zinc-400 transition-transform duration-200 group-hover:translate-x-1 dark:text-zinc-500">→</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'

const router = useRouter()
const { t } = useI18n()
const { canUseBatchImage, refreshBatchImageAccess } = useBatchImageAccess()

onMounted(() => {
  void refreshBatchImageAccess()
})
</script>
