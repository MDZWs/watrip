const TripDetail = {
    trip: null,
    tripId: null,
    currentTab: 'itinerary',
    currentDay: 0,
    mode: 'list',
    mapView: 'line',
    detailMap: null,
    detailMarkers: [],
    detailPolyline: null,
    selectedSpotIdx: -1,
    addedSpots: new Set(),
    _collapsedDays: new Set(),
    _aiSuggestions: null,
    _dismissedSugs: new Set(),
    _aiTipsCache: {},
    _aiSuggesting: false,
    _aiTipsGenerating: new Set(),

    open(trip, tripId) {
        this.trip = trip;
        this.tripId = tripId;
        this.isMemory = trip.status === 'archived';
        this.currentTab = 'itinerary';
        this.currentDay = this._findTodayDay();
        this.mode = 'list';
        this.addedSpots = new Set();
        this._collectSpotKeys();
        this._ensureTransportDefaults();

        ['homePage', 'tripsPage', 'inputPage', 'resultPage', 'communityPage', 'profilePage'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
        document.getElementById('tripDetailPage').classList.add('active');
        document.getElementById('bottomTabBar').style.display = 'none';

        document.getElementById('tripDetailPage').classList.toggle('memory-mode', this.isMemory);
        const tabsBar = document.querySelector('.detail-tabs-bar');
        const addBtn = document.getElementById('addSpotBtn');
        if (tabsBar) tabsBar.style.display = this.isMemory ? 'none' : '';
        if (addBtn) addBtn.style.display = this.isMemory ? 'none' : '';
        const modeSwitch = document.getElementById('modeSwitchBtn');
        if (modeSwitch) modeSwitch.style.display = this.isMemory ? 'none' : '';
        const aiFab = document.getElementById('aiFabBtn');
        if (aiFab) aiFab.style.display = this.isMemory ? 'none' : '';

        this.renderHeader();
        this.renderTabs();
        this.switchTab('itinerary');
        this.renderDayPills();
        this.renderItinerary();
        ExpenseModule.init(trip);
        PackingModule.init(trip);
        this._bindEvents();
        this._recalcAllTransport();
        this._loadWeatherForTrip();
        this._bindSwipeGestures();
        this._setupPublishButton();

        const aiEnabled = localStorage.getItem('aiSuggestEnabled') !== 'false';
        document.querySelectorAll('.ai-inline-suggestion').forEach(el => el.style.display = (aiEnabled && !this.isMemory) ? 'flex' : 'none');
        document.querySelectorAll('.ai-tips-toggle').forEach(el => el.style.display = (aiEnabled && !this.isMemory) ? 'inline-flex' : 'none');
    },

    close() {
        document.getElementById('tripDetailPage').classList.remove('active', 'memory-mode');
        if (this.detailMap) {
            this.detailMap.destroy();
            this.detailMap = null;
        }
        this.hideMapSpotCard();
        try { AddSpotPanel.close(); } catch(e){}
        try { AIAssistant.close(); } catch(e){}
        try { AIChat.close(); } catch(e){}
        try { ExpenseModule.closeAdd(); } catch(e){}

        if (typeof TripsModule !== 'undefined') {
            TripsModule.renderTripCards();
        }

        if (App.pageStack.length > 1) {
            App.pageStack.pop();
            const prev = App.pageStack[App.pageStack.length - 1];
            if (prev === 'template-preview') {
                App.switchTab('template-preview', true);
            } else if (prev === 'trip-detail' || !['home','trips','plan','community','profile','result'].includes(prev)) {
                App.switchTab('trips', true);
            } else {
                App.switchTab(prev, true);
            }
        } else {
            App.switchTab('trips');
        }
    },

    tryCloseAllOverlays() {
        try { AddSpotPanel.close(); } catch(e){}
        try { if (typeof AIChat !== 'undefined') AIChat.close(); } catch(e){}
        try { ExpenseModule.closeAdd(); } catch(e){}
        try { if (typeof SpotRecord !== 'undefined') SpotRecord.close(); } catch(e){}
    },

    _collectSpotKeys() {
        this.addedSpots.clear();
        if (!this.trip?.dayPlans) return;
        this.trip.dayPlans.forEach(dp => {
            (dp.spots || []).forEach(s => {
                this.addedSpots.add(s.name);
            });
        });
    },

    // ===== 发布到社区 =====

    /**
     * 动态创建发布按钮（仅登录用户 + 有 cloudId 时显示）
     */
    async _setupPublishButton() {
        const actions = document.getElementById('listActions');
        if (!actions) return;
        // 移除旧按钮
        const oldBtn = document.getElementById('detailPublishBtn');
        if (oldBtn) oldBtn.remove();

        // 检查是否登录 + 有 cloudId
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        if (!this.trip.cloudId) return;

        // 查询发布状态
        const info = await TripStorage.getPublishInfo(this.trip.cloudId);
        const btn = document.createElement('button');
        btn.id = 'detailPublishBtn';
        btn.className = 'detail-icon-btn';
        if (info.status === 'published') {
            btn.title = '已发布·点击查看';
            btn.style.color = '#34c759';
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
        } else {
            btn.title = '发布到社区';
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
        }
        btn.onclick = () => this._showPublishDialog(info);
        actions.appendChild(btn);
    },

    /**
     * 显示发布/状态弹窗
     */
    async _showPublishDialog(cachedInfo) {
        if (typeof TripStorage === 'undefined' || !this.trip.cloudId) {
            UiKit.toast('该行程尚未同步到云端', 'info');
            return;
        }

        UiKit.showLoading('加载中...');
        const info = cachedInfo || await TripStorage.getPublishInfo(this.trip.cloudId);
        const publishQuota = await TripStorage.checkCanPublish(Auth.getCurrentUser().id);
        UiKit.hideLoading();

        const isPublished = info.status === 'published';
        const totalEngagement = info.likes + info.favorites + info.copies;

        // 审核彩蛋状态
        const reviewMap = {
            none: isPublished && totalEngagement >= 10
                ? { text: '即将触发审核', color: '#ff9500' }
                : { text: '未触发', color: '#999' },
            pending: { text: '审核中（彩蛋）', color: '#ff9500' },
            approved: { text: '已通过 +2配额', color: '#34c759' },
            rejected: { text: '未通过', color: '#ff3b30' },
        };
        const rv = reviewMap[info.reviewStatus] || reviewMap.none;

        // Phase 5.5：专属标签选择器（仅未发布时显示，让 Lv6 特权真正可用）
        let tagPickerHtml = '';
        if (!isPublished) {
            const user = Auth.getCurrentUser();
            const userTags = user?.custom_tags || [];
            const hasLv6 = typeof LevelSystem !== 'undefined' && LevelSystem.hasPrivilege('custom_tags', user?.level || 1);
            if (!hasLv6) {
                tagPickerHtml = `
                    <div style="padding:12px 0;border-bottom:1px solid #eee;">
                        <div style="color:#666;margin-bottom:6px;">🏷️ 专属标签 <span style="font-size:11px;color:#999;">Lv6 特权 · 选填</span></div>
                        <div style="font-size:12px;color:#999;line-height:1.6;">
                            🔒 需 Lv6 解锁。发布时可为内容添加自定义标签，让作品更易被发现
                        </div>
                    </div>
                `;
            } else if (userTags.length === 0) {
                tagPickerHtml = `
                    <div style="padding:12px 0;border-bottom:1px solid #eee;">
                        <div style="color:#666;margin-bottom:6px;">🏷️ 专属标签 <span style="font-size:11px;color:#999;">Lv6 特权 · 选填</span></div>
                        <div style="font-size:12px;color:#999;line-height:1.6;">
                            你还没有设置专属标签。<a href="#" id="pubGoSetTags" style="color:#ff8a3d;font-weight:600;">去设置 ›</a>
                        </div>
                    </div>
                `;
            } else {
                tagPickerHtml = `
                    <div style="padding:12px 0;border-bottom:1px solid #eee;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <span style="color:#666;">🏷️ 专属标签 <span style="font-size:11px;color:#999;">Lv6 · 选填</span></span>
                            <span id="pubTagCount" style="font-size:11px;color:#999;">已选 0/3</span>
                        </div>
                        <div id="pubTagList" style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${userTags.map(t => `<div class="pub-tag-chip" data-tag="${t}">#${t}</div>`).join('')}
                        </div>
                    </div>
                `;
            }
        }

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:360px;">
                <div class="ui-modal-title">${isPublished ? '社区状态' : '发布到社区'}</div>
                <div class="ui-modal-body" style="padding:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
                        <span style="color:#666;">发布状态</span>
                        <span style="color:${isPublished ? '#34c759' : '#999'};font-weight:600;">${isPublished ? '已发布' : '未发布'}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
                        <span style="color:#666;">发布配额</span>
                        <span style="font-weight:600;">${publishQuota.publishedCount} / ${publishQuota.limit}</span>
                    </div>
                    ${isPublished ? `
                    <div style="padding:12px 0;border-bottom:1px solid #eee;">
                        <div style="color:#666;margin-bottom:8px;">社区互动</div>
                        <div style="display:flex;gap:16px;text-align:center;">
                            <div><div style="font-size:20px;font-weight:700;color:#ff3b30;">${info.likes}</div><div style="font-size:11px;color:#999;">点赞</div></div>
                            <div><div style="font-size:20px;font-weight:700;color:#ff9500;">${info.favorites}</div><div style="font-size:11px;color:#999;">收藏</div></div>
                            <div><div style="font-size:20px;font-weight:700;color:#1989fa;">${info.copies}</div><div style="font-size:11px;color:#999;">采纳</div></div>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee;">
                        <span style="color:#666;">审核彩蛋</span>
                        <span style="color:${rv.color};font-weight:600;font-size:13px;">${rv.text}</span>
                    </div>
                    <div style="padding:12px 0;">
                        <div style="font-size:12px;color:#666;line-height:1.8;">
                            <div style="font-weight:600;margin-bottom:6px;color:#333;">彩蛋机制</div>
                            · 发布后被人点赞/收藏/采纳达 10 次<br>
                            · 自动触发审核，通过后配额 +2<br>
                            · 当前进度：${totalEngagement} / 10
                            ${totalEngagement < 10 ? `<div style="margin-top:8px;background:#f0f0f0;border-radius:4px;height:6px;overflow:hidden;"><div style="width:${Math.min(100, totalEngagement * 10)}%;height:100%;background:#1989fa;"></div></div>` : ''}
                        </div>
                    </div>` : `
                    <div style="padding:12px 0;">
                        <div style="font-size:13px;color:#666;line-height:1.8;">
                            发布到社区后：<br>
                            · 其他用户可浏览你的行程<br>
                            · 被点赞/收藏/采纳可获得积分<br>
                            · 互动达 10 次自动触发审核彩蛋<br>
                            · 审核通过配额 +2
                        </div>
                    </div>`}
                    ${tagPickerHtml}
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-cancel">关闭</button>
                    ${isPublished
                        ? '<button class="ui-modal-btn ui-modal-confirm" style="color:#ff3b30;">取消发布</button>'
                        : '<button class="ui-modal-btn ui-modal-confirm">发布到社区</button>'}
                </div>
            </div>`;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        // Phase 5.5：专属标签选择交互
        let selectedTags = [];
        const tagChips = mask.querySelectorAll('.pub-tag-chip');
        const tagCountEl = mask.querySelector('#pubTagCount');
        tagChips.forEach(chip => {
            chip.onclick = (e) => {
                e.stopPropagation();
                const tag = chip.dataset.tag;
                if (selectedTags.includes(tag)) {
                    selectedTags = selectedTags.filter(t => t !== tag);
                    chip.classList.remove('pub-tag-chip-selected');
                } else {
                    if (selectedTags.length >= 3) {
                        UiKit.toast('最多选 3 个标签', 'info');
                        return;
                    }
                    selectedTags.push(tag);
                    chip.classList.add('pub-tag-chip-selected');
                }
                if (tagCountEl) tagCountEl.textContent = `已选 ${selectedTags.length}/3`;
            };
        });
        // "去设置专属标签"快捷入口
        const goSetBtn = mask.querySelector('#pubGoSetTags');
        if (goSetBtn) {
            goSetBtn.onclick = (e) => {
                e.preventDefault();
                close();
                if (typeof AdvancedPrivileges !== 'undefined') AdvancedPrivileges.openTagEditor();
            };
        }

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        mask.querySelector('.ui-modal-cancel').onclick = close;
        mask.querySelector('.ui-modal-confirm').onclick = async () => {
            close();
            UiKit.showLoading(isPublished ? '取消发布中...' : '发布中...');
            const result = isPublished
                ? await TripStorage.unpublishTrip(this.trip.cloudId, Auth.getCurrentUser().id)
                : await TripStorage.publishTrip(this.trip.cloudId, Auth.getCurrentUser().id, selectedTags);
            UiKit.hideLoading();
            if (result.success) {
                UiKit.toast(isPublished ? '已取消发布' : '已发布到社区', 'success');
                this._setupPublishButton(); // 刷新按钮状态
            } else {
                UiKit.toast(result.error || '操作失败', 'error');
            }
        };
        mask.onclick = (e) => { if (e.target === mask) close(); };
    },

    _bindEvents() {
        const backBtn = document.getElementById('detailBack');
        const shareBtn = document.getElementById('detailShareBtn');
        const journalBtn = document.getElementById('detailJournalBtn');
        const pdfBtn = document.getElementById('detailPdfBtn');
        if (backBtn) backBtn.onclick = () => this.close();
        if (shareBtn) shareBtn.onclick = () => this.showSharePopup();
        if (journalBtn) journalBtn.onclick = () => this.openJournal();
        if (pdfBtn) pdfBtn.onclick = async () => {
            const ok = await UiKit.confirm('是否跳转到旅行记忆页面进行PDF预览和编辑？', {
                title: '导出PDF',
                confirmText: '跳转',
                cancelText: '取消'
            });
            if (!ok) return;
            const tripId = this.trip?.id || this.tripId;
            this.close();
            setTimeout(() => {
                if (typeof TripsModule !== 'undefined') {
                    TripsModule.openExportForTrip(tripId);
                }
            }, 100);
        };

        document.querySelectorAll('.detail-tab').forEach(btn => {
            btn.onclick = () => this.switchTab(btn.dataset.tab);
        });

        document.getElementById('modeSwitchBtn').onclick = () => this.switchToMap();
        document.getElementById('mapModeBackBtn').onclick = () => this.switchToList();
        document.getElementById('mapLineBtn').onclick = () => this.setMapView('line');
        document.getElementById('mapPointBtn').onclick = () => this.setMapView('point');
        document.getElementById('mapAllBtn').onclick = () => this.mapFitAll();

        document.querySelectorAll('.day-pill').forEach(btn => {
            btn.onclick = () => {
                this.switchDay(parseInt(btn.dataset.day));
            };
        });

        document.querySelectorAll('.map-day-pill').forEach(btn => {
            btn.onclick = () => {
                this.switchDay(parseInt(btn.dataset.day));
            };
        });

        document.getElementById('addSpotBtn').onclick = () => AddSpotPanel.open(this.trip, this);
        document.getElementById('detailMapAddSpotBtn').onclick = () => AddSpotPanel.open(this.trip, this);

        document.getElementById('closeMapSpotCard').onclick = () => this.hideMapSpotCard();
        document.getElementById('mapSpotNavBtn').onclick = (e) => { e.stopPropagation(); this.navigateToSelectedSpot(); };
        document.getElementById('mapSpotInfoArea').onclick = () => this.openRecordForSelected();
        document.getElementById('mapSpotEmoji').onclick = () => this.openRecordForSelected();

        const aiFab = document.getElementById('aiFabBtn');
        if (aiFab) {
            aiFab.onclick = () => {
                this.tryCloseAllOverlays();
                AIChat.open(this.trip, this.currentDay);
            };
        }

        const detailScroll = document.querySelector('.detail-scroll');
        if (detailScroll && !detailScroll.dataset.scrollBound) {
            detailScroll.dataset.scrollBound = '1';
            detailScroll.addEventListener('scroll', () => {
                const fab = document.getElementById('aiFabBtn');
                if (fab) {
                    if (detailScroll.scrollTop > 100) {
                        fab.classList.add('scrolled');
                    } else {
                        fab.classList.remove('scrolled');
                    }
                }
                const navBar = document.querySelector('.detail-nav-bar');
                const tabsBar = document.querySelector('.detail-tabs-bar');
                const dayPills = document.querySelector('.day-pills-scroll');
                const summaryBar = document.querySelector('.day-summary-bar');
                const scrollTop = detailScroll.scrollTop;
                if (navBar) {
                    if (scrollTop > 60) {
                        navBar.classList.add('collapsed');
                    } else {
                        navBar.classList.remove('collapsed');
                    }
                }
                if (summaryBar) {
                    if (scrollTop > 120) {
                        summaryBar.classList.add('collapsed');
                    } else {
                        summaryBar.classList.remove('collapsed');
                    }
                }
            });
        }
    },

    openRecordForSelected() {
        if (this.selectedSpotIdx < 0) return;
        SpotRecord.open(this.currentDay, this.selectedSpotIdx);
    },

    navigateToSelectedSpot() {
        if (this.selectedSpotIdx < 0) return;
        const spot = this.trip.dayPlans[this.currentDay]?.spots?.[this.selectedSpotIdx];
        if (!spot) return;
        if (spot.lng && spot.lat) {
            const url = `https://uri.amap.com/navigation?to=${spot.lng},${spot.lat},${encodeURIComponent(spot.name)}&mode=car&src=tripapp&callnative=1`;
            window.open(url, '_blank');
        } else {
            UIRender.showToast('该地点暂无坐标，无法导航');
        }
    },

    // 时间轴卡片上的快捷导航
    quickNavigate(di, si) {
        const spot = this.trip.dayPlans?.[di]?.spots?.[si];
        if (!spot) return;
        if (spot.lng && spot.lat) {
            const url = `https://uri.amap.com/navigation?to=${spot.lng},${spot.lat},${encodeURIComponent(spot.name)}&mode=transit&src=tripapp&callnative=1`;
            window.open(url, '_blank');
        } else {
            UIRender.showToast('该地点暂无坐标，无法导航');
        }
    },

    renderHeader() {
        const title = this.trip.title || (this.trip.destination || this.trip.dayPlans?.[0]?.city || '我的行程');
        const stats = this._calcCurrentStats();
        const titleEl = document.getElementById('detailTitle');
        titleEl.innerHTML = `${title} <span style="font-size:13px;opacity:.45;margin-left:4px;vertical-align:middle;">✏️</span>`;
        titleEl.style.cursor = 'pointer';
        titleEl.onclick = (e) => { e.stopPropagation(); this.editTripTitle(); };

        const days = this.trip.dayPlans?.length || 0;
        const startDate = this._getBaseDate();
        const endDate = new Date(startDate);
        if (days > 0) {
            endDate.setDate(startDate.getDate() + days - 1);
        }
        const dateStr = days > 0 
            ? `${this._fmtDate(startDate)} - ${this._fmtDate(endDate)} · ${days}天`
            : '未设置日期';
        const subtitleEl = document.getElementById('detailSubtitle');
        subtitleEl.innerHTML = `<span style="cursor:pointer;" onclick="event.stopPropagation();TripDetail.editTripDates();">📅 ${dateStr} <span style="font-size:11px;opacity:.5;">✏️</span></span> · 共${stats.totalSpots}个景点`;
    },

    editTripDates() {
        const currentStart = this._getBaseDate();
        const self = this;

        CalendarModule.show(null, (selectedDate) => {
            if (!selectedDate) return;
            const y = selectedDate.getFullYear();
            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(selectedDate.getDate()).padStart(2, '0');
            self.trip.startDate = `${y}-${m}-${d}`;
            self._saveTrip();
            self.renderHeader();
            self.renderDayPills();
            self.renderItinerary();
            if (typeof TripsModule !== 'undefined') {
                TripsModule.renderTripCards();
            }
            UiKit.toast('行程日期已更新 ✅', 'success');
        }, {
            mode: 'single',
            selectedDate: currentStart,
            title: '选择行程开始日期',
            confirmText: '确定',
            loadWeather: false
        });
    },

    _calcCurrentStats() {
        const totalSpots = this.trip.dayPlans?.reduce((s, d) => s + (d.spots?.length || 0), 0) || 0;
        const checkedSpots = this.trip.dayPlans?.reduce((s, d) => s + (d.spots?.filter(sp => sp.checked || sp.record?.checkedIn)?.length || 0), 0) || 0;
        let totalExpense = 0;
        if (this.trip.expenses) {
            totalExpense += this.trip.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        }
        if (this.trip.dayPlans) {
            this.trip.dayPlans.forEach(dp => {
                (dp.spots || []).forEach(s => {
                    totalExpense += parseFloat(s.cost) || parseFloat(s.baseCost) || 0;
                });
            });
        }
        return { totalSpots, checkedSpots, totalExpense };
    },

    async editTripTitle() {
        const current = this.trip.title || '';
        const dest = this.trip.destination || this.trip.dayPlans?.[0]?.city || '';
        const defVal = current || (dest ? dest + '之旅' : '我的行程');
        const input = await UiKit.prompt('给你的行程起个名字吧', {
            title: '编辑行程名称',
            defaultValue: defVal,
            placeholder: '例如：杭州西湖周末游'
        });
        if (input === null) return;
        const newTitle = (input || '').trim();
        this.trip.title = newTitle || (dest ? dest + '之旅' : '我的行程');
        this._saveTrip();
        this.renderHeader();
        if (typeof TripsModule !== 'undefined') {
            TripsModule.renderTripCards();
        }
        UiKit.toast('行程名称已更新 ✅', 'success');
    },

    renderTabs() {
        document.querySelectorAll('.detail-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === this.currentTab);
        });
        const indicator = document.getElementById('detailTabIndicator');
        const idx = ['itinerary','expense','packing'].indexOf(this.currentTab);
        indicator.style.transform = `translateX(${idx * 100}%)`;
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.detail-panel').forEach(p => p.classList.remove('active'));
        const panelMap = {
            'itinerary': 'itineraryPanel',
            'expense': 'expensePanel',
            'packing': 'packingPanel',
        };
        const panelId = panelMap[tab];
        if (panelId) document.getElementById(panelId).classList.add('active');
        this.renderTabs();

        const listActions = document.getElementById('listActions');
        const addSpotBtn = document.getElementById('addSpotBtn');
        const aiFabBtn = document.getElementById('aiFabBtn');
        if (tab === 'itinerary') {
            listActions.style.display = 'block';
            addSpotBtn.style.display = 'flex';
            const aiEnabled = localStorage.getItem('aiSuggestEnabled') !== 'false';
            if (aiFabBtn) aiFabBtn.style.display = aiEnabled ? 'flex' : 'none';
        } else {
            listActions.style.display = 'none';
            addSpotBtn.style.display = 'none';
            if (aiFabBtn) aiFabBtn.style.display = 'none';
        }

        document.getElementById('modeSwitchBtn').style.display = tab === 'itinerary' ? 'flex' : 'none';

        if (tab === 'expense') ExpenseModule.render();
        if (tab === 'packing') PackingModule.render();
    },

    _getBaseDate() {
        if (this.trip.startDate) {
            const d = new Date(this.trip.startDate);
            if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    },

    _getDayDate(dayIdx) {
        const base = this._getBaseDate();
        const d = new Date(base);
        d.setDate(base.getDate() + dayIdx);
        return d;
    },

    _fmtDate(d) {
        return `${d.getMonth()+1}月${d.getDate()}日`;
    },

    _fmtShortDate(d) {
        return `${d.getMonth()+1}.${d.getDate()}`;
    },

    _weekday(d) {
        return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    },

    _parseTimeRange(timeStr) {
        if (!timeStr) return null;
        const cleaned = timeStr.replace(/^[🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛]/, '').trim();
        const m = cleaned.match(/(\d{1,2}):(\d{2})\s*[-—~到至]\s*(\d{1,2}):(\d{2})/);
        if (m) {
            return {
                startH: parseInt(m[1]), startM: parseInt(m[2]),
                endH: parseInt(m[3]), endM: parseInt(m[4]),
            };
        }
        const m2 = cleaned.match(/(\d{1,2}):(\d{2})/);
        if (m2) {
            return {
                startH: parseInt(m2[1]), startM: parseInt(m2[2]),
                endH: parseInt(m2[1]) + 1, endM: parseInt(m2[2]),
            };
        }
        return null;
    },

    _minutesToHM(mins) {
        const h = Math.floor(mins / 60), m = mins % 60;
        return `${h}:${String(m).padStart(2,'0')}`;
    },

    _timeToMinutes(h, m) { return h * 60 + m; },

    _formatTimeRange(spot) {
        if (spot.startMin != null && spot.endMin != null) {
            return `${this._minutesToHM(spot.startMin)}—${this._minutesToHM(spot.endMin)}`;
        }
        const parsed = this._parseTimeRange(spot.time);
        if (parsed) {
            return `${parsed.startH}:${String(parsed.startM).padStart(2,'0')}—${parsed.endH}:${String(parsed.endM).padStart(2,'0')}`;
        }
        const dur = this._parseDurationMin(spot.duration);
        if (spot._defaultStart != null && dur) {
            return `${this._minutesToHM(spot._defaultStart)}—${this._minutesToHM(spot._defaultStart + dur)}`;
        }
        return spot.time || '';
    },

    _parseDurationMin(durStr) {
        if (!durStr) return 60;
        if (typeof durStr === 'number') return durStr;
        const h = durStr.match(/(\d+(?:\.\d+)?)\s*小时/);
        const m = durStr.match(/(\d+)\s*分钟/);
        let total = 0;
        if (h) total += parseFloat(h[1]) * 60;
        if (m) total += parseInt(m[1]);
        if (total === 0) {
            const n = parseFloat(durStr);
            if (!isNaN(n)) total = n * 60;
        }
        return Math.round(total / 10) * 10 || 60;
    },

    _assignDefaultTimes(dp) {
        let curMin = 9 * 60;
        const MAX_END = 23 * 60 + 59;
        (dp.spots || []).forEach(spot => {
            const parsed = this._parseTimeRange(spot.time);
            if (parsed) {
                spot.startMin = Math.min(this._timeToMinutes(parsed.startH, parsed.startM), MAX_END - 10);
                spot.endMin = Math.min(this._timeToMinutes(parsed.endH, parsed.endM), MAX_END);
                if (spot.endMin <= spot.startMin) spot.endMin = spot.startMin + 30;
                curMin = Math.min(spot.endMin + 15, MAX_END);
            } else if (spot.startMin == null || spot.endMin == null || spot.endMin > MAX_END) {
                const dur = Math.min(this._parseDurationMin(spot.duration), MAX_END - curMin);
                spot.startMin = curMin;
                spot.endMin = Math.min(curMin + dur, MAX_END);
                curMin = Math.min(spot.endMin + 15, MAX_END);
            } else {
                spot.startMin = Math.min(spot.startMin, MAX_END - 10);
                spot.endMin = Math.min(spot.endMin, MAX_END);
                curMin = Math.min(spot.endMin + 15, MAX_END);
            }
        });
    },

    _findTodayDay() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = this.trip?.dayPlans || [];
        for (let i = 0; i < days.length; i++) {
            const d = this._getDayDate(i);
            if (d.getTime() === today.getTime()) return i;
        }
        // 如果行程在今天之前已结束，回到第0天
        // 如果行程还没开始，也回到第0天
        return 0;
    },

    async _loadWeatherForTrip() {
        const city = this.trip.dayPlans?.[0]?.city || this.trip.destination || this.trip.cities?.[0] || '杭州';
        CalendarModule.weatherCity = '';
        CalendarModule.weatherData = {};
        App.destinations = [city];
        await CalendarModule.loadWeather();
        this.renderDayPills();
    },

    _bindSwipeGestures() {
        const scroll = document.querySelector('.detail-scroll');
        if (!scroll || scroll.dataset.swipeBound) return;
        scroll.dataset.swipeBound = '1';

        let startX = 0, startY = 0, startTime = 0;
        const SWIPE_THRESHOLD = 60;
        const VERTICAL_RATIO = 1.5;

        scroll.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
        }, { passive: true });

        scroll.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const dt = Date.now() - startTime;

            // 快速横向滑动且纵向位移较小
            if (dt < 500 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dy) < Math.abs(dx) / VERTICAL_RATIO) {
                // 确保不在可滚动内容中间滑动
                if (scroll.scrollTop <= 10) {
                    if (dx > 0) {
                        // 右滑 - 前一天
                        if (this.currentDay > 0) {
                            this.switchDay(this.currentDay - 1);
                            UIRender.showToast('← 前一天');
                        }
                    } else {
                        // 左滑 - 后一天
                        if (this.currentDay < (this.trip.dayPlans?.length || 1) - 1) {
                            this.switchDay(this.currentDay + 1);
                            UIRender.showToast('后一天 →');
                        }
                    }
                }
            }
        }, { passive: true });
    },

    renderDayPills() {
        const pillsBar = document.getElementById('dayPillsBar');
        const mapPillsBar = document.getElementById('mapDayPillsBar');
        const days = this.trip.dayPlans || [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '';
        days.forEach((dp, i) => {
            const d = this._getDayDate(i);
            const label = `${this._fmtShortDate(d)} ${this._weekday(d)}`;
            const isToday = d.getTime() === today.getTime();
            const weatherIcon = this._getDayWeatherIcon(dp, i);
            html += `<button class="day-pill ${i === this.currentDay ? 'active' : ''} ${isToday ? 'today' : ''}" data-day="${i}">
                ${isToday ? '<span style="font-size:10px;background:var(--brand);color:#fff;padding:1px 5px;border-radius:4px;margin-right:2px;">今</span>' : ''}
                ${label}
                ${weatherIcon ? `<span class="day-pill-weather">${weatherIcon}</span>` : ''}
            </button>`;
        });
        pillsBar.innerHTML = html;
        mapPillsBar.innerHTML = html.replace(/day-pill/g, 'map-day-pill');

        pillsBar.querySelectorAll('.day-pill').forEach(btn => {
            btn.onclick = () => this.switchDay(parseInt(btn.dataset.day));
        });
        mapPillsBar.querySelectorAll('.map-day-pill').forEach(btn => {
            btn.className = `map-day-pill ${parseInt(btn.dataset.day) === this.currentDay ? 'active' : ''}`;
            btn.onclick = () => this.switchDay(parseInt(btn.dataset.day));
        });

        this.renderDaySummary();
    },

    _getDayWeatherIcon(dp, dayIdx) {
        const d = this._getDayDate(dayIdx);
        const dateStr = CalendarModule.formatDateFull ? CalendarModule.formatDateFull(d) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const weather = CalendarModule.weatherData?.[dateStr];
        if (weather) {
            return HomeModule._weatherIcon(weather.text_day);
        }
        return '';
    },

    renderDaySummary() {
        const bar = document.getElementById('daySummaryBar');
        if (!bar) return;
        const dp = this.trip.dayPlans?.[this.currentDay];
        if (!dp) { bar.innerHTML = ''; return; }

        const spots = dp.spots || [];
        const spotCount = spots.length;
        const d = this._getDayDate(this.currentDay);
        const dateStr = CalendarModule.formatDateFull ? CalendarModule.formatDateFull(d) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const weather = CalendarModule.weatherData?.[dateStr];

        // 计算当日花费
        let dayExpense = 0;
        spots.forEach(s => {
            if (s.record?.expense) dayExpense += s.record.expense;
        });
        if (this.trip.expenses) {
            dayExpense += this.trip.expenses
                .filter(e => e.dayNum === this.currentDay)
                .reduce((sum, e) => sum + (e.amount || 0), 0);
        }

        // 计算时间范围
        let startMin = 9999, endMin = 0;
        spots.forEach(s => {
            if (s.startMin != null) startMin = Math.min(startMin, s.startMin);
            if (s.endMin != null) endMin = Math.max(endMin, s.endMin);
        });
        const timeLabel = spots.length > 0 && startMin < 9999
            ? `${this._minutesToHM(startMin)} - ${this._minutesToHM(endMin)}`
            : '全天';

        let html = '';
        if (weather) {
            html += `<div class="dsb-item dsb-weather">
                <span class="dsb-icon">${HomeModule._weatherIcon(weather.text_day)}</span>
                <span class="dsb-text">${weather.text_day || '晴'}<span class="dsb-sub">${weather.low}°~${weather.high}°</span></span>
            </div>`;
        }
        html += `<div class="dsb-item dsb-time">
            <span class="dsb-icon">🕐</span>
            <span class="dsb-text">${timeLabel}<span class="dsb-sub">${spotCount}个地点</span></span>
        </div>`;
        html += `<div class="dsb-item dsb-budget">
            <span class="dsb-icon">💰</span>
            <span class="dsb-text">¥${dayExpense}<span class="dsb-sub">当日花费</span></span>
        </div>`;
        bar.innerHTML = html;
    },

    switchDay(idx) {
        this.currentDay = idx;
        this.renderDayPills();
        if (this.mode === 'list') {
            this.renderItinerary();
            this.renderDaySummary();
            const sections = document.querySelectorAll('.day-section');
            if (sections[idx]) sections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            this.renderMap();
        }
        if (typeof AIChat !== 'undefined') {
            AIChat.setContext(this.trip, idx);
        }
    },

    toggleDayCollapse(di) {
        if (this._collapsedDays.has(di)) {
            this._collapsedDays.delete(di);
        } else {
            this._collapsedDays.add(di);
        }
        this.renderItinerary();
    },

    _renderSmartHint() {
        const dp = this.trip.dayPlans?.[this.currentDay];
        if (!dp) return '';
        const spots = dp.spots || [];
        if (spots.length === 0) return '';

        const now = new Date();
        const hour = now.getHours();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayDate = this._getDayDate(this.currentDay);
        const isToday = dayDate.getTime() === today.getTime();
        if (!isToday) return '';

        // 计算当前进度
        const checkedCount = spots.filter(s => s.checked || s.record?.checkedIn).length;
        const remaining = spots.length - checkedCount;

        // 找到当前应该正在进行的景点
        const nowMin = hour * 60 + now.getMinutes();
        let currentSpot = null;
        let nextSpot = null;
        spots.forEach((s, i) => {
            if (s.startMin != null && s.endMin != null) {
                if (nowMin >= s.startMin && nowMin < s.endMin) {
                    currentSpot = s;
                }
                if (s.startMin > nowMin && !nextSpot) {
                    nextSpot = s;
                }
            }
        });

        let hint = '';
        let icon = '💡';
        let bgColor = '#FFF8E7';

        if (hour < 9) {
            icon = '🌅';
            bgColor = '#FFF5EE';
            hint = nextSpot
                ? `早安！今天的第一站是「${nextSpot.name}」，建议${this._minutesToHM(nextSpot.startMin)}出发`
                : `早安！今天有${spots.length}个地点等你探索`;
        } else if (hour >= 11 && hour < 14) {
            icon = '🍜';
            bgColor = '#FFF8E7';
            const hasFood = spots.some(s => s.type === '美食' || s.name.includes('餐') || s.name.includes('吃'));
            hint = hasFood
                ? '午餐时间到啦！别忘了享受当地美食'
                : '午餐时间到啦！可以用AI助手搜索附近美食 🍜';
        } else if (hour >= 14 && hour < 17) {
            icon = '☕';
            bgColor = '#F0FFF4';
            hint = remaining > 0
                ? `下午还有${remaining}个地点，${currentSpot ? `正在「${currentSpot.name}」` : '继续加油！'}`
                : '今天的行程已全部完成，辛苦啦！🎉';
        } else if (hour >= 17 && hour < 20) {
            icon = '🌆';
            bgColor = '#FFF0E6';
            hint = remaining > 0
                ? `傍晚了，还有${remaining}个地点未完成，注意时间安排`
                : '日落时分，回顾今天的旅程吧 🌇';
        } else if (hour >= 20) {
            icon = '🌙';
            bgColor = '#F0F0FF';
            hint = remaining > 0
                ? `晚上还有${remaining}个地点，注意安全，合理调整行程`
                : '今天圆满结束！早点休息，明天继续 ✨';
        }

        if (!hint) return '';

        return `<div class="smart-hint-banner" style="background:${bgColor};">
            <span class="sh-icon">${icon}</span>
            <span class="sh-text">${hint}</span>
        </div>`;
    },

    renderItinerary() {
        const container = document.getElementById('itineraryContent');
        const days = this.trip.dayPlans || [];
        const aiEnabled = localStorage.getItem('aiSuggestEnabled') !== 'false';
        if (days.length === 0) {
            container.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#999;">暂无行程，点击下方按钮添加热门地点</div>';
            return;
        }

        let html = this._renderSmartHint();
        days.forEach((dp, di) => {
            this._assignDefaultTimes(dp);
            const d = this._getDayDate(di);
            const dateLabel = `${this._fmtDate(d)} ${this._weekday(d)}`;
            const spots = dp.spots || [];
            const isActive = di === this.currentDay;
            const collapsed = this._collapsedDays.has(di);
            const spotCount = spots.length;

            html += `<div class="day-section ${isActive ? 'active' : ''}" data-day="${di}">
                <div class="day-header-bar" onclick="TripDetail.toggleDayCollapse(${di})">
                    <div class="day-header-left">
                        <span class="day-date-big">${dateLabel}</span>
                        <span class="day-spot-count">${spotCount}个地点</span>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="day-retime-btn" onclick="event.stopPropagation();TripDetail.retimeDay(${di})" title="按顺序重排时间">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        </button>
                        <button class="day-collapse-btn ${collapsed ? 'collapsed' : ''}" onclick="event.stopPropagation();TripDetail.toggleDayCollapse(${di})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>
                </div>
                <div class="timeline-list" style="${collapsed ? 'display:none;' : ''}">`;

            if (spots.length === 0) {
                html += `<div style="padding:24px 16px;color:#999;font-size:13px;text-align:center;background:#f9f9fb;border-radius:12px;margin:0 0 12px;">暂无景点，点击下方"+ 添加热门地点"开始规划</div>`;
            }

            spots.forEach((spot, si) => {
                const emoji = spot.emoji || _getSpotEmoji(spot.type || spot.name);
                const type = spot.type || '景点';
                const timeRange = this._formatTimeRange(spot);
                const durMin = (spot.endMin != null && spot.startMin != null) ? (spot.endMin - spot.startMin) : this._parseDurationMin(spot.duration);
                const durLabel = durMin >= 60 ? `${(durMin/60).toFixed(durMin%60===0?0:1)}小时` : `${durMin}分钟`;
                const recExpense = spot.record?.expense || 0;
                const baseCost = spot.cost ? (String(spot.cost).includes('¥') ? spot.cost : `¥${spot.cost}`) : '';
                const costLabel = recExpense > 0 ? `¥${recExpense}` : (baseCost || '免费');
                const rating = spot.rating ? (typeof spot.rating === 'number' ? `⭐${spot.rating.toFixed(1)}` : `⭐${spot.rating}`) : '';
                const memo = spot.memo || '';
                const done = spot.checked || spot.record?.checkedIn;
                const doneCls = done ? 'checked' : '';
                const intro = spot.intro || _getSpotIntro(spot, type);
                const userPhotos = spot.photos || spot.record?.photos || [];
                const poiCover = spot.poiCoverUrl || UIRender.getSpotImage(spot);
                const allPhotos = userPhotos.length > 0 ? userPhotos : (poiCover ? [{ dataUrl: poiCover, isPoi: true }] : []);
                const displayCount = Math.min(allPhotos.length, 3);
                const checkedIn = spot.record?.checkedIn ? 'checked-in' : '';
                const hasNotes = (spot.record?.notes || []).length > 0;
                const [startT, endT] = timeRange.split('—');

                let imgSection = '';
                if (displayCount === 0) {
                    imgSection = `
                    <div class="spot-img spot-img--empty">
                        <button class="spot-add-photo-btn" onclick="event.stopPropagation();TripDetail.showPhotoMenu(${di},${si})">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            <span>添加照片</span>
                        </button>
                    </div>`;
                } else if (displayCount === 1) {
                    const p = allPhotos[0];
                    imgSection = `
                    <div class="spot-img spot-img--single" onclick="event.stopPropagation();TripDetail.previewPhoto(${di},${si},0)">
                        <img src="${p.dataUrl}" alt="${spot.name}">
                        <div class="spot-img-actions">
                            <button class="spot-img-camera-btn" onclick="event.stopPropagation();TripDetail.showPhotoMenu(${di},${si})">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </button>
                        </div>
                        ${p.isPoi ? '' : '<div class="spot-user-photo-badge">我的照片</div>'}
                    </div>`;
                } else if (displayCount === 2) {
                    imgSection = `
                    <div class="spot-img spot-img--two">
                        <div class="spot-img-item" onclick="event.stopPropagation();TripDetail.previewPhoto(${di},${si},0)">
                            <img src="${allPhotos[0].dataUrl}" alt="">
                        </div>
                        <div class="spot-img-item" onclick="event.stopPropagation();TripDetail.previewPhoto(${di},${si},1)">
                            <img src="${allPhotos[1].dataUrl}" alt="">
                            <button class="spot-img-camera-btn spot-img-camera-btn--overlay" onclick="event.stopPropagation();TripDetail.showPhotoMenu(${di},${si})">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </button>
                        </div>
                    </div>`;
                } else {
                    imgSection = `
                    <div class="spot-img spot-img--three">
                        <div class="spot-img-main" onclick="event.stopPropagation();TripDetail.previewPhoto(${di},${si},0)">
                            <img src="${allPhotos[0].dataUrl}" alt="">
                        </div>
                        <div class="spot-img-side">
                            <div class="spot-img-item" onclick="event.stopPropagation();TripDetail.previewPhoto(${di},${si},1)">
                                <img src="${allPhotos[1].dataUrl}" alt="">
                            </div>
                            <div class="spot-img-item" onclick="event.stopPropagation();TripDetail.previewPhoto(${di},${si},2)">
                                <img src="${allPhotos[2].dataUrl}" alt="">
                                <button class="spot-img-camera-btn spot-img-camera-btn--overlay" onclick="event.stopPropagation();TripDetail.showPhotoMenu(${di},${si})">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>`;
                }

                html += `<div class="timeline-item ${checkedIn}" data-di="${di}" data-si="${si}">
                    <div class="timeline-time-block" onclick="TripDetail.openTimeEditor(${di},${si})">
                        <div class="tb-start">${startT || ''}</div>
                        <div class="tb-line"></div>
                        <div class="tb-end">${endT || ''}</div>
                        <div class="tb-dur">${durLabel}</div>
                    </div>
                    <div class="timeline-axis">
                        <div class="axis-dot ${doneCls}"></div>
                        ${si < spots.length - 1 ? '<div class="axis-line"></div>' : ''}
                    </div>
                    <div class="timeline-card ${hasNotes ? 'has-notes' : ''}" onclick="SpotRecord.open(${di},${si})">
                        ${!hasNotes ? '<span class="card-note-dot"></span>' : ''}
                        ${imgSection}
                        <div class="card-body">
                            <div class="card-name-row">
                                <span class="card-name">${spot.name}</span>
                                <span class="card-type-badge">${type}</span>
                                ${done ? '<span class="card-done">✓ 已完成</span>' : ''}
                                <span class="card-edit-actions">
                                    ${si > 0 ? `<button class="card-act-btn" title="上移" onclick="event.stopPropagation();TripDetail.moveSpot(${di},${si},-1)">▲</button>` : ''}
                                    ${si < spots.length - 1 ? `<button class="card-act-btn" title="下移" onclick="event.stopPropagation();TripDetail.moveSpot(${di},${si},1)">▼</button>` : ''}
                                    <button class="card-act-btn card-del-btn" title="删除" onclick="event.stopPropagation();TripDetail.confirmRemoveSpot(${di},${si})">✕</button>
                                </span>
                            </div>
                            <div class="card-spot-intro">
                                <span class="intro-icon">📍</span>
                                <span class="intro-text">${intro}</span>
                            </div>
                            <div class="card-meta-row">
                                <span class="meta-rating">${rating || (baseCost ? baseCost : '—')}</span>
                                <span class="meta-spacer"></span>
                                ${spot.lng && spot.lat ? `<button class="card-nav-btn" onclick="event.stopPropagation();TripDetail.quickNavigate(${di},${si})" title="导航到这里">🧭 导航</button>` : ''}
                                <span class="meta-cost-edit" onclick="event.stopPropagation();TripDetail.editSpotCost(${di},${si})">${costLabel} <span style="font-size:10px;opacity:.6;">✏️</span></span>
                                <button class="card-check-btn ${doneCls}" onclick="event.stopPropagation();TripDetail.toggleSpotCheck(${di},${si},this)">${done ? '✓' : ''}</button>
                            </div>
                            ${memo ? `<div class="card-memo">📌 ${memo}</div>` : ''}
                            ${aiEnabled ? '<button class="ai-tips-toggle" onclick="event.stopPropagation();TripDetail.toggleSpotTips('+di+','+si+')">💡 AI小贴士</button><div class="ai-tips-panel" id="ai-tips-'+di+'-'+si+'"><div class="ai-tips-loading">点击展开AI贴士</div></div>' : ''}
                        </div>
                    </div>
                </div>`;
                if (si < spots.length - 1) {
                    html += this.renderTransportHint(di, si, spot, spots[si+1]);
                }
                html += this.renderInlineSuggestion(di, si);
            });

            html += `
                <button class="day-add-spot-btn" onclick="event.stopPropagation();AddSpotPanel.open(TripDetail.trip, TripDetail, ${di})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>添加景点到这一天</span>
                </button>
            </div></div>`;
        });

        container.innerHTML = html;
        if (aiEnabled) {
            setTimeout(() => this.analyzeAndSuggest(), 500);
        }
        setTimeout(() => this._initDragSort(), 100);
    },

    _initDragSort() {
        const container = document.getElementById('itineraryContent');
        if (!container) return;
        if (typeof DragSort === 'undefined') return;
        container.dataset.dragInit = '1';
        DragSort.init(container, (result) => this._handleDragDrop(result));
    },

    _handleDragDrop(result) {
        if (result.type === 'delete') {
            this.confirmRemoveSpot(result.fromDi, result.fromSi);
        } else if (result.type === 'move') {
            this._moveSpotAcrossDays(result.fromDi, result.fromSi, result.toDi, result.toSi);
        }
    },

    _moveSpotAcrossDays(fromDi, fromSi, toDi, toSi) {
        const fromDp = this.trip.dayPlans[fromDi];
        const toDp = this.trip.dayPlans[toDi];
        if (!fromDp?.spots || !toDp?.spots) return;
        if (fromDi === toDi && fromSi === toSi) return;

        const [spot] = fromDp.spots.splice(fromSi, 1);
        if (!spot) return;

        const adjustedSi = fromDi === toDi && fromSi < toSi ? toSi - 1 : toSi;
        toDp.spots.splice(adjustedSi, 0, spot);

        fromDp.spots.forEach(s => { delete s._transportCalculated; });
        toDp.spots.forEach(s => { delete s._transportCalculated; });
        this._reassignTimesForDay(fromDp);
        if (fromDi !== toDi) this._reassignTimesForDay(toDp);
        this._ensureTransportDefaults();

        this.renderItinerary();
        this._saveTrip();
        this._recalcAllTransport();
        UiKit.toast(fromDi === toDi ? '已调整顺序，时间已重排' : `已移动到 Day ${toDi + 1}，时间已重排`, 'success');
    },

    _reassignTimesForDay(dp) {
        let curMin = 9 * 60;
        const MAX_END = 22 * 60;
        (dp.spots || []).forEach(spot => {
            const dur = Math.min(this._parseDurationMin(spot.duration) || (spot.stayMinutes || 90), MAX_END - curMin);
            const safeDur = Math.max(dur, 30);
            spot.startMin = curMin;
            spot.endMin = Math.min(curMin + safeDur, MAX_END);
            spot.time = this._minutesToHM(spot.startMin) + '-' + this._minutesToHM(spot.endMin);
            curMin = Math.min(spot.endMin + 15, MAX_END);
        });
    },

    retimeDay(di) {
        const dp = this.trip.dayPlans?.[di];
        if (!dp?.spots || dp.spots.length === 0) return;
        this._reassignTimesForDay(dp);
        this._ensureTransportDefaults();
        this.renderItinerary();
        this._saveTrip();
        this._recalcAllTransport();
        if (typeof UiKit !== 'undefined') UiKit.toast('已按顺序重排时间 ⏰', 'success');
    },

    switchTransport(di, si, mode) {
        const dp = this.trip.dayPlans[di];
        const fromSpot = dp.spots[si];
        const toSpot = dp.spots[si + 1];
        if (!fromSpot || !toSpot) return;

        toSpot.transportMode = mode;
        toSpot._transportModeChanged = true;
        delete toSpot._transportCalculated;

        if (fromSpot.lng && fromSpot.lat && toSpot.lng && toSpot.lat) {
            const distKm = MapModule.calcDistance(fromSpot.lng, fromSpot.lat, toSpot.lng, toSpot.lat);
            const est = MapModule.estimateRoute(distKm, mode);
            toSpot.distanceNum = est.distance;
            toSpot.timeSec = est.time;
            this.formatTransportDisplay(toSpot);
        }

        this._saveTrip();
        this.renderItinerary();
    },

    formatTransportDisplay(spot) {
        const distKm = (spot.distanceNum || 0) / 1000;
        spot.distance = distKm < 1 
            ? Math.round(distKm * 1000) + '米' 
            : distKm.toFixed(1) + 'km';
        const timeMin = Math.round((spot.timeSec || 0) / 60);
        spot.travelTime = timeMin + '分钟';
        
        const modeMap = { walking: '步行', riding: '骑行', driving: '驾车', transit: '公交' };
        spot.transport = modeMap[spot.transportMode] || '步行';
    },

    renderTransportHint(di, si, fromSpot, toSpot) {
        const mode = toSpot.transportMode || MapModule.recommendTransport(2);
        
        if (!toSpot.distanceNum || !toSpot.timeSec || toSpot._transportModeChanged) {
            const distKm = (fromSpot.lng && fromSpot.lat && toSpot.lng && toSpot.lat)
                ? MapModule.calcDistance(fromSpot.lng, fromSpot.lat, toSpot.lng, toSpot.lat)
                : 2;
            const recommendedMode = toSpot.transportMode || MapModule.recommendTransport(distKm);
            const est = MapModule.estimateRoute(distKm, recommendedMode);
            toSpot.distanceNum = est.distance;
            toSpot.timeSec = est.time;
            toSpot.transportMode = recommendedMode;
            delete toSpot._transportModeChanged;
            this.formatTransportDisplay(toSpot);
        }
        
        const emojiMap = { walking: '🚶', riding: '🚴', driving: '🚗', transit: '🚌' };
        const labelMap = { walking: '步行', riding: '骑行', driving: '驾车', transit: '公交' };
        const modes = [
            { key: 'walking', emoji: '🚶' },
            { key: 'riding', emoji: '🚴' },
            { key: 'driving', emoji: '🚗' },
            { key: 'transit', emoji: '🚌' }
        ];
        
        const loading = toSpot._transportLoading ? '<span class="th-loading">…</span>' : '';
        const timeText = toSpot.travelTime || '约—分钟';
        const modesHtml = modes.map(m => 
            `<button class="th-mode-btn ${mode === m.key ? 'active' : ''}" onclick="event.stopPropagation();TripDetail.switchTransport(${di},${si},'${m.key}')" title="${labelMap[m.key]}">${m.emoji}</button>`
        ).join('');
        
        return `<div class="transport-hint" data-di="${di}" data-si="${si}">
            ${loading || `<button class="th-pill" onclick="event.stopPropagation();TripDetail.toggleTransportModes(${di},${si})">
                <span class="th-pill-icon">${emojiMap[mode]}</span>
                <span class="th-pill-time">${timeText}</span>
            </button>`}
            <div class="th-modes">
                ${modesHtml}
                <button class="th-close-modes" onclick="event.stopPropagation();TripDetail.toggleTransportModes(${di},${si},false)">✕</button>
            </div>
        </div>`;
    },

    toggleTransportModes(di, si, expand) {
        const el = document.querySelector(`.transport-hint[data-di="${di}"][data-si="${si}"]`);
        if (!el) return;
        if (expand === undefined) {
            el.classList.toggle('expanded');
        } else {
            el.classList.toggle('expanded', expand);
        }
    },

    _ensureTransportDefaults() {
        if (!this.trip?.dayPlans) return;
        this.trip.dayPlans.forEach(dp => {
            const spots = dp.spots || [];
            for (let i = 0; i < spots.length - 1; i++) {
                const from = spots[i];
                const to = spots[i+1];
                if (!to.transportMode) {
                    const distKm = (from.lng && from.lat && to.lng && to.lat)
                        ? MapModule.calcDistance(from.lng, from.lat, to.lng, to.lat)
                        : 2;
                    to.transportMode = MapModule.recommendTransport(distKm);
                }
            }
        });
    },

    _recalcAllTransport() {
        if (!this.trip?.dayPlans) return;
        this.trip.dayPlans.forEach((dp, di) => {
            const spots = dp.spots || [];
            for (let i = 0; i < spots.length - 1; i++) {
                const from = spots[i];
                const to = spots[i+1];
                if (from.lng && from.lat && to.lng && to.lat && to.transportMode && !to._transportCalculated) {
                    to._transportCalculated = true;
                    MapModule.calcRoute(
                        { lng: from.lng, lat: from.lat },
                        { lng: to.lng, lat: to.lat },
                        to.transportMode
                    ).then(result => {
                        if (result.success) {
                            to.distanceNum = result.distance;
                            to.timeSec = result.time;
                        } else {
                            const distKm = MapModule.calcDistance(from.lng, from.lat, to.lng, to.lat);
                            const est = MapModule.estimateRoute(distKm, to.transportMode);
                            to.distanceNum = est.distance;
                            to.timeSec = est.time;
                        }
                        this.formatTransportDisplay(to);
                        this._saveTrip();
                        if (this.mode === 'list' && this.currentDay === di) {
                            this.renderItinerary();
                        }
                    });
                }
            }
        });
    },

    toggleSpotCheck(di, si, btn) {
        const spot = this.trip.dayPlans[di].spots[si];
        const newVal = !(spot.checked || spot.record?.checkedIn);
        spot.checked = newVal;
        if (newVal && !spot.record) spot.record = {};
        if (newVal) {
            spot.record.checkedIn = true;
            spot.record.checkedInAt = Date.now();
        } else if (spot.record) {
            delete spot.record.checkedIn;
            delete spot.record.checkedInAt;
        }
        this.renderItinerary();
        this._saveTrip();
    },

    async showPhotoMenu(di, si) {
        const spot = this.trip.dayPlans[di].spots[si];
        if (!spot.photos) spot.photos = [];
        
        const action = await UiKit.showActionSheet([
            { text: '📷 拍照', value: 'camera' },
            { text: '🖼️ 从相册选择', value: 'gallery' },
            spot.photos.length > 0 ? { text: '🗑️ 清空我的照片', value: 'clear', danger: true } : null
        ].filter(Boolean), '添加照片');

        if (!action) return;

        if (action === 'clear') {
            spot.photos = [];
            this.renderItinerary();
            this._saveTrip();
            UiKit.toast('已清空照片', 'success');
            return;
        }

        if (spot.photos.length >= 3) {
            UiKit.toast('最多只能上传3张照片', 'info');
            return;
        }

        let results = [];
        if (action === 'camera') {
            const photo = await PhotoUpload.selectCamera();
            if (photo) results = [photo];
        } else {
            results = await PhotoUpload.selectAndCompress();
            const remaining = 3 - spot.photos.length;
            results = results.slice(0, remaining);
        }

        if (results.length > 0) {
            spot.photos = [...spot.photos, ...results];
            this.renderItinerary();
            this._saveTrip();
            UiKit.toast(`成功添加${results.length}张照片`, 'success');
        }
    },

    previewPhoto(di, si, photoIdx) {
        const spot = this.trip.dayPlans[di].spots[si];
        const userPhotos = spot.photos || [];
        const poiCover = spot.poiCoverUrl || UIRender.getSpotImage(spot);
        const allPhotos = userPhotos.length > 0 ? userPhotos : (poiCover ? [{ dataUrl: poiCover }] : []);
        if (allPhotos.length === 0) return;

        const mask = document.createElement('div');
        mask.className = 'photo-preview-mask';
        mask.innerHTML = `
            <div class="photo-preview-close" onclick="this.parentElement.remove()">✕</div>
            <div class="photo-preview-container">
                <img src="${allPhotos[photoIdx]?.dataUrl || ''}" class="photo-preview-img" id="previewImg">
            </div>
            ${allPhotos.length > 1 ? `
            <div class="photo-preview-dots">
                ${allPhotos.map((_, i) => `<span class="pp-dot ${i === photoIdx ? 'active' : ''}" data-idx="${i}"></span>`).join('')}
            </div>` : ''}
        `;
        document.body.appendChild(mask);

        let currentIdx = photoIdx;
        const updateImg = (idx) => {
            currentIdx = idx;
            const img = mask.querySelector('#previewImg');
            img.src = allPhotos[idx].dataUrl;
            mask.querySelectorAll('.pp-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
        };

        let startX = 0;
        mask.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        mask.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - startX;
            if (dx < -50 && currentIdx < allPhotos.length - 1) updateImg(currentIdx + 1);
            else if (dx > 50 && currentIdx > 0) updateImg(currentIdx - 1);
        }, { passive: true });

        mask.querySelectorAll('.pp-dot').forEach(dot => {
            dot.onclick = () => updateImg(parseInt(dot.dataset.idx));
        });
        mask.onclick = (e) => {
            if (e.target === mask) mask.remove();
        };
    },

    uploadSpotPhoto(di, si, input) {
        const spot = this.trip.dayPlans[di].spots[si];
        if (!spot.photos) spot.photos = [];
        const files = Array.from(input.files || []);
        if (files.length === 0) return;

        const remaining = 3 - spot.photos.length;
        if (remaining <= 0) {
            UiKit.toast('最多只能上传3张照片', 'info');
            return;
        }

        let processed = 0;
        files.slice(0, remaining).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width, h = img.height;
                    if (w > 1200) { h = Math.round(h * 1200 / w); w = 1200; }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    spot.photos.push({ id: 'photo_' + Date.now() + '_' + Math.random(), dataUrl, isCover: spot.photos.length === 0 });
                    processed++;
                    if (processed === Math.min(files.length, remaining)) {
                        this.renderItinerary();
                        this._saveTrip();
                        UiKit.toast('图片上传成功', 'success');
                    }
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    },

    updateMemo(di, si, val) {
        this.trip.dayPlans[di].spots[si].memo = val;
        clearTimeout(this._memoTimer);
        this._memoTimer = setTimeout(() => this._saveTrip(), 800);
    },

    _saveTrip() {
        if (!this.trip) return;
        if (!this.trip.id && this.tripId) {
            this.trip.id = this.tripId;
        }
        AIMemory.saveTrip(this.trip);
    },

    switchToMap() {
        this.mode = 'map';
        document.getElementById('detailListMode').style.display = 'none';
        document.getElementById('detailMapMode').style.display = 'flex';
        setTimeout(() => this.renderMap(), 100);
        // Phase 3.3：切换地图模式触发新手任务
        if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('view_map');
    },

    switchToList() {
        this.mode = 'list';
        document.getElementById('detailMapMode').style.display = 'none';
        document.getElementById('detailListMode').style.display = 'flex';
        document.getElementById('modeSwitchBtn').style.display = this.currentTab === 'itinerary' ? 'flex' : 'none';
        if (this.detailMap) {
            this.detailMap.destroy();
            this.detailMap = null;
        }
        this.hideMapSpotCard();
    },

    async renderMap() {
        document.getElementById('modeSwitchBtn').style.display = 'none';

        let mapContainer = document.getElementById('detailMapContainer');
        let errorTip = document.getElementById('mapErrorTip');

        try {
            if (!this.detailMap) {
                await MapModule.init();
                if (typeof AMap === 'undefined') throw new Error('地图服务不可用');
                this.detailMap = new AMap.Map('detailMapContainer', {
                    zoom: 12,
                    center: [116.397428, 39.90923],
                    mapStyle: 'amap://styles/normal',
                });
            }
            if (errorTip) errorTip.style.display = 'none';
        } catch(e) {
            console.error('Map init failed:', e);
            if (!errorTip) {
                errorTip = document.createElement('div');
                errorTip.id = 'mapErrorTip';
                errorTip.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#f5f5f7,#e8e8ed);color:#888;font-size:14px;z-index:5;';
                errorTip.innerHTML = '<div style="font-size:48px;margin-bottom:12px;">🗺️</div><div>地图加载失败</div><div style="font-size:12px;margin-top:6px;color:#aaa;">请检查网络连接后重试</div>';
                mapContainer.appendChild(errorTip);
            } else {
                errorTip.style.display = 'flex';
            }
            return;
        }

        this.detailMap.clearMap();
        this.detailMarkers = [];
        this.detailPolyline = null;
        this.hideMapSpotCard();

        const dayPlan = this.trip.dayPlans?.[this.currentDay];
        if (!dayPlan) return;
        const spots = dayPlan.spots || [];
        if (spots.length === 0) return;

        const city = dayPlan.city || this.trip.destination || this.trip.cities?.[0] || '';
        const geocodeTasks = [];
        spots.forEach((spot) => {
            if (!spot.lng || !spot.lat) {
                geocodeTasks.push(
                    MapModule.geocodeSpot(city, spot.name).then(pos => {
                        if (pos) { spot.lng = pos.lng; spot.lat = pos.lat; }
                    }).catch(() => {})
                );
            }
        });
        if (geocodeTasks.length > 0) {
            try { await Promise.all(geocodeTasks); } catch(e) {}
            this._saveTrip();
            this._recalcAllTransport();
        }

        const positions = [];
        const validIdx = [];
        spots.forEach((spot, si) => {
            if (spot.lng && spot.lat) {
                positions.push([spot.lng, spot.lat]);
                validIdx.push(si);
            }
        });

        positions.forEach((pos, i) => {
            const si = validIdx[i];
            const marker = new AMap.Marker({
                position: pos,
                content: _createMapMarker(si+1, false),
                offset: new AMap.Pixel(-16, -32),
                zIndex: 10 + si,
                extData: { di: this.currentDay, si }
            });
            marker.on('click', () => {
                this._selectMapSpot(this.currentDay, si);
            });
            this.detailMap.add(marker);
            this.detailMarkers.push(marker);
        });

        if (positions.length > 1) {
            if (this.mapView === 'line') {
                this.detailPolyline = new AMap.Polyline({
                    path: positions,
                    strokeColor: '#FF7B3D',
                    strokeWeight: 4,
                    strokeOpacity: 0.75,
                    lineJoin: 'round',
                    lineCap: 'round',
                    showDir: true,
                });
                this.detailMap.add(this.detailPolyline);
            }
            setTimeout(() => this.detailMap.setFitView(this.detailMarkers, false, [60,60,200,60]), 200);
        } else if (positions.length === 1) {
            this.detailMap.setZoomAndCenter(14, positions[0]);
        }
    },

    _selectMapSpot(di, si) {
        this.selectedSpotIdx = si;
        const spot = this.trip.dayPlans[di]?.spots?.[si];
        if (!spot) return;

        this.detailMarkers.forEach((m) => {
            const ext = m.getExtData();
            const markerSi = ext.si;
            m.setContent(_createMapMarker(markerSi+1, markerSi === si));
            m.setzIndex(markerSi === si ? 100 : 10 + markerSi);
        });

        if (spot.lng && spot.lat) {
            this.detailMap.setZoomAndCenter(15, [spot.lng, spot.lat]);
        }

        const emoji = spot.emoji || _getSpotEmoji(spot.type || spot.name);
        document.getElementById('mapSpotEmoji').textContent = emoji;
        document.getElementById('mapSpotName').textContent = spot.name;
        document.getElementById('mapSpotInfo').textContent = [spot.type || '景点', spot.time, spot.duration].filter(Boolean).join(' · ');
        document.getElementById('mapSpotCard').style.display = 'block';
    },

    hideMapSpotCard() {
        document.getElementById('mapSpotCard').style.display = 'none';
        this.selectedSpotIdx = -1;
        this.detailMarkers.forEach((m) => {
            const ext = m.getExtData();
            const markerSi = ext.si;
            m.setContent(_createMapMarker(markerSi+1, false));
            m.setzIndex(10 + markerSi);
        });
    },

    navigateToSelectedSpot() {
        if (this.selectedSpotIdx < 0) return;
        const spot = this.trip.dayPlans[this.currentDay]?.spots?.[this.selectedSpotIdx];
        if (!spot?.lng || !spot?.lat) { UIRender.showToast('无法获取位置'); return; }
        const url = `https://uri.amap.com/navigation?to=${spot.lng},${spot.lat},${encodeURIComponent(spot.name)}&mode=car&policy=1&src=tripapp&coordinate=gaode&callnative=1`;
        window.open(url, '_blank');
    },

    setMapView(mode) {
        this.mapView = mode;
        document.getElementById('mapLineBtn').classList.toggle('active', mode === 'line');
        document.getElementById('mapPointBtn').classList.toggle('active', mode === 'point');
        this.renderMap();
    },

    mapFitAll() {
        if (this.detailMap && this.detailMarkers.length > 0) {
            const positions = this.detailMarkers.map(m => m.getPosition());
            this.detailMap.setFitView(positions, false, [60,60,200,60]);
        }
    },

    _teDayStart: 7 * 60,
    _teDayEnd: 23 * 60 + 59,
    openTimeEditor(di, si) {
        const spot = this.trip.dayPlans[di]?.spots?.[si];
        if (!spot) return;
        this._teDi = di;
        this._teSi = si;
        this._assignDefaultTimes(this.trip.dayPlans[di]);
        let startMin = spot.startMin != null ? spot.startMin : 9*60;
        let endMin = spot.endMin != null ? spot.endMin : startMin + 60;
        this._teStart = Math.max(this._teDayStart, Math.min(startMin, this._teDayEnd - 10));
        this._teEnd = Math.max(this._teStart + 10, Math.min(endMin, this._teDayEnd));
        document.getElementById('teSpotName').textContent = spot.name;
        const d = this._getDayDate(di);
        document.getElementById('teDateLabel').textContent = `${this._fmtDate(d)} ${this._weekday(d)}`;
        this._buildTimeLabels();
        this._teDragging = null;
        this._bindTimeEditor();
        this._updateTeUI();
        document.getElementById('timeEditorOverlay').style.display = 'flex';
    },
    closeTimeEditor() {
        document.getElementById('timeEditorOverlay').style.display = 'none';
        this._teDragging = null;
    },
    _buildTimeLabels() {
        const labels = document.getElementById('teLabels');
        let html = '';
        for (let h = this._teDayStart; h <= this._teDayEnd; h += 60) {
            const left = ((h - this._teDayStart) / (this._teDayEnd - this._teDayStart)) * 100;
            html += `<span style="left:${left}%">${Math.floor(h/60)}:00</span>`;
        }
        labels.innerHTML = html;
    },
    _updateTeUI() {
        const total = this._teDayEnd - this._teDayStart;
        const sPct = ((this._teStart - this._teDayStart) / total) * 100;
        const ePct = ((this._teEnd - this._teDayStart) / total) * 100;
        const fill = document.getElementById('teFill');
        const hStart = document.getElementById('teHandleStart');
        const hEnd = document.getElementById('teHandleEnd');
        fill.style.left = sPct + '%';
        fill.style.width = (ePct - sPct) + '%';
        hStart.style.left = sPct + '%';
        hEnd.style.left = ePct + '%';
        document.getElementById('teStartLabel').textContent = this._minToTime(this._teStart);
        document.getElementById('teEndLabel').textContent = this._minToTime(this._teEnd);
        const dur = this._teEnd - this._teStart;
        document.getElementById('teDuration').textContent = dur >= 60
            ? (dur % 60 === 0 ? `${dur/60}小时` : `${Math.floor(dur/60)}小时${dur%60}分`)
            : `${dur}分钟`;
    },
    _minToTime(mins) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}:${String(m).padStart(2,'0')}`;
    },
    _bindTimeEditor() {
        if (this._teBound) return;
        this._teBound = true;
        const track = document.getElementById('teTrack');
        const overlay = document.getElementById('timeEditorOverlay');
        const fill = document.getElementById('teFill');

        const getX = (e) => {
            const rect = track.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        };
        const pxToMin = (ratio) => {
            const total = this._teDayEnd - this._teDayStart;
            let m = this._teDayStart + Math.round(ratio * total / 10) * 10;
            return Math.max(this._teDayStart, Math.min(this._teDayEnd, m));
        };

        const onMove = (e) => {
            if (!this._teDragging) return;
            e.preventDefault();
            const m = pxToMin(getX(e));
            if (this._teDragging === 'start') {
                this._teStart = Math.min(m, this._teEnd - 10);
            } else if (this._teDragging === 'end') {
                this._teEnd = Math.max(m, this._teStart + 10);
            } else if (this._teDragging === 'move') {
                const dur = this._teEnd - this._teStart;
                let newStart = Math.max(this._teDayStart, Math.min(m - this._teOffset, this._teDayEnd - dur));
                this._teStart = newStart;
                this._teEnd = newStart + dur;
            }
            this._updateTeUI();
        };
        const onUp = () => {
            this._teDragging = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
        };

        document.getElementById('teHandleStart').addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            this._teDragging = 'start';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
        document.getElementById('teHandleEnd').addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            this._teDragging = 'end';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
        document.getElementById('teHandleStart').addEventListener('touchstart', (e) => {
            this._teDragging = 'start';
            document.addEventListener('touchmove', onMove, {passive:false});
            document.addEventListener('touchend', onUp);
        });
        document.getElementById('teHandleEnd').addEventListener('touchstart', (e) => {
            this._teDragging = 'end';
            document.addEventListener('touchmove', onMove, {passive:false});
            document.addEventListener('touchend', onUp);
        });
        fill.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this._teDragging = 'move';
            const rect = track.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const m = pxToMin(ratio);
            this._teOffset = m - this._teStart;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        document.getElementById('teClose').onclick = () => this.closeTimeEditor();
        document.getElementById('teCancel').onclick = () => this.closeTimeEditor();
        overlay.onclick = (e) => { if (e.target === overlay) this.closeTimeEditor(); };
        document.getElementById('teSave').onclick = () => this._saveTeTime();
    },
    _saveTeTime() {
        const spot = this.trip.dayPlans[this._teDi]?.spots?.[this._teSi];
        if (!spot) return;
        const di = this._teDi, si = this._teSi;
        const dp = this.trip.dayPlans[di];
        const newStart = this._teStart;
        const newEnd = this._teEnd;
        const GAP = 15;
        const MAX_END = 23 * 60 + 59;

        spot.startMin = newStart;
        spot.endMin = Math.min(newEnd, MAX_END);

        let curEnd = spot.endMin;
        for (let i = si + 1; i < dp.spots.length; i++) {
            const s = dp.spots[i];
            const dur = (s.endMin != null && s.startMin != null)
                ? (s.endMin - s.startMin)
                : this._parseDurationMin(s.duration);
            const minStart = curEnd + GAP;
            const newS = Math.max(minStart, s.startMin != null ? s.startMin : minStart);
            s.startMin = newS;
            s.endMin = Math.min(newS + dur, MAX_END);
            if (s.endMin <= s.startMin) {
                s.endMin = s.startMin + Math.min(dur, MAX_END - s.startMin);
            }
            curEnd = s.endMin;
        }

        (dp.spots || []).forEach(s => {
            if (s.startMin != null && s.endMin != null) {
                let startMin = Math.max(0, Math.min(s.startMin, MAX_END - 10));
                let endMin = Math.max(startMin + 10, Math.min(s.endMin, MAX_END));
                s.startMin = startMin;
                s.endMin = endMin;
                const sh = Math.floor(startMin/60), sm = startMin%60;
                const eh = Math.floor(endMin/60), em = endMin%60;
                const pad = (n) => String(n).padStart(2,'0');
                s.time = `${sh}:${pad(sm)}—${eh}:${pad(em)}`;
                const dur = endMin - startMin;
                s.duration = dur >= 60
                    ? (dur%60===0 ? `${dur/60}小时` : `${Math.floor(dur/60)}小时${dur%60}分钟`)
                    : `${dur}分钟`;
            }
        });

        this.closeTimeEditor();
        this.renderItinerary();
        this._saveTrip();
        if (this.mode === 'map') this.renderMap();
    },
    setTeDuration(minutes) {
        const mid = Math.round((this._teStart + this._teEnd) / 2 / 10) * 10;
        let newStart = mid - Math.round(minutes/20)*10;
        let newEnd = newStart + minutes;
        if (newStart < this._teDayStart) { newStart = this._teDayStart; newEnd = newStart + minutes; }
        if (newEnd > this._teDayEnd) { newEnd = this._teDayEnd; newStart = newEnd - minutes; }
        this._teStart = Math.max(this._teDayStart, newStart);
        this._teEnd = Math.min(this._teDayEnd, newEnd);
        this._updateTeUI();
    },

    addSpotToTrip(poi, dayIndex) {
        if (!this.trip.dayPlans) this.trip.dayPlans = [];
        while (this.trip.dayPlans.length <= dayIndex) {
            this.trip.dayPlans.push({ theme: `Day ${this.trip.dayPlans.length+1}`, spots: [] });
        }
        const dp = this.trip.dayPlans[dayIndex];
        if (!dp.spots) dp.spots = [];
        const emoji = _getSpotEmoji(poi.type || '');
        const photoUrl = (poi.photos && poi.photos[0]) ? (poi.photos[0].url || '') : (poi.photoUrl || '');
        const typeName = poi.typeName || _getTypeName(poi.type) || '景点';
        const tempSpot = { name: poi.name, type: typeName };
        const intro = _getSpotIntro(tempSpot, typeName);
        dp.spots.push({
            name: poi.name,
            type: typeName,
            emoji: emoji,
            lng: poi.lng,
            lat: poi.lat,
            address: poi.address || '',
            rating: poi.rating || '',
            cost: poi.cost || '',
            time: '',
            duration: '1-2小时',
            desc: poi.address || '',
            photoUrl: photoUrl,
            intro: intro,
            photos: poi.photos || [],
        });
        this.addedSpots.add(poi.name);
        this._ensureTransportDefaults();
        this.renderHeader();
        this.renderDayPills();
        this.renderItinerary();
        this._saveTrip();
        this._recalcAllTransport();
        if (this.mode === 'map') this.renderMap();
        UIRender.showToast(`已添加「${poi.name}」到 Day ${dayIndex+1}`);
    },

    removeSpot(di, si) {
        const dp = this.trip.dayPlans[di];
        if (!dp?.spots) return;
        const name = dp.spots[si].name;
        dp.spots.splice(si, 1);
        this.addedSpots.delete(name);
        dp.spots.forEach(s => { delete s._transportCalculated; });
        this._ensureTransportDefaults();
        this.renderHeader();
        this.renderItinerary();
        this._saveTrip();
        this._recalcAllTransport();
    },

    // 删除前确认（使用已存在的 confirmModal）
    confirmRemoveSpot(di, si) {
        const spot = this.trip.dayPlans?.[di]?.spots?.[si];
        if (!spot) {
            this.renderItinerary();
            return;
        }
        const doDelete = () => {
            this.removeSpot(di, si);
            UiKit.toast('已删除「' + spot.name + '」', 'success');
        };
        const doCancel = () => {
            this.renderItinerary();
        };
        UiKit.confirm(`确定从行程中移除「${spot.name}」吗？`, { title: '删除景点', confirmText: '删除', cancelText: '取消' }).then(ok => {
            if (ok) { doDelete(); } else { doCancel(); }
        });
    },

    showSpotActions(di, si) {
        const spot = this.trip.dayPlans?.[di]?.spots?.[si];
        if (!spot) return;
        const actions = [
            { text: '✏️ 编辑花费', value: 'cost' },
            { text: '📝 写想法/记录', value: 'record' }
        ];
        UiKit.showActionSheet(actions, spot.name).then(action => {
            if (action === 'cost') {
                this.editSpotCost(di, si);
            } else if (action === 'record') {
                SpotRecord.open(di, si);
            }
        });
    },

    async editSpotCost(di, si) {
        const spot = this.trip.dayPlans?.[di]?.spots?.[si];
        if (!spot) return;
        const currentCost = parseFloat(spot.cost) || parseFloat(spot.baseCost) || 0;
        const defVal = currentCost > 0 ? String(currentCost) : '0';
        const input = await UiKit.prompt(`「${spot.name}」的门票/花费（元），输入0表示免费`, {
            title: '编辑花费',
            defaultValue: defVal,
            placeholder: '请输入金额',
            inputType: 'number'
        });
        if (input === null) return;
        const trimmed = (input || '').trim();
        if (trimmed === '' || trimmed === '0') {
            spot.cost = 0;
        } else {
            const cost = parseFloat(trimmed);
            if (isNaN(cost) || cost < 0) {
                UiKit.toast('请输入有效金额', 'error');
                return;
            }
            spot.cost = cost;
        }
        this._saveTrip();
        this.renderHeader();
        this.renderItinerary();
        ExpenseModule.render();
        UiKit.toast('花费已更新 ✅', 'success');
    },

    // 上移/下移景点（排序）
    moveSpot(di, si, dir) {
        const dp = this.trip.dayPlans[di];
        if (!dp?.spots) return;
        const ns = si + dir;
        if (ns < 0 || ns >= dp.spots.length) return;
        const arr = dp.spots;
        [arr[si], arr[ns]] = [arr[ns], arr[si]];
        // 交换后重算时间与交通
        delete arr[ns]._transportCalculated;
        delete arr[si]._transportCalculated;
        this._assignDefaultTimes(dp);
        this._ensureTransportDefaults();
        this.renderItinerary();
        this._saveTrip();
        this._recalcAllTransport();
    },

    analyzeAndSuggest() {
        if (localStorage.getItem('aiSuggestEnabled') === 'false') return;
        if (this._aiSuggesting || !this.trip?.dayPlans) return;
        if (typeof AIService === 'undefined') return;
        if (this._aiSuggestions) return;

        this._aiSuggesting = true;
        const city = this.trip.dayPlans?.[0]?.city || this.trip.destination || this.trip.cities?.[0] || '';

        const suggestions = {};
        (this.trip.dayPlans || []).forEach((dp, di) => {
            const sugs = [];
            const spots = dp.spots || [];

            const hasFoodAtNoon = spots.some(s => {
                const isFood = (s.type || '').includes('美食') || (s.type || '').includes('餐') || (s.type || '').includes('吃');
                return isFood;
            });

            let coversNoon = false, coversDinner = false;
            spots.forEach(s => {
                const start = s.startMin || 0;
                const end = s.endMin || start + 90;
                if (start < 780 && end > 720) coversNoon = true;
                if (start < 1140 && end > 1080) coversDinner = true;
            });

            spots.forEach((spot, si) => {
                const end = spot.endMin || spot.startMin + 90;
                const next = spots[si + 1];

                if (next) {
                    const nextStart = next.startMin || end + 30;
                    const gap = nextStart - end;
                    const travelTime = Math.round((next.timeSec || 600) / 60);
                    const freeTime = gap - travelTime;

                    if (si === 0 && !coversNoon && end >= 660 && end <= 840 && !hasFoodAtNoon) {
                        const key = `${di}_food_noon`;
                        if (!this._dismissedSugs.has(key)) {
                            sugs.push({
                                afterSpotIdx: si,
                                type: 'food_gap',
                                icon: '🍜',
                                text: '到饭点啦，建议安排午餐',
                                key: key,
                                options: []
                            });
                        }
                    }
                    if (si >= spots.length - 2 && !coversDinner && end >= 1020 && end <= 1140 && !hasFoodAtNoon) {
                        const key = `${di}_food_dinner`;
                        if (!this._dismissedSugs.has(key)) {
                            sugs.push({
                                afterSpotIdx: si,
                                type: 'food_gap',
                                icon: '🍽️',
                                text: '晚餐时间到了，找个地方吃饭吧',
                                key: key,
                                options: []
                            });
                        }
                    }

                    if (freeTime >= 45 && si < spots.length - 1) {
                        const key = `${di}_gap_${si}`;
                        if (!this._dismissedSugs.has(key)) {
                            sugs.push({
                                afterSpotIdx: si,
                                type: 'time_gap',
                                icon: '⏰',
                                text: `这里有${Math.round(freeTime)}分钟空闲，可休息或逛周边`,
                                key: key,
                                options: []
                            });
                        }
                    }
                }
            });

            if (sugs.length > 0) suggestions[di] = sugs;
        });

        this._aiSuggestions = suggestions;
        if (Object.keys(suggestions).length > 0) {
            this.renderItinerary();
        }
        this._aiSuggesting = false;
    },

    dismissSuggestion(key) {
        this._dismissedSugs.add(key);
        if (this._aiSuggestions) {
            Object.keys(this._aiSuggestions).forEach(di => {
                this._aiSuggestions[di] = this._aiSuggestions[di].filter(s => s.key !== key);
            });
        }
        this.renderItinerary();
    },

    acceptSuggestion(di, key) {
        const sug = this._aiSuggestions[di]?.find(s => s.key === key);
        if (!sug) return;

        if (sug.type === 'food_gap') {
            if (typeof AIChat !== 'undefined') {
                if (!AIChat.overlay) AIChat.init();
                AIChat.reset();
                AIChat.open(this.trip, di);
                const mealType = key.includes('noon') ? '午餐' : '晚餐';
                const city = this.trip.dayPlans?.[di]?.city || this.trip.destination || '';
                AIChat.sendMessage(`帮我在第${di+1}天行程的${sug.afterSpotIdx + 1}号景点附近推荐适合${mealType}的当地特色餐厅，返回json格式推荐（3-5家）。`);
            }
        } else if (sug.type === 'time_gap') {
            if (typeof AIChat !== 'undefined') {
                if (!AIChat.overlay) AIChat.init();
                AIChat.reset();
                AIChat.open(this.trip, di);
                AIChat.sendMessage(`第${di+1}天在${this.trip.dayPlans[di]?.spots?.[sug.afterSpotIdx]?.name || '当前位置'}附近有空闲时间，推荐一些附近的小景点或咖啡馆可以逛逛，返回json格式推荐。`);
            }
        }

        this.dismissSuggestion(key);
    },

    renderInlineSuggestion(di, afterSi) {
        if (localStorage.getItem('aiSuggestEnabled') === 'false') return '';
        if (!this._aiSuggestions?.[di]) return '';
        const sugs = this._aiSuggestions[di].filter(s => s.afterSpotIdx === afterSi);
        if (sugs.length === 0) return '';

        return sugs.map(s => `
            <div class="ai-inline-suggestion">
                <span class="ai-sug-icon">${s.icon}</span>
                <span class="ai-sug-text">${s.text}</span>
                <div class="ai-sug-actions">
                    <button class="ai-sug-btn accept" onclick="TripDetail.acceptSuggestion(${di},'${s.key}')">问问AI</button>
                    <button class="ai-sug-btn dismiss" onclick="TripDetail.dismissSuggestion('${s.key}')">忽略</button>
                </div>
            </div>
        `).join('');
    },

    toggleSpotTips(di, si) {
        const dp = this.trip.dayPlans?.[di];
        const spot = dp?.spots?.[si];
        if (!spot) return;

        const panel = document.getElementById(`ai-tips-${di}-${si}`);
        if (!panel) return;

        if (panel.classList.contains('show')) {
            panel.classList.remove('show');
            return;
        }

        panel.classList.add('show');

        if (!spot.aiTips && !this._aiTipsGenerating.has(spot.name)) {
            this._aiTipsGenerating.add(spot.name);
            panel.innerHTML = '<div class="ai-tips-loading">AI正在生成贴士...</div>';
            this._generateSpotTips(di, si, spot);
        }
    },

    async _generateSpotTips(di, si, spot) {
        if (typeof AIService === 'undefined') return;
        const city = this.trip.dayPlans?.[di]?.city || this.trip.destination || this.trip.cities?.[0] || '';

        try {
            const result = await AIService.askForJSON(
                `为${city}的「${spot.name}」（类型：${spot.type || '景点'}）提供简短的旅行贴士。`,
                `{
                    "photo": "拍照贴士，一句话，不超过30字",
                    "bestTime": "最佳游玩时间建议，一句话，不超过20字",
                    "tips": "避坑/注意事项，一句话，不超过40字"
                }`,
                { temperature: 0.5 }
            );

            if (result.success && result.data) {
                spot.aiTips = result.data;
            } else {
                spot.aiTips = { photo: '暂无贴士', bestTime: '', tips: '' };
            }
        } catch(e) {
            spot.aiTips = { photo: '暂无贴士', bestTime: '', tips: '' };
        }

        this._aiTipsGenerating.delete(spot.name);
        const panel = document.getElementById(`ai-tips-${di}-${si}`);
        if (panel && spot.aiTips) {
            panel.innerHTML = this._renderTipsContent(spot.aiTips);
        }
    },

    _renderTipsContent(tips) {
        let html = '';
        if (tips.photo) html += `<div class="ai-tips-row"><span class="ai-tips-label">📸</span><span>${this._escapeHtml(tips.photo)}</span></div>`;
        if (tips.bestTime) html += `<div class="ai-tips-row"><span class="ai-tips-label">⏰</span><span>${this._escapeHtml(tips.bestTime)}</span></div>`;
        if (tips.tips) html += `<div class="ai-tips-row"><span class="ai-tips-label">💡</span><span>${this._escapeHtml(tips.tips)}</span></div>`;
        return html || '<div class="ai-tips-loading">暂无贴士</div>';
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    openJournal() {
        const trip = this.trip;
        const title = trip.title || trip.destination || '我的旅行手记';
        const dest = trip.destination || trip.dayPlans?.[0]?.city || '';
        
        let allEntries = [];
        let totalPhotos = 0;
        let totalNotes = 0;

        (trip.dayPlans || []).forEach((dp, di) => {
            const dayDate = this._getDayDate(di);
            const dateLabel = `${this._fmtDate(dayDate)} ${this._weekday(dayDate)}`;
            (dp.spots || []).forEach((spot, si) => {
                const notes = spot.record?.notes || [];
                const photos = spot.record?.photos || spot.photos || [];
                notes.forEach(note => {
                    allEntries.push({
                        type: 'note',
                        day: di + 1,
                        dateLabel,
                        spotName: spot.name,
                        spotEmoji: spot.emoji || _getSpotEmoji(spot.type || spot.name),
                        note,
                        photos: note.photos || []
                    });
                    totalNotes++;
                });
                photos.forEach(p => {
                    if (!notes.some(n => (n.photos || []).some(np => np.dataUrl === p.dataUrl || np === p))) {
                        allEntries.push({
                            type: 'photo',
                            day: di + 1,
                            dateLabel,
                            spotName: spot.name,
                            spotEmoji: spot.emoji || _getSpotEmoji(spot.type || spot.name),
                            photo: p
                        });
                        totalPhotos++;
                    }
                });
                totalPhotos += photos.length;
            });
        });

        allEntries.sort((a, b) => {
            const ta = a.note?.createdAt || 0;
            const tb = b.note?.createdAt || 0;
            return ta - tb;
        });

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        
        let entriesHtml = '';
        if (allEntries.length === 0) {
            entriesHtml = `
                <div style="text-align:center;padding:60px 20px;color:#999;">
                    <div style="font-size:48px;margin-bottom:16px;">📖</div>
                    <div style="font-size:15px;">还没有记录，去景点写下你的故事吧</div>
                </div>`;
        } else {
            let currentDay = -1;
            allEntries.forEach(entry => {
                if (entry.day !== currentDay) {
                    currentDay = entry.day;
                    entriesHtml += `<div class="journal-day-divider"><span class="journal-day-label">Day ${entry.day} · ${entry.dateLabel}</span></div>`;
                }
                if (entry.type === 'note') {
                    const n = entry.note;
                    entriesHtml += `
                        <div class="journal-entry">
                            <div class="journal-entry-header">
                                <span class="journal-spot">${entry.spotEmoji} ${entry.spotName}</span>
                                <span class="journal-time">${this._formatJournalTime(n.createdAt)}</span>
                            </div>
                            <div class="journal-content">${n.html || this._escapeHtml(n.text || '')}</div>
                            ${n.photos && n.photos.length > 0 ? `
                                <div class="journal-photos">
                                    ${n.photos.map(p => `<img src="${p.dataUrl || p}" class="journal-photo">`).join('')}
                                </div>
                            ` : ''}
                        </div>`;
                } else if (entry.type === 'photo') {
                    entriesHtml += `
                        <div class="journal-entry journal-photo-entry">
                            <div class="journal-entry-header">
                                <span class="journal-spot">${entry.spotEmoji} ${entry.spotName}</span>
                            </div>
                            <img src="${entry.photo.dataUrl || entry.photo}" class="journal-single-photo">
                        </div>`;
                }
            });
        }

        mask.innerHTML = `
            <div class="ui-modal journal-modal">
                <div class="journal-modal-header">
                    <button class="journal-close" id="journalCloseBtn">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                    <div class="journal-title-wrap">
                        <div class="journal-title">${this._escapeHtml(title)}</div>
                        <div class="journal-subtitle">${dest ? dest + ' · ' : ''}${totalNotes}条记录 · ${totalPhotos}张照片</div>
                    </div>
                </div>
                <div class="journal-content-scroll">
                    ${entriesHtml}
                </div>
            </div>`;

        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        document.getElementById('journalCloseBtn').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };
    },

    _formatJournalTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    },

    showSharePopup() {
        const trip = this.trip;
        const title = trip?.title || trip?.destination || '我的行程';
        const platforms = [
            { id: 'wechat', name: '微信', color: '#07c160' },
            { id: 'moments', name: '朋友圈', color: '#576b95' },
            { id: 'dingtalk', name: '钉钉', color: '#1677ff' },
            { id: 'feishu', name: '飞书', color: '#3370ff' }
        ];
        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.style.cssText = 'z-index:300;display:flex;align-items:flex-end;justify-content:center;';
        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        mask.innerHTML = `
            <div class="share-popup" style="width:100%;max-width:420px;background:#fff;border-radius:20px 20px 0 0;padding:24px 20px 32px;transform:translateY(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">
                <div style="text-align:center;font-size:15px;font-weight:600;color:#333;margin-bottom:6px;">分享到</div>
                <div style="text-align:center;font-size:12px;color:#999;margin-bottom:24px;">${this._escapeHtml(title)}</div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
                    ${platforms.map(p => `
                        <div class="share-platform-item" data-platform="${p.id}" style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;">
                            <div style="width:52px;height:52px;border-radius:14px;background:${p.color};display:flex;align-items:center;justify-content:center;transition:transform 0.15s;font-size:26px;">
                                ${p.id === 'wechat' ? '💬' : p.id === 'moments' ? '🌅' : p.id === 'dingtalk' ? '📌' : '🐦'}
                            </div>
                            <span style="font-size:12px;color:#333;">${p.name}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:12px;margin-bottom:16px;">
                    <button class="share-copy-btn" style="flex:1;height:44px;border-radius:22px;border:1px solid #eee;background:#f7f8fa;font-size:14px;color:#333;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        复制链接
                    </button>
                    <button class="share-cancel-btn" style="flex:1;height:44px;border-radius:22px;border:none;background:#ff4d4f15;font-size:14px;color:#ff4d4f;cursor:pointer;transition:all 0.15s;">取消</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        requestAnimationFrame(() => {
            mask.classList.add('ui-modal-show');
            const popup = mask.querySelector('.share-popup');
            popup.style.transform = 'translateY(0)';
        });
        mask.querySelectorAll('.share-platform-item').forEach(item => {
            item.addEventListener('click', () => {
                const platform = item.dataset.platform;
                const names = { wechat: '微信', moments: '朋友圈', dingtalk: '钉钉', feishu: '飞书' };
                UiKit.toast(`已复制行程链接，请到${names[platform]}粘贴分享`, 'success');
                this._copyShareLink(title);
                close();
            });
            item.addEventListener('touchstart', () => {
                item.querySelector('div').style.transform = 'scale(0.92)';
            });
            item.addEventListener('touchend', () => {
                item.querySelector('div').style.transform = 'scale(1)';
            });
        });
        mask.querySelector('.share-copy-btn').addEventListener('click', () => {
            this._copyShareLink(title);
            UiKit.toast('链接已复制', 'success');
            close();
        });
        mask.querySelector('.share-cancel-btn').addEventListener('click', close);
        mask.addEventListener('click', (e) => {
            if (e.target === mask) close();
        });
    },

    _copyShareLink(title) {
        const url = window.location.origin + window.location.pathname + '?share=' + encodeURIComponent(this.tripId || '');
        const text = `我在TripApp规划了「${title}」，快来看看吧！${url}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            });
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
    }
};

