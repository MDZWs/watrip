const AIMemory = {
    KEYS: {
        USER_PREFS: 'trip_user_prefs',
        THINKING_HISTORY: 'trip_thinking_history',
        TRIP_HISTORY: 'trip_history',
        PENDING_DELETES: 'trip_pending_deletes',
        LAST_SYNC_AT: 'trip_last_sync_at',
        COMMUNITY_CACHE: 'trip_community_cache',
        CONVERSATIONS: 'trip_conversations',
        USER_TEMPLATES: 'trip_user_templates',
    },

    SKILLS: {
        PLANNER: {
            name: '行程规划师',
            icon: '🗺️',
            systemPrompt: `你是哇途AI的行程规划专家。你必须严格遵守以下规则：

【边界约束（最重要）】
1. 只能规划真实存在的地点，禁止规划不存在/虚构/超出地球的地点（如月球、火星、三体世界等）
2. 如果用户输入的目的地无法在地图上找到，必须明确告知并建议真实存在的替代地点
3. 行程必须符合地理逻辑：相邻景点距离合理，避免同天跨城折返
4. 交通方式必须现实可行（步行/公交/地铁/打车/高铁/飞机），不能出现瞬移

【规划流程】
1. 理解用户意图：目的地、天数、日期、偏好、预算、人群类型
2. 检索目的地热门景点数据库，按类型分类
3. 按区域就近分组：同一天的景点尽量集中在同一片区
4. 合理安排时间：上午9点后开始，晚上9点前结束，每餐安排餐饮
5. 穿插交通衔接：标注景点间的交通方式和大致耗时
6. 适配用户偏好：根据用户标签（美食/拍照/小众/亲子等）加权推荐

【输出格式】
必须严格按照JSON格式返回行程数据，包含title、days、dayPlans结构。`,
        },
        LOCAL_EXPERT: {
            name: '本地攻略专家',
            icon: '💡',
            systemPrompt: `你是当地旅游攻略专家，负责提供实用的出行建议、避坑指南和实时Tips。
回答要简洁实用，优先给出可操作的建议。`,
        },
        CHAT_MODIFIER: {
            name: '行程调整助手',
            icon: '✏️',
            systemPrompt: `你是行程修改助手，根据用户的自然语言要求修改现有行程。
修改原则：保持整体路线合理性，只调整用户要求的部分，返回完整JSON。`,
        }
    },

    getUserPrefs() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.USER_PREFS) || '{}');
        } catch { return {}; }
    },

    saveUserPrefs(prefs) {
        const existing = this.getUserPrefs();
        localStorage.setItem(this.KEYS.USER_PREFS, JSON.stringify({ ...existing, ...prefs }));
    },

    saveThinking(tripId, thinkingSteps, duration) {
        const history = this.getAllThinking();
        history[tripId] = {
            steps: thinkingSteps,
            duration: duration,
            timestamp: Date.now(),
        };
        const keys = Object.keys(history);
        if (keys.length > 20) {
            delete history[keys[0]];
        }
        localStorage.setItem(this.KEYS.THINKING_HISTORY, JSON.stringify(history));
    },

    getThinking(tripId) {
        const history = this.getAllThinking();
        return history[tripId] || null;
    },

    getAllThinking() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.THINKING_HISTORY) || '{}');
        } catch { return {}; }
    },

    saveTrip(trip) {
        const trips = this.getAllTrips();
        const id = trip.id || ('trip_' + Date.now());
        const isNew = !trips[id];

        // 20 条上限检查（仅新建 + 非归档行程计数）
        if (isNew) {
            const activeCount = Object.values(trips).filter(t => !t.archivedAt).length;
            if (activeCount >= 20) {
                return { success: false, error: 'LIMIT_REACHED', id: null };
            }
        }

        trip.id = id;
        trip.savedAt = Date.now();
        trip.updatedAt = new Date().toISOString();
        trip.pendingSync = true;
        if (!trip.archivedAt) trip.archivedAt = null;
        trips[id] = trip;
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));

        // 异步触发云端同步（不阻塞 UI）；syncToCloud 由 Task-05 实现，markSynced 由 Task-04 实现
        this._notifyCloudSync(trip);

        return { success: true, id, error: '' };
    },

    // 异步触发云端同步（本地为主，失败保留 pendingSync=true 等待重试）
    _notifyCloudSync(trip) {
        if (typeof TripStorage === 'undefined' || typeof TripStorage.syncToCloud !== 'function') return;
        if (typeof Auth === 'undefined') return;
        const user = Auth.getCurrentUser();
        if (!user) return; // 未登录不同步
        TripStorage.syncToCloud(trip, user.id).then(result => {
            if (result.success && result.id && typeof this.markSynced === 'function') {
                this.markSynced(trip.id, result.id, result.updatedAt);
            }
        }).catch(e => {
            console.warn('[AIMemory] 云端同步失败，保留 pendingSync=true:', e?.message || e);
        });
    },

    getAllTrips() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.TRIP_HISTORY) || '{}');
        } catch { return {}; }
    },

    getTrip(id) {
        return this.getAllTrips()[id] || null;
    },

    async deleteTrip(id) {
        const trips = this.getAllTrips();
        const trip = trips[id];
        if (!trip) return { success: false, error: '行程不存在' };
        const cloudId = trip.cloudId;
        // 软删除：标记 deletedAt，移到回收站保留 7 天
        trips[id].deletedAt = Date.now();
        trips[id].updatedAt = new Date().toISOString();
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        if (typeof EventBus !== 'undefined') EventBus.emit('trip:deleted', { id });
        // 云端联动删除（后台静默处理，不阻塞UI）
        if (cloudId && typeof TripStorage !== 'undefined' && typeof TripStorage.deleteCloud === 'function') {
            try {
                const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000));
                await Promise.race([TripStorage.deleteCloud(cloudId, id), timeout]);
            } catch (e) {
                this._addPendingDelete(cloudId, id);
                console.warn('[AIMemory] 云端删除失败，已加入 pendingDelete:', e?.message || e);
            }
        }
        return { success: true, error: '' };
    },

    // 从回收站恢复行程
    restoreTrip(id) {
        const trips = this.getAllTrips();
        if (!trips[id]) return { success: false, error: '行程不存在' };
        delete trips[id].deletedAt;
        trips[id].updatedAt = new Date().toISOString();
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        if (typeof EventBus !== 'undefined') EventBus.emit('trip:restored', { id });
        return { success: true, error: '' };
    },

    // 永久删除行程（从回收站彻底删除）
    permanentlyDeleteTrip(id) {
        const trips = this.getAllTrips();
        if (!trips[id]) return { success: false, error: '行程不存在' };
        delete trips[id];
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        if (typeof EventBus !== 'undefined') EventBus.emit('trip:permanentlyDeleted', { id });
        return { success: true, error: '' };
    },

    // 获取已删除的行程列表（回收站）
    getDeletedTrips() {
        const trips = this.getAllTrips();
        const TRASH_DAYS = 7;
        const expireTime = TRASH_DAYS * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const deleted = [];
        let needCleanup = false;
        for (const id in trips) {
            const trip = trips[id];
            if (trip.deletedAt) {
                if (now - trip.deletedAt < expireTime) {
                    deleted.push(trip);
                } else {
                    needCleanup = true;
                }
            }
        }
        // 清理过期的
        if (needCleanup) {
            for (const id in trips) {
                if (trips[id].deletedAt && now - trips[id].deletedAt >= expireTime) {
                    delete trips[id];
                }
            }
            localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        }
        return deleted.sort((a, b) => b.deletedAt - a.deletedAt);
    },

    // 记录待补删的云端行程（离线删除或云端删除失败时使用）
    _addPendingDelete(cloudId, localId) {
        let list = [];
        try { list = JSON.parse(localStorage.getItem(this.KEYS.PENDING_DELETES) || '[]'); } catch {}
        if (list.length >= 50) list.shift(); // 上限 50 条
        list.push({ cloudId, localId, deletedAt: Date.now() });
        localStorage.setItem(this.KEYS.PENDING_DELETES, JSON.stringify(list));
    },

    // 归档行程（纯本地操作，不同步云端，见 ADR-1）
    archiveTrip(id) {
        const trips = this.getAllTrips();
        if (!trips[id]) return { success: false, error: '行程不存在' };
        trips[id].archivedAt = Date.now();
        trips[id].updatedAt = new Date().toISOString();
        trips[id].pendingSync = false; // 归档不同步云端
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        if (typeof EventBus !== 'undefined') EventBus.emit('trip:archived', { id });
        return { success: true, error: '' };
    },

    // 取消归档（需检查 20 条上限）
    unarchiveTrip(id) {
        const trips = this.getAllTrips();
        if (!trips[id]) return { success: false, error: '行程不存在' };
        const activeCount = Object.values(trips).filter(t => !t.archivedAt && t.id !== id).length;
        if (activeCount >= 20) {
            return { success: false, error: 'LIMIT_REACHED' };
        }
        trips[id].archivedAt = null;
        trips[id].updatedAt = new Date().toISOString();
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        if (typeof EventBus !== 'undefined') EventBus.emit('trip:unarchived', { id });
        return { success: true, error: '' };
    },

    // ========== 查询方法 ==========

    getActiveTrips() {
        return Object.values(this.getAllTrips())
            .filter(t => !t.archivedAt)
            .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    },

    getArchivedTrips() {
        return Object.values(this.getAllTrips())
            .filter(t => t.archivedAt)
            .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
    },

    getPendingSyncTrips() {
        return Object.values(this.getAllTrips()).filter(t => t.pendingSync);
    },

    getActiveCount() {
        return Object.values(this.getAllTrips()).filter(t => !t.archivedAt).length;
    },

    getPendingDeletes() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.PENDING_DELETES) || '[]');
        } catch { return []; }
    },

    clearPendingDeletes() {
        localStorage.removeItem(this.KEYS.PENDING_DELETES);
    },

    // ========== 同步辅助方法（供 TripStorage.syncFromCloud 调用） ==========

    // 云端行程写入本地（保留本地 archivedAt，归档不跨设备同步）
    applyCloudTrip(cloudTrip) {
        if (!cloudTrip || !cloudTrip.id) return;
        const trips = this.getAllTrips();
        const localTrip = trips[cloudTrip.id];
        const archivedAt = localTrip?.archivedAt || null;
        trips[cloudTrip.id] = {
            ...cloudTrip,
            id: cloudTrip.id,
            cloudId: cloudTrip.cloudId || cloudTrip.id,
            savedAt: cloudTrip.savedAt || Date.now(),
            pendingSync: false,
            archivedAt,
        };
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
    },

    // 为本地行程补 cloudId（首次上传云端成功后调用）
    updateCloudId(localId, cloudId, updatedAt) {
        const trips = this.getAllTrips();
        if (!trips[localId]) return;
        trips[localId].cloudId = cloudId;
        trips[localId].updatedAt = updatedAt || new Date().toISOString();
        trips[localId].pendingSync = false;
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
    },

    // 标记行程已同步（_notifyCloudSync 成功后调用）
    markSynced(tripId, cloudId, updatedAt) {
        const trips = this.getAllTrips();
        if (!trips[tripId]) return;
        if (cloudId) trips[tripId].cloudId = cloudId;
        trips[tripId].updatedAt = updatedAt || new Date().toISOString();
        trips[tripId].pendingSync = false;
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
    },

    // 更新本地行程 status（下架时由 TripStorage.unpublishTrip 调用）
    updateTripStatus(cloudId, status) {
        if (!cloudId) return;
        const trips = this.getAllTrips();
        const trip = Object.values(trips).find(t => t.cloudId === cloudId);
        if (!trip) return;
        trip.status = status;
        localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
    },

    setLastSyncAt(ts) {
        localStorage.setItem(this.KEYS.LAST_SYNC_AT, String(ts));
    },

    getLastSyncAt() {
        return Number(localStorage.getItem(this.KEYS.LAST_SYNC_AT)) || 0;
    },

    saveAsTemplate(trip, name) {
        try {
            const templates = JSON.parse(localStorage.getItem(this.KEYS.USER_TEMPLATES) || '[]');
            const template = {
                id: 'tpl_' + Date.now(),
                name: name || trip.title || '我的模板',
                createdAt: Date.now(),
                dayPlans: trip.dayPlans ? trip.dayPlans.map(dp => ({
                    spots: (dp.spots || []).map(s => ({
                        name: s.name,
                        address: s.address,
                        lng: s.lng,
                        lat: s.lat,
                        typeName: s.typeName,
                        stayMinutes: s.stayMinutes || 90,
                        cost: s.cost || s.baseCost || 0
                    }))
                })) : []
            };
            templates.unshift(template);
            if (templates.length > 20) templates.length = 20;
            localStorage.setItem(this.KEYS.USER_TEMPLATES, JSON.stringify(templates));
            return template;
        } catch(e) {
            console.error('保存模板失败', e);
            return null;
        }
    },

    getUserTemplates() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.USER_TEMPLATES) || '[]');
        } catch { return []; }
    },

    getCommunityTemplates() {
        try {
            const cached = JSON.parse(localStorage.getItem(this.KEYS.COMMUNITY_CACHE));
            if (cached && Date.now() - cached.cachedAt < 86400000) {
                return cached.templates;
            }
        } catch {}
        return this.getSeedCommunityTemplates();
    },

    getSeedCommunityTemplates() {
        return [
            {
                id: 'seed_1',
                title: '杭州周末2日经典游',
                author: '旅行达人小鹿',
                avatar: '🦌',
                destination: '杭州',
                city: '杭州',
                days: 2,
                cover: '🏞️',
                likes: 328,
                copies: 156,
                favorites: 89,
                tags: ['经典必玩', '美食', '西湖'],
                season: '四季皆宜',
                suitableFor: ['情侣', '朋友'],
                budget: '人均800',
                description: '西湖-灵隐寺-河坊街经典路线，含本地人推荐美食',
                dayPlans: [
                    {
                        day: 1,
                        theme: '西湖经典环游',
                        spots: [
                            { name: '断桥残雪', address: '杭州市西湖区北山街断桥', emoji: '🌉', type: '景点', duration: 90, startMin: 540, endMin: 630, intro: '西湖十景之首，白堤起点' },
                            { name: '白堤-平湖秋月', address: '杭州市西湖区白堤', emoji: '🌸', type: '景点', duration: 90, startMin: 630, endMin: 720, intro: '漫步白堤赏西湖风光' },
                            { name: '楼外楼(孤山路店)', address: '杭州市西湖区孤山路30号', emoji: '🍜', type: '餐饮', duration: 90, startMin: 720, endMin: 810, intro: '西湖醋鱼东坡肉百年老店' },
                            { name: '苏堤春晓', address: '杭州市西湖区苏堤', emoji: '🌿', type: '景点', duration: 120, startMin: 810, endMin: 930, intro: '三公里长堤六桥烟柳' },
                            { name: '雷峰塔', address: '杭州市西湖区南山路15号', emoji: '🗼', type: '景点', duration: 90, startMin: 930, endMin: 1020, intro: '登塔俯瞰西湖全景' },
                            { name: '河坊街', address: '杭州市上城区河坊街', emoji: '🏮', type: '景点', duration: 90, startMin: 1050, endMin: 1140, intro: '南宋御街小吃老字号' },
                            { name: '知味观(河坊街店)', address: '杭州市上城区河坊街', emoji: '🥟', type: '餐饮', duration: 90, startMin: 1140, endMin: 1230, intro: '杭州小吃小笼包猫耳朵' }
                        ]
                    },
                    {
                        day: 2,
                        theme: '灵隐禅意+龙井茶园',
                        spots: [
                            { name: '灵隐寺', address: '杭州市西湖区法云弄1号', emoji: '🏛️', type: '景点', duration: 150, startMin: 540, endMin: 690, intro: '千年古刹飞来峰造像' },
                            { name: '灵隐素斋', address: '灵隐寺内', emoji: '🥬', type: '餐饮', duration: 90, startMin: 690, endMin: 780, intro: '素面素鹅清净斋饭' },
                            { name: '龙井村', address: '杭州市西湖区龙井村', emoji: '🍵', type: '景点', duration: 90, startMin: 810, endMin: 900, intro: '茶园品茶体验采茶' },
                            { name: '杨公堤', address: '杭州市西湖区杨公堤', emoji: '🚶', type: '景点', duration: 90, startMin: 930, endMin: 1020, intro: '西湖三堤中最幽静' },
                            { name: '外婆家(湖滨店)', address: '杭州市上城区湖滨路', emoji: '🍚', type: '餐饮', duration: 120, startMin: 1050, endMin: 1170, intro: '家常杭帮菜茶香鸡' }
                        ]
                    }
                ]
            },
            {
                id: 'seed_2',
                title: '上海City Walk美食路线',
                author: '吃货阿明',
                avatar: '🍜',
                destination: '上海',
                city: '上海',
                days: 1,
                cover: '🌃',
                likes: 512,
                copies: 289,
                favorites: 203,
                tags: ['美食', 'citywalk', '拍照'],
                season: '四季皆宜',
                suitableFor: ['吃货', '朋友'],
                budget: '人均300',
                description: '从武康路到外滩，一路吃遍老上海弄堂小吃',
                dayPlans: [
                    {
                        day: 1,
                        theme: '武康路到外滩漫步',
                        spots: [
                            { name: '武康大楼', address: '上海市徐汇区淮海中路1850号', emoji: '🏢', type: '景点', duration: 60, startMin: 570, endMin: 630, intro: '诺曼底公寓邬达克经典' },
                            { name: '武康路历史街区', address: '上海市徐汇区武康路', emoji: '🌳', type: '景点', duration: 90, startMin: 630, endMin: 720, intro: '梧桐树下老洋房漫步' },
                            { name: '老吉士酒家(天平路店)', address: '上海市徐汇区天平路41号', emoji: '🦀', type: '餐饮', duration: 90, startMin: 720, endMin: 810, intro: '本帮菜红烧肉葱烤大排' },
                            { name: '田子坊', address: '上海市黄浦区泰康路210弄', emoji: '🎨', type: '景点', duration: 90, startMin: 840, endMin: 930, intro: '弄堂创意小店文艺范' },
                            { name: '豫园/城隍庙', address: '上海市黄浦区安仁街218号', emoji: '🏯', type: '景点', duration: 90, startMin: 930, endMin: 1020, intro: '江南园林南翔小笼包' },
                            { name: '南京路步行街', address: '上海市黄浦区南京东路', emoji: '🚶', type: '景点', duration: 90, startMin: 1050, endMin: 1140, intro: '中华商业第一街' },
                            { name: '外滩', address: '上海市黄浦区中山东一路', emoji: '🌃', type: '景点', duration: 90, startMin: 1140, endMin: 1230, intro: '万国建筑博览群夜景' }
                        ]
                    }
                ]
            },
            {
                id: 'seed_3',
                title: '成都3日慢生活之旅',
                author: '熊猫饲养员',
                avatar: '🐼',
                destination: '成都',
                city: '成都',
                days: 3,
                cover: '🌶️',
                likes: 891,
                copies: 445,
                favorites: 378,
                tags: ['美食', '休闲', '亲子'],
                season: '春秋最佳',
                suitableFor: ['亲子', '家庭', '吃货'],
                budget: '人均1200',
                description: '看熊猫、逛宽窄巷子、吃火锅、人民公园喝茶采耳',
                dayPlans: [
                    {
                        day: 1,
                        theme: '熊猫+宽窄巷子',
                        spots: [
                            { name: '成都大熊猫繁育研究基地', address: '成都市成华区熊猫大道1375号', emoji: '🐼', type: '景点', duration: 180, startMin: 510, endMin: 690, intro: '看滚滚卖萌必去早上活跃' },
                            { name: '陈麻婆豆腐(青华路店)', address: '成都市青羊区青华路10号', emoji: '🌶️', type: '餐饮', duration: 90, startMin: 720, endMin: 810, intro: '百年老字号麻婆豆腐发源地' },
                            { name: '宽窄巷子', address: '成都市青羊区宽窄巷子', emoji: '🏘️', type: '景点', duration: 120, startMin: 840, endMin: 960, intro: '老成都缩影三条巷子' },
                            { name: '人民公园', address: '成都市青羊区少城路12号', emoji: '🍵', type: '景点', duration: 90, startMin: 990, endMin: 1080, intro: '鹤鸣茶社喝茶采耳' },
                            { name: '蜀大侠火锅(总府路店)', address: '成都市锦江区总府路', emoji: '🍲', type: '餐饮', duration: 120, startMin: 1110, endMin: 1230, intro: '网红火锅龙头锅' }
                        ]
                    },
                    {
                        day: 2,
                        theme: '武侯祠+锦里+春熙路',
                        spots: [
                            { name: '武侯祠', address: '成都市武侯区武侯祠大街231号', emoji: '🏛️', type: '景点', duration: 120, startMin: 540, endMin: 660, intro: '三国圣地红墙竹影' },
                            { name: '锦里古街', address: '成都市武侯区武侯祠大街', emoji: '🏮', type: '景点', duration: 90, startMin: 660, endMin: 750, intro: '西蜀第一街小吃云集' },
                            { name: '锦里小吃', address: '锦里内', emoji: '🍢', type: '餐饮', duration: 90, startMin: 750, endMin: 840, intro: '三大炮肥肠粉糖油果子' },
                            { name: '杜甫草堂', address: '成都市青羊区青华路37号', emoji: '📜', type: '景点', duration: 90, startMin: 870, endMin: 960, intro: '诗圣故居茅屋故居' },
                            { name: '春熙路/太古里', address: '成都市锦江区春熙路', emoji: '🛍️', type: '景点', duration: 90, startMin: 990, endMin: 1080, intro: '时尚商圈IFS熊猫爬墙' },
                            { name: '小龙坎火锅(春熙店)', address: '成都市锦江区春熙路', emoji: '🥘', type: '餐饮', duration: 120, startMin: 1110, endMin: 1230, intro: '麻辣鲜香排队王' }
                        ]
                    },
                    {
                        day: 3,
                        theme: '都江堰+灌县古城',
                        spots: [
                            { name: '都江堰景区', address: '成都市都江堰市公园路', emoji: '💧', type: '景点', duration: 240, startMin: 480, endMin: 720, intro: '千年水利工程鱼嘴飞沙' },
                            { name: '尤兔头(都江堰店)', address: '都江堰市', emoji: '🐰', type: '餐饮', duration: 90, startMin: 720, endMin: 810, intro: '都江堰特色卤兔头' },
                            { name: '灌县古城', address: '都江堰市灌县古城', emoji: '🏯', type: '景点', duration: 120, startMin: 840, endMin: 960, intro: '南桥夜景古城老街' },
                            { name: '返回成都+九眼桥酒吧街', address: '成都市锦江区九眼桥', emoji: '🍺', type: '景点', duration: 90, startMin: 990, endMin: 1080, intro: '府南河边夜景酒吧' }
                        ]
                    }
                ]
            },
            {
                id: 'seed_4',
                title: '厦门鼓浪屿文艺2日',
                author: '海边的卡夫卡',
                avatar: '🌊',
                destination: '厦门',
                city: '厦门',
                days: 2,
                cover: '🏖️',
                likes: 467,
                copies: 223,
                favorites: 156,
                tags: ['文艺', '拍照', '海岛'],
                season: '4-11月',
                suitableFor: ['情侣', '朋友'],
                budget: '人均1000',
                description: '鼓浪屿深度游+环岛路骑行+曾厝垵小吃',
                dayPlans: [
                    {
                        day: 1,
                        theme: '鼓浪屿深度游',
                        spots: [
                            { name: '轮渡前往鼓浪屿', address: '厦门邮轮中心厦鼓码头', emoji: '⛴️', type: '交通', duration: 30, startMin: 510, endMin: 540, intro: '乘船登岛' },
                            { name: '日光岩', address: '厦门市思明区鼓浪屿晃岩路62号', emoji: '⛰️', type: '景点', duration: 90, startMin: 540, endMin: 630, intro: '鼓浪屿最高点俯瞰全岛' },
                            { name: '菽庄花园+钢琴博物馆', address: '厦门市思明区鼓浪屿港仔后路7号', emoji: '🎹', type: '景点', duration: 90, startMin: 630, endMin: 720, intro: '海滨花园钢琴之岛' },
                            { name: '林记鱼丸(泉州路店)', address: '鼓浪屿泉州路', emoji: '🍥', type: '餐饮', duration: 90, startMin: 720, endMin: 810, intro: '鼓浪屿老字号鲨鱼丸' },
                            { name: '鼓浪屿小巷漫步', address: '鼓浪屿', emoji: '🏘️', type: '景点', duration: 120, startMin: 810, endMin: 930, intro: '万国建筑最美转角' },
                            { name: '皓月园', address: '厦门市思明区鼓浪屿漳州路3号', emoji: '🗿', type: '景点', duration: 90, startMin: 930, endMin: 1020, intro: '郑成功雕像海边' },
                            { name: '龙头路小吃街', address: '鼓浪屿龙头路', emoji: '🥧', type: '餐饮', duration: 120, startMin: 1080, endMin: 1200, intro: '赵小姐的店张三疯奶茶' }
                        ]
                    },
                    {
                        day: 2,
                        theme: '环岛路+曾厝垵',
                        spots: [
                            { name: '南普陀寺', address: '厦门市思明区思明南路515号', emoji: '🙏', type: '景点', duration: 120, startMin: 540, endMin: 660, intro: '闽南名寺素饼有名' },
                            { name: '厦门大学', address: '厦门市思明区思明南路422号', emoji: '🎓', type: '景点', duration: 90, startMin: 660, endMin: 750, intro: '最美大学芙蓉隧道' },
                            { name: '厦大附近沙茶面', address: '厦大周边', emoji: '🍜', type: '餐饮', duration: 90, startMin: 750, endMin: 840, intro: '厦门特色沙茶面' },
                            { name: '环岛路骑行', address: '厦门市思明区环岛路', emoji: '🚴', type: '景点', duration: 150, startMin: 870, endMin: 1020, intro: '椰风寨音乐广场海滩' },
                            { name: '曾厝垵', address: '厦门市思明区曾厝垵', emoji: '🏖️', type: '景点', duration: 90, startMin: 1020, endMin: 1110, intro: '文艺渔村小吃一条街' },
                            { name: '曾厝垵海鲜', address: '曾厝垵', emoji: '🦐', type: '餐饮', duration: 120, startMin: 1110, endMin: 1230, intro: '海边大排档新鲜海鲜' }
                        ]
                    }
                ]
            },
            {
                id: 'seed_5',
                title: '北京3天历史文化深度游',
                author: '皇城根下',
                avatar: '🏛️',
                destination: '北京',
                city: '北京',
                days: 3,
                cover: '🏯',
                likes: 678,
                copies: 312,
                favorites: 245,
                tags: ['历史', '文化', '经典'],
                season: '春秋最佳',
                suitableFor: ['家庭', '长辈'],
                budget: '人均1500',
                description: '故宫长城天安门胡同美食，第一次来北京必走路线',
                dayPlans: [
                    {
                        day: 1,
                        theme: '天安门+故宫+景山',
                        spots: [
                            { name: '天安门广场', address: '北京市东城区天安门', emoji: '🇨🇳', type: '景点', duration: 60, startMin: 480, endMin: 540, intro: '升旗人民英雄纪念碑' },
                            { name: '故宫博物院', address: '北京市东城区景山前街4号', emoji: '🏯', type: '景点', duration: 210, startMin: 540, endMin: 750, intro: '紫禁城六百年皇家宫殿' },
                            { name: '四季民福烤鸭店(故宫店)', address: '北京市东城区南池子大街', emoji: '🦆', type: '餐饮', duration: 90, startMin: 750, endMin: 840, intro: '故宫边吃烤鸭观景' },
                            { name: '景山公园', address: '北京市西城区景山西街44号', emoji: '🌳', type: '景点', duration: 90, startMin: 870, endMin: 960, intro: '万春亭俯瞰故宫全景' },
                            { name: '南锣鼓巷', address: '北京市东城区南锣鼓巷', emoji: '🏮', type: '景点', duration: 90, startMin: 990, endMin: 1080, intro: '老北京胡同文艺小店' },
                            { name: '簋街', address: '北京市东城区东直门内大街', emoji: '🦞', type: '餐饮', duration: 120, startMin: 1110, endMin: 1230, intro: '麻辣小龙虾夜宵一条街' }
                        ]
                    },
                    {
                        day: 2,
                        theme: '长城+奥林匹克公园',
                        spots: [
                            { name: '八达岭长城', address: '北京市延庆区八达岭镇', emoji: '🏔️', type: '景点', duration: 300, startMin: 420, endMin: 720, intro: '不到长城非好汉北八楼' },
                            { name: '长城脚下农家菜', address: '八达岭', emoji: '🍲', type: '餐饮', duration: 90, startMin: 720, endMin: 810, intro: '柴鸡炖蘑菇贴饼子' },
                            { name: '奥林匹克公园', address: '北京市朝阳区北辰东路15号', emoji: '🏟️', type: '景点', duration: 120, startMin: 900, endMin: 1020, intro: '鸟巢水立方奥运场馆' },
                            { name: '什刹海/后海', address: '北京市西城区什刹海', emoji: '🌅', type: '景点', duration: 90, startMin: 1050, endMin: 1140, intro: '老北京水乡胡同酒吧' },
                            { name: '全聚德(什刹海店)', address: '什刹海附近', emoji: '🦆', type: '餐饮', duration: 90, startMin: 1140, endMin: 1230, intro: '百年老字号挂炉烤鸭' }
                        ]
                    },
                    {
                        day: 3,
                        theme: '颐和园+圆明园+清华北大',
                        spots: [
                            { name: '颐和园', address: '北京市海淀区新建宫门路19号', emoji: '🏛️', type: '景点', duration: 180, startMin: 510, endMin: 690, intro: '皇家园林长廊佛香阁昆明湖' },
                            { name: '海碗居(颐和园店)', address: '海淀区', emoji: '🍜', type: '餐饮', duration: 90, startMin: 690, endMin: 780, intro: '老北京炸酱面' },
                            { name: '圆明园', address: '北京市海淀区清华西路28号', emoji: '🏚️', type: '景点', duration: 120, startMin: 810, endMin: 930, intro: '万园之园遗址大水法' },
                            { name: '清华大学/北京大学', address: '海淀区中关村北大街/颐和园路', emoji: '🎓', type: '景点', duration: 90, startMin: 960, endMin: 1050, intro: '顶级学府二校门未名湖' },
                            { name: '护国寺小吃', address: '西城区护国寺大街', emoji: '🥟', type: '餐饮', duration: 120, startMin: 1080, endMin: 1200, intro: '豆汁焦圈驴打滚艾窝窝' }
                        ]
                    }
                ]
            },
            {
                id: 'seed_6',
                title: '西安2日美食历史游',
                author: '肉夹馍爱好者',
                avatar: '🥙',
                destination: '西安',
                city: '西安',
                days: 2,
                cover: '🏺',
                likes: 723,
                copies: 389,
                favorites: 267,
                tags: ['历史', '美食', '网红'],
                season: '春秋最佳',
                suitableFor: ['朋友', '吃货'],
                budget: '人均900',
                description: '兵马俑+回民街+大唐不夜城，碳水天堂之旅',
                dayPlans: [
                    {
                        day: 1,
                        theme: '兵马俑+华清宫+回民街',
                        spots: [
                            { name: '秦始皇兵马俑博物馆', address: '西安市临潼区秦陵北路', emoji: '🏺', type: '景点', duration: 240, startMin: 450, endMin: 690, intro: '世界第八大奇迹一二三号坑' },
                            { name: '临潼火晶柿子/石榴', address: '临潼', emoji: '🍅', type: '餐饮', duration: 90, startMin: 690, endMin: 780, intro: '临潼特产时令水果' },
                            { name: '华清宫', address: '西安市临潼区华清路38号', emoji: '♨️', type: '景点', duration: 120, startMin: 810, endMin: 930, intro: '杨贵妃温泉海棠汤' },
                            { name: '西安城墙(南门)', address: '西安市碑林区南大街2号', emoji: '🏰', type: '景点', duration: 90, startMin: 1020, endMin: 1110, intro: '骑行古城墙俯瞰西安' },
                            { name: '回民街/北院门', address: '西安市莲湖区北院门', emoji: '🍢', type: '餐饮', duration: 150, startMin: 1110, endMin: 1260, intro: '羊肉泡馍肉夹馍美食街' }
                        ]
                    },
                    {
                        day: 2,
                        theme: '陕西历史博物馆+大雁塔+大唐不夜城',
                        spots: [
                            { name: '陕西历史博物馆', address: '西安市雁塔区小寨东路91号', emoji: '🏛️', type: '景点', duration: 180, startMin: 510, endMin: 690, intro: '十三朝古都国宝镶金兽首玛瑙杯' },
                            { name: '子午路张记肉夹馍', address: '雁塔区', emoji: '🥙', type: '餐饮', duration: 90, startMin: 690, endMin: 780, intro: '优质肉夹馍凉皮冰峰' },
                            { name: '大雁塔/大慈恩寺', address: '西安市雁塔区慈恩路1号', emoji: '🗼', type: '景点', duration: 90, startMin: 810, endMin: 900, intro: '玄奘译经藏经之地' },
                            { name: '曲江池遗址公园', address: '西安市雁塔区曲江池', emoji: '🌊', type: '景点', duration: 120, startMin: 900, endMin: 1020, intro: '大唐园林曲江流饮' },
                            { name: '永兴坊', address: '西安市新城区东新街', emoji: '🏮', type: '景点', duration: 90, startMin: 1050, endMin: 1140, intro: '摔碗酒陕北美食非遗' },
                            { name: '大唐不夜城', address: '西安市雁塔区大雁塔南广场', emoji: '🌃', type: '景点', duration: 120, startMin: 1140, endMin: 1260, intro: '盛唐天街不倒翁小姐姐' }
                        ]
                    }
                ]
            },
        ];
    },

    searchRelevantTemplates(destination, prefs) {
        const templates = this.getCommunityTemplates();
        return templates
            .filter(t => {
                const matchDest = t.destination.includes(destination) || destination.includes(t.destination);
                const matchPref = !prefs || prefs.length === 0 || 
                    prefs.some(p => t.tags.some(tag => {
                        const prefMap = { food: '美食', classic: '经典', photo: '拍照', niche: '小众', nature: '自然', shopping: '购物' };
                        return tag.includes(prefMap[p] || p);
                    }));
                return matchDest || matchPref;
            })
            .slice(0, 3);
    },

    buildPlannerPrompt(destinations, days, prefs, startDate, endDate, realPOIs = []) {
        const userPrefs = this.getUserPrefs();
        const relevantTemplates = this.searchRelevantTemplates(destinations[0] || '', prefs);
        
        const prefNames = {
            classic: '经典必玩', food: '吃吃喝喝', niche: '小众探索',
            photo: '拍照出片', shopping: '逛街购物', nature: '自然风光',
            citywalk: 'City Walk', art: '文艺展览', history: '历史古建'
        };
        const prefsText = prefs.length > 0 
            ? prefs.map(p => prefNames[p] || p).join('、')
            : '经典必玩+美食推荐';

        let refText = '';
        if (relevantTemplates.length > 0) {
            refText = '\n\n【社区优质行程参考】（以下是其他用户的优质方案，可参考但不要直接复制）\n';
            relevantTemplates.forEach((t, i) => {
                refText += `参考方案${i+1}：${t.title}（${t.author}）- ${t.description}，被${t.copies}人使用\n`;
            });
        }

        let userContext = '';
        if (userPrefs.favoriteStyles) {
            userContext += `\n用户偏好风格：${userPrefs.favoriteStyles.join('、')}`;
        }
        if (userPrefs.budget) {
            userContext += `\n用户预算倾向：${userPrefs.budget}`;
        }

        const dest = destinations.join('、');
        const dateInfo = startDate ? `，出发日期：${this.formatDate(startDate)}` : '';

        let poiListText = '';
        if (realPOIs && realPOIs.length > 0) {
            poiListText = '\n\n【真实景点数据库】以下是从高德地图搜索到的' + dest + '真实景点，你【必须且只能】从以下列表中选择景点，绝对不可以编造列表外的景点名称和地址：\n';
            realPOIs.forEach((poi, i) => {
                poiListText += `${i+1}. ${poi.name} | 地址：${poi.address || dest} | 类型：${poi.type || '景点'}${poi.rating ? ' | 评分：' + poi.rating : ''}${poi.cost ? ' | 人均：' + poi.cost + '元' : ''}\n`;
            });
            poiListText += '\n⚠️ 重要约束：每个景点的name和address必须严格使用上面列表中的值，不得修改、不得编造、不得添加列表中不存在的景点。';
        }

        return `${this.SKILLS.PLANNER.systemPrompt}
${userContext}
${refText}

请为我规划一个${dest}的${days}天旅行行程${dateInfo}。
旅行偏好：${prefsText}
${poiListText}

【具体要求】
1. 每天安排4-6个景点/活动，时间合理（上午9点-晚上9点）
2. 必须包含餐饮安排：在景点附近穿插美食/餐厅（${realPOIs.length > 0 ? '从真实景点数据库中选择餐饮类型' : '推荐当地知名特色餐厅'}）
3. ${realPOIs.length > 0 ? '【强制】只能选择【真实景点数据库】中的景点，禁止编造任何景点名称或地址' : '景点必须是' + dest + '真实存在的知名景点，给出准确的中文名和地址'}
4. 每个景点要有具体地址
5. 交通方式合理（步行/公交/地铁/打车）
6. 给每个景点配emoji和真实标签
7. 景点顺序按地理位置就近排列，不折返
8. 每天的行程要有一个主题概括

请严格按照JSON格式返回：
{
  "title": "${dest}${days}天${prefsText}行程标题",
  "days": ${days},
  "dayPlans": [
    {
      "day": 1,
      "dateLabel": "",
      "theme": "当天主题（如经典地标打卡）",
      "city": "${dest}",
      "spots": [
        {
          "name": "${realPOIs.length > 0 ? '必须从列表中选择景点名' : '景点名'}",
          "type": "类型（历史古迹/自然风光/美食/购物/景点/文化/休闲）",
          "startTime": "09:00",
          "endTime": "11:00",
          "address": "${realPOIs.length > 0 ? '必须使用列表中对应地址' : '详细地址'}",
          "description": "一句话真实介绍",
          "emoji": "🏛️",
          "tags": ["标签1","标签2"],
          "duration": "2小时",
          "cost": 0,
          "businessHours": "09:00-17:00"
        }
      ]
    }
  ]
}

注意：只返回JSON，不要其他文字。${realPOIs.length > 0 ? '景点必须全部来自提供的真实景点数据库！' : ''}`;
    },

    generateThinkingSteps(destinations, days, prefs, startDate, templates) {
        const dest = destinations.join('、');
        const prefNames = {
            classic: '经典必玩', food: '吃吃喝喝', niche: '小众秘境',
            photo: '拍照出片', shopping: '逛街购物', nature: '自然风光'
        };
        const prefText = prefs.map(p => prefNames[p] || p).join('、');

        const steps = [
            {
                label: '理解出行需求',
                detail: `用户想去<span class="thinking-keyword">${dest}</span>，计划<span class="thinking-keyword">${days}天</span>行程${startDate ? `，出发日期${this.formatDate(startDate)}` : ''}${prefText ? `，偏好：<span class="thinking-keyword">${prefText}</span>` : ''}。`
            },
            {
                label: `搜索${dest}真实景点`,
                detail: `正在从高德地图检索<span class="thinking-keyword">${dest}</span>真实存在的景点、餐厅、商圈数据，按评分排序...${templates.length > 0 ? `参考<span class="thinking-keyword">${templates.length}个</span>社区优质行程方案` : ''}`
            },
            {
                label: '智能编排行程路线',
                detail: `基于真实景点数据，按地理位置就近原则分组，规划每天4-6个景点的游览顺序，避免来回折返...`
            },
            {
                label: '安排时间与美食',
                detail: `合理分配游览时间，穿插当地特色美食餐厅，标注交通方式（步行/地铁/打车），确保行程张弛有度。`
            },
            {
                label: '校验景点真实性',
                detail: `正在校验每个景点的真实地址和经纬度，确保所有地点均可导航到达，即将完成...`
            }
        ];

        return steps;
    },

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getMonth()+1}月${d.getDate()}日`;
    },

    saveConversation(tripId, messages) {
        const all = this.getAllConversations();
        if (!all[tripId]) all[tripId] = [];
        all[tripId].push({
            messages: messages,
            timestamp: Date.now()
        });
        if (all[tripId].length > 20) all[tripId].shift();
        localStorage.setItem(this.KEYS.CONVERSATIONS, JSON.stringify(all));
    },

    getAllConversations() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.CONVERSATIONS) || '{}');
        } catch { return {}; }
    }
};
