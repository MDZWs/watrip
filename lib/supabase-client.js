/**
 * Supabase 客户端初始化与单例
 * 职责：初始化 Supabase 客户端，导出全局 supabase 实例供各模块使用
 * 依赖：@supabase/supabase-js（CDN 引入）、js/config.js
 * 文档：specs/community-platform-upgrade/技术栈.md
 */
(function (global) {
  const { CONFIG } = global

  // 校验配置是否就绪
  if (!CONFIG || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.warn('[SupabaseClient] 未配置 SUPABASE_URL 或 SUPABASE_ANON_KEY，社区功能暂不可用。请在 js/config.js 填入。')
    global.supabase = null
    return
  }

  // Supabase CDN（@supabase/supabase-js@2）加载后，库对象挂在 window.supabase，
  // 其中包含 createClient 方法。先取出方法，再用客户端实例覆盖 window.supabase
  const supabaseLib = global.supabase
  if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
    console.error('[SupabaseClient] Supabase CDN 未加载，请检查 index.html 中 <script src="...supabase-js"> 标签')
    global.supabase = null
    return
  }
  const { createClient } = supabaseLib
  const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,   // 登录态持久化（localStorage）
      autoRefreshToken: true, // 自动刷新 token
    },
    realtime: {
      params: { eventsPerSecond: 5 }, // 实时推送频率限制
    },
  })

  global.supabase = client
  console.log('[SupabaseClient] 初始化完成')
})(window)
