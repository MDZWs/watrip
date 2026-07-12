const TPL_COVER_COLORS = [
    { bg: 'linear-gradient(135deg, #FFB983 0%, #FF8A3D 100%)', solid: '#FF8A3D' },
    { bg: 'linear-gradient(135deg, #B8ADFF 0%, #8B7CF5 100%)', solid: '#8B7CF5' },
    { bg: 'linear-gradient(135deg, #A8E0FF 0%, #5CC6FF 100%)', solid: '#5CC6FF' },
    { bg: 'linear-gradient(135deg, #FFA3B5 0%, #FF6B8A 100%)', solid: '#FF6B8A' },
    { bg: 'linear-gradient(135deg, #7DD892 0%, #34C759 100%)', solid: '#34C759' },
    { bg: 'linear-gradient(135deg, #FFE86B 0%, #FFD60A 100%)', solid: '#FFD60A' },
    { bg: 'linear-gradient(135deg, #FFB84D 0%, #FF9500 100%)', solid: '#FF9500' },
    { bg: 'linear-gradient(135deg, #FF9F9F 0%, #FF6961 100%)', solid: '#FF6961' },
];

const TRANSPORT_EMOJI = {
    walking: '🚶',
    riding: '🚴',
    driving: '🚗',
    transit: '🚌',
};

