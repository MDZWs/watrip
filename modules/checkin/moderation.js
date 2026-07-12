/**
 * 内容审核系统（Phase 4.4）
 * 职责：管理员审核面板 + 违规四级处理 + 零容忍扣分（-30）
 * 依赖：Auth、PointsCore、UiKit、UIRender、EventBus
 *
 * 违规分级：
 *   mild（轻度）   → 内容降权（demoted），不扣分
 *   medium（中度） → 内容隐藏（hidden）+ 警告用户 + -30 积分
 *   severe（严重） → 内容删除（deleted）+ 封禁 7 天 + -30 积分
 *   extreme（极端）→ 内容删除 + 永久封禁 + 积分清零
 *
 * 触发条件：
 *   - 用户举报达 3 次 → 自动进入 moderation_queue（status=pending）
 *   - 管理员从面板处理
 */
(function (global) {
  const VIOLATION_TIERS = {
    mild: { label: '轻度', desc: '内容降权，不扣分', color: '#FFA000', action: 'demote' },
    medium: { label: '中度', desc: '隐藏内容 + 警告 + -30 积分', color: '#FF6B00', action: 'hide' },
    severe: { label: '严重', desc: '删除内容 + 封禁 7 天 + -30 积分', color: '#E53935', action: 'delete_ban7' },
    extreme: { label: '极端', desc: '删除内容 + 永久封禁 + 积分清零', color: '#880E4F', action: 'delete_ban_forever' },
  };

  const Moderation = {
    state: {
      currentList: [],
    },

    /**
     * 打开审核面板（仅管理员）
     */
    async openPanel() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        return;
      }
      if (!Auth.isAdmin()) {
        UiKit.toast('仅管理员可访问', 'error');
        return;
      }
      UiKit.showLoading('加载审核队列...');
      try {
        // 1. 加载待审核队列
        const { data: queue, error } = await supabase
          .from('moderation_queue')
          .select('id, target_id, target_type, reason, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;

        // 2. 批量加载每个目标的内容和举报数
        const items = [];
        for (const q of (queue || [])) {
          const content = await this._fetchContent(q.target_id, q.target_type);
          if (!content) continue;
          const { count: reportCount } = await supabase
            .from('reports')
            .select('id', { count: 'exact', head: true })
            .eq('target_id', q.target_id)
            .eq('target_type', q.target_type)
            .eq('status', 'pending');
          items.push({
            queueId: q.id,
            targetId: q.target_id,
            targetType: q.target_type,
            reason: q.reason,
            createdAt: q.created_at,
            content,
            reportCount: reportCount || 0,
          });
        }
        this.state.currentList = items;
        UiKit.hideLoading();
        this._renderPanel(items);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[Moderation] 加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 获取目标内容
     */
    async _fetchContent(targetId, targetType) {
      try {
        let table, fields;
        if (targetType === 'roast') { table = 'roasts'; fields = 'id, user_id, content, status, created_at'; }
        else if (targetType === 'note') { table = 'travel_notes'; fields = 'id, author_id, title, content, status'; }
        else if (targetType === 'template') { table = 'trip_templates'; fields = 'id, author_id, title, status'; }
        else return null;

        const { data, error } = await supabase.from(table).select(fields).eq('id', targetId).single();
        if (error || !data) return null;

        // 统一字段
        const authorId = data.user_id || data.author_id;
        const text = data.content || data.title || '';
        const title = data.title || '';
        return {
          authorId,
          text: text.substring(0, 200),
          title,
          status: data.status,
          raw: data,
        };
      } catch (e) {
        return null;
      }
    },

    /**
     * 渲染审核面板
     */
    _renderPanel(items) {
      const listHtml = items.length === 0
        ? `<div class="mod-empty">
             <div style="font-size:36px;margin-bottom:8px;">✅</div>
             <div>审核队列已清空</div>
           </div>`
        : items.map(item => {
            const typeLabel = item.targetType === 'roast' ? '吐槽' : item.targetType === 'note' ? '游记' : '行程';
            const typeIcon = item.targetType === 'roast' ? '✍️' : item.targetType === 'note' ? '📝' : '🗺️';
            const dt = new Date(item.createdAt);
            const dateStr = `${dt.getMonth()+1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
            return `
              <div class="mod-item" data-queue-id="${item.queueId}" data-target-id="${item.targetId}" data-target-type="${item.targetType}" data-author-id="${item.content.authorId}">
                <div class="mod-item-head">
                  <span class="mod-type">${typeIcon} ${typeLabel}</span>
                  <span class="mod-reports">⚠️ ${item.reportCount} 举报</span>
                  <span class="mod-time">${dateStr}</span>
                </div>
                <div class="mod-item-reason">原因：${this._escapeHtml(item.reason)}</div>
                ${item.title ? `<div class="mod-item-title">${this._escapeHtml(item.title)}</div>` : ''}
                <div class="mod-item-content">${this._escapeHtml(item.content.text)}</div>
                <div class="mod-item-actions">
                  <button class="mod-btn mod-dismiss" data-action="dismiss">驳回举报</button>
                  <button class="mod-btn mod-mild" data-action="mild">轻度</button>
                  <button class="mod-btn mod-medium" data-action="medium">中度</button>
                  <button class="mod-btn mod-severe" data-action="severe">严重</button>
                  <button class="mod-btn mod-extreme" data-action="extreme">极端</button>
                </div>
              </div>
            `;
          }).join('');

      const html = `
        <div class="mod-panel-wrap">
          <div class="mod-panel-header">
            <div class="mod-panel-title">🛡️ 内容审核队列</div>
            <div class="mod-panel-sub">${items.length} 条待处理</div>
          </div>
          <div class="mod-panel-rules">
            <div>• 轻度：降权不扣分｜中度：隐藏 -30 分｜严重：删除+封 7 天 -30 分｜极端：删除+永封+清零</div>
          </div>
          <div class="mod-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('内容审核', html);

      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        modal.querySelectorAll('.mod-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const itemEl = btn.closest('.mod-item');
            const action = btn.dataset.action;
            const data = {
              queueId: itemEl.dataset.queueId,
              targetId: itemEl.dataset.targetId,
              targetType: itemEl.dataset.targetType,
              authorId: itemEl.dataset.authorId,
            };
            this._handleAction(action, data, btn);
          };
        });
      }, 50);
    },

    /**
     * 处理审核动作
     */
    async _handleAction(action, data, btn) {
      const tier = VIOLATION_TIERS[action];
      if (!tier) return;

      // 二次确认
      const confirmMsg = action === 'dismiss'
        ? '确定驳回这条举报？内容将恢复正常'
        : `确定执行「${tier.label}」处理？\n${tier.desc}`;
      const ok = await UiKit.confirm(confirmMsg, action === 'dismiss' ? '驳回举报' : '违规处理');
      if (!ok) return;

      btn.disabled = true;
      btn.textContent = '处理中...';

      try {
        if (action === 'dismiss') {
          await this._dismiss(data);
        } else {
          await this._confirmViolation(data, action, tier);
        }
        // 移除该项
        const itemEl = btn.closest('.mod-item');
        if (itemEl) {
          itemEl.style.transition = 'all 0.3s';
          itemEl.style.opacity = '0';
          itemEl.style.transform = 'translateX(20px)';
          setTimeout(() => itemEl.remove(), 300);
        }
        UiKit.toast('处理完成', 'success');
      } catch (e) {
        console.error('[Moderation] 处理失败:', e);
        UiKit.toast('处理失败：' + (e.message || ''), 'error');
        btn.disabled = false;
        btn.textContent = tier.label;
      }
    },

    /**
     * 驳回举报
     */
    async _dismiss({ queueId, targetId, targetType }) {
      // 1. 更新审核队列状态
      await supabase.from('moderation_queue').update({ status: 'dismissed', updated_at: new Date().toISOString() }).eq('id', queueId);
      // 2. 更新所有相关举报状态
      await supabase.from('reports').update({ status: 'dismissed' }).eq('target_id', targetId).eq('target_type', targetType).eq('status', 'pending');
      // 3. 恢复内容状态
      await this._updateContentStatus(targetId, targetType, 'published');
    },

    /**
     * 确认违规
     */
    async _confirmViolation(data, action, tier) {
      const { queueId, targetId, targetType, authorId } = data;

      // 1. 扣 30 分（中度及以上，零容忍）
      if (action === 'medium' || action === 'severe') {
        if (typeof PointsCore !== 'undefined') {
          await PointsCore.onViolation(authorId, targetId, targetType);
        }
      }

      // 2. 极端：积分清零
      if (action === 'extreme') {
        await supabase.from('profiles').update({ points: 0, exp: 0, level: 1 }).eq('id', authorId);
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('violation:penalty', { userId: authorId, delta: -9999 });
        }
      }

      // 3. 更新内容状态
      let contentStatus = 'published';
      if (action === 'mild') contentStatus = 'demoted';
      else if (action === 'medium') contentStatus = 'hidden';
      else if (action === 'severe' || action === 'extreme') contentStatus = 'deleted';
      await this._updateContentStatus(targetId, targetType, contentStatus);

      // 4. 封禁用户
      if (action === 'severe') {
        const banUntil = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        await supabase.from('profiles').update({ banned_until: banUntil }).eq('id', authorId);
      } else if (action === 'extreme') {
        await supabase.from('profiles').update({ banned_until: '2099-12-31T23:59:59Z' }).eq('id', authorId);
      }

      // 5. 写入违规记录
      await supabase.from('violations').insert({
        user_id: authorId,
        target_id: targetId,
        target_type: targetType,
        level: action,
        action: tier.action,
      });

      // 6. 更新审核队列
      await supabase.from('moderation_queue').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', queueId);

      // 7. 更新所有相关举报
      await supabase.from('reports').update({ status: 'resolved' }).eq('target_id', targetId).eq('target_type', targetType).eq('status', 'pending');
    },

    /**
     * 更新内容状态
     */
    async _updateContentStatus(targetId, targetType, status) {
      let table = null;
      if (targetType === 'roast') table = 'roasts';
      else if (targetType === 'note') table = 'travel_notes';
      else if (targetType === 'template') table = 'trip_templates';
      if (!table) return;
      await supabase.from(table).update({ status }).eq('id', targetId);
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

  global.Moderation = Moderation;
})(window);
