<template>
  <!-- Custom Home Content: Full Page Mode (Admin configured) -->
  <div v-if="homeContent" class="min-h-screen">
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <div v-else v-html="homeContent"></div>
  </div>

  <!-- StudyMind Aesthetic Home Page with First Loading Screen & Rich Animations -->
  <div
    v-else
    class="relative flex min-h-screen flex-col overflow-hidden bg-[#fafafa] text-zinc-900 transition-colors duration-300 dark:bg-[#09090b] dark:text-zinc-100 selection:bg-zinc-500/20 selection:text-zinc-900 dark:selection:text-zinc-100"
  >
    <!-- 0. First Loading Splash Screen Animation -->
    <div
      v-if="showPreloader"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fafafa] transition-all duration-700 ease-out dark:bg-[#09090b]"
      :class="isPreloaderFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'"
    >
      <!-- Center Ambient Glow -->
      <div
        class="animate-ambient-glow absolute h-[350px] w-[350px] rounded-full bg-zinc-400/10 blur-[100px] dark:bg-zinc-400/10"
      ></div>

      <div class="relative z-10 flex flex-col items-center">
        <!-- Logo with Expanding Pulse Rings -->
        <div class="relative flex items-center justify-center">
          <div class="absolute h-16 w-16 animate-ping rounded-2xl bg-zinc-400/20"></div>
          <div
            class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl transition-transform duration-500 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <img
              :src="siteLogo || '/logo.png'"
              alt="Logo"
              class="h-full w-full object-contain"
            />
          </div>
        </div>

        <!-- Brand Name with Animated Dot -->
        <div class="mt-4 font-mono text-lg font-black tracking-tight text-zinc-900 dark:text-white">
          {{ siteName }}<span class="text-zinc-900 dark:text-white animate-pulse">.</span>
        </div>

        <!-- Hairline Progress Bar -->
        <div class="mt-5 h-[3px] w-36 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
          <div
            class="h-full bg-zinc-900 dark:bg-white transition-all duration-700 ease-out"
            :style="{ width: preloaderProgress + '%' }"
          ></div>
        </div>

        <!-- Status Micro-Text -->
        <div class="mt-2.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          {{ preloaderStatus }}
        </div>
      </div>
    </div>

    <!-- Dynamic Ambient Background Glows & Animated Grid Lines -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <!-- Top Center Breathing Orb -->
      <div
        class="animate-ambient-glow absolute -top-40 left-1/2 h-[500px] w-[750px] -translate-x-1/2 rounded-full bg-zinc-400/10 blur-[140px] dark:bg-zinc-500/10"
      ></div>
      <!-- Right Side Floating Glow Orb -->
      <div
        class="animate-float-slow absolute right-[-5%] top-[30%] h-[350px] w-[450px] rounded-full bg-zinc-400/5 blur-[130px] dark:bg-zinc-500/5"
      ></div>
      <!-- Left Side Floating Glow Orb -->
      <div
        class="animate-float-reverse absolute -left-20 top-[65%] h-[400px] w-[500px] rounded-full bg-zinc-400/5 blur-[140px] dark:bg-zinc-500/5"
      ></div>
      <!-- Animated Fine Grid Overlay -->
      <div
        class="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]"
      ></div>
    </div>

    <!-- 1. Sticky Glassmorphic Header (StudyMind Style) -->
    <header
      class="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-[#09090b]/80"
    >
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <!-- Brand Logo & StudyMind Style Name (Sub2API.) -->
        <router-link
          to="/"
          class="group flex items-center gap-2.5 transition-all hover:opacity-80"
        >
          <div
            class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <img
              :src="siteLogo || '/logo.png'"
              alt="Logo"
              class="h-full w-full object-contain"
            />
          </div>
          <span class="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">
            {{ siteName }}<span class="inline-block text-zinc-900 dark:text-white animate-pulse">.</span>
          </span>
        </router-link>

        <!-- Center Nav Numbered Links -->
        <div class="hidden items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-400 md:flex">
          <a
            href="#features"
            class="group flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <span class="font-mono text-[10px] text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white">01</span>
            <span class="transition-transform duration-200 group-hover:-translate-y-0.5">{{ t('home.bento.badge') }}</span>
          </a>
          <a
            href="#models"
            class="group flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <span class="font-mono text-[10px] text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white">02</span>
            <span class="transition-transform duration-200 group-hover:-translate-y-0.5">{{ t('home.providers.badge') }}</span>
          </a>
          <a
            href="#how-it-works"
            class="group flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <span class="font-mono text-[10px] text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white">03</span>
            <span class="transition-transform duration-200 group-hover:-translate-y-0.5">{{ t('home.quickStart.badge') }}</span>
          </a>
          <a
            href="#faq"
            class="group flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <span class="font-mono text-[10px] text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-white">04</span>
            <span class="transition-transform duration-200 group-hover:-translate-y-0.5">{{ t('home.faq.badge') }}</span>
          </a>
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            {{ t('home.docs') }}
          </a>
        </div>

        <!-- Right Action Pill Buttons -->
        <div class="flex items-center gap-2">
          <!-- Language Switcher -->
          <LocaleSwitcher />

          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="rounded-full border border-zinc-200 bg-white p-1.5 text-zinc-600 shadow-sm transition-all hover:bg-zinc-100 hover:text-zinc-900 hover:rotate-12 active:scale-90 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          >
            <Icon v-if="isDark" name="sun" size="xs" />
            <Icon v-else name="moon" size="xs" />
          </button>

          <!-- Login / Dashboard Pill CTA with Shimmer Effect -->
          <router-link
            v-if="isAuthenticated"
            :to="dashboardPath"
            class="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-zinc-900 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:bg-zinc-800 hover:scale-105 active:scale-95 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <span
              class="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-white dark:bg-zinc-300 dark:text-zinc-900"
            >
              {{ userInitial }}
            </span>
            <span>{{ t('home.dashboard') }}</span>
          </router-link>
          <router-link
            v-else
            to="/login"
            class="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-zinc-900 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:bg-zinc-800 hover:scale-105 active:scale-95 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <span>{{ t('home.login') }}</span>
            <Icon name="arrowRight" size="xs" class="transition-transform duration-200 group-hover:translate-x-1" />
          </router-link>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 flex-1">
      <!-- 2. Hero Section (Animated Cascading Stagger + Mouse Tracking Spotlight) -->
      <section
        ref="heroRef"
        @mousemove="handleHeroMouseMove"
        class="relative px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 overflow-hidden"
        :style="{
          '--mouse-x': `${mouseX}%`,
          '--mouse-y': `${mouseY}%`,
        }"
      >
        <!-- Dynamic Mouse-Tracking Spotlight Overlay -->
        <div
          class="pointer-events-none absolute inset-0 transition-opacity duration-700 opacity-60 dark:opacity-40"
          style="background: radial-gradient(700px circle at var(--mouse-x, 50%) var(--mouse-y, 30%), rgba(120, 120, 130, 0.12), transparent 70%);"
        ></div>

        <!-- Flowing Out Expanding Aurora Light Cone from Top -->
        <div class="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[960px] -translate-x-1/2 opacity-75 blur-[100px]">
          <div class="h-full w-full bg-[radial-gradient(ellipse_at_top,rgba(161,161,170,0.25)_0%,rgba(113,113,122,0.1)_45%,transparent_75%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.2)_0%,rgba(212,212,216,0.08)_45%,transparent_75%)] animate-flow-cone"></div>
        </div>

        <!-- Flowing Out Concentric Ripple Waves -->
        <div class="pointer-events-none absolute left-1/2 top-28 -translate-x-1/2 -translate-y-1/2 overflow-visible">
          <div class="animate-ripple-out-1 absolute h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-400/25 dark:border-zinc-400/20"></div>
          <div class="animate-ripple-out-2 absolute h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-400/20 dark:border-zinc-400/15"></div>
          <div class="animate-ripple-out-3 absolute h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-400/15 dark:border-zinc-400/10"></div>
          <div class="animate-ripple-out-4 absolute h-[860px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-400/10 dark:border-zinc-400/5"></div>
        </div>

        <!-- Flowing Out Data Streams along Grid Lines -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div class="animate-stream-flow-1 absolute left-[12%] top-0 h-48 w-[1px] bg-gradient-to-b from-transparent via-zinc-400/50 to-transparent dark:via-zinc-300/40 blur-[0.5px]"></div>
          <div class="animate-stream-flow-2 absolute left-[28%] top-0 h-64 w-[1.5px] bg-gradient-to-b from-transparent via-zinc-400/60 to-transparent dark:via-zinc-200/50 blur-[0.5px]"></div>
          <div class="animate-stream-flow-3 absolute left-[52%] top-0 h-56 w-[1px] bg-gradient-to-b from-transparent via-zinc-400/50 to-transparent dark:via-zinc-300/40 blur-[0.5px]"></div>
          <div class="animate-stream-flow-4 absolute left-[74%] top-0 h-72 w-[1.5px] bg-gradient-to-b from-transparent via-zinc-400/60 to-transparent dark:via-zinc-200/50 blur-[0.5px]"></div>
          <div class="animate-stream-flow-5 absolute left-[90%] top-0 h-44 w-[1px] bg-gradient-to-b from-transparent via-zinc-400/50 to-transparent dark:via-zinc-300/40 blur-[0.5px]"></div>
        </div>

        <div class="relative z-10 mx-auto max-w-6xl">
          <div class="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            <!-- Left Hero Content -->
            <div class="text-center lg:col-span-7 lg:text-left">
              <!-- Top Live Notice Pill Badge with Shimmer & Border Glow -->
              <div class="animate-fade-in-up opacity-0 mb-6 inline-flex items-center">
                <a
                  href="#features"
                  class="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-zinc-200/90 bg-white/90 px-4 py-1.5 text-xs font-medium text-zinc-700 shadow-xs backdrop-blur-xs transition-all duration-300 hover:border-zinc-400 hover:shadow-md hover:scale-[1.03] active:scale-95 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-zinc-700"
                >
                  <!-- Continuous Border / Sweep Shimmer Beam -->
                  <span class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-400/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full animate-beam-sweep"></span>

                  <!-- Pulsing Radar Status Beacon -->
                  <span class="relative flex h-2.5 w-2.5 items-center justify-center">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75"></span>
                    <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] dark:shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                  </span>

                  <span class="relative z-10 font-medium tracking-tight">{{ t('home.badge') }}</span>
                  <span class="relative z-10 text-zinc-400 transition-transform duration-300 group-hover:translate-x-1 dark:text-zinc-500">→</span>
                </a>
              </div>

              <!-- Main Title (StudyMind Style Dot Typography with Luxury Shimmer) -->
              <h1 class="animate-fade-in-up delay-100 opacity-0 text-4xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-5xl lg:text-[52px] lg:leading-[1.15]">
                <span class="inline-block bg-[linear-gradient(110deg,#18181b,35%,#71717a,50%,#18181b,65%)] dark:bg-[linear-gradient(110deg,#ffffff,35%,#a1a1aa,50%,#ffffff,65%)] bg-[length:250%_100%] bg-clip-text text-transparent animate-text-shimmer">
                  {{ t('home.heroTitle1') }}，
                </span>
                <span class="block text-zinc-500 dark:text-zinc-400">
                  {{ t('home.heroTitle2') }}<span class="inline-block text-zinc-900 dark:text-white animate-pulse">.</span>
                </span>
              </h1>

              <!-- Subtitle Description -->
              <p class="animate-fade-in-up delay-200 opacity-0 mx-auto mt-5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base lg:mx-0">
                {{ t('home.heroDescription') }}
              </p>

              <!-- Pill Benefits Tags with Asynchronous Float Physics & Micro-Shine -->
              <div class="animate-fade-in-up delay-300 opacity-0 mt-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                <div
                  v-for="(tag, key) in pillTags"
                  :key="key"
                  :class="[
                    'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-zinc-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-xs backdrop-blur-xs transition-all duration-300 hover:border-zinc-400 hover:-translate-y-1 hover:scale-105 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:border-zinc-600',
                    key === 0 ? 'animate-float-1' : key === 1 ? 'animate-float-2' : key === 2 ? 'animate-float-3' : 'animate-float-4'
                  ]"
                >
                  <!-- Light streak hover sweep -->
                  <div class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-400/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
                  <Icon :name="tag.icon" size="xs" class="relative z-10 text-zinc-900 dark:text-zinc-100 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" />
                  <span class="relative z-10 font-medium tracking-tight">{{ tag.text }}</span>
                </div>
              </div>

              <!-- Dual CTA Pill Buttons with Automatic Shimmer & Scale Animation -->
              <div class="animate-fade-in-up delay-400 opacity-0 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-3.5 lg:justify-start">
                <router-link
                  :to="isAuthenticated ? dashboardPath : '/login'"
                  class="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-zinc-900 bg-zinc-900 px-7 py-3 text-xs font-bold text-white shadow-lg shadow-zinc-900/20 transition-all duration-300 hover:bg-zinc-800 hover:scale-105 hover:shadow-xl hover:shadow-zinc-900/30 active:scale-95 dark:border-white dark:bg-white dark:text-zinc-900 dark:shadow-white/10 dark:hover:bg-zinc-100 dark:hover:shadow-white/20 sm:w-auto"
                >
                  <!-- Flowing Out Light Halo Behind Button -->
                  <div class="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-zinc-500/25 blur-md opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110 dark:bg-white/20"></div>
                  <!-- Automatic Periodic Shimmer Beam + Hover Sweep -->
                  <div class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-btn-shimmer transition-transform duration-1000 group-hover:translate-x-full"></div>
                  <span class="relative z-10">{{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}</span>
                  <span class="relative z-10 transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                </router-link>

                <a
                  v-if="docUrl"
                  :href="docUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-zinc-300 bg-white/90 px-6 py-3 text-xs font-semibold text-zinc-700 shadow-xs backdrop-blur-xs transition-all duration-300 hover:bg-zinc-50 hover:border-zinc-400 hover:scale-105 hover:shadow-md active:scale-95 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:border-zinc-700 sm:w-auto"
                >
                  <div class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-400/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
                  <Icon name="book" size="xs" class="relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6" />
                  <span class="relative z-10">{{ t('home.docs') }}</span>
                </a>
              </div>
            </div>

            <!-- Right Interactive Terminal (with 3D Hover Depth) -->
            <div class="animate-fade-in-up delay-200 opacity-0 flex justify-center lg:col-span-5 lg:justify-end">
              <div class="w-full max-w-lg">
                <div
                  class="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-950 shadow-md transition-all duration-500 hover:-translate-y-1.5 hover:border-zinc-400 hover:shadow-2xl dark:border-zinc-800 dark:hover:border-zinc-700"
                >
                  <!-- Terminal Header -->
                  <div
                    class="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/70 px-4 py-3"
                  >
                    <!-- macOS Window Dots with Hover Pulse -->
                    <div class="flex items-center gap-1.5">
                      <span class="h-2.5 w-2.5 rounded-full bg-zinc-600 transition-transform group-hover:scale-110"></span>
                      <span class="h-2.5 w-2.5 rounded-full bg-zinc-500 transition-transform group-hover:scale-110"></span>
                      <span class="h-2.5 w-2.5 rounded-full bg-zinc-400 transition-transform group-hover:scale-110"></span>
                    </div>

                    <!-- Tabs -->
                    <div class="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                      <button
                        v-for="tab in codeTabs"
                        :key="tab.id"
                        @click="activeCodeTab = tab.id"
                        class="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 active:scale-95"
                        :class="
                          activeCodeTab === tab.id
                            ? 'bg-zinc-800 text-white shadow-sm scale-105'
                            : 'text-zinc-400 hover:text-zinc-200'
                        "
                      >
                        {{ tab.label }}
                      </button>
                    </div>

                    <!-- Copy Button with Feedback -->
                    <button
                      @click="copyActiveCode"
                      class="flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-all hover:text-white active:scale-90"
                      :title="t('home.terminal.copy')"
                    >
                      <Icon v-if="copied" name="check" size="xs" class="text-zinc-200 animate-bounce" />
                      <Icon v-else name="clipboard" size="xs" />
                      <span class="hidden sm:inline">{{ copied ? t('home.terminal.copied') : t('home.terminal.copy') }}</span>
                    </button>
                  </div>

                  <!-- Code Block -->
                  <div class="p-4 font-mono text-xs leading-relaxed text-zinc-300">
                    <pre class="overflow-x-auto"><code v-html="highlightedCode"></code></pre>

                    <!-- Live Typing Stream Simulation Box with Dynamic Glow -->
                    <div
                      class="mt-3.5 rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3 text-xs text-zinc-400 backdrop-blur-xs transition-all duration-300 hover:border-zinc-700"
                    >
                      <div class="flex items-center justify-between text-[11px] font-semibold text-zinc-200">
                        <div class="flex items-center gap-1.5">
                          <span class="relative flex h-1.5 w-1.5">
                            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75"></span>
                            <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-zinc-200"></span>
                          </span>
                          <span>HTTP 200 OK — stream: true</span>
                        </div>
                        <span class="font-mono text-[10px] text-zinc-500">{{ pingLatency }}ms latency</span>
                      </div>
                      <div class="mt-1.5 text-zinc-200 font-mono text-[11px]">
                        <span>data: {"choices":[{"delta":{"content":"{{ streamingText }}"}}]}</span>
                        <span class="inline-block h-3.5 w-1 animate-pulse bg-zinc-200 align-middle ml-0.5"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2.5 StudyMind Segmented Mode Switcher with Smooth Slide -->
      <section class="px-4 pb-12 sm:px-6">
        <div class="mx-auto max-w-4xl">
          <div class="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8">
            <!-- Mode Switcher Buttons with Animated Pill -->
            <div class="flex items-center justify-center">
              <div class="relative inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-950">
                <button
                  @click="activeMode = 'dev'"
                  class="relative z-10 rounded-full px-6 py-2 text-xs font-bold transition-all duration-300 active:scale-95"
                  :class="activeMode === 'dev' ? 'bg-white text-zinc-900 shadow-md dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'"
                >
                  {{ t('home.modes.developer') }}
                </button>
                <button
                  @click="activeMode = 'team'"
                  class="relative z-10 rounded-full px-6 py-2 text-xs font-bold transition-all duration-300 active:scale-95"
                  :class="activeMode === 'team' ? 'bg-white text-zinc-900 shadow-md dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'"
                >
                  {{ t('home.modes.team') }}
                </button>
              </div>
            </div>

            <!-- Animated Mode Description -->
            <div class="mt-6 text-center transition-all duration-300">
              <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-opacity duration-300">
                {{ activeMode === 'dev' ? t('home.modes.developerDesc') : t('home.modes.teamDesc') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Stats Strip (with Hover Elevation & Count Up Effect) -->
      <section class="animate-fade-in-up delay-500 opacity-0 border-y border-zinc-200/80 bg-white/60 py-8 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/30">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div
              v-for="(metric, idx) in metrics"
              :key="idx"
              class="group flex flex-col items-center text-center sm:items-start sm:text-left transition-all duration-300 hover:-translate-y-1"
            >
              <div class="font-mono text-2xl font-black tracking-tight text-zinc-900 transition-colors group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 sm:text-3xl">
                {{ metric.value }}
              </div>
              <div class="mt-0.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {{ metric.title }}
              </div>
              <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
                {{ metric.desc }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. 01 Core Features (StudyMind Bento Grid with Shimmer & Float) -->
      <section id="features" class="border-t border-zinc-200/80 bg-white/50 px-4 py-16 dark:border-zinc-800/80 dark:bg-zinc-950/40 sm:px-6">
        <div class="mx-auto max-w-6xl">
          <div class="text-center">
            <div
              class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <span class="font-bold text-zinc-900 dark:text-zinc-100">01</span>
              <span>{{ t('home.bento.badge') }}</span>
            </div>
            <h2 class="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {{ t('home.bento.title') }}<span class="text-zinc-900 dark:text-white">.</span>
            </h2>
            <p class="mx-auto mt-2 max-w-xl text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
              {{ t('home.bento.subtitle') }}
            </p>
          </div>

          <div class="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
            <!-- Card 1 -->
            <div
              class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-400 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 lg:col-span-7"
            >
              <div class="flex items-center justify-between">
                <div
                  class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <Icon name="server" size="sm" />
                </div>
                <span class="font-mono text-xs font-semibold text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-white">01</span>
              </div>
              <h3 class="mt-5 text-base font-bold text-zinc-900 transition-colors group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                {{ t('home.bento.card1Title') }}
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {{ t('home.bento.card1Desc') }}
              </p>
            </div>

            <!-- Card 2 -->
            <div
              class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-400 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 lg:col-span-5"
            >
              <div class="flex items-center justify-between">
                <div
                  class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <Icon name="shield" size="sm" />
                </div>
                <span class="font-mono text-xs font-semibold text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-white">02</span>
              </div>
              <h3 class="mt-5 text-base font-bold text-zinc-900 transition-colors group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                {{ t('home.bento.card2Title') }}
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {{ t('home.bento.card2Desc') }}
              </p>
            </div>

            <!-- Card 3 -->
            <div
              class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-400 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 lg:col-span-5"
            >
              <div class="flex items-center justify-between">
                <div
                  class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <Icon name="chart" size="sm" />
                </div>
                <span class="font-mono text-xs font-semibold text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-white">03</span>
              </div>
              <h3 class="mt-5 text-base font-bold text-zinc-900 transition-colors group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                {{ t('home.bento.card3Title') }}
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {{ t('home.bento.card3Desc') }}
              </p>
            </div>

            <!-- Card 4 -->
            <div
              class="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-400 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 lg:col-span-7"
            >
              <div class="flex items-center justify-between">
                <div
                  class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <Icon name="swap" size="sm" />
                </div>
                <span class="font-mono text-xs font-semibold text-zinc-400 transition-colors group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-white">04</span>
              </div>
              <h3 class="mt-5 text-base font-bold text-zinc-900 transition-colors group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                {{ t('home.bento.card4Title') }}
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {{ t('home.bento.card4Desc') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. 02 Flagship Model Matrix (with Hover 3D Scale) -->
      <section id="models" class="px-4 py-16 sm:px-6">
        <div class="mx-auto max-w-6xl">
          <div class="text-center">
            <div
              class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <span class="font-bold text-zinc-900 dark:text-zinc-100">02</span>
              <span>{{ t('home.providers.badge') }}</span>
            </div>
            <h2 class="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {{ t('home.providers.title') }}<span class="text-zinc-900 dark:text-white">.</span>
            </h2>
            <p class="mx-auto mt-2 max-w-xl text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
              {{ t('home.providers.description') }}
            </p>
          </div>

          <!-- Providers Grid -->
          <div class="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="provider in providers"
              :key="provider.name"
              class="group relative rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
            >
              <div class="flex items-center gap-3.5">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-xs font-bold text-zinc-800 shadow-xs transition-transform duration-300 group-hover:scale-115 group-hover:rotate-6 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  {{ provider.letter }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold text-zinc-900 transition-colors group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                      {{ provider.name }}
                    </h3>
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300"
                    >
                      <span class="relative flex h-1.5 w-1.5">
                        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75"></span>
                        <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white"></span>
                      </span>
                      {{ t('home.providers.active') }}
                    </span>
                  </div>
                  <p class="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {{ provider.models }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. 03 How it works: 3 Steps (with Step Number Bounce) -->
      <section id="how-it-works" class="border-t border-zinc-200/80 bg-white/50 px-4 py-16 dark:border-zinc-800/80 dark:bg-zinc-950/40 sm:px-6">
        <div class="mx-auto max-w-6xl">
          <div class="text-center">
            <div
              class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <span class="font-bold text-zinc-900 dark:text-zinc-100">03</span>
              <span>{{ t('home.quickStart.badge') }}</span>
            </div>
            <h2 class="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {{ t('home.quickStart.title') }}<span class="text-zinc-900 dark:text-white">.</span>
            </h2>
            <p class="mx-auto mt-2 max-w-xl text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
              {{ t('home.quickStart.subtitle') }}
            </p>
          </div>

          <div class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div
              v-for="(step, i) in steps"
              :key="i"
              class="group relative rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-zinc-400 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
            >
              <div
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 font-mono text-xs font-bold text-white shadow-xs transition-transform duration-300 group-hover:scale-115 group-hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:group-hover:bg-zinc-200 dark:group-hover:text-zinc-900"
              >
                0{{ i + 1 }}
              </div>
              <h3 class="mt-4 text-sm font-bold text-zinc-900 transition-colors group-hover:text-zinc-700 dark:text-white dark:group-hover:text-zinc-300">
                {{ step.title }}
              </h3>
              <p class="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                {{ step.desc }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 7. 04 StudyMind Signature FAQ Accordion with Smooth Transition -->
      <section id="faq" class="px-4 py-16 sm:px-6">
        <div class="mx-auto max-w-4xl">
          <div class="text-center">
            <div
              class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <span class="font-bold text-zinc-900 dark:text-zinc-100">04</span>
              <span>{{ t('home.faq.badge') }}</span>
            </div>
            <h2 class="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              {{ t('home.faq.title') }}<span class="text-zinc-900 dark:text-white">.</span>
            </h2>
            <p class="mx-auto mt-2 max-w-xl text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
              {{ t('home.faq.subtitle') }}
            </p>
          </div>

          <!-- FAQ Accordion List -->
          <div class="mt-10 space-y-3.5">
            <div
              v-for="(faq, idx) in faqItems"
              :key="idx"
              class="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition-all duration-300 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
            >
              <button
                @click="toggleFaq(idx)"
                class="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-zinc-900 transition-colors hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
              >
                <span>{{ faq.q }}</span>
                <span
                  class="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-xs font-mono text-zinc-500 transition-transform duration-300 dark:border-zinc-700 dark:text-zinc-400"
                  :class="openFaqIndex === idx ? 'rotate-45 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 scale-110' : 'hover:scale-105'"
                >
                  +
                </span>
              </button>
              <div
                v-show="openFaqIndex === idx"
                class="border-t border-zinc-100 px-5 pb-5 pt-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/60 dark:text-zinc-400 transition-all duration-300"
              >
                {{ faq.a }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 8. StudyMind Closing CTA Banner with Shimmer & Floating Orbs -->
      <section class="px-4 pb-20 sm:px-6">
        <div
          class="group relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-14 text-center text-white shadow-2xl transition-all duration-500 hover:border-zinc-700 sm:px-12 sm:py-16"
        >
          <!-- Background Moving Shimmer Line -->
          <div class="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-zinc-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150"></div>
          <div class="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-zinc-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150"></div>

          <div class="relative z-10 mx-auto max-w-xl">
            <h2 class="text-2xl font-black tracking-tight sm:text-3xl">
              {{ t('home.cta.title') }}<span class="text-zinc-100">.</span>
            </h2>
            <p class="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
              {{ t('home.cta.description') }}
            </p>
            <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <router-link
                :to="isAuthenticated ? dashboardPath : '/login'"
                class="group/btn relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-7 py-3 text-xs font-bold text-zinc-900 shadow-sm transition-all duration-300 hover:bg-zinc-100 hover:scale-105 active:scale-95"
              >
                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full"></div>
                <span>{{ isAuthenticated ? t('home.goToDashboard') : t('home.cta.button') }}</span>
              </router-link>
              <a
                v-if="docUrl"
                :href="docUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-6 py-3 text-xs font-medium text-zinc-300 transition-all duration-300 hover:bg-zinc-800 hover:text-white hover:scale-105 active:scale-95"
              >
                {{ t('home.cta.secondaryBtn') }}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import { sanitizeUrl } from '@/utils/url'

const { t, tm, locale } = useI18n()

const authStore = useAuthStore()
const appStore = useAppStore()

// First Loading Preloader State
const showPreloader = ref(true)
const isPreloaderFading = ref(false)
const preloaderProgress = ref(15)
const preloaderStatus = ref('Connecting to Edge Gateway...')

function startPreloader() {
  setTimeout(() => {
    preloaderProgress.value = 65
    preloaderStatus.value = 'Synchronizing Models & Routes...'
  }, 180)

  setTimeout(() => {
    preloaderProgress.value = 100
    preloaderStatus.value = 'Cloudflare Edge 200 OK'
  }, 420)

  setTimeout(() => {
    isPreloaderFading.value = true
  }, 620)

  setTimeout(() => {
    showPreloader.value = false
  }, 1250)
}

// Active Mode (Developer vs Team)
const activeMode = ref<'dev' | 'team'>('dev')

// FAQ Accordion
const openFaqIndex = ref<number | null>(0)
function toggleFaq(idx: number) {
  openFaqIndex.value = openFaqIndex.value === idx ? null : idx
}

const faqItems = computed<{ q: string; a: string }[]>(() => {
  const currentLocale = locale.value
  const raw = (tm as (key: string) => unknown)('home.faq.items')
  if (Array.isArray(raw) && raw.length > 0) return raw as { q: string; a: string }[]
  if (currentLocale === 'en') {
    return [
      {
        q: 'How does Sub2API secure my API keys and credentials?',
        a: 'All upstream credentials and API keys are stored in Cloudflare edge encrypted environments and proxied through secure channels without logging sensitive conversation payloads.'
      },
      {
        q: 'Which AI clients and SDKs are supported?',
        a: '100% standard OpenAI and Anthropic format compatibility. Seamlessly plug into NextChat, LobeChat, Cursor, Claude Dev, Chatbox, and official SDKs.'
      },
      {
        q: 'What is Sticky Session persistence?',
        a: 'During multi-turn conversations, the gateway locks your dialogue context to the same upstream session, ensuring context preservation and preventing duplicate charges.'
      },
      {
        q: 'What happens if an upstream account gets rate-limited?',
        a: 'The intelligent account pool automatically initiates sub-millisecond failover to the next healthy account, keeping your service uninterrupted.'
      }
    ]
  }
  return [
    {
      q: 'Sub2API 如何保障我的 API Key 與帳號安全？',
      a: '所有上游憑證與 API Key 均存儲於 Cloudflare 邊緣加密環境中，請求透過安全專線轉發，絕不記錄敏感對話內容。'
    },
    {
      q: '支援哪些主流 AI 客戶端與開發工具？',
      a: '100% 相容 OpenAI 與 Claude 標準格式，支援 NextChat、LobeChat、Cursor、Claude Dev、Chatbox 及各語言 SDK。'
    },
    {
      q: '什麼是 Sticky Session 會話保持？',
      a: '在多輪對話中，系統自動將同一個上下文鎖定在同一個上游會話，避免上下文切換導致的記憶丟失或重複計費。'
    },
    {
      q: '如果某個上游帳號觸發 Rate Limit 限流怎麼辦？',
      a: '智能帳號池具備即時自動故障轉移（Auto-Failover）機制，0 延遲自動無縫切換至健康帳號，保證業務永不中斷。'
    }
  ]
})

// Site settings
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const docUrl = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.doc_url || appStore.docUrl || ''))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')

const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

// Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => isAdmin.value ? '/admin/dashboard' : '/dashboard')
const userInitial = computed(() => {
  const user = authStore.user
  if (!user || !user.email) return ''
  return user.email.charAt(0).toUpperCase()
})

// Pill Tags
const pillTags = computed(() => [
  { icon: 'bolt' as const, text: t('home.pillTags.edge') },
  { icon: 'shield' as const, text: t('home.pillTags.sticky') },
  { icon: 'chart' as const, text: t('home.pillTags.billing') },
  { icon: 'server' as const, text: t('home.pillTags.multi') }
])

// Metrics Strip
const metrics = computed(() => [
  { value: '99.99%', title: t('home.stats.slaTitle'), desc: t('home.stats.slaDesc') },
  { value: '< 30ms', title: t('home.stats.latencyTitle'), desc: t('home.stats.latencyDesc') },
  { value: '10+', title: t('home.stats.modelsTitle'), desc: t('home.stats.modelsDesc') },
  { value: 'Serverless', title: t('home.stats.serverlessTitle'), desc: t('home.stats.serverlessDesc') }
])

// AI Providers
const providers = computed(() => [
  { name: 'Anthropic Claude', models: 'Claude 3.7 Sonnet, 3.5 Haiku', letter: 'C' },
  { name: 'OpenAI GPT', models: 'GPT-4o, o3-mini, o1', letter: 'G' },
  { name: 'DeepSeek', models: 'DeepSeek V3, DeepSeek R1', letter: 'D' },
  { name: 'Google Gemini', models: 'Gemini 2.0 Flash, 2.0 Pro', letter: 'G' },
  { name: 'xAI Grok', models: 'Grok 3, Grok 2 Vision', letter: 'X' },
  { name: 'Antigravity', models: 'Multi-Agent Smart Routing', letter: 'A' }
])

// Steps
const steps = computed(() => [
  { title: t('home.quickStart.step1Title'), desc: t('home.quickStart.step1Desc') },
  { title: t('home.quickStart.step2Title'), desc: t('home.quickStart.step2Desc') },
  { title: t('home.quickStart.step3Title'), desc: t('home.quickStart.step3Desc') }
])

// Code Tabs
type CodeTabId = 'curl' | 'python' | 'node'
const activeCodeTab = ref<CodeTabId>('curl')
const codeTabs = [
  { id: 'curl' as CodeTabId, label: 'cURL' },
  { id: 'python' as CodeTabId, label: 'Python' },
  { id: 'node' as CodeTabId, label: 'Node.js' }
]

const codeSamples: Record<CodeTabId, string> = {
  curl: `curl https://api.example.com/v1/chat/completions \\
  -H "Authorization: Bearer sk-sub2api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-7-sonnet",
    "messages": [{"role": "user", "content": "Hello AI!"}],
    "stream": true
  }'`,
  python: `from openai import OpenAI

client = OpenAI(
    api_key="sk-sub2api-key",
    base_url="https://api.example.com/v1"
)

response = client.chat.completions.create(
    model="claude-3-7-sonnet",
    messages=[{"role": "user", "content": "Hello AI!"}],
    stream=True
)`,
  node: `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-sub2api-key',
  baseURL: 'https://api.example.com/v1'
});

const stream = await openai.chat.completions.create({
  model: 'claude-3-7-sonnet',
  messages: [{ role: 'user', content: 'Hello AI!' }],
  stream: true
});`
}

const highlightedCode = computed(() => {
  const raw = codeSamples[activeCodeTab.value]
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"(.*?)"/g, '<span class="text-zinc-200">"$1"</span>')
    .replace(/'(.*?)'/g, "<span class=\"text-zinc-200\">'$1'</span>")
    .replace(/\b(curl|import|from|const|await|new)\b/g, '<span class="text-white font-semibold">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="text-zinc-300 font-medium">$1</span>')
})

const copied = ref(false)
async function copyActiveCode() {
  try {
    await navigator.clipboard.writeText(codeSamples[activeCodeTab.value])
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // ignore clipboard error
  }
}

// Live Streaming Simulation Text
const phrases = [
  'Sub2API edge gateway routing completed in 12ms. Ready to assist!',
  'Session persistence locked. Context seamlessly synchronized across upstream.',
  'Connected to Claude 3.7 Sonnet via Cloudflare Workers Edge.'
]
const streamingText = ref('')
let phraseIndex = 0
let charIndex = 0
let streamTimer: ReturnType<typeof setTimeout> | null = null

// Live Ping Latency Jitter (11ms ~ 16ms)
const pingLatency = ref(12)
let pingTimer: ReturnType<typeof setInterval> | null = null

function tickStream() {
  const currentPhrase = phrases[phraseIndex]
  if (charIndex < currentPhrase.length) {
    streamingText.value += currentPhrase.charAt(charIndex)
    charIndex++
    streamTimer = setTimeout(tickStream, 38)
  } else {
    streamTimer = setTimeout(() => {
      streamingText.value = ''
      charIndex = 0
      phraseIndex = (phraseIndex + 1) % phrases.length
      tickStream()
    }, 2800)
  }
}

// Hero Interactive Spotlight Mouse Tracking
const heroRef = ref<HTMLElement | null>(null)
const mouseX = ref(50)
const mouseY = ref(30)

function handleHeroMouseMove(e: MouseEvent) {
  if (!heroRef.value) return
  const rect = heroRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  mouseX.value = Math.round(x)
  mouseY.value = Math.round(y)
}

onMounted(() => {
  startPreloader()
  initTheme()
  authStore.checkAuth()
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
  tickStream()
  pingTimer = setInterval(() => {
    pingLatency.value = Math.floor(Math.random() * 6) + 11
  }, 2000)
})

onUnmounted(() => {
  if (streamTimer) clearTimeout(streamTimer)
  if (pingTimer) clearInterval(pingTimer)
})
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ambientGlow {
  0%, 100% {
    opacity: 0.12;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 0.24;
    transform: translateX(-50%) scale(1.12);
  }
}

@keyframes floatSlow {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

@keyframes floatReverse {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(20px) scale(1.05);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-ambient-glow {
  animation: ambientGlow 8s ease-in-out infinite;
}

.animate-float-slow {
  animation: floatSlow 12s ease-in-out infinite;
}

.animate-float-reverse {
  animation: floatReverse 14s ease-in-out infinite;
}

@keyframes textShimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes btnShimmer {
  0%, 20% {
    transform: translateX(-100%);
  }
  50%, 100% {
    transform: translateX(200%);
  }
}

@keyframes beamSweep {
  0%, 25% {
    transform: translateX(-100%);
  }
  60%, 100% {
    transform: translateX(200%);
  }
}

@keyframes float1 {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes float2 {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes float3 {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes float4 {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5.5px);
  }
}

@keyframes pulseSubtle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(0.98);
  }
}

.animate-text-shimmer {
  animation: textShimmer 7s ease-in-out infinite;
}

.animate-btn-shimmer {
  animation: btnShimmer 3.8s ease-in-out infinite;
}

.animate-beam-sweep {
  animation: beamSweep 4.5s ease-in-out infinite;
}

.animate-float-1 {
  animation: float1 4.2s ease-in-out infinite;
}

.animate-float-2 {
  animation: float2 4.8s ease-in-out infinite 0.6s;
}

.animate-float-3 {
  animation: float3 5.4s ease-in-out infinite 1.2s;
}

.animate-float-4 {
  animation: float4 4.5s ease-in-out infinite 1.8s;
}

.animate-pulse-subtle {
  animation: pulseSubtle 3s ease-in-out infinite;
}

@keyframes rippleOut {
  0% {
    transform: translate(-50%, -50%) scale(0.65);
    opacity: 0.65;
  }
  60% {
    opacity: 0.3;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
}

@keyframes streamFlow {
  0% {
    transform: translateY(-120%);
    opacity: 0;
  }
  15% {
    opacity: 0.85;
  }
  85% {
    opacity: 0.85;
  }
  100% {
    transform: translateY(110vh);
    opacity: 0;
  }
}

@keyframes flowCone {
  0%, 100% {
    transform: translateX(-50%) scale(1);
    opacity: 0.55;
  }
  50% {
    transform: translateX(-50%) scale(1.12, 1.06);
    opacity: 0.85;
  }
}

.animate-ripple-out-1 {
  animation: rippleOut 6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
}

.animate-ripple-out-2 {
  animation: rippleOut 6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 1.5s;
}

.animate-ripple-out-3 {
  animation: rippleOut 6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 3s;
}

.animate-ripple-out-4 {
  animation: rippleOut 6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 4.5s;
}

.animate-stream-flow-1 {
  animation: streamFlow 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-stream-flow-2 {
  animation: streamFlow 6.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 1.2s;
}

.animate-stream-flow-3 {
  animation: streamFlow 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 2.4s;
}

.animate-stream-flow-4 {
  animation: streamFlow 7.2s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.6s;
}

.animate-stream-flow-5 {
  animation: streamFlow 5.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 3.1s;
}

.animate-flow-cone {
  animation: flowCone 9s ease-in-out infinite;
}

.delay-100 {
  animation-delay: 100ms;
}

.delay-200 {
  animation-delay: 200ms;
}

.delay-300 {
  animation-delay: 300ms;
}

.delay-400 {
  animation-delay: 400ms;
}

.delay-500 {
  animation-delay: 500ms;
}
</style>
