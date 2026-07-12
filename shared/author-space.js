/**
 * 作者空间模块 - 展示作者主页 + 关注/取关
 * 设计风格：Tab切换 + 网格卡片
 * 依赖: Auth, TripStorage, UiKit, EventBus
 */
(function () {
  'use strict';

  const AuthorSpace = {
    state: { currentAuthor: null, isFollowing: false, isSelf: false },

    async open(authorId) {
      if (!authorId) return;
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录后查看', 'info');
        Auth.requireAuth();
        return;
      }
      if (typeof supabase === 'undefined') {
        UiKit.toast('系统未就绪', 'error');
        return;
      }

      UiKit.showLoading('加载中...');

      const currentUser = Auth.getCurrentUser();
      const isSelf = currentUser && currentUser.id === authorId;

      try {
        // 并行查询所有数据，提升加载速度
        const [authorRes, tripsRes, notesRes, collectionsRes, followRes, followerRes] = await Promise.all([
          // 作者资料
          supabase
            .from('profiles')
            .select('id, username, avatar_url, bio, level, points, exp, role, theme, custom_tags, created_at')
            .eq('id', authorId)
            .single(),
          // 行程（带上完整 day_plans，点击时直接用，避免二次查询）
          supabase
            .from('trip_templates')
            .select('id, title, destination, city, days, budget, day_plans, likes, favorites, copies, suitable_for, custom_tags, author_id, created_at')
            .eq('author_id', authorId)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(20),
          // 游记
          supabase
            .from('travel_notes')
            .select('id, title, destination, cover_image, cover_emoji, views, likes, favorites, custom_tags, created_at')
            .eq('author_id', authorId)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(20),
          // 公开合集
          supabase
            .from('collections')
            .select('id, name, description, cover_emoji, created_at')
            .eq('user_id', authorId)
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(10),
          // 是否已关注
          !isSelf ? supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', authorId)
            .maybeSingle() : Promise.resolve({ data: null }),
          // 粉丝数
          supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', authorId),
        ]);

        const author = authorRes.data;
        const error = authorRes.error;

        if (error || !author) {
          UiKit.hideLoading();
          UiKit.toast('用户不存在', 'error');
          return;
        }

        const trips = tripsRes.data || [];
        const notes = notesRes.data || [];
        const collections = collectionsRes.data || [];
        const isFollowing = !isSelf && !!followRes.data;
        const followerCount = followerRes.count || 0;

        // 统计总获赞
        const tripLikes = trips.reduce((sum, t) => sum + (t.likes || 0), 0);
        const noteLikes = notes.reduce((sum, n) => sum + (n.likes || 0), 0);
        const totalLikes = tripLikes + noteLikes;

        UiKit.hideLoading();

        this.state.currentAuthor = author;
        this.state.isFollowing = isFollowing;
        this.state.isSelf = isSelf;
        this.state.trips = trips;
        this.state.notes = notes;

        this._renderModal(author, trips, notes, collections, isFollowing, followerCount, totalLikes);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[AuthorSpace] 加载失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    _renderModal(author, trips, notes, collections, isFollowing, followerCount, totalLikes) {
      // 移除已有弹窗
      const oldMask = document.getElementById('authorSpaceMask');
      if (oldMask) oldMask.remove();

      const isSelf = this.state.isSelf;
      const totalContent = trips.length + notes.length;
      const self = this;

      // 头像HTML
      let avatarHtml = '';
      if (author.avatar_url) {
        avatarHtml = '<img src="' + author.avatar_url + '" class="as-avatar-img">';
      } else {
        avatarHtml = '<div class="as-avatar-placeholder">' + (author.username || '?')[0] + '</div>';
      }

      // 等级名
      const levelName = this._levelName(author.level || 1);

      // 标签
      let tagsHtml = '';
      if (author.custom_tags && author.custom_tags.length > 0) {
        tagsHtml = '<div class="as-tags">';
        for (let i = 0; i < author.custom_tags.length; i++) {
          tagsHtml += '<span class="as-tag">🏷️ ' + this._escape(author.custom_tags[i]) + '</span>';
        }
        tagsHtml += '</div>';
      }

      // 构建HTML
      let html = '';
      html += '<div class="as-modal">';
      html += '  <div class="as-header">';
      html += '    <button class="as-close-btn" id="authorSpaceClose">×</button>';
      html += '    <div class="as-user-info">';
      html += '      ' + avatarHtml;
      html += '      <div class="as-user-text">';
      html += '        <div class="as-username">' + this._escape(author.username || '旅行者') + '</div>';
      html += '        <div class="as-user-meta">Lv.' + (author.level || 1) + ' ' + levelName + ' · ' + followerCount + ' 粉丝</div>';
      html += '        <div class="as-bio">' + this._escape(author.bio || '这个人很懒，还没写简介') + '</div>';
      html += '        ' + tagsHtml;
      html += '      </div>';
      html += '    </div>';
      html += '    <div class="as-stats">';
      html += '      <div class="as-stat-item"><div class="as-stat-num">' + trips.length + '</div><div class="as-stat-label">行程</div></div>';
      html += '      <div class="as-stat-item"><div class="as-stat-num">' + notes.length + '</div><div class="as-stat-label">游记</div></div>';
      html += '      <div class="as-stat-item"><div class="as-stat-num">' + totalContent + '</div><div class="as-stat-label">内容</div></div>';
      html += '      <div class="as-stat-item"><div class="as-stat-num">' + totalLikes + '</div><div class="as-stat-label">获赞</div></div>';
      html += '    </div>';
      if (!isSelf) {
        html += '    <button class="as-follow-btn ' + (isFollowing ? 'following' : '') + '" id="authorFollowBtn">';
        html += isFollowing ? '✓ 已关注' : '+ 关注';
        html += '    </button>';
      }
      html += '  </div>';

      // Tab
      html += '  <div class="as-tabs">';
      html += '    <button class="as-tab active" data-tab="trips">行程</button>';
      html += '    <button class="as-tab" data-tab="notes">游记</button>';
      html += '    <button class="as-tab" data-tab="collections">专栏</button>';
      html += '  </div>';

      // 内容区
      html += '  <div class="as-content">';

      // 行程Tab
      html += '    <div class="as-tab-content active" data-tab="trips">';
      if (trips.length === 0) {
        html += this._emptyState('🗺️', '暂无发布的行程');
      } else {
        html += '<div class="as-grid">';
        for (let i = 0; i < trips.length; i++) {
          html += this._renderTripCard(trips[i], i);
        }
        html += '</div>';
      }
      html += '    </div>';

      // 游记Tab
      html += '    <div class="as-tab-content" data-tab="notes">';
      if (notes.length === 0) {
        html += this._emptyState('✍️', '暂无发布的游记');
      } else {
        html += '<div class="as-grid">';
        for (let i = 0; i < notes.length; i++) {
          html += this._renderNoteCard(notes[i], i);
        }
        html += '</div>';
      }
      html += '    </div>';

      // 专栏Tab
      html += '    <div class="as-tab-content" data-tab="collections">';
      if (collections.length === 0) {
        html += this._emptyState('📚', '暂无专题专栏');
      } else {
        html += '<div class="as-grid">';
        for (let i = 0; i < collections.length; i++) {
          html += this._renderCollectionCard(collections[i], i);
        }
        html += '</div>';
      }
      html += '    </div>';

      html += '  </div>';
      html += '</div>';

      // 创建mask
      const mask = document.createElement('div');
      mask.id = 'authorSpaceMask';
      mask.className = 'ui-modal-mask';
      mask.innerHTML = html;
      document.body.appendChild(mask);

      // 动画显示
      requestAnimationFrame(function () {
        mask.classList.add('ui-modal-show');
      });

      // 关闭
      function close() {
        mask.classList.remove('ui-modal-show');
        setTimeout(function () {
          if (mask.parentNode) mask.parentNode.removeChild(mask);
        }, 200);
      }

      mask.querySelector('#authorSpaceClose').onclick = close;
      mask.onclick = function (e) {
        if (e.target === mask) close();
      };

      // 关注按钮
      if (!isSelf) {
        const followBtn = mask.querySelector('#authorFollowBtn');
        followBtn.onclick = function () {
          self._toggleFollow(author.id, self.state.isFollowing, followBtn);
        };
      }

      // Tab 切换
      const tabs = mask.querySelectorAll('.as-tab');
      const tabContents = mask.querySelectorAll('.as-tab-content');
      for (let i = 0; i < tabs.length; i++) {
        tabs[i].onclick = function () {
          const tabName = this.dataset.tab;
          for (let j = 0; j < tabs.length; j++) {
            tabs[j].classList.remove('active');
            tabContents[j].classList.remove('active');
          }
          this.classList.add('active');
          mask.querySelector('.as-tab-content[data-tab="' + tabName + '"]').classList.add('active');
        };
      }

      // 行程卡片点击 - 直接用已加载的完整数据打开，避免二次查询失败
      const tripCards = mask.querySelectorAll('.as-trip-card');
      for (let i = 0; i < tripCards.length; i++) {
        tripCards[i].onclick = function () {
          const tripId = this.dataset.tripId;
          const tripData = self.state.trips.find(t => t.id === tripId);
          if (tripData && typeof TemplatePreview !== 'undefined') {
            // 用 TripStorage 的统一转换方法处理数据，确保格式正确
            let trip;
            if (typeof TripStorage !== 'undefined' && TripStorage._mapRowToTrip) {
              trip = TripStorage._mapRowToTrip(tripData);
            } else {
              // fallback：手动构造
              let dayPlans = tripData.day_plans || [];
              if (typeof dayPlans === 'string') {
                try { dayPlans = JSON.parse(dayPlans); } catch (e) { dayPlans = []; }
              }
              if (!Array.isArray(dayPlans)) dayPlans = [];
              // 深度防御：确保每个 dayPlan 及其 spots 数组存在
              // 兼容旧格式：items 字段转 spots
              dayPlans = dayPlans.map(dp => {
                if (!dp || typeof dp !== 'object') return { spots: [] };
                // 兼容 items 字段（旧格式）
                if ((!dp.spots || !Array.isArray(dp.spots) || dp.spots.length === 0)
                    && dp.items && Array.isArray(dp.items) && dp.items.length > 0) {
                  dp.spots = dp.items.map(item => ({
                    name: item.name || '',
                    type: item.type || '景点',
                    intro: item.desc || item.intro || '',
                    lng: item.lng || null,
                    lat: item.lat || null,
                    address: item.address || '',
                    rating: item.rating || (item.biz_ext && item.biz_ext.rating) || null,
                    photos: item.photos || [],
                    emoji: item.emoji || '',
                    duration: item.duration || 60,
                    startMin: item.startMin || null,
                    endMin: item.endMin || null,
                    time: item.time || '',
                  }));
                }
                if (!dp.spots || !Array.isArray(dp.spots)) dp.spots = [];
                return dp;
              });
              trip = {
                id: tripData.id,
                cloudId: tripData.id,
                author_id: tripData.author_id,
                dayPlans: dayPlans,
              };
            }

            // 补充作者信息和其他元数据
            trip.author = author.username;
            trip.avatar = author.avatar_url || '👤';
            trip.title = tripData.title;
            trip.destination = tripData.destination;
            trip.city = tripData.city;
            trip.days = tripData.days;
            trip.budget = tripData.budget;
            trip.people = (tripData.suitable_for && tripData.suitable_for[0]) || '';
            trip.tags = tripData.custom_tags || [];
            trip.likes = tripData.likes || 0;
            trip.copies = tripData.copies || 0;
            trip.favorites = tripData.favorites || 0;
            trip.status = tripData.status;
            trip.createdAt = tripData.created_at;
            trip.savedAt = Date.now();

            // 确保 dayPlans 存在且为数组
            if (!trip.dayPlans || !Array.isArray(trip.dayPlans)) {
              trip.dayPlans = [];
            }
            // 再次确保每个 dayPlan 都有 spots
            // 兼容旧格式：items 字段转 spots
            trip.dayPlans = trip.dayPlans.map(dp => {
              if (!dp || typeof dp !== 'object') return { spots: [] };
              // 兼容 items 字段（旧格式）
              if ((!dp.spots || !Array.isArray(dp.spots) || dp.spots.length === 0)
                  && dp.items && Array.isArray(dp.items) && dp.items.length > 0) {
                dp.spots = dp.items.map(item => ({
                  name: item.name || '',
                  type: item.type || '景点',
                  intro: item.desc || item.intro || '',
                  lng: item.lng || null,
                  lat: item.lat || null,
                  address: item.address || '',
                  rating: item.rating || (item.biz_ext && item.biz_ext.rating) || null,
                  photos: item.photos || [],
                  emoji: item.emoji || '',
                  duration: item.duration || 60,
                  startMin: item.startMin || null,
                  endMin: item.endMin || null,
                  time: item.time || '',
                }));
              }
              if (!dp.spots || !Array.isArray(dp.spots)) dp.spots = [];
              return dp;
            });

            // 计算总景点数
            const totalSpots = trip.dayPlans.reduce((sum, dp) => sum + (dp.spots?.length || 0), 0);

            // 如果 dayPlans 为空或没有景点，且有 days 字段，生成空骨架
            if (trip.dayPlans.length === 0 && trip.days && trip.days > 0) {
              for (let d = 0; d < trip.days; d++) {
                trip.dayPlans.push({ spots: [] });
              }
            }

            console.log('[AuthorSpace] 打开行程，tripId:', tripId);
            console.log('[AuthorSpace] dayPlans 长度:', trip.dayPlans.length);
            console.log('[AuthorSpace] 总景点数:', totalSpots);

            // 关键修复：如果没有景点数据，fallback 到重新从云端查询
            // 这样可以避免列表查询时 day_plans 数据不完整的问题
            if (totalSpots === 0 && typeof App !== 'undefined' && App.openCloudTrip) {
              console.log('[AuthorSpace] 无景点数据，fallback 到 openCloudTrip 重新查询');
              close();
              App.openCloudTrip(tripId);
              return;
            }

            close();
            TemplatePreview.openWithTrip(trip);
          } else {
            // fallback：用旧方式打开
            close();
            if (typeof App !== 'undefined' && App.openCloudTrip) {
              App.openCloudTrip(tripId);
            }
          }
        };
      }

      // 游记卡片点击
      const noteCards = mask.querySelectorAll('.as-note-card');
      for (let i = 0; i < noteCards.length; i++) {
        noteCards[i].onclick = function () {
          const noteId = this.dataset.noteId;
          if (typeof TravelNote !== 'undefined') {
            TravelNote.view(noteId);
          }
          close();
        };
      }

      // 专栏卡片点击
      const colCards = mask.querySelectorAll('.as-collection-card');
      for (let i = 0; i < colCards.length; i++) {
        colCards[i].onclick = function () {
          const colId = this.dataset.collectionId;
          close();
          if (typeof AdvancedPrivileges !== 'undefined' && AdvancedPrivileges._viewCollection) {
            AdvancedPrivileges._viewCollection(colId);
          }
        };
      }
    },

    _emptyState: function (icon, text) {
      return '<div class="as-empty"><div class="as-empty-icon">' + icon + '</div><div class="as-empty-text">' + text + '</div></div>';
    },

    _renderTripCard: function (t, i) {
      const heights = [160, 180, 170, 190];
      const h = heights[i % heights.length];
      const tag = (t.custom_tags && t.custom_tags[0]) || (t.suitable_for && t.suitable_for[0]) || '';

      // 生成封面图：优先用已有封面图，否则根据目的地生成真实图片
      let coverStyle = '';
      const destination = t.destination || t.city || '';
      if (t.cover_image) {
        coverStyle = "background-image:url('" + t.cover_image + "');background-size:cover;background-position:center;";
      } else if (destination) {
        const destSeedMap = {
          '杭州': 'hangzhou-west-lake',
          '上海': 'shanghai-skyline',
          '北京': 'beijing-forbidden-city',
          '成都': 'chengdu-panda',
          '西安': 'xian-terracotta',
          '厦门': 'xiamen-island',
          '三亚': 'sanya-beach',
          '丽江': 'lijiang-old-town',
          '重庆': 'chongqing-night',
          '广州': 'guangzhou-canton',
          '深圳': 'shenzhen-city',
          '苏州': 'suzhou-garden',
          '南京': 'nanjing-palace',
          '武汉': 'wuhan-river',
          '长沙': 'changsha-food',
          '青岛': 'qingdao-sea',
          '大理': 'dali-mountain',
          '桂林': 'guilin-mountain',
          '昆明': 'kunming-spring',
          '天津': 'tianjin-river',
          '云南': 'yunnan-mountain',
          '四川': 'sichuan-mountain',
        };
        let seed = 'travel-scenery-' + i;
        for (const city in destSeedMap) {
          if (destination.indexOf(city) !== -1) {
            seed = destSeedMap[city];
            break;
          }
        }
        coverStyle = "background-image:url('https://picsum.photos/seed/" + seed + "/600/400');background-size:cover;background-position:center;";
      } else {
        const coverBgs = [
          'linear-gradient(135deg, #FFB84D 0%, #FF9500 100%)',
          'linear-gradient(135deg, #A8E0FF 0%, #7B68EE 100%)',
          'linear-gradient(135deg, #FFD6A5 0%, #FFADAD 100%)',
          'linear-gradient(135deg, #caffbf 0%, #9bf6ff 100%)',
        ];
        coverStyle = 'background:' + coverBgs[i % coverBgs.length] + ';';
      }

      let html = '<div class="as-card as-trip-card" data-trip-id="' + t.id + '">';
      html += '  <div class="as-card-cover" style="height:' + h + 'px;' + coverStyle + '">';
      html += '    <div class="as-card-cover-mask"></div>';
      if (tag) html += '    <div class="as-card-tag">' + this._escape(tag) + '</div>';
      html += '    <div class="as-card-cover-info">';
      html += '      <div class="as-card-dest">' + this._escape(destination) + '</div>';
      html += '      <div class="as-card-days">' + (t.days || 1) + '天 · ' + this._escape(t.budget || '') + '</div>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="as-card-body">';
      html += '    <div class="as-card-title">' + this._escape(t.title) + '</div>';
      html += '    <div class="as-card-stats"><span>❤️ ' + (t.likes || 0) + '</span><span>📋 ' + (t.copies || 0) + '</span></div>';
      html += '  </div>';
      html += '</div>';
      return html;
    },

    _renderNoteCard: function (n, i) {
      const heights = [180, 200, 170, 190];
      const h = heights[i % heights.length];
      const tag = (n.custom_tags && n.custom_tags[0]) || '';
      const destination = n.destination || '';

      let coverStyle = '';
      if (n.cover_image) {
        coverStyle = "background-image:url('" + n.cover_image + "');background-size:cover;background-position:center;";
      } else if (destination) {
        const destSeedMap = {
          '杭州': 'hangzhou-west-lake',
          '上海': 'shanghai-skyline',
          '北京': 'beijing-forbidden-city',
          '成都': 'chengdu-panda',
          '西安': 'xian-terracotta',
          '厦门': 'xiamen-island',
          '三亚': 'sanya-beach',
          '丽江': 'lijiang-old-town',
          '重庆': 'chongqing-night',
          '广州': 'guangzhou-canton',
          '深圳': 'shenzhen-city',
          '苏州': 'suzhou-garden',
          '南京': 'nanjing-palace',
          '武汉': 'wuhan-river',
          '长沙': 'changsha-food',
          '青岛': 'qingdao-sea',
          '大理': 'dali-mountain',
          '桂林': 'guilin-mountain',
          '昆明': 'kunming-spring',
          '天津': 'tianjin-river',
          '云南': 'yunnan-mountain',
          '四川': 'sichuan-mountain',
        };
        let seed = 'travel-note-' + i;
        for (const city in destSeedMap) {
          if (destination.indexOf(city) !== -1) {
            seed = destSeedMap[city];
            break;
          }
        }
        coverStyle = "background-image:url('https://picsum.photos/seed/" + seed + "/600/400');background-size:cover;background-position:center;";
      } else {
        const coverBgs = [
          'linear-gradient(135deg, #fdf6e3 0%, #ffe8d6 100%)',
          'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
          'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
          'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
        ];
        coverStyle = 'background:' + coverBgs[i % coverBgs.length] + ';';
      }

      let html = '<div class="as-card as-note-card" data-note-id="' + n.id + '">';
      html += '  <div class="as-card-cover" style="height:' + h + 'px;' + coverStyle + '">';
      html += '    <div class="as-card-cover-mask"></div>';
      html += '    <div class="as-card-badge">✍️ 游记</div>';
      if (tag) html += '    <div class="as-card-tag">' + this._escape(tag) + '</div>';
      html += '    <div class="as-card-cover-info">';
      html += '      <div class="as-card-dest">' + this._escape(n.destination || '精选游记') + '</div>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="as-card-body">';
      html += '    <div class="as-card-title">' + this._escape(n.title) + '</div>';
      html += '    <div class="as-card-stats"><span>👁️ ' + (n.views || 0) + '</span><span>❤️ ' + (n.likes || 0) + '</span></div>';
      html += '  </div>';
      html += '</div>';
      return html;
    },

    _renderCollectionCard: function (c, i) {
      const heights = [140, 150, 160, 145];
      const h = heights[i % heights.length];
      const bg = 'linear-gradient(135deg, #FFE8D6 0%, #FFD0A8 100%)';

      let html = '<div class="as-card as-collection-card" data-collection-id="' + c.id + '">';
      html += '  <div class="as-card-cover" style="height:' + h + 'px;background:' + bg + ';">';
      html += '    <div class="as-card-cover-mask"></div>';
      html += '    <div class="as-card-badge" style="background:rgba(139,124,245,0.9);">📚 专栏</div>';
      html += '    <div class="as-collection-emoji">' + (c.cover_emoji || '📚') + '</div>';
      html += '  </div>';
      html += '  <div class="as-card-body">';
      html += '    <div class="as-card-title">' + this._escape(c.name) + '</div>';
      html += '    <div class="as-card-desc">' + this._escape(c.description || '点击查看专栏内容') + '</div>';
      html += '  </div>';
      html += '</div>';
      return html;
    },

    _toggleFollow: async function (authorId, currentlyFollowing, btn) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        Auth.requireAuth();
        return;
      }
      const user = Auth.getCurrentUser();
      if (!user || user.id === authorId) return;

      btn.disabled = true;
      btn.style.opacity = '0.6';

      try {
        if (currentlyFollowing) {
          // 取关
          const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', authorId);
          if (error) throw error;

          this.state.isFollowing = false;
          btn.textContent = '+ 关注';
          btn.classList.remove('following');
          UiKit.toast('已取消关注', 'info');
          if (typeof EventBus !== 'undefined') {
            EventBus.emit('follow:changed', { followingId: authorId, following: false });
          }
        } else {
          // 关注
          const { error } = await supabase
            .from('follows')
            .insert({ follower_id: user.id, following_id: authorId });
          if (error) throw error;

          this.state.isFollowing = true;
          btn.textContent = '✓ 已关注';
          btn.classList.add('following');
          UiKit.toast('关注成功', 'success');
          if (typeof EventBus !== 'undefined') {
            EventBus.emit('follow:changed', { followingId: authorId, following: true });
          }

          // 积分：被关注 +15
          if (typeof PointsCore !== 'undefined') {
            try { PointsCore.onFollowed(authorId, user.id); } catch (e) {}
          }
        }
      } catch (e) {
        console.error('[AuthorSpace] 关注操作失败:', e);
        UiKit.toast(e.message || '操作失败', 'error');
      } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    },

    _levelName: function (lv) {
      const names = {
        1: '萌新探索者', 2: '行走旅人', 3: '资深背包客',
        4: '行程规划师', 5: '旅行达人', 6: '路线设计师',
        7: '旅行家', 8: '首席体验官', 9: '旅行大使',
        10: '金牌规划师', 11: '旅行教父', 12: '认证规划师'
      };
      return names[lv] || '旅行者';
    },

    _escape: function (text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
  };

  window.AuthorSpace = AuthorSpace;
})();