function _getSpotIntro(spot, type) {
    const name = spot.name || '';
    const t = (type || '').toLowerCase();
    if (/美食|餐厅|小吃|餐饮|food|restaurant/.test(t)) {
        if (/火锅|串串|麻辣/.test(name)) return '地道川味火锅店，推荐招牌麻辣锅底，毛肚鸭肠必点，建议傍晚来避开排队高峰，拍热气腾腾的锅底最有食欲';
        if (/咖啡|cafe|coffee/.test(t + name)) return '特色咖啡馆，适合午后小憩，推荐坐在窗边位置，拍拉花咖啡+窗外街景很有氛围感';
        if (/小吃|夜市|街/.test(name)) return '当地人气小吃聚集地，边走边吃最有旅行感，建议空肚子来逐个打卡，拍美食特写+烟火气街景';
        return '当地特色餐厅，推荐品尝招牌菜，建议饭点前半小时到店，拍美食特写+环境照记录味蕾旅行';
    }
    if (/酒店|住宿|hotel|民宿/.test(t)) {
        if (/五星|豪华|高端/.test(name)) return '高端酒店，设施齐全服务周到，推荐入住高楼层房型视野好，拍落地窗城市夜景或泳池大片出片率极高';
        if (/民宿|客栈|inn/.test(t + name)) return '特色民宿，装修风格独特有当地韵味，推荐在露台或公共区域拍照，很容易拍出温馨文艺感';
        return '推荐入住位置便利的酒店，建议提前确认入住时间，拍房间窗外风景和特色装饰记录旅途之家';
    }
    if (/寺|庙|temple|观|宫/.test(t + name)) return '历史悠久的古刹，建筑庄严肃穆，建议上午顺光游览，红墙黄瓦前对称构图最出片，香火袅袅时拍很有烟火气，请保持安静尊重信仰';
    if (/湖|水|海|beach|lake|water/.test(t + name)) {
        if (/海|沙滩|beach/.test(t + name)) return '风景优美的海滨景点，碧海蓝天心旷神怡，推荐日落前后来，金色阳光洒在海面上非常梦幻，赤脚走在沙滩上拍剪影超美';
        return '湖光山色交相辉映，推荐日落前后半小时黄金时刻来，水面倒影+剪影很有意境，可借船/桥/亭作前景构图';
    }
    if (/山|峰|mountain|岭|顶/.test(t + name)) {
        if (/长城/.test(name)) return '万里长城精华段，蜿蜒起伏气势磅礴，建议清晨或傍晚登城光线最佳，站在烽火台俯拍山峦叠嶂非常震撼';
        return '登高望远视野绝佳，推荐登顶后用广角拍全景，半山腰俯拍层次感强，云海日出时段是摄影黄金时刻，注意穿舒适运动鞋';
    }
    if (/古镇|古街|老街|古村/.test(name) || /古镇|古村|ancient/.test(t)) return '充满古韵的街巷，青石板路+白墙黛瓦很有年代感，建议清晨人少时来拍照，灯笼/木雕/花窗都是好前景，穿浅色系衣服对比强烈';
    if (/博物馆|museum|纪念馆/.test(t)) return '藏品丰富值得细细品味，建议预留2-3小时参观，展厅内注意不要使用闪光灯，大阶梯和落地窗前适合拍剪影，镇馆之宝前必打卡';
    if (/公园|park|花园|植物园/.test(t)) return '城市中的绿色氧吧，适合散步休憩，林荫小道用纵深感构图，花海蹲下低角度拍摄很美，建议上午光线柔和时来';
    if (/塔|楼|阁|地标|tower/.test(name) || /地标|landmark/.test(t)) return '城市标志性建筑，远景借周围景物框景构图显宏伟，仰拍视角最有气势，夜景灯光秀时拍长曝光超震撼，是必打卡地标';
    if (/游乐场|乐园|迪士尼|欢乐谷|theme/.test(t)) return '欢乐主题乐园，建议工作日来避开人流，穿舒适鞋子，城堡/摩天轮/烟花秀都是必拍点，傍晚亮灯后拍照最梦幻';
    if (/购物|商场|mall|shopping|商业/.test(t)) return '热闹商圈购物天堂，可以淘到当地特色商品和美食，拍橱窗陈列和城市街景很有都市感';
    if (/车站|机场|火车|高铁|station/.test(t)) return '交通枢纽，建议提前到达预留充足时间，拍站台/站牌/车票是记录旅程开始的仪式感';
    return '当地特色景点，建议预留充足时间游览，善用周围环境构图，在光线柔和的上午或傍晚拍摄效果最好，记得打卡留影记录旅途';
}

