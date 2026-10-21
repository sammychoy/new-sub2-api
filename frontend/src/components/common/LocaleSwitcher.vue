<template>
  <div class="relative" ref="dropdownRef">
    <!-- StudyMind Style Trigger Button (Pill with Globe & Short Name) -->
    <button
      @click="toggleDropdown"
      :disabled="switching"
      class="group inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-100/90 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-xs transition-all hover:bg-zinc-200/80 hover:scale-[1.02] active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-zinc-700"
      :title="currentLocaleItem?.name"
    >
      <Icon name="globe" size="xs" class="text-zinc-700 transition-colors group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-white" />
      <span class="tracking-tight">{{ currentLocaleItem?.shortName || currentLocaleCode.toUpperCase() }}</span>
      <Icon
        name="chevronDown"
        size="xs"
        class="text-zinc-500 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- StudyMind Style Dropdown Card -->
    <transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 z-50 mt-2 min-w-[195px] overflow-hidden rounded-2xl border-2 border-zinc-900 bg-white p-1.5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
      >
        <div class="flex flex-col gap-1">
          <button
            v-for="item in localeOptions"
            :key="item.code"
            :disabled="switching"
            @click="selectLocale(item.code)"
            class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-all duration-150"
            :class="
              item.code === currentLocaleCode
                ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900 font-bold'
                : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80 font-medium'
            "
          >
            <!-- Left tag and full name -->
            <div class="flex items-center gap-2.5">
              <span
                class="font-mono text-[11px] font-extrabold tracking-tight"
                :class="item.code === currentLocaleCode ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-500'"
              >
                {{ item.tag }}
              </span>
              <span class="tracking-tight whitespace-nowrap">{{ item.name }}</span>
            </div>

            <!-- Active Checkmark -->
            <Icon
              v-if="item.code === currentLocaleCode"
              name="check"
              size="xs"
              class="ml-3 shrink-0 stroke-[2.5]"
              :class="item.code === currentLocaleCode ? 'text-white dark:text-zinc-900' : ''"
            />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { setLocale, type LocaleCode } from '@/i18n'

const { locale } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const switching = ref(false)

interface LocaleItem {
  code: LocaleCode
  tag: string
  name: string
  shortName: string
}

const localeOptions: LocaleItem[] = [
  { code: 'zh-TW', tag: 'ZH-TW', name: '繁體中文', shortName: '繁中' },
  { code: 'zh', tag: 'ZH-CN', name: '简体中文', shortName: '简中' },
  { code: 'en', tag: 'EN', name: 'English', shortName: 'EN' }
]

const currentLocaleCode = computed(() => locale.value)
const currentLocaleItem = computed(() => localeOptions.find((l) => l.code === locale.value))

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

async function selectLocale(code: LocaleCode) {
  if (switching.value || code === currentLocaleCode.value) {
    isOpen.value = false
    return
  }
  switching.value = true
  try {
    await setLocale(code)
    isOpen.value = false
  } finally {
    switching.value = false
  }
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
