const App = {
    destinations: [],
    selectedPrefs: [],
    customPrefs: JSON.parse(localStorage.getItem('trip_custom_prefs') || '[]'),
    selectedPeople: '1',
    selectedBudget: 'economy',
    startDate: null,
    endDate: null,
    tripData: null,
    currentTripId: null,
    currentTab: 'home',
    drawerTab: 'overview',
    currentDay: 1,
    drawerExpanded: false,
    nlApplied: false,
    scrollThresholdReached: false,
    pageStack: ['home'],

    DEFAULT_PREFS: [
        { id: 'classic', label: '经典必玩', emoji: '⭐' },
        { id: 'food', label: '吃吃喝喝', emoji: '🍜' },
        { id: 'niche', label: '小众秘境', emoji: '🔍' },
        { id: 'photo', label: '拍照出片', emoji: '📸' },
        { id: 'nature', label: '自然风光', emoji: '🏞️' },
        { id: 'shopping', label: '逛街购物', emoji: '🛍️' },
        { id: 'bar', label: '酒吧夜生活', emoji: '🍸' },
        { id: 'hike', label: '徒步登山', emoji: '🥾' },
        { id: 'history', label: '历史人文', emoji: '🏛️' },
        { id: 'art', label: '艺术展览', emoji: '🎨' },
        { id: 'beach', label: '海边度假', emoji: '🏖️' },
        { id: 'relax', label: '休闲放松', emoji: '😌' },
    ],

    init() {
        this.renderPrefTags();
        this.updateBtnState();
        this.setupInputListeners();
        HomeModule.render();
        ProfileModule.restoreTheme();
        // 下拉刷新
        const tripsScroll = document.querySelector('#tripsPage .page-scroll');
        if (tripsScroll) {
            this.initPullToRefresh(tripsScroll, async () => {
                TripsModule.render();
                await this.delay(300);
                UIRender.showToast('已刷新行程列表');
            });
        }
        const homeScroll = document.querySelector('#homePage .home-scroll');
        if (homeScroll) {
            this.initPullToRefresh(homeScroll, async () => {
                HomeModule.render();
                await this.delay(300);
            });
        }
        // ===== 社区化升级：启动认证模块 =====
        if (typeof Auth !== 'undefined') {
            Auth.init().catch(e => console.warn('[Auth] 初始化失败:', e));
            EventBus.on('auth:changed', (payload) => this.onAuthChanged(payload));
            EventBus.on('auth:logout', () => this.onAuthChanged({ user: null, event: 'SIGNED_OUT' }));
            EventBus.on('community:refresh', () => {
                if (typeof CommunityModule !== 'undefined' && CommunityModule.renderWaterfall) {
                    CommunityModule.renderWaterfall();
                }
            });
        }
        // ===== Phase 3.1：积分/等级事件监听 =====
        this._bindPointsEvents();

        // ===== 网络恢复时触发云端同步 =====
        window.addEventListener('online', () => {
            if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                const user = Auth.getCurrentUser();
                if (user && typeof TripStorage !== 'undefined') {
                    TripStorage.syncFromCloud(user.id).then(r => {
                        if (r.merged > 0 || r.uploaded > 0) {
                            UiKit.toast(`已同步 ${r.merged + r.uploaded} 条行程`, 'success');
                            if (typeof TripsModule !== 'undefined') TripsModule.render();
                        }
                    }).catch(e => console.warn('[App] 网络恢复同步失败:', e?.message));
                }
            }
        });
    },

    // 积分变动与升级事件监听
    _bindPointsEvents() {
        if (typeof EventBus === 'undefined') return;
        // 积分变动 toast：仅当前登录用户本人获得正积分时提示
        EventBus.on('points:changed', ({ userId, delta, reason, newPoints }) => {
            if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
            const me = Auth.getCurrentUser();
            if (!me || me.id !== userId) return; // 仅提示自己
            if (delta <= 0) return; // 仅正积分
            // 静默原因（自己浏览、自己打卡）不弹 toast
            const silentReasons = ['viewed'];
            if (silentReasons.includes(reason)) return;
            const reasonText = this._pointsReasonText(reason);
            UiKit.toast(`+${delta} 积分 · ${reasonText}`, 'success', 2000);
            // 同步刷新顶部积分显示
            const pointsEl = document.getElementById('userPoints');
            if (pointsEl) pointsEl.textContent = newPoints;
            // 更新当前 user 对象缓存
            if (me.points !== undefined) me.points = newPoints;
        });
        // 升级事件：弹窗提示
        EventBus.on('level:up', ({ userId, newLevel, oldLevel }) => {
            if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
            const me = Auth.getCurrentUser();
            if (!me || me.id !== userId) return;
            UiKit.toast(`🎉 恭喜升至 Lv.${newLevel}！`, 'success', 3000);
            // 同步等级
            me.level = newLevel;
            try { ProfileModule.render(); } catch(e) {}
        });
    },

    // 积分原因中文（与 PointsLedger 保持一致）
    _pointsReasonText(reason) {
        const map = {
            liked: '内容被点赞',
            favorited: '内容被收藏',
            adopted: '行程被套用',
            followed: '被新用户关注',
            checkin_field: '实地打卡',
            checkin_cloud: '云打卡',
            roast: '发布吐槽',
            roast_liked: '吐槽被点赞',
            roast_favorited: '吐槽被收藏',
        };
        return map[reason] || '积分变动';
    },

    // 认证状态变化处理：更新问候语 + 头像
    onAuthChanged({ user, event }) {
        const avatarEl = document.getElementById('homeAvatar');
        const greetingHiEl = document.getElementById('greetingHi');
        if (user) {
            const name = user.username || '旅行者';
            if (avatarEl) {
                avatarEl.innerHTML = `<span style="font-size:20px;font-weight:800;color:#fff;">${(name[0] || 'U').toUpperCase()}</span>`;
                avatarEl.classList.add('logged-in');
            }
            if (greetingHiEl) greetingHiEl.textContent = `你好，${name} 👋`;
            // 登录成功事件时刷新首页 + 个人页
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                try { HomeModule.render(); } catch(e) {}
                try { ProfileModule.render(); } catch(e) {}
                // 初始化新手任务
                try { if (typeof NewbieTasks !== 'undefined') NewbieTasks.init(); } catch(e) {}
                // Phase 5.1：初始化投票签到状态
                try { if (typeof Voting !== 'undefined') Voting.init(); } catch(e) {}
                // 云端同步：登录后拉取云端行程 + 上传本地待同步
                if (typeof TripStorage !== 'undefined' && user.id) {
                    TripStorage.syncFromCloud(user.id).then(r => {
                        if (r.merged > 0 || r.uploaded > 0) {
                            UiKit.toast(`已同步 ${r.merged + r.uploaded} 条行程`, 'success');
                            if (typeof TripsModule !== 'undefined') TripsModule.render();
                        }
                    }).catch(e => console.warn('[App] 云端同步失败:', e?.message));
                }
            }
        } else {
            if (avatarEl) {
                avatarEl.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
                avatarEl.classList.remove('logged-in');
            }
            if (greetingHiEl) greetingHiEl.textContent = '你好，旅行者 👋';
            try { ProfileModule.render(); } catch(e) {}
            try { if (typeof NewbieTasks !== 'undefined') NewbieTasks.reset(); } catch(e) {}
        }
    },

    // 顶部头像点击：未登录触发登录模态框，已登录跳转个人主页
    async handleAvatarClick() {
        if (typeof Auth === 'undefined') {
            this.switchTab('profile');
            return;
        }
        if (Auth.isLoggedIn()) {
            this.switchTab('profile');
            return;
        }
        const ok = await Auth.requireAuth();
        if (ok) {
            this.switchTab('profile');
        }
    },

    setupInputListeners() {
        const input = document.getElementById('destInput');
        input.addEventListener('input', () => this.onDestInput());
        input.addEventListener('keydown', (e) => this.onDestKeydown(e));
        input.addEventListener('focus', () => this.onDestFocus());
        input.addEventListener('blur', () => this.onDestBlur());
        
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => MapModule.toggleFullscreen());
        }
    },

    onDestInput() {
        const input = document.getElementById('destInput');
        const val = input.value.trim();
        
        if (val.length > 0 || this.destinations.length > 0) {
            this.showExtraSections();
            document.getElementById('capsuleInputCard').classList.add('expanded');
        } else {
            this.hideExtraSections();
            document.getElementById('capsuleInputCard').classList.remove('expanded');
        }
        
        if (val.length === 0) {
            this._renderHotCities();
            this._hidePoiSection();
        } else {
            this._updateDropdown(val);
            if (!this.nlApplied && val.length >= 2) {
                this.tryParseNaturalLanguage(val);
            }
        }
        
        this.updateBtnState();
    },

    tryParseNaturalLanguage(text) {
        const parsed = AIPlanner.parseNaturalLanguage(text);
        
        if (parsed.destinations.length > 0) {
            const hasDestination = this.destinations.some(d => 
                parsed.destinations.some(pd => d.includes(pd) || pd.includes(d))
            );
            
            if (!hasDestination) {
                let infoParts = [];
                
                if (parsed.startDate) {
                    this.startDate = parsed.startDate;
                    if (parsed.endDate) this.endDate = parsed.endDate;
                    
                    const dateText = CalendarModule.formatDateShort(parsed.startDate);
                    if (parsed.days && parsed.days > 1) {
                        this.endDate = new Date(parsed.startDate);
                        this.endDate.setDate(this.endDate.getDate() + parsed.days - 1);
                    }
                    document.getElementById('dateText').textContent = 
                        dateText + (this.endDate ? ' 至 ' + CalendarModule.formatDateShort(this.endDate) : '');
                    document.getElementById('dateText').classList.add('selected');
                    infoParts.push('📅 已识别日期');
                }
                
                if (parsed.days && !parsed.startDate) {
                    const days = parsed.days;
                    this.startDate = new Date();
                    this.endDate = new Date();
                    this.endDate.setDate(this.endDate.getDate() + days - 1);
                    document.getElementById('dateText').textContent = 
                        CalendarModule.formatDateShort(this.startDate) + ' 至 ' + CalendarModule.formatDateShort(this.endDate);
                    document.getElementById('dateText').classList.add('selected');
                    infoParts.push(`📅 ${days}天行程`);
                }

                if (parsed.prefs.length > 0) {
                    parsed.prefs.forEach(p => {
                        if (!this.selectedPrefs.includes(p)) {
                            this.selectedPrefs.push(p);
                            const btn = document.querySelector(`.pref-tag-btn[data-pref="${p}"]`);
                            if (btn) btn.classList.add('selected');
                        }
                    });
                    infoParts.push('🎯 已选择偏好');
                }

                this.showNlSuggestions(parsed, infoParts);
                this.nlApplied = true;
            }
        }
    },

    showNlSuggestions(parsed, infoParts) {
        let container = document.querySelector('.nl-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.className = 'nl-suggestions';
            document.querySelector('.input-scroll').insertBefore(
                container, document.getElementById('extraSections')
            );
        }

        const destText = parsed.destinations.length > 1
            ? parsed.destinations.join('→')
            : parsed.destinations[0];

        container.innerHTML = `
            <div class="nl-suggestion-chip" onclick="App.applyNlDestinations()">
                ✨ 添加「${destText}」为目的地 ${infoParts.length > 0 ? '(' + infoParts.join(' ') + ')' : ''}
            </div>
        `;
    },

    hideNlSuggestions() {
        const container = document.querySelector('.nl-suggestions');
        if (container) container.remove();
    },

    applyNlDestinations() {
        const input = document.getElementById('destInput');
        const val = input.value.trim();
        if (!val) return;

        const parsed = AIPlanner.parseNaturalLanguage(val);
        if (parsed.destinations.length > 0) {
            parsed.destinations.forEach(city => {
                if (!this.destinations.includes(city)) {
                    this.destinations.push(city);
                }
            });
            UIRender.renderDestTags();
            input.value = '';
            this.hideNlSuggestions();
            this.showExtraSections();
            document.getElementById('capsuleInputCard').classList.add('expanded');
            this.updateBtnState();
        }
    },

    onDestKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.addDestination();
        }
    },

    addDestination() {
        const input = document.getElementById('destInput');
        const val = input.value.trim();
        if (!val) return;
        
        if (this.destinations.includes(val)) {
            input.value = '';
            return;
        }
        
        this.destinations.push(val);
        UIRender.renderDestTags();
        input.value = '';
        this.showExtraSections();
        document.getElementById('capsuleInputCard').classList.add('expanded');
        this.hideNlSuggestions();
        this.updateBtnState();
    },

    addSuggestionDestination(name) {
        document.getElementById('destInput').value = name;
        this.addDestination();
        AutocompleteModule.hideDropdown();
    },

    addCustomDestination(text) {
        document.getElementById('destInput').value = text;
        this.addDestination();
        AutocompleteModule.hideDropdown();
    },

    removeDestination(index) {
        this.destinations.splice(index, 1);
        UIRender.renderDestTags();
        if (this.destinations.length === 0) {
            this.hideExtraSections();
            document.getElementById('capsuleInputCard').classList.remove('expanded');
        }
        this.updateBtnState();
    },

    showExtraSections() {
        document.getElementById('extraSections').style.display = 'block';
        document.getElementById('bottomBtns').style.display = 'flex';
    },

    hideExtraSections() {
        document.getElementById('extraSections').style.display = 'none';
        document.getElementById('bottomBtns').style.display = 'none';
    },

    resetPlanForm() {
        this.destinations = [];
        this.selectedPrefs = [];
        this.selectedPeople = '1';
        this.selectedBudget = 'economy';
        this.selectedTransport = null;
        this.selectedHotel = null;
        this.selectedPace = 'moderate';
        this.selectedCompanions = [];
        this.startDate = null;
        this.endDate = null;
        document.getElementById('destInput').value = '';
        document.getElementById('capsuleInputCard').classList.remove('expanded');
        document.querySelectorAll('.pref-tag-btn').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('#peopleChips .opt-chip').forEach(c => c.classList.toggle('active', c.dataset.people === '1'));
        document.querySelectorAll('#budgetChips .opt-chip').forEach(c => c.classList.toggle('active', c.dataset.budget === 'economy'));
        document.querySelectorAll('#paceChips .opt-chip').forEach(c => c.classList.toggle('active', c.dataset.pace === 'moderate'));
        document.querySelectorAll('#transportChips .opt-chip').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('#hotelChips .opt-chip').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('#companionChips .opt-chip').forEach(c => c.classList.remove('active'));
        const moreContent = document.getElementById('moreSettingsContent');
        const moreWrap = document.querySelector('.more-settings');
        const moreIcon = document.getElementById('moreSettingsIcon');
        if (moreContent) moreContent.style.display = 'none';
        if (moreWrap) moreWrap.classList.remove('expanded');
        if (moreIcon) moreIcon.textContent = '▼';
        UIRender.renderDestTags();
        this.hideExtraSections();
        AutocompleteModule.hideDropdown();
        this.hideNlSuggestions();
        this.updateBtnState();
    },

    _allCities: [
        { name: '北京', pinyin: 'beijing', tag: '帝都文化', hot: true, province: '北京' },
        { name: '上海', pinyin: 'shanghai', tag: '魔都繁华', hot: true, province: '上海' },
        { name: '广州', pinyin: 'guangzhou', tag: '南国花城', hot: true, province: '广东' },
        { name: '深圳', pinyin: 'shenzhen', tag: '科技之城', hot: true, province: '广东' },
        { name: '成都', pinyin: 'chengdu', tag: '美食天堂', hot: true, province: '四川' },
        { name: '杭州', pinyin: 'hangzhou', tag: '江南水乡', hot: true, province: '浙江' },
        { name: '西安', pinyin: 'xian', tag: '千年古都', hot: true, province: '陕西' },
        { name: '重庆', pinyin: 'chongqing', tag: '8D魔幻', hot: true, province: '重庆' },
        { name: '厦门', pinyin: 'xiamen', tag: '文艺海岛', hot: true, province: '福建' },
        { name: '大理', pinyin: 'dali', tag: '风花雪月', hot: true, province: '云南' },
        { name: '三亚', pinyin: 'sanya', tag: '热带海岛', hot: true, province: '海南' },
        { name: '南京', pinyin: 'nanjing', tag: '六朝古都', hot: true, province: '江苏' },
        { name: '苏州', pinyin: 'suzhou', tag: '园林之城', hot: true, province: '江苏' },
        { name: '青岛', pinyin: 'qingdao', tag: '海滨避暑', hot: true, province: '山东' },
        { name: '长沙', pinyin: 'changsha', tag: '娱乐之都', hot: true, province: '湖南' },
        { name: '武汉', pinyin: 'wuhan', tag: '江城美食', hot: false, province: '湖北' },
        { name: '天津', pinyin: 'tianjin', tag: '曲艺之乡', hot: false, province: '天津' },
        { name: '南京', pinyin: 'nanjing', tag: '六朝古都', hot: false, province: '江苏' },
        { name: '苏州', pinyin: 'suzhou', tag: '园林之城', hot: false, province: '江苏' },
        { name: '无锡', pinyin: 'wuxi', tag: '太湖明珠', hot: false, province: '江苏' },
        { name: '宁波', pinyin: 'ningbo', tag: '海港名城', hot: false, province: '浙江' },
        { name: '温州', pinyin: 'wenzhou', tag: '民营之都', hot: false, province: '浙江' },
        { name: '福州', pinyin: 'fuzhou', tag: '有福之州', hot: false, province: '福建' },
        { name: '泉州', pinyin: 'quanzhou', tag: '海上丝路', hot: false, province: '福建' },
        { name: '合肥', pinyin: 'hefei', tag: '包拯故里', hot: false, province: '安徽' },
        { name: '黄山', pinyin: 'huangshan', tag: '天下奇山', hot: false, province: '安徽' },
        { name: '南昌', pinyin: 'nanchang', tag: '英雄之城', hot: false, province: '江西' },
        { name: '九江', pinyin: 'jiujiang', tag: '庐山脚下', hot: false, province: '江西' },
        { name: '济南', pinyin: 'jinan', tag: '泉城', hot: false, province: '山东' },
        { name: '烟台', pinyin: 'yantai', tag: '葡萄酒城', hot: false, province: '山东' },
        { name: '威海', pinyin: 'weihai', tag: '最干净的海', hot: false, province: '山东' },
        { name: '郑州', pinyin: 'zhengzhou', tag: '中原枢纽', hot: false, province: '河南' },
        { name: '洛阳', pinyin: 'luoyang', tag: '牡丹花城', hot: false, province: '河南' },
        { name: '开封', pinyin: 'kaifeng', tag: '北宋都城', hot: false, province: '河南' },
        { name: '太原', pinyin: 'taiyuan', tag: '晋祠故里', hot: false, province: '山西' },
        { name: '大同', pinyin: 'datong', tag: '云冈石窟', hot: false, province: '山西' },
        { name: '石家庄', pinyin: 'shijiazhuang', tag: '燕赵之地', hot: false, province: '河北' },
        { name: '秦皇岛', pinyin: 'qinhuangdao', tag: '避暑胜地', hot: false, province: '河北' },
        { name: '承德', pinyin: 'chengde', tag: '避暑山庄', hot: false, province: '河北' },
        { name: '沈阳', pinyin: 'shenyang', tag: '满清故都', hot: false, province: '辽宁' },
        { name: '大连', pinyin: 'dalian', tag: '北方明珠', hot: false, province: '辽宁' },
        { name: '长春', pinyin: 'changchun', tag: '汽车之城', hot: false, province: '吉林' },
        { name: '哈尔滨', pinyin: 'haerbin', tag: '冰雪世界', hot: false, province: '黑龙江' },
        { name: '呼和浩特', pinyin: 'huhehaote', tag: '青城', hot: false, province: '内蒙古' },
        { name: '包头', pinyin: 'baotou', tag: '草原钢城', hot: false, province: '内蒙古' },
        { name: '兰州', pinyin: 'lanzhou', tag: '拉面之城', hot: false, province: '甘肃' },
        { name: '敦煌', pinyin: 'dunhuang', tag: '丝路明珠', hot: false, province: '甘肃' },
        { name: '西宁', pinyin: 'xining', tag: '夏都', hot: false, province: '青海' },
        { name: '银川', pinyin: 'yinchuan', tag: '塞上江南', hot: false, province: '宁夏' },
        { name: '乌鲁木齐', pinyin: 'wulumuqi', tag: '西域风情', hot: false, province: '新疆' },
        { name: '喀什', pinyin: 'kashi', tag: '西域古城', hot: false, province: '新疆' },
        { name: '拉萨', pinyin: 'lasa', tag: '日光之城', hot: false, province: '西藏' },
        { name: '成都', pinyin: 'chengdu', tag: '天府之国', hot: false, province: '四川' },
        { name: '九寨沟', pinyin: 'jiuzhaigou', tag: '童话世界', hot: false, province: '四川' },
        { name: '乐山', pinyin: 'leshan', tag: '大佛', hot: false, province: '四川' },
        { name: '贵阳', pinyin: 'guiyang', tag: '避暑之都', hot: false, province: '贵州' },
        { name: '遵义', pinyin: 'zunyi', tag: '酒乡', hot: false, province: '贵州' },
        { name: '昆明', pinyin: 'kunming', tag: '春城', hot: false, province: '云南' },
        { name: '丽江', pinyin: 'lijiang', tag: '古城艳遇', hot: false, province: '云南' },
        { name: '香格里拉', pinyin: 'xianggelila', tag: '心中日月', hot: false, province: '云南' },
        { name: '西双版纳', pinyin: 'xishuangbanna', tag: '热带雨林', hot: false, province: '云南' },
        { name: '南宁', pinyin: 'nanning', tag: '绿城', hot: false, province: '广西' },
        { name: '桂林', pinyin: 'guilin', tag: '山水甲天下', hot: false, province: '广西' },
        { name: '北海', pinyin: 'beihai', tag: '银滩海风', hot: false, province: '广西' },
        { name: '海口', pinyin: 'haikou', tag: '椰城', hot: false, province: '海南' },
        { name: '贵阳', pinyin: 'guiyang', tag: '林城', hot: false, province: '贵州' },
        { name: '遵义', pinyin: 'zunyi', tag: '红色之城', hot: false, province: '贵州' },
        { name: '六盘水', pinyin: 'liupanshui', tag: '凉都', hot: false, province: '贵州' },
        { name: '绵阳', pinyin: 'mianyang', tag: '科技之城', hot: false, province: '四川' },
        { name: '宜宾', pinyin: 'yibin', tag: '万里长江第一城', hot: false, province: '四川' },
        { name: '南充', pinyin: 'nanchong', tag: '绸都', hot: false, province: '四川' },
        { name: '德阳', pinyin: 'deyang', tag: '重装之都', hot: false, province: '四川' },
        { name: '自贡', pinyin: 'zigong', tag: '盐都', hot: false, province: '四川' },
        { name: '泸州', pinyin: 'luzhou', tag: '酒城', hot: false, province: '四川' },
        { name: '达州', pinyin: 'dazhou', tag: '巴人故里', hot: false, province: '四川' },
        { name: '眉山', pinyin: 'meishan', tag: '东坡故里', hot: false, province: '四川' },
        { name: '雅安', pinyin: 'yaan', tag: '雨城', hot: false, province: '四川' },
        { name: '广安', pinyin: 'guangan', tag: '小平故里', hot: false, province: '四川' },
        { name: '遂宁', pinyin: 'suining', tag: '观音故里', hot: false, province: '四川' },
        { name: '巴中', pinyin: 'bazhong', tag: '红军之乡', hot: false, province: '四川' },
        { name: '资阳', pinyin: 'ziyang', tag: '三贤故里', hot: false, province: '四川' },
        { name: '攀枝花', pinyin: 'panzhihua', tag: '钒钛之都', hot: false, province: '四川' },
        { name: '广元', pinyin: 'guangyuan', tag: '女皇故里', hot: false, province: '四川' },
        { name: '台州', pinyin: 'taizhou', tag: '山海之城', hot: false, province: '浙江' },
        { name: '嘉兴', pinyin: 'jiaxing', tag: '南湖红船', hot: false, province: '浙江' },
        { name: '金华', pinyin: 'jinhua', tag: '小商品城', hot: false, province: '浙江' },
        { name: '绍兴', pinyin: 'shaoxing', tag: '鲁迅故里', hot: false, province: '浙江' },
        { name: '湖州', pinyin: 'huzhou', tag: '太湖之滨', hot: false, province: '浙江' },
        { name: '丽水', pinyin: 'lishui', tag: '秀山丽水', hot: false, province: '浙江' },
        { name: '衢州', pinyin: 'quzhou', tag: '南孔圣地', hot: false, province: '浙江' },
        { name: '舟山', pinyin: 'zhoushan', tag: '千岛之城', hot: false, province: '浙江' },
        { name: '常州', pinyin: 'changzhou', tag: '龙城', hot: false, province: '江苏' },
        { name: '徐州', pinyin: 'xuzhou', tag: '五省通衢', hot: false, province: '江苏' },
        { name: '南通', pinyin: 'nantong', tag: '江海明珠', hot: false, province: '江苏' },
        { name: '扬州', pinyin: 'yangzhou', tag: '烟花三月', hot: false, province: '江苏' },
        { name: '镇江', pinyin: 'zhenjiang', tag: '天下第一江山', hot: false, province: '江苏' },
        { name: '淮安', pinyin: 'huaian', tag: '总理故里', hot: false, province: '江苏' },
        { name: '连云港', pinyin: 'lianyungang', tag: '大圣故里', hot: false, province: '江苏' },
        { name: '盐城', pinyin: 'yancheng', tag: '东方湿地', hot: false, province: '江苏' },
        { name: '泰州', pinyin: 'taizhou', tag: '祥泰之州', hot: false, province: '江苏' },
        { name: '宿迁', pinyin: 'suqian', tag: '项王故里', hot: false, province: '江苏' },
        { name: '淄博', pinyin: 'zibo', tag: '齐文化', hot: false, province: '山东' },
        { name: '潍坊', pinyin: 'weifang', tag: '风筝之都', hot: false, province: '山东' },
        { name: '临沂', pinyin: 'linyi', tag: '物流之都', hot: false, province: '山东' },
        { name: '济宁', pinyin: 'jining', tag: '孔孟之乡', hot: false, province: '山东' },
        { name: '泰安', pinyin: 'taian', tag: '五岳之首', hot: false, province: '山东' },
        { name: '邯郸', pinyin: 'handan', tag: '赵国古都', hot: false, province: '河北' },
        { name: '保定', pinyin: 'baoding', tag: '京畿之地', hot: false, province: '河北' },
        { name: '唐山', pinyin: 'tangshan', tag: '北方瓷都', hot: false, province: '河北' },
        { name: '廊坊', pinyin: 'langfang', tag: '京津走廊', hot: false, province: '河北' },
        { name: '沧州', pinyin: 'cangzhou', tag: '狮城', hot: false, province: '河北' },
        { name: '邢台', pinyin: 'xingtai', tag: '卧牛城', hot: false, province: '河北' },
        { name: '安阳', pinyin: 'anyang', tag: '殷墟', hot: false, province: '河南' },
        { name: '新乡', pinyin: 'xinxiang', tag: '牧野之战', hot: false, province: '河南' },
        { name: '许昌', pinyin: 'xuchang', tag: '曹魏故都', hot: false, province: '河南' },
        { name: '平顶山', pinyin: 'pingdingshan', tag: '鹰城', hot: false, province: '河南' },
        { name: '南阳', pinyin: 'nanyang', tag: '卧龙', hot: false, province: '河南' },
        { name: '焦作', pinyin: 'jiaozuo', tag: '山水之城', hot: false, province: '河南' },
        { name: '信阳', pinyin: 'xinyang', tag: '茶都', hot: false, province: '河南' },
        { name: '商丘', pinyin: 'shangqiu', tag: '华商之都', hot: false, province: '河南' },
        { name: '驻马店', pinyin: 'zhumadian', tag: '天中', hot: false, province: '河南' },
        { name: '黄石', pinyin: 'huangshi', tag: '青铜故里', hot: false, province: '湖北' },
        { name: '宜昌', pinyin: 'yichang', tag: '三峡门户', hot: false, province: '湖北' },
        { name: '襄阳', pinyin: 'xiangyang', tag: '铁打的襄阳', hot: false, province: '湖北' },
        { name: '荆州', pinyin: 'jingzhou', tag: '三国名城', hot: false, province: '湖北' },
        { name: '十堰', pinyin: 'shiyan', tag: '车城', hot: false, province: '湖北' },
        { name: '株洲', pinyin: 'zhuzhou', tag: '火车拖来的城市', hot: false, province: '湖南' },
        { name: '岳阳', pinyin: 'yueyang', tag: '岳阳楼', hot: false, province: '湖南' },
        { name: '湘潭', pinyin: 'xiangtan', tag: '伟人故里', hot: false, province: '湖南' },
        { name: '常德', pinyin: 'changde', tag: '桃花源', hot: false, province: '湖南' },
        { name: '衡阳', pinyin: 'hengyang', tag: '雁城', hot: false, province: '湖南' },
        { name: '张家界', pinyin: 'zhangjiajie', tag: '阿凡达', hot: false, province: '湖南' },
        { name: '郴州', pinyin: 'chenzhou', tag: '福城', hot: false, province: '湖南' },
        { name: '邵阳', pinyin: 'shaoyang', tag: '宝庆', hot: false, province: '湖南' },
        { name: '赣州', pinyin: 'ganzhou', tag: '宋城', hot: false, province: '江西' },
        { name: '上饶', pinyin: 'shangrao', tag: '三清山', hot: false, province: '江西' },
        { name: '宜春', pinyin: 'yichun', tag: '月亮之都', hot: false, province: '江西' },
        { name: '吉安', pinyin: 'jian', tag: '革命摇篮', hot: false, province: '江西' },
        { name: '景德镇', pinyin: 'jingdezhen', tag: '瓷都', hot: false, province: '江西' },
        { name: '萍乡', pinyin: 'pingxiang', tag: '工人运动', hot: false, province: '江西' },
        { name: '新余', pinyin: 'xinyu', tag: '钢城', hot: false, province: '江西' },
        { name: '鹰潭', pinyin: 'yingtan', tag: '道都', hot: false, province: '江西' },
        { name: '芜湖', pinyin: 'wuhu', tag: '皖江明珠', hot: false, province: '安徽' },
        { name: '蚌埠', pinyin: 'bengbu', tag: '珍珠城', hot: false, province: '安徽' },
        { name: '安庆', pinyin: 'anqing', tag: '黄梅戏', hot: false, province: '安徽' },
        { name: '马鞍山', pinyin: 'maanshan', tag: '钢城', hot: false, province: '安徽' },
        { name: '铜陵', pinyin: 'tongling', tag: '铜都', hot: false, province: '安徽' },
        { name: '芜湖', pinyin: 'wuhu', tag: '江城', hot: false, province: '安徽' },
        { name: '泉州', pinyin: 'quanzhou', tag: '鲤城', hot: false, province: '福建' },
        { name: '漳州', pinyin: 'zhangzhou', tag: '花果之城', hot: false, province: '福建' },
        { name: '莆田', pinyin: 'putian', tag: '妈祖故里', hot: false, province: '福建' },
        { name: '龙岩', pinyin: 'longyan', tag: '客家祖地', hot: false, province: '福建' },
        { name: '三明', pinyin: 'sanming', tag: '绿色宝库', hot: false, province: '福建' },
        { name: '南平', pinyin: 'nanping', tag: '武夷山', hot: false, province: '福建' },
        { name: '宁德', pinyin: 'ningde', tag: '山海之城', hot: false, province: '福建' },
        { name: '茂名', pinyin: 'maoming', tag: '南方油城', hot: false, province: '广东' },
        { name: '惠州', pinyin: 'huizhou', tag: '粤东门户', hot: false, province: '广东' },
        { name: '珠海', pinyin: 'zhuhai', tag: '百岛之市', hot: false, province: '广东' },
        { name: '佛山', pinyin: 'foshan', tag: '武术之乡', hot: false, province: '广东' },
        { name: '东莞', pinyin: 'dongguan', tag: '世界工厂', hot: false, province: '广东' },
        { name: '中山', pinyin: 'zhongshan', tag: '伟人故里', hot: false, province: '广东' },
        { name: '江门', pinyin: 'jiangmen', tag: '侨乡', hot: false, province: '广东' },
        { name: '汕头', pinyin: 'shantou', tag: '海滨邹鲁', hot: false, province: '广东' },
        { name: '湛江', pinyin: 'zhanjiang', tag: '港城', hot: false, province: '广东' },
        { name: '肇庆', pinyin: 'zhaoqing', tag: '端州', hot: false, province: '广东' },
        { name: '揭阳', pinyin: 'jieyang', tag: '岭南水城', hot: false, province: '广东' },
        { name: '清远', pinyin: 'qingyuan', tag: '凤城', hot: false, province: '广东' },
        { name: '韶关', pinyin: 'shaoguan', tag: '岭南名郡', hot: false, province: '广东' },
        { name: '梅州', pinyin: 'meizhou', tag: '世界客都', hot: false, province: '广东' },
        { name: '河源', pinyin: 'heyuan', tag: '客家古邑', hot: false, province: '广东' },
        { name: '汕尾', pinyin: 'shanwei', tag: '潮汕', hot: false, province: '广东' },
        { name: '柳州', pinyin: 'liuzhou', tag: '龙城', hot: false, province: '广西' },
        { name: '玉林', pinyin: 'yulin', tag: '岭南都会', hot: false, province: '广西' },
        { name: '梧州', pinyin: 'wuzhou', tag: '百年商埠', hot: false, province: '广西' },
        { name: '百色', pinyin: 'baise', tag: '鹅城', hot: false, province: '广西' },
        { name: '贵港', pinyin: 'guigang', tag: '荷城', hot: false, province: '广西' },
        { name: '钦州', pinyin: 'qinzhou', tag: '滨海之城', hot: false, province: '广西' },
        { name: '河池', pinyin: 'hechi', tag: '长寿之乡', hot: false, province: '广西' },
        { name: '防城港', pinyin: 'fangchenggang', tag: '西南门户', hot: false, province: '广西' },
        { name: '贺州', pinyin: 'hezhou', tag: '三省通衢', hot: false, province: '广西' },
        { name: '来宾', pinyin: 'laibin', tag: '盘古文化', hot: false, province: '广西' },
        { name: '崇左', pinyin: 'chongzuo', tag: '糖都', hot: false, province: '广西' },
    ],

    _searchCities(keyword) {
        if (!keyword || keyword.length === 0) return [];
        const kw = keyword.toLowerCase();
        const seen = new Set();
        return this._allCities.filter(c => {
            if (seen.has(c.name)) return false;
            let match = false;
            if (c.name.includes(keyword)) match = true;
            else if (c.pinyin.includes(kw)) match = true;
            else if (c.pinyin.startsWith(kw)) match = true;
            if (match) { seen.add(c.name); return true; }
            return false;
        }).slice(0, 12);
    },

    addSuggestionDestination(name) {
        document.getElementById('destInput').value = name;
        this.addDestination();
        document.getElementById('autoDropdown').classList.remove('show');
        UIRender.showToast(`已选择「${name}」，开始规划吧 🎉`);
    },

    togglePref(el) {
        const pref = el.dataset.pref;
        const isAlreadySelected = el.classList.contains('selected');

        if (!isAlreadySelected && this.selectedPrefs.length >= 3) {
            UiKit.alert('最多只能选择3个标签', {
                title: '选择数量限制',
                desc: '为了AI能更好地为你规划，每次最多选择3个偏好标签。请先取消一个再选择新的标签。'
            });
            return;
        }

        el.classList.toggle('selected');

        if (el.classList.contains('selected')) {
            if (!this.selectedPrefs.includes(pref)) this.selectedPrefs.push(pref);
        } else {
            this.selectedPrefs = this.selectedPrefs.filter(p => p !== pref);
        }
    },

    renderPrefTags() {
        const wrap = document.querySelector('.pref-tags-wrap');
        if (!wrap) return;
        
        let html = '';
        this.DEFAULT_PREFS.forEach(p => {
            const selected = this.selectedPrefs.includes(p.id) ? ' selected' : '';
            html += `<button class="pref-tag-btn${selected}" data-pref="${p.id}" onclick="App.togglePref(this)">${p.emoji} ${p.label}</button>`;
        });
        
        this.customPrefs.forEach((p, idx) => {
            const selected = this.selectedPrefs.includes('custom_' + idx) ? ' selected' : '';
            html += `<button class="pref-tag-btn custom" data-pref="custom_${idx}" onclick="App.togglePref(this)">
                ${p.emoji || '🏷️'} ${p.label}
                <span class="pref-tag-del" onclick="event.stopPropagation();App.removeCustomPref(${idx})">✕</span>
            </button>`;
        });
        
        html += `<button class="pref-tag-btn pref-add-btn" onclick="App.addCustomPref()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            添加标签
        </button>`;
        
        wrap.innerHTML = html;
    },

    async addCustomPref() {
        const suggestions = ['温泉泡汤', '亲子游', '情侣约会', '网红打卡', '古镇漫游', '美食探店', '户外运动', '城市漫步', '主题乐园', '博物馆'];
        const label = await UiKit.prompt('输入你喜欢的玩法（如：酒吧、徒步）', {
            title: '添加自定义标签',
            placeholder: '例如：徒步、酒吧、看日出',
            defaultValue: ''
        });
        if (label === null || !label.trim()) return;
        
        this.customPrefs.push({ label: label.trim(), emoji: '🏷️' });
        localStorage.setItem('trip_custom_prefs', JSON.stringify(this.customPrefs));
        this.renderPrefTags();
        UiKit.toast('已添加自定义标签 ✨', 'success');
    },

    removeCustomPref(idx) {
        this.customPrefs.splice(idx, 1);
        this.selectedPrefs = this.selectedPrefs.filter(p => p !== 'custom_' + idx);
        localStorage.setItem('trip_custom_prefs', JSON.stringify(this.customPrefs));
        this.renderPrefTags();
    },

    // 人数/预算单选（及更多设置选项）
    selectOpt(el, type) {
        const group = el.parentElement;
        const multiTypes = ['companion'];
        if (multiTypes.includes(type)) {
            el.classList.toggle('active');
        } else {
            group.querySelectorAll('.opt-chip').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
        }
        if (type === 'people') this.selectedPeople = el.dataset.people;
        else if (type === 'budget') this.selectedBudget = el.dataset.budget;
        else if (type === 'transport') this.selectedTransport = el.dataset.transport;
        else if (type === 'hotel') this.selectedHotel = el.dataset.hotel;
        else if (type === 'pace') this.selectedPace = el.dataset.pace;
        else if (type === 'companion') {
            if (!this.selectedCompanions) this.selectedCompanions = [];
            const val = el.dataset.companion;
            if (el.classList.contains('active')) {
                if (!this.selectedCompanions.includes(val)) this.selectedCompanions.push(val);
            } else {
                this.selectedCompanions = this.selectedCompanions.filter(c => c !== val);
            }
        }
    },

    toggleMoreSettings() {
        const content = document.getElementById('moreSettingsContent');
        const wrap = document.querySelector('.more-settings');
        const icon = document.getElementById('moreSettingsIcon');
        if (!content || !wrap) return;

        if (content.style.display === 'none') {
            content.style.display = '';
            wrap.classList.add('expanded');
            icon.textContent = '▲';
        } else {
            content.style.display = 'none';
            wrap.classList.remove('expanded');
            icon.textContent = '▼';
        }
    },

    onDestFocus() {
        const val = document.getElementById('destInput').value.trim();
        const dropdown = document.getElementById('autoDropdown');
        if (val.length === 0) {
            this._renderHotCities();
            this._hidePoiSection();
        } else {
            this._updateDropdown(val);
        }
        dropdown.classList.add('show');
    },

    onDestBlur() {
        setTimeout(() => {
            document.getElementById('autoDropdown').classList.remove('show');
        }, 200);
    },

    _renderHotCities() {
        const grid = document.getElementById('autoCityGrid');
        const title = document.getElementById('autoCityTitle');
        if (!grid || !title) return;
        title.textContent = '热门城市';
        const seen = new Set();
        const hotCities = this._allCities.filter(c => {
            if (!c.hot) return false;
            if (seen.has(c.name)) return false;
            seen.add(c.name);
            return true;
        });
        grid.innerHTML = hotCities.map(c => `
            <div class="auto-city-card" onclick="App.addSuggestionDestination('${c.name}')">
                <div class="auto-city-name">${c.name}</div>
                <div class="auto-city-tag">${c.tag}</div>
            </div>
        `).join('');
    },

    _updateDropdown(keyword) {
        const cities = this._searchCities(keyword);
        const grid = document.getElementById('autoCityGrid');
        const title = document.getElementById('autoCityTitle');
        if (grid && title) {
            title.textContent = cities.length > 0 ? '城市匹配' : '未找到城市';
            if (cities.length > 0) {
                grid.innerHTML = cities.map(c => `
                    <div class="auto-city-card" onclick="App.addSuggestionDestination('${c.name}')">
                        <div class="auto-city-name">${c.name}</div>
                        <div class="auto-city-tag">${c.province || ''} · ${c.tag}</div>
                    </div>
                `).join('');
            } else {
                grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">没有找到匹配的城市，试试输入完整名称</div>`;
            }
        }
        AutocompleteModule.search(keyword, (tips, kw) => {
            this._renderPoiList(tips, kw);
        });
    },

    _renderPoiList(tips, keyword) {
        const poiSection = document.getElementById('autoPoiSection');
        const poiList = document.getElementById('autoPoiList');
        if (!poiSection || !poiList) return;
        if (tips.length === 0) {
            poiSection.style.display = 'none';
            return;
        }
        poiSection.style.display = '';
        poiList.innerHTML = tips.map((tip, idx) => {
            const cityName = tip.cityname || tip.city || tip.district || '';
            return `
            <div class="auto-item" onclick="App.addPoiCityDestination('${cityName.replace(/'/g, "\\'")}', '${(tip.name || '').replace(/'/g, "\\'")}')">
                <div class="auto-icon">${AutocompleteModule.getPlaceIcon(tip.type)}</div>
                <div class="auto-info">
                    <div class="auto-name">${tip.name || ''}</div>
                    <div class="auto-addr">${tip.district || ''} ${tip.address || ''}</div>
                </div>
                <div class="auto-add">+</div>
            </div>
        `}).join('');
    },

    addPoiCityDestination(cityName, poiName) {
        const dest = cityName && cityName.length > 0 ? cityName : poiName;
        document.getElementById('destInput').value = dest;
        this.addDestination();
        AutocompleteModule.hideDropdown();
    },

    _hidePoiSection() {
        const poiSection = document.getElementById('autoPoiSection');
        if (poiSection) poiSection.style.display = 'none';
    },

    showDatePicker() {
        CalendarModule.show();
    },

    closeDatePicker() {
        CalendarModule.close();
    },

    closeDatePickerOnOverlay(e) {
        CalendarModule.closeOnOverlay(e);
    },

    confirmDatePicker() {
        CalendarModule.confirm();
    },

    selectCalendarDate(dateStr) {
        CalendarModule.selectDate(dateStr);
    },

    updateBtnState() {
        const btn = document.getElementById('smartBtn');
        const canGenerate = this.destinations.length > 0;
        btn.disabled = !canGenerate;
    },

    manualPlan() {
        if (this.destinations.length === 0) {
            UIRender.showToast('请先输入目的地');
            return;
        }
        ManualPlan.open(this.destinations[0]);
        this.pageStack.push('manual-plan');
    },

    async smartPlan() {
        if (this.destinations.length === 0) return;

        const btn = document.getElementById('smartBtn');
        btn.disabled = true;

        this._doSmartPlan();
    },

    _needAskQuestions() {
        const questions = [];
        const destCount = this.destinations.length;
        const hasDate = this.startDate && this.endDate;
        const hasPrefs = this.selectedPrefs && this.selectedPrefs.length > 0;

        if (!hasDate) {
            questions.push({
                id: 'date',
                question: '什么时候出发呀？选个日子我可以帮你看天气、查营业时间～',
                type: 'action',
                action: 'showDatePicker',
                options: [
                    { label: '这周末', value: 'weekend' },
                    { label: '下周', value: 'nextweek' },
                    { label: '下个月', value: 'nextmonth' },
                    { label: '还没确定', value: 'skip' },
                ]
            });
        }

        if (!hasPrefs && destCount > 0) {
            const destName = this.destinations[0];
            questions.push({
                id: 'style',
                question: `去${destName}玩，你更偏好好哪种风格？`,
                type: 'choice',
                options: [
                    { label: '🍜 美食探店', value: 'food' },
                    { label: '📸 拍照打卡', value: 'photo' },
                    { label: '🏛️ 经典必玩', value: 'classic' },
                    { label: '🌿 休闲放松', value: 'nature' },
                    { label: '随便安排', value: 'skip' },
                ]
            });
        }

        return questions.slice(0, 2);
    },

    _showAskModal(questions, onComplete, onSkip) {
        let currentQ = 0;
        const answers = {};

        const _renderQuestion = () => {
            const q = questions[currentQ];
            const progress = ((currentQ + 1) / questions.length) * 100;

            let optionsHtml = '';
            if (q.type === 'choice' || q.type === 'action') {
                optionsHtml = q.options.map(opt =>
                    `<button class="ask-option-btn" data-value="${opt.value}">${opt.label}</button>`
                ).join('');
            }

            const html = `
                <div class="ask-modal">
                    <div class="ask-progress-bar"><div class="ask-progress-fill" style="width:${progress}%"></div></div>
                    <div class="ask-header">
                        <div class="ask-avatar">🤖</div>
                        <div class="ask-bubble">
                            <div class="ask-question">${q.question}</div>
                            <div class="ask-hint">问题 ${currentQ + 1} / ${questions.length}</div>
                        </div>
                    </div>
                    <div class="ask-options">
                        ${optionsHtml}
                    </div>
                    <button class="ask-skip-btn" id="askSkipBtn">${currentQ < questions.length - 1 ? '跳过，下一题' : '全部跳过，直接生成'}</button>
                </div>
            `;

            UIRender.showAlertModal('AI想更懂你', html, true);

            setTimeout(() => {
                const modal = document.getElementById('alertModal');
                if (!modal) return;

                modal.querySelectorAll('.ask-option-btn').forEach(btn => {
                    btn.onclick = () => {
                        const val = btn.dataset.value;
                        answers[q.id] = val;

                        if (q.type === 'action' && val !== 'skip') {
                            this._applyQuickAnswer(q.id, val);
                        }
                        if (q.type === 'choice' && val !== 'skip') {
                            if (!this.selectedPrefs.includes(val)) {
                                this.selectedPrefs.push(val);
                            }
                        }

                        if (currentQ < questions.length - 1) {
                            currentQ++;
                            _renderQuestion();
                        } else {
                            document.getElementById('alertModal').classList.remove('show');
                            onComplete(answers);
                        }
                    };
                });

                const skipBtn = document.getElementById('askSkipBtn');
                if (skipBtn) {
                    skipBtn.onclick = () => {
                        if (currentQ < questions.length - 1) {
                            currentQ++;
                            _renderQuestion();
                        } else {
                            document.getElementById('alertModal').classList.remove('show');
                            onSkip(answers);
                        }
                    };
                }
            }, 50);
        };

        _renderQuestion();
    },

    _applyQuickAnswer(type, value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (type === 'date') {
            if (value === 'weekend') {
                const sat = new Date(today);
                const dayOfWeek = sat.getDay();
                const daysToSat = (6 - dayOfWeek + 7) % 7;
                sat.setDate(sat.getDate() + daysToSat);
                this.startDate = sat;
                const sun = new Date(sat);
                sun.setDate(sun.getDate() + 1);
                this.endDate = sun;
            } else if (value === 'nextweek') {
                const nextMon = new Date(today);
                const dayOfWeek = nextMon.getDay();
                const daysToMon = (1 - dayOfWeek + 7) % 7 + 7;
                nextMon.setDate(nextMon.getDate() + daysToMon);
                this.startDate = nextMon;
                const nextSun = new Date(nextMon);
                nextSun.setDate(nextSun.getDate() + 6);
                this.endDate = nextSun;
            } else if (value === 'nextmonth') {
                const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                this.startDate = nextMonth;
                const endOfNext = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                this.endDate = endOfNext;
            }

            if (this.startDate && this.endDate) {
                const dateText = document.getElementById('dateText');
                if (dateText) {
                    const CalendarModule = window.CalendarModule;
                    dateText.textContent = CalendarModule
                        ? CalendarModule.formatDateShort(this.startDate) + ' 至 ' + CalendarModule.formatDateShort(this.endDate)
                        : '已选择日期';
                    dateText.classList.add('selected');
                }
            }
        }
    },

    async _doSmartPlan() {
        const btn = document.getElementById('smartBtn');
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('show');
        btn.disabled = true;

        // 计算天数 & 生成思考步骤
        const days = this.startDate && this.endDate
            ? Math.ceil((this.endDate - this.startDate) / (1000*60*60*24)) + 1
            : 2;

        const allPrefs = [...this.selectedPrefs];
        if (this.selectedTransport) allPrefs.push('transport_' + this.selectedTransport);
        if (this.selectedHotel) allPrefs.push('hotel_' + this.selectedHotel);
        if (this.selectedPace) allPrefs.push('pace_' + this.selectedPace);
        if (this.selectedCompanions && this.selectedCompanions.length > 0) {
            this.selectedCompanions.forEach(c => allPrefs.push('companion_' + c));
        }

        let templates = [];
        try { templates = AIMemory.getCommunityTemplates() || []; } catch(e) {}
        const thinkingSteps = AIMemory.generateThinkingSteps(
            this.destinations, days, allPrefs, this.startDate, templates
        );
        // 启动思考链动画
        let thinkResult = null;
        let thinkDuration = 1;
        try {
            thinkResult = UIRender.animateThinkingChain(thinkingSteps, (res) => {
                if (res && res.duration) thinkDuration = res.duration;
            });
        } catch(e) { console.warn('thinking chain error', e); }

        try {
            try {
                await Promise.race([
                    MapModule.init(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('地图初始化超时')), 5000))
                ]);
            } catch (mapErr) {
                console.warn('地图初始化失败，继续生成行程:', mapErr);
                MapModule._enableFallback();
            }

            let trip;
            try {
                trip = await Promise.race([
                    AIPlanner.generateTrip(
                        this.destinations, days, allPrefs, this.startDate, this.endDate
                    ),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('行程生成超时')), 20000))
                ]);
            } catch (genErr) {
                console.warn('AI生成超时/失败，使用兜底行程数据:', genErr);
                const poisByCity = {};
                for (const dest of this.destinations) {
                    const fallbackPois = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityPOIs(dest, allPrefs) : [];
                    poisByCity[dest] = fallbackPois;
                }
                trip = AIPlanner.buildMultiCityTripFromPOIs(poisByCity, this.destinations, days, this.startDate);
            }
            this.tripData = trip;
            trip.destination = this.destinations[0] || trip.dayPlans?.[0]?.city || '';
            trip.days = days;
            trip.startDate = this.startDate ? `${this.startDate.getFullYear()}-${String(this.startDate.getMonth()+1).padStart(2,'0')}-${String(this.startDate.getDate()).padStart(2,'0')}` : null;
            trip.people = this.selectedPeople;
            trip.budget = this.selectedBudget;

            const defaultTitle = trip.title || (trip.destination ? trip.destination + '之旅' : '我的行程');
            const customTitle = await UiKit.prompt('给你的行程起个名字吧', {
                title: '命名行程',
                defaultValue: defaultTitle,
                placeholder: '例如：杭州西湖周末游'
            });
            if (customTitle !== null && (customTitle || '').trim()) {
                trip.title = customTitle.trim();
            } else if (!trip.title) {
                trip.title = defaultTitle;
            }

            const saveResult = await this.saveTripWithLimitCheck(trip);
            if (!saveResult) return; // 达上限且用户未处理，中止
            const tripId = saveResult.id;
            this.currentTripId = tripId;
            // Phase 3.3：完成首次 AI 行程规划触发新手任务
            if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('first_plan');

            // 完成思考链并保存历史
            try {
                if (thinkResult && thinkResult.finish) thinkResult.finish();
                AIMemory.saveThinking(tripId, thinkingSteps, thinkDuration);
            } catch(e) {}

            // 短暂停留展示"思考完成"再跳转
            setTimeout(() => {
                overlay.classList.remove('show');
                btn.disabled = false;
                btn.textContent = '✨ 智能规划';
                this.pageStack.push('trip-detail');
                TripDetail.open(trip, tripId);
            }, 600);

        } catch (e) {
            console.error('生成失败', e);
            UIRender.showToast('生成行程失败，请重试');
            try { if (thinkResult && thinkResult.finish) thinkResult.finish(); } catch(_){}
            overlay.classList.remove('show');
            btn.disabled = false;
        }
    },

    async plotRouteOnMap(trip) {
        MapModule.clearMarkers();
        MapModule.clearRoutes();

        const city = this.destinations[0] || '上海';
        
        let center = CONFIG.DEFAULT_CENTER;
        try {
            const geoResult = await new Promise(resolve => {
                MapModule.geocoder.getLocation(city, (status, result) => {
                    if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                        resolve({ lng: result.geocodes[0].location.lng, lat: result.geocodes[0].location.lat });
                    } else {
                        resolve(CONFIG.DEFAULT_CENTER);
                    }
                });
            });
            if (geoResult) center = geoResult;
        } catch(e) {}

        MapModule.map.setCenter([center.lng, center.lat]);
        MapModule.map.setZoom(11);

        const allSpots = [];
        trip.dayPlans.forEach(day => {
            day.spots.forEach((spot, idx) => {
                allSpots.push({ spot, day: day.day, index: idx });
            });
        });

        let geocodedCount = 0;
        let needGeocode = 0;
        allSpots.forEach(({spot}) => { if (!spot.lng || !spot.lat) needGeocode++; });
        const totalGeocode = Math.max(needGeocode, allSpots.length);

        for (let i = 0; i < trip.dayPlans.length; i++) {
            const day = trip.dayPlans[i];
            const color = UIRender.getDayColor(day.day);
            
            const daySpots = day.spots;
            for (let j = 0; j < daySpots.length; j++) {
                const spot = daySpots[j];
                if (spot.lng && spot.lat) {
                    geocodedCount++;
                    UIRender.showGeocodeProgress(geocodedCount, totalGeocode);
                    continue;
                }
                const result = await MapModule.geocodeSpot(day.city || city, spot.name);
                if (result) {
                    spot.lng = result.lng;
                    spot.lat = result.lat;
                    if (result.photos && result.photos.length > 0 && !spot.photos) {
                        spot.photos = result.photos;
                    }
                    if (!spot.address && result.address) {
                        spot.address = result.address;
                    }
                }
                geocodedCount++;
                UIRender.showGeocodeProgress(geocodedCount, totalGeocode);
            }
        }

        UIRender.showGeocodeProgress(totalGeocode, totalGeocode);

        for (let i = 0; i < trip.dayPlans.length; i++) {
            const day = trip.dayPlans[i];
            const color = UIRender.getDayColor(day.day);
            
            await MapModule.drawDayRoute(day.spots, color, (spot) => {
                const idx = day.spots.indexOf(spot);
                this.focusSpot(day.day, idx);
            });
            
            await this.delay(300);
        }

        MapModule.fitView();

        if (this.drawerTab === 'day') {
            this.refreshRouteDisplay();
        }
    },

    async refreshAfterModification() {
        UIRender.renderDrawerTabs(this.tripData);
        UIRender.renderDaySpots(this.currentDay);
        this.switchDrawerTab('day', this.currentDay);
        await this.plotRouteOnMap(this.tripData);
    },

    spotsReordered(dayNum) {
        UIRender.renderDaySpots(dayNum);
        this.refreshRouteDisplay();
        UIRender.showToast('路线已调整 🔄');
    },

    renderTripResult(trip) {
        UIRender.renderDrawerTabs(trip);
        UIRender.renderOverview(trip);
        this.drawerTab = 'overview';
        
        setTimeout(() => {
            this.plotRouteOnMap(trip);
        }, 200);
    },

    switchDrawerTab(tab, dayNum, btnElement) {
        this.drawerTab = tab;
        if (dayNum) this.currentDay = dayNum;
        
        document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
        if (btnElement) {
            btnElement.classList.add('active');
        }
        
        if (tab === 'overview') {
            document.querySelectorAll('.drawer-tab')[0].classList.add('active');
            UIRender.renderOverview(this.tripData);
        } else if (tab === 'day') {
            const tabs = document.querySelectorAll('.drawer-tab');
            const dayIndex = this.tripData.dayPlans.findIndex(d => d.day === dayNum);
            if (tabs[dayIndex + 1]) tabs[dayIndex + 1].classList.add('active');
            UIRender.renderDaySpots(dayNum);
        }
        
        setTimeout(() => this.refreshRouteDisplay(), 100);
    },

    refreshRouteDisplay() {
        if (!this.tripData || !MapModule.map) return;
        
        MapModule.clearMarkers();
        MapModule.clearRoutes();
        
        let daysToShow = [];
        if (this.drawerTab === 'overview') {
            daysToShow = this.tripData.dayPlans.map(d => d.day);
        } else if (this.drawerTab === 'day' && this.currentDay) {
            daysToShow = [this.currentDay];
        }

        daysToShow.forEach(dayNum => {
            const day = this.tripData.dayPlans.find(d => d.day === dayNum);
            if (!day) return;
            const color = UIRender.getDayColor(dayNum);
            
            const validSpots = day.spots.filter(s => s.lng && s.lat);
            
            validSpots.forEach((spot, i) => {
                MapModule.addMarker(
                    { lng: spot.lng, lat: spot.lat },
                    i + 1,
                    color,
                    () => this.focusSpot(dayNum, day.spots.indexOf(spot)),
                    i * 60
                );
            });

            if (validSpots.length >= 2) {
                const path = validSpots.map(s => [s.lng, s.lat]);
                const polyline = new AMap.Polyline({
                    path: path,
                    strokeColor: color.main,
                    strokeWeight: 5,
                    strokeOpacity: 0.75,
                    lineJoin: 'round',
                    lineCap: 'round',
                    showDir: true,
                    zIndex: 50,
                });
                polyline.setMap(MapModule.map);
                MapModule.routePolylines.push(polyline);
            }
        });

        if (this.drawerTab === 'day' && this.currentDay) {
            const day = this.tripData.dayPlans.find(d => d.day === this.currentDay);
            if (day) {
                MapModule.fitDaySpots(day.spots);
            }
        } else {
            setTimeout(() => MapModule.fitView(), 300);
        }
    },

    focusSpot(dayNum, spotIndex) {
        if (!MapModule.map || !this.tripData) return;
        
        const day = this.tripData.dayPlans.find(d => d.day === dayNum);
        if (day && day.spots[spotIndex] && day.spots[spotIndex].lng) {
            const spot = day.spots[spotIndex];
            MapModule.focusOnSpot(spot.lng, spot.lat);
            this.showPoiDetail(spot, dayNum);
        }
    },

    showPoiDetail(spot, dayNum) {
        const overlay = document.getElementById('poiDetailOverlay');
        
        document.getElementById('poiDetailTitle').textContent = spot.name;
        
        const tags = [`🔥 AI精选`, spot.emoji + ' ' + (spot.type || '景点')];
        if (spot.tags) tags.push(...spot.tags.map(t => '🏷️ ' + t));
        document.getElementById('poiDetailTags').innerHTML = tags.map(t => 
            `<div class="poi-tag">${t}</div>`
        ).join('');
        
        const imgSrc = UIRender.getSpotImage(spot);
        let imagesHtml = '';
        for (let i = 0; i < 3; i++) {
            const src = (spot.photos && spot.photos[i] && spot.photos[i].url) ? spot.photos[i].url : imgSrc;
            imagesHtml += `
                <div class="poi-image-card">
                    <img src="${src}" alt="${spot.name}" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:60px;\\'>${spot.emoji || '🏞️'}</div>'">
                </div>
            `;
        }
        document.getElementById('poiDetailImages').innerHTML = imagesHtml;
        
        this.generatePoiDescription(spot);
        this.generateTravelTips(spot, dayNum);
        
        document.getElementById('poiBusinessHours').textContent = spot.businessHours || '以实际为准';
        document.getElementById('poiTicketPrice').textContent = spot.cost > 0 ? '¥' + spot.cost : '免费';
        document.getElementById('poiAddress').textContent = spot.address || spot.name;
        
        overlay.classList.add('show');
        
        this.loadPoiDetailFromAMap(spot);
        if (typeof PoiDetailExt !== 'undefined') PoiDetailExt.init(spot, dayNum);
    },

    loadPoiDetailFromAMap(spot) {
        MapModule.geocodeSpot(this.destinations[0] || '全国', spot.name).then(result => {
            if (!result) return;
            if (result.biz_ext) {
                if (result.biz_ext.opening_hours) {
                    document.getElementById('poiBusinessHours').textContent = result.biz_ext.opening_hours;
                }
                if (result.biz_ext.cost !== undefined && result.biz_ext.cost !== null) {
                    const cost = parseFloat(result.biz_ext.cost);
                    document.getElementById('poiTicketPrice').textContent = cost > 0 ? '¥' + cost : '免费';
                }
                if (result.biz_ext.rating) {
                    const ratingEl = document.getElementById('poiRating');
                    if (ratingEl) {
                        const r = parseFloat(result.biz_ext.rating);
                        ratingEl.textContent = r > 0 ? r + ' 分' : '--';
                    }
                }
            }
            if (result.address) {
                document.getElementById('poiAddress').textContent = result.address;
            }
            if (result.tel) {
                const telEl = document.getElementById('poiTel');
                if (telEl) {
                    telEl.textContent = result.tel;
                    telEl.style.color = '#FF8A3D';
                    telEl.style.cursor = 'pointer';
                    telEl.onclick = function() { window.location.href = 'tel:' + result.tel; };
                }
            }
            if (result.photos && result.photos.length > 0) {
                const container = document.getElementById('poiDetailImages');
                let html = '';
                for (let i = 0; i < Math.min(result.photos.length, 5); i++) {
                    const photo = result.photos[i];
                    html += '\n                            <div class="poi-image-card">\n                                <img src="' + photo.url + '" alt="' + spot.name + '" onerror="this.parentElement.innerHTML=\'<div style=\\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:60px;\\\'>' + (spot.emoji || '🏞️') + '</div>\'">\n                            </div>\n                        ';
                }
                container.innerHTML = html;
            }
            // 保存poi_id供吐槽使用
            if (result.poi_id || result.id) {
                const oldPoiId = spot.poi_id;
                spot.poi_id = result.poi_id || result.id;
                // 如果poi_id变化了，重新加载吐槽
                if (oldPoiId !== spot.poi_id && typeof PoiDetailExt !== 'undefined') {
                    PoiDetailExt.currentPoi = spot;
                    PoiDetailExt.loadRoasts(spot);
                }
            }
        });
    },

    generatePoiDescription(spot) {
        const descEl = document.getElementById('poiDetailDesc');
        descEl.innerHTML = '<span style="color:var(--text-muted);">AI 正在生成介绍...</span>';
        
        setTimeout(() => {
            const descriptions = {
                '历史古迹': `${spot.name}是当地极具代表性的历史文化地标，承载着深厚的人文底蕴。周边有很多有意思的小店和特色餐厅，逛完景点可以慢悠悠地走走逛逛，感受当地的生活气息。建筑风格独特，拍照非常出片，尤其是傍晚时分氛围感拉满！`,
                '自然风光': `${spot.name}的自然风光绝对值得一看！山清水秀，空气清新，是逃离城市喧嚣的好地方。周边有观景台和徒步路线，户外运动爱好者不要错过。附近还有地道农家乐，可以品尝当地特色美食。`,
                '美食': `${spot.name}是当地有名的美食打卡地！汇聚了各种地道小吃和特色餐厅，从街边小料到精致餐厅应有尽有。必点招牌菜一定要试试，味道绝对不会让你失望。吃饱了还可以在周边逛逛小店～`,
                '景点': `${spot.name}是当地必去的经典景点之一，来都来了怎么能错过！不仅有好看的风景，还有很多有趣的故事和历史背景。周边配套很完善，吃喝玩乐一条龙，建议预留充足时间慢慢逛。`,
                '文化': `${spot.name}是了解当地文化的好去处，里面有很多珍贵的展品和文物。建议租个讲解器或者跟着导览走，能了解到很多背后的故事。周边还有文艺小店和咖啡馆，逛累了可以坐坐。`,
                '购物': `${spot.name}是当地最热闹的商圈之一，从大牌奢侈品到本土特色小店应有尽有。适合逛街购物，累了也有很多餐厅和咖啡馆可以休息。`,
                '休闲': `${spot.name}是放松休闲的好去处，氛围轻松舒适，适合和朋友家人一起来消磨时光。`,
            };
            
            const desc = descriptions[spot.type] || `${spot.name}是一个非常值得一去的地方，${spot.description || '有很多有趣的看点等着你去发现'}。周边交通便利，配套设施完善，建议安排1-2小时游览时间。`;
            
            descEl.innerHTML = desc;
        }, 600 + Math.random() * 400);
    },

    async generateTravelTips(spot, dayNum) {
        const tipsListEl = document.getElementById('poiTipsList');
        tipsListEl.innerHTML = '<div style="color:var(--text-muted);font-size:14px;">AI 正在生成出行建议...</div>';
        
        const weatherInfo = await CalendarModule.getDayWeather(dayNum);
        
        setTimeout(() => {
            let tips = [];
            
            if (weatherInfo) {
                const tempHigh = parseInt(weatherInfo.high);
                const tempLow = parseInt(weatherInfo.low);
                const avgTemp = (tempHigh + tempLow) / 2;
                const weatherDay = weatherInfo.text_day;
                
                if (weatherDay.includes('雨') || weatherDay.includes('雷')) {
                    tips.push('☂️ 当天有雨，记得带伞，建议穿防水鞋');
                }
                if (avgTemp >= 28) {
                    tips.push('🧴 气温较高，注意防晒，多喝水');
                } else if (avgTemp < 10) {
                    tips.push('🧣 天气寒冷，注意保暖');
                } else {
                    tips.push('👕 温度适宜，穿着舒适轻便的衣服即可');
                }
            }
            
            if (spot.type === '自然风光') {
                tips.push('👟 建议穿舒适的运动鞋');
            } else if (spot.type === '历史古迹' || spot.type === '文化') {
                tips.push('🎫 建议提前预约门票');
            } else if (spot.type === '美食') {
                tips.push('👥 热门餐厅建议错峰用餐或提前取号');
            }
            
            tips.push('🚇 公共交通出行更方便');
            
            const tipsHtml = tips.slice(0, 5).map(tip => `
                <div class="poi-tip-item">
                    <span class="tip-icon">${tip.split(' ')[0]}</span>
                    <span>${tip.substring(tip.indexOf(' ') + 1)}</span>
                </div>
            `).join('');
            
            tipsListEl.innerHTML = tipsHtml;
        }, 500);
    },

    closePoiDetail() {
        document.getElementById('poiDetailOverlay').classList.remove('show');
    },

    closePoiDetailOnOverlay(e) {
        if (e.target.id === 'poiDetailOverlay') this.closePoiDetail();
    },

    goBack() {
        if (this.pageStack.length > 1) {
            const current = this.pageStack[this.pageStack.length - 1];
            if (current === 'template-preview') {
                TemplatePreview.close();
                return;
            }
            if (current === 'trip-detail') {
                TripDetail.close();
                return;
            }
            if (current === 'manual-plan') {
                const page = document.getElementById('manualPlanPage');
                page.classList.remove('active');
                page.style.display = 'none';
                this.pageStack.pop();
                const prev = this.pageStack[this.pageStack.length - 1];
                this.switchTab(prev, true);
                return;
            }
            this.pageStack.pop();
            const prev = this.pageStack[this.pageStack.length - 1];
            this.switchTab(prev, true);
        } else {
            UIRender.showToast('再按一次退出');
        }
    },

    switchTab(tab, fromBack = false) {
        const pageMap = {
            'home': 'homePage',
            'trips': 'tripsPage',
            'plan': 'inputPage',
            'community': 'communityPage',
            'profile': 'profilePage',
            'result': 'resultPage',
            'template-preview': 'templatePreviewPage',
        };
        
        ['homePage', 'tripsPage', 'inputPage', 'resultPage', 'communityPage', 'profilePage', 'tripDetailPage', 'templatePreviewPage', 'manualPlanPage'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('active');
                if (id === 'templatePreviewPage' || id === 'manualPlanPage') {
                    el.style.display = 'none';
                }
            }
        });

        if (tab === 'result') {
            document.getElementById('resultPage')?.classList.add('active');
            document.getElementById('bottomTabBar').style.display = 'none';
            if (!fromBack) this.pageStack.push('result');
            this.currentTab = 'result';
            this.updateTabActive('trips');
            return;
        }

        if (tab === 'template-preview') {
            const pg = document.getElementById('templatePreviewPage');
            if (pg) {
                pg.style.display = 'flex';
                pg.classList.add('active');
            }
            document.getElementById('bottomTabBar').style.display = 'none';
            if (!fromBack && this.pageStack[this.pageStack.length - 1] !== 'template-preview') {
                this.pageStack.push('template-preview');
            }
            return;
        }

        const pageId = pageMap[tab];
        if (!pageId) return;

        document.getElementById(pageId).classList.add('active');

        if (tab === 'plan') {
            document.getElementById('bottomTabBar').style.display = 'none';
            if (!fromBack) this.resetPlanForm();
        } else {
            document.getElementById('bottomTabBar').style.display = 'flex';
        }

        if (tab === 'home') {
            HomeModule.render();
        } else if (tab === 'trips') {
            TripsModule.render();
        } else if (tab === 'community') {
            CommunityModule.render();
            if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('visit_community');
        } else if (tab === 'profile') {
            ProfileModule.render();
        }

        if (!fromBack && this.currentTab !== tab) {
            if (tab === 'result') {
                if (this.pageStack[this.pageStack.length - 1] !== 'result') {
                    this.pageStack.push('result');
                }
            } else if (tab === 'plan') {
                this.pageStack.push('plan');
            } else {
                const last = this.pageStack[this.pageStack.length - 1];
                if (last === 'result' || last === 'plan' || last === 'trip-detail') {
                    this.pageStack.push(tab);
                } else {
                    this.pageStack[this.pageStack.length - 1] = tab;
                }
            }
        }
        this.currentTab = tab;
        this.updateTabActive(tab);
    },

    updateTabActive(tabName) {
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
    },

    async navigateTo(tab) {
        // 创建行程需登录（AC-7）
        if (tab === 'plan' && typeof Auth !== 'undefined') {
            const ok = await Auth.requireAuth();
            if (!ok) return; // 用户取消登录，停留当前页
        }
        this.switchTab(tab);
    },

    // 统一保存行程：处理 20 条上限，返回 {success, id} 或 null（用户取消）
    async saveTripWithLimitCheck(trip) {
        const result = AIMemory.saveTrip(trip);
        if (result.success) return result;

        if (result.error === 'LIMIT_REACHED') {
            const choice = await UiKit.showActionSheet([
                { text: '删除一个旧行程', value: 'delete' },
                { text: '归档一个旧行程', value: 'archive' },
            ], '已达 20 条上限，请先处理');

            if (choice === 'delete' || choice === 'archive') {
                // 进入选择模式，让用户选择要删除/归档的行程
                this.switchTab('trips');
                if (typeof TripsModule !== 'undefined') {
                    TripsModule.enterSelectMode(choice);
                }
            }
            return null; // 用户取消或跳转
        }

        UiKit.toast('保存失败：' + result.error, 'error');
        return null;
    },

    switchTripTab(idx) {
        TripsModule.switchTripTab(idx);
    },

    startTrip(tripId) {
        const trips = AIMemory.getAllTrips();
        const trip = trips[tripId];
        if (!trip) return;
        const oldStartDate = trip.startDate;
        trip.startDate = new Date().toISOString().split('T')[0];
        AIMemory.saveTrip(trip);
        UiKit.toast('🚀 行程已开始！', 'success');
        TripsModule.renderTripCards();
    },

    endTrip(tripId) {
        const trips = AIMemory.getAllTrips();
        const trip = trips[tripId];
        if (!trip) return;
        let checkedCount = 0;
        let totalCount = 0;
        if (trip.dayPlans) {
            trip.dayPlans.forEach(day => {
                if (day.spots) day.spots.forEach(s => { totalCount++; s.checked = true; checkedCount++; });
            });
        }
        trip.status = 'archived';
        trip.completedAt = Date.now();
        AIMemory.saveTrip(trip);
        UiKit.toast('🎉 行程已归档到回忆长廊！', 'success');
        TripsModule.renderTripCards();
    },

    shareTrip(tripId) {
        UiKit.toast('分享功能开发中...', 'info');
    },

    openTripDetail(tripId) {
        const trip = AIMemory.getTrip(tripId);
        if (!trip) {
            UIRender.showToast('行程不存在');
            return;
        }
        this.tripData = trip;
        this.currentTripId = tripId;
        this.destinations = [trip.destination || trip.dayPlans?.[0]?.city || ''];
        
        this.pageStack.push('trip-detail');
        TripDetail.open(trip, tripId);
    },

    openCurrentTrip() {
        const card = document.getElementById('homeCurrentTripCard');
        const tripId = card?.dataset.tripId;
        if (tripId) {
            this.openTripDetail(tripId);
        }
    },

    useTemplate(templateId) {
        TemplatePreview.open(templateId);
    },

    // 打开云端行程预览
    async openCloudTrip(cloudId) {
        if (typeof TripStorage === 'undefined' || !cloudId) {
            UiKit.toast('行程数据缺失', 'error');
            return;
        }
        UiKit.showLoading('加载行程...');
        try {
            const trip = await TripStorage.getTrip(cloudId);
            if (!trip) {
                UiKit.hideLoading();
                UiKit.toast('行程不存在或已删除', 'error');
                return;
            }
            // 并行查询作者信息和点赞/收藏数
            if (trip.author_id && typeof supabase !== 'undefined') {
                try {
                    const [{ data: profile }, { count: likesCount }, { count: copiesCount }] = await Promise.all([
                        supabase.from('profiles').select('id, username, avatar_url').eq('id', trip.author_id).single(),
                        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('target_id', cloudId).eq('target_type', 'template'),
                        supabase.from('trip_templates').select('copies').eq('id', cloudId).single(),
                    ]);
                    if (profile) {
                        trip.author = profile.username;
                        trip.avatar = profile.avatar_url || '👤';
                    }
                    if (typeof likesCount === 'number') trip.likes = likesCount;
                    if (copiesCount && copiesCount.copies !== undefined) trip.copies = copiesCount.copies;
                } catch (e) {
                    console.warn('[openCloudTrip] 查询作者信息失败:', e);
                }
            }
            UiKit.hideLoading();
            TemplatePreview.openWithTrip(trip);
        } catch (e) {
            UiKit.hideLoading();
            console.error('[openCloudTrip] 加载失败:', e);
            UiKit.toast('加载失败', 'error');
        }
    },

    // 点赞/取消点赞
    async toggleLike(tripId, isCloud, el) {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录后点赞', 'info');
            Auth.requireAuth();
            return;
        }
        if (typeof supabase === 'undefined') return;

        const user = Auth.getCurrentUser();
        const countEl = el.querySelector('.like-count, .action-count');
        const currentCount = parseInt(countEl?.textContent) || 0;

        // 检查是否已点赞
        const { data: existing } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('target_id', tripId)
            .eq('target_type', 'template')
            .maybeSingle();

        if (existing) {
            // 取消点赞
            const { error } = await supabase
                .from('likes')
                .delete()
                .eq('user_id', user.id)
                .eq('target_id', tripId)
                .eq('target_type', 'template');
            if (error) {
                UiKit.toast('操作失败', 'error');
                return;
            }
            if (countEl) countEl.textContent = currentCount - 1;
            el.classList.remove('liked');
            UiKit.toast('已取消点赞', 'info');

            // 更新 trip_templates.likes 计数（云端行程）
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
                UiKit.toast('操作失败', 'error');
                return;
            }
            if (countEl) countEl.textContent = currentCount + 1;
            el.classList.add('liked');
            UiKit.toast('点赞成功', 'success');
            if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('first_like');

            // 积分：被点赞 +3（仅云端行程）
            if (isCloud && typeof PointsCore !== 'undefined') {
                // 查询作者 ID
                const { data: tpl } = await supabase
                    .from('trip_templates')
                    .select('author_id')
                    .eq('id', tripId)
                    .single();
                if (tpl?.author_id) {
                    PointsCore.onLiked(tpl.author_id, user.id, tripId, 'template').catch(() => {});
                }
            }

            // 更新 trip_templates.likes 计数（云端行程）
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
    },

    goBackToInput() {
        if (this.pageStack.length > 1) {
            this.pageStack.pop();
            const prev = this.pageStack[this.pageStack.length - 1];
            this.switchTab(prev, true);
        } else {
            this.switchTab('trips');
        }
    },

    goToTrip() {
        ShareModule.saveToLocal();
        UIRender.showToast('行程已保存！');
    },

    showThinkingHistory() {
        if (!this.currentTripId) return;
        const data = AIMemory.getThinking(this.currentTripId);
        if (data) {
            data.timestamp = AIMemory.getTrip(this.currentTripId)?.savedAt || Date.now();
            UIRender.showThinkingHistory(data);
        }
    },

    toggleDrawer() {
        this.drawerExpanded = !this.drawerExpanded;
        document.getElementById('bottomDrawer').classList.toggle('expanded', this.drawerExpanded);
    },

    setMapView(mode) {
        document.getElementById('lineBtn').classList.toggle('active', mode === 'line');
        document.getElementById('pointBtn').classList.toggle('active', mode === 'point');
        this.refreshRouteDisplay();
    },

    refreshRoute() {
        if (this.tripData) {
            this.plotRouteOnMap(this.tripData);
            UIRender.showToast('路线已刷新 🔄');
        }
    },

    showSettings() {
        UIRender.showToast('设置功能即将上线 ⚙️');
    },

    openQuickExpense() {
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips).sort((a, b) => b.savedAt - a.savedAt);
        if (tripArr.length === 0) {
            UIRender.showToast('先创建一个行程再记账吧 🗺️');
            this.navigateTo('plan');
            return;
        }
        this.openTripDetail(tripArr[0].id);
        setTimeout(() => {
            if (TripDetail.trip) TripDetail.switchTab('expense');
        }, 300);
    },

    openWeatherDetail() {
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips).sort((a, b) => b.savedAt - a.savedAt);
        const city = tripArr.length > 0
            ? (tripArr[0].destination || tripArr[0].dayPlans?.[0]?.city || '杭州')
            : '杭州';
        const url = `https://m.mafengwo.cn/weather/${encodeURIComponent(city)}.html`;
        UIRender.showToast(`🌤️ ${city}天气详情已打开`);
        setTimeout(() => window.open(url, '_blank'), 300);
    },

    setupDayScrollListener(dayNum) {
        const drawerContent = document.getElementById('drawerContent');
        if (!drawerContent) return;
        
        this.scrollThresholdReached = false;
        
        drawerContent.onscroll = () => {
            const scrollTop = drawerContent.scrollTop;
            const scrollHeight = drawerContent.scrollHeight;
            const clientHeight = drawerContent.clientHeight;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceFromBottom < 50 && !this.scrollThresholdReached) {
                this.scrollThresholdReached = true;
                
                if (dayNum < this.tripData.dayPlans.length) {
                    const nextDay = dayNum + 1;
                    this.switchTab('day', nextDay);
                    drawerContent.scrollTop = 0;
                }
            }
            
            if (distanceFromBottom > 100) {
                this.scrollThresholdReached = false;
            }
        };
    },

    handleEditableKeydown(e) {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.target.blur();
        }
    },

    updateSpotTime(dayNum, spotIndex, timeText) {
        const day = this.tripData.dayPlans.find(d => d.day === dayNum);
        if (!day || !day.spots[spotIndex]) return;
        
        const timeMatch = timeText.match(/(\d{1,2}:\d{2})\s*[-~至]\s*(\d{1,2}:\d{2})/);
        if (timeMatch) {
            day.spots[spotIndex].startTime = timeMatch[1];
            day.spots[spotIndex].endTime = timeMatch[2];
        }
    },

    updateSpotDesc(dayNum, spotIndex, descText) {
        const day = this.tripData.dayPlans.find(d => d.day === dayNum);
        if (!day || !day.spots[spotIndex]) return;
        day.spots[spotIndex].description = descText.trim();
    },

    getDateOfDay(dayNum) {
        const base = this.startDate || new Date();
        const date = new Date(base);
        date.setDate(date.getDate() + (dayNum - 1));
        return date;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // 兼容 HTML 中 App.showToast 调用
    showToast(msg, duration) {
        UIRender.showToast(msg, duration);
    },

    // 下拉刷新：可附着到任意 .page-scroll 容器
    _ptrState: new WeakMap(),
    initPullToRefresh(scrollEl, onRefresh) {
        if (!scrollEl || this._ptrState.has(scrollEl)) return;
        // 注入指示器
        const indicator = document.createElement('div');
        indicator.className = 'ptr-indicator';
        indicator.innerHTML = '<span class="ptr-spinner">↓</span><span class="ptr-text">下拉刷新</span>';
        scrollEl.insertBefore(indicator, scrollEl.firstChild);

        const state = { pulling: false, startY: 0, dist: 0, refreshing: false };
        this._ptrState.set(scrollEl, state);

        const THRESHOLD = 60;
        const MAX = 90;

        scrollEl.addEventListener('touchstart', (e) => {
            if (state.refreshing || scrollEl.scrollTop > 0) return;
            state.startY = e.touches[0].clientY;
            state.pulling = true;
        }, { passive: true });

        scrollEl.addEventListener('touchmove', (e) => {
            if (!state.pulling || state.refreshing) return;
            const dy = e.touches[0].clientY - state.startY;
            if (dy <= 0) { state.dist = 0; return; }
            // 阻尼
            state.dist = Math.min(dy * 0.5, MAX);
            if (state.dist > 4 && scrollEl.scrollTop <= 0) {
                indicator.style.transform = `translateY(${state.dist}px)`;
                indicator.style.opacity = Math.min(state.dist / THRESHOLD, 1);
                const text = indicator.querySelector('.ptr-text');
                const spinner = indicator.querySelector('.ptr-spinner');
                if (state.dist >= THRESHOLD) {
                    text.textContent = '释放刷新';
                    spinner.style.transform = 'rotate(180deg)';
                } else {
                    text.textContent = '下拉刷新';
                    spinner.style.transform = 'rotate(0deg)';
                }
            }
        }, { passive: true });

        const reset = () => {
            indicator.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
            indicator.style.transform = 'translateY(0)';
            indicator.style.opacity = '0';
            setTimeout(() => { indicator.style.transition = ''; }, 280);
            state.dist = 0;
            state.pulling = false;
        };

        scrollEl.addEventListener('touchend', async () => {
            if (!state.pulling || state.refreshing) { reset(); return; }
            if (state.dist >= THRESHOLD) {
                state.refreshing = true;
                indicator.querySelector('.ptr-text').textContent = '刷新中…';
                indicator.querySelector('.ptr-spinner').style.transform = 'rotate(180deg)';
                indicator.querySelector('.ptr-spinner').classList.add('ptr-spinning');
                indicator.style.transition = 'transform 0.25s ease';
                indicator.style.transform = `translateY(${THRESHOLD}px)`;
                try {
                    await onRefresh();
                } catch(e) {}
                indicator.querySelector('.ptr-spinner').classList.remove('ptr-spinning');
                state.refreshing = false;
                reset();
            } else {
                reset();
            }
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.init();

    const aiToggle = document.getElementById('aiSuggestToggle');
    if (aiToggle) {
        const enabled = localStorage.getItem('aiSuggestEnabled') !== 'false';
        aiToggle.checked = enabled;
        aiToggle.addEventListener('change', () => {
            localStorage.setItem('aiSuggestEnabled', aiToggle.checked);
            const fab = document.getElementById('aiFabBtn');
            if (fab) fab.style.display = aiToggle.checked ? 'flex' : 'none';
            document.querySelectorAll('.ai-inline-suggestion').forEach(el => el.style.display = aiToggle.checked ? 'flex' : 'none');
            document.querySelectorAll('.ai-tips-toggle').forEach(el => el.style.display = aiToggle.checked ? 'inline-flex' : 'none');
            document.querySelectorAll('.ai-tips-panel').forEach(el => {
                el.classList.remove('show');
                el.style.display = 'none';
            });
        });
    }
});
