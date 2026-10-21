export default {
  batchImageGuide: {
    title: '图片批量生成',
    description: '一次提交多条提示词，任务完成后可统一下载图片结果'
  },
  // Home Page
  home: {
    badge: 'Cloudflare 边缘多模态 AI 聚合中继网关',
    viewOnGithub: '在 GitHub 上查看',
    viewDocs: '查看文档',
    docs: '开发者文档',
    switchToLight: '切换到浅色模式',
    switchToDark: '切换到深色模式',
    dashboard: '控制台',
    login: '登录账号',
    getStarted: '立即开始使用',
    goToDashboard: '进入控制台',
    heroTitle1: '全平台 AI 服务',
    heroTitle2: '一站式聚合中继网关',
    heroSubtitle: '一个密钥，畅用全球顶级 AI 模型',
    heroDescription: '为开发者与团队打造的无服务器 AI API 路由中心。告别多账号混乱与单点故障，一个 API Key 畅享 Claude、GPT、DeepSeek、Gemini、Grok 等主流 AI 服务。',
    tags: {
      subscriptionToApi: '订阅转 API',
      stickySession: '会话保持',
      realtimeBilling: '按量计费'
    },
    pillTags: {
      edge: '边缘智能路由',
      sticky: '会话保持 (Sticky Session)',
      billing: '精准按量计费',
      multi: '多账号自动负载均衡'
    },
    stats: {
      slaTitle: '可用率保证',
      slaDesc: '全球 300+ 边缘节点覆盖',
      latencyTitle: '极速边缘响应',
      latencyDesc: '智能路由，零冷启动延迟',
      modelsTitle: '顶级模型支持',
      modelsDesc: 'Claude, GPT, DeepSeek, Gemini',
      serverlessTitle: 'Serverless 全托管',
      serverlessDesc: '高并发架构，安全无忧'
    },
    terminal: {
      title: '实时 API 调用演示',
      tabCurl: 'cURL',
      tabPython: 'Python SDK',
      tabNode: 'Node.js',
      copy: '复制代码',
      copied: '已复制！',
      streamSim: '流式响应模拟中...'
    },
    bento: {
      badge: 'CORE FEATURES',
      title: '强大核心特性，赋能极致 AI 体验',
      subtitle: '专为高可用、低延迟与灵活计费场景设计的现代化边缘网关架构',
      card1Title: '智能账号池与自动故障转移',
      card1Desc: '多个上游账号自动轮询与动态负载均衡，实时监控健康状态，告别 Rate Limit 频繁报错。',
      card2Title: '精准上下文会话保持',
      card2Desc: '独创 Sticky Session 机制，确保多轮对话精准命中同一上游会话，长上下文不丢失。',
      card3Title: '多维度配额与实时计费',
      card3Desc: '精确到 Token 级别的实时扣费与用量统计，支持自定义日额度、RPM/TPM 限流与充值扣费。',
      card4Title: '100% 格式标准兼容',
      card4Desc: '全面兼容 OpenAI / Claude 标准接口，NextChat、LobeChat、Cursor、Chatbox 即插即用。'
    },
    quickStart: {
      badge: 'HOW IT WORKS',
      title: '简单 3 步，极速接入',
      subtitle: '无论是个人探索还是团队业务，只需几秒钟即可开始使用',
      step1Title: '1. 注册账号',
      step1Desc: '创建账户并登录系统后台，获取专属 API 访问密钥。',
      step2Title: '2. 配置 Base URL',
      step2Desc: '在您喜爱的 AI 客户端或项目中，将 API 端点指向本站。',
      step3Title: '3. 畅享顶级 AI',
      step3Desc: '立即使用 Claude 3.7、GPT-4o、DeepSeek R1 等多种旗舰模型。'
    },
    painPoints: {
      title: '你是否也遇到这些问题？',
      items: {
        expensive: {
          title: '订阅费用高',
          desc: '每个 AI 服务都要单独订阅，每月支出越来越多'
        },
        complex: {
          title: '多账号难管理',
          desc: '不同平台的账号、密钥分散各处，管理起来很麻烦'
        },
        unstable: {
          title: '服务不稳定',
          desc: '单一账号容易触发限制，影响正常使用'
        },
        noControl: {
          title: '用量无法控制',
          desc: '不知道钱花在哪了，也无法限制团队成员的使用'
        }
      }
    },
    solutions: {
      title: '我们帮你解决',
      subtitle: '简单三步，开始省心使用 AI'
    },
    features: {
      unifiedGateway: '一键接入',
      unifiedGatewayDesc: '获取一个 API 密钥，即可调用所有已接入的 AI 模型，无需分别申请。',
      multiAccount: '稳定可靠',
      multiAccountDesc: '智能调度多个上游账号，自动切换和负载均衡，告别频繁报错。',
      balanceQuota: '用多少付多少',
      balanceQuotaDesc: '按实际使用量计费，支持设置配额上限，团队用量一目了然。'
    },
    comparison: {
      title: '为什么选择我们？',
      headers: {
        feature: '对比项',
        official: '官方订阅',
        us: '本平台'
      },
      items: {
        pricing: {
          feature: '付费方式',
          official: '固定月费，用不完也付',
          us: '按量付费，用多少付多少'
        },
        models: {
          feature: '模型选择',
          official: '单一服务商',
          us: '多模型随意切换'
        },
        management: {
          feature: '账号管理',
          official: '每个服务单独管理',
          us: '统一密钥，一站管理'
        },
        stability: {
          feature: '服务稳定性',
          official: '单账号易触发限制',
          us: '多账号池，自动切换'
        },
        control: {
          feature: '用量控制',
          official: '无法限制',
          us: '可设配额、查明细'
        }
      }
    },
    providers: {
      badge: 'ECOSYSTEM',
      title: '已支持的旗舰 AI 模型',
      description: '全面支持各大顶级大语言模型与多模态推理 API',
      supported: '已支持',
      active: '在线服务',
      soon: '即将推出',
      claude: 'Claude 3.7 / 3.5',
      gpt: 'GPT-4o / o3-mini',
      deepseek: 'DeepSeek V3 / R1',
      gemini: 'Gemini 2.0 Flash / Pro',
      grok: 'Grok 3 / 2',
      antigravity: 'Antigravity Multi-Agent',
      more: '更多模型'
    },
    modes: {
      developer: '个人开发者',
      developerDesc: '一个 API Key 直连主流顶级模型，极简设定，即刻开工。',
      team: '团队与企业',
      teamDesc: '多账号池自动负载均衡、成员配额管理与实时用量审计。'
    },
    faq: {
      badge: 'FAQ',
      title: '还有疑问？',
      subtitle: '关于账号安全、会话保持与计费，最多开发者关心的核心问题。',
      items: [
        {
          q: 'Sub2API 如何保障我的 API Key 与账号安全？',
          a: '所有上游凭证与 API Key 均存储于 Cloudflare 边缘加密环境中，请求通过安全专线转发，绝不记录敏感对话内容。'
        },
        {
          q: '支持哪些主流 AI 客户端与开发工具？',
          a: '100% 兼容 OpenAI 与 Claude 标准格式，支持 NextChat、LobeChat、Cursor、Claude Dev、Chatbox 及各语言 SDK。'
        },
        {
          q: '什么是 Sticky Session 会话保持？',
          a: '在多轮对话中，系统自动将同一个上下文锁定在同一个上游会话，避免上下文切换导致的记忆丢失或重复计费。'
        },
        {
          q: '如果某个上游账号触发 Rate Limit 限流怎么办？',
          a: '智能账号池具备实时自动故障转移（Auto-Failover）机制，0 延迟自动无缝切换至健康账号，保证业务永不中断。'
        }
      ]
    },
    cta: {
      title: '准备好升级您的 AI 工作流了吗？',
      description: '立即注册获取体验额度，开启极速、高可用的 AI API 聚合之旅。',
      button: '免费注册体验',
      secondaryBtn: '阅读接入文档'
    },
    footer: {
      allRightsReserved: '保留所有权利。',
      builtWith: '基于 Cloudflare Workers & D1 构建'
    }
  },

  // Key Usage Query Page
  keyUsage: {
    title: 'API Key 用量查询',
    subtitle: '输入您的 API Key 以查看实时消费金额与使用状态',
    placeholder: 'sk-ant-mirror-xxxxxxxxxxxx',
    query: '查询',
    querying: '查询中...',
    privacyNote: '您的 Key 仅在浏览器本地处理，不会被存储',
    dateRange: '统计范围:',
    dateRangeToday: '今日',
    dateRange7d: '7 天',
    dateRange30d: '30 天',
    dateRange90d: '90 天',
    dateRangeCustom: '自定义',
    apply: '应用',
    used: '已使用',
    detailInfo: '详细信息',
    tokenStats: 'Token 统计',
    dailyDetail: '按日明细',
    modelStats: '模型用量统计',
    // Table headers
    date: '日期',
    model: '模型',
    requests: '请求数',
    inputTokens: '输入 Tokens',
    outputTokens: '输出 Tokens',
    cacheCreationTokens: '缓存创建',
    cacheReadTokens: '缓存读取',
    cacheWriteTokens: '缓存写入',
    totalTokens: '总 Tokens',
    cost: '费用',
    // Status
    quotaMode: 'Key 限额模式',
    walletBalance: '钱包余额',
    // Ring card titles
    totalQuota: '总额度',
    limit5h: '5 小时限额',
    limitDaily: '日限额',
    limit7d: '7 天限额',
    limitWeekly: '周限额',
    limitMonthly: '月限额',
    // Detail rows
    remainingQuota: '剩余额度',
    expiresAt: '过期时间',
    todayExpires: '(今日到期)',
    daysLeft: '({days} 天)',
    usedQuota: '已用额度',
    resetNow: '即将重置',
    subscriptionType: '订阅类型',
    subscriptionExpires: '订阅到期',
    // Usage stat cells
    todayRequests: '今日请求',
    todayInputTokens: '今日输入',
    todayOutputTokens: '今日输出',
    todayTokens: '今日 Tokens',
    todayCacheCreation: '今日缓存创建',
    todayCacheRead: '今日缓存读取',
    todayCost: '今日费用',
    rpmTpm: 'RPM / TPM',
    totalRequests: '累计请求',
    totalInputTokens: '累计输入',
    totalOutputTokens: '累计输出',
    totalTokensLabel: '累计 Tokens',
    totalCacheCreation: '累计缓存创建',
    totalCacheRead: '累计缓存读取',
    totalCost: '累计费用',
    avgDuration: '平均耗时',
    // Messages
    enterApiKey: '请输入 API Key',
    querySuccess: '查询成功',
    queryFailed: '查询失败',
    queryFailedRetry: '查询失败，请稍后重试',
    noDailyUsage: '暂无按日用量数据',
  },

  // Setup Wizard
  setup: {
    title: 'Sub2API 安装向导',
    description: '初始化 Cloudflare Pages、Worker 与 D1 部署',
    cloudflare: {
      title: 'Cloudflare 环境',
      description: '检查 Worker 是否可以访问 D1 数据库绑定',
      database: 'Cloudflare D1',
      databaseDescription: '保存应用数据与运行时状态',
      runtime: 'Pages + Worker',
      runtimeDescription: '静态前端与边缘 API 运行时',
      ready: 'D1 绑定可用，当前尚未创建管理员。',
      checking: '正在检查 D1 绑定...',
      retry: '重新检查环境',
      bindingMissing: 'Worker 无法访问 D1，请先配置 DB binding 再执行安装。'
    },
    admin: {
      title: '管理员账户',
      description: '创建您的管理员账户',
      email: '邮箱',
      password: '密码',
      confirmPassword: '确认密码',
      passwordPlaceholder: '至少 8 个字符',
      confirmPasswordPlaceholder: '确认密码',
      passwordMismatch: '密码不匹配'
    },
    ready: {
      title: '准备安装',
      description: '在 Cloudflare D1 中创建首个管理员',
      platform: '运行架构',
      adminEmail: '管理员邮箱'
    },
    status: {
      installing: '安装中...',
      completeInstallation: '完成安装',
      completed: '安装完成！',
      redirecting: '正在跳转到登录页面...',
      installFailed: '安装失败'
    }
  },

  // Common
}
