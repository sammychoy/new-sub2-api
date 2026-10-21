import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/account/CreateAccountModal.vue'),
  'utf8'
)

describe('CreateAccountModal Gemini Education & Web Cookie plan selection', () => {
  it('supports Gemini Education card in OAuth type selection', () => {
    expect(source).toContain("handleSelectGeminiOAuthType('gemini_education')")
    expect(source).toContain("geminiOAuthType === 'gemini_education'")
    expect(source).toContain("name=\"academicCap\"")
  })

  it('supports Google One and Gemini Education cards in Web Cookie plan selection', () => {
    expect(source).toContain("form.platform === 'gemini' && accountCategory === 'web_cookie'")
    expect(source).toContain("admin.accounts.gemini.web.planLabel")
    expect(source).toContain("handleSelectGeminiOAuthType('google_one')")
  })

  it('provides tier selection dropdown for Gemini Education with standard and premium options', () => {
    expect(source).toContain("v-else-if=\"geminiOAuthType === 'gemini_education'\"")
    expect(source).toContain("value=\"gemini_education\"")
    expect(source).toContain("value=\"gemini_education_premium\"")
    expect(source).toContain("geminiTierEducation")
  })

  it('persists oauth_type and tier_id when submitting gemini_web account', () => {
    expect(source).toContain("const effectiveOAuthType = geminiOAuthType.value === 'gemini_education' ? 'gemini_education' : 'google_one'")
    expect(source).toContain("oauth_type: effectiveOAuthType")
    expect(source).toContain("tier_id: effectiveTierId")
  })
})
