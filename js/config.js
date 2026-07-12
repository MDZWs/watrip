const CONFIG = {
    QWEN_API_KEY: 'sk-330a34f118dd4f3bad3a070489fd4af4',
    QWEN_API_URL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    QWEN_STREAM_URL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    MODEL_NAME: 'qwen-plus',
    SENIVERSE_PUBLIC_KEY: 'PzBG4j-kOglKOJJS3',
    SENIVERSE_PRIVATE_KEY: 'SRZz_ZK6Jio9lg254',
    AMAP_KEY: 'f517b3497f7c40a755d595fd8038156b', // 前端 JS SDK Key
    AMAP_SECURITY_CODE: '5f290fd779b59f96702437f97175c478',
    // 后端 Web 服务 Key（需要在高德开放平台单独申请「Web服务」类型的Key）
    // 如果没有，后端POI搜索会失败，但会降级到AI生成的POI
    AMAP_WEB_KEY: '', // TODO: 填入高德 Web 服务 REST API Key
    DEFAULT_CENTER: { lng: 121.4737, lat: 31.2304 },
    GEOCODE_CONCURRENCY: 3,
    ROUTE_ANIMATION_SPEED: 500,
    ENABLE_STREAM: true,
    // ===== 社区化升级：Supabase 配置（Phase 1.1 启用）=====
    // 在 Supabase 控制台获取，publishable key 可安全用于前端
    SUPABASE_URL: 'https://ukewdoylxktovrtywcyv.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_zu36X0ptt8ovR1c83BG2bg_4g7PkY0S', // publishable key（前端安全）
};

window._AMapSecurityConfig = {
    securityJsCode: CONFIG.AMAP_SECURITY_CODE,
};

// 显式挂载到 window，供 lib/ 和 shared/ 中的 IIFE 模块通过 global.CONFIG 访问
// （const 声明不会自动挂到 window，仅 var 会）
window.CONFIG = CONFIG;