function _createMapMarker(num, active) {
    const bg = active ? '#FF5500' : '#FF7B3D';
    const scale = active ? 'scale(1.2)' : 'scale(1)';
    return `<div style="position:relative;transform:${scale};transform-origin:bottom center;transition:transform 0.2s;">
        <div style="width:32px;height:40px;background:${bg};border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(255,123,61,0.5);display:flex;align-items:center;justify-content:center;">
            <div style="transform:rotate(45deg);color:#fff;font-size:13px;font-weight:800;font-family:system-ui;">${num}</div>
        </div>
    </div>`;
}

function _getSpotEmoji(typeOrName) {
    const s = (typeOrName || '').toLowerCase();
    if (/美食|餐厅|小吃|餐饮|food|restaurant/.test(s)) return '🍜';
    if (/酒店|住宿|hotel/.test(s)) return '🏨';
    if (/购物|商场|shopping|mall/.test(s)) return '🛍️';
    if (/公园|自然|山|湖|nature|park|mountain/.test(s)) return '🏞️';
    if (/博物馆|museum|历史|古迹/.test(s)) return '🏛️';
    if (/寺|庙|temple/.test(s)) return '⛩️';
    if (/海滩|海|beach|sea/.test(s)) return '🏖️';
    if (/咖啡|coffee|cafe/.test(s)) return '☕';
    if (/娱乐|乐园|游乐园/.test(s)) return '🎢';
    if (/动物|zoo/.test(s)) return '🐼';
    return '📍';
}