const TemplatePreview = {
    template: null,
    currentDay: 0,
    mode: 'list',
    previewMap: null,
    markers: [],
    routePolylines: [],
    geocodedSpots: new Map(),
    _eventsBound: false,

    open(templateId) {
        const templates = AIMemory.getCommunityTemplates();
        const tpl = templates.find(t => t.id === templateId);
        if (!tpl) {
            UIRender.showToast('模板不存在');
            return;
        }
        this._openWithTemplate(tpl);
    },

    /**
     * 直接用 trip 对象打开预览（用于云端行程）
     */
    openWithTrip(trip) {
        if (!trip) {
            UiKit.toast('行程数据缺失', 'error');
            return;
        }
        this._openWithTemplate(trip);
        // Phase 3.3：查看他人行程模板触发新手任务（仅云端行程有 author_id）
        if (trip.author_id && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const me = Auth.getCurrentUser();
            if (me && me.id !== trip.author_id && typeof NewbieTasks !== 'undefined') {
                NewbieTasks.trigger('view_template');
            }
        }
    },

    /**
     * 内部：用模板对象打开预览页
     */
    _openWithTemplate(tpl) {
        this.template = JSON.parse(JSON.stringify(tpl));
        if (!this.template.id) {
            this.template.id = 'tpl_' + Date.now();
        }
        this.template.savedAt = Date.now();

        if (this.template.dayPlans) {
            this.template.dayPlans.forEach(dp => this._assignDefaultTimes(dp));
        }

        ['homePage', 'tripsPage', 'inputPage', 'resultPage', 'communityPage', 'profilePage', 'tripDetailPage', 'manualPlanPage'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
            if (id === 'manualPlanPage') document.getElementById(id).style.display = 'none';
        });

        const previewPage = document.getElementById('templatePreviewPage');
        previewPage.style.display = 'flex';
        previewPage.classList.add('active');

        document.getElementById('bottomTabBar').style.display = 'none';

        App.pageStack.push('template-preview');

        this.currentDay = 0;
        this.mode = 'list';
        this.geocodedSpots = new Map();

        document.getElementById('previewListMode').style.display = 'flex';
        document.getElementById('previewMapMode').style.display = 'none';

        this.renderHero();
        this.renderList();
        this._bindEvents();

        this.geocodeAllSpots();
    },

    close() {
        const previewPage = document.getElementById('templatePreviewPage');
        previewPage.classList.remove('active');
        previewPage.style.display = 'none';

        if (this.previewMap) {
            this.previewMap.destroy();
            this.previewMap = null;
        }
        this.markers = [];
        this.routePolylines = [];
        this.hideMapSpotCard();

        if (App.pageStack.length > 1) {
            App.pageStack.pop();
            const prev = App.pageStack[App.pageStack.length - 1];
            if (prev === 'manual-plan') {
                const page = document.getElementById('manualPlanPage');
                page.style.display = 'flex';
                page.classList.add('active');
                document.getElementById('bottomTabBar').style.display = 'none';
                return;
            } else if (prev === 'template-preview' || !['home','trips','plan','community','profile','result'].includes(prev)) {
                App.switchTab('community', true);
            } else {
                App.switchTab(prev, true);
            }
        } else {
            App.switchTab('community');
        }
        document.getElementById('bottomTabBar').style.display = 'flex';
    },

    renderHero() {
        const t = this.template;
        if (!t) return;

        let colorIdx = 0;
        if (t.id) {
            let hash = 0;
            for (let i = 0; i < t.id.length; i++) {
                hash = ((hash << 5) - hash) + t.id.charCodeAt(i);
                hash |= 0;
            }
            colorIdx = Math.abs(hash) % TPL_COVER_COLORS.length;
        }
        const color = TPL_COVER_COLORS[colorIdx];

        const heroBg = document.getElementById('previewHeroBg');
        const hero = document.getElementById('previewHero');

        let coverImage = '';
        if (t.coverImage) {
            coverImage = t.coverImage;
        } else if (t.dayPlans) {
            for (const dp of t.dayPlans) {
                for (const spot of (dp.spots || [])) {
                    const photos = spot.photos || [];
                    if (photos.length > 0) {
                        const firstPhoto = photos[0];
                        if (typeof firstPhoto === 'string') {
                            coverImage = firstPhoto;
                        } else if (firstPhoto.url) {
                            coverImage = firstPhoto.url;
                        } else if (firstPhoto.dataUrl) {
                            coverImage = firstPhoto.dataUrl;
                        }
                        break;
                    }
                }
                if (coverImage) break;
            }
        }

        if (coverImage && !coverImage.startsWith('data:') && !coverImage.startsWith('http')) {
            coverImage = 'https://picsum.photos/800/600?random=' + colorIdx;
        }

        if (coverImage) {
            heroBg.style.backgroundImage = `url("${coverImage}")`;
            heroBg.style.backgroundSize = 'cover';
            heroBg.style.backgroundPosition = 'center';
            hero.style.background = 'transparent';
        } else {
            heroBg.style.backgroundImage = 'none';
            hero.style.background = color.bg;
        }

        document.getElementById('previewTitle').textContent = t.title || '未命名行程';
        document.getElementById('previewAvatar').textContent = t.avatar || '👤';
        document.getElementById('previewAuthor').textContent = t.author || '匿名旅行者';
        document.getElementById('previewDays').textContent = (t.days || t.dayPlans?.length || 1) + '天';
        document.getElementById('previewDest').textContent = '📍 ' + (t.destination || '未知目的地');

        const tagsEl = document.getElementById('previewTags');
        if (t.tags && t.tags.length > 0) {
            tagsEl.innerHTML = t.tags.map(tag => `<span class="preview-tag">${tag}</span>`).join('');
        } else {
            tagsEl.innerHTML = '';
        }

        const copiesCount = t.copies || 0;
        const applyBadge = document.getElementById('previewApplyBadge');
        if (applyBadge) {
            applyBadge.textContent = copiesCount + '人已用';
            applyBadge.style.display = copiesCount > 0 ? 'block' : 'none';
        }

        this.renderDayOverview();

        if (this._eventsBound) {
            this._initLikeFavStatus();
        }
    },

    renderDayOverview() {
        const container = document.getElementById('previewDayOverview');
        if (!container) return;

        const days = this.template.dayPlans || [];
        if (days.length === 0) {
            container.style.display = 'none';
            return;
        }

        const themes = [
            { icon: '🌅', title: '初来乍到', desc: '精华景点一网打尽' },
            { icon: '🏮', title: '深度体验', desc: '慢下来感受本地烟火气' },
            { icon: '🌸', title: '小众探索', desc: '发掘不一样的城市角落' },
            { icon: '🍜', title: '美食之旅', desc: '舌尖上的城市记忆' },
            { icon: '🎭', title: '文化沉浸', desc: '触摸历史的温度' },
        ];

        let html = '<div class="preview-overview-scroll">';
        days.forEach((dp, i) => {
            const theme = themes[i % themes.length];
            const spots = dp.spots || [];
            const spotNames = spots.slice(0, 3).map(s => s.name).join(' · ');
            const moreCount = spots.length - 3;
            const desc = spotNames + (moreCount > 0 ? ` 等${spots.length}处` : '');

            html += `<div class="preview-overview-card ${i === this.currentDay ? 'active' : ''}" onclick="TemplatePreview.switchDay(${i})">
                <div class="poc-day">Day ${i + 1}</div>
                <div class="poc-theme">
                    <span class="poc-icon">${theme.icon}</span>
                    <span class="poc-title">${this._generateDayTitle(dp, i)}</span>
                </div>
                <div class="poc-desc">${this._generateDayDesc(dp)}</div>
            </div>`;
        });
        html += '</div>';

        container.innerHTML = html;
        container.style.display = 'block';

        this.renderDayGuide();
    },

    renderDayGuide() {
        const guideEl = document.getElementById('previewDayGuide');
        const contentEl = document.getElementById('previewGuideContent');
        if (!guideEl || !contentEl) return;

        const days = this.template.dayPlans || [];
        if (days.length === 0) {
            guideEl.style.display = 'none';
            return;
        }

        const dayPlan = days[this.currentDay] || days[0];
        const spots = dayPlan.spots || [];
        if (spots.length === 0) {
            guideEl.style.display = 'none';
            return;
        }

        const tips = this._generateDayTips(dayPlan, this.currentDay);
        const highlights = this._extractHighlights(spots);

        let html = '<div class="pdg-tips">';
        tips.forEach(tip => {
            html += `<div class="pdg-tip-item">
                <span class="pdg-tip-icon">${tip.icon}</span>
                <span class="pdg-tip-text"><strong>${tip.title}</strong>${tip.desc ? '：' + tip.desc : ''}</span>
            </div>`;
        });
        html += '</div>';

        if (highlights.length > 0) {
            html += '<div class="pdg-highlights">';
            highlights.forEach(h => {
                html += `<span class="pdg-highlight-tag">✨ ${h}</span>`;
            });
            html += '</div>';
        }

        contentEl.innerHTML = html;
        guideEl.style.display = 'block';
        if (!guideEl.classList.contains('collapsed') && !guideEl.dataset.initialized) {
            guideEl.classList.add('collapsed');
            guideEl.dataset.initialized = '1';
        }
    },

    toggleGuide() {
        const guideEl = document.getElementById('previewDayGuide');
        if (guideEl) {
            guideEl.classList.toggle('collapsed');
        }
    },

    _generateDayTips(dayPlan, dayIdx) {
        const spots = dayPlan.spots || [];
        const tips = [];
        const types = [...new Set(spots.map(s => s.type || '景点'))];
        const totalDays = this.template?.dayPlans?.length || 1;

        if (dayIdx === 0) {
            tips.push({
                icon: '⏰',
                title: '上午出发最佳',
                desc: '第一天精力充沛，建议早出发多玩几个景点'
            });
        } else {
            tips.push({
                icon: '😴',
                title: '可以睡个懒觉',
                desc: '行程不赶，9-10点出发都来得及'
            });
        }

        if (types.includes('美食') || types.includes('景点')) {
            const foodSpots = spots.filter(s => s.type === '美食');
            if (foodSpots.length > 0) {
                tips.push({
                    icon: '🍽️',
                    title: '记得错峰用餐',
                    desc: `推荐${foodSpots[0].name}，11:30前到不用排队`
                });
            }
        }

        const hasScenic = types.includes('景点') || types.includes('自然') || types.includes('文化');
        if (hasScenic && spots.length >= 3) {
            tips.push({
                icon: '👟',
                title: '穿舒适的鞋子',
                desc: `今天要走${spots.length}个点，预计步行8000+步`
            });
        }

        if (dayIdx === totalDays - 1 && totalDays > 1) {
            tips.push({
                icon: '🎁',
                title: '留点时间购物',
                desc: '最后一天可以买点伴手礼带回家'
            });
        }

        return tips.slice(0, 3);
    },

    _extractHighlights(spots) {
        const highlights = [];
        const types = [...new Set(spots.map(s => s.type || '景点'))];

        const typeLabels = {
            '景点': '必打卡',
            '美食': '地道美食',
            '自然': '自然风光',
            '文化': '人文历史',
            '购物': '血拼购物',
            '娱乐': '亲子娱乐',
            '住宿': '特色住宿'
        };

        types.forEach(t => {
            if (typeLabels[t]) {
                highlights.push(typeLabels[t]);
            }
        });

        if (spots.length >= 5) highlights.push('行程充实');
        if (spots.length <= 3) highlights.push('轻松休闲');

        return highlights.slice(0, 3);
    },

    _generateDayTitle(dayPlan, dayIdx) {
        const spots = dayPlan.spots || [];
        if (spots.length === 0) return '自由安排';

        const types = [...new Set(spots.map(s => s.type || '景点'))];
        const titleMap = {
            '景点': '经典打卡',
            '美食': '舌尖之旅',
            '购物': '血拼时光',
            '自然': '自然探索',
            '文化': '文化沉浸',
            '娱乐': '欢乐时光',
            '住宿': '休憩时光',
        };

        if (dayIdx === 0) return '初遇·精华初见';
        if (dayIdx === 1) return '深入·本地体验';
        if (dayIdx === 2) return '探索·小众秘境';

        const mainType = types[0];
        return titleMap[mainType] || '精彩一日';
    },

    _generateDayDesc(dayPlan) {
        const spots = dayPlan.spots || [];
        if (spots.length === 0) return '轻松自由的一天';

        const firstSpot = spots[0];
        const lastSpot = spots[spots.length - 1];
        const midSpots = spots.slice(1, -1);

        let desc = '';
        if (spots.length <= 2) {
            desc = `从${firstSpot.name}到${lastSpot.name}，悠闲漫游`;
        } else if (spots.length <= 4) {
            desc = `${firstSpot.name}→${midSpots.map(s => s.name).join('→')}→${lastSpot.name}`;
        } else {
            desc = `${firstSpot.name}·${midSpots.slice(0, 2).map(s => s.name).join('·')} 等${spots.length}处`;
        }

        return desc;
    },

    renderList() {
        this.renderDayPills();
        this.renderItinerary();
        document.getElementById('previewModeFab').style.display = 'flex';
    },

    renderDayPills() {
        const pillsBar = document.getElementById('previewDayPills');
        const mapPillsBar = document.getElementById('previewMapDayPills');
        const days = this.template.dayPlans || [];

        let html = '';
        days.forEach((dp, i) => {
            const label = `Day ${i + 1}`;
            html += `<button class="preview-day-pill ${i === this.currentDay ? 'active' : ''}" data-day="${i}">${label}</button>`;
        });

        pillsBar.innerHTML = html;
        mapPillsBar.innerHTML = html.replace(/preview-day-pill/g, 'preview-map-day-pill');

        pillsBar.querySelectorAll('.preview-day-pill').forEach(btn => {
            btn.onclick = () => this.switchDay(parseInt(btn.dataset.day));
        });
        mapPillsBar.querySelectorAll('.preview-map-day-pill').forEach(btn => {
            btn.className = `preview-map-day-pill ${parseInt(btn.dataset.day) === this.currentDay ? 'active' : ''}`;
            btn.onclick = () => this.switchDay(parseInt(btn.dataset.day));
        });
    },

    renderItinerary() {
        const container = document.getElementById('previewItinerary');
        const dp = this.template.dayPlans?.[this.currentDay];
        if (!dp) {
            container.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#999;">暂无行程</div>';
            return;
        }

        this._assignDefaultTimes(dp);
        const spots = dp.spots || [];

        if (spots.length === 0) {
            container.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#999;font-size:13px;">暂无景点</div>';
            return;
        }

        let html = `<div class="preview-timeline-list">`;

        spots.forEach((spot, si) => {
            const emoji = spot.emoji || _getSpotEmoji(spot.type || spot.name);
            const type = spot.type || '景点';
            const durMin = (spot.endMin != null && spot.startMin != null) ? (spot.endMin - spot.startMin) : 60;
            const durLabel = durMin >= 60 ? `${(durMin / 60).toFixed(durMin % 60 === 0 ? 0 : 1)}小时` : `${durMin}分钟`;
            const intro = spot.intro || '';
            const startT = this._formatTime(spot.startMin || 540);
            const endT = this._formatTime(spot.endMin || (spot.startMin || 540) + 60);
            const photoUrl = (spot.photos && spot.photos[0] && spot.photos[0].url) ? spot.photos[0].url : '';
            const rating = spot.rating || (spot.biz_ext && spot.biz_ext.rating);

            html += `<div class="preview-timeline-item">
                <div class="preview-timeline-time">
                    <div class="preview-tt-start">${startT}</div>
                    <div class="preview-tt-line"></div>
                    <div class="preview-tt-end">${endT}</div>
                    <div class="preview-tt-dur">${durLabel}</div>
                </div>
                <div class="preview-timeline-axis">
                    <div class="preview-axis-dot"></div>
                    ${si < spots.length - 1 ? '<div class="preview-axis-line"></div>' : ''}
                </div>
                <div class="preview-timeline-card" onclick="TemplatePreview.showSpotDetail(${si})">
                    ${photoUrl ? `<div class="preview-card-photo"><img src="${photoUrl}" alt="${spot.name}" onerror="this.parentElement.style.display='none';"></div>` : `<div class="preview-card-emoji">${emoji}</div>`}
                    <div class="preview-card-body">
                        <div class="preview-card-name">${spot.name}<span class="preview-card-type">${type}</span></div>
                        ${rating ? `<div class="preview-card-rating">⭐ ${rating}</div>` : ''}
                        ${intro ? `<div class="preview-card-intro">${intro}</div>` : ''}
                    </div>
                    <div class="preview-card-arrow">›</div>
                </div>
            </div>`;

            if (si < spots.length - 1) {
                html += this.renderTransportHint(spot, spots[si + 1], true);
            }
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    renderTransportHint(fromSpot, toSpot, readonly) {
        let mode = toSpot.transportMode;
        let distKm = 2;
        let distance = 0;
        let timeSec = 0;

        if (fromSpot.lng && fromSpot.lat && toSpot.lng && toSpot.lat) {
            distKm = MapModule.calcDistance(fromSpot.lng, fromSpot.lat, toSpot.lng, toSpot.lat);
        }

        if (!mode) {
            mode = MapModule.recommendTransport(distKm);
        }

        if (toSpot.distanceNum != null && toSpot.timeSec != null) {
            distance = toSpot.distanceNum;
            timeSec = toSpot.timeSec;
        } else {
            const est = MapModule.estimateRoute(distKm, mode);
            distance = est.distance;
            timeSec = est.time;
        }

        const distText = distance < 1000
            ? Math.round(distance) + '米'
            : (distance / 1000).toFixed(1) + 'km';
        const timeMin = Math.round(timeSec / 60);
        const timeText = timeMin + '分钟';
        const emoji = TRANSPORT_EMOJI[mode] || '🚗';

        let modesHtml = '';
        if (!readonly) {
            modesHtml = `<div class="th-modes">
                ${['walking', 'riding', 'driving', 'transit'].map(m => {
                    const activeCls = m === mode ? 'active' : '';
                    return `<button class="th-mode-btn ${activeCls}">${TRANSPORT_EMOJI[m]}</button>`;
                }).join('')}
            </div>`;
        }

        return `<div class="transport-hint ${readonly ? 'readonly' : ''}">
            <span class="th-icon">${emoji}</span>
            <div class="th-info">
                <span class="th-dist">${distText}</span>
                <span>·</span>
                <span class="th-time">${timeText}</span>
            </div>
            ${modesHtml}
        </div>`;
    },

    switchToMap() {
        this.mode = 'map';
        document.getElementById('previewListMode').style.display = 'none';
        document.getElementById('previewMapMode').style.display = 'flex';
        document.getElementById('previewModeFab').style.display = 'none';
        this.hideMapSpotCard();
        setTimeout(() => this.renderMap(), 150);
    },

    switchToList() {
        this.mode = 'list';
        document.getElementById('previewMapMode').style.display = 'none';
        document.getElementById('previewListMode').style.display = 'flex';
        document.getElementById('previewModeFab').style.display = 'flex';
        if (this.previewMap) {
            this.previewMap.destroy();
            this.previewMap = null;
        }
        this.markers = [];
        this.routePolylines = [];
        this.hideMapSpotCard();
    },

    showSpotDetail(si) {
        const dp = this.template.dayPlans?.[this.currentDay];
        const spot = dp?.spots?.[si];
        if (!spot) return;
        if (typeof App !== 'undefined' && App.showPoiDetail) {
            App.showPoiDetail(spot, this.currentDay + 1);
        }
    },

    async renderMap() {
        document.getElementById('previewModeFab').style.display = 'none';

        let mapContainer = document.getElementById('previewMapContainer');

        try {
            if (!this.previewMap) {
                await MapModule.init();
                if (typeof AMap === 'undefined') throw new Error('地图服务不可用');
                this.previewMap = new AMap.Map('previewMapContainer', {
                    zoom: 12,
                    center: [116.397428, 39.90923],
                    mapStyle: 'amap://styles/normal',
                });
            }
        } catch (e) {
            console.error('Preview map init failed:', e);
            UIRender.showToast('地图加载失败，请检查网络');
            return;
        }

        this.previewMap.clearMap();
        this.markers = [];
        this.routePolylines = [];
        this.hideMapSpotCard();

        const dayPlan = this.template.dayPlans?.[this.currentDay];
        if (!dayPlan) return;
        const spots = dayPlan.spots || [];
        if (spots.length === 0) return;

        const city = dayPlan.city || this.template.destination || this.template.city || this.template.cities?.[0] || '';

        this.renderDayPills();

        const positions = [];
        const validIdx = [];

        spots.forEach((spot, si) => {
            if (!spot.lng || !spot.lat) {
                MapModule.geocodeSpot(city, spot.name).then(pos => {
                    if (pos) {
                        spot.lng = pos.lng;
                        spot.lat = pos.lat;
                        this._reRenderMapMarkers();
                    }
                }).catch(() => {});
            }
        });

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
                content: _createPreviewMarker(i + 1, false),
                offset: new AMap.Pixel(-16, -32),
                zIndex: 10 + si,
                extData: { di: this.currentDay, si },
            });
            marker.on('click', () => {
                this._selectMapSpot(this.currentDay, si);
            });
            this.previewMap.add(marker);
            this.markers.push(marker);
        });

        if (positions.length > 1) {
            const polyline = new AMap.Polyline({
                path: positions,
                strokeColor: '#FF7B3D',
                strokeWeight: 4,
                strokeOpacity: 0.75,
                lineJoin: 'round',
                lineCap: 'round',
                showDir: true,
            });
            this.previewMap.add(polyline);
            this.routePolylines.push(polyline);
            setTimeout(() => this.previewMap.setFitView(this.markers, false, [60, 60, 200, 60]), 200);
        } else if (positions.length === 1) {
            this.previewMap.setZoomAndCenter(14, positions[0]);
        }
    },

    _reRenderMapMarkers() {
        if (!this.previewMap || this.mode !== 'map') return;
        this.renderMap();
    },

    _selectMapSpot(di, si) {
        const dayPlan = this.template.dayPlans?.[di];
        if (!dayPlan) return;
        const spot = dayPlan.spots?.[si];
        if (!spot) return;

        this.markers.forEach((m, i) => {
            m.setContent(_createPreviewMarker(i + 1, i === si));
            m.setzIndex(i === si ? 100 : 10 + i);
        });

        if (spot.lng && spot.lat) {
            this.previewMap.setZoomAndCenter(15, [spot.lng, spot.lat]);
        }

        this.showMapSpotCard(spot);
    },

    async geocodeAllSpots() {
        const days = this.template.dayPlans || [];
        const allSpots = [];

        days.forEach((dp, di) => {
            const dayCity = dp.city || this.template.destination || this.template.city || this.template.cities?.[0] || '';
            (dp.spots || []).forEach((spot, si) => {
                if (!spot.lng || !spot.lat) {
                    allSpots.push({ spot, di, si, city: dayCity });
                }
            });
        });

        if (allSpots.length === 0) {
            this._updateTransportHints();
            return;
        }

        const concurrency = 3;
        const results = [];
        let completed = 0;

        const runBatch = async (startIdx) => {
            const promises = [];
            for (let i = startIdx; i < Math.min(startIdx + concurrency, allSpots.length); i++) {
                const { spot, city } = allSpots[i];
                promises.push(
                    MapModule.geocodeSpot(city, spot.name).then(pos => {
                        if (pos) {
                            spot.lng = pos.lng;
                            spot.lat = pos.lat;
                            if (!spot.address && pos.address) spot.address = pos.address;
                            if (!spot.photos && pos.photos) spot.photos = pos.photos;
                            if (!spot.rating && pos.biz_ext && pos.biz_ext.rating) spot.rating = pos.biz_ext.rating;
                            if (!spot.biz_ext && pos.biz_ext) spot.biz_ext = pos.biz_ext;
                            if (!spot.poi_id && pos.id) spot.poi_id = pos.id;
                        }
                        completed++;
                    }).catch(() => {
                        completed++;
                    })
                );
            }
            await Promise.all(promises);
        };

        for (let i = 0; i < allSpots.length; i += concurrency) {
            await runBatch(i);
        }

        this._updateTransportHints();

        if (this.mode === 'map' && this.previewMap) {
            this.renderMap();
        } else {
            this.renderItinerary();
        }
    },

    _updateTransportHints() {
        const days = this.template.dayPlans || [];
        days.forEach(dp => {
            const spots = dp.spots || [];
            for (let i = 0; i < spots.length - 1; i++) {
                const from = spots[i];
                const to = spots[i + 1];
                if (from.lng && from.lat && to.lng && to.lat) {
                    const distKm = MapModule.calcDistance(from.lng, from.lat, to.lng, to.lat);
                    if (!to.transportMode) {
                        to.transportMode = MapModule.recommendTransport(distKm);
                    }
                    const est = MapModule.estimateRoute(distKm, to.transportMode);
                    to.distanceNum = est.distance;
                    to.timeSec = est.time;
                }
            }
        });
    },

    async applyTemplate() {
        const trip = JSON.parse(JSON.stringify(this.template));
        const newId = 'trip_' + Date.now();
        trip.id = newId;
        trip.savedAt = Date.now();

        // 清除原作者的个人记录数据（笔记、照片、打卡记录等）
        // 只保留行程结构（景点、路线、时间安排、基础信息）
        delete trip.author;
        delete trip.author_id;
        delete trip.coverImage;
        (trip.dayPlans || []).forEach(dp => {
            (dp.spots || []).forEach(spot => {
                // 清除个人记录
                if (spot.record) {
                    delete spot.record.notes;
                    delete spot.record.photos;
                    delete spot.record.checkedIn;
                    delete spot.record.weather;
                    delete spot.record.mood;
                }
                // 清除景点的照片（保留POI背景图的引用，但清除用户上传的照片）
                if (spot.photos && spot.photos.length > 0) {
                    // 只保留POI官方背景图（如果有的话），清除用户上传的照片
                    spot.photos = [];
                }
                // 清除打卡状态
                delete spot.checked;
                delete spot.note;
            });
        });
        // 清除费用记录中的个人备注
        if (trip.expenses) {
            trip.expenses = [];
        }

        const saveResult = await App.saveTripWithLimitCheck(trip);
        if (!saveResult) return; // 达上限且用户未处理，中止

        // ===== Phase 3.1：套用模板触发原作者 +10 积分 + 云端 copies 计数 =====
        const sourceTpl = this.template;
        const sourceId = sourceTpl?.id;
        const authorId = sourceTpl?.author_id;
        const isCloudId = sourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId);
        if (authorId && isCloudId && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const me = Auth.getCurrentUser();
            if (me && me.id !== authorId && typeof PointsCore !== 'undefined') {
                PointsCore.onAdopted(authorId, sourceId, 'template').catch(() => {});
            }
            // 云端 copies 计数 +1
            if (typeof supabase !== 'undefined') {
                supabase.from('trip_templates')
                    .select('copies')
                    .eq('id', sourceId)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            supabase.from('trip_templates')
                                .update({ copies: (data.copies || 0) + 1 })
                                .eq('id', sourceId)
                                .then(() => {});
                        }
                    });
            }
            // Phase 3.3：套用他人行程模板触发新手任务
            if (me && me.id !== authorId && typeof NewbieTasks !== 'undefined') {
                NewbieTasks.trigger('apply_template');
            }
        }

        const templates = AIMemory.getCommunityTemplates();
        const origIdx = templates.findIndex(t => t.id === this.template.id);
        if (origIdx >= 0) {
            templates[origIdx].copies = (templates[origIdx].copies || 0) + 1;
            try {
                const cached = JSON.parse(localStorage.getItem(AIMemory.KEYS.COMMUNITY_CACHE) || 'null');
                if (cached) {
                    cached.cachedAt = Date.now();
                    cached.templates = templates;
                    localStorage.setItem(AIMemory.KEYS.COMMUNITY_CACHE, JSON.stringify(cached));
                }
            } catch (e) {}
        }

        if (this.previewMap) {
            this.previewMap.destroy();
            this.previewMap = null;
        }
        this.markers = [];
        this.routePolylines = [];

        document.getElementById('templatePreviewPage').classList.remove('active');
        document.getElementById('templatePreviewPage').style.display = 'none';

        App.pageStack = App.pageStack.filter(p => p !== 'template-preview' && p !== 'manual-plan');

        App.openTripDetail(newId);
        UIRender.showToast('已套用行程，开始编辑吧！');
    },

    switchDay(dayIdx) {
        this.currentDay = dayIdx;
        this.updateDayPills();
        this.updateDayOverviewActive();
        this.renderDayGuide();
        if (this.mode === 'list') {
            this.renderItinerary();
        } else {
            this.renderMap();
        }
    },

    updateDayOverviewActive() {
        const cards = document.querySelectorAll('.preview-overview-card');
        cards.forEach((card, i) => {
            card.classList.toggle('active', i === this.currentDay);
        });
    },

    updateDayPills() {
        document.querySelectorAll('#previewDayPills .preview-day-pill').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.day) === this.currentDay);
        });
        document.querySelectorAll('#previewMapDayPills .preview-map-day-pill').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.day) === this.currentDay);
        });
    },

    hideMapSpotCard() {
        const card = document.getElementById('previewMapSpotCard');
        if (card) card.style.display = 'none';

        if (this.previewMap) {
            this.markers.forEach((m, i) => {
                m.setContent(_createPreviewMarker(i + 1, false));
                m.setzIndex(10 + i);
            });
        }
    },

    showMapSpotCard(spot) {
        document.getElementById('previewMapSpotEmoji').textContent = spot.emoji || '📍';
        document.getElementById('previewMapSpotName').textContent = spot.name;
        const wrapper = document.getElementById('previewMapSpotInfo');
        if (wrapper && wrapper.children.length > 1) {
            wrapper.children[1].textContent = (spot.type || '景点') + (spot.address ? ' · ' + spot.address : '');
        }
        document.getElementById('previewMapSpotCard').style.display = 'block';
    },

    _assignDefaultTimes(dp) {
        let curMin = 540;
        (dp.spots || []).forEach(spot => {
            if (spot.startMin == null) {
                spot.startMin = curMin;
                spot.endMin = curMin + (spot.duration || 60);
            }
            curMin = spot.endMin + 30;
        });
    },

    _formatTime(min) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    },

    _bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        document.getElementById('previewBackBtn').onclick = () => this.close();
        document.getElementById('previewApplyBtn').onclick = () => this.applyTemplate();
        document.getElementById('previewModeFab').onclick = () => this.switchToMap();
        document.getElementById('previewModeSwitchBtn').onclick = () => this.switchToList();
        document.getElementById('previewMapBackBtn').onclick = () => this.close();
        document.getElementById('previewCloseMapSpot').onclick = () => this.hideMapSpotCard();

        // 点赞按钮
        const likeBtn = document.getElementById('previewLikeBtn');
        if (likeBtn) {
            likeBtn.onclick = async () => {
                if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
                    if (typeof UiKit !== 'undefined') UiKit.toast('请先登录', 'info');
                    if (typeof Auth !== 'undefined') Auth.requireAuth();
                    return;
                }
                if (typeof supabase === 'undefined') return;
                const trip = this.template;
                if (!trip || !trip.cloudId && !trip.id) return;
                const tripId = trip.cloudId || trip.id;
                const isCloud = !!trip.cloudId || trip.author_id;

                const user = Auth.getCurrentUser();
                const { data: existing } = await supabase
                    .from('likes')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('target_id', tripId)
                    .eq('target_type', 'template')
                    .maybeSingle();

                const likesEl = document.getElementById('previewLikes');
                const currentCount = parseInt(likesEl?.textContent || '0', 10) || 0;

                if (existing) {
                    // 取消点赞
                    const { error } = await supabase
                        .from('likes')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('target_id', tripId)
                        .eq('target_type', 'template');
                    if (error) {
                        if (typeof UiKit !== 'undefined') UiKit.toast('操作失败', 'error');
                        return;
                    }
                    likeBtn.textContent = '🤍';
                    if (likesEl) likesEl.textContent = Math.max(0, currentCount - 1);
                    if (typeof UiKit !== 'undefined') UiKit.toast('已取消点赞', 'info');

                    // 更新计数
                    if (isCloud) {
                        const { data: tpl } = await supabase
                            .from('trip_templates')
                            .select('likes')
                            .eq('id', tripId)
                            .single();
                        if (tpl) {
                            await supabase
                                .from('trip_templates')
                                .update({ likes: Math.max(0, (tpl.likes || 0) - 1) })
                                .eq('id', tripId);
                        }
                    }
                } else {
                    // 点赞
                    const { error } = await supabase
                        .from('likes')
                        .insert({ user_id: user.id, target_id: tripId, target_type: 'template' });
                    if (error) {
                        if (typeof UiKit !== 'undefined') UiKit.toast('操作失败', 'error');
                        return;
                    }
                    likeBtn.textContent = '❤️';
                    if (likesEl) likesEl.textContent = currentCount + 1;
                    if (typeof UiKit !== 'undefined') UiKit.toast('点赞成功', 'success');
                    if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('first_like');

                    // 积分
                    if (isCloud && typeof PointsCore !== 'undefined' && trip.author_id) {
                        PointsCore.onLiked(trip.author_id, user.id, tripId, 'template').catch(() => {});
                    }

                    // 更新计数
                    if (isCloud) {
                        const { data: tpl } = await supabase
                            .from('trip_templates')
                            .select('likes')
                            .eq('id', tripId)
                            .single();
                        if (tpl) {
                            await supabase
                                .from('trip_templates')
                                .update({ likes: (tpl.likes || 0) + 1 })
                                .eq('id', tripId);
                        }
                    }
                }
            };
        }

        // 收藏按钮 - 云端同步
        const favBtn = document.getElementById('previewFavBtn');
        if (favBtn) {
            favBtn.onclick = async () => {
                if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
                    if (typeof UiKit !== 'undefined') UiKit.toast('请先登录', 'info');
                    if (typeof Auth !== 'undefined') Auth.requireAuth();
                    return;
                }
                if (typeof supabase === 'undefined') return;
                const trip = this.template;
                if (!trip || !trip.cloudId && !trip.id) return;
                const tripId = trip.cloudId || trip.id;
                const isCloud = !!trip.cloudId || trip.author_id;

                const user = Auth.getCurrentUser();
                const { data: existing } = await supabase
                    .from('favorites')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('target_id', tripId)
                    .eq('target_type', 'template')
                    .maybeSingle();

                if (existing) {
                    // 取消收藏
                    const { error } = await supabase
                        .from('favorites')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('target_id', tripId)
                        .eq('target_type', 'template');
                    if (error) {
                        if (typeof UiKit !== 'undefined') UiKit.toast('操作失败', 'error');
                        return;
                    }
                    favBtn.textContent = '🤍';
                    const favBottomBtn = document.getElementById('previewFavBottomBtn');
                    if (favBottomBtn) {
                        favBottomBtn.querySelector('.pbf-icon').textContent = '🤍';
                        favBottomBtn.classList.remove('favorited');
                    }
                    if (typeof UiKit !== 'undefined') UiKit.toast('已取消收藏', 'info');

                    // 更新计数
                    if (isCloud) {
                        const { data: tpl } = await supabase
                            .from('trip_templates')
                            .select('favorites')
                            .eq('id', tripId)
                            .single();
                        if (tpl) {
                            await supabase
                                .from('trip_templates')
                                .update({ favorites: Math.max(0, (tpl.favorites || 0) - 1) })
                                .eq('id', tripId);
                        }
                    }
                } else {
                    // 收藏
                    const { error } = await supabase
                        .from('favorites')
                        .insert({ user_id: user.id, target_id: tripId, target_type: 'template' });
                    if (error) {
                        if (typeof UiKit !== 'undefined') UiKit.toast('操作失败', 'error');
                        return;
                    }
                    favBtn.textContent = '❤️';
                    const favBottomBtn2 = document.getElementById('previewFavBottomBtn');
                    if (favBottomBtn2) {
                        favBottomBtn2.querySelector('.pbf-icon').textContent = '❤️';
                        favBottomBtn2.classList.add('favorited');
                    }
                    if (typeof UiKit !== 'undefined') UiKit.toast('已收藏', 'success');

                    // 积分
                    if (isCloud && typeof PointsCore !== 'undefined' && trip.author_id) {
                        PointsCore.onFavorited(trip.author_id, user.id, tripId, 'template').catch(() => {});
                    }

                    // 更新计数
                    if (isCloud) {
                        const { data: tpl } = await supabase
                            .from('trip_templates')
                            .select('favorites')
                            .eq('id', tripId)
                            .single();
                        if (tpl) {
                            await supabase
                                .from('trip_templates')
                                .update({ favorites: (tpl.favorites || 0) + 1 })
                                .eq('id', tripId);
                        }
                    }
                }
            };
        }

        // 投票按钮
        const voteBtn = document.getElementById('previewVoteBtn');
        if (voteBtn) {
            voteBtn.onclick = () => {
                const trip = this.template;
                if (!trip || !trip.cloudId && !trip.id) return;
                const tripId = trip.cloudId || trip.id;
                const isCloud = !!trip.cloudId || trip.author_id;
                if (!isCloud) {
                    if (typeof UiKit !== 'undefined') UiKit.toast('该内容暂不支持投票', 'info');
                    return;
                }
                if (typeof Voting !== 'undefined') {
                    Voting.openVoteDialog(tripId, 'template', trip.title || '');
                }
            };
        }

        // 底部收藏按钮
        const favBottomBtn = document.getElementById('previewFavBottomBtn');
        if (favBottomBtn) {
            favBottomBtn.onclick = () => {
                const favBtn = document.getElementById('previewFavBtn');
                if (favBtn) favBtn.click();
            };
        }

        // 顶部英雄区域滚动折叠
        const previewScroll = document.querySelector('.preview-scroll');
        const previewHero = document.getElementById('previewHero');
        if (previewScroll && previewHero) {
            previewScroll.addEventListener('scroll', () => {
                const scrollTop = previewScroll.scrollTop;
                if (scrollTop > 50) {
                    previewHero.classList.add('collapsed');
                } else {
                    previewHero.classList.remove('collapsed');
                }
            });
        }

        // 初始化点赞/收藏按钮状态
        this._initLikeFavStatus();
    },

    async _initLikeFavStatus() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn() || typeof supabase === 'undefined') return;
        const trip = this.template;
        if (!trip) return;
        const tripId = trip.cloudId || trip.id;
        if (!tripId) return;
        const user = Auth.getCurrentUser();

        try {
            // 检查点赞状态
            const { data: likeData } = await supabase
                .from('likes')
                .select('id')
                .eq('user_id', user.id)
                .eq('target_id', tripId)
                .eq('target_type', 'template')
                .maybeSingle();
            const likeBtn = document.getElementById('previewLikeBtn');
            if (likeBtn) likeBtn.textContent = likeData ? '❤️' : '🤍';

            // 检查收藏状态
            const { data: favData } = await supabase
                .from('favorites')
                .select('id')
                .eq('user_id', user.id)
                .eq('target_id', tripId)
                .eq('target_type', 'template')
                .maybeSingle();
            const favBtn = document.getElementById('previewFavBtn');
            const favBottomBtn = document.getElementById('previewFavBottomBtn');
            const isFav = !!favData;
            if (favBtn) favBtn.textContent = isFav ? '❤️' : '🤍';
            if (favBottomBtn) {
                favBottomBtn.querySelector('.pbf-icon').textContent = isFav ? '❤️' : '🤍';
                favBottomBtn.classList.toggle('favorited', isFav);
            }
        } catch (e) {
            console.warn('[TemplatePreview] 初始化点赞收藏状态失败:', e);
        }
    },
};

function _createPreviewMarker(num, active) {
    const bg = active ? '#FF5500' : '#FF7B3D';
    const scale = active ? 'scale(1.2)' : 'scale(1)';
    return `<div style="position:relative;transform:${scale};transform-origin:bottom center;transition:transform 0.2s;">
        <div style="width:32px;height:40px;background:${bg};border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(255,123,61,0.5);display:flex;align-items:center;justify-content:center;">
            <div style="transform:rotate(45deg);color:#fff;font-size:13px;font-weight:800;font-family:system-ui;">${num}</div>
        </div>
    </div>`;
}
