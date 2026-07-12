/**
 * 认证状态管理模块
 * 职责：邮箱注册/登录/登出、登录态持久化、路由守卫、登录模态框
 * 依赖：lib/supabase-client.js、shared/ui-kit.js
 * 文档：specs/community-platform-upgrade/产品概述.md、开发规范.md
 */
(function (global) {
  const { supabase, UiKit, EventBus } = global

  const Auth = {
    state: {
      user: null,        // 当前用户对象（含 profile）
      session: null,     // Supabase 会话
      loading: false,    // 操作中
      modal: null,       // 登录模态框 DOM
      resolveAuth: null, // requireAuth 的 resolve（等待登录完成）
    },

    // 初始化：监听登录态变化
    async init() {
      if (!supabase) {
        console.warn('[Auth] Supabase 未初始化，认证功能不可用')
        return
      }
      // 监听登录态变化
      supabase.auth.onAuthStateChange(async (event, session) => {
        this.state.session = session
        if (session?.user) {
          await this._loadProfile(session.user.id)
        } else {
          this.state.user = null
        }
        EventBus.emit('auth:changed', { user: this.state.user, event })
        // 若有等待登录的 Promise，登录成功时 resolve
        if (session?.user && this.state.resolveAuth) {
          this.state.resolveAuth(true)
          this.state.resolveAuth = null
          this.hideModal()
        }
      })
      // 恢复已有会话
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        this.state.session = session
        await this._loadProfile(session.user.id)
        EventBus.emit('auth:changed', { user: this.state.user, event: 'INITIAL_SESSION' })
      }
    },

    // 加载用户资料
    async _loadProfile(userId) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, points, exp, level, bio, role, storage_quota, banned_until, theme, custom_tags, created_at')
          .eq('id', userId)
          .single()
        if (error) {
          console.warn('[Auth] 加载 profiles 失败，降级使用 session 用户:', error.message)
          // 降级：用 session.user 的基本信息
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData?.session?.user) {
            const u = sessionData.session.user
            this.state.user = {
              id: u.id,
              username: u.user_metadata?.username || u.email?.split('@')[0] || '旅行者',
              avatar_url: null,
              points: 0, exp: 0, level: 1, bio: '',
              role: 'user', storage_quota: 3, banned_until: null,
            }
          }
          return
        }
        // 封禁检查
        if (data.banned_until && new Date(data.banned_until) > new Date()) {
          const until = new Date(data.banned_until)
          const untilStr = until.getFullYear() > 2098 ? '永久' : `${until.getMonth()+1}月${until.getDate()}日`
          UiKit.toast(`账号已封禁（至 ${untilStr}），请联系管理员`, 'error', 5000)
          await supabase.auth.signOut()
          this.state.user = null
          return
        }
        this.state.user = data
      } catch (e) {
        console.error('[Auth] _loadProfile 异常:', e)
      }
    },

    // 注册
    async signUp(email, password, username) {
      this.state.loading = true
      UiKit.showLoading('注册中...')
      let result
      try {
        result = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }, // 存入 user_metadata，trigger 会读取
        })
      } catch (e) {
        console.error('[Auth] signUp 异常:', e)
        UiKit.toast('网络异常，请检查后重试', 'error')
        return { error: e }
      } finally {
        UiKit.hideLoading()
        this.state.loading = false
      }
      const { data, error } = result
      if (error) {
        console.error('[Auth] signUp 错误:', error.message, error)
        // 友好错误提示
        const msg = error.message.includes('already registered')
          ? '该邮箱已注册，请直接登录'
          : error.message
        UiKit.toast(msg, 'error')
        return { error }
      }
      // Supabase 行为：
      // - 关闭 Confirm email：返回 session，自动登录
      // - 开启 Confirm email：session 为 null，需到邮箱点确认链接
      if (data.user && data.session) {
        UiKit.toast('注册成功，欢迎加入！', 'success')
      } else if (data.user && !data.session) {
        UiKit.toast('注册成功，请到邮箱点击确认链接后再登录', 'info')
        // 关闭模态框切到登录 tab
        this.hideModal()
      }
      return { data }
    },

    // 登录
    async signIn(email, password) {
      this.state.loading = true
      UiKit.showLoading('登录中...')
      let result
      try {
        result = await supabase.auth.signInWithPassword({ email, password })
      } catch (e) {
        console.error('[Auth] signIn 异常:', e)
        UiKit.toast('网络异常，请检查后重试', 'error')
        return { error: e }
      } finally {
        UiKit.hideLoading()
        this.state.loading = false
      }
      const { data, error } = result
      if (error) {
        console.error('[Auth] signIn 错误:', error.message, error)
        let msg
        if (error.message.includes('Email not confirmed')) {
          msg = '邮箱未确认，请到注册邮箱点击确认链接后再登录（或在 Supabase 后台关闭 Confirm email）'
        } else if (error.message.includes('Invalid credentials')) {
          msg = '邮箱或密码错误'
        } else {
          msg = error.message
        }
        UiKit.toast(msg, 'error')
        return { error }
      }
      UiKit.toast('登录成功', 'success')
      return { data }
    },

    // 一键登录 Demo 满级账号（demo@trip.com / demo123456）
    // 若未注册则自动注册，trigger 会自动升级为 Lv12 管理员
    async signInDemo() {
      const DEMO_EMAIL = 'demo@trip.com'
      const DEMO_PASSWORD = 'demo123456'
      this.state.loading = true
      UiKit.showLoading('正在登录 Demo 满级账号...')
      try {
        // 1. 先尝试登录
        let { data, error } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        })
        // 2. 登录失败（账号不存在）→ 自动注册
        // Supabase 返回 "Invalid login credentials"，兼容旧版 "Invalid credentials"
        if (error && (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials'))) {
          UiKit.showLoading('首次使用，正在创建 Demo 账号...')
          const reg = await supabase.auth.signUp({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            options: { data: { username: 'Demo 满级体验官' } },
          })
          if (reg.error) {
            UiKit.toast('Demo 账号创建失败：' + reg.error.message, 'error', 4000)
            return { error: reg.error }
          }
          // 注册成功后 trigger 自动升级，重新加载 profile 即可
          data = reg.data
          error = null
        }
        if (error) {
          UiKit.toast('Demo 登录失败：' + error.message, 'error', 4000)
          return { error }
        }
        // 3. 重新加载 profile（确保拿到 trigger 升级后的满级数据）
        if (data.user) {
          await this._loadProfile(data.user.id)
          // 再次刷新以拿到最新 level/role（trigger 可能稍延迟）
          setTimeout(() => {
            if (this.state.user) this._loadProfile(this.state.user.id)
          }, 500)
        }
        UiKit.toast('🎉 已登录 Demo 满级账号，可体验全部功能', 'success', 3000)
        this.hideModal()
        return { data }
      } catch (e) {
        console.error('[Auth] signInDemo 异常:', e)
        UiKit.toast('网络异常，请检查后重试', 'error')
        return { error: e }
      } finally {
        UiKit.hideLoading()
        this.state.loading = false
      }
    },

    // 登出
    async signOut() {
      const ok = await UiKit.confirm('确定要退出登录吗？', { title: '退出登录' })
      if (!ok) return
      UiKit.showLoading('退出中...')
      const { error } = await supabase.auth.signOut()
      UiKit.hideLoading()
      if (error) {
        UiKit.toast('退出失败，请重试', 'error')
        return
      }
      this.state.user = null
      this.state.session = null
      UiKit.toast('已退出登录', 'info')
      EventBus.emit('auth:logout', {})
    },

    // 获取当前用户
    getCurrentUser() {
      return this.state.user
    },

    // 是否已登录
    isLoggedIn() {
      return !!this.state.user
    },

    // 是否管理员
    isAdmin() {
      return this.state.user?.role === 'admin'
    },

    // 路由守卫：需要登录时调用，返回 Promise<boolean>
    // 未登录则弹模态框，登录成功后 resolve(true)
    requireAuth() {
      if (this.isLoggedIn()) return Promise.resolve(true)
      return new Promise(resolve => {
        this.state.resolveAuth = resolve
        this.showModal()
      })
    },

    // ===== 登录/注册模态框 =====

    showModal() {
      if (this.state.modal) {
        this.state.modal.classList.add('ui-modal-show')
        return
      }
      this._buildModal()
      document.body.appendChild(this.state.modal)
      requestAnimationFrame(() => this.state.modal.classList.add('ui-modal-show'))
    },

    hideModal() {
      if (!this.state.modal) return
      this.state.modal.classList.remove('ui-modal-show')
    },

    _buildModal() {
      const mask = document.createElement('div')
      mask.className = 'ui-modal-mask auth-modal-mask'
      mask.innerHTML = `
        <div class="auth-modal">
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="signin">登录</button>
            <button class="auth-tab" data-tab="signup">注册</button>
          </div>
          <div class="auth-content">
            <!-- 登录表单 -->
            <form class="auth-form auth-form-signin active" data-form="signin">
              <input class="auth-input" type="email" name="email" placeholder="邮箱" required autocomplete="email">
              <input class="auth-input" type="password" name="password" placeholder="密码" required autocomplete="current-password">
              <button class="auth-submit" type="submit">登录</button>
            </form>
            <!-- 注册表单 -->
            <form class="auth-form auth-form-signup" data-form="signup">
              <input class="auth-input" type="text" name="username" placeholder="用户名（昵称）" required maxlength="20">
              <input class="auth-input" type="email" name="email" placeholder="邮箱" required autocomplete="email">
              <input class="auth-input" type="password" name="password" placeholder="密码（至少6位）" required minlength="6" autocomplete="new-password">
              <button class="auth-submit" type="submit">注册</button>
            </form>
          </div>
          <div class="auth-footer">登录后可发布行程、关注创作者、打卡吐槽</div>
          <button class="auth-demo-btn" type="button">🎮 一键体验满级 Demo 账号</button>
          <button class="auth-close" aria-label="关闭">×</button>
        </div>`

      // tab 切换
      mask.querySelectorAll('.auth-tab').forEach(tab => {
        tab.onclick = () => {
          const t = tab.dataset.tab
          mask.querySelectorAll('.auth-tab').forEach(x => x.classList.toggle('active', x === tab))
          mask.querySelector('.auth-form-signin').classList.toggle('active', t === 'signin')
          mask.querySelector('.auth-form-signup').classList.toggle('active', t === 'signup')
        }
      })

      // 登录提交
      mask.querySelector('[data-form="signin"]').onsubmit = async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target)
        await this.signIn(fd.get('email'), fd.get('password'))
      }

      // 注册提交
      mask.querySelector('[data-form="signup"]').onsubmit = async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target)
        await this.signUp(fd.get('email'), fd.get('password'), fd.get('username'))
      }

      // Demo 一键体验按钮
      mask.querySelector('.auth-demo-btn').onclick = () => this.signInDemo()

      // 关闭
      mask.querySelector('.auth-close').onclick = () => {
        this.hideModal()
        if (this.state.resolveAuth) {
          this.state.resolveAuth(false)
          this.state.resolveAuth = null
        }
      }
      mask.onclick = (e) => {
        if (e.target === mask) {
          this.hideModal()
          if (this.state.resolveAuth) {
            this.state.resolveAuth(false)
            this.state.resolveAuth = null
          }
        }
      }

      this.state.modal = mask
    },
  }

  global.Auth = Auth
})(window)
