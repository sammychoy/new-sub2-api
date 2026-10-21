<template>
  <div
    class="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900/50"
  >
    <div class="flex items-start gap-4">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
        <Icon name="link" size="md" />
      </div>
      <div class="flex-1">
        <h4 class="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">{{ oauthTitle }}</h4>

        <!-- Auth Method Selection -->
        <div v-if="showMethodSelection" class="mb-4">
          <label class="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {{ methodLabel }}
          </label>
          <div class="flex flex-wrap gap-3">
            <label v-if="showManualOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="manual"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t('admin.accounts.oauth.manualAuth')
              }}</span>
            </label>
            <label v-if="showCookieOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="cookie"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t('admin.accounts.oauth.cookieAutoAuth')
              }}</span>
            </label>
            <label v-if="showRefreshTokenOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="refresh_token"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t(getOAuthKey('refreshTokenAuth'))
              }}</span>
            </label>
            <label v-if="showSessionTokenOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="session_token"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t(getOAuthKey('sessionTokenAuth'))
              }}</span>
            </label>
            <label v-if="showAccessTokenOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="access_token"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t('admin.accounts.oauth.openai.accessTokenAuth')
              }}</span>
            </label>
            <label v-if="showMobileRefreshTokenOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="mobile_refresh_token"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t('admin.accounts.oauth.openai.mobileRefreshTokenAuth')
              }}</span>
            </label>
            <label v-if="showCodexSessionImportOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="codex_session"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t('admin.accounts.oauth.openai.codexSessionAuth')
              }}</span>
            </label>
            <label v-if="showCodexPatOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="codex_pat"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t('admin.accounts.oauth.openai.codexPatAuth')
              }}</span>
            </label>
            <label v-if="showSsoOption" class="flex cursor-pointer items-center gap-2">
              <input
                v-model="inputMethod"
                type="radio"
                value="sso_cookie"
                class="text-zinc-900 focus:ring-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-200"
              />
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{{
                t(getOAuthKey('ssoCookieAuth'))
              }}</span>
            </label>
          </div>
        </div>

        <!-- Refresh Token Input (OpenAI / Antigravity / Mobile RT) -->
        <div v-if="inputMethod === 'refresh_token' || inputMethod === 'mobile_refresh_token'" class="space-y-4">
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {{ t(getOAuthKey('refreshTokenDesc')) }}
            </p>

            <!-- Refresh Token Input -->
            <div class="mb-4">
              <label
                class="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <Icon name="key" size="sm" class="text-zinc-500" />
                Refresh Token
                <span
                  v-if="parsedRefreshTokenCount > 1"
                  class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-white dark:bg-zinc-200 dark:text-zinc-900"
                >
                  {{ t('admin.accounts.oauth.keysCount', { count: parsedRefreshTokenCount }) }}
                </span>
              </label>
              <textarea
                v-model="refreshTokenInput"
                rows="3"
                class="input w-full resize-y font-mono text-sm"
                :placeholder="t(getOAuthKey('refreshTokenPlaceholder'))"
              ></textarea>
              <p
                v-if="parsedRefreshTokenCount > 1"
                class="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                {{ t('admin.accounts.oauth.batchCreateAccounts', { count: parsedRefreshTokenCount }) }}
              </p>
            </div>

            <!-- Error Message -->
            <div
              v-if="error"
              class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <!-- Validate Button -->
            <button
              type="button"
              class="btn btn-primary w-full"
              :disabled="loading || !refreshTokenInput.trim()"
              @click="handleValidateRefreshToken"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <Icon v-else name="sparkles" size="sm" class="mr-2" />
              {{
                loading
                  ? t(getOAuthKey('validating'))
                  : t(getOAuthKey('validateAndCreate'))
              }}
            </button>
          </div>
        </div>

        <!-- Session Token Input (ChatGPT Web Session) -->
        <div v-if="inputMethod === 'session_token'" class="space-y-4">
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {{ t(getOAuthKey('sessionTokenDesc')) }}
            </p>

            <div class="mb-4">
              <label
                class="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <Icon name="key" size="sm" class="text-zinc-500" />
                Session Token / Cookie
                <span
                  v-if="parsedSessionTokenCount > 1"
                  class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-white dark:bg-zinc-200 dark:text-zinc-900"
                >
                  {{ t('admin.accounts.oauth.keysCount', { count: parsedSessionTokenCount }) }}
                </span>
              </label>
              <textarea
                v-model="sessionTokenInput"
                rows="4"
                class="input w-full resize-y font-mono text-sm"
                :placeholder="t(getOAuthKey('sessionTokenPlaceholder'))"
                spellcheck="false"
              ></textarea>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ t(getOAuthKey('sessionTokenHint')) }}
              </p>
            </div>

            <!-- Error Message -->
            <div
              v-if="error"
              class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <button
              type="button"
              class="btn btn-primary w-full"
              :disabled="loading || !sessionTokenInput.trim()"
              @click="handleValidateSessionToken"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <Icon v-else name="sparkles" size="sm" class="mr-2" />
              {{
                loading
                  ? t(getOAuthKey('validating'))
                  : t(getOAuthKey('sessionTokenValidateAndCreate'))
              }}
            </button>
          </div>
        </div>

        <!-- Access Token / Smart Multi-format Input -->
        <div v-if="inputMethod === 'access_token'" class="space-y-4">
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {{ t('admin.accounts.oauth.openai.accessTokenDesc') }}
            </p>

            <div class="mb-4">
              <label
                class="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <Icon name="key" size="sm" class="text-zinc-500" />
                Access Token / Batch Input
                <span
                  v-if="parsedAccessTokenCount > 1"
                  class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-white dark:bg-zinc-200 dark:text-zinc-900"
                >
                  {{ t('admin.accounts.oauth.keysCount', { count: parsedAccessTokenCount }) }}
                </span>
              </label>
              <textarea
                v-model="accessTokenInput"
                rows="5"
                class="input w-full resize-y font-mono text-sm"
                :placeholder="t('admin.accounts.oauth.openai.accessTokenPlaceholder')"
                spellcheck="false"
              ></textarea>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ t('admin.accounts.oauth.openai.accessTokenHint') }}
              </p>
            </div>

            <!-- Decoded JWT Preview (single token) -->
            <div
              v-if="singleJwtInfo"
              class="mb-4 space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300"
            >
              <div v-if="singleJwtInfo.email" class="flex justify-between">
                <span class="text-zinc-500 dark:text-zinc-400">Email:</span>
                <span class="font-mono font-medium text-zinc-900 dark:text-zinc-100">{{ singleJwtInfo.email }}</span>
              </div>
              <div v-if="singleJwtInfo.expires_at" class="flex justify-between">
                <span class="text-zinc-500 dark:text-zinc-400">Expires:</span>
                <span class="font-mono font-medium text-zinc-900 dark:text-zinc-100">{{ new Date(singleJwtInfo.expires_at).toLocaleString() }}</span>
              </div>
              <div v-if="singleJwtInfo.plan_type" class="flex justify-between">
                <span class="text-zinc-500 dark:text-zinc-400">Plan:</span>
                <span class="font-mono font-medium uppercase text-zinc-900 dark:text-zinc-100">{{ singleJwtInfo.plan_type }}</span>
              </div>
            </div>

            <!-- Error Message -->
            <div
              v-if="error"
              class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <button
              type="button"
              class="btn btn-primary w-full"
              :disabled="loading || !accessTokenInput.trim()"
              @click="handleImportAccessToken"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <Icon v-else name="sparkles" size="sm" class="mr-2" />
              {{
                loading
                  ? t(getOAuthKey('validating'))
                  : t('admin.accounts.oauth.openai.accessTokenImportAndCreate')
              }}
            </button>
          </div>
        </div>


        <!-- SSO Cookie Input (Grok Web -> Grok Build) -->
        <div v-if="inputMethod === 'sso_cookie'" class="space-y-4">
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {{ t(getOAuthKey('ssoCookieDesc')) }}
            </p>

            <div class="mb-4">
              <label
                class="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <Icon name="key" size="sm" class="text-zinc-500" />
                {{ t(getOAuthKey('ssoCookieLabel')) }}
                <span
                  v-if="parsedSSOCount > 1"
                  class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-white dark:bg-zinc-200 dark:text-zinc-900"
                >
                  {{ t('admin.accounts.oauth.keysCount', { count: parsedSSOCount }) }}
                </span>
              </label>
              <textarea
                v-model="ssoCookieInput"
                rows="5"
                class="input w-full resize-y font-mono text-sm"
                :placeholder="t(getOAuthKey('ssoCookiePlaceholder'))"
                spellcheck="false"
              ></textarea>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ t(getOAuthKey('ssoCookieHint')) }}
              </p>
            </div>

            <div
              v-if="error"
              class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <button
              type="button"
              class="btn btn-primary w-full"
              :disabled="loading || !ssoCookieInput.trim()"
              @click="handleImportSSO"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <Icon v-else name="sparkles" size="sm" class="mr-2" />
              {{ loading ? t(getOAuthKey('convertingSSO')) : t(getOAuthKey('convertSSOAndCreate')) }}
            </button>
          </div>
        </div>

        <!-- Codex auth.json / session credential batch import -->
        <div v-if="inputMethod === 'codex_session'" class="space-y-4">
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {{ t('admin.accounts.oauth.openai.codexSessionDesc') }}
            </p>

            <div class="mb-4">
              <label
                class="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <Icon name="key" size="sm" class="text-zinc-500" />
                {{ t('admin.accounts.oauth.openai.codexSessionInputLabel') }}
                <span
                  v-if="parsedCodexSessionCount > 1"
                  class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-white dark:bg-zinc-200 dark:text-zinc-900"
                >
                  {{ t('admin.accounts.oauth.keysCount', { count: parsedCodexSessionCount }) }}
                </span>
              </label>
              <textarea
                v-model="codexSessionInput"
                rows="8"
                class="input w-full resize-y font-mono text-sm"
                :placeholder="t('admin.accounts.oauth.openai.codexSessionPlaceholder')"
                spellcheck="false"
              ></textarea>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ t('admin.accounts.oauth.openai.codexSessionHint') }}
              </p>
            </div>

            <div
              v-if="error"
              class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <button
              type="button"
              class="btn btn-primary w-full"
              :disabled="loading || !codexSessionInput.trim()"
              @click="handleImportCodexSession"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <Icon v-else name="sparkles" size="sm" class="mr-2" />
              {{
                loading
                  ? t('admin.accounts.oauth.openai.validating')
                  : t('admin.accounts.oauth.openai.codexSessionImportAndCreate')
              }}
            </button>
          </div>
        </div>

        <!-- Codex Personal Access Token -->
        <div v-if="inputMethod === 'codex_pat'" class="space-y-4">
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {{ t('admin.accounts.oauth.openai.codexPatDesc') }}
            </p>

            <div class="mb-4">
              <label
                class="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <Icon name="key" size="sm" class="text-zinc-500" />
                {{ t('admin.accounts.oauth.openai.codexPatInputLabel') }}
              </label>
              <textarea
                v-model="codexPATInput"
                rows="3"
                class="input w-full resize-y font-mono text-sm"
                :placeholder="t('admin.accounts.oauth.openai.codexPatPlaceholder')"
                spellcheck="false"
              ></textarea>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ t('admin.accounts.oauth.openai.codexPatHint') }}
              </p>
            </div>

            <div
              v-if="error"
              class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <button
              type="button"
              class="btn btn-primary w-full"
              :disabled="loading || !codexPATInput.trim()"
              @click="handleImportCodexPAT"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <Icon v-else name="sparkles" size="sm" class="mr-2" />
              {{
                loading
                  ? t('admin.accounts.oauth.openai.validating')
                  : t('admin.accounts.oauth.openai.codexPatImportAndCreate')
              }}
            </button>
          </div>
        </div>

        <!-- Cookie Auto-Auth Form -->
        <div v-if="inputMethod === 'cookie'" class="space-y-4">
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p class="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {{ t('admin.accounts.oauth.cookieAutoAuthDesc') }}
            </p>

            <!-- sessionKey Input -->
            <div class="mb-4">
              <label
                class="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <Icon name="key" size="sm" class="text-zinc-500" />
                {{ t('admin.accounts.oauth.sessionKey') }}
                <span
                  v-if="parsedKeyCount > 1 && allowMultiple"
                  class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-white dark:bg-zinc-200 dark:text-zinc-900"
                >
                  {{ t('admin.accounts.oauth.keysCount', { count: parsedKeyCount }) }}
                </span>
                <button
                  v-if="showHelp"
                  type="button"
                  class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  @click="showHelpDialog = !showHelpDialog"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                </button>
              </label>
              <textarea
                v-model="sessionKeyInput"
                rows="3"
                class="input w-full resize-y font-mono text-sm"
                :placeholder="
                  allowMultiple
                    ? t('admin.accounts.oauth.sessionKeyPlaceholder')
                    : t('admin.accounts.oauth.sessionKeyPlaceholderSingle')
                "
              ></textarea>
              <p
                v-if="parsedKeyCount > 1 && allowMultiple"
                class="mt-1 text-xs text-zinc-500 dark:text-zinc-400"
              >
                {{ t('admin.accounts.oauth.batchCreateAccounts', { count: parsedKeyCount }) }}
              </p>
            </div>

            <!-- Help Section -->
            <div
              v-if="showHelpDialog && showHelp"
              class="mb-4 rounded-lg border border-zinc-200 bg-zinc-100/80 p-3.5 dark:border-zinc-700 dark:bg-zinc-800/60"
            >
              <h5 class="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
                {{ t('admin.accounts.oauth.howToGetSessionKey') }}
              </h5>
              <ol
                class="list-inside list-decimal space-y-1 text-xs text-zinc-600 dark:text-zinc-400"
              >
                <li>{{ t('admin.accounts.oauth.step1') }}</li>
                <li>{{ t('admin.accounts.oauth.step2') }}</li>
                <li>{{ t('admin.accounts.oauth.step3') }}</li>
                <li>{{ t('admin.accounts.oauth.step4') }}</li>
                <li>{{ t('admin.accounts.oauth.step5') }}</li>
                <li>{{ t('admin.accounts.oauth.step6') }}</li>
              </ol>
              <p
                class="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
                v-text="t('admin.accounts.oauth.sessionKeyFormat')"
              ></p>
            </div>

            <!-- Error Message -->
            <div
              v-if="error"
              class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <!-- Auth Button -->
            <button
              type="button"
              class="btn btn-primary w-full"
              :disabled="loading || !sessionKeyInput.trim()"
              @click="handleCookieAuth"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <Icon v-else name="sparkles" size="sm" class="mr-2" />
              {{
                loading
                  ? t('admin.accounts.oauth.authorizing')
                  : t('admin.accounts.oauth.startAutoAuth')
              }}
            </button>
          </div>
        </div>

        <!-- Manual Authorization Flow -->
        <div v-if="inputMethod === 'manual'" class="space-y-4">
          <p class="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
            {{ oauthFollowSteps }}
          </p>

          <!-- Step 1: Generate Auth URL -->
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                1
              </div>
              <div class="flex-1">
                <p class="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
                  {{ oauthStep1GenerateUrl }}
                </p>
                <div v-if="showProjectId && platform === 'gemini'" class="mb-3">
                  <label class="input-label flex items-center gap-2">
                    {{ t('admin.accounts.oauth.gemini.projectIdLabel') }}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-xs font-normal text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                      {{ t('admin.accounts.oauth.gemini.howToGetProjectId') }}
                    </a>
                  </label>
                  <input
                    v-model="projectId"
                    type="text"
                    class="input w-full font-mono text-sm"
                    :placeholder="t('admin.accounts.oauth.gemini.projectIdPlaceholder')"
                  />
                  <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {{ t('admin.accounts.oauth.gemini.projectIdHint') }}
                  </p>
                </div>
                <button
                  v-if="!authUrl"
                  type="button"
                  :disabled="loading"
                  class="btn btn-primary text-sm"
                  @click="handleGenerateUrl"
                >
                  <svg
                    v-if="loading"
                    class="-ml-1 mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <Icon v-else name="link" size="sm" class="mr-2" />
                  {{ loading ? t('admin.accounts.oauth.generating') : oauthGenerateAuthUrl }}
                </button>
                <div v-else class="space-y-3">
                  <div class="flex items-center gap-2">
                    <input
                      :value="authUrl"
                      readonly
                      type="text"
                      class="input flex-1 bg-zinc-50 font-mono text-xs dark:bg-zinc-800"
                    />
                    <button
                      type="button"
                      class="btn btn-secondary p-2"
                      title="Copy URL"
                      @click="handleCopyUrl"
                    >
                      <svg
                        v-if="!copied"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                        />
                      </svg>
                      <Icon
                        v-else
                        name="check"
                        size="sm"
                        class="text-zinc-900 dark:text-zinc-100"
                        :stroke-width="2"
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    class="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    @click="handleRegenerate"
                  >
                    <Icon name="refresh" size="xs" class="mr-1 inline" />
                    {{ t('admin.accounts.oauth.regenerate') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Open URL and authorize -->
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                2
              </div>
              <div class="flex-1">
                <p class="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
                  {{ oauthStep2OpenUrl }}
                </p>
                <p class="text-sm text-zinc-600 dark:text-zinc-400">
                  {{ oauthOpenUrlDesc }}
                </p>
                <!-- Local callback / Platform callback notice -->
                <div
                  v-if="showLocalCallbackNotice"
                  class="mt-2 rounded-lg border border-zinc-200 bg-zinc-100/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/60"
                >
                  <p
                    class="text-xs text-zinc-700 dark:text-zinc-300"
                    v-text="oauthImportantNotice"
                  ></p>
                </div>
                <!-- Proxy Warning (for non-OpenAI) -->
                <div
                  v-else-if="showProxyWarning"
                  class="mt-2 rounded-lg border border-zinc-200 bg-zinc-100/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/60"
                >
                  <p
                    class="text-xs text-zinc-700 dark:text-zinc-300"
                    v-text="t('admin.accounts.oauth.proxyWarning')"
                  ></p>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Enter authorization code -->
          <div
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                3
              </div>
              <div class="flex-1">
                <p class="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
                  {{ oauthStep3EnterCode }}
                </p>
                <p
                  class="mb-3 text-sm text-zinc-600 dark:text-zinc-400"
                  v-text="oauthAuthCodeDesc"
                ></p>
                <div>
                  <label class="input-label">
                    <Icon name="key" size="sm" class="mr-1 inline text-zinc-500" />
                    {{ oauthAuthCode }}
                  </label>
                  <textarea
                    v-model="authCodeInput"
                    rows="3"
                    class="input w-full resize-none font-mono text-sm"
                    :placeholder="oauthAuthCodePlaceholder"
                  ></textarea>
                  <p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Icon name="infoCircle" size="xs" class="mr-1 inline" />
                    {{ oauthAuthCodeHint }}
                  </p>

                  <!-- Gemini-specific state parameter warning -->
                  <div
                    v-if="platform === 'gemini'"
                    class="mt-3 rounded-lg border border-zinc-300 bg-zinc-100/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/60"
                  >
                    <div class="flex items-start gap-2">
                      <Icon
                        name="exclamationTriangle"
                        size="md"
                        class="shrink-0 text-zinc-600 dark:text-zinc-400"
                        :stroke-width="2"
                      />
                      <div class="text-sm text-zinc-800 dark:text-zinc-200">
                        <p class="font-semibold">{{ $t('admin.accounts.oauth.gemini.stateWarningTitle') }}</p>
                        <p class="mt-1">{{ $t('admin.accounts.oauth.gemini.stateWarningDesc') }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Error Message -->
                <div
                  v-if="error"
                  class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
                >
                  <p class="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
                    {{ error }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@/composables/useClipboard'
import Icon from '@/components/icons/Icon.vue'
import type { AddMethod, AuthInputMethod } from '@/composables/useAccountOAuth'
import { parseOpenAIJwtPayload } from '@/composables/useOpenAIOAuth'
import type { AccountPlatform } from '@/types'

interface Props {
  addMethod: AddMethod
  authUrl?: string
  sessionId?: string
  loading?: boolean
  error?: string
  showHelp?: boolean
  showProxyWarning?: boolean
  allowMultiple?: boolean
  methodLabel?: string
  showCookieOption?: boolean // Whether to show cookie auto-auth option
  showRefreshTokenOption?: boolean // Whether to show refresh token input option (OpenAI only)
  showMobileRefreshTokenOption?: boolean // Whether to show mobile refresh token option (OpenAI only)
  showSessionTokenOption?: boolean
  showAccessTokenOption?: boolean
  showCodexSessionImportOption?: boolean
  showCodexPatOption?: boolean
  showSsoOption?: boolean
  showManualOption?: boolean
  initialInputMethod?: AuthInputMethod
  platform?: AccountPlatform // Platform type for different UI/text
  showProjectId?: boolean // New prop to control project ID visibility
}

const props = withDefaults(defineProps<Props>(), {
  authUrl: '',
  sessionId: '',
  loading: false,
  error: '',
  showHelp: true,
  showProxyWarning: true,
  allowMultiple: false,
  methodLabel: 'Authorization Method',
  showCookieOption: true,
  showRefreshTokenOption: false,
  showMobileRefreshTokenOption: false,
  showSessionTokenOption: false,
  showAccessTokenOption: false,
  showCodexSessionImportOption: false,
  showCodexPatOption: false,
  showSsoOption: false,
  showManualOption: true,
  initialInputMethod: 'manual',
  platform: 'anthropic',
  showProjectId: true
})

const emit = defineEmits<{
  'generate-url': []
  'exchange-code': [code: string]
  'cookie-auth': [sessionKey: string]
  'validate-refresh-token': [refreshToken: string]
  'validate-mobile-refresh-token': [refreshToken: string]
  'validate-session-token': [sessionToken: string]
  'import-access-token': [accessToken: string]
  'import-codex-session': [content: string]
  'import-codex-pat': [accessToken: string]
  'import-sso': [content: string]
  'update:inputMethod': [method: AuthInputMethod]
}>()

const { t } = useI18n()

const showLocalCallbackNotice = computed(() => props.platform === 'openai' || props.platform === 'grok')

// Get translation key based on platform
const getOAuthKey = (key: string) => {
  if (props.platform === 'openai') return `admin.accounts.oauth.openai.${key}`
  if (props.platform === 'gemini') return `admin.accounts.oauth.gemini.${key}`
  if (props.platform === 'antigravity') return `admin.accounts.oauth.antigravity.${key}`
  if (props.platform === 'grok') return `admin.accounts.oauth.grok.${key}`
  return `admin.accounts.oauth.${key}`
}

// Computed translations for current platform
const oauthTitle = computed(() => t(getOAuthKey('title')))
const oauthFollowSteps = computed(() => t(getOAuthKey('followSteps')))
const oauthStep1GenerateUrl = computed(() => t(getOAuthKey('step1GenerateUrl')))
const oauthGenerateAuthUrl = computed(() => t(getOAuthKey('generateAuthUrl')))
const oauthStep2OpenUrl = computed(() => t(getOAuthKey('step2OpenUrl')))
const oauthOpenUrlDesc = computed(() => t(getOAuthKey('openUrlDesc')))
const oauthStep3EnterCode = computed(() => t(getOAuthKey('step3EnterCode')))
const oauthAuthCodeDesc = computed(() => t(getOAuthKey('authCodeDesc')))
const oauthAuthCode = computed(() => t(getOAuthKey('authCode')))
const oauthAuthCodePlaceholder = computed(() => t(getOAuthKey('authCodePlaceholder')))
const oauthAuthCodeHint = computed(() => t(getOAuthKey('authCodeHint')))
const oauthImportantNotice = computed(() => {
  if (props.platform === 'openai') return t('admin.accounts.oauth.openai.importantNotice')
  if (props.platform === 'antigravity') return t('admin.accounts.oauth.antigravity.importantNotice')
  if (props.platform === 'grok') return t('admin.accounts.oauth.grok.importantNotice')
  return ''
})

// Local state
const inputMethod = ref<AuthInputMethod>(props.initialInputMethod)
const authCodeInput = ref('')
const sessionKeyInput = ref('')
const refreshTokenInput = ref('')
const sessionTokenInput = ref('')
const accessTokenInput = ref('')
const codexSessionInput = ref('')
const codexPATInput = ref('')
const ssoCookieInput = ref('')
const showHelpDialog = ref(false)
const oauthState = ref('')
const projectId = ref('')

// Computed: show method selection only when there is something to choose.
const methodOptionCount = computed(() => [
  props.showManualOption,
  props.showCookieOption,
  props.showRefreshTokenOption,
  props.showMobileRefreshTokenOption,
  props.showSessionTokenOption,
  props.showAccessTokenOption,
  props.showCodexSessionImportOption,
  props.showCodexPatOption,
  props.showSsoOption
].filter(Boolean).length)
const showMethodSelection = computed(() => methodOptionCount.value > 1)

// Live JWT decoding preview for single Access Token input
const singleJwtInfo = computed(() => {
  const trimmed = accessTokenInput.value.trim()
  if (!trimmed || trimmed.includes('\n')) return null
  return parseOpenAIJwtPayload(trimmed)
})

// Clipboard
const { copied, copyToClipboard } = useClipboard()

// Computed
const parsedKeyCount = computed(() => {
  return sessionKeyInput.value
    .split('\n')
    .map((k) => k.trim())
    .filter((k) => k).length
})

// Computed: count of refresh tokens entered
const parsedRefreshTokenCount = computed(() => {
  return refreshTokenInput.value
    .split('\n')
    .map((rt) => rt.trim())
    .filter((rt) => rt).length
})

const parsedSessionTokenCount = computed(() => {
  return sessionTokenInput.value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item).length
})

const parsedAccessTokenCount = computed(() => {
  return accessTokenInput.value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item).length
})

const parsedCodexSessionCount = computed(() => {
  const trimmed = codexSessionInput.value.trim()
  if (!trimmed) return 0
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 1
  return trimmed
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item).length
})

const parsedSSOCount = computed(() => {
  return ssoCookieInput.value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item).length
})

