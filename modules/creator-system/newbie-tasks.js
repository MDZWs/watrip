/**
 * 新手任务引导系统
 * 职责：13 个新手任务定义、完成校验、EXP 发放、任务面板
 * 依赖：Auth、PointsCore、UiKit、UIRender、EventBus、AIMemory
 *
 * Phase 3.3：新手任务引导
 * 设计原则：
 *   - 任务总 EXP ≈ 345，配合自然互动即可解锁 Lv4 PDF 导出（600 EXP）
 *   - 三套机制不挂钩：任务 EXP 仅灌入成长体系，不影响道具/投票
 *   - 幂等：重复触发已完成任务不会重复发奖
 *   - 任务表：user_tasks (user_id, task_key, completed_at)
 */
(function (global) {
  // 13 个新手任务（按推荐完成顺序）
  const TASKS = [
    // ===== 入门篇 (4 项, 80 EXP) =====
    { key: 'first_plan',     category: '入门', icon: '✨', title: '完成首次 AI 行程规划', desc: '让 AI 帮你生成第一段行程', exp: 20 },
    { key: 'first_save',     category: '入门', icon: '☁️', title: '保存行程到云端',     desc: '行程自动同步到 Supabase 云端', exp: 25 },
    { key: 'first_expense',  category: '入门', icon: '💰', title: '记录一笔花费',       desc: '在行程中使用记账功能', exp: 15 },
    { key: 'view_map',       category: '入门', icon: '🗺️', title: '查看行程地图模式',   desc: '在行程详情切换到地图视图', exp: 20 },
    // ===== 社区篇 (5 项, 105 EXP) =====
    { key: 'visit_community',category: '社区', icon: '👥', title: '浏览社区首页',       desc: '看看其他旅行者的精彩旅程', exp: 15 },
    { key: 'view_template',  category: '社区', icon: '📋', title: '查看他人行程模板',   desc: '点开任意一篇社区行程预览', exp: 20 },
    { key: 'apply_template', category: '社区', icon: '🎯', title: '套用他人行程模板',   desc: '将别人的行程一键套用为自己的', exp: 30 },
    { key: 'view_note',      category: '社区', icon: '📖', title: '浏览一篇图文游记',   desc: '阅读其他创作者的游记', exp: 20 },
    { key: 'first_like',     category: '社区', icon: '❤️', title: '点赞一篇内容',       desc: '为喜欢的内容点个赞', exp: 20 },
    // ===== 创作篇 (4 项, 160 EXP) =====
    { key: 'publish_trip',   category: '创作', icon: '📤', title: '发布一篇行程模板',   desc: '将自己的行程发布到社区', exp: 50 },
    { key: 'publish_note',   category: '创作', icon: '✍️', title: '发布一篇图文游记',   desc: '用富文本编辑器写一篇游记', exp: 50 },
    { key: 'complete_profile',category: '创作', icon: '👤', title: '完善个人资料',       desc: '设置头像与个性简介', exp: 25 },
    { key: 'view_privileges',category: '创作', icon: '🎖️', title: '查看等级特权面板',   desc: '了解各等级解锁的特权', exp: 20 },
  ];

  const TOTAL_EXP = TASKS.reduce((s, t) => s + t.exp, 0);

  const NewbieTasks = {
    state: {
      completed: new Set(),  // 已完成任务 key 集合
      loaded: false,
      loading: false,
    },

    /**
     * 初始化：加载当前用户已完成任务
     */
    async init() {
      if (this.state.loaded || this.state.loading) return;
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
      this.state.loading = true;
      try {
        const user = Auth.getCurrentUser();
        const { data } = await supabase
          .from('user_tasks')
          .select('task_key')
          .eq('user_id', user.id);
        (data || []).forEach(r => this.state.completed.add(r.task_key));
        this.state.loaded = true;
      } catch (e) {
        console.warn('[NewbieTasks] 加载失败:', e);
      } finally {
        this.state.loading = false;
      }
    },

    /**
     * 重置状态（登出时调用）
     */
    reset() {
      this.state.completed.clear();
      this.state.loaded = false;
    },

    /**
     * 触发任务完成（幂等）
     * @param {string} taskKey - 任务 key
     */
    async trigger(taskKey) {
      const task = TASKS.find(t => t.key === taskKey);
      if (!task) return;
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
      if (this.state.completed.has(taskKey)) return; // 已完成，幂等

      // 确保已加载（避免未加载时误判）
      if (!this.state.loaded) await this.init();
      if (this.state.completed.has(taskKey)) return;

      const user = Auth.getCurrentUser();
      try {
        // 1. 写入 user_tasks 表
        const { error } = await supabase
          .from('user_tasks')
          .insert({
            user_id: user.id,
            task_key: taskKey,
          });
        if (error) {
          // 唯一约束冲突 = 已完成，忽略
          if (error.code !== '23505') console.warn('[NewbieTasks] 写入失败:', error.message);
          this.state.completed.add(taskKey);
          return;
        }

        // 2. 标记完成
        this.state.completed.add(taskKey);

        // 3. 通过 PointsCore 发放 EXP（reason 用 'task'，target_type 用 'task'）
        if (typeof PointsCore !== 'undefined') {
          await PointsCore._addPoints(user.id, task.exp, 'task', { id: taskKey, type: 'task' });
        }

        // 4. EventBus 通知 + toast
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('task:completed', { taskKey, exp: task.exp, title: task.title });
        }
        UiKit.toast(`✅ 任务完成：${task.title} +${task.exp} EXP`, 'success', 2500);

        // 5. 全部完成额外提示
        if (this.state.completed.size === TASKS.length) {
          setTimeout(() => {
            UiKit.toast(`🎉 新手任务全部完成！共获得 ${TOTAL_EXP} EXP`, 'success', 3500);
          }, 800);
        }
      } catch (e) {
        console.error('[NewbieTasks] 触发失败:', e);
      }
    },

    /**
     * 获取进度
     */
    getProgress() {
      return {
        completed: this.state.completed.size,
        total: TASKS.length,
        exp: TASKS.filter(t => this.state.completed.has(t.key)).reduce((s, t) => s + t.exp, 0),
        totalExp: TOTAL_EXP,
      };
    },

    /**
     * 打开任务面板
     */
    async openPanel() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      if (!this.state.loaded) await this.init();

      // 自动检测：完善资料、查看特权面板（这些可以即时判断）
      await this._autoDetect();

      this._renderPanel();
    },

    /**
     * 自动检测类任务（无需主动触发）
     */
    async _autoDetect() {
      const user = Auth.getCurrentUser();
      // complete_profile：有 avatar_url 且 bio 非空
      if (!this.state.completed.has('complete_profile')) {
        try {
          const { data: p } = await supabase
            .from('profiles')
            .select('avatar_url, bio')
            .eq('id', user.id)
            .single();
          if (p && p.avatar_url && p.bio && p.bio.trim()) {
            await this.trigger('complete_profile');
          }
        } catch (e) {}
      }
    },

    /**
     * 渲染任务面板
     */
    _renderPanel() {
      const progress = this.getProgress();
      const percent = Math.round(progress.completed / progress.total * 100);

      // 顶部进度卡
      const headerHtml = `
        <div class="nt-header">
          <div class="nt-header-progress">
            <div class="nt-header-num">${progress.completed}<span>/${progress.total}</span></div>
            <div class="nt-header-label">已完成任务</div>
          </div>
          <div class="nt-header-bar-wrap">
            <div class="nt-header-bar-fill" style="width:${percent}%;"></div>
          </div>
          <div class="nt-header-exp">${progress.exp} / ${progress.totalExp} EXP</div>
        </div>
      `;

      // 按分类分组
      const categories = ['入门', '社区', '创作'];
      const groupsHtml = categories.map(cat => {
        const tasks = TASKS.filter(t => t.category === cat);
        const itemsHtml = tasks.map(t => {
          const done = this.state.completed.has(t.key);
          return `
            <div class="nt-task-item ${done ? 'nt-done' : 'nt-todo'}" data-key="${t.key}">
              <div class="nt-task-icon">${done ? '✅' : t.icon}</div>
              <div class="nt-task-main">
                <div class="nt-task-title">${t.title}</div>
                <div class="nt-task-desc">${t.desc}</div>
              </div>
              <div class="nt-task-exp ${done ? 'nt-exp-done' : ''}">+${t.exp}</div>
            </div>
          `;
        }).join('');
        return `
          <div class="nt-group">
            <div class="nt-group-title">${cat}篇</div>
            ${itemsHtml}
          </div>
        `;
      }).join('');

      const html = `
        <div class="nt-wrap">
          ${headerHtml}
          ${groupsHtml}
          <div class="nt-tip">完成任务获得 EXP，自然升级解锁 Lv4 PDF 导出等特权</div>
        </div>
      `;
      UIRender.showAlertModal('新手任务', html);
    },
  };

  global.NewbieTasks = NewbieTasks;
})(window);