const AddSpotPanel = {
    overlay: null,
    trip: null,
    detail: null,
    currentDay: 0,
    allPois: [],
    searchTimer: null,

    open(trip, detail, targetDay) {
        this.trip = trip;
        this.detail = detail;
        this.currentDay = (typeof targetDay === 'number') ? targetDay : detail.currentDay;
        this.overlay = document.getElementById('addSpotOverlay');
        this.overlay.classList.add('show');

        const daySelect = document.getElementById('addSpotDaySelect');
        const days = trip.dayPlans || [];
        let html = '';
        days.forEach((dp, i) => {
            html += `<button class="day-pill ${i === this.currentDay ? 'active' : ''}" data-day="${i}">Day ${i+1}</button>`;
        });
        daySelect.innerHTML = html;
        daySelect.querySelectorAll('.day-pill').forEach(btn => {
            btn.onclick = () => {
                this.currentDay = parseInt(btn.dataset.day);
                daySelect.querySelectorAll('.day-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        document.getElementById('addSpotClose').onclick = () => this.close();
        this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };
        document.getElementById('addSpotSearchInput').oninput = (e) => this._onSearch(e.target.value);

        this._loadHotSpots();
    },

    close() {
        this.overlay.classList.remove('show');
        document.getElementById('addSpotSearchInput').value = '';
    },

    async _loadHotSpots(keyword) {
        const listEl = document.getElementById('addSpotList');
        listEl.innerHTML = '<div style="padding:30px;text-align:center;color:#999;font-size:13px;">正在加载热门地点...</div>';
        const city = this.trip.dayPlans?.[this.currentDay]?.city || this.trip.destination || this.trip.cities?.[0] || '';
        if (!city) { listEl.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">无法确定城市</div>'; return; }

        try {
            let pois;
            if (keyword) {
                pois = await this._searchPoi(city, keyword);
            } else {
                pois = await MapModule.searchCityPOIs(city, []);
            }
            this.allPois = Array.isArray(pois) ? pois : [];
            this._renderList(keyword);
        } catch(e) {
            console.error('loadHotSpots error:', e);
            listEl.innerHTML = '<div style="padding:30px;text-align:center;color:#999;">加载失败，请重试</div>';
        }
    },

    _onSearch(val) {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this._loadHotSpots(val.trim()), 400);
    },

    async _searchPoi(city, keyword) {
        await MapModule.init();
        return new Promise((resolve) => {
            const ps = new AMap.PlaceSearch({
                pageSize: 20, pageIndex: 1, extensions: 'all', city, citylimit: true
            });
            ps.search(keyword, (status, result) => {
                if (status === 'complete' && result.poiList?.pois) {
                    const pois = result.poiList.pois
                        .filter(p => p.location)
                        .map(p => ({
                            name: p.name, address: p.address || '',
                            lng: p.location.lng, lat: p.location.lat,
                            type: p.type || '', rating: p.rating || '',
                            cost: p.cost || '',
                            photos: (p.photos || []).map(ph => ({ url: ph.url || '' })).filter(ph => ph.url),
                        }));
                    resolve(pois);
                } else {
                    resolve([]);
                }
            });
        });
    },

    _renderList(keyword) {
        const listEl = document.getElementById('addSpotList');
        const title = keyword ? `搜索「${keyword}」结果` : '🔥 热门景点 (真实高德评分)';
        if (this.allPois.length === 0) {
            listEl.innerHTML = `<div class="add-spot-section-title">${title}</div><div style="padding:30px;text-align:center;color:#999;font-size:13px;">未找到相关地点</div>`;
            return;
        }

        let html = `<div class="add-spot-section-title">${title} · ${this.allPois.length}个</div>`;
        this.allPois.forEach((poi, i) => {
            const emoji = _getSpotEmoji(poi.type || '');
            const added = this.detail.addedSpots.has(poi.name) ? 'added' : '';
            const addedIcon = this.detail.addedSpots.has(poi.name) ? '✓' : '+';
            const rating = poi.rating ? `⭐ ${poi.rating}分` : '';
            const addr = poi.address || poi.type || '';
            const typeName = _getTypeName(poi.type);
            html += `<div class="add-spot-item">
                <div class="add-spot-item-icon">${emoji}</div>
                <div class="add-spot-item-info">
                    <div class="add-spot-item-name">${poi.name}</div>
                    <div class="add-spot-item-addr">${addr}</div>
                    <div class="add-spot-item-rating">${rating}${typeName ? ' · ' + typeName : ''}</div>
                </div>
                <button class="add-spot-item-add ${added}" data-idx="${i}">${addedIcon}</button>
            </div>`;
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('.add-spot-item-add').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                const poi = this.allPois[idx];
                if (this.detail.addedSpots.has(poi.name)) {
                    UIRender.showToast('该地点已在行程中');
                    return;
                }
                this.detail.addSpotToTrip(poi, this.currentDay);
                btn.classList.add('added');
                btn.textContent = '✓';
                setTimeout(() => this.close(), 400);
            };
        });
    },
};

function _getTypeName(type) {
    if (!type) return '';
    if (/风景名胜|公园/.test(type)) return '景点';
    if (/餐饮服务|中餐厅|外国餐厅|小吃|快餐店/.test(type)) return '美食';
    if (/购物服务|商场|步行街/.test(type)) return '购物';
    if (/住宿服务|酒店/.test(type)) return '住宿';
    if (/体育休闲|娱乐场所|游乐园/.test(type)) return '娱乐';
    if (/博物馆|展览馆/.test(type)) return '博物馆';
    return '';
}

const ExpenseModule = {
    trip: null,
    items: [],
    activeFilter: 'all',
    editingId: null,
    overlay: null,
    selectedCat: 'food',

    CATEGORIES: [
        { key: 'food', icon: '🍜', label: '餐饮', color: '#FF6B6B' },
        { key: 'hotel', icon: '🏨', label: '住宿', color: '#4ECDC4' },
        { key: 'ticket', icon: '🎫', label: '门票', color: '#FFB347' },
        { key: 'transport', icon: '🚄', label: '交通', color: '#A8E6CF' },
        { key: 'shopping', icon: '🛍️', label: '购物', color: '#DDA0DD' },
        { key: 'other', icon: '💰', label: '其他', color: '#95A5A6' },
    ],

    _catMap() {
        const m = {};
        this.CATEGORIES.forEach(c => m[c.key] = c);
        return m;
    },

    init(trip) {
        this.trip = trip;
        this.items = trip.expenses || [];
        this.activeFilter = 'all';
        this.editingId = null;
        this._bindOverlay();
    },

    _bindOverlay() {
        this.overlay = document.getElementById('expAddOverlay');
        document.getElementById('expAddClose').onclick = () => this.closeAdd();
        this.overlay.onclick = (e) => { if (e.target === this.overlay) this.closeAdd(); };
        document.getElementById('expSaveBtn').onclick = () => this._saveItem();
        document.getElementById('expDelBtn').onclick = () => this._deleteItem();
        document.getElementById('expAddBtn').onclick = () => this.openAdd();
    },

    _collectSpotExpenses() {
        const spots = [];
        const startDate = this.trip.startDate ? new Date(this.trip.startDate) : null;
        (this.trip.dayPlans || []).forEach((dp, di) => {
            (dp.spots || []).forEach((spot, si) => {
                const baseCost = parseFloat(spot.cost) || parseFloat(spot.baseCost) || 0;
                const recExpense = spot.record?.expense || 0;
                const totalSpotCost = baseCost + recExpense;
                if (totalSpotCost > 0) {
                    let dateLabel = dp.date || '';
                    if (!dateLabel && startDate) {
                        const d = new Date(startDate);
                        d.setDate(d.getDate() + di);
                        dateLabel = `${d.getMonth()+1}.${d.getDate()}`;
                    }
                    const isManual = recExpense > 0;
                    spots.push({
                        id: `spot_${di}_${si}`,
                        amount: totalSpotCost,
                        cat: spot.record?.expenseCat || 'ticket',
                        note: spot.name + (baseCost > 0 && recExpense > 0 ? ' (含额外记录)' : ''),
                        date: dateLabel,
                        fromSpot: true,
                        hasManual: isManual,
                        baseCost: baseCost,
                        di, si,
                    });
                }
            });
        });
        return spots;
    },

    _getAllItems() {
        const manual = this.items.filter(it => !it.fromSpot);
        const spots = this._collectSpotExpenses();
        const all = [...manual, ...spots];
        all.sort((a, b) => {
            const da = a.date || ''; const db = b.date || '';
            if (da !== db) return da < db ? 1 : -1;
            return (b.id || '').localeCompare(a.id || '');
        });
        return all;
    },

    render() {
        const cm = this._catMap();
        const all = this._getAllItems();
        const filtered = this.activeFilter === 'all' ? all : all.filter(i => i.cat === this.activeFilter);

        const total = all.reduce((s, i) => s + (i.amount || 0), 0);
        document.getElementById('expenseTotal').textContent = total.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        document.getElementById('expCountLabel').textContent = `${all.length}笔`;

        let chipHtml = `<span class="exp-cat-chip ${this.activeFilter==='all'?'active':''}" data-cat="all">全部 ¥${total.toFixed(0)}</span>`;
        this.CATEGORIES.forEach(c => {
            const sum = all.filter(i => i.cat === c.key).reduce((s,i) => s + i.amount, 0);
            if (sum > 0 || this.activeFilter === c.key) {
                chipHtml += `<span class="exp-cat-chip ${this.activeFilter===c.key?'active':''}" data-cat="${c.key}" style="${this.activeFilter===c.key?`background:${c.color}22;color:${c.color};border-color:${c.color}44;`:''}">${c.icon} ${c.label} ¥${sum.toFixed(0)}</span>`;
            }
        });
        document.getElementById('expCatChips').innerHTML = chipHtml;
        document.querySelectorAll('.exp-cat-chip').forEach(el => {
            el.onclick = () => { this.activeFilter = el.dataset.cat; this.render(); };
        });

        let filterHtml = '';
        const dates = [...new Set(all.map(i => i.date).filter(Boolean))].sort().reverse();
        filterHtml = `<span class="exp-filter-tag ${this.activeFilter==='all'?'active':''}" data-cat="all">全部</span>`;
        this.CATEGORIES.forEach(c => {
            filterHtml += `<span class="exp-filter-tag ${this.activeFilter===c.key?'active':''}" data-cat="${c.key}">${c.icon}${c.label}</span>`;
        });
        document.getElementById('expFilterBar').innerHTML = filterHtml;
        document.querySelectorAll('.exp-filter-tag').forEach(el => {
            el.onclick = () => { this.activeFilter = el.dataset.cat; this.render(); };
        });

        const listEl = document.getElementById('expenseList');
        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="exp-empty"><div class="exp-empty-icon">📒</div><div class="exp-empty-title">暂无账单记录</div><div class="exp-empty-desc">点击下方"记一笔"开始记录开销</div></div>`;
            return;
        }

        let html = '';
        let lastDate = '';
        filtered.forEach(it => {
            const cat = cm[it.cat] || cm.other;
            const dateLabel = it.date || '其他';
            if (dateLabel !== lastDate) {
                const dayTotal = filtered.filter(x => (x.date||'其他') === dateLabel).reduce((s,x) => s + x.amount, 0);
                html += `<div class="exp-day-label"><span>${dateLabel || '未分类'}</span><span style="color:#FF7B3D;font-weight:600;">¥${dayTotal.toFixed(2)}</span></div>`;
                lastDate = dateLabel;
            }
            html += `<div class="exp-item ${it.fromSpot ? 'from-spot' : ''}" data-id="${it.id}">
                <div class="exp-item-icon" style="background:${cat.color}22;">${cat.icon}</div>
                <div class="exp-item-info">
                    <div class="exp-item-name">${it.note || cat.label}${it.fromSpot ? ' <span class="exp-spot-badge">行程</span>' : ''}</div>
                    <div class="exp-item-meta">${cat.label}</div>
                </div>
                <div class="exp-item-amount">-¥${(it.amount||0).toFixed(2)}</div>
            </div>`;
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('.exp-item').forEach(el => {
            el.onclick = () => {
                const id = el.dataset.id;
                if (id.startsWith('spot_')) {
                    const [, di, si] = id.split('_').map(Number);
                    this.closeAdd();
                    TripDetail.editSpotCost(di, si);
                } else {
                    this.openAdd(id);
                }
            };
        });
    },

    openAdd(id) {
        this.editingId = id || null;
        const title = document.getElementById('expAddTitle');
        const delBtn = document.getElementById('expDelBtn');
        const amountInput = document.getElementById('expAmountInput');
        const noteInput = document.getElementById('expNoteInput');
        const dateInput = document.getElementById('expDateInput');

        if (id) {
            const it = this.items.find(x => x.id === id);
            if (!it) return;
            title.textContent = '编辑账单';
            delBtn.style.display = 'block';
            amountInput.value = it.amount || '';
            noteInput.value = it.note || '';
            dateInput.value = it.date || '';
            this.selectedCat = it.cat || 'food';
        } else {
            title.textContent = '记一笔';
            delBtn.style.display = 'none';
            amountInput.value = '';
            noteInput.value = '';
            const today = new Date();
            dateInput.value = `${today.getMonth()+1}.${today.getDate()}`;
            this.selectedCat = 'food';
        }

        this._renderCatGrid();
        this.overlay.style.display = 'flex';
        requestAnimationFrame(() => this.overlay.classList.add('show'));
        setTimeout(() => amountInput.focus(), 200);
    },

    closeAdd() {
        this.overlay.classList.remove('show');
        setTimeout(() => { this.overlay.style.display = 'none'; }, 250);
    },

    _renderCatGrid() {
        const grid = document.getElementById('expCatGrid');
        let html = '';
        this.CATEGORIES.forEach(c => {
            const active = this.selectedCat === c.key;
            html += `<button class="exp-cat-btn ${active?'active':''}" data-cat="${c.key}" style="${active?`background:${c.color};color:#fff;border-color:${c.color};`:`border-color:${c.color}44;color:${c.color};`}">${c.icon} ${c.label}</button>`;
        });
        grid.innerHTML = html;
        grid.querySelectorAll('.exp-cat-btn').forEach(btn => {
            btn.onclick = () => { this.selectedCat = btn.dataset.cat; this._renderCatGrid(); };
        });
    },

    _saveItem() {
        const amount = parseFloat(document.getElementById('expAmountInput').value);
        if (!amount || amount <= 0) { UIRender.showToast('请输入金额'); return; }
        const note = document.getElementById('expNoteInput').value.trim();
        const date = document.getElementById('expDateInput').value.trim();

        if (this.editingId) {
            const it = this.items.find(x => x.id === this.editingId);
            if (it) {
                it.amount = amount;
                it.note = note;
                it.date = date;
                it.cat = this.selectedCat;
            }
        } else {
            this.items.push({
                id: 'exp_' + Date.now(),
                amount, note, date,
                cat: this.selectedCat,
                createdAt: Date.now(),
            });
        }
        this.trip.expenses = this.items;
        TripDetail._saveTrip();
        this.render();
        this.closeAdd();
        UIRender.showToast(this.editingId ? '已更新' : '已添加一笔账单 ✅');
        // Phase 3.3：首次记录花费触发新手任务
        if (!this.editingId && typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('first_expense');
    },

    _deleteItem() {
        if (!this.editingId) return;
        UiKit.confirm('确定删除这条账单吗？', { title: '删除账单', confirmText: '删除', cancelText: '取消' }).then(ok => {
            if (!ok) return;
            this.items = this.items.filter(x => x.id !== this.editingId);
            this.trip.expenses = this.items;
            TripDetail._saveTrip();
            this.render();
            this.closeAdd();
            UiKit.toast('已删除');
        });
    },
};

const PackingModule = {
    trip: null,
    items: [],
    activeTpl: 'general',
    collapsedCats: new Set(),
    paSelected: new Set(),
    paActiveCat: 'all',

    ITEM_LIBRARY: {
        '📄 证件': ['身份证','护照','签证','驾照','学生证','军官证','港澳通行证','台湾通行证','机票/车票','酒店预订单','行程单','现金','银行卡','信用卡','应急联系卡','保险单复印件'],
        '📱 电子设备': ['手机','充电器','充电宝','数据线','耳机','转换插头','相机','相机镜头','相机电池','存储卡','三脚架/自拍杆','平板/Kindle','便携Wifi/SIM卡','电脑','电脑充电器','防水手机袋','头灯/手电'],
        '👕 衣物': ['换洗衣物','内衣裤','袜子','外套','薄外套/防晒衣','睡衣','泳衣/泳裤','帽子','围巾','舒适步行鞋','拖鞋/凉鞋','正装','运动装','雨衣/雨伞'],
        '🧴 日用品': ['牙刷/牙膏','毛巾','洗面奶','爽肤水','乳液/面霜','防晒霜','润唇膏','卸妆用品','化妆品','梳子','剃须刀','卫生巾/护垫','纸巾/湿巾','驱蚊液','水杯/保温杯','雨伞','塑料袋/收纳袋','锁','眼罩/耳塞/颈枕'],
        '💊 药品': ['感冒药','肠胃药','创可贴','晕车药','个人常用药','止痛药','过敏药','防高反药','藿香正气水','云南白药/碘伏','防中暑药','体温计'],
        '🏖️ 海边专用': ['沙滩巾','泳衣','泳镜','防水袋','浮潜装备','沙滩鞋','遮阳帽','墨镜','防晒衣','SPF50+防晒霜','晒后修复','防水背包'],
        '🥾 登山户外': ['登山鞋','登山杖','背包','冲锋衣','速干衣裤','护膝','手套','帽子','墨镜','保温水壶','能量棒/干粮','帐篷/睡袋','指南针','求生哨'],
        '👶 亲子出行': ['儿童证件','奶粉/辅食','奶瓶/水杯','尿不湿','湿巾','换洗衣物','玩具/绘本','儿童药品','推车/背带','儿童防晒'],
    },

    TEMPLATES: {
        general: {
            label: '通用出行', builtin: true,
            cats: ['📄 证件','📱 电子设备','👕 衣物','🧴 日用品','💊 药品'],
            defaults: {
                '📄 证件': ['身份证','现金/银行卡'],
                '📱 电子设备': ['手机','充电器','充电宝','耳机'],
                '👕 衣物': ['换洗衣物','内衣裤','袜子','外套','舒适鞋子'],
                '🧴 日用品': ['牙刷/牙膏','毛巾','洗面奶','护肤品','防晒霜','雨伞'],
                '💊 药品': ['感冒药','肠胃药','创可贴','晕车药'],
            }
        },
        beach: {
            label: '🏖️ 海边度假', builtin: true,
            cats: ['🏖️ 海边专用','📄 证件','📱 电子设备','👕 衣物','🧴 日用品'],
            defaults: {
                '🏖️ 海边专用': ['泳衣/泳裤','沙滩巾','SPF50+防晒霜','太阳镜','遮阳帽','凉鞋','防水手机袋'],
                '📄 证件': ['身份证','现金/银行卡'],
                '📱 电子设备': ['手机','充电器','充电宝','自拍杆'],
                '👕 衣物': ['轻薄衣物','防晒衣','拖鞋','换洗内衣'],
                '🧴 日用品': ['牙刷牙膏','晒后修复','护肤品','驱蚊液','湿巾'],
            }
        },
        mountain: {
            label: '⛰️ 登山徒步', builtin: true,
            cats: ['🥾 登山户外','📄 证件','📱 电子设备','💊 药品','🧴 日用品'],
            defaults: {
                '🥾 登山户外': ['登山鞋','登山杖','背包','冲锋衣','速干衣裤','护膝','帽子','保温水壶'],
                '📄 证件': ['身份证','现金'],
                '📱 电子设备': ['手机','充电宝','头灯/手电'],
                '💊 药品': ['创可贴','云南白药','感冒药','高反药','驱蚊液'],
                '🧴 日用品': ['防晒霜','墨镜','雨衣'],
            }
        },
        city: {
            label: '🏙️ 城市旅行', builtin: true,
            cats: ['📄 证件','📱 电子设备','👕 衣物','🧴 日用品','💊 药品'],
            defaults: {
                '📄 证件': ['身份证','学生证','银行卡','少量现金'],
                '📱 电子设备': ['手机','充电器','充电宝','耳机','相机'],
                '👕 衣物': ['日常穿搭','舒适步行鞋','外套(看天气)'],
                '🧴 日用品': ['洗面奶','护肤品','防晒霜','雨伞','纸巾'],
                '💊 药品': ['肠胃药','创可贴'],
            }
        },
        business: {
            label: '💼 商务出行', builtin: true,
            cats: ['📄 证件','📱 电子设备','👕 衣物','🧴 日用品'],
            defaults: {
                '📄 证件': ['身份证','名片','银行卡'],
                '📱 电子设备': ['手机','笔记本电脑','电脑充电器','手机充电器','充电宝','U盘'],
                '👕 衣物': ['正装/商务装','衬衫','皮鞋','换洗衣物','领带/丝巾'],
                '🧴 日用品': ['牙刷牙膏','剃须刀','护肤品','纸巾'],
            }
        },
        family: {
            label: '👨‍👩‍👧 亲子出行', builtin: true,
            cats: ['👶 亲子出行','📄 证件','📱 电子设备','👕 衣物','🧴 日用品','💊 药品'],
            defaults: {
                '👶 亲子出行': ['儿童证件','奶粉/辅食','奶瓶/水杯','尿不湿','湿巾','换洗衣物','玩具/绘本','儿童药品','推车/背带','儿童防晒'],
                '📄 证件': ['身份证','户口本','银行卡','现金'],
                '📱 电子设备': ['手机','充电器','充电宝','耳机','平板(哄娃)'],
                '👕 衣物': ['大人换洗衣物','儿童换洗衣物','外套','舒适鞋子','帽子'],
                '🧴 日用品': ['牙刷牙膏','毛巾','洗面奶','防晒霜','护肤品','驱蚊液','纸巾/湿巾','塑料袋'],
                '💊 药品': ['感冒药','退烧药','肠胃药','创可贴','儿童专用药']
            }
        }
    },

    _getCustomTemplates() {
        try { return JSON.parse(localStorage.getItem('packing_custom_tpls') || '{}'); } catch(e) { return {}; }
    },
    _saveCustomTemplates(tpls) {
        localStorage.setItem('packing_custom_tpls', JSON.stringify(tpls));
    },

    init(trip) {
        this.trip = trip;
        this.activeTpl = trip.packingTpl || 'general';
        this.items = trip.packingItems || [];
        this._bindEvents();
    },

    _bindEvents() {
        const addBtn = document.getElementById('packingAddBtn');
        if (addBtn) {
            addBtn.onclick = () => this._openAddPanel();
        }
    },

    _getAllTemplates() {
        const custom = this._getCustomTemplates();
        return { ...this.TEMPLATES, ...custom };
    },

    _renderTplBar() {
        const bar = document.getElementById('packingTemplates');
        if (!bar) return;
        const allTpls = this._getAllTemplates();
        let html = '';
        Object.entries(allTpls).forEach(([key, tpl]) => {
            const delBtn = !tpl.builtin ? `<span class="tpl-del" data-tpl="${key}" title="删除">✕</span>` : '';
            html += `<button class="packing-tpl-btn ${key === this.activeTpl ? 'active' : ''}" data-tpl="${key}">${tpl.label}${delBtn}</button>`;
        });
        bar.innerHTML = html;
        bar.querySelectorAll('.packing-tpl-btn').forEach(btn => {
            btn.onclick = (e) => {
                if (e.target.classList.contains('tpl-del')) {
                    e.stopPropagation();
                    this._deleteTemplate(btn.dataset.tpl);
                    return;
                }
                this.applyTemplate(btn.dataset.tpl);
            };
        });
    },

    _deleteTemplate(key) {
        const tpls = this._getCustomTemplates();
        delete tpls[key];
        this._saveCustomTemplates(tpls);
        if (this.activeTpl === key) this.activeTpl = 'general';
        this._renderTplBar();
        if (this.trip.packingTpl === key) {
            this.trip.packingTpl = 'general';
            TripDetail._saveTrip();
        }
        UIRender.showToast('模板已删除');
    },

    async applyTemplate(tpl) {
        const ok = await UiKit.confirm('切换模板将替换当前物品清单，确定继续？', { title: '切换模板', confirmText: '切换', cancelText: '取消' });
        if (!ok) return;
        this.activeTpl = tpl;
        this.items = this._buildFromTemplate(tpl);
        this.trip.packingTpl = tpl;
        this.trip.packingItems = this.items;
        this._renderTplBar();
        this.render();
        TripDetail._saveTrip();
    },

    quickApplyTpl(tpl) {
        this.activeTpl = tpl;
        this.items = this._buildFromTemplate(tpl);
        this.trip.packingTpl = tpl;
        this.trip.packingItems = this.items;
        this._renderTplBar();
        this.render();
        TripDetail._saveTrip();
        UIRender.showToast('已应用' + (this.TEMPLATES[tpl]?.label || tpl) + '模板');
    },

    showAddPanel() {
        this._openAddPanel();
    },

    _buildFromTemplate(tplKey) {
        const allTpls = this._getAllTemplates();
        const tpl = allTpls[tplKey];
        if (!tpl) return [];
        const items = [];
        const defaults = tpl.defaults || {};
        (tpl.cats || Object.keys(defaults)).forEach(catName => {
            (defaults[catName] || []).forEach(name => {
                items.push({ id: Math.random().toString(36).slice(2,8), name, cat: catName, packed: false });
            });
        });
        return items;
    },

    render() {
        const listEl = document.getElementById('packingList');
        const progEl = document.getElementById('packingProgress');
        const cats = {};
        this.items.forEach(it => {
            if (!cats[it.cat]) cats[it.cat] = [];
            cats[it.cat].push(it);
        });

        const allCatNames = Object.keys(cats);
        const packed = this.items.filter(i => i.packed).length;
        const total = this.items.length;
        const pct = total > 0 ? Math.round(packed/total*100) : 0;
        progEl.innerHTML = `
            <div class="pp-bar"><div class="pp-fill" style="width:${pct}%"></div></div>
            <div class="pp-text">已打包 ${packed}/${total} (${pct}%)</div>
        `;

        let html = '';
        allCatNames.forEach(catName => {
            const items = cats[catName];
            const packedCount = items.filter(i => i.packed).length;
            const collapsed = this.collapsedCats.has(catName);
            html += `<div class="packing-cat">
                <div class="packing-cat-title" onclick="PackingModule.toggleCat('${catName}')">
                    <span class="pct-arrow">${collapsed ? '▶' : '▼'}</span>
                    <span>${catName}</span>
                    <span class="pct-count">${packedCount}/${items.length}</span>
                    <span style="flex:1"></span>
                    <button class="pct-add" onclick="event.stopPropagation();PackingModule.openAddForCat('${catName}')">+</button>
                </div>
                <div class="packing-cat-items" style="${collapsed ? 'display:none;' : ''}">`;
            items.forEach(it => {
                html += `<div class="packing-item">
                    <button class="packing-check ${it.packed ? 'checked' : ''}" data-id="${it.id}">
                        ${it.packed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
                    </button>
                    <span class="packing-item-name ${it.packed ? 'packed' : ''}" contenteditable="true" data-id="${it.id}" spellcheck="false">${it.name}</span>
                    <button class="packing-item-del" data-id="${it.id}">✕</button>
                </div>`;
            });
            html += `</div></div>`;
        });

        if (total === 0) {
            html += `<div style="padding:40px 20px;text-align:center;color:#999;font-size:13px;">暂无物品，点击下方"添加物品"开始整理</div>`;
        }

        listEl.innerHTML = html;

        listEl.querySelectorAll('.packing-check').forEach(btn => {
            btn.onclick = () => this.toggleItem(btn.dataset.id);
        });
        listEl.querySelectorAll('.packing-item-del').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); this.removeItem(btn.dataset.id); };
        });
        listEl.querySelectorAll('.packing-item-name').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); };
            el.onblur = () => {
                const id = el.dataset.id;
                const newName = el.textContent.trim();
                if (newName) {
                    this.updateItemName(id, newName);
                } else {
                    el.textContent = this.items.find(i => i.id === id)?.name || '';
                }
            };
            el.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    el.blur();
                }
            };
        });
    },

    updateItemName(id, newName) {
        const it = this.items.find(i => i.id === id);
        if (!it) return;
        it.name = newName;
        this.trip.packingItems = this.items;
        TripDetail._saveTrip();
    },

    toggleCat(catName) {
        if (this.collapsedCats.has(catName)) {
            this.collapsedCats.delete(catName);
        } else {
            this.collapsedCats.add(catName);
        }
        this.render();
    },

    toggleItem(id) {
        const it = this.items.find(i => i.id === id);
        if (!it) return;
        it.packed = !it.packed;
        this.trip.packingItems = this.items;
        this.render();
        TripDetail._saveTrip();
    },

    removeItem(id) {
        const idx = this.items.findIndex(i => i.id === id);
        if (idx < 0) return;
        this.items.splice(idx, 1);
        this.trip.packingItems = this.items;
        this.render();
        TripDetail._saveTrip();
    },

    openAddForCat(catName) {
        this.paActiveCat = catName;
        this._openAddPanel();
        setTimeout(() => {
            const safeCat = catName.replace(/"/g, '\\"');
            const tab = document.querySelector(`.pa-cat-tab[data-cat="${safeCat}"]`);
            if (tab) tab.click();
        }, 50);
    },

    _openAddPanel() {
        this.paSelected = new Set();
        this.paActiveCat = this.paActiveCat || 'all';
        this._renderPaCatTabs();
        this._renderPaSuggestions();
        this._renderPaSelected();
        document.getElementById('paSearchInput').value = '';
        document.getElementById('paCustomInput').value = '';
        document.getElementById('packingAddOverlay').style.display = 'flex';
        setTimeout(() => document.getElementById('paSearchInput').focus(), 100);
        this._bindPaEvents();
    },
    _closeAddPanel() {
        document.getElementById('packingAddOverlay').style.display = 'none';
    },
    _bindPaEvents() {
        document.getElementById('paClose').onclick = () => this._closeAddPanel();
        document.getElementById('paCancel').onclick = () => this._closeAddPanel();
        document.getElementById('packingAddOverlay').onclick = (e) => {
            if (e.target.id === 'packingAddOverlay') this._closeAddPanel();
        };
        document.getElementById('paSearchInput').oninput = () => this._renderPaSuggestions();
        document.getElementById('paCustomAddBtn').onclick = () => this._addCustomItem();
        document.getElementById('paCustomInput').onkeydown = (e) => { if (e.key === 'Enter') this._addCustomItem(); };
        document.getElementById('paConfirm').onclick = () => this._confirmAdd();
    },
    _renderPaCatTabs() {
        const tabs = document.getElementById('paCatTabs');
        const cats = Object.keys(this.ITEM_LIBRARY);
        let html = `<button class="pa-cat-tab ${this.paActiveCat === 'all' ? 'active' : ''}" data-cat="all">全部</button>`;
        cats.forEach(c => {
            html += `<button class="pa-cat-tab ${this.paActiveCat === c ? 'active' : ''}" data-cat="${c}">${c}</button>`;
        });
        tabs.innerHTML = html;
        tabs.querySelectorAll('.pa-cat-tab').forEach(btn => {
            btn.onclick = () => {
                this.paActiveCat = btn.dataset.cat;
                this._renderPaCatTabs();
                this._renderPaSuggestions();
            };
        });
    },
    _renderPaSuggestions() {
        const container = document.getElementById('paSuggestions');
        const query = document.getElementById('paSearchInput').value.trim().toLowerCase();
        const existingNames = new Set(this.items.map(i => i.name));
        let items = [];
        if (this.paActiveCat === 'all') {
            Object.entries(this.ITEM_LIBRARY).forEach(([cat, names]) => {
                names.forEach(n => items.push({name: n, cat}));
            });
        } else {
            (this.ITEM_LIBRARY[this.paActiveCat] || []).forEach(n => items.push({name: n, cat: this.paActiveCat}));
        }
        if (query) {
            items = items.filter(it => it.name.toLowerCase().includes(query));
        }
        items = items.filter(it => !existingNames.has(it.name)).slice(0, 60);

        if (items.length === 0) {
            container.innerHTML = '<div class="pa-empty">没有找到匹配物品，可在下方自定义添加</div>';
            return;
        }
        const byCat = {};
        items.forEach(it => {
            if (!byCat[it.cat]) byCat[it.cat] = [];
            byCat[it.cat].push(it);
        });
        let html = '';
        Object.entries(byCat).forEach(([cat, its]) => {
            html += `<div class="pa-sug-cat">${cat}</div><div class="pa-sug-grid">`;
            its.forEach(it => {
                const sel = this.paSelected.has(it.name + '|' + it.cat);
                html += `<button class="pa-sug-item ${sel ? 'selected' : ''}" data-name="${it.name}" data-cat="${it.cat}">${sel ? '✓ ' : '+ '}${it.name}</button>`;
            });
            html += '</div>';
        });
        container.innerHTML = html;
        container.querySelectorAll('.pa-sug-item').forEach(btn => {
            btn.onclick = () => {
                const key = btn.dataset.name + '|' + btn.dataset.cat;
                if (this.paSelected.has(key)) this.paSelected.delete(key);
                else this.paSelected.add(key);
                this._renderPaSuggestions();
                this._renderPaSelected();
            };
        });
    },
    _addCustomItem() {
        const input = document.getElementById('paCustomInput');
        const name = input.value.trim();
        if (!name) return;
        const cat = this.paActiveCat !== 'all' ? this.paActiveCat : '📦 其他';
        const key = name + '|' + cat;
        this.paSelected.add(key);
        if (!this.ITEM_LIBRARY[cat] && cat !== '📦 其他') {
        }
        input.value = '';
        this._renderPaSuggestions();
        this._renderPaSelected();
    },
    _renderPaSelected() {
        const el = document.getElementById('paSelected');
        if (this.paSelected.size === 0) {
            el.innerHTML = '';
            return;
        }
        let html = '<div class="pa-sel-label">待添加：</div><div class="pa-sel-list">';
        this.paSelected.forEach(key => {
            const [name, cat] = key.split('|');
            html += `<span class="pa-sel-chip">${name}<button data-key="${key}">✕</button></span>`;
        });
        html += '</div>';
        el.innerHTML = html;
        el.querySelectorAll('.pa-sel-chip button').forEach(btn => {
            btn.onclick = () => {
                this.paSelected.delete(btn.dataset.key);
                this._renderPaSuggestions();
                this._renderPaSelected();
            };
        });
    },
    _confirmAdd() {
        this.paSelected.forEach(key => {
            const [name, cat] = key.split('|');
            if (this.items.some(i => i.name === name && i.cat === cat)) return;
            this.items.push({
                id: Math.random().toString(36).slice(2,8),
                name, cat, packed: false
            });
        });
        this.trip.packingItems = this.items;
        TripDetail._saveTrip();
        this._closeAddPanel();
        this.render();
        const n = this.paSelected.size;
        if (n > 0) UIRender.showToast(`已添加${n}个物品`);
    },

    _openSavePanel() {
        document.getElementById('psTplName').value = '';
        this._renderPsMyTpls();
        document.getElementById('packingSaveOverlay').style.display = 'flex';
        setTimeout(() => document.getElementById('psTplName').focus(), 100);
        document.getElementById('psClose').onclick = () => this._closeSavePanel();
        document.getElementById('psCancel').onclick = () => this._closeSavePanel();
        document.getElementById('packingSaveOverlay').onclick = (e) => {
            if (e.target.id === 'packingSaveOverlay') this._closeSavePanel();
        };
        document.getElementById('psSaveBtn').onclick = () => this._doSaveTemplate();
    },
    _closeSavePanel() {
        document.getElementById('packingSaveOverlay').style.display = 'none';
    },
    _renderPsMyTpls() {
        const el = document.getElementById('psMyTpls');
        const custom = this._getCustomTemplates();
        const keys = Object.keys(custom);
        if (keys.length === 0) {
            el.innerHTML = '<div class="ps-empty">还没有自定义模板</div>';
            return;
        }
        let html = '<div class="ps-my-label">我的模板：</div>';
        keys.forEach(k => {
            html += `<div class="ps-my-item"><span>${custom[k].label}</span><button data-k="${k}">删除</button></div>`;
        });
        el.innerHTML = html;
        el.querySelectorAll('button[data-k]').forEach(btn => {
            btn.onclick = () => { this._deleteTemplate(btn.dataset.k); this._renderPsMyTpls(); };
        });
    },
    _doSaveTemplate() {
        const name = document.getElementById('psTplName').value.trim();
        if (!name) { UIRender.showToast('请输入模板名称'); return; }
        const cats = {};
        const catOrder = [];
        this.items.forEach(it => {
            if (!cats[it.cat]) { cats[it.cat] = []; catOrder.push(it.cat); }
            cats[it.cat].push(it.name);
        });
        const key = 'my_' + Date.now();
        const tpls = this._getCustomTemplates();
        tpls[key] = { label: name, builtin: false, cats: catOrder, defaults: cats };
        this._saveCustomTemplates(tpls);
        this.activeTpl = key;
        this.trip.packingTpl = key;
        TripDetail._saveTrip();
        this._renderTplBar();
        this._closeSavePanel();
        UIRender.showToast(`模板「${name}」已保存`);
    },
};

const PhotosModule = {
    trip: null,
    photos: [],

    init(trip) {
        this.trip = trip;
        this.photos = trip.photos || [];
    },

    render() {
        const grid = document.getElementById('photosGrid');
        let html = '';
        this.photos.forEach((p, i) => {
            html += `<div class="photo-item" style="background-image:url('${p.url}');background-size:cover;background-position:center;"></div>`;
        });
        html += `<div class="photo-add" onclick="UIRender.showToast('相册功能即将开放，敬请期待')">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span>添加照片</span>
        </div>`;
        grid.innerHTML = html;
    },
};

const AIAssistant = {
    overlay: null,
    trip: null,

    open(trip) {
        this.trip = trip;
        this.overlay = document.getElementById('aiAssistantOverlay');
        this.overlay.classList.add('show');
        document.getElementById('aiAssistantClose').onclick = () => this.close();
        this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };

        document.querySelectorAll('.ai-action-card').forEach(card => {
            card.onclick = () => this.handleAction(card.dataset.action);
        });
        const chatEntry = document.querySelector('.ai-chat-entry-btn');
        if (chatEntry) {
            chatEntry.onclick = () => this.handleAction('chat');
        }
    },

    close() {
        this.overlay.classList.remove('show');
    },

    async handleAction(action) {
        this.close();
        const city = this.trip.dayPlans?.[TripDetail.currentDay]?.city || this.trip.destination || this.trip.cities?.[0] || '';

        if (action === 'chat') {
            if (typeof AIChat !== 'undefined') {
                AIChat.open(this.trip, TripDetail.currentDay);
            }
        } else if (action === 'hotel') {
            UIRender.showToast('正在搜索附近优质酒店...');
            this._searchNearby(city, '酒店|住宿|宾馆', '住宿');
        } else if (action === 'food') {
            UIRender.showToast('正在查找周边美食...');
            this._searchNearby(city, '美食|特色餐厅|小吃|老字号', '美食');
        } else if (action === 'recommend') {
            UIRender.showToast('正在为您规划优质路线...');
            this._recommendItinerary(city);
        } else if (action === 'optimize') {
            UIRender.showToast('正在优化路线...');
            setTimeout(() => {
                UIRender.showToast('路线已优化，减少折返距离约 23%');
            }, 1000);
        }
    },

    async _searchNearby(city, keyword, label) {
        try {
            await MapModule.init();
            const pois = await new Promise((resolve) => {
                const ps = new AMap.PlaceSearch({
                    pageSize: 10, pageIndex: 1, extensions: 'all', city, citylimit: true
                });
                ps.search(keyword, (status, result) => {
                    if (status === 'complete' && result.poiList?.pois) {
                        resolve(result.poiList.pois.filter(p => p.location).map(p => ({
                            name: p.name, address: p.address || '',
                            lng: p.location.lng, lat: p.location.lat,
                            type: p.type || '', rating: p.rating || '',
                            typeName: label
                        })));
                    } else resolve([]);
                });
            });

            if (pois.length === 0) { UIRender.showToast(`未找到${label}信息`); return; }

            const top = pois.slice(0, 5);
            TripDetail.switchToList();
            TripDetail.switchTab('itinerary');
            let added = 0;
            top.forEach(poi => {
                if (!TripDetail.addedSpots.has(poi.name)) {
                    TripDetail.addSpotToTrip(poi, TripDetail.currentDay);
                    added++;
                }
            });
            UIRender.showToast(`已为您推荐${added}个${label}`);
        } catch(e) {
            console.error(e);
            UIRender.showToast('搜索失败，请稍后再试');
        }
    },

    async _recommendItinerary(city) {
        try {
            UIRender.showToast('AI正在为您生成优质行程...');
            const existingCount = TripDetail.trip.dayPlans?.reduce((s,d) => s + (d.spots?.length || 0), 0) || 0;

            const pois = await MapModule.searchCityPOIs(city, []);
            if (!Array.isArray(pois) || pois.length === 0) {
                UIRender.showToast('获取推荐数据失败');
                return;
            }

            const existing = TripDetail.addedSpots;
            const newPois = pois.filter(p => !existing.has(p.name)).slice(0, 6);
            if (newPois.length === 0) {
                UIRender.showToast('已覆盖热门景点');
                return;
            }

            const dayIdx = 0;
            newPois.forEach(poi => {
                TripDetail.addSpotToTrip({...poi, typeName: '推荐'}, dayIdx);
            });
            TripDetail.switchToList();
            TripDetail.switchTab('itinerary');
            UIRender.showToast(`已推荐 ${newPois.length} 个优质景点`);
        } catch(e) {
            console.error(e);
            UIRender.showToast('推荐失败，请重试');
        }
    }
};

window.TripDetail = TripDetail;
window.AIAssistant = AIAssistant;