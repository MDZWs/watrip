/**
 * TravelNote - 图文游记模块（发布/查看/列表）
 *
 * 数据表：travel_notes + note_locations
 * 依赖：NoteEditor、Auth、supabase、UiKit、EventBus
 */
(function () {
  'use strict';

  const TravelNote = {
    state: {
      listCache: null,
    },

    /**
     * 打开编辑器发布新游记
     * @param {Object} opts { template } 挂载的行程模板（可选）
     */
    async publish(opts = {}) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof UiKit !== 'undefined') UiKit.toast('请先登录后发布游记', 'info');
        if (typeof Auth !== 'undefined') Auth.requireAuth();
        return;
      }
      if (typeof NoteEditor === 'undefined') {
        if (typeof UiKit !== 'undefined') UiKit.toast('编辑器未加载', 'error');
        return;
      }

      NoteEditor.open({
        template: opts.template,
        onSave: async (data) => {
          if (!data.title) {
            if (typeof UiKit !== 'undefined') UiKit.toast('请填写标题', 'error');
            return;
          }
          if (!data.content || data.content.replace(/<[^>]+>/g, '').trim().length < 10) {
            if (typeof UiKit !== 'undefined') UiKit.toast('正文内容太少，至少 10 字', 'error');
            return;
          }
          await this._saveToSupabase(data, opts.template);
        },
      });
    },

    /**
     * 查看游记详情
     * @param {String} noteId
     */
    async view(noteId) {
      if (!noteId) return;
      if (typeof UiKit !== 'undefined') UiKit.showLoading('加载游记...');
      try {
        const { data, error } = await supabase
          .from('travel_notes')
          .select('id, author_id, title, content, destination, cover_image, views, likes, favorites, created_at, profiles:author_id(username, avatar_url)')
          .eq('id', noteId)
          .single();
        if (error) throw error;
        if (!data) {
          if (typeof UiKit !== 'undefined') UiKit.toast('游记不存在', 'error');
          return;
        }
        this._renderDetail(data);
        // 异步增加浏览量 + 积分
        this._incrView(noteId, data.author_id).catch(() => {});
        // Phase 3.3：浏览游记触发新手任务
        if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('view_note');
      } catch (e) {
        console.error('[TravelNote] 加载失败:', e);
        if (typeof UiKit !== 'undefined') UiKit.toast('加载失败', 'error');
      } finally {
        if (typeof UiKit !== 'undefined') UiKit.hideLoading();
      }
    },

    /**
     * 获取游记列表（用于社区瀑布流展示）
     * @param {Object} opts { limit, offset, destination }
     */
    async getList(opts = {}) {
      const limit = opts.limit || 20;
      const offset = opts.offset || 0;
      try {
        let q = supabase
          .from('travel_notes')
          .select('id, title, destination, cover_image, cover_emoji, custom_tags, views, likes, favorites, created_at, author_id, profiles:author_id(username, avatar_url, custom_tags)')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (opts.destination) {
          q = q.ilike('destination', `%${opts.destination}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error('[TravelNote] 获取列表失败:', e);
        return [];
      }
    },

    // ============ 内部方法 ============
    async _saveToSupabase(data, template) {
      const user = Auth.getCurrentUser();
      if (typeof UiKit !== 'undefined') UiKit.showLoading('发布中...');
      try {
        // 提取首图 + emoji 封面
        const coverImage = this._extractFirstImage(data.content);
        const coverEmoji = this._extractFirstEmoji(data.content) || '✍️';

        // 提取地点标注
        const locations = this._extractLocations(data.content);

        const noteRow = {
          author_id: user.id,
          title: data.title,
          content: data.content,
          destination: data.destination || null,
          cover_image: coverImage,
          cover_emoji: coverEmoji,
          status: 'published',
          views: 0,
          likes: 0,
          favorites: 0,
        };
        // Phase 5.5：专属标签（Lv6 特权）
        if (Array.isArray(data.customTags) && data.customTags.length > 0) {
          noteRow.custom_tags = data.customTags;
        }
        if (template) {
          noteRow.attached_template_id = template.cloudId || null;
        }

        const { data: inserted, error } = await supabase
          .from('travel_notes')
          .insert(noteRow)
          .select('id')
          .single();
        if (error) throw error;

        // 插入地点标注
        if (locations.length > 0) {
          const locRows = locations.map((loc) => ({
            note_id: inserted.id,
            name: loc.name,
            address: loc.address || '',
            lng: loc.lng,
            lat: loc.lat,
          }));
          await supabase.from('note_locations').insert(locRows);
        }

        // 新手任务：发布第一篇游记（Phase 3.3 接入，此处先预留 EventBus）
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('note:published', { noteId: inserted.id, authorId: user.id });
        }
        if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('publish_note');
        // Phase 5.2：发布游记触发道具掉落
        try { if (typeof Items !== 'undefined') Items.tryDrop('publish_note'); } catch(e) {}

        if (typeof UiKit !== 'undefined') UiKit.hideLoading();
        if (typeof UiKit !== 'undefined') UiKit.toast('游记发布成功！', 'success');
        if (typeof NoteEditor !== 'undefined') NoteEditor.close();

        // 触发社区刷新
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('community:refresh');
        }
      } catch (e) {
        if (typeof UiKit !== 'undefined') UiKit.hideLoading();
        console.error('[TravelNote] 发布失败:', e);
        if (typeof UiKit !== 'undefined') UiKit.toast('发布失败：' + (e.message || '未知错误'), 'error');
      }
    },

    _extractFirstImage(html) {
      const m = html.match(/<img[^>]+src="([^"]+)"/);
      return m ? m[1] : null;
    },

    _extractFirstEmoji(html) {
      const m = html.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      return m ? m[0] : null;
    },

    _extractLocations(html) {
      const locations = [];
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('.note-location-mark').forEach((el) => {
        locations.push({
          name: el.dataset.name,
          address: el.dataset.address,
          lng: parseFloat(el.dataset.lng),
          lat: parseFloat(el.dataset.lat),
        });
      });
      return locations;
    },

    _renderDetail(note) {
      // 关闭编辑器（如果开着）
      if (typeof NoteEditor !== 'undefined') NoteEditor.close();

      const old = document.getElementById('noteDetailWrap');
      if (old) old.remove();

      const overlay = document.createElement('div');
      overlay.id = 'noteDetailWrap';
      overlay.className = 'note-detail-overlay';

      const authorName = (note.profiles && note.profiles.username) || '旅行者';
      const authorAvatar = (note.profiles && note.profiles.avatar_url) || '🧳';
      const avatarHtml = authorAvatar && authorAvatar.startsWith('http')
        ? `<img src="${authorAvatar}" class="nd-author-avatar">`
        : `<span class="nd-author-avatar emoji">${authorAvatar}</span>`;

      const coverHtml = note.cover_image
        ? `<div class="nd-cover" style="background-image:url('${note.cover_image}')"></div>`
        : `<div class="nd-cover emoji">${note.cover_emoji || '✍️'}</div>`;

      overlay.innerHTML = `
        <div class="note-detail-container">
          <div class="nd-header">
            <button class="nd-back" id="ndBack">‹</button>
            <div class="nd-actions">
              <button class="nd-action-btn" id="ndVoteBtn" title="投票">🎟️</button>
              <button class="nd-action-btn" id="ndLikeBtn">❤️</button>
              <button class="nd-action-btn" id="ndFavBtn">🔖</button>
            </div>
          </div>
          <div class="nd-content">
            ${coverHtml}
            <div class="nd-body">
              <h1 class="nd-title">${this._escape(note.title)}</h1>
              <div class="nd-meta">
                ${avatarHtml}
                <span class="nd-author-name" data-author-id="${note.author_id}">${authorName}</span>
                <span class="nd-dot">·</span>
                <span>${this._formatDate(note.created_at)}</span>
                ${note.destination ? `<span class="nd-dot">·</span><span>📍 ${this._escape(note.destination)}</span>` : ''}
              </div>
              <div class="nd-stats">
                <span>👁️ ${note.views || 0}</span>
                <span>❤️ ${note.likes || 0}</span>
                <span>🔖 ${note.favorites || 0}</span>
              </div>
              <div class="nd-html-content">${note.content}</div>
              <div class="nd-locations" id="ndLocations"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      // 绑定事件
      document.getElementById('ndBack').addEventListener('click', () => this._closeDetail());
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this._closeDetail();
      });

      // 作者名点击
      const authorEl = overlay.querySelector('.nd-author-name');
      if (authorEl) {
        authorEl.style.cursor = 'pointer';
        authorEl.addEventListener('click', () => {
          if (typeof AuthorSpace !== 'undefined' && note.author_id) {
            AuthorSpace.open(note.author_id);
          }
        });
      }

      // 点赞/收藏/投票按钮
      document.getElementById('ndLikeBtn').addEventListener('click', () => this._toggleLike(note.id, note.author_id, 'ndLikeBtn'));
      document.getElementById('ndFavBtn').addEventListener('click', () => this._toggleFavorite(note.id, note.author_id, 'ndFavBtn'));
      document.getElementById('ndVoteBtn').addEventListener('click', () => {
        if (typeof Voting !== 'undefined') {
          Voting.openVoteDialog(note.id, 'note', note.title);
        }
      });

      // 渲染地点标注列表
      this._renderLocations(note.id);

      // 显示
      setTimeout(() => overlay.classList.add('show'), 50);
    },

    _closeDetail() {
      const overlay = document.getElementById('noteDetailWrap');
      if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
      }
      document.body.style.overflow = '';
    },

    async _renderLocations(noteId) {
      try {
        const { data } = await supabase
          .from('note_locations')
          .select('name, address, lng, lat, id')
          .eq('note_id', noteId);
        const container = document.getElementById('ndLocations');
        if (!container) return;
        if (!data || data.length === 0) return;

        const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
        let favMap = {};
        if (user) {
          try {
            const { data: favs } = await supabase
              .from('favorites')
              .select('target_id')
              .eq('user_id', user.id)
              .eq('target_type', 'location');
            if (favs) {
              favs.forEach(f => { favMap[f.target_id] = true; });
            }
          } catch(e) {
            console.warn('[TravelNote] 加载收藏状态失败:', e);
          }
        }

        container.innerHTML = '<div class="nd-loc-title">📍 文中地点</div>' + data.map((loc) => {
          const locId = loc.id || (loc.name + '_' + loc.lng + '_' + loc.lat);
          const isFav = !!favMap[locId];
          return `
          <div class="nd-loc-item" data-id="${locId}" data-lng="${loc.lng}" data-lat="${loc.lat}" data-name="${this._escape(loc.name)}" data-address="${this._escape(loc.address || '')}">
            <span class="nd-loc-emoji">📍</span>
            <div class="nd-loc-info">
              <div class="nd-loc-name">${this._escape(loc.name)}</div>
              ${loc.address ? `<div class="nd-loc-addr">${this._escape(loc.address)}</div>` : ''}
            </div>
            <button class="nd-loc-fav ${isFav ? 'active' : ''}" data-loc-id="${locId}">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
        `;
        }).join('');

        container.querySelectorAll('.nd-loc-info, .nd-loc-emoji').forEach((el) => {
          el.addEventListener('click', (e) => {
            const item = el.closest('.nd-loc-item');
            if (!item) return;
            if (typeof App !== 'undefined' && App.openLocationOnMap) {
              App.openLocationOnMap({
                lng: parseFloat(item.dataset.lng),
                lat: parseFloat(item.dataset.lat),
                name: item.dataset.name,
              });
            }
          });
        });

        container.querySelectorAll('.nd-loc-fav').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleLocationFav(btn);
          });
        });
      } catch (e) {
        console.warn('[TravelNote] 加载地点失败:', e);
      }
    },

    async _toggleLocationFav(btn) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof UiKit !== 'undefined') UiKit.toast('请先登录', 'info');
        if (typeof Auth !== 'undefined') Auth.requireAuth();
        return;
      }
      const user = Auth.getCurrentUser();
      const item = btn.closest('.nd-loc-item');
      if (!item) return;
      const locId = btn.dataset.locId;
      const name = item.dataset.name;
      const address = item.dataset.address;
      const lng = item.dataset.lng;
      const lat = item.dataset.lat;
      const isFav = btn.classList.contains('active');

      try {
        if (isFav) {
          await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('target_id', locId)
            .eq('target_type', 'location');
          btn.classList.remove('active');
          btn.textContent = '🤍';
          if (typeof UiKit !== 'undefined') UiKit.toast('已取消收藏', 'info');
        } else {
          await supabase.from('favorites').insert({
            user_id: user.id,
            target_id: locId,
            target_type: 'location',
            extra: { name, address, lng, lat }
          });
          btn.classList.add('active');
          btn.textContent = '❤️';
          if (typeof UiKit !== 'undefined') UiKit.toast('已收藏该地点', 'success');
        }
      } catch (e) {
        console.error('[TravelNote] 收藏地点失败:', e);
        if (typeof UiKit !== 'undefined') UiKit.toast('操作失败', 'error');
      }
    },

    async _incrView(noteId, authorId) {
      const { error } = await supabase
        .from('travel_notes')
        .rpc('increment_view', { note_id: noteId });
      // 如果没有 RPC，降级为直接更新
      if (error) {
        try {
          const { data } = await supabase
            .from('travel_notes')
            .select('views')
            .eq('id', noteId)
            .single();
          if (data) {
            await supabase
              .from('travel_notes')
              .update({ views: (data.views || 0) + 1 })
              .eq('id', noteId);
          }
        } catch {}
      }
      // 积分：被看 +1
      const user = (typeof Auth !== 'undefined') ? Auth.getCurrentUser() : null;
      if (user && user.id !== authorId && typeof PointsCore !== 'undefined') {
        PointsCore.onViewed(authorId, user.id, noteId, 'note').catch(() => {});
      }
    },

    async _toggleLike(noteId, authorId, btnId) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof UiKit !== 'undefined') UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      const user = Auth.getCurrentUser();
      const btn = document.getElementById(btnId);
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', noteId)
        .eq('target_type', 'note')
        .maybeSingle();
      if (existing) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', noteId)
          .eq('target_type', 'note');
        if (btn) btn.classList.remove('active');
        if (typeof UiKit !== 'undefined') UiKit.toast('已取消点赞', 'info');
        // 更新计数
        const { data } = await supabase.from('travel_notes').select('likes').eq('id', noteId).single();
        if (data) {
          await supabase.from('travel_notes').update({ likes: Math.max(0, (data.likes || 0) - 1) }).eq('id', noteId);
        }
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: user.id, target_id: noteId, target_type: 'note' });
        if (btn) btn.classList.add('active');
        if (typeof UiKit !== 'undefined') UiKit.toast('点赞成功', 'success');
        // Phase 3.3：首次点赞游记触发新手任务
        if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('first_like');
        // 积分
        if (typeof PointsCore !== 'undefined') {
          PointsCore.onLiked(authorId, user.id, noteId, 'note').catch(() => {});
        }
        // 更新计数
        const { data } = await supabase.from('travel_notes').select('likes').eq('id', noteId).single();
        if (data) {
          await supabase.from('travel_notes').update({ likes: (data.likes || 0) + 1 }).eq('id', noteId);
        }
      }
    },

    async _toggleFavorite(noteId, authorId, btnId) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof UiKit !== 'undefined') UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      const user = Auth.getCurrentUser();
      const btn = document.getElementById(btnId);
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', noteId)
        .eq('target_type', 'note')
        .maybeSingle();
      if (existing) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', noteId)
          .eq('target_type', 'note');
        if (btn) btn.classList.remove('active');
        if (typeof UiKit !== 'undefined') UiKit.toast('已取消收藏', 'info');
        // 更新计数
        const { data } = await supabase.from('travel_notes').select('favorites').eq('id', noteId).single();
        if (data) {
          await supabase.from('travel_notes').update({ favorites: Math.max(0, (data.favorites || 0) - 1) }).eq('id', noteId);
        }
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, target_id: noteId, target_type: 'note' });
        if (btn) btn.classList.add('active');
        if (typeof UiKit !== 'undefined') UiKit.toast('收藏成功', 'success');
        // 积分
        if (typeof PointsCore !== 'undefined') {
          PointsCore.onFavorited(authorId, user.id, noteId, 'note').catch(() => {});
        }
        // 更新计数
        const { data } = await supabase.from('travel_notes').select('favorites').eq('id', noteId).single();
        if (data) {
          await supabase.from('travel_notes').update({ favorites: (data.favorites || 0) + 1 }).eq('id', noteId);
        }
      }
    },

    _formatDate(s) {
      if (!s) return '';
      const d = new Date(s);
      const now = new Date();
      const diff = (now - d) / 1000;
      if (diff < 60) return '刚刚';
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
      if (diff < 604800) return Math.floor(diff / 86400) + '天前';
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    },

    _escape(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    createFromSpot(spot, content, dayIndex) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof UiKit !== 'undefined') UiKit.toast('请先登录后分享', 'info');
        if (typeof Auth !== 'undefined') Auth.requireAuth();
        return;
      }
      if (typeof NoteEditor === 'undefined') {
        if (typeof UiKit !== 'undefined') UiKit.toast('编辑器未加载', 'error');
        return;
      }

      const title = `${spot.name}游玩攻略`;
      const dest = TripDetail.trip?.destination || TripDetail.trip?.city || spot.city || '';
      const dayNum = dayIndex + 1;

      const wrappedContent = `
        <p style="background:linear-gradient(135deg,#fff6e5,#ffedd5);padding:12px 16px;border-radius:12px;margin-bottom:16px;border-left:4px solid #FF8A3D;">
          <strong>📍 地点：</strong>${spot.name}<br>
          ${dest ? `<strong>🗺️ 行程：</strong>${dest} · 第${dayNum}天<br>` : ''}
          <strong>✨ 来源：</strong>AI基于真实游玩手帐总结
        </p>
        <p>${content.replace(/\n/g, '</p><p>')}</p>
        ${spot.address ? `<p style="color:#999;font-size:0.9em;margin-top:20px;">地址：${spot.address}</p>` : ''}
      `;

      NoteEditor.open({
        title: title,
        content: wrappedContent,
        destination: dest,
        onSave: async (data) => {
          if (!data.title) {
            if (typeof UiKit !== 'undefined') UiKit.toast('请填写标题', 'error');
            return;
          }
          await this._saveToSupabase(data);
        }
      });
    }
  };

  window.TravelNote = TravelNote;
})();
