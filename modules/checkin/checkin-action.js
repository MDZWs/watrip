/**
 * 打卡系统核心（Phase 4.1）
 * 职责：实地/云打卡 + 防刷校验 + 积分发放 + POI 专题自动维护
 * 依赖：Auth、PointsCore、AmapHelper、UiKit、UIRender、EventBus
 *
 * 打卡规则：
 *   - 实地打卡（field）：GPS 500m 校验 → +3 积分，徽章「实地」
 *   - 云打卡（cloud）：手动选 POI → +1 积分，徽章「云」
 *   - 防刷：每个 POI 24h 内仅可打卡 1 次，每日最多 5 个 POI
 */
(function (global) {
  const DAILY_POI_LIMIT = 5;
  const POI_COOLDOWN_HOURS = 24;
  const FIELD_THRESHOLD_M = 500;

  const CheckinAction = {
    state: {
      lastFieldCheckin: null, // 缓存最近一次 GPS 位置
    },

    /**
     * 打开打卡入口（新版：地图打卡页面）
     */
    openEntry() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      // 使用新版地图打卡
      if (typeof CheckinMap !== 'undefined') {
        CheckinMap.open();
      } else {
        this._renderEntryModal();
      }
    },

    /**
     * 渲染入口选择弹窗（旧版，保留备用）
     */
    _renderEntryModal() {
      const html = `
        <div class="ck-entry-wrap">
          <div class="ck-entry-tip">选择打卡方式</div>
          <div class="ck-entry-list">
            <div class="ck-entry-item" id="ckEntryField">
              <div class="ck-entry-icon" style="background:linear-gradient(135deg,#FFB983,#FF8A3D);">📍</div>
              <div class="ck-entry-main">
                <div class="ck-entry-title">实地打卡 <span class="ck-badge ck-badge-field">实地</span></div>
                <div class="ck-entry-desc">GPS 定位验证 500m 范围，+3 积分</div>
              </div>
            </div>
            <div class="ck-entry-item" id="ckEntryCloud">
              <div class="ck-entry-icon" style="background:linear-gradient(135deg,#A8E0FF,#5CC6FF);">☁️</div>
              <div class="ck-entry-main">
                <div class="ck-entry-title">云打卡 <span class="ck-badge ck-badge-cloud">云</span></div>
                <div class="ck-entry-desc">搜索 POI 选择打卡，+1 积分</div>
              </div>
            </div>
          </div>
          <div class="ck-entry-history" id="ckEntryHistory">查看我的打卡记录 ›</div>
          <div class="ck-entry-poi" id="ckEntryPoi">🔥 热门 POI 专题 ›</div>
        </div>
      `;
      UIRender.showAlertModal('打卡', html);

      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        document.getElementById('ckEntryField')?.addEventListener('click', () => {
          modal.classList.remove('show');
          this.fieldCheckin();
        });
        document.getElementById('ckEntryCloud')?.addEventListener('click', () => {
          modal.classList.remove('show');
          this.cloudCheckin();
        });
        document.getElementById('ckEntryHistory')?.addEventListener('click', () => {
          modal.classList.remove('show');
          this.openMyCheckins();
        });
        document.getElementById('ckEntryPoi')?.addEventListener('click', () => {
          modal.classList.remove('show');
          if (typeof PoiTopic !== 'undefined') PoiTopic.openList();
        });
      }, 50);
    },

    /**
     * 实地打卡：GPS 定位 → 反查 POI → 500m 校验 → 保存
     */
    async fieldCheckin() {
      if (typeof AmapHelper === 'undefined') {
        UiKit.toast('地图模块未就绪', 'error');
        return;
      }
      UiKit.showLoading('正在定位...');
      const pos = await AmapHelper.getCurrentPosition(12000);
      UiKit.hideLoading();

      if (!pos) {
        UiKit.toast('定位失败，请检查定位权限或改用云打卡', 'error', 3000);
        return;
      }
      this.state.lastFieldCheckin = pos;

      UiKit.showLoading('查找附近 POI...');
      let poi = null;
      try {
        // 逆地理 + 周边 POI 搜索
        const rg = await AmapHelper.reverseGeocode(pos.lng, pos.lat);
        if (rg && rg.pois && rg.pois.length > 0) {
          // 选最近的 POI
          poi = rg.pois[0];
        }
      } catch (e) {
        console.warn('[Checkin] 逆地理失败:', e);
      }
      UiKit.hideLoading();

      if (!poi) {
        UiKit.toast('附近未找到可打卡 POI，请改用云打卡', 'info', 3000);
        return;
      }

      // 500m 校验
      const distance = AmapHelper.isNearby(poi.lng || poi.location?.lng, poi.lat || poi.location?.lat, pos.lng, pos.lat, FIELD_THRESHOLD_M);
      if (distance === false) {
        UiKit.toast(`距离 ${poi.name} 超过 500m，无法实地打卡`, 'error', 3000);
        return;
      }

      // 显示确认
      this._confirmCheckin(poi, 'field', pos);
    },

    /**
     * 云打卡：搜索 POI → 选择 → 保存
     */
    cloudCheckin() {
      if (typeof AmapHelper === 'undefined') {
        UiKit.toast('地图模块未就绪', 'error');
        return;
      }
      this._renderCloudSearchModal();
    },

    /**
     * 渲染云打卡搜索弹窗
     */
    _renderCloudSearchModal() {
      const html = `
        <div class="ck-cloud-wrap">
          <div class="ck-search-bar">
            <input type="text" id="ckSearchInput" class="ck-search-input" placeholder="搜索景点/POI 名称" autocomplete="off">
            <button id="ckSearchBtn" class="ck-search-btn">搜索</button>
          </div>
          <div class="ck-search-result" id="ckSearchResult">
            <div class="ck-search-empty">输入名称搜索要打卡的地点</div>
          </div>
        </div>
      `;
      UIRender.showAlertModal('云打卡', html);

      setTimeout(() => {
        const input = document.getElementById('ckSearchInput');
        const btn = document.getElementById('ckSearchBtn');
        const resultEl = document.getElementById('ckSearchResult');
        if (!input || !btn || !resultEl) return;

        const doSearch = async () => {
          const keyword = input.value.trim();
          if (!keyword) {
            UiKit.toast('请输入搜索关键词', 'info');
            return;
          }
          resultEl.innerHTML = '<div class="ck-search-loading">搜索中...</div>';
          try {
            const pois = await AmapHelper.searchPOI(keyword, { pageSize: 10 });
            if (!pois || pois.length === 0) {
              resultEl.innerHTML = '<div class="ck-search-empty">未找到相关地点</div>';
              return;
            }
            resultEl.innerHTML = pois.map((p, i) => {
              const addr = p.address || '';
              const dist = p.distance ? `${p.distance}m` : '';
              return `
                <div class="ck-poi-item" data-idx="${i}">
                  <div class="ck-poi-icon">📍</div>
                  <div class="ck-poi-main">
                    <div class="ck-poi-name">${p.name}</div>
                    <div class="ck-poi-addr">${addr} ${dist}</div>
                  </div>
                  <div class="ck-poi-action">打卡</div>
                </div>
              `;
            }).join('');

            // 绑定点击
            resultEl.querySelectorAll('.ck-poi-item').forEach(item => {
              item.onclick = () => {
                const idx = parseInt(item.dataset.idx, 10);
                const poi = pois[idx];
                const modal = document.getElementById('alertModal');
                if (modal) modal.classList.remove('show');
                this._confirmCheckin(poi, 'cloud', null);
              };
            });
          } catch (e) {
            console.error('[Checkin] 搜索失败:', e);
            resultEl.innerHTML = '<div class="ck-search-empty">搜索失败，请重试</div>';
          }
        };

        btn.onclick = doSearch;
        input.onkeydown = (e) => {
          if (e.key === 'Enter') doSearch();
        };
        input.focus();
      }, 50);
    },

    /**
     * 确认打卡弹窗
     */
    _confirmCheckin(poi, type, pos) {
      const poiName = poi.name || '未命名地点';
      const poiAddr = poi.address || '';
      const lng = poi.lng || poi.location?.lng || 0;
      const lat = poi.lat || poi.location?.lat || 0;
      const badgeClass = type === 'field' ? 'ck-badge-field' : 'ck-badge-cloud';
      const badgeText = type === 'field' ? '实地' : '云';
      const pointsText = type === 'field' ? '+3 积分' : '+1 积分';

      const html = `
        <div class="ck-confirm-wrap">
          <div class="ck-confirm-poi">
            <div class="ck-confirm-icon">📍</div>
            <div class="ck-confirm-info">
              <div class="ck-confirm-name">${poiName}</div>
              <div class="ck-confirm-addr">${poiAddr || '地址未记录'}</div>
            </div>
            <span class="ck-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="ck-confirm-reward">${pointsText}</div>
          <div class="ck-confirm-tip">${type === 'field' ? 'GPS 已验证 500m 范围内' : '云打卡：标记你到过的地方'}</div>
          <button class="ck-confirm-btn" id="ckConfirmBtn">确认打卡</button>
        </div>
      `;
      UIRender.showAlertModal('确认打卡', html);

      setTimeout(() => {
        const btn = document.getElementById('ckConfirmBtn');
        if (!btn) return;
        btn.onclick = async () => {
          btn.disabled = true;
          btn.textContent = '打卡中...';
          await this._saveCheckin({
            poiId: poi.id || poi.poi_id || '',
            poiName,
            lng,
            lat,
            address: poiAddr,
            type,
          });
        };
      }, 50);
    },

    /**
     * 保存打卡（含防刷校验）
     */
    async _saveCheckin({ poiId, poiName, lng, lat, address, type }) {
      try {
        const user = Auth.getCurrentUser();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const cooldownStart = new Date(now.getTime() - POI_COOLDOWN_HOURS * 3600 * 1000).toISOString();

        // 1. 防刷校验 A：该 POI 24h 内是否已打卡
        if (poiId) {
          const { data: recent } = await supabase
            .from('checkins')
            .select('id, created_at')
            .eq('user_id', user.id)
            .eq('poi_id', poiId)
            .gte('created_at', cooldownStart)
            .limit(1);
          if (recent && recent.length > 0) {
            UiKit.toast('该地点 24 小时内已打卡，请明天再来', 'info', 3000);
            this._closeModal();
            return;
          }
        }

        // 2. 防刷校验 B：今日打卡 POI 数量
        const { count: todayCount } = await supabase
          .from('checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', todayStart);
        if ((todayCount || 0) >= DAILY_POI_LIMIT) {
          UiKit.toast(`今日已打卡 ${DAILY_POI_LIMIT} 个 POI，明天再来吧`, 'info', 3000);
          this._closeModal();
          return;
        }

        // 3. 写入 checkins
        const { data: inserted, error } = await supabase
          .from('checkins')
          .insert({
            user_id: user.id,
            poi_id: poiId || null,
            poi_name: poiName,
            lng,
            lat,
            address: address || null,
            type,
          })
          .select('id')
          .single();

        if (error) throw error;

        // 4. upsert poi_topics（首次打卡时创建专题）
        if (poiId) {
          await this._upsertPoiTopic({ poiId, poiName, lng, lat, address });
        }

        // 5. 发放积分
        const points = type === 'field' ? 3 : 1;
        if (typeof PointsCore !== 'undefined') {
          await PointsCore._addPoints(user.id, points, 'checkin', { id: inserted.id, type: 'checkin' });
        }
        // Phase 5.2：道具掉落
        try { if (typeof Items !== 'undefined') Items.tryDrop('checkin'); } catch(e) {}

        // 6. 通知 + toast
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('checkin:completed', { checkinId: inserted.id, poiName, type, points });
        }
        UiKit.toast(`✅ 打卡成功 +${points} 积分`, 'success', 2500);

        this._closeModal();

        // 7. Phase 4.2：引导用户写吐槽（可选）
        if (typeof Roast !== 'undefined') {
          setTimeout(() => {
            this._offerRoast(inserted.id, poiName);
          }, 600);
        }
      } catch (e) {
        console.error('[Checkin] 保存失败:', e);
        UiKit.toast('打卡失败：' + (e.message || '未知错误'), 'error');
      }
    },

    /**
     * upsert POI 专题（checkin_count +1）
     */
    async _upsertPoiTopic({ poiId, poiName, lng, lat, address }) {
      try {
        // 先查询是否存在
        const { data: existing } = await supabase
          .from('poi_topics')
          .select('id, checkin_count')
          .eq('poi_id', poiId)
          .maybeSingle();

        if (existing) {
          // 已存在：更新计数
          await supabase
            .from('poi_topics')
            .update({
              checkin_count: (existing.checkin_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // 不存在：插入
          await supabase
            .from('poi_topics')
            .insert({
              poi_id: poiId,
              poi_name: poiName,
              lng,
              lat,
              address: address || null,
              checkin_count: 1,
            });
        }
      } catch (e) {
        console.warn('[Checkin] POI 专题更新失败:', e);
      }
    },

    /**
     * 查看我的打卡记录
     */
    async openMyCheckins() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      UiKit.showLoading('加载打卡记录...');
      const user = Auth.getCurrentUser();
      const { data, error } = await supabase
        .from('checkins')
        .select('id, poi_id, poi_name, address, type, has_roast, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      UiKit.hideLoading();

      if (error) {
        UiKit.toast('加载失败', 'error');
        return;
      }
      this._renderHistory(data || []);
    },

    /**
     * 渲染打卡历史
     */
    _renderHistory(list) {
      const totalCount = list.length;
      const fieldCount = list.filter(c => c.type === 'field').length;
      const cloudCount = totalCount - fieldCount;

      const headerHtml = `
        <div class="ck-history-header">
          <div class="ck-stat-item">
            <div class="ck-stat-num">${totalCount}</div>
            <div class="ck-stat-label">总打卡</div>
          </div>
          <div class="ck-stat-item">
            <div class="ck-stat-num">${fieldCount}</div>
            <div class="ck-stat-label">实地</div>
          </div>
          <div class="ck-stat-item">
            <div class="ck-stat-num">${cloudCount}</div>
            <div class="ck-stat-label">云打卡</div>
          </div>
        </div>
      `;

      const listHtml = list.length === 0
        ? `<div class="ck-history-empty">
             <div style="font-size:36px;margin-bottom:8px;">📍</div>
             <div>还没有打卡记录</div>
             <div style="font-size:11px;margin-top:4px;">去社区发现值得打卡的地点吧</div>
           </div>`
        : list.map(c => {
            const badgeClass = c.type === 'field' ? 'ck-badge-field' : 'ck-badge-cloud';
            const badgeText = c.type === 'field' ? '实地' : '云';
            const dt = new Date(c.created_at);
            const dateStr = `${dt.getMonth()+1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
            const roastBtn = c.poi_id ? `<div class="ck-history-roast-btn" data-poi-id="${c.poi_id}">查看吐槽 ›</div>` : '';
            return `
              <div class="ck-history-item">
                <div class="ck-history-icon">📍</div>
                <div class="ck-history-main">
                  <div class="ck-history-name">${c.poi_name}</div>
                  <div class="ck-history-meta">
                    <span class="ck-badge ${badgeClass}">${badgeText}</span>
                    <span>${dateStr}</span>
                    ${c.has_roast ? '<span style="color:#ff8a3d;">✍️ 已吐槽</span>' : ''}
                  </div>
                  ${roastBtn}
                </div>
              </div>
            `;
          }).join('');

      const html = `
        <div class="ck-history-wrap">
          ${headerHtml}
          <div class="ck-history-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('我的打卡', html);

      // Phase 4.2：绑定查看吐槽
      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        modal.querySelectorAll('.ck-history-roast-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const poiId = btn.dataset.poiId;
            if (modal) modal.classList.remove('show');
            if (typeof Roast !== 'undefined') Roast.viewByPoi(poiId);
          };
        });
      }, 50);
    },

    /**
     * 关闭当前弹窗
     */
    _closeModal() {
      const modal = document.getElementById('alertModal');
      if (modal) modal.classList.remove('show');
    },

    /**
     * 引导写吐槽（Phase 4.2）
     */
    _offerRoast(checkinId, poiName) {
      const html = `
        <div class="ck-offer-roast">
          <div class="ck-offer-icon">✍️</div>
          <div class="ck-offer-title">要写一条吐槽吗？</div>
          <div class="ck-offer-desc">分享你在「${poiName}」的真实体验，再获得 +5 积分</div>
          <div class="ck-offer-btns">
            <button class="ck-offer-skip" id="ckOfferSkip">下次再说</button>
            <button class="ck-offer-write" id="ckOfferWrite">写吐槽 +5</button>
          </div>
        </div>
      `;
      UIRender.showAlertModal('打卡成功', html);
      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        document.getElementById('ckOfferSkip')?.addEventListener('click', () => {
          if (modal) modal.classList.remove('show');
        });
        document.getElementById('ckOfferWrite')?.addEventListener('click', () => {
          if (modal) modal.classList.remove('show');
          if (typeof Roast !== 'undefined') Roast.openEditor(checkinId, { poiName });
        });
      }, 50);
    },
  };

  global.CheckinAction = CheckinAction;
})(window);
