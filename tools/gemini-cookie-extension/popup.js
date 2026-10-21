let psid = ''
let psidts = ''

document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('statusDot')
  const statusText = document.getElementById('statusText')
  const psidVal = document.getElementById('psidVal')
  const psidtsVal = document.getElementById('psidtsVal')
  const copyBtn = document.getElementById('copyBtn')
  const syncBtn = document.getElementById('syncBtn')
  const msgBox = document.getElementById('msgBox')
  const toggleSync = document.getElementById('toggleSync')
  const syncForm = document.getElementById('syncForm')
  const syncArrow = document.getElementById('syncArrow')
  const sub2apiUrl = document.getElementById('sub2apiUrl')
  const adminKey = document.getElementById('adminKey')
  const accountName = document.getElementById('accountName')

  // Load saved config
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['sub2apiUrl', 'adminKey'], (res) => {
      if (res.sub2apiUrl) sub2apiUrl.value = res.sub2apiUrl
      if (res.adminKey) adminKey.value = res.adminKey
    })
  }

  // Toggle sync panel
  toggleSync.addEventListener('click', () => {
    const isHidden = syncForm.style.display === 'none'
    syncForm.style.display = isHidden ? 'block' : 'none'
    syncArrow.textContent = isHidden ? '▲' : '▼'
  })

  // Helper to fetch cookie with fallback
  async function getCookie(name) {
    let cookie = await chrome.cookies.get({ url: 'https://gemini.google.com', name })
    if (!cookie || !cookie.value) {
      cookie = await chrome.cookies.get({ url: 'https://google.com', name })
    }
    if (!cookie || !cookie.value) {
      const all = await chrome.cookies.getAll({ domain: 'google.com', name })
      if (all && all.length > 0) cookie = all[0]
    }
    return cookie ? cookie.value : ''
  }

  try {
    psid = await getCookie('__Secure-1PSID')
    psidts = await getCookie('__Secure-1PSIDTS')

    if (psid) {
      statusDot.classList.add('active')
      statusText.textContent = '已檢測到 Google Gemini 登入'
      psidVal.textContent = psid.slice(0, 10) + '...' + psid.slice(-6)
      if (psidts) {
        psidtsVal.textContent = psidts.slice(0, 8) + '...' + psidts.slice(-6)
      } else {
        psidtsVal.textContent = '(未檢測到，可自動輪換)'
      }
      copyBtn.disabled = false
      syncBtn.disabled = false
    } else {
      statusDot.classList.remove('active')
      statusText.textContent = '未登入 Gemini，請先登入'
      showMsg('請先在瀏覽器打開並登入 gemini.google.com', 'error')
    }
  } catch (err) {
    statusText.textContent = '讀取失敗: ' + err.message
    showMsg('Cookie 讀取失敗: ' + err.message, 'error')
  }

  // Copy button action
  copyBtn.addEventListener('click', async () => {
    if (!psid) return
    const payload = {
      auth_type: 'gemini_web',
      '__Secure-1PSID': psid,
      '__Secure-1PSIDTS': psidts || ''
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      showMsg('✅ 已複製到剪貼簿！回到 Sub2API 點擊「從剪貼簿讀取」即可。', 'success')
    } catch (e) {
      showMsg('複製失敗，請手動複製', 'error')
    }
  })

  // Direct sync action
  syncBtn.addEventListener('click', async () => {
    const url = sub2apiUrl.value.trim().replace(/\/$/, '')
    const key = adminKey.value.trim()
    const name = accountName.value.trim() || 'Gemini Web Account'

    if (!url || !key) {
      showMsg('請輸入 Sub2API 網址與 Admin API Key', 'error')
      return
    }

    // Save settings
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sub2apiUrl: url, adminKey: key })
    }

    syncBtn.disabled = true
    syncBtn.textContent = '同步中...'
    showMsg('正在傳送至 Sub2API...', '')

    try {
      const resp = await fetch(`${url}/api/v1/admin/gemini/web/quick-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          name,
          secure_1psid: psid,
          secure_1psidts: psidts || ''
        })
      })

      const data = await resp.json()
      if (resp.ok && data.success) {
        showMsg(`🎉 成功同步！賬號已建立 (ID: ${data.account_id || ''})`, 'success')
      } else {
        showMsg('同步失敗: ' + (data.message || data.error || resp.statusText), 'error')
      }
    } catch (err) {
      showMsg('連線失敗: ' + err.message, 'error')
    } finally {
      syncBtn.disabled = false
      syncBtn.textContent = '發送至 Sub2API 建立賬號'
    }
  })

  function showMsg(text, type) {
    msgBox.textContent = text
    msgBox.className = 'msg ' + (type || '')
  }
})
