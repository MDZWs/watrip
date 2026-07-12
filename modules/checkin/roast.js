/**
 * 吐槽系统（Phase 4.2）
 * 职责：吐槽编辑/保存/查看/点赞/收藏/举报 + 关键词过滤 + 积分发放
 * 依赖：Auth、PointsCore、UiKit、UIRender、EventBus
 *
 * 规则：
 *   - 打卡后可选写吐槽，发布 +5 积分
 *   - 被点赞 +2 积分，被收藏 +3 积分
 *   - 先发后审：发布即可见，自动关键词过滤，3 举报自动隐藏
 *   - 违规零容忍：举报确认违规 → 作者 -30 积分
 */
(function (global) {
  // 简易敏感词表（先发后审的第一道防线，管理员后续人工复核）
  const BLOCKED_WORDS = [
    '广告', '微信号', '加我', '代购', '刷单', '赌博', '色情', '诈骗',
    'fuck', 'shit', '垃圾', '傻逼', '滚',
  ];

  const Roast = {
    state: {
      currentCheckinId: null,
    },

    /**
     * 打开吐槽编辑器
     * @param {string} checkinId - 关联的打卡记录 ID
     * @param {object} poiInfo - { poiName } 用于显示
     */
    openEditor(checkinId, poiInfo = {}) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      this.state.currentCheckinId = checkinId;
      this._renderEditor(checkinId, poiInfo);
    },

    /**
     * 渲染编辑器弹窗
     */
    _renderEditor(checkinId, poiInfo) {
      const poiName = poiInfo.poiName || '该地点';
      const html = `
        <div class="roast-editor-wrap">
          <div class="roast-poi-tag">📍 ${poiName}</div>
          <textarea id="roastContent" class="roast-textarea" placeholder="吐槽一下这个地点的真实体验&#10;例如：人多排队久、性价比低、隐藏玩法..." maxlength="500" rows="5"></textarea>
          <div class="roast-toolbar">
            <div class="roast-count"><span id="roastCount">0</span>/500</div>
            <div class="roast-tip">+5 积分 · 先发后审</div>
          </div>
          <div class="roast-rules">
            <div>• 文明发言，违规将被扣 30 积分</div>
            <div>• 3 次举报自动隐藏，等待管理员复核</div>
          </div>
          <button class="roast-submit-btn" id="roastSubmitBtn">发布吐槽</button>
        </div>
      `;
      UIRender.showAlertModal('写吐槽', html);

      setTimeout(() => {
        const textarea = document.getElementById('roastContent');
        const countEl = document.getElementById('roastCount');
        const btn = document.getElementById('roastSubmitBtn');
        if (!textarea || !btn) return;

        textarea.oninput = () => {
          countEl.textContent = textarea.value.length;
        };

        btn.onclick = async () => {
          const content = textarea.value.trim();
          if (!content) {
            UiKit.toast('请输入吐槽内容', 'info');
            return;
          }
          if (content.length < 5) {
            UiKit.toast('内容太短，至少 5 个字', 'info');
            return;
          }
          // 关键词过滤
          const hit = this._checkBlocked(content);
          if (hit) {
            UiKit.toast(`内容包含敏感词「${hit}」，请修改`, 'error', 3000);
            return;
          }

          btn.disabled = true;
          btn.textContent = '发布中...';
          await this._save(checkinId, content);
        };

        textarea.focus();
      }, 50);
    },

    /**
     * 关键词检测
     */
    _checkBlocked(text) {
      const lower = text.toLowerCase();
      for (const w of BLOCKED_WORDS) {
        if (lower.includes(w.toLowerCase())) return w;
      }
      return null;
    },

    /**
     * 保存吐槽
     */
    async _save(checkinId, content) {
      try {
        const user = Auth.getCurrentUser();
        // 1. 写入 roasts
        const { data: inserted, error } = await supabase
          .from('roasts')
          .insert({
            checkin_id: checkinId,
            user_id: user.id,
            content,
            images: [],
            status: 'published',
          })
          .select('id')
          .single();
        if (error) throw error;

        // 2. 更新 checkins.has_roast = true
        await supabase
          .from('checkins')
          .update({ has_roast: true })
          .eq('id', checkinId);

        // 3. 更新 poi_topics.roast_count +1
        const { data: ck } = await supabase
          .from('checkins')
          .select('poi_id')
          .eq('id', checkinId)
          .single();
        if (ck && ck.poi_id) {
          const { data: topic } = await supabase
            .from('poi_topics')
            .select('id, roast_count')
            .eq('poi_id', ck.poi_id)
            .maybeSingle();
          if (topic) {
            await supabase
              .from('poi_topics')
              .update({ roast_count: (topic.roast_count || 0) + 1, updated_at: new Date().toISOString() })
              .eq('id', topic.id);
          }
        }

        // 4. 发放 +5 积分
        if (typeof PointsCore !== 'undefined') {
          await PointsCore._addPoints(user.id, 5, 'roast', { id: inserted.id, type: 'roast' });
        }
        // Phase 5.2：发布吐槽触发道具掉落
        try { if (typeof Items !== 'undefined') Items.tryDrop('publish_roast'); } catch(e) {}

        // 5. 通知 + toast
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('roast:published', { roastId: inserted.id, checkinId });
        }
        UiKit.toast('✅ 吐槽发布成功 +5 积分', 'success', 2500);

        // 关闭弹窗
        const modal = document.getElementById('alertModal');
        if (modal) modal.classList.remove('show');
      } catch (e) {
        console.error('[Roast] 保存失败:', e);
        UiKit.toast('发布失败：' + (e.message || '未知错误'), 'error');
        const btn = document.getElementById('roastSubmitBtn');
        if (btn) { btn.disabled = false; btn.textContent = '发布吐槽'; }
      }
    },

    /**
     * 查看某 POI 的吐槽列表
     * @param {string} poiId
     */
    async viewByPoi(poiId) {
      if (!poiId) return;
      UiKit.showLoading('加载吐槽...');
      try {
        // 查询该 POI 所有打卡的吐槽
        const { data: checkins } = await supabase
          .from('checkins')
          .select('id, poi_name')
          .eq('poi_id', poiId);
        const checkinIds = (checkins || []).map(c => c.id);
        if (checkinIds.length === 0) {
          UiKit.hideLoading();
          this._renderList([], poiId);
          return;
        }
        const { data: roasts, error } = await supabase
          .from('roasts')
          .select('id, checkin_id, user_id, content, likes, favorites, status, created_at')
          .in('checkin_id', checkinIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(50);
        UiKit.hideLoading();
        if (error) throw error;

        // 批量查询作者信息
        const userIds = [...new Set((roasts || []).map(r => r.user_id))];
        let authorMap = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, level')
            .in('id', userIds);
          (profiles || []).forEach(p => { authorMap[p.id] = p; });
        }
        this._renderList(roasts || [], poiId, authorMap, checkins);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[Roast] 加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 渲染吐槽列表
     */
    _renderList(roasts, poiId, authorMap = {}, checkins = []) {
      const poiName = checkins[0]?.poi_name || '该地点';
      const listHtml = roasts.length === 0
        ? `<div class="roast-empty">
             <div style="font-size:36px;margin-bottom:8px;">✍️</div>
             <div>还没有吐槽，快来第一个吐槽吧</div>
           </div>`
        : roasts.map(r => {
            const author = authorMap[r.user_id] || {};
            const avatar = author.avatar_url
              ? `<img src="${author.avatar_url}" class="roast-avatar">`
              : `<div class="roast-avatar roast-avatar-default">${(author.username || '?')[0]}</div>`;
            const dt = new Date(r.created_at);
            const dateStr = `${dt.getMonth()+1}月${dt.getDate()}日`;
            return `
              <div class="roast-card" data-id="${r.id}">
                <div class="roast-card-head">
                  ${avatar}
                  <div class="roast-author">
                    <div class="roast-author-name">${author.username || '匿名'}</div>
                    <div class="roast-time">Lv.${author.level || 1} · ${dateStr}</div>
                  </div>
                </div>
                <div class="roast-content">${this._escapeHtml(r.content)}</div>
                <div class="roast-actions">
                  <div class="roast-action roast-like" data-id="${r.id}">
                    <span class="roast-action-icon">❤️</span>
                    <span>${r.likes || 0}</span>
                  </div>
                  <div class="roast-action roast-fav" data-id="${r.id}">
                    <span class="roast-action-icon">⭐</span>
                    <span>${r.favorites || 0}</span>
                  </div>
                  <div class="roast-action roast-report" data-id="${r.id}">举报</div>
                </div>
              </div>
            `;
          }).join('');

      const html = `
        <div class="roast-list-wrap">
          <div class="roast-list-header">
            <div class="roast-list-poi">📍 ${poiName}</div>
            <div class="roast-list-count">${roasts.length} 条吐槽</div>
          </div>
          <div class="roast-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('吐槽', html);

      // 绑定交互
      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        modal.querySelectorAll('.roast-like').forEach(el => {
          el.onclick = () => this._toggleLike(el.dataset.id, el);
        });
        modal.querySelectorAll('.roast-fav').forEach(el => {
          el.onclick = () => this._toggleFavorite(el.dataset.id, el);
        });
        modal.querySelectorAll('.roast-report').forEach(el => {
          el.onclick = () => this._report(el.dataset.id);
        });
      }, 50);
    },

    /**
     * 点赞吐槽
     */
    async _toggleLike(roastId, el) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      const user = Auth.getCurrentUser();
      try {
        // 查询是否已点赞（用 favorites 表，target_type='roast'）
        const { data: existing } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('target_id', roastId)
          .eq('target_type', 'roast_like')
          .maybeSingle();

        if (existing) {
          UiKit.toast('已点赞过', 'info');
          return;
        }

        // 写入点赞记录
        await supabase.from('favorites').insert({
          user_id: user.id,
          target_id: roastId,
          target_type: 'roast_like',
        });

        // 更新 roasts.likes +1
        const { data: r } = await supabase
          .from('roasts')
          .select('likes, user_id')
          .eq('id', roastId)
          .single();
        if (r) {
          await supabase.from('roasts').update({ likes: (r.likes || 0) + 1 }).eq('id', roastId);
          // 给吐槽作者 +2 积分
          if (r.user_id !== user.id && typeof PointsCore !== 'undefined') {
            await PointsCore._addPoints(r.user_id, 2, 'roast_liked', { id: roastId, type: 'roast' });
          }
        }

        // UI 更新
        el.classList.add('roast-active');
        const numEl = el.querySelector('span:last-child');
        if (numEl) numEl.textContent = (parseInt(numEl.textContent, 10) || 0) + 1;
        UiKit.toast('点赞成功', 'success');
      } catch (e) {
        console.error('[Roast] 点赞失败:', e);
        UiKit.toast('点赞失败', 'error');
      }
    },

    /**
     * 收藏吐槽
     */
    async _toggleFavorite(roastId, el) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      const user = Auth.getCurrentUser();
      try {
        const { data: existing } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('target_id', roastId)
          .eq('target_type', 'roast_fav')
          .maybeSingle();

        if (existing) {
          UiKit.toast('已收藏过', 'info');
          return;
        }

        await supabase.from('favorites').insert({
          user_id: user.id,
          target_id: roastId,
          target_type: 'roast_fav',
        });

        const { data: r } = await supabase
          .from('roasts')
          .select('favorites, user_id')
          .eq('id', roastId)
          .single();
        if (r) {
          await supabase.from('roasts').update({ favorites: (r.favorites || 0) + 1 }).eq('id', roastId);
          if (r.user_id !== user.id && typeof PointsCore !== 'undefined') {
            await PointsCore._addPoints(r.user_id, 3, 'roast_favorited', { id: roastId, type: 'roast' });
          }
        }

        el.classList.add('roast-active');
        const numEl = el.querySelector('span:last-child');
        if (numEl) numEl.textContent = (parseInt(numEl.textContent, 10) || 0) + 1;
        UiKit.toast('收藏成功', 'success');
      } catch (e) {
        console.error('[Roast] 收藏失败:', e);
        UiKit.toast('收藏失败', 'error');
      }
    },

    /**
     * 举报吐槽
     */
    async _report(roastId) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      const user = Auth.getCurrentUser();
      // 二次确认
      const ok = await UiKit.confirm('确定举报这条吐槽？', '举报后将进入管理员复核队列');
      if (!ok) return;

      try {
        // 写入 reports 表
        await supabase.from('reports').insert({
          reporter_id: user.id,
          target_type: 'roast',
          target_id: roastId,
          reason: '用户举报',
        });

        // 检查举报数，达 3 次自动隐藏
        const { count } = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('target_id', roastId)
          .eq('target_type', 'roast')
          .eq('status', 'pending');
        if ((count || 0) >= 3) {
          await supabase.from('roasts').update({ status: 'hidden' }).eq('id', roastId);
          // 写入 moderation_queue
          await supabase.from('moderation_queue').insert({
            target_type: 'roast',
            target_id: roastId,
            reason: `自动触发：${count} 次举报`,
            status: 'pending',
          });
          UiKit.toast('已举报，因多次举报该内容已暂时隐藏', 'success', 3000);
        } else {
          UiKit.toast('已举报，管理员将进行复核', 'success');
        }
      } catch (e) {
        console.error('[Roast] 举报失败:', e);
        UiKit.toast('举报失败', 'error');
      }
    },

    /**
     * HTML 转义
     */
    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
  };

  global.Roast = Roast;
})(window);
