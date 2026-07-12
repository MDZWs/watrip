/**
 * POI 详情页扩展：吐槽列表、打卡、收藏等功能
 * 与 App.showPoiDetail 配合使用
 */
(function(global) {
  'use strict';

  const PoiDetailExt = {
    currentPoi: null,
    currentDayNum: null,

    /**
     * 初始化：在App.showPoiDetail调用后执行
     */
    init(spot, dayNum) {
      this.currentPoi = spot;
      this.currentDayNum = dayNum;
      this.loadRoasts(spot);
    },

    /**
     * 加载POI的用户吐槽
     */
    async loadRoasts(spot) {
      const roastListEl = document.getElementById('poiRoastList');
      const roastCountEl = document.getElementById('poiRoastCount');
      if (!roastListEl) return;

      roastListEl.innerHTML = '<div style="text-align:center;padding:20px;color:#BBB;font-size:13px;">加载中...</div>';

      try {
        let poiId = spot.poi_id || spot.id || '';

        // 如果没有poi_id，通过名称查找poi_topics
        if (!poiId && global.supabase) {
          const { data: topics } = await supabase
            .from('poi_topics')
            .select('id, poi_id, roast_count')
            .ilike('poi_name', spot.name)
            .limit(5);
          if (topics && topics.length > 0) {
            poiId = topics[0].poi_id;
            if (roastCountEl) {
              roastCountEl.textContent = '(' + (topics[0].roast_count || 0) + ')';
            }
          }
        }

        if (!poiId) {
          this._renderEmpty(roastListEl, roastCountEl);
          return;
        }

        const roasts = await this._fetchRoasts(poiId);
        this._renderRoasts(roasts, roastListEl, roastCountEl);
      } catch (e) {
        console.error('[PoiDetailExt] 加载吐槽失败:', e);
        roastListEl.innerHTML = '<div style="text-align:center;padding:24px 16px;"><div style="color:#999;font-size:13px;">加载失败</div></div>';
      }
    },

    async _fetchRoasts(poiId) {
      if (!global.supabase) return [];
      try {
        const { data: checkins } = await supabase
          .from('checkins')
          .select('id, poi_name, user_id, created_at')
          .eq('poi_id', poiId)
          .order('created_at', { ascending: false });
        const checkinIds = (checkins || []).map(c => c.id);
        if (checkinIds.length === 0) return [];

        const { data: roasts, error } = await supabase
          .from('roasts')
          .select('id, checkin_id, user_id, content, images, likes, favorites, status, created_at')
          .in('checkin_id', checkinIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;

        const userIds = [...new Set((roasts || []).map(r => r.user_id))];
        let authorMap = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, level')
            .in('id', userIds);
          (profiles || []).forEach(p => { authorMap[p.id] = p; });
        }

        return (roasts || []).map(r => ({
          ...r,
          author: authorMap[r.user_id] || {},
          checkin: checkins.find(c => c.id === r.checkin_id),
        }));
      } catch (e) {
        console.error('_fetchRoasts error:', e);
        return [];
      }
    },

    _renderRoasts(roasts, listEl, countEl) {
      if (countEl) countEl.textContent = '(' + roasts.length + ')';

      if (roasts.length === 0) {
        this._renderEmpty(listEl, countEl);
        return;
      }

      const previewRoasts = roasts.slice(0, 3);
      const div = document.createElement('div');
      listEl.innerHTML = previewRoasts.map(r => {
        const author = r.author || {};
        let avatar;
        if (author.avatar_url) {
          avatar = '<img src="' + author.avatar_url + '" style="width:28px;height:28px;border-radius:50%;">';
        } else {
          const ch = (author.username || '?')[0];
          avatar = '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#FFD6A5,#FFB983);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;">' + ch + '</div>';
        }
        const dt = new Date(r.created_at);
        const dateStr = (dt.getMonth() + 1) + '/' + dt.getDate();
        div.textContent = r.content;
        const escaped = div.innerHTML;
        return '<div class="poi-roast-item"><div class="poi-roast-head">' + avatar + '<div class="poi-roast-author"><span class="poi-roast-name">' + (author.username || '旅行者') + '</span><span class="poi-roast-date">Lv.' + (author.level || 1) + ' · ' + dateStr + '</span></div></div><div class="poi-roast-content">' + escaped + '</div><div class="poi-roast-stats"><span>❤️ ' + (r.likes || 0) + '</span><span>💬 0</span></div></div>';
      }).join('');

      const moreBtn = document.getElementById('poiRoastMoreBtn');
      if (moreBtn) moreBtn.style.display = roasts.length > 3 ? 'inline-block' : 'none';
    },

    _renderEmpty(listEl, countEl) {
      if (countEl) countEl.textContent = '(0)';
      listEl.innerHTML = '<div style="text-align:center;padding:24px 16px;"><div style="font-size:32px;margin-bottom:8px;">✍️</div><div style="color:#999;font-size:13px;">还没有吐槽，打卡后来说两句吧</div></div>';
    },

    /**
     * 查看全部吐槽
     */
    viewAll() {
      if (!this.currentPoi) return;
      const poiId = this.currentPoi.poi_id || this.currentPoi.id;
      if (typeof global.Roast !== 'undefined') {
        global.Roast.viewByPoi(poiId);
      } else if (typeof UiKit !== 'undefined') {
        UiKit.toast('吐槽模块未加载', 'error');
      }
    },

    /**
     * 打卡当前POI
     */
    checkin() {
      if (typeof global.Auth !== 'undefined' && !global.Auth.isLoggedIn()) {
        global.Auth.requireAuth();
        return;
      }
      if (typeof global.App !== 'undefined') {
        global.App.closePoiDetail();
      }
      setTimeout(function() {
        if (typeof global.CheckinAction !== 'undefined') {
          global.CheckinAction.openEntry();
        } else if (typeof UiKit !== 'undefined') {
          UiKit.toast('打卡功能未加载', 'error');
        }
      }, 300);
    },

    /**
     * 收藏当前POI
     */
    favorite() {
      if (typeof global.Auth !== 'undefined' && !global.Auth.isLoggedIn()) {
        global.Auth.requireAuth();
        return;
      }
      if (typeof UiKit !== 'undefined') {
        UiKit.toast('已收藏 ❤️', 'success');
      }
    },
  };

  global.PoiDetailExt = PoiDetailExt;
})(window);
