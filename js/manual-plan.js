/* ============================================================
   ManualPlan - 手动规划热门景点选择页
   ============================================================ */

(function() {

const MP_EMOJI_MAP = [
    { re: /美食|餐厅|小吃|餐饮|food|restaurant/i, emoji: '🍜' },
    { re: /酒店|住宿|hotel/i, emoji: '🏨' },
    { re: /购物|商场|shopping|mall/i, emoji: '🛍️' },
    { re: /公园|自然|山|湖|nature|park|mountain|风景/i, emoji: '🏞️' },
    { re: /博物馆|museum|历史|古迹/i, emoji: '🏛️' },
    { re: /寺|庙|temple/i, emoji: '⛩️' },
    { re: /海滩|海|beach|sea/i, emoji: '🏖️' },
    { re: /咖啡|coffee|cafe/i, emoji: '☕' },
    { re: /娱乐|乐园|游乐园/i, emoji: '🎢' },
    { re: /动物|zoo/i, emoji: '🐼' },
];

function mpGetEmoji(typeOrName) {
    const s = (typeOrName || '');
    for (const m of MP_EMOJI_MAP) if (m.re.test(s)) return m.emoji;
    return '📍';
}

function mpGetTypeName(type) {
    if (!type) return '景点';
    if (/风景名胜|公园/.test(type)) return '景点';
    if (/餐饮服务|中餐厅|外国餐厅|小吃|快餐店/.test(type)) return '美食';
    if (/购物服务|商场|步行街/.test(type)) return '购物';
    if (/住宿服务|酒店/.test(type)) return '住宿';
    if (/体育休闲|娱乐场所|游乐园/.test(type)) return '娱乐';
    if (/博物馆|展览馆/.test(type)) return '博物馆';
    return '景点';
}

const FILTER_PREFS = {
    all: [],
    classic: ['history'],
    food: ['food'],
    photo: ['photo'],
    nature: ['nature'],
    niche: ['niche'],
};

window.ManualPlan = {
    city: '',
    selectedSpots: new Map(),
    currentFilter: 'all',
    pois: [],
    isLoading: false,
    _eventsBound: false,

    open(city) {
        this.city = city || '';
        this.selectedSpots.clear();
        this.currentFilter = 'all';
        this.pois = [];

        document.getElementById('mpNavCity').textContent = this.city;

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById('manualPlanPage');
        page.style.display = 'flex';
        page.classList.add('active');
        document.getElementById('bottomTabBar').style.display = 'none';

        this._bindEvents();

        document.querySelectorAll('.mp-filter-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.mp-filter-chip[data-filter="all"]').classList.add('active');

        this.loadCommunityTemplates();
        this.loadHotSpots(this.city, 'all');
        this.updateBottomBar();
    },

    close() {
        const page = document.getElementById('manualPlanPage');
        page.classList.remove('active');
        page.style.display = 'none';
        App.goBack();
    },

    _bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        document.querySelectorAll('.mp-filter-chip').forEach(chip => {
            chip.onclick = () => {
                document.querySelectorAll('.mp-filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentFilter = chip.dataset.filter;
                this.loadHotSpots(this.city, this.currentFilter);
                document.getElementById('mpScrollArea').scrollTop = 0;
            };
        });

        document.getElementById('mpGenBtn').onclick = () => this.generateTrip();
    },

    loadCommunityTemplates() {
        const templates = AIMemory.getCommunityTemplates();
        const cityNorm = this.city.trim().toLowerCase().replace(/市$/, '');
        const matched = templates
            .filter(t => {
                const tc = (t.city || t.destination || '').trim().toLowerCase().replace(/市$/, '');
                return tc.includes(cityNorm) || cityNorm.includes(tc);
            })
            .sort((a, b) => (b.copies || 0) - (a.copies || 0))
            .slice(0, 3);

        this.renderCommunityTemplates(matched);
    },

    renderCommunityTemplates(templates) {
        const container = document.getElementById('mpTplScroll');
        if (!templates || templates.length === 0) {
            container.innerHTML = `<div class="mp-tpl-empty"><span>🗺️</span><span>暂无当地行程模板，试试下方热门景点吧</span></div>`;
            return;
        }
        let html = '';
        templates.forEach(t => {
            const tags = (t.tags || []).slice(0, 2).map(tag => `#${tag}`).join(' ');
            html += `<div class="mp-tpl-card" data-tpl="${t.id}">
                <button class="mp-tpl-preview-btn" data-tpl="${t.id}">预览</button>
                <div class="mp-tpl-cover">${t.cover || '🗺️'}</div>
                <div class="mp-tpl-name">${t.title}</div>
                <div class="mp-tpl-meta">
                    <span>${t.days || 1}天</span>
                    <span class="dot">·</span>
                    <span>${t.copies || 0}人套用</span>
                </div>
                <div class="mp-tpl-author">${t.avatar || '👤'} ${t.author || '匿名'}</div>
            </div>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.mp-tpl-card').forEach(card => {
            card.onclick = (e) => {
                if (e.target.classList.contains('mp-tpl-preview-btn')) return;
                TemplatePreview.open(card.dataset.tpl);
            };
        });
        container.querySelectorAll('.mp-tpl-preview-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                TemplatePreview.open(btn.dataset.tpl);
            };
        });
    },

    async loadHotSpots(city, filter) {
        this.isLoading = true;
        this._renderLoading();

        try {
            const prefs = FILTER_PREFS[filter] || [];
            const pois = await MapModule.searchCityPOIs(city, prefs);
            this.pois = (pois || []).slice(0, 30);
            if (this.pois.length === 0) {
                this._renderEmpty();
            } else {
                this.renderSpotsList();
            }
        } catch (err) {
            console.error('ManualPlan loadHotSpots error:', err);
            this._renderError();
        } finally {
            this.isLoading = false;
        }
    },

    _renderLoading() {
        const list = document.getElementById('mpSpotsList');
        let html = '';
        for (let i = 0; i < 6; i++) {
            html += `<div class="mp-skeleton">
                <div class="mp-sk-emoji"></div>
                <div class="mp-sk-lines">
                    <div class="mp-sk-line"></div>
                    <div class="mp-sk-line short"></div>
                </div>
                <div class="mp-sk-emoji" style="width:24px;height:24px;border-radius:50%;"></div>
            </div>`;
        }
        list.innerHTML = html;
    },

    _renderEmpty() {
        document.getElementById('mpSpotsList').innerHTML = `
            <div class="mp-state">
                <div class="mp-state-icon">🔍</div>
                <div class="mp-state-text">暂无相关景点，换个分类试试</div>
            </div>`;
    },

    _renderError() {
        document.getElementById('mpSpotsList').innerHTML = `
            <div class="mp-state">
                <div class="mp-state-icon">😵</div>
                <div class="mp-state-text">加载失败，请检查网络</div>
                <button class="mp-retry-btn" onclick="ManualPlan.loadHotSpots(ManualPlan.city, ManualPlan.currentFilter)">点击重试</button>
            </div>`;
    },

    renderSpotsList() {
        const list = document.getElementById('mpSpotsList');
        let html = '';
        this.pois.forEach((poi, idx) => {
            const emoji = mpGetEmoji(poi.type || poi.name);
            const typeName = mpGetTypeName(poi.type);
            const rating = poi.rating ? `⭐ ${poi.rating.toFixed(1)}` : '';
            const selected = this.selectedSpots.has(poi.name);
            html += `<div class="mp-spot-card ${selected ? 'selected' : ''}" data-idx="${idx}">
                <div class="mp-spot-emoji">${emoji}</div>
                <div class="mp-spot-info">
                    <div class="mp-spot-name">${poi.name}</div>
                    <div class="mp-spot-meta">
                        <span class="mp-spot-type-tag">${typeName}</span>
                        ${rating ? `<span class="mp-spot-rating">${rating}</span>` : ''}
                        ${poi.address ? `<span class="mp-spot-addr">${poi.address}</span>` : ''}
                    </div>
                </div>
                <div class="mp-checkbox">
                    <span class="mp-check-icon">✓</span>
                </div>
            </div>`;
        });
        list.innerHTML = html;

        list.querySelectorAll('.mp-spot-card').forEach(card => {
            card.onclick = () => {
                const idx = parseInt(card.dataset.idx);
                this.toggleSpot(this.pois[idx], card);
            };
        });
    },

    toggleSpot(poi, cardEl) {
        if (this.selectedSpots.has(poi.name)) {
            this.selectedSpots.delete(poi.name);
            cardEl.classList.remove('selected');
        } else {
            this.selectedSpots.set(poi.name, poi);
            cardEl.classList.add('selected');
        }
        this.updateBottomBar();
    },

    updateBottomBar() {
        const n = this.selectedSpots.size;
        const countEl = document.getElementById('mpSelectedCount');
        const btn = document.getElementById('mpGenBtn');
        if (n === 0) {
            countEl.textContent = '未选择景点';
            btn.disabled = true;
        } else {
            countEl.textContent = `已选 ${n} 个景点`;
            btn.disabled = false;
        }
    },

    async generateTrip() {
        if (this.selectedSpots.size === 0) return;

        const spots = Array.from(this.selectedSpots.values());
        const trip = {
            id: 'manual_' + Date.now(),
            title: this.city + '自由行',
            destination: this.city,
            city: this.city,
            days: 1,
            dayPlans: [],
            createdAt: Date.now(),
            source: 'manual',
        };

        const START_MIN = 540;
        const DURATION = 90;
        const GAP = 30;
        const DAY_END = 1380;

        let dayIdx = 0;
        let daySpots = [];
        let curStart = START_MIN;

        spots.forEach((poi, i) => {
            if (curStart + DURATION > DAY_END) {
                trip.dayPlans.push({ day: dayIdx + 1, theme: `Day ${dayIdx + 1}`, spots: daySpots });
                dayIdx++;
                daySpots = [];
                curStart = START_MIN;
            }
            const spotEnd = curStart + DURATION;
            const typeName = mpGetTypeName(poi.type);
            const emoji = mpGetEmoji(poi.type || poi.name);
            daySpots.push({
                name: poi.name,
                type: typeName,
                emoji: emoji,
                lng: poi.lng,
                lat: poi.lat,
                address: poi.address || '',
                rating: poi.rating || '',
                cost: '',
                duration: '1.5小时',
                startMin: curStart,
                endMin: spotEnd,
                intro: poi.address || '',
                desc: poi.address || '',
            });
            curStart = spotEnd + GAP;
        });

        if (daySpots.length > 0) {
            trip.dayPlans.push({ day: dayIdx + 1, theme: `Day ${dayIdx + 1}`, spots: daySpots });
        }

        trip.days = trip.dayPlans.length;

        const saveResult = await App.saveTripWithLimitCheck(trip);
        if (!saveResult) return; // 达上限且用户未处理，中止
        const tripId = saveResult.id;

        const page = document.getElementById('manualPlanPage');
        page.classList.remove('active');
        page.style.display = 'none';

        App.pageStack = ['trips', 'trip-detail'];
        TripDetail.open(trip, tripId);
        UIRender.showToast(`已生成「${this.city}自由行」，共${spots.length}个景点 🎉`);
    },
};

})();
