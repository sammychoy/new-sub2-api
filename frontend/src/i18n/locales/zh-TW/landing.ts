export default {
  batchImageGuide: {
    title: '圖片批次生成',
    description: '一次提交多條提示詞，任務完成後可統一下載圖片結果'
  },
  // Home Page
  home: {
    badge: 'Cloudflare 邊緣多模態 AI 聚合中繼網關',
    viewOnGithub: '在 GitHub 上檢視',
    viewDocs: '檢視文件',
    docs: '開發者文件',
    switchToLight: '切換到淺色模式',
    switchToDark: '切換到深色模式',
    dashboard: '控制台',
    login: '登入帳號',
    getStarted: '立即開始使用',
    goToDashboard: '進入控制台',
    heroTitle1: '全平台 AI 服務',
    heroTitle2: '一站式聚合中繼網關',
    heroSubtitle: '一個金鑰，暢用全球頂級 AI 模型',
    heroDescription: '為開發者與團隊打造的無伺服器 AI API 路由中心。告別多帳號混亂與單點故障，一個 API Key 暢享 Claude、GPT、DeepSeek、Gemini、Grok 等主流 AI 服務。',
    tags: {
      subscriptionToApi: '訂閱轉 API',
      stickySession: '會話保持',
      realtimeBilling: '按量計費'
    },
    pillTags: {
      edge: '邊緣智慧路由',
      sticky: '會話保持 (Sticky Session)',
      billing: '精準按量計費',
      multi: '多帳號自動負載均衡'
    },
    stats: {
      slaTitle: '可用率保證',
      slaDesc: '全球 300+ 邊緣節點覆蓋',
      latencyTitle: '極速邊緣響應',
      latencyDesc: '智能路由，零冷啟動延遲',
      modelsTitle: '頂級模型支援',
      modelsDesc: 'Claude, GPT, DeepSeek, Gemini',
      serverlessTitle: 'Serverless 全託管',
      serverlessDesc: '高並發架構，安全無憂'
    },
    terminal: {
      title: '即時 API 呼叫演示',
      tabCurl: 'cURL',
      tabPython: 'Python SDK',
      tabNode: 'Node.js',
      copy: '複製代碼',
      copied: '已複製！',
      streamSim: '流式響應模擬中...'
    },
    bento: {
      badge: 'CORE FEATURES',
      title: '強大核心特性，賦能極致 AI 體驗',
      subtitle: '專為高可用、低延遲與靈活計費場景設計的現代化邊緣網關架構',
      card1Title: '智能帳號池與自動故障轉移',
      card1Desc: '多個上游帳號自動輪詢與動態負載均衡，即時監控健康狀態，告別 Rate Limit 頻繁報錯。',
      card2Title: '精準上下文會話保持',
      card2Desc: '獨創 Sticky Session 機制，確保多輪對話精準命中同一上游會話，長上下文不丟失。',
      card3Title: '多維度配額與即時計費',
      card3Desc: '精確到 Token 級別的實時扣費與用量統計，支援自訂日額度、RPM/TPM 限流與充值扣費。',
      card4Title: '100% 格式標準相容',
      card4Desc: '全面相容 OpenAI / Claude 標準接口，NextChat、LobeChat、Cursor、Chatbox 即插即用。'
    },
    quickStart: {
      badge: 'HOW IT WORKS',
      title: '簡單 3 步，極速接入',
      subtitle: '無論是個人探索還是團隊業務，只需幾秒鐘即可開始使用',
      step1Title: '1. 註冊帳號',
      step1Desc: '建立帳戶並登入系統後台，獲取專屬 API 訪問密鑰。',
      step2Title: '2. 配置 Base URL',
      step2Desc: '在您喜愛的 AI 客戶端或專案中，將 API 端點指向本站。',
      step3Title: '3. 暢享頂級 AI',
      step3Desc: '立即使用 Claude 3.7、GPT-4o、DeepSeek R1 等多種旗艦模型。'
    },
    painPoints: {
      title: '你是否也遇到這些問題？',
      items: {
        expensive: {
          title: '訂閱費用高',
          desc: '每個 AI 服務都要單獨訂閱，每月支出越來越多'
        },
        complex: {
          title: '多帳號難管理',
          desc: '不同平台的帳號、密鑰分散各處，管理起來很麻煩'
        },
        unstable: {
          title: '服務不穩定',
          desc: '單一帳號容易觸發限制，影響正常使用'
        },
        noControl: {
          title: '用量無法控制',
          desc: '不知道錢花在哪了，也無法限制團隊成員的使用'
        }
      }
    },
    solutions: {
      title: '我們幫你解決',
      subtitle: '簡單三步，開始省心使用 AI'
    },
    features: {
      unifiedGateway: '一鍵接入',
      unifiedGatewayDesc: '獲取一個 API 密鑰，即可呼叫所有已接入的 AI 模型，無需分別申請。',
      multiAccount: '穩定可靠',
      multiAccountDesc: '智慧調度多個上游帳號，自動切換和負載均衡，告別頻繁報錯。',
      balanceQuota: '用多少付多少',
      balanceQuotaDesc: '按實際使用量計費，支援設定配額上限，團隊用量一目瞭然。'
    },
    comparison: {
      title: '為什麼選擇我們？',
      headers: {
        feature: '對比項',
        official: '官方訂閱',
        us: '本平台'
      },
      items: {
        pricing: {
          feature: '付費方式',
          official: '固定月費，用不完也付',
          us: '按量付費，用多少付多少'
        },
        models: {
          feature: '模型選擇',
          official: '單一服務商',
          us: '多模型隨意切換'
        },
        management: {
          feature: '帳號管理',
          official: '每個服務單獨管理',
          us: '統一密鑰，一站管理'
        },
        stability: {
          feature: '服務穩定性',
          official: '單帳號易觸發限制',
          us: '多帳號池，自動切換'
        },
        control: {
          feature: '用量控制',
          official: '無法限制',
          us: '可設配額、查明細'
        }
      }
    },
    providers: {
      badge: 'ECOSYSTEM',
      title: '已支援的旗艦 AI 模型',
      description: '全面支援各大頂級大語言模型與多模態推理 API',
      supported: '已支援',
      active: '在線服務',
      soon: '即將推出',
      claude: 'Claude 3.7 / 3.5',
      gpt: 'GPT-4o / o3-mini',
      deepseek: 'DeepSeek V3 / R1',
      gemini: 'Gemini 2.0 Flash / Pro',
      grok: 'Grok 3 / 2',
      antigravity: 'Antigravity Multi-Agent',
      more: '更多模型'
    },
    modes: {
      developer: '個人開發者',
      developerDesc: '一個 API Key 直連主流頂級模型，極簡設定，即刻開工。',
      team: '團隊與企業',
      teamDesc: '多帳號池自動負載均衡、成員配額管理與即時用量審計。'
    },
    faq: {
      badge: 'FAQ',
      title: '仲有嘢想問？',
      subtitle: '關於帳號安全、會話保持與計費，最多開發者關心的核心問題。',
      items: [
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
    },
    cta: {
      title: '準備好升級您的 AI 工作流了嗎？',
      description: '立即註冊獲取體驗額度，開啟極速、高可用的 AI API 聚合之旅。',
      button: '免費註冊體驗',
      secondaryBtn: '閱讀接入文檔'
    },
    footer: {
      allRightsReserved: '保留所有權利。',
      builtWith: '基於 Cloudflare Workers & D1 構建'
    }
  },

  // Key Usage Query Page
  keyUsage: {
    title: 'API Key 用量查詢',
    subtitle: '輸入您的 API Key 以檢視即時消費金額與使用狀態',
    placeholder: 'sk-ant-mirror-xxxxxxxxxxxx',
    query: '查詢',
    querying: '查詢中...',
    privacyNote: '您的 Key 僅在瀏覽器本地處理，不會被儲存',
    dateRange: '統計範圍:',
    dateRangeToday: '今日',
    dateRange7d: '7 天',
    dateRange30d: '30 天',
    dateRange90d: '90 天',
    dateRangeCustom: '自定義',
    apply: '應用',
    used: '已使用',
    detailInfo: '詳細資訊',
    tokenStats: 'Token 統計',
    dailyDetail: '按日明細',
    modelStats: '模型用量統計',
    // Table headers
    date: '日期',
    model: '模型',
    requests: '請求數',
    inputTokens: '輸入 Tokens',
    outputTokens: '輸出 Tokens',
    cacheCreationTokens: '快取建立',
    cacheReadTokens: '快取讀取',
    cacheWriteTokens: '快取寫入',
    totalTokens: '總 Tokens',
    cost: '費用',
    // Status
    quotaMode: 'Key 限額模式',
    walletBalance: '錢包餘額',
    // Ring card titles
    totalQuota: '總額度',
    limit5h: '5 小時限額',
    limitDaily: '日限額',
    limit7d: '7 天限額',
    limitWeekly: '周限額',
    limitMonthly: '月限額',
    // Detail rows
    remainingQuota: '剩餘額度',
    expiresAt: '過期時間',
    todayExpires: '(今日到期)',
    daysLeft: '({days} 天)',
    usedQuota: '已用額度',
    resetNow: '即將重置',
    subscriptionType: '訂閱型別',
    subscriptionExpires: '訂閱到期',
    // Usage stat cells
    todayRequests: '今日請求',
    todayInputTokens: '今日輸入',
    todayOutputTokens: '今日輸出',
    todayTokens: '今日 Tokens',
    todayCacheCreation: '今日快取建立',
    todayCacheRead: '今日快取讀取',
    todayCost: '今日費用',
    rpmTpm: 'RPM / TPM',
    totalRequests: '累計請求',
    totalInputTokens: '累計輸入',
    totalOutputTokens: '累計輸出',
    totalTokensLabel: '累計 Tokens',
    totalCacheCreation: '累計快取建立',
    totalCacheRead: '累計快取讀取',
    totalCost: '累計費用',
    avgDuration: '平均耗時',
    // Messages
    enterApiKey: '請輸入 API Key',
    querySuccess: '查詢成功',
    queryFailed: '查詢失敗',
    queryFailedRetry: '查詢失敗，請稍後重試',
    noDailyUsage: '暫無按日用量資料',
  },

  // Setup Wizard
  setup: {
    title: 'Sub2API 安裝嚮導',
    description: '初始化 Cloudflare Pages、Worker 與 D1 部署',
    cloudflare: {
      title: 'Cloudflare 環境',
      description: '檢查 Worker 是否可以訪問 D1 資料庫繫結',
      database: 'Cloudflare D1',
      databaseDescription: '儲存應用資料與執行時狀態',
      runtime: 'Pages + Worker',
      runtimeDescription: '靜態前端與邊緣 API 執行時',
      ready: 'D1 繫結可用，當前尚未建立管理員。',
      checking: '正在檢查 D1 繫結...',
      retry: '重新檢查環境',
      bindingMissing: 'Worker 無法訪問 D1，請先配置 DB binding 再執行安裝。'
    },
    admin: {
      title: '管理員賬戶',
      description: '建立您的管理員賬戶',
      email: '郵箱',
      password: '密碼',
      confirmPassword: '確認密碼',
      passwordPlaceholder: '至少 8 個字元',
      confirmPasswordPlaceholder: '確認密碼',
      passwordMismatch: '密碼不匹配'
    },
    ready: {
      title: '準備安裝',
      description: '在 Cloudflare D1 中建立首個管理員',
      platform: '執行架構',
      adminEmail: '管理員郵箱'
    },
    status: {
      installing: '安裝中...',
      completeInstallation: '完成安裝',
      completed: '安裝完成！',
      redirecting: '正在跳轉到登入頁面...',
      installFailed: '安裝失敗'
    }
  },

  // Common
}