// Watchers
watch(() => props.initialInputMethod, (newVal) => {
  inputMethod.value = newVal
})

watch(inputMethod, (newVal) => {
  emit('update:inputMethod', newVal)
})

// Auto-extract code from callback URL (OpenAI/Gemini/Antigravity/Grok)
// e.g., https://platform.openai.com/auth/callback?code=xxx...&state=...
watch(authCodeInput, (newVal) => {
  if (props.platform !== 'openai' && props.platform !== 'gemini' && props.platform !== 'antigravity' && props.platform !== 'grok') return

  const trimmed = newVal.trim()
  // Check if it looks like a URL with code parameter
  if (trimmed.includes('code=')) {
    try {
      // Try to parse as URL
      const url = trimmed.includes('?') ? new URL(trimmed) : new URL(`http://localhost/callback?${trimmed.replace(/^\?/, '')}`)
      const code = url.searchParams.get('code')
      const stateParam = url.searchParams.get('state')
      if ((props.platform === 'openai' || props.platform === 'gemini' || props.platform === 'antigravity' || props.platform === 'grok') && stateParam) {
        oauthState.value = stateParam
      }
      if (code && code !== trimmed) {
        // Replace the input with just the code
        authCodeInput.value = code
      }
    } catch {
      // If URL parsing fails, try regex extraction
      const match = trimmed.match(/[?&]code=([^&]+)/)
      const stateMatch = trimmed.match(/[?&]state=([^&]+)/)
      if ((props.platform === 'openai' || props.platform === 'gemini' || props.platform === 'antigravity' || props.platform === 'grok') && stateMatch && stateMatch[1]) {
        oauthState.value = stateMatch[1]
      }
      if (match && match[1] && match[1] !== trimmed) {
        authCodeInput.value = match[1]
      }
    }
  }
})

