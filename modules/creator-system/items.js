/**
 * 道具彩蛋系统（Phase 5.2）
 * 职责：随机掉落 + 收藏柜 + 月度活动框架
 * 依赖：Auth、UiKit、UIRender、EventBus
 *
 * 规则：
 *   - 纯收集系统，不挂钩任何功能特权
 *   - 特定动作后随机掉落（25% 概率）
 *   - 稀有度：common 70% / rare 25% / epic 5%
 *   - 月度活动提供限定道具奖励
 */
(function (global) {
  // 道具图鉴
  const ITEM_CATALOG = {
    common: [
      { id: 'ticket_stub', name: '复古门票', emoji: '🎫', desc: '一张泛黄的旧门票' },
      { id: 'map_fragment', name: '地图碎片', emoji: '🗺️', desc: '某处残缺的地图角' },
      { id: 'camera_sticker', name: '相机贴纸', emoji: '📷', desc: '可贴在旅行手账上' },
      { id: 'luggage_tag', name: '行李牌', emoji: '🧳', desc: '写满地名的小木牌' },
      { id: 'postcard', name: '风景明信片', emoji: '📮', desc: '盖着异地邮戳' },
      { id: 'coin', name: '旅行硬币', emoji: '🪙', desc: '不知哪个国家的旧硬币' },
    ],
    rare: [
      { id: 'traveler_badge', name: '旅人勋章', emoji: '🏆', desc: '授予资深旅行者的铜质徽章' },
      { id: 'star_passport', name: '星光护照', emoji: '🌟', desc: '据说能通往星空之国' },
      { id: 'compass', name: '黄金罗盘', emoji: '🧭', desc: '永远指向下一个目的地' },
      { id: 'telescope', name: '便携望远镜', emoji: '🔭', desc: '看见远方的风景' },
    ],
    epic: [
      { id: 'dragon_figuine', name: '祥龙摆件', emoji: '🐉', desc: '传说中的东方守护神' },
      { id: 'phoenix_feather', name: '凤羽书签', emoji: '🪶', desc: '凤凰遗落的尾羽' },
      { id: 'crystal_ball', name: '水晶球', emoji: '🔮', desc: '能映出未来旅途的幻象' },
    ],
  };

  // 稀有度配置
  const RARITY_CONFIG = {
    common: { label: '普通', color: '#999', dropWeight: 70 },
    rare: { label: '稀有', color: '#5CC6FF', dropWeight: 25 },
    epic: { label: '史诗', color: '#B865FF', dropWeight: 5 },
  };

  // 掉落触发点配置
  const DROP_TRIGGERS = {
    checkin: { dropRate: 0.30, label: '打卡' },
    publish_trip: { dropRate: 0.40, label: '发布行程' },
    publish_note: { dropRate: 0.40, label: '发布游记' },
    publish_roast: { dropRate: 0.25, label: '发布吐槽' },
    daily_signin: { dropRate: 0.50, label: '每日签到' },
  };

  const Items = {
    state: {
      collection: [],
    },

    /**
     * 尝试掉落道具
     * @param {string} triggerKey - 触发动作的 key（对应 DROP_TRIGGERS）
     */
    async tryDrop(triggerKey) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
      const trigger = DROP_TRIGGERS[triggerKey];
      if (!trigger) return;

      // 概率判定
      if (Math.random() > trigger.dropRate) return;

      // 滚动稀有度
      const rarity = this._rollRarity();
      const pool = ITEM_CATALOG[rarity];
      const item = pool[Math.floor(Math.random() * pool.length)];

      // 保存
      try {
        const user = Auth.getCurrentUser();
        const { error } = await supabase.from('user_items').insert({
          user_id: user.id,
          item_id: item.id,
          item_name: item.name,
          source: triggerKey,
        });
        if (error) {
          if (error.code === '23505') return; // 忽略重复
          throw error;
        }
        // 显示掉落动画
        this._showDropAnimation(item, rarity);
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('item:dropped', { item, rarity, trigger: triggerKey });
        }
      } catch (e) {
        console.warn('[Items] 掉落保存失败:', e);
      }
    },

    /**
     * 滚动稀有度
     */
    _rollRarity() {
      const totalWeight = Object.values(RARITY_CONFIG).reduce((s, c) => s + c.dropWeight, 0);
      let roll = Math.random() * totalWeight;
      for (const [key, cfg] of Object.entries(RARITY_CONFIG)) {
        roll -= cfg.dropWeight;
        if (roll <= 0) return key;
      }
      return 'common';
    },

    /**
     * 显示掉落动画
     */
    _showDropAnimation(item, rarity) {
      const cfg = RARITY_CONFIG[rarity];
      const overlay = document.createElement('div');
      overlay.className = 'item-drop-overlay';
      overlay.innerHTML = `
        <div class="item-drop-card item-rarity-${rarity}">
          <div class="item-drop-glow"></div>
          <div class="item-drop-emoji">${item.emoji}</div>
          <div class="item-drop-rarity" style="color:${cfg.color}">${cfg.label}</div>
          <div class="item-drop-name">${item.name}</div>
          <div class="item-drop-desc">${item.desc}</div>
          <div class="item-drop-label">✨ 获得新道具</div>
          <button class="item-drop-close">收下</button>
        </div>
      `;
      document.body.appendChild(overlay);
      const closeBtn = overlay.querySelector('.item-drop-close');
      const close = () => overlay.remove();
      closeBtn.onclick = close;
      overlay.onclick = (e) => { if (e.target === overlay) close(); };
      // 自动关闭（5 秒）
      setTimeout(() => { if (document.body.contains(overlay)) close(); }, 5000);
    },

    /**
     * 打开收藏柜
     */
    async openCollection() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      UiKit.showLoading('加载收藏柜...');
      try {
        const user = Auth.getCurrentUser();
        const { data, error } = await supabase
          .from('user_items')
          .select('item_id, item_name, source, acquired_at')
          .eq('user_id', user.id)
          .order('acquired_at', { ascending: false });
        UiKit.hideLoading();
        if (error) throw error;
        this.state.collection = data || [];
        this._renderCollection(data || []);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[Items] 加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 渲染收藏柜
     */
    _renderCollection(myItems) {
      // 构建已收集 map（按 item_id 去重，保留最新）
      const ownedMap = {};
      myItems.forEach(it => {
        if (!ownedMap[it.item_id] || new Date(it.acquired_at) > new Date(ownedMap[it.item_id].acquired_at)) {
          ownedMap[it.item_id] = it;
        }
      });

      // 统计
      const allItems = [
        ...ITEM_CATALOG.common.map(i => ({ ...i, rarity: 'common' })),
        ...ITEM_CATALOG.rare.map(i => ({ ...i, rarity: 'rare' })),
        ...ITEM_CATALOG.epic.map(i => ({ ...i, rarity: 'epic' })),
      ];
      const ownedCount = Object.keys(ownedMap).length;
      const totalCount = allItems.length;
      const progress = Math.round(ownedCount / totalCount * 100);

      // 分组渲染
      const renderGroup = (rarity) => {
        const cfg = RARITY_CONFIG[rarity];
        const items = ITEM_CATALOG[rarity];
        return items.map(item => {
          const owned = ownedMap[item.id];
          const ownedCount = myItems.filter(i => i.item_id === item.id).length;
          return `
            <div class="item-cell ${owned ? '' : 'item-locked'}" style="border-color:${owned ? cfg.color : '#eee'};">
              <div class="item-emoji" style="${owned ? '' : 'filter:grayscale(1);opacity:0.3;'}">${owned ? item.emoji : '❓'}</div>
              <div class="item-name" style="color:${owned ? '#333' : '#CCC'};">${owned ? item.name : '未收集'}</div>
              <div class="item-rarity-tag" style="color:${cfg.color};">${cfg.label}</div>
              ${owned ? `<div class="item-count">×${ownedCount}</div>` : ''}
            </div>
          `;
        }).join('');
      };

      const html = `
        <div class="item-collection-wrap">
          <div class="item-progress-card">
            <div class="item-progress-info">
              <div class="item-progress-num">${ownedCount}<span>/${totalCount}</span></div>
              <div class="item-progress-label">已收集道具</div>
            </div>
            <div class="item-progress-bar">
              <div class="item-progress-fill" style="width:${progress}%;"></div>
            </div>
          </div>
          <div class="item-section">
            <div class="item-section-title" style="color:${RARITY_CONFIG.common.color};">普通道具</div>
            <div class="item-grid">${renderGroup('common')}</div>
          </div>
          <div class="item-section">
            <div class="item-section-title" style="color:${RARITY_CONFIG.rare.color};">稀有道具</div>
            <div class="item-grid">${renderGroup('rare')}</div>
          </div>
          <div class="item-section">
            <div class="item-section-title" style="color:${RARITY_CONFIG.epic.color};">史诗道具</div>
            <div class="item-grid">${renderGroup('epic')}</div>
          </div>
          <div class="item-tip">
            💡 旅行途中（打卡/发布/签到）有几率随机掉落道具，纯收集不挂钩功能特权
          </div>
        </div>
      `;
      UIRender.showAlertModal('道具收藏柜', html);
    },

    /**
     * 打开月度活动面板（框架）
     */
    async openEvents() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      UiKit.showLoading('加载活动...');
      try {
        const { data: events, error } = await supabase
          .from('monthly_events')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        UiKit.hideLoading();
        if (error) throw error;
        this._renderEvents(events || []);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[Items] 活动加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 渲染月度活动
     */
    _renderEvents(events) {
      const user = Auth.getCurrentUser();
      const listHtml = events.length === 0
        ? `<div class="evt-empty">
             <div style="font-size:36px;margin-bottom:8px;">🎪</div>
             <div>暂无进行中的活动</div>
             <div style="font-size:11px;margin-top:4px;">敬请期待下月主题</div>
           </div>`
        : events.map(ev => {
            const today = new Date().toISOString().split('T')[0];
            const isOngoing = today >= ev.start_date && today <= ev.end_date;
            const tasks = ev.tasks || [];
            return `
              <div class="evt-card ${isOngoing ? '' : 'evt-ended'}">
                <div class="evt-header">
                  <div class="evt-name">${ev.name}</div>
                  <div class="evt-status ${isOngoing ? 'evt-active' : 'evt-past'}">${isOngoing ? '进行中' : '已结束'}</div>
                </div>
                <div class="evt-theme">🎨 ${ev.theme}</div>
                <div class="evt-date">📅 ${ev.start_date} ~ ${ev.end_date}</div>
                <div class="evt-tasks">
                  ${tasks.map(t => `<div class="evt-task">• ${t.name || t}</div>`).join('')}
                </div>
                <div class="evt-reward">
                  🎁 完成奖励：<span class="evt-reward-name">${ev.reward_item_name}</span>
                </div>
              </div>
            `;
          }).join('');

      const html = `
        <div class="evt-wrap">
          <div class="evt-intro">月度主题活动提供限定道具奖励，完成任务即可获得</div>
          ${listHtml}
        </div>
      `;
      UIRender.showAlertModal('月度活动', html);
    },
  };

  global.Items = Items;
})(window);
