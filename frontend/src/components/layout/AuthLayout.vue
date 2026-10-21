<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden p-4 bg-[#fafafa] text-zinc-900 transition-colors duration-300 dark:bg-[#09090b] dark:text-zinc-100">
    <div class="absolute right-4 top-4 z-20 flex items-center gap-2">
      <LocaleSwitcher />
      <button
        @click="toggleTheme"
        class="rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm transition-all hover:bg-zinc-100 hover:text-zinc-900 hover:rotate-12 active:scale-90 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        :title="isDark ? 'Light mode' : 'Dark mode'"
      >
        <Icon v-if="isDark" name="sun" size="sm" class="text-amber-500" />
        <Icon v-else name="moon" size="sm" />
      </button>
    </div>

    <!-- Decorative Subtle Grid Pattern (HomeView style) -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        class="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]"
      ></div>
    </div>

    <!-- Content Container -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Logo/Brand -->
      <div class="mb-8 text-center">
        <!-- Custom Logo or Default Logo -->
        <template v-if="settingsLoaded">
          <router-link to="/" class="group inline-block transition-opacity hover:opacity-80">
            <div
              class="mb-4 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
            </div>
            <h1 class="mb-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-white group-hover:opacity-90">
              {{ siteName }}<span class="text-zinc-400 dark:text-zinc-600">.</span>
            </h1>
          </router-link>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ siteSubtitle }}
          </p>
        </template>
      </div>

      <!-- Card Container -->
      <div class="card-glass rounded-2xl p-8 shadow-sm">
        <slot />
      </div>

      <!-- Footer Links -->
      <div class="mt-6 text-center text-sm">
        <slot name="footer" />
      </div>

      <!-- Copyright -->
      <div class="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
        &copy; {{ currentYear }} {{ siteName }}. All rights reserved.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import { useTheme } from '@/composables/useTheme'

const appStore = useAppStore()
const { isDark, toggleTheme } = useTheme()

const siteName = computed(() => appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'Subscription to API Conversion Platform')
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>