// Methods
const handleGenerateUrl = () => {
  emit('generate-url')
}

const handleCopyUrl = () => {
  if (props.authUrl) {
    copyToClipboard(props.authUrl, 'URL copied to clipboard')
  }
}

const handleRegenerate = () => {
  authCodeInput.value = ''
  emit('generate-url')
}

const handleCookieAuth = () => {
  if (sessionKeyInput.value.trim()) {
    emit('cookie-auth', sessionKeyInput.value)
  }
}

const handleValidateRefreshToken = () => {
  if (refreshTokenInput.value.trim()) {
    if (inputMethod.value === 'mobile_refresh_token') {
      emit('validate-mobile-refresh-token', refreshTokenInput.value.trim())
    } else {
      emit('validate-refresh-token', refreshTokenInput.value.trim())
    }
  }
}

const handleValidateSessionToken = () => {
  if (sessionTokenInput.value.trim()) {
    emit('validate-session-token', sessionTokenInput.value.trim())
  }
}

const handleImportAccessToken = () => {
  if (accessTokenInput.value.trim()) {
    emit('import-access-token', accessTokenInput.value.trim())
  }
}

const handleImportCodexSession = () => {
  if (codexSessionInput.value.trim()) {
    emit('import-codex-session', codexSessionInput.value.trim())
  }
}

const handleImportCodexPAT = () => {
  if (codexPATInput.value.trim()) {
    emit('import-codex-pat', codexPATInput.value.trim())
  }
}

const handleImportSSO = () => {
  if (ssoCookieInput.value.trim()) {
    emit('import-sso', ssoCookieInput.value.trim())
  }
}

// Expose methods and state
defineExpose({
  authCode: authCodeInput,
  oauthState,
  projectId,
  sessionKey: sessionKeyInput,
  refreshToken: refreshTokenInput,
  sessionToken: sessionTokenInput,
  accessToken: accessTokenInput,
  codexSession: codexSessionInput,
  codexPAT: codexPATInput,
  ssoCookie: ssoCookieInput,
  inputMethod,
  reset: () => {
    authCodeInput.value = ''
    oauthState.value = ''
    projectId.value = ''
    sessionKeyInput.value = ''
    refreshTokenInput.value = ''
    sessionTokenInput.value = ''
    accessTokenInput.value = ''
    codexSessionInput.value = ''
    codexPATInput.value = ''
    ssoCookieInput.value = ''
    inputMethod.value = props.initialInputMethod
    showHelpDialog.value = false
  }
})
</script>
