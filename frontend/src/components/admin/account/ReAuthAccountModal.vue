<template>
  <BaseDialog
    :show="show"
    :title="t('admin.accounts.reAuthorizeAccount')"
    width="normal"
    @close="handleClose"
  >
    <div v-if="account" class="space-y-4">
      <!-- Account Info -->
      <div
        class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-600 dark:bg-dark-700"
      >
        <div class="flex items-center gap-3">
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br',
              isOpenAILike
                ? 'from-green-500 to-green-600'
                : isGemini
                  ? 'from-blue-500 to-blue-600'
                  : isAntigravity
                    ? 'from-purple-500 to-purple-600'
                    : isGrok
                      ? 'from-zinc-700 to-zinc-900'
                      : 'from-orange-500 to-orange-600'
            ]"
          >
            <Icon name="sparkles" size="md" class="text-white" />
          </div>
          <div>
            <span class="block font-semibold text-gray-900 dark:text-white">{{
              account.name
            }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{
                isOpenAI
                  ? t('admin.accounts.openaiAccount')
                  : isGeminiWeb
                    ? t('admin.accounts.gemini.accountType.webCookieTitle')
                    : isGemini
                      ? t('admin.accounts.geminiAccount')
                      : isAntigravity
                        ? t('admin.accounts.antigravityAccount')
                        : isGrok
                          ? t('admin.accounts.grokAccount')
                          : t('admin.accounts.claudeCodeAccount')
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- Add Method Selection (Claude only) -->
      <fieldset v-if="isAnthropic" class="border-0 p-0">
        <legend class="input-label">{{ t('admin.accounts.oauth.authMethod') }}</legend>
        <div class="mt-2 flex gap-4">
          <label class="flex cursor-pointer items-center">
            <input
              v-model="addMethod"
              type="radio"
              value="oauth"
              class="mr-2 text-primary-600 focus:ring-primary-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">{{
              t('admin.accounts.types.oauth')
            }}</span>
          </label>
          <label class="flex cursor-pointer items-center">
            <input
              v-model="addMethod"
              type="radio"
              value="setup-token"
              class="mr-2 text-primary-600 focus:ring-primary-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">{{
              t('admin.accounts.setupTokenLongLived')
            }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Gemini OAuth Type Display (read-only) -->
      <div v-if="isGemini && !isGeminiWeb" class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-600 dark:bg-dark-700">
        <div class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ t('admin.accounts.oauth.gemini.oauthTypeLabel') }}
        </div>
        <div class="flex items-center gap-3">
          <div
            :class="[
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              geminiOAuthType === 'google_one'
                ? 'bg-purple-500 text-white'
                : geminiOAuthType === 'gemini_education'
                  ? 'bg-emerald-500 text-white'
                  : geminiOAuthType === 'code_assist'
                    ? 'bg-blue-500 text-white'
                    : 'bg-amber-500 text-white'
            ]"
          >
            <Icon v-if="geminiOAuthType === 'google_one'" name="user" size="sm" />
            <Icon v-else-if="geminiOAuthType === 'gemini_education'" name="academicCap" size="sm" />
            <Icon v-else-if="geminiOAuthType === 'code_assist'" name="cloud" size="sm" />
            <Icon v-else name="sparkles" size="sm" />
          </div>
          <div>
            <span class="block text-sm font-medium text-gray-900 dark:text-white">
              {{
                geminiOAuthType === 'google_one'
                  ? 'Google One'
                  : geminiOAuthType === 'gemini_education'
                    ? 'Gemini Education'
                    : geminiOAuthType === 'code_assist'
                      ? t('admin.accounts.gemini.oauthType.builtInTitle')
                      : t('admin.accounts.gemini.oauthType.customTitle')
              }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{
                geminiOAuthType === 'google_one'
                  ? t('admin.accounts.gemini.oauthType.googleOneDesc')
                  : geminiOAuthType === 'gemini_education'
                    ? t('admin.accounts.gemini.oauthType.educationDesc')
                    : geminiOAuthType === 'code_assist'
                      ? t('admin.accounts.gemini.oauthType.builtInDesc')
                      : t('admin.accounts.gemini.oauthType.customDesc')
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- Gemini Web Cookie Section -->
      <div v-if="isGeminiWeb" class="space-y-4">
        <!-- Datacenter IP / Proxy Warning if no proxy -->
        <div v-if="!account.proxy_id" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          <div class="flex items-start gap-2">
            <Icon name="exclamationTriangle" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span class="font-semibold">{{ t('admin.accounts.gemini.web.proxyNoticeTitle') }}</span>
              {{ t('admin.accounts.gemini.web.proxyNoticeDesc') }}
            </div>
          </div>
        </div>

        <!-- Mode Selector -->
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="geminiWebInputMode = 'extension'"
            :class="[
              'flex items-center justify-center gap-1.5 rounded-lg border-2 p-2 text-xs font-medium transition-all',
              geminiWebInputMode === 'extension'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'border-gray-200 text-gray-600 dark:border-dark-600 dark:text-gray-400'
            ]"
          >
            <span>{{ t('admin.accounts.gemini.web.modeExtension') }}</span>
          </button>
          <button
            type="button"
            @click="geminiWebInputMode = 'manual'"
            :class="[
              'flex items-center justify-center gap-1.5 rounded-lg border-2 p-2 text-xs font-medium transition-all',
              geminiWebInputMode === 'manual'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'border-gray-200 text-gray-600 dark:border-dark-600 dark:text-gray-400'
            ]"
          >
            <span>{{ t('admin.accounts.gemini.web.modeManual') }}</span>
          </button>
        </div>

        <!-- Extension panel -->
        <div v-if="geminiWebInputMode === 'extension'" class="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-emerald-700 dark:text-emerald-400">
              {{ t('admin.accounts.gemini.web.extensionDesc') }}
            </p>
            <button
              type="button"
              @click="readGeminiWebFromClipboard"
              class="btn btn-xs btn-primary shrink-0 flex items-center gap-1"
            >
              <Icon name="clipboard" size="xs" />
              {{ t('admin.accounts.gemini.web.readClipboard') }}
            </button>
          </div>
        </div>

        <!-- Manual Smart Paste -->
        <div v-if="geminiWebInputMode === 'manual'" class="space-y-1">
          <label class="input-label text-xs">{{ t('admin.accounts.gemini.web.smartPasteLabel') }}</label>
          <textarea
            v-model="geminiWebSmartPaste"
            rows="2"
            class="input font-mono text-xs"
            :placeholder="t('admin.accounts.gemini.web.smartPastePlaceholder')"
          ></textarea>
          <div class="flex justify-end">
            <button
              type="button"
              @click="handleSmartPasteExtract"
              :disabled="!geminiWebSmartPaste.trim()"
              class="btn btn-xs btn-secondary flex items-center gap-1"
            >
              <Icon name="sparkles" size="xs" />
              {{ t('admin.accounts.gemini.web.smartPasteBtn') }}
            </button>
          </div>
        </div>

        <!-- Inputs -->
        <div class="space-y-3">
          <div>
            <label class="input-label text-xs">
              {{ t('admin.accounts.gemini.web.psidLabel') }}
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="geminiWebPsid"
              type="password"
              class="input font-mono text-xs"
              :placeholder="t('admin.accounts.gemini.web.psidPlaceholder')"
            />
          </div>
          <div>
            <label class="input-label text-xs">
              {{ t('admin.accounts.gemini.web.psidtsLabel') }}
            </label>
            <input
              v-model="geminiWebPsidts"
              type="password"
              class="input font-mono text-xs"
              :placeholder="t('admin.accounts.gemini.web.psidtsPlaceholder')"
            />
          </div>
        </div>

        <!-- Test Connection -->
        <div>
          <button
            type="button"
            @click="testGeminiWebConnection"
            :disabled="!geminiWebPsid.trim() || geminiWebTesting"
            class="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <Icon v-if="geminiWebTesting" name="refresh" class="animate-spin" size="xs" />
            <Icon v-else name="bolt" size="xs" />
            <span>{{ geminiWebTesting ? t('admin.accounts.gemini.web.testing') : t('admin.accounts.gemini.web.testBtn') }}</span>
          </button>

          <div
            v-if="geminiWebTestResult"
            class="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            <div class="font-medium flex items-center gap-1">
              <Icon name="checkCircle" size="xs" class="text-emerald-500" />
              <span>{{ t('admin.accounts.gemini.web.testSuccess') }}</span>
            </div>
            <div v-if="geminiWebTestResult.models?.length" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="m in geminiWebTestResult.models"
                :key="m"
                class="rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-mono text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
              >
                {{ m }}
              </span>
            </div>
          </div>

          <div
            v-if="geminiWebTestError"
            class="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
          >
            <div class="font-medium flex items-center gap-1">
              <Icon name="exclamationCircle" size="xs" class="text-red-500" />
              <span>{{ geminiWebTestError }}</span>
            </div>
          </div>
        </div>
      </div>

      <OAuthAuthorizationFlow
        v-if="!isGeminiWeb"
        ref="oauthFlowRef"
        :add-method="addMethod"
        :auth-url="currentAuthUrl"
        :session-id="currentSessionId"
        :loading="currentLoading"
        :error="currentError"
        :show-help="isAnthropic"
        :show-proxy-warning="isAnthropic"
        :show-cookie-option="isAnthropic"
        :allow-multiple="false"
        :method-label="t('admin.accounts.inputMethod')"
        :platform="isOpenAI ? 'openai' : isGemini ? 'gemini' : isAntigravity ? 'antigravity' : isGrok ? 'grok' : 'anthropic'"
        :show-project-id="isGemini && geminiOAuthType === 'code_assist'"
        @generate-url="handleGenerateUrl"
        @cookie-auth="handleCookieAuth"
      />

    </div>

    <template #footer>
      <div v-if="account" class="flex justify-between gap-3">
        <button type="button" class="btn btn-secondary" @click="handleClose">
          {{ t('common.cancel') }}
        </button>
        <button
          v-if="isGeminiWeb"
          type="button"
          :disabled="!geminiWebPsid.trim() || savingWeb"
          class="btn btn-primary"
          @click="handleSaveGeminiWeb"
        >
          <svg
            v-if="savingWeb"
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
          {{
            savingWeb
              ? t('admin.accounts.oauth.verifying')
              : t('admin.accounts.oauth.completeAuth')
          }}
        </button>
        <button
          v-else-if="isManualInputMethod"
          type="button"
          :disabled="!canExchangeCode"
          class="btn btn-primary"
          @click="handleExchangeCode"
        >
          <svg
            v-if="currentLoading"
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
          {{
            currentLoading
              ? t('admin.accounts.oauth.verifying')
              : t('admin.accounts.oauth.completeAuth')
          }}
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { adminAPI } from '@/api/admin'
import {
  useAccountOAuth,
  type AddMethod,
  type AuthInputMethod
} from '@/composables/useAccountOAuth'
import { useOpenAIOAuth } from '@/composables/useOpenAIOAuth'
import { useGeminiOAuth } from '@/composables/useGeminiOAuth'
import { useAntigravityOAuth } from '@/composables/useAntigravityOAuth'
import { useGrokOAuth } from '@/composables/useGrokOAuth'
import type { Account } from '@/types'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import OAuthAuthorizationFlow from '@/components/account/OAuthAuthorizationFlow.vue'

