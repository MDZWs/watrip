/**
 * POI 专题区（Phase 4.3）
 * 职责：POI 列表浏览 + 专题详情页（地图小窗+地址+打卡数 + 吐槽瀑布 + 头像墙）
 * 依赖：Auth、Roast、CheckinAction、AmapHelper、UiKit、UIRender、EventBus
 *
 * 布局：
 *   顶部：地图小窗 + POI 名称 + 地址 + 打卡数 + 「去打卡」按钮
 *   下方：吐槽瀑布 + 头像墙（最近打卡用户）
 */
(function (global) {
  const PoiTopic = {
    state: {
      currentPoiId: null,
    },

    /**
     * 打开 POI 列表（按打卡数排序）
     */
    async openList() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      UiKit.showLoading('加载热门地点...');
      try {
        const { data, error } = await supabase
          .from('poi_topics')
          .select('poi_id, poi_name, lng, lat, address, checkin_count, roast_count')
          .order('checkin_count', { ascending: false })
          .limit(30);
        UiKit.hideLoading();
        if (error) throw error;
        this._renderList(data || []);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[PoiTopic] 加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 渲染 POI 列表
     */
    _renderList(list) {
      const listHtml = list.length === 0
        ? `<div class="pt-empty">
             <div style="font-size:36px;margin-bottom:8px;">🗺️</div>
             <div>暂无热门 POI</div>
             <div style="font-size:11px;margin-top:4px;">去打卡创建第一个专题吧</div>
           </div>`
        : list.map((p, i) => {
            const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="pt-rank-num">${i+1}</span>`;
            return `
              <div class="pt-list-item" data-poi-id="${p.poi_id}">
                <div class="pt-rank">${rankIcon}</div>
                <div class="pt-list-main">
                  <div class="pt-list-name">${p.poi_name}</div>
                  <div class="pt-list-addr">${p.address || '地址未记录'}</div>
                  <div class="pt-list-stats">
                    <span>📍 ${p.checkin_count || 0} 打卡</span>
                    <span>✍️ ${p.roast_count || 0} 吐槽</span>
                  </div>
                </div>
                <div class="pt-list-arrow">›</div>
              </div>
            `;
          }).join('');

      const html = `
        <div class="pt-list-wrap">
          <div class="pt-list-header">
            <div class="pt-list-title">🔥 热门打卡地点</div>
            <div class="pt-list-sub">按打卡数排序</div>
          </div>
          <div class="pt-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('POI 专题', html);

      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        modal.querySelectorAll('.pt-list-item').forEach(item => {
          item.onclick = () => {
            const poiId = item.dataset.poiId;
            if (modal) modal.classList.remove('show');
            this.openTopic(poiId);
          };
        });
      }, 50);
    },

    /**
     * 打开 POI 专题详情
     */
    async openTopic(poiId) {
      if (!poiId) return;
      this.state.currentPoiId = poiId;
      UiKit.showLoading('加载专题...');
      try {
        // 1. 查询 POI 专题信息
        const { data: topic, error } = await supabase
          .from('poi_topics')
          .select('poi_id, poi_name, lng, lat, address, checkin_count, roast_count')
          .eq('poi_id', poiId)
          .single();
        if (error || !topic) {
          UiKit.hideLoading();
          UiKit.toast('POI 专题不存在', 'error');
          return;
        }

        // 2. 查询最近打卡用户（头像墙，最多 20 个）
        const { data: recentCheckins } = await supabase
          .from('checkins')
          .select('id, user_id, type, created_at')
          .eq('poi_id', poiId)
          .order('created_at', { ascending: false })
          .limit(20);

        // 3. 批量查询用户资料
        const userIds = [...new Set((recentCheckins || []).map(c => c.user_id))];
        let authorMap = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, level')
            .in('id', userIds);
          (profiles || []).forEach(p => { authorMap[p.id] = p; });
        }

        // 4. 查询该 POI 的吐槽
        const checkinIds = (recentCheckins || []).map(c => c.id);
        let roasts = [];
        if (checkinIds.length > 0) {
          const { data: roastData } = await supabase
            .from('roasts')
            .select('id, checkin_id, user_id, content, likes, favorites, status, created_at')
            .in('checkin_id', checkinIds)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(20);
          roasts = roastData || [];
        }

        UiKit.hideLoading();
        this._renderTopic(topic, recentCheckins || [], authorMap, roasts);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[PoiTopic] 加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 渲染专题详情页
     */
    _renderTopic(topic, checkins, authorMap, roasts) {
      // 地图小窗（静态地图占位 + 坐标）
      const mapHtml = this._renderMapWindow(topic);

      // 头像墙
      const avatarWallHtml = checkins.length === 0
        ? `<div class="pt-avatar-empty">还没有人打卡</div>`
        : `<div class="pt-avatar-wall">
             ${checkins.slice(0, 20).map(c => {
               const u = authorMap[c.user_id] || {};
               const avatar = u.avatar_url
                 ? `<img src="${u.avatar_url}" class="pt-avatar" title="${u.username || ''}">`
                 : `<div class="pt-avatar pt-avatar-default" title="${u.username || ''}">${(u.username || '?')[0]}</div>`;
               const badge = c.type === 'field' ? '<span class="pt-avatar-badge pt-avatar-badge-field">📍</span>' : '<span class="pt-avatar-badge pt-avatar-badge-cloud">☁️</span>';
               return `<div class="pt-avatar-wrap" data-user-id="${c.user_id}">${avatar}${badge}</div>`;
             }).join('')}
           </div>`;

      // 吐槽瀑布
      const roastHtml = roasts.length === 0
        ? `<div class="pt-roast-empty">
             <div style="font-size:32px;margin-bottom:6px;">✍️</div>
             <div>还没有吐槽，打卡后快来第一个吐槽</div>
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
                    <span class="roast-action-icon">❤️</span><span>${r.likes || 0}</span>
                  </div>
                  <div class="roast-action roast-fav" data-id="${r.id}">
                    <span class="roast-action-icon">⭐</span><span>${r.favorites || 0}</span>
                  </div>
                  <div class="roast-action roast-report" data-id="${r.id}">举报</div>
                </div>
              </div>
            `;
          }).join('');

      const html = `
        <div class="pt-topic-wrap">
          ${mapHtml}
          <div class="pt-topic-actions">
            <button class="pt-checkin-btn" id="ptCheckinBtn">📍 我要打卡</button>
            <button class="pt-write-roast-btn" id="ptWriteRoastBtn">✍️ 写吐槽</button>
          </div>
          <div class="pt-section">
            <div class="pt-section-title">👥 打卡用户（${checkins.length}）</div>
            ${avatarWallHtml}
          </div>
          <div class="pt-section">
            <div class="pt-section-title">✍️ 真实吐槽（${roasts.length}）</div>
            <div class="pt-roast-list">${roastHtml}</div>
          </div>
        </div>
      `;
      UIRender.showAlertModal(topic.poi_name, html);

      // 绑定交互
      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        document.getElementById('ptCheckinBtn')?.addEventListener('click', () => {
          if (modal) modal.classList.remove('show');
          if (typeof CheckinAction !== 'undefined') CheckinAction.cloudCheckin();
        });
        document.getElementById('ptWriteRoastBtn')?.addEventListener('click', async () => {
          if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            Auth.requireAuth();
            return;
          }
          // 检查是否已打卡该 POI
          const user = Auth.getCurrentUser();
          const { data: myCheckin } = await supabase
            .from('checkins')
            .select('id')
            .eq('user_id', user.id)
            .eq('poi_id', topic.poi_id)
            .limit(1);
          if (!myCheckin || myCheckin.length === 0) {
            UiKit.toast('需先打卡才能写吐槽', 'info', 2500);
            return;
          }
          if (modal) modal.classList.remove('show');
          if (typeof Roast !== 'undefined') Roast.openEditor(myCheckin[0].id, { poiName: topic.poi_name });
        });
        // 头像墙点击 → 作者空间
        modal.querySelectorAll('.pt-avatar-wrap').forEach(w => {
          w.onclick = () => {
            const uid = w.dataset.userId;
            if (modal) modal.classList.remove('show');
            if (typeof AuthorSpace !== 'undefined') AuthorSpace.open(uid);
          };
        });
        // 吐槽交互
        modal.querySelectorAll('.roast-like').forEach(el => {
          el.onclick = () => { if (typeof Roast !== 'undefined') Roast._toggleLike(el.dataset.id, el); };
        });
        modal.querySelectorAll('.roast-fav').forEach(el => {
          el.onclick = () => { if (typeof Roast !== 'undefined') Roast._toggleFavorite(el.dataset.id, el); };
        });
        modal.querySelectorAll('.roast-report').forEach(el => {
          el.onclick = () => { if (typeof Roast !== 'undefined') Roast._report(el.dataset.id); };
        });
      }, 50);
    },

    /**
     * 渲染地图小窗（静态地图占位）
     */
    _renderMapWindow(topic) {
      const lng = topic.lng || 0;
      const lat = topic.lat || 0;
      // 使用高德静态地图 API（如 Web Key 可用则使用，否则降级为样式占位）
      const amapKey = (typeof CONFIG !== 'undefined' && CONFIG.AMAP_WEB_KEY) || '';
      let mapBg = '';
      if (amapKey && lng && lat) {
        mapBg = `background-image:url('https://restapi.amap.com/v3/staticmap?location=${lng},${lat}&zoom=15&size=400*200&markers=mid,0xFF8A3D,A:${lng},${lat}&key=${amapKey}');background-size:cover;background-position:center;`;
      } else {
        mapBg = `background:linear-gradient(135deg,#E0F4FF,#B8E0FF);`;
      }
      return `
        <div class="pt-map-window" style="${mapBg}">
          <div class="pt-map-marker">📍</div>
          <div class="pt-map-info">
            <div class="pt-map-name">${topic.poi_name}</div>
            <div class="pt-map-addr">${topic.address || '地址未记录'}</div>
          </div>
          <div class="pt-map-stats">
            <div class="pt-map-stat">
              <div class="pt-map-stat-num">${topic.checkin_count || 0}</div>
              <div class="pt-map-stat-label">打卡</div>
            </div>
            <div class="pt-map-stat">
              <div class="pt-map-stat-num">${topic.roast_count || 0}</div>
              <div class="pt-map-stat-label">吐槽</div>
            </div>
          </div>
        </div>
      `;
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

  global.PoiTopic = PoiTopic;
})(window);
