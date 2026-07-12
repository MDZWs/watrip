/**
 * 等级与功能特权系统
 * 职责：特权注册表、等级校验、特权列表弹窗
 * 依赖：PointsCore、Auth、UiKit、UIRender
 *
 * Phase 3.2：等级与功能特权
 * 特权列表（与产品概述对齐）：
 *   Lv4  PDF 导出
 *   Lv6  专属模板标签
 *   Lv8  个人主页装扮
 *   Lv9  专题合集创建
 *   Lv10 首页推荐加权
 *   Lv12 认证规划师标识
 *
 * 等级曲线：50 * n * (n-1)（与 PointsCore 一致）
 */
(function (global) {
  // 特权注册表（按等级升序）
  const PRIVILEGES = [
    {
      key: 'pdf_export',
      level: 4,
      name: 'PDF 导出',
      icon: '📄',
      desc: '将行程导出为 PDF 文件，方便打印或分享给同伴',
      usage: '在「行程详情」右上角点 📄 图标即可导出',
      action: () => (typeof PdfExport !== 'undefined' ? PdfExport.openTripPicker() : UiKit.toast('PDF 模块未加载', 'error')),
    },
    {
      key: 'custom_tags',
      level: 6,
      name: '专属模板标签',
      icon: '🏷️',
      desc: '为作品添加自定义标签，让别人快速识别你的风格（如「小众」「秘境」）',
      usage: '发布行程/游记时选择标签；「我的」可管理标签库',
      action: () => (typeof AdvancedPrivileges !== 'undefined' ? AdvancedPrivileges.openTagEditor() : UiKit.toast('特权模块未加载', 'error')),
    },
    {
      key: 'profile_theme',
      level: 8,
      name: '个人主页装扮',
      icon: '🎨',
      desc: '自定义主页背景与主题色，打造专属空间',
      usage: '在特权面板点「使用」选主题，主页和作者空间同步展示',
      action: () => (typeof AdvancedPrivileges !== 'undefined' ? AdvancedPrivileges.openThemePicker() : UiKit.toast('特权模块未加载', 'error')),
    },
    {
      key: 'collection_set',
      level: 9,
      name: '专题合集创建',
      icon: '📚',
      desc: '把多篇行程/游记打包成主题合集，公开策展给社区',
      usage: '社区卡片点 📚 加入合集；特权面板可创建/管理合集',
      action: () => (typeof AdvancedPrivileges !== 'undefined' ? AdvancedPrivileges.openCollections() : UiKit.toast('特权模块未加载', 'error')),
    },
    {
      key: 'homepage_boost',
      level: 10,
      name: '首页推荐加权',
      icon: '🚀',
      desc: '发布的内容在社区首页获得更高曝光排序',
      usage: '发布优质内容即可自动生效，无需手动操作',
      action: null, // 被动生效
    },
    {
      key: 'certified_badge',
      level: 12,
      name: '认证规划师标识',
      icon: '👑',
      desc: '个人主页展示「认证规划师」金色徽章',
      usage: '达到 Lv12 自动展示，无需手动操作',
      action: null, // 被动生效
    },
  ];

  // 等级名称（与 PointsLedger/ProfileModule 对齐）
  const LEVEL_NAMES = {
    1: '萌新探索者', 2: '初出茅庐', 3: '步履不停',
    4: '行走的攻略', 5: '资深旅人', 6: '城市玩家',
    7: '深度漫游者', 8: '风格主理人', 9: '合集策展人',
    10: '推荐位常客', 11: '金牌向导', 12: '认证规划师',
  };

  const LevelSystem = {
    state: {
      initialized: false,
      experienceMode: localStorage.getItem('exp_mode') === '1',
    },

    init() {
      this.state.initialized = true;
    },

    /**
     * 体验模式：开启后所有特权解锁（不影响真实等级/积分）
     * 用于让低等级用户先体验全部功能，激发升级意愿
     */
    isExperienceMode() {
      return this.state.experienceMode;
    },

    toggleExperienceMode() {
      this.state.experienceMode = !this.state.experienceMode;
      localStorage.setItem('exp_mode', this.state.experienceMode ? '1' : '0');
      // 通知 UI 刷新
      if (typeof EventBus !== 'undefined') {
        EventBus.emit('level:experience-mode-changed', { enabled: this.state.experienceMode });
      }
      return this.state.experienceMode;
    },

    /**
     * 获取等级名称
     */
    getLevelName(level) {
      return LEVEL_NAMES[level] || '传奇旅行家';
    },

    /**
     * 获取所有特权配置
     */
    getAllPrivileges() {
      return PRIVILEGES.slice();
    },

    /**
     * 获取用户已解锁的特权
     */
    getUnlockedPrivileges(level) {
      return PRIVILEGES.filter(p => p.level <= level);
    },

    /**
     * 获取下一个未解锁的特权（用于进度提示）
     */
    getNextPrivilege(level) {
      return PRIVILEGES.find(p => p.level > level) || null;
    },

    /**
     * 校验是否拥有某项特权
     * 体验模式开启时直接返回 true
     */
    hasPrivilege(privKey, level) {
      if (this.state.experienceMode) return true;
      const p = PRIVILEGES.find(x => x.key === privKey);
      if (!p) return false;
      return level >= p.level;
    },

    /**
     * 同步校验当前登录用户是否拥有某特权
     */
    checkPrivilege(privKey) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return false;
      // 体验模式开启时直接放行
      if (this.state.experienceMode) return true;
      const user = Auth.getCurrentUser();
      return this.hasPrivilege(privKey, user.level || 1);
    },

    /**
     * 要求特权：未解锁时弹提示并返回 false
     * 体验模式开启时直接放行，并提示"体验中"
     */
    requirePrivilege(privKey) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return false;
      }
      // 体验模式开启时直接放行
      if (this.state.experienceMode) {
        const p = PRIVILEGES.find(x => x.key === privKey);
        if (p && (Auth.getCurrentUser().level || 1) < p.level) {
          UiKit.toast(`🎁 体验模式：正在体验「${p.name}」`, 'info', 1800);
        }
        return true;
      }
      const user = Auth.getCurrentUser();
      const level = user.level || 1;
      const p = PRIVILEGES.find(x => x.key === privKey);
      if (!p) return false;
      if (level < p.level) {
        const needExp = this._expToLevel(p.level) - (user.exp || 0);
        UiKit.toast(`需 Lv.${p.level} 解锁「${p.name}」，还差 ${Math.max(0, needExp)} EXP`, 'info', 3000);
        return false;
      }
      return true;
    },

    /**
     * 打开特权列表弹窗
     */
    async openPrivilegesPanel() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      if (typeof PointsCore === 'undefined') {
        UiKit.toast('等级系统未就绪', 'error');
        return;
      }

      UiKit.showLoading('加载等级信息...');
      const user = Auth.getCurrentUser();
      const li = await PointsCore.getUserLevelInfo(user.id);
      UiKit.hideLoading();

      if (!li) {
        UiKit.toast('加载失败', 'error');
        return;
      }

      this._renderPanel(li);
      // Phase 3.3：查看等级特权面板触发新手任务
      if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('view_privileges');
    },

    /**
     * 渲染特权列表弹窗
     */
    _renderPanel(li) {
      const level = li.level || 1;
      const exp = li.exp || 0;
      const levelName = this.getLevelName(level);
      const nextPriv = this.getNextPrivilege(level);
      const expMode = this.state.experienceMode;

      // 顶部：等级摘要 + 体验模式标识
      const headerHtml = `
        <div class="ls-header">
          <div class="ls-header-badge">Lv.${level}</div>
          <div class="ls-header-info">
            <div class="ls-header-name">${levelName}</div>
            <div class="ls-header-exp">${exp} EXP</div>
          </div>
          ${expMode ? '<div class="ls-exp-mode-tag">🎁 体验中</div>' : ''}
        </div>
        ${expMode ? '<div class="ls-exp-mode-tip">体验模式已开启：所有特权均可试用，升级后永久解锁</div>' : ''}
      `;

      // 特权列表（体验模式下全部视为已解锁）
      const listHtml = PRIVILEGES.map(p => {
        const realUnlocked = level >= p.level;
        const unlocked = expMode || realUnlocked;
        const isNext = !expMode && nextPriv && nextPriv.key === p.key;
        const needExp = Math.max(0, this._expToLevel(p.level) - exp);

        if (unlocked) {
          // 体验模式 + 真实未解锁 → 显示"体验中"标记
          const expBadge = (expMode && !realUnlocked) ? '<span class="ls-priv-trial">🎁 体验</span>' : '';
          return `
            <div class="ls-priv-item ls-unlocked ${expMode && !realUnlocked ? 'ls-trial' : ''}" data-key="${p.key}">
              <div class="ls-priv-icon">${p.icon}</div>
              <div class="ls-priv-main">
                <div class="ls-priv-title">${p.name}<span class="ls-priv-tag">Lv.${p.level}</span>${expBadge}</div>
                <div class="ls-priv-desc">${p.desc}</div>
                <div class="ls-priv-usage">📍 ${p.usage}</div>
              </div>
              <div class="ls-priv-action">${p.action ? '<span class="ls-priv-use">使用 ›</span>' : '<span class="ls-priv-auto">已生效</span>'}</div>
            </div>
          `;
        }
        return `
          <div class="ls-priv-item ls-locked ${isNext ? 'ls-next' : ''}" data-key="${p.key}">
            <div class="ls-priv-icon">${p.icon}</div>
            <div class="ls-priv-main">
              <div class="ls-priv-title">${p.name}<span class="ls-priv-tag">Lv.${p.level}</span></div>
              <div class="ls-priv-desc">${p.desc}</div>
              <div class="ls-priv-progress">${isNext ? `还差 ${needExp} EXP 解锁` : `Lv.${p.level} 解锁`}</div>
            </div>
            <div class="ls-priv-action"><span class="ls-priv-lock">🔒</span></div>
          </div>
        `;
      }).join('');

      const html = `
        <div class="ls-wrap">
          ${headerHtml}
          <div class="ls-section-title">功能特权</div>
          <div class="ls-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('等级特权', html);

      // 绑定点击：仅已解锁且有 action 的特权响应
      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        modal.querySelectorAll('.ls-priv-item.ls-unlocked').forEach(item => {
          item.onclick = () => {
            const key = item.dataset.key;
            const p = PRIVILEGES.find(x => x.key === key);
            if (p && p.action) {
              modal.classList.remove('show');
              try { p.action(); } catch (e) { console.error('[LevelSystem] 特权执行失败:', e); }
            }
          };
        });
      }, 50);
    },

    /**
     * 计算达到某等级需要的累计经验
     */
    _expToLevel(level) {
      return 50 * level * (level - 1);
    },
  };

  global.LevelSystem = LevelSystem;
})(window);