// Type for exposed OAuthAuthorizationFlow component
// Note: defineExpose automatically unwraps refs, so we use the unwrapped types
interface OAuthFlowExposed {
  authCode: string
  oauthState: string
  projectId: string
  sessionKey: string
  inputMethod: AuthInputMethod
  reset: () => void
}

interface Props {
  show: boolean
  account: Account | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  reauthorized: [account: Account]
}>()

const appStore = useAppStore()
const { t } = useI18n()

// OAuth composables
const claudeOAuth = useAccountOAuth()
const openaiOAuth = useOpenAIOAuth()
const geminiOAuth = useGeminiOAuth()
const antigravityOAuth = useAntigravityOAuth()
const grokOAuth = useGrokOAuth()

// Refs
const oauthFlowRef = ref<OAuthFlowExposed | null>(null)

// State
const addMethod = ref<AddMethod>('oauth')
const geminiOAuthType = ref<'code_assist' | 'google_one' | 'gemini_education' | 'ai_studio'>('code_assist')

// Computed - check platform
const isOpenAI = computed(() => props.account?.platform === 'openai')
const isOpenAILike = computed(() => isOpenAI.value)
const isGemini = computed(() => props.account?.platform === 'gemini')
const isGeminiWeb = computed(() => {
  return props.account?.platform === 'gemini' &&
    (props.account?.type === 'gemini_web' || (props.account?.credentials as any)?.auth_type === 'gemini_web' || !!(props.account?.credentials as any)?.secure_1psid)
})
const isAnthropic = computed(() => props.account?.platform === 'anthropic')
const isAntigravity = computed(() => props.account?.platform === 'antigravity')
const isGrok = computed(() => props.account?.platform === 'grok')

