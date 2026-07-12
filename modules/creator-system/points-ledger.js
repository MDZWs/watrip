/**
 * 积分明细弹窗模块
 * 职责：展示用户当前积分/等级/经验进度 + 积分流水列表（分页加载）
 * 依赖：PointsCore、Auth、UiKit、UIRender、EventBus
 *
 * Phase 3.1：创作者价值体系 - 积分账本与互动
 */
(function (global) {
  const PointsLedger = {
    state: {
      page: 1,
      pageSize: 20,
      hasMore: true,
      loading: false,
      records: [],
      levelInfo: null,
    },

    /**
     * 打开积分明细弹窗
     */
    async open() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      if (typeof PointsCore === 'undefined') {
        UiKit.toast('积分系统未就绪', 'error');
        return;
      }

      // 重置状态
      this.state.page = 1;
      this.state.hasMore = true;
      this.state.loading = false;
      this.state.records = [];
      this.state.levelInfo = null;

      UiKit.showLoading('加载积分明细...');
      try {
        const user = Auth.getCurrentUser();
        const [levelInfo, records] = await Promise.all([
          PointsCore.getUserLevelInfo(user.id),
          PointsCore.getPointLedger(user.id, this.state.pageSize, 1),
        ]);
        this.state.levelInfo = levelInfo;
        this.state.records = records || [];
        this.state.hasMore = (records || []).length === this.state.pageSize;
        UiKit.hideLoading();
        this._renderModal();
      } catch (e) {
        UiKit.hideLoading();
        console.error('[PointsLedger] 加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 加载更多
     */
    async _loadMore() {
      if (this.state.loading || !this.state.hasMore) return;
      this.state.loading = true;
      const btn = document.getElementById('plLoadMoreBtn');
      if (btn) btn.textContent = '加载中...';

      try {
        const user = Auth.getCurrentUser();
        this.state.page++;
        const records = await PointsCore.getPointLedger(user.id, this.state.pageSize, this.state.page);
        this.state.records = this.state.records.concat(records || []);
        this.state.hasMore = (records || []).length === this.state.pageSize;
        this._renderList();
      } catch (e) {
        console.error('[PointsLedger] 加载更多失败:', e);
        UiKit.toast('加载失败', 'error');
      } finally {
        this.state.loading = false;
      }
    },

    /**
     * 渲染弹窗
     */
    _renderModal() {
      const li = this.state.levelInfo;
      const user = Auth.getCurrentUser();
      const totalPoints = user?.points ?? li?.points ?? 0;

      // 顶部：等级卡
      const levelCardHtml = li
        ? this._renderLevelCard(li, totalPoints)
        : `<div style="padding:20px;text-align:center;color:#999;">等级数据加载失败</div>`;

      // 流水列表
      const listHtml = this._renderListHtml();

      const html = `
        <div class="pl-wrap">
          <div class="pl-level-card">${levelCardHtml}</div>
          <div class="pl-section-title">积分流水</div>
          <div class="pl-list" id="plList">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('积分明细', html);

      // 绑定加载更多
      setTimeout(() => {
        const btn = document.getElementById('plLoadMoreBtn');
        if (btn) btn.onclick = () => this._loadMore();
      }, 50);
    },

    /**
     * 渲染等级卡
     */
    _renderLevelCard(li, totalPoints) {
      const lv = li.level || 1;
      const lvName = this._levelName(lv);
      const exp = li.exp || 0;
      const progressPercent = li.progressPercent || 0;
      const progress = li.progress || 0;
      const totalNeeded = li.totalNeeded || 0;
      const nextLevelExp = li.nextLevelExp || 0;

      return `
        <div class="pl-lc-top">
          <div class="pl-lc-badge">Lv.${lv}</div>
          <div class="pl-lc-info">
            <div class="pl-lc-name">${lvName}</div>
            <div class="pl-lc-exp">${exp} / ${nextLevelExp} EXP</div>
          </div>
          <div class="pl-lc-points">
            <div class="pl-lc-points-num">${totalPoints}</div>
            <div class="pl-lc-points-label">积分</div>
          </div>
        </div>
        <div class="pl-lc-bar">
          <div class="pl-lc-bar-fill" style="width:${progressPercent}%;"></div>
        </div>
        <div class="pl-lc-bar-meta">
          <span>当前 ${exp} EXP</span>
          <span>距 Lv.${lv + 1} 还差 ${Math.max(0, totalNeeded - progress)} EXP</span>
        </div>
      `;
    },

    /**
     * 渲染列表 HTML（包含加载更多按钮）
     */
    _renderListHtml() {
      const records = this.state.records;
      if (records.length === 0) {
        return `<div class="pl-empty">
          <div class="pl-empty-icon">📊</div>
          <div class="pl-empty-title">暂无积分流水</div>
          <div class="pl-empty-desc">发布内容、被点赞、被收藏均可获得积分</div>
        </div>`;
      }

      const itemsHtml = records.map(r => this._renderItem(r)).join('');
      const moreBtnHtml = this.state.hasMore
        ? `<button class="pl-load-more" id="plLoadMoreBtn">加载更多</button>`
        : `<div class="pl-list-end">— 已加载全部 —</div>`;

      return itemsHtml + moreBtnHtml;
    },

    /**
     * 仅刷新列表区域（用于加载更多）
     */
    _renderList() {
      const listEl = document.getElementById('plList');
      if (listEl) listEl.innerHTML = this._renderListHtml();
      const btn = document.getElementById('plLoadMoreBtn');
      if (btn) btn.onclick = () => this._loadMore();
    },

    /**
     * 渲染单条流水
     */
    _renderItem(r) {
      const delta = r.delta || 0;
      const isPositive = delta > 0;
      const isViolation = delta < 0;
      const sign = isPositive ? '+' : '';
      const colorClass = isViolation ? 'pl-delta-neg' : 'pl-delta-pos';
      const reasonText = this._reasonText(r.reason);
      const reasonIcon = this._reasonIcon(r.reason);
      const timeText = this._formatTime(r.created_at);
      const targetText = this._targetLabel(r.target_type);

      return `
        <div class="pl-item">
          <div class="pl-item-icon ${colorClass}">${reasonIcon}</div>
          <div class="pl-item-main">
            <div class="pl-item-reason">${reasonText}<span class="pl-item-target">${targetText}</span></div>
            <div class="pl-item-time">${timeText}</div>
          </div>
          <div class="pl-item-delta ${colorClass}">${sign}${delta}</div>
        </div>
      `;
    },

    /**
     * reason 中文映射
     */
    _reasonText(reason) {
      const map = {
        viewed: '内容被浏览',
        liked: '内容被点赞',
        favorited: '内容被收藏',
        adopted: '行程被套用',
        followed: '被新用户关注',
        checkin_field: '实地打卡',
        checkin_cloud: '云打卡',
        roast: '发布吐槽',
        roast_liked: '吐槽被点赞',
        roast_favorited: '吐槽被收藏',
        violation: '违规扣分',
      };
      return map[reason] || reason || '积分变动';
    },

    /**
     * reason 图标映射
     */
    _reasonIcon(reason) {
      const map = {
        viewed: '👁️',
        liked: '❤️',
        favorited: '⭐',
        adopted: '📋',
        followed: '👥',
        checkin_field: '📍',
        checkin_cloud: '☁️',
        roast: '💬',
        roast_liked: '💬',
        roast_favorited: '💬',
        violation: '⚠️',
      };
      return map[reason] || '✨';
    },

    /**
     * 目标类型标签
     */
    _targetLabel(type) {
      const map = {
        trip_template: '行程',
        travel_note: '游记',
        roast: '吐槽',
        checkin: '打卡',
        user: '用户',
      };
      return type ? ` · ${map[type] || type}` : '';
    },

    /**
     * 时间格式化（今天/昨天/日期）
     */
    _formatTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 86400000);
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (target.getTime() === today.getTime()) return `今天 ${time}`;
      if (target.getTime() === yesterday.getTime()) return `昨天 ${time}`;
      return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
    },

    /**
     * 等级名称（与 PointsCore/ProfileModule 保持一致）
     */
    _levelName(level) {
      const names = {
        1: '萌新探索者', 2: '初出茅庐', 3: '步履不停',
        4: '行走的攻略', 5: '资深旅人', 6: '城市玩家',
        7: '深度漫游者', 8: '风格主理人', 9: '合集策展人',
        10: '推荐位常客', 11: '金牌向导', 12: '认证规划师',
      };
      return names[level] || '传奇旅行家';
    },
  };

  global.PointsLedger = PointsLedger;
})(window);
