/**
 * 投票投流系统（Phase 5.1）
 * 职责：每日签到得票 + 用票给作品投票 + 高票作品社区加权
 * 依赖：Auth、UiKit、UIRender、EventBus
 *
 * 规则：
 *   - 每日签到得 3 票（与积分独立，不互通）
 *   - 投票：消耗票数给作品投票（1 票/次，可多次投）
 *   - 加权：社区排序按 (likes + votes*2) 降序
 */
(function (global) {
  const TICKETS_PER_SIGNIN = 3;

  const Voting = {
    state: {
      signedToday: false,
      tickets: 0,
    },

    /**
     * 初始化：加载签到状态和票数
     */
    async init() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
      await this._loadStatus();
    },

    /**
     * 加载签到状态和票数
     */
    async _loadStatus() {
      const user = Auth.getCurrentUser();
      if (!user) return;
      try {
        // 1. 查询今日是否已签到
        const today = new Date().toISOString().split('T')[0];
        const { data: todaySignin } = await supabase
          .from('daily_signin')
          .select('signin_date, tickets_earned')
          .eq('user_id', user.id)
          .eq('signin_date', today)
          .maybeSingle();
        this.state.signedToday = !!todaySignin;

        // 2. 查询当前票数
        const { data: profile } = await supabase
          .from('profiles')
          .select('tickets')
          .eq('id', user.id)
          .single();
        this.state.tickets = profile?.tickets || 0;

        // 3. 同步到 user 对象
        if (Auth.state.user) Auth.state.user.tickets = this.state.tickets;
      } catch (e) {
        console.warn('[Voting] 加载状态失败:', e);
      }
    },

    /**
     * 打开签到/投票面板
     */
    async openPanel() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      await this._loadStatus();
      this._renderPanel();
    },

    /**
     * 渲染签到面板
     */
    async _renderPanel() {
      const user = Auth.getCurrentUser();
      // 查询最近 7 天签到记录
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const { data: recentSignins } = await supabase
        .from('daily_signin')
        .select('signin_date, tickets_earned')
        .eq('user_id', user.id)
        .gte('signin_date', sevenDaysAgo)
        .order('signin_date', { ascending: false });

      const signinCount = (recentSignins || []).length;
      const totalEarned = (recentSignins || []).reduce((sum, s) => sum + (s.tickets_earned || 0), 0);

      // 近 7 天日历
      const today = new Date();
      const calendarHtml = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const signed = (recentSignins || []).some(s => s.signin_date === dateStr);
        const isToday = i === 0;
        const dayLabel = i === 0 ? '今天' : i === 1 ? '昨天' : `${d.getMonth()+1}/${d.getDate()}`;
        calendarHtml.push(`
          <div class="vt-cal-day ${signed ? 'vt-cal-signed' : ''} ${isToday ? 'vt-cal-today' : ''}">
            <div class="vt-cal-label">${dayLabel}</div>
            <div class="vt-cal-icon">${signed ? '✅' : '○'}</div>
          </div>
        `);
      }

      const html = `
        <div class="vt-panel-wrap">
          <div class="vt-balance-card">
            <div class="vt-balance-icon">🎟️</div>
            <div class="vt-balance-info">
              <div class="vt-balance-num">${this.state.tickets}</div>
              <div class="vt-balance-label">可用票数</div>
            </div>
          </div>
          <div class="vt-signin-section">
            <div class="vt-signin-title">📅 每日签到</div>
            <div class="vt-signin-desc">每日签到得 ${TICKETS_PER_SIGNIN} 票，用于给喜欢的作品投票</div>
            <div class="vt-calendar">${calendarHtml.join('')}</div>
            <div class="vt-signin-stats">近 7 天签到 ${signinCount} 天，获得 ${totalEarned} 票</div>
            <button class="vt-signin-btn ${this.state.signedToday ? 'vt-signed' : ''}" id="vtSigninBtn" ${this.state.signedToday ? 'disabled' : ''}>
              ${this.state.signedToday ? '✅ 今日已签到' : `签到 +${TICKETS_PER_SIGNIN} 票`}
            </button>
          </div>
          <div class="vt-rules">
            <div>• 票数与积分独立，不可互相转换</div>
            <div>• 在社区作品详情中可投票，高票作品获得曝光加权</div>
          </div>
        </div>
      `;
      UIRender.showAlertModal('签到与投票', html);

      setTimeout(() => {
        const btn = document.getElementById('vtSigninBtn');
        if (!btn || this.state.signedToday) return;
        btn.onclick = async () => {
          btn.disabled = true;
          btn.textContent = '签到中...';
          await this._doSignin();
        };
      }, 50);
    },

    /**
     * 执行签到
     */
    async _doSignin() {
      try {
        const user = Auth.getCurrentUser();
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('daily_signin')
          .insert({
            user_id: user.id,
            signin_date: today,
            tickets_earned: TICKETS_PER_SIGNIN,
          });
        if (error) {
          if (error.code === '23505') {
            UiKit.toast('今日已签到', 'info');
            this.state.signedToday = true;
          } else {
            throw error;
          }
        }
        // 增加票数
        const newTickets = this.state.tickets + TICKETS_PER_SIGNIN;
        await supabase.from('profiles').update({ tickets: newTickets }).eq('id', user.id);
        this.state.tickets = newTickets;
        this.state.signedToday = true;
        if (Auth.state.user) Auth.state.user.tickets = newTickets;

        // 更新 UI
        const btn = document.getElementById('vtSigninBtn');
        if (btn) { btn.textContent = '✅ 今日已签到'; btn.classList.add('vt-signed'); }
        const balNum = document.querySelector('.vt-balance-num');
        if (balNum) balNum.textContent = newTickets;

        UiKit.toast(`✅ 签到成功 +${TICKETS_PER_SIGNIN} 票`, 'success');
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('tickets:changed', { tickets: newTickets, delta: TICKETS_PER_SIGNIN });
        }
        // Phase 5.2：签到触发道具掉落
        try { if (typeof Items !== 'undefined') Items.tryDrop('daily_signin'); } catch(e) {}
      } catch (e) {
        console.error('[Voting] 签到失败:', e);
        UiKit.toast('签到失败：' + (e.message || ''), 'error');
      }
    },

    /**
     * 打开投票弹窗（在内容详情中调用）
     * @param {string} targetId - 作品 ID
     * @param {string} targetType - 'template' | 'note' | 'roast'
     * @param {string} title - 作品标题
     */
    async openVoteDialog(targetId, targetType, title = '') {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      await this._loadStatus();

      // 查询当前作品总票数
      const { count: totalVotes } = await supabase
        .from('votes')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', targetId)
        .eq('target_type', targetType);

      // 查询我已投的票数
      const user = Auth.getCurrentUser();
      const { count: myVotes } = await supabase
        .from('votes')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('user_id', user.id);

      const html = `
        <div class="vt-vote-wrap">
          <div class="vt-vote-title">${this._escapeHtml(title)}</div>
          <div class="vt-vote-stats">
            <div class="vt-vote-stat">
              <div class="vt-vote-stat-num">${totalVotes || 0}</div>
              <div class="vt-vote-stat-label">总票数</div>
            </div>
            <div class="vt-vote-stat">
              <div class="vt-vote-stat-num">${myVotes || 0}</div>
              <div class="vt-vote-stat-label">我已投</div>
            </div>
            <div class="vt-vote-stat">
              <div class="vt-vote-stat-num">${this.state.tickets}</div>
              <div class="vt-vote-stat-label">可用票</div>
            </div>
          </div>
          <div class="vt-vote-input-section">
            <div class="vt-vote-input-label">投票数量</div>
            <div class="vt-vote-input-row">
              <button class="vt-vote-adjust" id="vtVoteMinus">−</button>
              <input type="number" class="vt-vote-input" id="vtVoteCount" value="1" min="1" max="${this.state.tickets}">
              <button class="vt-vote-adjust" id="vtVotePlus">+</button>
            </div>
          </div>
          <button class="vt-vote-submit-btn" id="vtVoteSubmit" ${this.state.tickets === 0 ? 'disabled' : ''}>
            ${this.state.tickets === 0 ? '票数不足，去签到' : '确认投票'}
          </button>
        </div>
      `;
      UIRender.showAlertModal('投票', html);

      setTimeout(() => {
        const input = document.getElementById('vtVoteCount');
        const minus = document.getElementById('vtVoteMinus');
        const plus = document.getElementById('vtVotePlus');
        const submit = document.getElementById('vtVoteSubmit');
        if (!input || !submit) return;

        const updateInput = (delta) => {
          let v = parseInt(input.value, 10) || 1;
          v = Math.max(1, Math.min(this.state.tickets, v + delta));
          input.value = v;
        };
        minus.onclick = () => updateInput(-1);
        plus.onclick = () => updateInput(1);

        submit.onclick = async () => {
          const count = parseInt(input.value, 10) || 0;
          if (count < 1) { UiKit.toast('至少投 1 票', 'info'); return; }
          if (count > this.state.tickets) { UiKit.toast(`票数不足（剩 ${this.state.tickets} 票）`, 'info'); return; }
          submit.disabled = true;
          submit.textContent = '投票中...';
          await this._castVote(targetId, targetType, count);
        };
      }, 50);
    },

    /**
     * 执行投票
     */
    async _castVote(targetId, targetType, count) {
      try {
        const user = Auth.getCurrentUser();
        // 1. 写入投票记录
        const { error } = await supabase.from('votes').insert({
          user_id: user.id,
          target_id: targetId,
          target_type: targetType,
          vote_count: count,
        });
        if (error) throw error;

        // 2. 扣减票数
        const newTickets = this.state.tickets - count;
        await supabase.from('profiles').update({ tickets: newTickets }).eq('id', user.id);
        this.state.tickets = newTickets;
        if (Auth.state.user) Auth.state.user.tickets = newTickets;

        // 3. 通知
        UiKit.toast(`✅ 投票成功 -${count} 票`, 'success');
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('tickets:changed', { tickets: newTickets, delta: -count });
          EventBus.emit('vote:cast', { targetId, targetType, count });
        }

        // 关闭弹窗
        const modal = document.getElementById('alertModal');
        if (modal) modal.classList.remove('show');
      } catch (e) {
        console.error('[Voting] 投票失败:', e);
        UiKit.toast('投票失败：' + (e.message || ''), 'error');
        const submit = document.getElementById('vtVoteSubmit');
        if (submit) { submit.disabled = false; submit.textContent = '确认投票'; }
      }
    },

    /**
     * 获取内容总票数（批量）
     */
    async getVoteCounts(targetIds, targetType) {
      if (!targetIds || targetIds.length === 0) return {};
      const { data } = await supabase
        .from('votes')
        .select('target_id, vote_count')
        .in('target_id', targetIds)
        .eq('target_type', targetType);
      const map = {};
      (data || []).forEach(v => {
        map[v.target_id] = (map[v.target_id] || 0) + (v.vote_count || 0);
      });
      return map;
    },

    /**
     * HTML 转义
     */
    _escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
  };

  global.Voting = Voting;
})(window);