// Gemini Web Cookie State
const geminiWebInputMode = ref<'extension' | 'manual'>('extension')
const geminiWebPsid = ref('')
const geminiWebPsidts = ref('')
const geminiWebSmartPaste = ref('')
const geminiWebTesting = ref(false)
const geminiWebTestResult = ref<{ valid: boolean; models?: string[]; metadata?: any } | null>(null)
const geminiWebTestError = ref('')
const savingWeb = ref(false)

const extractCookiesFromText = (text: string) => {
  let psid = ''
  let psidts = ''
  try {
    const parsed = JSON.parse(text)
    if (parsed.secure_1psid || parsed.__Secure_1PSID || parsed['__Secure-1PSID']) {
      psid = parsed.secure_1psid || parsed.__Secure_1PSID || parsed['__Secure-1PSID'] || ''
    }
    if (parsed.secure_1psidts || parsed.__Secure_1PSIDTS || parsed['__Secure-1PSIDTS']) {
      psidts = parsed.secure_1psidts || parsed.__Secure_1PSIDTS || parsed['__Secure-1PSIDTS'] || ''
    }
    if (parsed.credentials) {
      if (parsed.credentials.secure_1psid) psid = parsed.credentials.secure_1psid
      if (parsed.credentials.secure_1psidts) psidts = parsed.credentials.secure_1psidts
    }
    if (psid) return { psid, psidts }
  } catch {
    // ignore json parse error
  }

  const psidMatch = text.match(/__Secure-1PSID=([^;\s\r\n"']+)/)
  if (psidMatch) psid = psidMatch[1]
  const psidtsMatch = text.match(/__Secure-1PSIDTS=([^;\s\r\n"']+)/)
  if (psidtsMatch) psidts = psidtsMatch[1]
  return { psid, psidts }
}

const handleSmartPasteExtract = () => {
  const { psid, psidts } = extractCookiesFromText(geminiWebSmartPaste.value)
  if (psid) {
    geminiWebPsid.value = psid
    if (psidts) geminiWebPsidts.value = psidts
    appStore.showSuccess(t('admin.accounts.gemini.web.smartPasteSuccess'))
  } else {
    appStore.showError(t('admin.accounts.gemini.web.smartPasteFailed'))
  }
}

const readGeminiWebFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) {
      appStore.showError(t('admin.accounts.gemini.web.readClipboardEmpty'))
      return
    }
    const { psid, psidts } = extractCookiesFromText(text)
    if (psid) {
      geminiWebPsid.value = psid
      if (psidts) geminiWebPsidts.value = psidts
      appStore.showSuccess(t('admin.accounts.gemini.web.readClipboardSuccess'))
    } else {
      appStore.showError(t('admin.accounts.gemini.web.readClipboardEmpty'))
    }
  } catch (err: any) {
    appStore.showError(err.message || t('admin.accounts.gemini.web.readClipboardEmpty'))
  }
}

const testGeminiWebConnection = async () => {
  if (!geminiWebPsid.value.trim() || !props.account) return
  geminiWebTesting.value = true
  geminiWebTestResult.value = null
  geminiWebTestError.value = ''
  try {
    const res = await adminAPI.gemini.validateWebCookies({
      secure_1psid: geminiWebPsid.value.trim(),
      secure_1psidts: geminiWebPsidts.value.trim() || undefined,
      proxy_id: props.account.proxy_id || undefined
    })
    if (res.valid) {
      geminiWebTestResult.value = res
      if (res.metadata?.secure_1psidts && !geminiWebPsidts.value.trim()) {
        geminiWebPsidts.value = res.metadata.secure_1psidts
      }
    } else {
      geminiWebTestError.value = res.error || 'Validation failed'
    }
  } catch (err: any) {
    geminiWebTestError.value = err.response?.data?.message || err.message || 'Connection test failed'
  } finally {
    geminiWebTesting.value = false
  }
}

const handleSaveGeminiWeb = async () => {
  if (!props.account) return
  if (!geminiWebPsid.value.trim()) {
    appStore.showError(t('admin.accounts.gemini.web.psidRequired'))
    return
  }
  savingWeb.value = true
  try {
    const existingCreds = ((props.account.credentials || {}) as Record<string, unknown>)
    const newCreds: Record<string, unknown> = {
      ...existingCreds,
      auth_type: 'gemini_web',
      secure_1psid: geminiWebPsid.value.trim(),
      secure_1psidts: geminiWebPsidts.value.trim() || undefined
    }
    if (geminiWebTestResult.value?.metadata) {
      Object.assign(newCreds, geminiWebTestResult.value.metadata)
    }
    const extra = { ...((props.account.extra || {}) as Record<string, unknown>) }
    if (geminiWebTestResult.value?.models) {
      extra.models = geminiWebTestResult.value.models
    }
    const res = await adminAPI.accounts.update(props.account.id, {
      credentials: newCreds,
      extra
    })
    await adminAPI.accounts.clearError(props.account.id)
    appStore.showSuccess(t('admin.accounts.reAuthorizedSuccess'))
    emit('reauthorized', res as Account)
    handleClose()
  } catch (err: any) {
    appStore.showError(err.response?.data?.message || err.message || t('admin.accounts.oauth.authFailed'))
  } finally {
    savingWeb.value = false
  }
}

// Computed - current OAuth state based on platform
const currentAuthUrl = computed(() => {
  if (isOpenAILike.value) return openaiOAuth.authUrl.value
  if (isGemini.value) return geminiOAuth.authUrl.value
  if (isAntigravity.value) return antigravityOAuth.authUrl.value
  if (isGrok.value) return grokOAuth.authUrl.value
  return claudeOAuth.authUrl.value
})
const currentSessionId = computed(() => {
  if (isOpenAILike.value) return openaiOAuth.sessionId.value
  if (isGemini.value) return geminiOAuth.sessionId.value
  if (isAntigravity.value) return antigravityOAuth.sessionId.value
  if (isGrok.value) return grokOAuth.sessionId.value
  return claudeOAuth.sessionId.value
})
const currentLoading = computed(() => {
  if (isOpenAILike.value) return openaiOAuth.loading.value
  if (isGemini.value) return geminiOAuth.loading.value
  if (isAntigravity.value) return antigravityOAuth.loading.value
  if (isGrok.value) return grokOAuth.loading.value
  return claudeOAuth.loading.value
})
const currentError = computed(() => {
  if (isOpenAILike.value) return openaiOAuth.error.value
  if (isGemini.value) return geminiOAuth.error.value
  if (isAntigravity.value) return antigravityOAuth.error.value
  if (isGrok.value) return grokOAuth.error.value
  return claudeOAuth.error.value
})

// Computed
const isManualInputMethod = computed(() => {
  // OpenAI/Gemini/Antigravity always use manual input (no cookie auth option)
  return isOpenAILike.value || isGemini.value || isAntigravity.value || isGrok.value || oauthFlowRef.value?.inputMethod === 'manual'
})

const canExchangeCode = computed(() => {
  const authCode = oauthFlowRef.value?.authCode || ''
  const sessionId = currentSessionId.value
  const loading = currentLoading.value
  return authCode.trim() && sessionId && !loading
})

// Watchers
watch(
  () => props.show,
  (newVal) => {
    if (newVal && props.account) {
      // Initialize addMethod based on current account type (Claude only)
      if (
        isAnthropic.value &&
        (props.account.type === 'oauth' || props.account.type === 'setup-token')
      ) {
        addMethod.value = props.account.type as AddMethod
      }
      if (isGeminiWeb.value) {
        const creds = (props.account.credentials || {}) as Record<string, unknown>
        geminiWebPsid.value = (creds.secure_1psid as string) || ''
        geminiWebPsidts.value = (creds.secure_1psidts as string) || ''
        geminiWebSmartPaste.value = ''
        geminiWebTestResult.value = null
        geminiWebTestError.value = ''
      } else if (isGemini.value) {
        const creds = (props.account.credentials || {}) as Record<string, unknown>
        geminiOAuthType.value =
          creds.oauth_type === 'google_one'
            ? 'google_one'
            : creds.oauth_type === 'gemini_education'
              ? 'gemini_education'
              : creds.oauth_type === 'ai_studio'
                ? 'ai_studio'
                : 'code_assist'
      }
    } else {
      resetState()
    }
  }
)

// Methods
const resetState = () => {
  addMethod.value = 'oauth'
  geminiOAuthType.value = 'code_assist'
  geminiWebPsid.value = ''
  geminiWebPsidts.value = ''
  geminiWebSmartPaste.value = ''
  geminiWebTesting.value = false
  geminiWebTestResult.value = null
  geminiWebTestError.value = ''
  savingWeb.value = false
  claudeOAuth.resetState()
  openaiOAuth.resetState()
  geminiOAuth.resetState()
  antigravityOAuth.resetState()
  grokOAuth.resetState()
  oauthFlowRef.value?.reset()
}

const handleClose = () => {
  emit('close')
}

const handleGenerateUrl = async () => {
  if (!props.account) return

  if (isOpenAILike.value) {
    await openaiOAuth.generateAuthUrl(props.account.proxy_id)
  } else if (isGemini.value) {
    const creds = (props.account.credentials || {}) as Record<string, unknown>
    const tierId = typeof creds.tier_id === 'string' ? creds.tier_id : undefined
    const projectId = geminiOAuthType.value === 'code_assist' ? oauthFlowRef.value?.projectId : undefined
    await geminiOAuth.generateAuthUrl(props.account.proxy_id, projectId, geminiOAuthType.value, tierId)
  } else if (isAntigravity.value) {
    await antigravityOAuth.generateAuthUrl(props.account.proxy_id)
  } else if (isGrok.value) {
    await grokOAuth.generateAuthUrl(props.account.proxy_id)
  } else {
    await claudeOAuth.generateAuthUrl(addMethod.value, props.account.proxy_id)
  }
}

const handleExchangeCode = async () => {
  if (!props.account) return

  const authCode = oauthFlowRef.value?.authCode || ''
  if (!authCode.trim()) return

  if (isOpenAILike.value) {
    // OpenAI OAuth flow
    const oauthClient = openaiOAuth
    const sessionId = oauthClient.sessionId.value
    if (!sessionId) return
    const stateToUse = (oauthFlowRef.value?.oauthState || oauthClient.oauthState.value || '').trim()
    if (!stateToUse) {
      oauthClient.error.value = t('admin.accounts.oauth.authFailed')
      appStore.showError(oauthClient.error.value)
      return
    }

    const tokenInfo = await oauthClient.exchangeAuthCode(
      authCode.trim(),
      sessionId,
      stateToUse,
      props.account.proxy_id
    )
    if (!tokenInfo) return

    // Build credentials and extra info
    const credentials = oauthClient.buildCredentials(tokenInfo)
    const extra = oauthClient.buildExtraInfo(tokenInfo)

    try {
      const updatedAccount = await adminAPI.accounts.applyOAuthCredentials(props.account.id, {
        type: 'oauth',
        credentials,
        extra
      })

      appStore.showSuccess(t('admin.accounts.reAuthorizedSuccess'))
      emit('reauthorized', updatedAccount)
      handleClose()
    } catch (error: any) {
      oauthClient.error.value = error.response?.data?.detail || t('admin.accounts.oauth.authFailed')
      appStore.showError(oauthClient.error.value)
    }
  } else if (isGemini.value) {
    const sessionId = geminiOAuth.sessionId.value
    if (!sessionId) return

    const stateFromInput = oauthFlowRef.value?.oauthState || ''
    const stateToUse = stateFromInput || geminiOAuth.state.value
    if (!stateToUse) return

    const tokenInfo = await geminiOAuth.exchangeAuthCode({
      code: authCode.trim(),
      sessionId,
      state: stateToUse,
      proxyId: props.account.proxy_id,
      oauthType: geminiOAuthType.value,
      tierId: typeof (props.account.credentials as any)?.tier_id === 'string' ? ((props.account.credentials as any).tier_id as string) : undefined
    })
    if (!tokenInfo) return

    const credentials = geminiOAuth.buildCredentials(tokenInfo)

    try {
      await adminAPI.accounts.update(props.account.id, {
        type: 'oauth',
        credentials
      })
      const updatedAccount = await adminAPI.accounts.clearError(props.account.id)
      appStore.showSuccess(t('admin.accounts.reAuthorizedSuccess'))
      emit('reauthorized', updatedAccount)
      handleClose()
    } catch (error: any) {
      geminiOAuth.error.value = error.response?.data?.detail || t('admin.accounts.oauth.authFailed')
      appStore.showError(geminiOAuth.error.value)
    }
  } else if (isAntigravity.value) {
    // Antigravity OAuth flow
    const sessionId = antigravityOAuth.sessionId.value
    if (!sessionId) return

    const stateFromInput = oauthFlowRef.value?.oauthState || ''
    const stateToUse = stateFromInput || antigravityOAuth.state.value
    if (!stateToUse) return

    const tokenInfo = await antigravityOAuth.exchangeAuthCode({
      code: authCode.trim(),
      sessionId,
      state: stateToUse,
      proxyId: props.account.proxy_id
    })
    if (!tokenInfo) return

    const credentials = antigravityOAuth.buildCredentials(tokenInfo)

    try {
      await adminAPI.accounts.update(props.account.id, {
        type: 'oauth',
        credentials
      })
      const updatedAccount = await adminAPI.accounts.clearError(props.account.id)
      appStore.showSuccess(t('admin.accounts.reAuthorizedSuccess'))
      emit('reauthorized', updatedAccount)
      handleClose()
    } catch (error: any) {
      antigravityOAuth.error.value = error.response?.data?.detail || t('admin.accounts.oauth.authFailed')
      appStore.showError(antigravityOAuth.error.value)
    }
  } else if (isGrok.value) {
    const sessionId = grokOAuth.sessionId.value
    if (!sessionId) return

    const stateFromInput = oauthFlowRef.value?.oauthState || ''
    const stateToUse = stateFromInput || grokOAuth.state.value
    if (!stateToUse) return

    const tokenInfo = await grokOAuth.exchangeAuthCode({
      code: authCode.trim(),
      sessionId,
      state: stateToUse,
      proxyId: props.account.proxy_id
    })
    if (!tokenInfo) return

    const credentials = grokOAuth.buildCredentials(tokenInfo)
    const extra = grokOAuth.buildExtraInfo(tokenInfo)

    try {
      const updatedAccount = await adminAPI.accounts.applyOAuthCredentials(props.account.id, {
        type: 'oauth',
        credentials,
        extra
      })

      appStore.showSuccess(t('admin.accounts.reAuthorizedSuccess'))
      emit('reauthorized', updatedAccount)
      handleClose()
    } catch (error: any) {
      grokOAuth.error.value = error.response?.data?.detail || t('admin.accounts.oauth.authFailed')
      appStore.showError(grokOAuth.error.value)
    }
  } else {
    // Claude OAuth flow
    const sessionId = claudeOAuth.sessionId.value
    if (!sessionId) return

    claudeOAuth.loading.value = true
    claudeOAuth.error.value = ''

    try {
      const proxyConfig = props.account.proxy_id ? { proxy_id: props.account.proxy_id } : {}
      const endpoint =
        addMethod.value === 'oauth'
          ? '/admin/accounts/exchange-code'
          : '/admin/accounts/exchange-setup-token-code'

      const tokenInfo = await adminAPI.accounts.exchangeCode(endpoint, {
        session_id: sessionId,
        code: authCode.trim(),
        ...proxyConfig
      })

      const extra = claudeOAuth.buildExtraInfo(tokenInfo)

      const updatedAccount = await adminAPI.accounts.applyOAuthCredentials(props.account.id, {
        type: addMethod.value as 'oauth' | 'setup-token',
        credentials: tokenInfo as unknown as Record<string, unknown>,
        extra
      })

      appStore.showSuccess(t('admin.accounts.reAuthorizedSuccess'))
      emit('reauthorized', updatedAccount)
      handleClose()
    } catch (error: any) {
      claudeOAuth.error.value = error.response?.data?.detail || t('admin.accounts.oauth.authFailed')
      appStore.showError(claudeOAuth.error.value)
    } finally {
      claudeOAuth.loading.value = false
    }
  }
}

const handleCookieAuth = async (sessionKey: string) => {
  if (!props.account || isOpenAILike.value) return

  claudeOAuth.loading.value = true
  claudeOAuth.error.value = ''

  try {
    const proxyConfig = props.account.proxy_id ? { proxy_id: props.account.proxy_id } : {}
    const endpoint =
      addMethod.value === 'oauth'
        ? '/admin/accounts/cookie-auth'
        : '/admin/accounts/setup-token-cookie-auth'

    const tokenInfo = await adminAPI.accounts.exchangeCode(endpoint, {
      session_id: '',
      code: sessionKey.trim(),
      ...proxyConfig
    })

    const extra = claudeOAuth.buildExtraInfo(tokenInfo)

    const updatedAccount = await adminAPI.accounts.applyOAuthCredentials(props.account.id, {
      type: addMethod.value as 'oauth' | 'setup-token',
      credentials: tokenInfo as unknown as Record<string, unknown>,
      extra
    })

    appStore.showSuccess(t('admin.accounts.reAuthorizedSuccess'))
    emit('reauthorized', updatedAccount)
    handleClose()
  } catch (error: any) {
    claudeOAuth.error.value =
      error.response?.data?.detail || t('admin.accounts.oauth.cookieAuthFailed')
  } finally {
    claudeOAuth.loading.value = false
  }
}
</script>
