export default {
  batchImageGuide: {
    title: 'Batch Image Generation',
    description: 'Submit multiple prompts in one job and download the generated images when complete'
  },
  // Home Page
  home: {
    badge: 'Cloudflare Edge Multi-Modal AI Gateway & Relay',
    viewOnGithub: 'View on GitHub',
    viewDocs: 'View Documentation',
    docs: 'Documentation',
    switchToLight: 'Switch to Light Mode',
    switchToDark: 'Switch to Dark Mode',
    dashboard: 'Dashboard',
    login: 'Login',
    getStarted: 'Get Started Free',
    goToDashboard: 'Go to Dashboard',
    heroTitle1: 'Unified AI Services',
    heroTitle2: 'Next-Gen Edge API Gateway',
    heroSubtitle: 'One Key, All AI Models at Your Fingertips',
    heroDescription: 'A modern serverless AI routing hub built for developers and teams. Eliminate multi-account chaos and single points of failure with a unified API key for Claude, GPT, DeepSeek, Gemini, and Grok.',
    tags: {
      subscriptionToApi: 'Subscription to API',
      stickySession: 'Session Persistence',
      realtimeBilling: 'Pay As You Go'
    },
    pillTags: {
      edge: 'Edge Smart Routing',
      sticky: 'Sticky Session Persistence',
      billing: 'Real-time Accurate Billing',
      multi: 'Multi-Account Auto Load Balancing'
    },
    stats: {
      slaTitle: 'High Availability SLA',
      slaDesc: '300+ Edge Nodes Worldwide',
      latencyTitle: 'Ultra-Low Edge Latency',
      latencyDesc: 'Smart routing, zero cold starts',
      modelsTitle: 'Top Tier Models',
      modelsDesc: 'Claude, GPT, DeepSeek, Gemini',
      serverlessTitle: '100% Serverless',
      serverlessDesc: 'High concurrency, fully managed'
    },
    terminal: {
      title: 'Live API Interactive Demo',
      tabCurl: 'cURL',
      tabPython: 'Python SDK',
      tabNode: 'Node.js',
      copy: 'Copy Code',
      copied: 'Copied!',
      streamSim: 'Simulating live streaming response...'
    },
    bento: {
      badge: 'CORE FEATURES',
      title: 'Powerful Capabilities for Seamless AI Integration',
      subtitle: 'Engineered for extreme reliability, low latency, and granular cost control',
      card1Title: 'Smart Account Pool & Auto Failover',
      card1Desc: 'Automated round-robin and dynamic load balancing across upstream accounts. Eliminate rate limit spikes.',
      card2Title: 'Precision Context Session Persistence',
      card2Desc: 'Proprietary Sticky Session routing keeps multi-turn conversations anchored to the optimal upstream account.',
      card3Title: 'Granular Quota & Real-time Billing',
      card3Desc: 'Token-level accurate deduction and usage analytics. Set daily limits, RPM/TPM thresholds, and balance top-ups.',
      card4Title: '100% API Protocol Compatibility',
      card4Desc: 'Seamless drop-in replacement for standard OpenAI and Claude endpoints. Compatible with NextChat, LobeChat, Cursor, and Chatbox.'
    },
    quickStart: {
      badge: 'HOW IT WORKS',
      title: 'Get Started in 3 Easy Steps',
      subtitle: 'Go from sign-up to your first API request in less than a minute',
      step1Title: '1. Create Account',
      step1Desc: 'Sign up and access your dashboard to obtain your dedicated API token.',
      step2Title: '2. Set Base URL',
      step2Desc: 'Point the endpoint to this gateway in your preferred client or codebase.',
      step3Title: '3. Call Any Model',
      step3Desc: 'Instantly access Claude 3.7, GPT-4o, DeepSeek R1, and more.'
    },
    painPoints: {
      title: 'Sound Familiar?',
      items: {
        expensive: {
          title: 'High Subscription Costs',
          desc: 'Paying for multiple AI subscriptions that add up every month'
        },
        complex: {
          title: 'Account Chaos',
          desc: 'Managing scattered accounts and API keys across different platforms'
        },
        unstable: {
          title: 'Service Interruptions',
          desc: 'Single accounts hitting rate limits and disrupting your workflow'
        },
        noControl: {
          title: 'No Usage Control',
          desc: "Can't track where your money goes or limit team member usage"
        }
      }
    },
    solutions: {
      title: 'We Solve These Problems',
      subtitle: 'Three simple steps to stress-free AI access'
    },
    features: {
      unifiedGateway: 'One-Click Access',
      unifiedGatewayDesc: 'Get a single API key to call all connected AI models. No separate applications needed.',
      multiAccount: 'Always Reliable',
      multiAccountDesc: 'Smart routing across multiple upstream accounts with automatic failover. Say goodbye to errors.',
      balanceQuota: 'Pay What You Use',
      balanceQuotaDesc: 'Usage-based billing with quota limits. Full visibility into team consumption.'
    },
    comparison: {
      title: 'Why Choose Us?',
      headers: {
        feature: 'Comparison',
        official: 'Official Subscriptions',
        us: 'Our Platform'
      },
      items: {
        pricing: {
          feature: 'Pricing',
          official: 'Fixed monthly fee, pay even if unused',
          us: 'Pay only for what you use'
        },
        models: {
          feature: 'Model Selection',
          official: 'Single provider only',
          us: 'Switch between models freely'
        },
        management: {
          feature: 'Account Management',
          official: 'Manage each service separately',
          us: 'Unified key, one dashboard'
        },
        stability: {
          feature: 'Stability',
          official: 'Single account rate limits',
          us: 'Multi-account pool, auto-failover'
        },
        control: {
          feature: 'Usage Control',
          official: 'Not available',
          us: 'Quotas & detailed analytics'
        }
      }
    },
    providers: {
      badge: 'ECOSYSTEM',
      title: 'Supported Flagship AI Models',
      description: 'Comprehensive integration with global leading LLMs and multi-modal models',
      supported: 'Supported',
      active: 'Online',
      soon: 'Coming Soon',
      claude: 'Claude 3.7 / 3.5',
      gpt: 'GPT-4o / o3-mini',
      deepseek: 'DeepSeek V3 / R1',
      gemini: 'Gemini 2.0 Flash / Pro',
      grok: 'Grok 3 / 2',
      antigravity: 'Antigravity Multi-Agent',
      more: 'More Models'
    },
    modes: {
      developer: 'Developers',
      developerDesc: 'Direct API key access to top models with zero friction.',
      team: 'Teams & Enterprise',
      teamDesc: 'Multi-account pooling, quota controls, and real-time usage audits.'
    },
    faq: {
      badge: 'FAQ',
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about security, persistence, and reliability.',
      items: [
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
    },
    cta: {
      title: 'Ready to Upgrade Your AI Workflow?',
      description: 'Sign up now to experience ultra-fast, high-availability AI API relay on the edge.',
      button: 'Get Started Free',
      secondaryBtn: 'View Documentation'
    },
    footer: {
      allRightsReserved: 'All rights reserved.',
      builtWith: 'Powered by Cloudflare Workers & D1'
    }
  },

  // Key Usage Query Page
  keyUsage: {
    title: 'API Key Usage',
    subtitle: 'Enter your API Key to view real-time spending and usage status',
    placeholder: 'sk-ant-mirror-xxxxxxxxxxxx',
    query: 'Query',
    querying: 'Querying...',
    privacyNote: 'Your Key is processed locally in the browser and will not be stored',
    dateRange: 'Date Range:',
    dateRangeToday: 'Today',
    dateRange7d: '7 Days',
    dateRange30d: '30 Days',
    dateRange90d: '90 Days',
    dateRangeCustom: 'Custom',
    apply: 'Apply',
    used: 'Used',
    detailInfo: 'Detail Information',
    tokenStats: 'Token Statistics',
    dailyDetail: 'Daily Detail',
    modelStats: 'Model Usage Statistics',
    // Table headers
    date: 'Date',
    model: 'Model',
    requests: 'Requests',
    inputTokens: 'Input Tokens',
    outputTokens: 'Output Tokens',
    cacheCreationTokens: 'Cache Creation',
    cacheReadTokens: 'Cache Read',
    cacheWriteTokens: 'Cache Write',
    totalTokens: 'Total Tokens',
    cost: 'Cost',
    // Status
    quotaMode: 'Key Quota Mode',
    walletBalance: 'Wallet Balance',
    // Ring card titles
    totalQuota: 'Total Quota',
    limit5h: '5-Hour Limit',
    limitDaily: 'Daily Limit',
    limit7d: '7-Day Limit',
    limitWeekly: 'Weekly Limit',
    limitMonthly: 'Monthly Limit',
    // Detail rows
    remainingQuota: 'Remaining Quota',
    expiresAt: 'Expires At',
    todayExpires: '(expires today)',
    daysLeft: '({days} days)',
    usedQuota: 'Used Quota',
    resetNow: 'Resetting soon',
    subscriptionType: 'Subscription Type',
    subscriptionExpires: 'Subscription Expires',
    // Usage stat cells
    todayRequests: 'Today Requests',
    todayInputTokens: 'Today Input',
    todayOutputTokens: 'Today Output',
    todayTokens: 'Today Tokens',
    todayCacheCreation: 'Today Cache Creation',
    todayCacheRead: 'Today Cache Read',
    todayCost: 'Today Cost',
    rpmTpm: 'RPM / TPM',
    totalRequests: 'Total Requests',
    totalInputTokens: 'Total Input',
    totalOutputTokens: 'Total Output',
    totalTokensLabel: 'Total Tokens',
    totalCacheCreation: 'Total Cache Creation',
    totalCacheRead: 'Total Cache Read',
    totalCost: 'Total Cost',
    avgDuration: 'Avg Duration',
    // Messages
    enterApiKey: 'Please enter an API Key',
    querySuccess: 'Query successful',
    queryFailed: 'Query failed',
    queryFailedRetry: 'Query failed, please try again later',
    noDailyUsage: 'No daily usage data',
  },

  // Setup Wizard
  setup: {
    title: 'Sub2API Setup',
    description: 'Initialize the Cloudflare Pages, Worker, and D1 deployment',
    cloudflare: {
      title: 'Cloudflare Environment',
      description: 'Verify that the Worker can access its D1 database binding',
      database: 'Cloudflare D1',
      databaseDescription: 'Persistent application data and runtime state',
      runtime: 'Pages + Worker',
      runtimeDescription: 'Static frontend and edge API runtime',
      ready: 'The D1 binding is ready and no administrator exists yet.',
      checking: 'Checking D1 binding...',
      retry: 'Check environment again',
      bindingMissing: 'The Worker cannot access D1. Configure the DB binding before installation.'
    },
    admin: {
      title: 'Admin Account',
      description: 'Create your administrator account',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      passwordPlaceholder: 'Min 8 characters',
      confirmPasswordPlaceholder: 'Confirm password',
      passwordMismatch: 'Passwords do not match'
    },
    ready: {
      title: 'Ready to Install',
      description: 'Create the first administrator in Cloudflare D1',
      platform: 'Runtime',
      adminEmail: 'Admin Email'
    },
    status: {
      installing: 'Installing...',
      completeInstallation: 'Complete Installation',
      completed: 'Installation completed!',
      redirecting: 'Redirecting to login page...',
      installFailed: 'Installation failed'
    }
  },

  // Common
}
