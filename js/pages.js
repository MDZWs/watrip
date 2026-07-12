const COVER_COLORS = [
    { bg: 'linear-gradient(135deg, #FFB983 0%, #FF8A3D 100%)', emoji: '🏙️', name: '暖阳橙' },
    { bg: 'linear-gradient(135deg, #B8ADFF 0%, #8B7CF5 100%)', emoji: '🏞️', name: '梦幻紫' },
    { bg: 'linear-gradient(135deg, #A8E0FF 0%, #5CC6FF 100%)', emoji: '🏖️', name: '晴空蓝' },
    { bg: 'linear-gradient(135deg, #FFA3B5 0%, #FF6B8A 100%)', emoji: '🌸', name: '樱花粉' },
    { bg: 'linear-gradient(135deg, #7DD892 0%, #34C759 100%)', emoji: '🌿', name: '森林绿' },
    { bg: 'linear-gradient(135deg, #FFE86B 0%, #FFD60A 100%)', emoji: '🌻', name: '向日葵黄' },
    { bg: 'linear-gradient(135deg, #FFB84D 0%, #FF9500 100%)', emoji: '🏔️', name: '日落金' },
    { bg: 'linear-gradient(135deg, #FF9F9F 0%, #FF6961 100%)', emoji: '🌶️', name: '活力红' },
];

const CITY_THEMES = {
    '北京': { bg: 'linear-gradient(135deg, #8B0000 0%, #DC143C 50%, #FFD700 100%)', emoji: '🏯', name: '紫禁红' },
    '上海': { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #e94560 100%)', emoji: '🌃', name: '魔都夜' },
    '杭州': { bg: 'linear-gradient(135deg, #a8e6cf 0%, #88d8b0 50%, #56ab91 100%)', emoji: '🏞️', name: '西湖绿' },
    '成都': { bg: 'linear-gradient(135deg, #2d3436 0%, #636e72 50%, #b2bec3 100%)', emoji: '🐼', name: '熊猫黑' },
    '西安': { bg: 'linear-gradient(135deg, #d4a574 0%, #c9956c 50%, #8b6914 100%)', emoji: '🏺', name: '古城黄' },
    '厦门': { bg: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #00cec9 100%)', emoji: '🏖️', name: '海岛蓝' },
    '三亚': { bg: 'linear-gradient(135deg, #fdcb6e 0%, #f39c12 50%, #e17055 100%)', emoji: '🌴', name: '热带金' },
    '丽江': { bg: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #fd79a8 100%)', emoji: '⛰️', name: '雪山紫' },
    '重庆': { bg: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 50%, #f39c12 100%)', emoji: '🌶️', name: '火锅红' },
    '广州': { bg: 'linear-gradient(135deg, #00b894 0%, #00cec9 50%, #81ecec 100%)', emoji: '🍵', name: '岭南翠' },
    '深圳': { bg: 'linear-gradient(135deg, #006266 0%, #009432 50%, #a3cb38 100%)', emoji: '🏙️', name: '科技绿' },
    '苏州': { bg: 'linear-gradient(135deg, #dfe6e9 0%, #b2bec3 50%, #74b9ff 100%)', emoji: '🏯', name: '园林灰' },
    '南京': { bg: 'linear-gradient(135deg, #636e72 0%, #2d3436 50%, #d63031 100%)', emoji: '🏛️', name: '金陵秋' },
    '武汉': { bg: 'linear-gradient(135deg, #fab1a0 0%, #e17055 50%, #d63031 100%)', emoji: '🌸', name: '樱花粉' },
    '长沙': { bg: 'linear-gradient(135deg, #ff7675 0%, #d63031 50%, #6c5ce7 100%)', emoji: '🌶️', name: '星城橙' },
    '青岛': { bg: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #fdcb6e 100%)', emoji: '🍺', name: '啤酒金' },
    '大理': { bg: 'linear-gradient(135deg, #00b894 0%, #55efc4 50%, #81ecec 100%)', emoji: '🏔️', name: '洱海蓝' },
    '桂林': { bg: 'linear-gradient(135deg, #55efc4 0%, #00b894 50%, #6c5ce7 100%)', emoji: '🗻', name: '山水青' },
    '昆明': { bg: 'linear-gradient(135deg, #fd79a8 0%, #e84393 50%, #fdcb6e 100%)', emoji: '🌺', name: '春城粉' },
    '天津': { bg: 'linear-gradient(135deg, #636e72 0%, #2d3436 50%, #0984e3 100%)', emoji: '🌉', name: '海河蓝' },
};

const DEFAULT_THEMES = COVER_COLORS;

function _formatTripDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getTripTheme(trip) {
    const dest = trip.destination || trip.dayPlans?.[0]?.city || '';
    if (trip.customTheme) {
        return { bg: trip.customTheme, emoji: trip.themeEmoji || '✈️', name: trip.themeName || '自定义' };
    }
    if (trip.customGradient && trip.customGradient.length >= 2) {
        const bg = `linear-gradient(135deg, ${trip.customGradient[0]} 0%, ${trip.customGradient[1]} 100%)`;
        return { bg, emoji: trip.themeEmoji || '🎨', name: trip.themeName || '自定义渐变' };
    }
    if (trip.themeId && CITY_THEMES[trip.themeId]) {
        return { ...CITY_THEMES[trip.themeId] };
    }
    if (trip.themeIndex !== undefined && trip.themeIndex !== null && DEFAULT_THEMES[trip.themeIndex]) {
        return { ...DEFAULT_THEMES[trip.themeIndex] };
    }
    for (const [city, theme] of Object.entries(CITY_THEMES)) {
        if (dest.includes(city)) {
            return { ...theme };
        }
    }
    const idx = (trip.savedAt ? new Date(trip.savedAt).getDate() : new Date().getDate()) % DEFAULT_THEMES.length;
    return { ...DEFAULT_THEMES[idx] };
}

const EMOJI_MAP = {
    '杭州': '🏞️', '上海': '🌃', '北京': '🏯', '成都': '🐼',
    '西安': '🏺', '厦门': '🏖️', '三亚': '🌴', '丽江': '⛰️',
    '重庆': '🌶️', '广州': '🍵', '深圳': '🏙️', '苏州': '🏯',
    '南京': '🏛️', '武汉': '🌸', '长沙': '🌶️', '青岛': '🍺',
    '大理': '🏔️', '桂林': '🗻', '昆明': '🌺', '天津': '🌉',
};

function getDestEmoji(dest) {
    if (!dest) return '✈️';
    for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
        if (dest.includes(key)) return emoji;
    }
    return '✈️';
}

function getTripStatus(trip) {
    if (trip.deletedAt) return 'deleted';
    const totalSpots = trip.dayPlans ? trip.dayPlans.reduce((sum, d) => sum + (d.spots?.length || 0), 0) : 0;
    const checkedSpots = trip.dayPlans ? trip.dayPlans.reduce((sum, d) => sum + (d.spots?.filter(s => s.checked || s.record?.checkedIn)?.length || 0), 0) : 0;
    const progress = totalSpots > 0 ? Math.round(checkedSpots / totalSpots * 100) : 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let tripStartDate = null;
    if (trip.startDate) {
        tripStartDate = new Date(trip.startDate + 'T00:00:00');
        if (isNaN(tripStartDate.getTime())) {
            tripStartDate = null;
        }
    }
    let tripEndDate = null;
    if (tripStartDate) {
        tripEndDate = new Date(tripStartDate);
        const actualDays = trip.dayPlans ? trip.dayPlans.filter(dp => dp.spots && dp.spots.length > 0).length : (trip.days || 1);
        tripEndDate.setDate(tripEndDate.getDate() + actualDays - 1);
    }
    // 已完成：进度 100% 或行程已过结束日期
    if (progress >= 100 || (tripEndDate && today > tripEndDate)) return 'completed';
    // 进行中：已到出发日期或已有进度
    if ((tripStartDate && today >= tripStartDate) || progress > 0) return 'ongoing';
    // 待出发
    return 'upcoming';
}

function calcTripStats(trip) {
    const totalSpots = trip.dayPlans ? trip.dayPlans.reduce((sum, d) => sum + (d.spots?.length || 0), 0) : 0;
    const checkedSpots = trip.dayPlans ? trip.dayPlans.reduce((sum, d) => sum + (d.spots?.filter(s => s.checked || s.record?.checkedIn)?.length || 0), 0) : 0;
    const progress = totalSpots > 0 ? Math.round(checkedSpots / totalSpots * 100) : 0;
    let totalExpense = 0;
    if (trip.expenses) {
        totalExpense = trip.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    }
    if (trip.dayPlans) {
        trip.dayPlans.forEach(dp => {
            (dp.spots || []).forEach(s => {
                const cost = parseFloat(s.cost) || parseFloat(s.baseCost) || 0;
                totalExpense += cost;
            });
        });
    }
    const actualDays = trip.dayPlans ? trip.dayPlans.filter(dp => dp.spots && dp.spots.length > 0).length : (trip.days || 1);
    return { totalSpots, checkedSpots, progress, totalExpense, actualDays };
}

function formatTripCard(trip, index, cardStatus, isTrashView = false) {
    const date = trip.savedAt ? new Date(trip.savedAt) : new Date();
    const dateStr = `${date.getMonth()+1}月${date.getDate()}日`;
    const stats = calcTripStats(trip);
    const { totalSpots, checkedSpots, progress, totalExpense, actualDays } = stats;

    const tagColor = (() => {
        if (!trip.tag) return '#FF9500';
        const colors = ['#FF9500', '#FF6B6B', '#4ECDC4', '#45B7D1',
                        '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
                        '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500'];
        let hash = 0;
        for (let i = 0; i < trip.tag.length; i++) {
            hash = trip.tag.charCodeAt(i) + ((hash << 5) - hash);
        }
        const idx = Math.abs(hash) % colors.length;
        return colors[idx];
    })();

    const status = cardStatus || getTripStatus(trip);
    const isOngoing = status === 'ongoing';
    const isArchived = status === 'archived';
    const isCompleted = status === 'completed';

    let currentDayNum = 1;
    let timeLabel;
    let isOngoingToday = false;
    if (isOngoing && trip.startDate) {
        const sd = new Date(trip.startDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0,0,0,0);
        if (isNaN(sd.getTime())) {
            timeLabel = '即将出发';
        } else {
            sd.setHours(0,0,0,0);
            const dayDiff = Math.floor((today - sd) / (1000*60*60*24));
            if (dayDiff >= 0) {
                currentDayNum = Math.min(dayDiff + 1, actualDays);
                timeLabel = `第${currentDayNum}天`;
                isOngoingToday = true;
            } else {
                if (dayDiff === 0) timeLabel = `今日出发`;
                else if (dayDiff === -1) timeLabel = `明日出发`;
                else timeLabel = `${-dayDiff}天后出发`;
            }
        }
    } else if (isArchived) {
        timeLabel = trip.archivedAt ? '归档于 ' + new Date(trip.archivedAt).toLocaleDateString('zh-CN', {month:'short', day:'numeric'}) : '已归档';
    } else if (isCompleted) {
        timeLabel = trip.completedAt ? new Date(trip.completedAt).toLocaleDateString('zh-CN', {month:'short', day:'numeric'}) + ' 完成' : '已完成';
    } else if (trip.startDate) {
        const sd = new Date(trip.startDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0,0,0,0);
        if (isNaN(sd.getTime())) {
            timeLabel = '即将出发';
        } else {
            sd.setHours(0,0,0,0);
            const dayDiff = Math.floor((sd - today) / (1000*60*60*24));
            if (dayDiff === 0) timeLabel = `今日出发`;
            else if (dayDiff === 1) timeLabel = `明日出发`;
            else if (dayDiff > 0) timeLabel = `${dayDiff}天后出发`;
            else timeLabel = `${sd.getMonth()+1}月${sd.getDate()}日`;
        }
    } else {
        timeLabel = `${dateStr}创建`;
    }

    // SVG 图标工具函数 - 邮票风线条风格
    const _svgIcon = (name, size = 14) => {
        const icons = {
            'map-pin': `<path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
            'palette': `<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>`,
            'book-open': `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
            'camera': `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`,
            'calendar': `<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>`,
            'wallet': `<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>`,
            'file-text': `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>`,
            'clock': `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
            'check': `<polyline points="20 6 9 17 4 12"/>`,
            'archive': `<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><line x1="10" x2="14" y1="12" y2="12"/>`,
            'download': `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>`,
            'tag': `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>`,
            'route': `<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>`,
            'sparkles': `<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>`,
            'more': `<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>`,
            'trash': `<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
            'eye': `<path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/>`,
        };
        const path = icons[name] || icons['map-pin'];
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">${path}</svg>`;
    };

    const statusEmoji = isArchived ? _svgIcon('archive', 14) : (isCompleted ? _svgIcon('check', 14) : (isOngoing ? _svgIcon('map-pin', 14) : _svgIcon('calendar', 14)));
    const dest = trip.destination || trip.dayPlans?.[0]?.city || '';
    const theme = getTripTheme(trip);
    const destEmoji = theme.emoji;
    let notesCount = 0;
    let photosCount = 0;
    if (trip.dayPlans) {
        trip.dayPlans.forEach(dp => {
            (dp.spots || []).forEach(s => {
                notesCount += (s.record?.notes || []).length;
                photosCount += (s.record?.photos || s.photos || []).length;
            });
        });
    }

    let daysPreviewHtml = '';
    const nonEmptyDays = (trip.dayPlans || []).filter(dp => dp.spots && dp.spots.length > 0);
    if (nonEmptyDays.length > 0) {
        daysPreviewHtml = '<div class="tc-days-preview">';
        for (let i = 0; i < nonEmptyDays.length; i++) {
            const day = nonEmptyDays[i];
            const originalDayIdx = trip.dayPlans.indexOf(day);
            const dayNum = originalDayIdx + 1;
            const isCurrentDay = isOngoingToday && dayNum === currentDayNum;
            const daySpots = day.spots || [];
            const dayChecked = daySpots.filter(s => s.checked || s.record?.checkedIn).length;
            
            daysPreviewHtml += `
                <div class="tc-day-item ${isCurrentDay ? 'tc-day-item--current' : ''}">
                    <div class="tc-day-header">
                        <span class="tc-day-badge">${isCurrentDay ? `${_svgIcon('map-pin', 10)} 今天` : `DAY ${dayNum}`}</span>
                        <span class="tc-day-count">${dayChecked}/${daySpots.length}</span>
                    </div>
                    <div class="tc-day-spots">`;
            
            daySpots.forEach(spot => {
                const isChecked = spot.checked || spot.record?.checkedIn;
                daysPreviewHtml += `
                    <div class="tc-spot-line ${isChecked ? 'is-checked' : ''}">
                        <span class="tc-spot-dot">${isChecked ? _svgIcon('check', 8) : ''}</span>
                        <span class="tc-spot-name">${spot.name}</span>
                    </div>`;
            });
            
            daysPreviewHtml += `</div></div>`;
        }
        daysPreviewHtml += '</div>';
    }

    let actionsHtml = '';
    if (isTrashView) {
        // 回收站视图：恢复 + 永久删除
        const TRASH_DAYS = 7;
        const elapsed = Date.now() - (trip.deletedAt || 0);
        const daysLeft = Math.max(0, TRASH_DAYS - Math.ceil(elapsed / (24 * 60 * 60 * 1000)));
        actionsHtml = `
            <span class="tc-trash-days">${daysLeft}天后自动删除</span>
            <button class="tc-btn tc-btn--success" onclick="event.stopPropagation();TripsModule.restoreTrip('${trip.id}')">
                ${_svgIcon('check', 14)}
                恢复
            </button>
            <button class="tc-btn tc-btn--danger" onclick="event.stopPropagation();TripsModule.permanentlyDeleteTrip('${trip.id}')">
                ${_svgIcon('trash', 14)}
                永久删除
            </button>`;
    } else if (isCompleted) {
        // 已完成：查看回忆 + 详情
        actionsHtml = `
            <button class="tc-btn tc-btn--primary" onclick="event.stopPropagation();TripsModule.openJournalFromList('${trip.id}')">
                ${_svgIcon('book-open', 14)}
                查看回忆
            </button>
            <button class="tc-btn tc-btn--ghost" onclick="event.stopPropagation();App.openTripDetail('${trip.id}')">
                ${_svgIcon('eye', 14)}
                详情
            </button>`;
    } else {
        // 进行中/待出发：详情按钮（开始/结束行程移除，状态自动判断）
        actionsHtml = `
            <button class="tc-btn tc-btn--ghost" onclick="event.stopPropagation();App.openTripDetail('${trip.id}')">
                ${_svgIcon('eye', 14)}
                详情
            </button>`;
    }

    const cardClass = isTrashView ? 'trip-card trip-card--trash' : 'trip-card';

    // 选择模式下点击卡片切换选中
    const inSelectMode = TripsModule.selectMode !== null;
    const isSelected = TripsModule.selectedTripId === trip.id;
    let cardOnclick = '';
    if (!isTrashView) {
        cardOnclick = inSelectMode
            ? `onclick="TripsModule.selectCard('${trip.id}')"`
            : `onclick="App.openTripDetail('${trip.id}')"`;
    }

    const isCustomBg = trip.customTheme;
    const coverStyle = isCustomBg
        ? `background-image:url(${trip.customTheme});background-size:cover;background-position:center;`
        : `background: ${isTrashView ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : theme.bg};`;

    // 邮戳装饰 - 显示城市名和日期
    const stampCity = dest || trip.title?.slice(0, 4) || 'TRIP';
    const stampDate = trip.startDate ? trip.startDate.slice(5).replace('-', '.') : (dateStr.replace('月', '.').replace('日', ''));
    const coverStampHtml = `
        <div class="tc-cover-stamp">
            <div class="tc-cover-stamp-text">
                <div class="tc-cover-stamp-city">${stampCity}</div>
                <div class="tc-cover-stamp-date">${stampDate}</div>
            </div>
        </div>`;

    const descHtml = trip.description ? `<div class="tc-desc">${trip.description}</div>` : '';
    const selectIndicator = inSelectMode ? `<div class="tc-select-radio ${isSelected ? 'tc-select-radio--checked' : ''}">${isSelected ? '✓' : ''}</div>` : '';
    const selectedClass = isSelected ? ' trip-card--selected' : '';

    // 折叠状态：默认折叠，只有展开集合中的才展开
    const collapsed = !TripsModule._expandedTrips?.has(trip.id);
    const expandableClass = collapsed ? 'tc-expandable tc-expandable--collapsed' : 'tc-expandable';
    const arrowClass = collapsed ? 'tc-collapse-arrow tc-collapse-arrow--collapsed' : 'tc-collapse-arrow';

    return `
        <div class="${cardClass}${selectedClass}" data-trip-id="${trip.id}" ${cardOnclick}>
            ${selectIndicator}
            <div class="tc-cover" style="${coverStyle}">
                ${isCustomBg ? '<div class="tc-cover-overlay"></div>' : ''}
                ${coverStampHtml}
                <div class="tc-cover-top">
                    <div class="tc-cover-title">${trip.title || '未命名行程'}</div>
                    ${isTrashView ? '' : `
                    <div class="tc-cover-right">
                        <button class="tc-more-btn" onclick="event.stopPropagation();TripsModule.toggleMoreMenu('${trip.id}')" title="更多">${_svgIcon('more', 16)}</button>
                        <div class="tc-more-menu" id="tc-more-menu-${trip.id}">
                            <div class="tc-more-menu-item" onclick="event.stopPropagation();TripsModule.showThemePicker('${trip.id}');TripsModule.closeAllMoreMenus();">
                                ${_svgIcon('palette', 14)}
                                更换主题
                            </div>
                            <div class="tc-more-menu-divider"></div>
                            <div class="tc-more-menu-item danger" onclick="event.stopPropagation();TripsModule.deleteTrip('${trip.id}');TripsModule.closeAllMoreMenus();">
                                ${_svgIcon('trash', 14)}
                                删除行程
                            </div>
                        </div>
                    </div>
                    `}
                </div>
                <div class="tc-cover-bottom">
                    <span class="tc-cover-time-chip">${timeLabel}</span>
                </div>
            </div>
            <div class="tc-body">
                <div class="tc-info-row" onclick="event.stopPropagation();TripsModule.toggleCollapse('${trip.id}')">
                    <span class="tc-tag-chip ${trip.tag ? '' : 'tc-tag-chip--empty'}" style="${trip.tag ? `background:${tagColor}15;` : ''}" onclick="event.stopPropagation();TripsModule.showTagSelector('${trip.id}')">
                        <span class="tc-tag-dot" style="${trip.tag ? `background:${tagColor};` : ''}"></span>
                        ${trip.tag || '设标签'}
                    </span>
                    <span class="tc-dest-text">${_svgIcon('map-pin', 12)} ${dest || '未设置目的地'}</span>
                    <button class="tc-collapse-btn" title="${collapsed ? '展开' : '收起'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${arrowClass}"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                </div>
                <div class="tc-meta-row tc-meta-simplified">
                    <div class="tc-meta-item">
                        <span class="tc-meta-icon">${_svgIcon('calendar', 12)}</span>
                        <span class="tc-meta-text">${_formatTripDate(trip.startDate) || '未设置'}</span>
                    </div>
                    <div class="tc-meta-item">
                        <span class="tc-meta-icon">${_svgIcon('wallet', 12)}</span>
                        <span class="tc-meta-text">¥${totalExpense}</span>
                    </div>
                    <div class="tc-meta-item">
                        <span class="tc-meta-icon">${_svgIcon('file-text', 12)}</span>
                        <span class="tc-meta-text">${notesCount}条</span>
                    </div>
                    <div class="tc-meta-item">
                        <span class="tc-meta-icon">${_svgIcon('camera', 12)}</span>
                        <span class="tc-meta-text">${photosCount}张</span>
                    </div>
                </div>
                <div class="${expandableClass}" id="tc-expand-${trip.id}">
                    ${descHtml}
                    ${daysPreviewHtml}
                    <div class="tc-actions">${actionsHtml}</div>
                </div>
            </div>
        </div>
    `;
}

function formatCompactTripCard(trip, isTrashView = false) {
    const stats = calcTripStats(trip);
    const { totalSpots, checkedSpots, progress, totalExpense, actualDays } = stats;

    const status = getTripStatus(trip);
    const isTraveling = status === 'traveling';
    const isArchived = status === 'archived';

    let timeLabel;
    if (isTrashView) {
        const TRASH_DAYS = 7;
        const elapsed = Date.now() - (trip.deletedAt || 0);
        const daysLeft = Math.max(0, TRASH_DAYS - Math.ceil(elapsed / (24 * 60 * 60 * 1000)));
        timeLabel = `${daysLeft}天后自动删除`;
    } else if (isTraveling && trip.startDate) {
        const sd = new Date(trip.startDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0,0,0,0);
        if (!isNaN(sd.getTime())) {
            sd.setHours(0,0,0,0);
            const dayDiff = Math.floor((today - sd) / (1000*60*60*24));
            if (dayDiff >= 0) {
                timeLabel = `第${Math.min(dayDiff + 1, actualDays)}天`;
            } else {
                if (dayDiff === 0) timeLabel = `今日出发`;
                else if (dayDiff === -1) timeLabel = `明日出发`;
                else timeLabel = `${-dayDiff}天后出发`;
            }
        } else {
            timeLabel = '即将出发';
        }
    } else if (isArchived) {
        timeLabel = '已完成';
    } else if (trip.startDate) {
        timeLabel = _formatTripDate(trip.startDate);
    } else {
        timeLabel = '未设置';
    }

    const dest = trip.destination || trip.dayPlans?.[0]?.city || '';
    const theme = getTripTheme(trip);
    const destEmoji = theme.emoji;
    let notesCount = 0;
    let photosCount = 0;
    if (trip.dayPlans) {
        trip.dayPlans.forEach(dp => {
            (dp.spots || []).forEach(s => {
                notesCount += (s.record?.notes || []).length;
                photosCount += (s.record?.photos || s.photos || []).length;
            });
        });
    }

    let cardClass = 'trip-card trip-card--compact';
    if (isTrashView) cardClass += ' trip-card--trash';
    else if (isArchived) cardClass += ' trip-card--archived';

    const cardOnclick = isTrashView
        ? `onclick="TripsModule.restoreTrip('${trip.id}')"`
        : isArchived 
        ? `onclick="TripsModule.openJournalFromList('${trip.id}')"` 
        : `onclick="App.openTripDetail('${trip.id}')"`;

    const isCustomBg = trip.customTheme;
    const coverStyle = isCustomBg 
        ? `background-image:url(${trip.customTheme});background-size:cover;background-position:center;`
        : `background: ${isArchived || isTrashView ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : theme.bg};`;

    const trashBadge = isTrashView ? '<div class="tc-archived-badge" style="background:rgba(192,57,43,0.85);">回收站</div>' : '';
    const iconCalendar = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    const iconMoney = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
    const iconNote = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`;
    const iconPhoto = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    const iconTheme = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M13.5 9c-3.5 0-6.5 2.5-7 6l-2 7 7-2c3.5-.5 6.5-3.5 7-7Z"/></svg>`;

    return `
        <div class="${cardClass}" data-trip-id="${trip.id}" ${cardOnclick}>
            ${trashBadge}
            <div class="tc-cover tc-cover--compact" style="${coverStyle}">
                ${isCustomBg ? '<div class="tc-cover-overlay"></div>' : ''}
                <div class="tc-cover-emoji">${destEmoji}</div>
                <div class="tc-cover-info">
                    <div class="tc-cover-dest">${trip.title || dest || '未命名行程'}</div>
                    <div class="tc-cover-time">${dest} \u00b7 ${timeLabel}</div>
                </div>
                ${isTrashView ? '' : `<button class="tc-theme-btn" onclick="event.stopPropagation();TripsModule.showThemePicker('${trip.id}')" title="更换主题">${iconTheme}</button>`}
            </div>
            <div class="tc-meta-compact">
                <span class="tc-meta-chip">${iconCalendar} ${_formatTripDate(trip.startDate) || '--'}</span>
                <span class="tc-meta-chip">${iconMoney} ¥${totalExpense}</span>
                <span class="tc-meta-chip">${iconNote} ${notesCount}</span>
                <span class="tc-meta-chip">${iconPhoto} ${photosCount}</span>
            </div>
        </div>
    `;
}

const HomeModule = {
    render() {
        this.renderGreeting();
        this.renderTravelStats();
        this.renderWidgets();
        this.renderWeather();
        this.renderCurrentTripCard();
        this.renderMemoryStats();
        this.renderCountdown();
        this.renderTodayPlan();
        this.renderQuickCheckin();
    },

    renderMemoryStats() {
        const memoryTitle = document.getElementById('hqsMemoryTitle');
        const memorySub = document.getElementById('hqsMemorySub');
        if (!memoryTitle || !memorySub) return;

        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips);
        
        let totalNotes = 0;
        let totalPhotos = 0;
        let cities = new Set();
        tripArr.forEach(t => {
            let hasUserRecord = false;
            (t.dayPlans || []).forEach(dp => {
                (dp.spots || []).forEach(s => {
                    const notes = s.record?.notes || [];
                    const photos = s.record?.photos || [];
                    totalNotes += notes.length;
                    totalPhotos += photos.length;
                    if (notes.length > 0 || photos.length > 0) {
                        if (dp.city) cities.add(dp.city);
                        else if (t.destination) cities.add(t.destination);
                    }
                });
            });
        });

        if (totalNotes + totalPhotos > 0) {
            memoryTitle.textContent = `${totalNotes}条记录，${totalPhotos}张照片`;
            memorySub.textContent = `足迹遍布 ${cities.size} 座城市`;
        } else {
            memoryTitle.textContent = '记录每一段旅途';
            memorySub.textContent = '0条记录 · 0张照片 · 0座城市';
        }
    },

    renderGreeting() {
        const hour = new Date().getHours();
        const moonSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:4px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        const sunSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:4px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        const cloudSunSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:4px;"><path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"/><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>`;
        const noodlesSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:4px;"><path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M12 2v6"/><path d="M8 8h8"/><path d="M6 11h12"/></svg>`;
        const coffeeSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:4px;"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
        const citySvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:4px;"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>`;
        const starSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-left:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        let greeting, sub;
        if (hour < 6) {
            greeting = `夜深了，注意休息 ${moonSvg}`;
            sub = '规划一下明天的旅程？';
        } else if (hour < 9) {
            greeting = `早安，旅行者 ${sunSvg}`;
            sub = '新的一天，新的出发';
        } else if (hour < 12) {
            greeting = `上午好 ${cloudSunSvg}`;
            sub = '今天想去哪里看看？';
        } else if (hour < 14) {
            greeting = `中午好 ${noodlesSvg}`;
            sub = '别忘了吃午饭哦';
        } else if (hour < 18) {
            greeting = `下午好 ${coffeeSvg}`;
            sub = '继续探索精彩世界';
        } else if (hour < 22) {
            greeting = `晚上好 ${citySvg}`;
            sub = '回顾今天的旅程吧';
        } else {
            greeting = `夜深了 ${starSvg}`;
            sub = '早点休息，明天再出发';
        }
        const hiEl = document.getElementById('greetingHi');
        const subEl = document.getElementById('greetingSub');
        if (hiEl) hiEl.innerHTML = greeting;
        if (subEl) subEl.textContent = sub;
    },

    renderTravelStats() {
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips);
        const cities = new Set();
        let totalDays = 0;
        let totalSpots = 0;

        tripArr.forEach(trip => {
            const dest = trip.destination || trip.dayPlans?.[0]?.city || '';
            if (dest) cities.add(dest);
            totalDays += trip.days || trip.dayPlans?.length || 0;
            totalSpots += trip.dayPlans?.reduce((sum, d) => sum + (d.spots?.length || 0), 0) || 0;
        });

        const tsTrips = document.getElementById('tsTrips');
        const tsCities = document.getElementById('tsCities');
        const tsDays = document.getElementById('tsDays');
        const tsSpots = document.getElementById('tsSpots');
        if (tsTrips) tsTrips.textContent = tripArr.length;
        if (tsCities) tsCities.textContent = cities.size;
        if (tsDays) tsDays.textContent = totalDays;
        if (tsSpots) tsSpots.textContent = totalSpots;
    },

    async renderWeather() {
        const widget = document.getElementById('weatherWidget');
        if (!widget) return;

        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips).sort((a, b) => b.savedAt - a.savedAt);

        let city = '杭州';
        if (tripArr.length > 0) {
            city = tripArr[0].destination || tripArr[0].dayPlans?.[0]?.city || city;
        }

        let weather = null;
        try {
            weather = await CalendarModule.getWeatherByCity(city);
        } catch (e) {
            console.warn('天气获取失败，使用本地兜底', e);
        }

        // 兜底：接口失败或无数据时仍展示默认天气，避免组件空白
        if (!weather) {
            const today = new Date();
            const makeDate = (offset) => {
                const d = new Date(today);
                d.setDate(d.getDate() + offset);
                return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            };
            weather = {
                text_day: '晴',
                text_night: '晴',
                high: 28,
                low: 20,
                forecasts: Array.from({length: 7}, (_, i) => ({
                    date: makeDate(i),
                    text_day: i % 3 === 1 ? '多云' : '晴',
                    high: 28 - i % 3,
                    low: 20 - i % 2
                }))
            };
        }

        widget.style.display = 'block';
        widget.style.cursor = 'pointer';
        widget.onclick = () => this.openWeatherPlanner();
        const icon = this._weatherIcon(weather.text_day || weather.text || '晴');
        const locIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>`;
        document.getElementById('wwIcon').innerHTML = icon;
        document.getElementById('wwTemp').textContent = `${weather.high || 25}° / ${weather.low || 15}°`;
        document.getElementById('wwDesc').textContent = weather.text_day || weather.text || '晴';
        const dateStr = typeof CalendarModule !== 'undefined' && CalendarModule.formatDateShort
            ? CalendarModule.formatDateShort(new Date())
            : `${(new Date().getMonth()+1).toString().padStart(2,'0')}.${new Date().getDate().toString().padStart(2,'0')}`;
        document.getElementById('wwLocation').innerHTML = `${locIcon} ${city} · ${dateStr}`;

        // 多日预报 - 显示未来7天
        const forecasts = weather.forecasts || [];
        const forecastEl = document.getElementById('wwForecast');
        if (forecasts.length > 0) {
            const weekdayNames = ['周日','周一','周二','周三','周四','周五','周六'];
            forecastEl.innerHTML = forecasts.slice(0, 7).map((f, i) => {
                let dayLabel;
                if (i === 0) dayLabel = '今天';
                else if (i === 1) dayLabel = '明天';
                else if (i === 2) dayLabel = '后天';
                else {
                    const d = new Date(f.date);
                    if (!isNaN(d.getTime())) {
                        dayLabel = weekdayNames[d.getDay()];
                    } else {
                        dayLabel = `第${i+1}天`;
                    }
                }
                return `
                    <div class="ww-forecast-item">
                        <div class="wwf-day">${dayLabel}</div>
                        <div class="wwf-icon">${this._weatherIcon(f.text_day || '晴')}</div>
                        <div class="wwf-temp">${f.high || '--'}°/${f.low || '--'}°</div>
                    </div>`;
            }).join('');
        } else {
            forecastEl.innerHTML = '';
        }
    },

    async openWeatherPlanner() {
        const popularCities = ['北京', '上海', '杭州', '成都', '西安', '厦门', '三亚', '丽江', '重庆', '广州', '青岛', '大理'];
        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';

        mask.innerHTML = `
            <div class="ui-modal weather-planner-modal">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <div class="ui-modal-title" style="margin:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:4px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>好天气出发</div>
                    <button class="wp-close" id="wpCloseBtn" style="width:32px;height:32px;border-radius:50%;border:none;background:#f5f5f7;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</button>
                </div>
                <div style="font-size:13px;color:#888;margin-bottom:16px;">看看哪里天气好，选个好天气出发吧</div>
                <div class="wp-filter-bar">
                    <button class="wp-filter-btn active" data-filter="all">全部</button>
                    <button class="wp-filter-btn" data-filter="sunny"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>好天气</button>
                </div>
                <div class="wp-city-list" id="wpCityList">
                    <div style="text-align:center;padding:30px;color:#999;">正在查询天气...</div>
                </div>
            </div>`;

        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        document.getElementById('wpCloseBtn').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        let cityWeathers = [];
        const listEl = document.getElementById('wpCityList');

        for (const c of popularCities) {
            try {
                const w = await CalendarModule.getWeatherByCity(c);
                if (w && w.forecasts) {
                    const next3Days = w.forecasts.slice(1, 4);
                    const sunnyDays = next3Days.filter(f => {
                        const t = f.text_day || '';
                        return t.includes('晴') || t.includes('多云') || t.includes('阴');
                    }).length;
                    const isGoodWeather = sunnyDays >= 2;
                    cityWeathers.push({ city: c, weather: w, sunnyDays, isGoodWeather, next3Days });
                }
            } catch(e) {}
        }

        const renderList = (filter) => {
            const filtered = filter === 'sunny' ? cityWeathers.filter(c => c.isGoodWeather) : cityWeathers;
            if (filtered.length === 0) {
                listEl.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">暂无符合条件的城市</div>';
                return;
            }
            filtered.sort((a, b) => b.sunnyDays - a.sunnyDays);
            listEl.innerHTML = filtered.map(cw => {
                const w = cw.weather;
                const today = w.forecasts?.[0] || w;
                const goodBadge = cw.isGoodWeather ? '<span class="wp-good-badge">✨ 未来3天天气佳</span>' : '';
                return `
                    <div class="wp-city-item" data-city="${cw.city}">
                        <div class="wp-city-left">
                            <div class="wp-city-name">${getDestEmoji(cw.city)} ${cw.city}</div>
                            <div class="wp-city-temp">${today.high || '--'}°/${today.low || '--'}° · ${today.text_day || '晴'}</div>
                            <div class="wp-city-forecast">
                                ${cw.next3Days.map((f, i) => `<span class="wp-mini-day"><span class="wp-mini-icon">${this._weatherIcon(f.text_day)}</span></span>`).join('')}
                            </div>
                            ${goodBadge}
                        </div>
                        <button class="wp-go-btn">去规划</button>
                    </div>`;
            }).join('');

            listEl.querySelectorAll('.wp-city-item').forEach(item => {
                const goBtn = item.querySelector('.wp-go-btn');
                const cityName = item.dataset.city;
                
                const goPlanning = () => {
                    close();
                    if (typeof App !== 'undefined') {
                        App.switchTab('plan');
                        setTimeout(() => {
                            App.destinations = [cityName];
                            if (typeof UIRender !== 'undefined') {
                                UIRender.renderDestTags();
                                App.showExtraSections();
                            }
                            const destInput = document.getElementById('destInput');
                            if (destInput) {
                                destInput.value = cityName;
                                destInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            UiKit.toast(`已选择「${cityName}」，请选择日期 ✨`, 'success');
                        }, 500);
                    }
                };
                
                item.onclick = (e) => {
                    if (e.target === goBtn || goBtn.contains(e.target)) return;
                    goPlanning();
                };
                if (goBtn) goBtn.onclick = (e) => {
                    e.stopPropagation();
                    goPlanning();
                };
            });
        };

        renderList('all');
        mask.querySelectorAll('.wp-filter-btn').forEach(btn => {
            btn.onclick = () => {
                mask.querySelectorAll('.wp-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderList(btn.dataset.filter);
            };
        });
    },

    _weatherIcon(text) {
        const svg = (paths, size = 28) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
        const sun = svg('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>');
        const cloud = svg('<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>');
        const cloudSun = svg('<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><circle cx="17" cy="7" r="2"/><line x1="17" y1="1" x2="17" y2="3"/><line x1="21" y1="5" x2="23" y2="5"/><line x1="21" y1="9" x2="23" y2="9"/>');
        const rain = svg('<path d="M16 13v5"/><path d="M8 13v5"/><path d="M12 15v5"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>');
        const heavyRain = svg('<path d="M16 13v5"/><path d="M8 13v5"/><path d="M12 15v5"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M19 20v2"/><path d="M22 17v2"/>');
        const thunder = svg('<path d="M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M13 11l-4 6h6l-4 6"/>');
        const snow = svg('<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="8" y1="20" x2="8" y2="20"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="16" y1="16" x2="16" y2="16"/><line x1="16" y1="20" x2="16" y2="20"/>');
        const fog = svg('<path d="M4 15h16"/><path d="M4 18h16"/><path d="M4 12h16"/><path d="M4 9h16"/>');
        if (!text) return sun;
        if (text.includes('雷')) return thunder;
        if (text.includes('大雨') || text.includes('暴雨')) return heavyRain;
        if (text.includes('雨')) return rain;
        if (text.includes('雪')) return snow;
        if (text.includes('雾') || text.includes('霾')) return fog;
        if (text.includes('阴')) return cloud;
        if (text.includes('多云')) return cloudSun;
        return sun;
    },

    WIDGETS: [
        { id: 'trips', name: '我的行程', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', desc: '横向滚动展示所有行程' },
        { id: 'countdown', name: '行程倒计时', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', desc: '最近出发的行程倒计时' },
        { id: 'today', name: '今日攻略', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', desc: '今日要去的景点安排' },
        { id: 'checkin', name: '今日打卡', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>', desc: '今日未打卡景点提醒' },
        { id: 'memory', name: '旅行记忆', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>', desc: '查看所有记录和照片' },
        { id: 'weather', name: '天气', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>', desc: '实时天气与7天预报' },
        { id: 'stats', name: '旅行统计', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', desc: '行程/城市/天数统计' },
    ],

    getWidgetSettings() {
        const defaults = ['stats', 'trips', 'countdown', 'today', 'checkin', 'memory', 'weather'];
        try {
            const raw = localStorage.getItem('home_widgets');
            // 没有保存过配置时，写入默认配置并返回
            if (!raw) {
                localStorage.setItem('home_widgets', JSON.stringify(defaults));
                return defaults;
            }
            const saved = JSON.parse(raw);
            if (!Array.isArray(saved) || saved.length === 0) return defaults;
            return saved;
        } catch(e) {
            return defaults;
        }
    },

    saveWidgetSettings(widgets) {
        localStorage.setItem('home_widgets', JSON.stringify(widgets));
    },

    renderWidgets() {
        const widgetIds = this.getWidgetSettings();
        const widgetsContainer = document.getElementById('homeWidgets');
        if (!widgetsContainer) return;

        const allWidgets = widgetsContainer.querySelectorAll('[data-widget]');
        allWidgets.forEach(w => w.style.display = 'none');

        widgetIds.forEach(id => {
            const w = widgetsContainer.querySelector(`[data-widget="${id}"]`);
            if (w) w.style.display = '';
        });

        const statsCard = document.getElementById('travelStatsCard');
        if (statsCard) {
            statsCard.style.display = widgetIds.includes('stats') ? '' : 'none';
        }
    },

    refreshVisibleWidgets() {
        const widgetIds = this.getWidgetSettings();
        if (widgetIds.includes('stats')) this.renderTravelStats();
        if (widgetIds.includes('trips')) this.renderCurrentTripCard();
        if (widgetIds.includes('countdown')) this.renderCountdown();
        if (widgetIds.includes('today')) this.renderTodayPlan();
        if (widgetIds.includes('checkin')) this.renderQuickCheckin();
        if (widgetIds.includes('memory')) this.renderMemoryStats();
        if (widgetIds.includes('weather')) this.renderWeather();
    },

    showWidgetPicker() {
        const currentWidgets = this.getWidgetSettings();
        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';

        const widgetOptions = this.WIDGETS.map(w => {
            const isAdded = currentWidgets.includes(w.id);
            return `
                <div class="widget-picker-item ${isAdded ? 'added' : ''}" data-id="${w.id}">
                    <div class="wp-info">
                        <div class="wp-icon">${w.icon}</div>
                        <div>
                            <div class="wp-name">${w.name}</div>
                            <div class="wp-desc">${w.desc}</div>
                        </div>
                    </div>
                    <button class="wp-toggle">${isAdded ? '✓ 已添加' : '+ 添加'}</button>
                </div>`;
        }).join('');

        mask.innerHTML = `
            <div class="ui-modal widget-picker-modal">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <div class="ui-modal-title" style="margin:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>自定义首页</div>
                    <button class="wp-modal-close" id="wpModalClose" style="width:32px;height:32px;border-radius:50%;border:none;background:#f5f5f7;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</button>
                </div>
                <div style="font-size:13px;color:#888;margin-bottom:14px;">选择要在首页展示的组件</div>
                <div class="widget-picker-list">
                    ${widgetOptions}
                </div>
            </div>`;

        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        document.getElementById('wpModalClose').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        mask.querySelectorAll('.widget-picker-item').forEach(item => {
            item.querySelector('.wp-toggle').onclick = (e) => {
                e.stopPropagation();
                const id = item.dataset.id;
                let widgets = this.getWidgetSettings();
                const idx = widgets.indexOf(id);
                if (idx > -1) {
                    widgets.splice(idx, 1);
                    item.classList.remove('added');
                    item.querySelector('.wp-toggle').textContent = '+ 添加';
                } else {
                    widgets.push(id);
                    item.classList.add('added');
                    item.querySelector('.wp-toggle').textContent = '✓ 已添加';
                }
                this.saveWidgetSettings(widgets);
                this.renderWidgets();
                this.refreshVisibleWidgets();
            };
        });
    },

    renderCurrentTripCard() {
        const scrollEl = document.getElementById('homeTripsScroll');
        if (!scrollEl) return;

        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips).sort((a, b) => b.savedAt - a.savedAt);

        if (tripArr.length === 0) {
            scrollEl.innerHTML = `
                <div class="empty-trips-hint">
                    <div style="font-size:32px;margin-bottom:8px;">✈️</div>
                    <div style="font-size:13px;color:#999;">还没有行程，去规划一段吧</div>
                </div>`;
            return;
        }

        scrollEl.innerHTML = tripArr.map(trip => {
            const theme = getTripTheme(trip);
            const status = getTripStatus(trip);
            const stats = calcTripStats(trip);
            const isTraveling = status === 'traveling';
            const isArchived = status === 'archived';

            let statusLabel = '即将出发';
            let statusBadgeClass = 'upcoming';
            if (isTraveling) {
                statusLabel = '旅行中';
                statusBadgeClass = 'traveling';
            } else if (isArchived) {
                statusLabel = '已完成';
                statusBadgeClass = 'done';
            }

            const isCustomBg = trip.customTheme;
            const coverStyle = isCustomBg 
                ? `background-image:url(${trip.customTheme});background-size:cover;background-position:center;`
                : `background: ${theme.bg};`;

            return `
                <div class="mini-trip-card" onclick="App.openTripDetail('${trip.id}')">
                    <div class="mtc-cover" style="${coverStyle}">
                        ${isCustomBg ? '<div class="tc-cover-overlay"></div>' : ''}
                        <div class="mtc-badge ${statusBadgeClass}">${statusLabel}</div>
                        <div class="mtc-title">${trip.title || trip.destination || '未命名'}</div>
                        <div class="mtc-sub">${trip.destination || ''} · ${stats.actualDays}天</div>
                    </div>
                    <div class="mtc-bottom">
                        <span>📍 ${stats.totalSpots}个</span>
                        <span>💰 ¥${stats.totalExpense}</span>
                    </div>
                </div>`;
        }).join('');
    },

    renderCountdown() {
        const widget = document.getElementById('countdownWidget');
        const labelEl = document.getElementById('cdLabel');
        const titleEl = document.getElementById('cdTitle');
        const metaEl = document.getElementById('cdMeta');
        const daysEl = document.getElementById('cdDays');
        if (!widget || !labelEl || !titleEl || !metaEl || !daysEl) return;

        const trips = AIMemory.getAllTrips();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let nearest = null;
        let minDiff = Infinity;

        Object.values(trips).forEach(trip => {
            if (!trip.startDate || trip.deletedAt) return;
            const sd = new Date(trip.startDate + 'T00:00:00');
            if (isNaN(sd.getTime())) return;
            const days = trip.days || trip.dayPlans?.length || 1;
            const ed = new Date(sd);
            ed.setDate(ed.getDate() + days - 1);

            // 优先找未来行程，其次找进行中的行程
            let diff = sd.getTime() - today.getTime();
            let isOngoing = today >= sd && today <= ed;
            if (isOngoing) diff = 0;
            if (diff < 0 && !isOngoing) return; // 跳过已结束

            if (diff < minDiff) {
                minDiff = diff;
                nearest = { trip, sd, ed, isOngoing };
            }
        });

        if (!nearest) {
            widget.style.display = 'none';
            return;
        }

        widget.style.display = '';
        const { trip, sd, ed, isOngoing } = nearest;
        const dest = trip.destination || trip.dayPlans?.[0]?.city || '未知目的地';
        const days = trip.days || trip.dayPlans?.length || 1;

        if (isOngoing) {
            const dayIdx = Math.floor((today - sd) / (1000 * 60 * 60 * 24)) + 1;
            labelEl.textContent = '正在旅行中';
            titleEl.textContent = trip.title || `${dest}之旅`;
            metaEl.textContent = `${dest} · 第${Math.min(dayIdx, days)}天 / 共${days}天`;
            daysEl.innerHTML = `<div class="ed-num">${Math.min(dayIdx, days)}</div><div class="ed-unit">DAY</div>`;
        } else {
            const dayDiff = Math.ceil((sd - today) / (1000 * 60 * 60 * 24));
            labelEl.textContent = dayDiff <= 0 ? '今日出发' : '即将出发';
            titleEl.textContent = trip.title || `${dest}之旅`;
            metaEl.textContent = `${dest} · ${days}天行程 · ${this._fmtMonthDay(sd)}`;
            daysEl.innerHTML = `<div class="ed-num">${Math.max(0, dayDiff)}</div><div class="ed-unit">天后</div>`;
        }
    },

    renderTodayPlan() {
        const widget = document.getElementById('todayWidget');
        const dateEl = document.getElementById('todayDate');
        const contentEl = document.getElementById('todayContent');
        if (!widget || !dateEl || !contentEl) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekday = ['周日','周一','周二','周三','周四','周五','周六'][today.getDay()];
        dateEl.textContent = `${today.getMonth() + 1}月${today.getDate()}日 · ${weekday}`;

        const trips = AIMemory.getAllTrips();
        let todayItems = [];

        Object.values(trips).forEach(trip => {
            if (!trip.startDate || trip.deletedAt) return;
            const sd = new Date(trip.startDate + 'T00:00:00');
            if (isNaN(sd.getTime())) return;
            const dayIdx = Math.floor((today - sd) / (1000 * 60 * 60 * 24));
            const days = trip.days || trip.dayPlans?.length || 0;
            if (dayIdx < 0 || dayIdx >= days) return;

            const dayPlan = trip.dayPlans?.[dayIdx];
            if (!dayPlan || !dayPlan.spots?.length) return;

            dayPlan.spots.forEach((spot, idx) => {
                const time = spot.time || spot.startTime || (idx === 0 ? '09:00' : `${10 + idx}:00`);
                todayItems.push({
                    time,
                    name: spot.name,
                    city: dayPlan.city || trip.destination || '',
                    tripId: trip.id,
                    dayIdx,
                    spotIdx: idx
                });
            });
        });

        if (todayItems.length === 0) {
            widget.style.display = 'none';
            contentEl.innerHTML = '<div class="envo-empty">今天没有安排景点，去规划一段旅程吧</div>';
            return;
        }

        widget.style.display = '';
        todayItems.sort((a, b) => a.time.localeCompare(b.time));
        const showItems = todayItems.slice(0, 4);
        contentEl.innerHTML = showItems.map(item => `
            <div class="envo-item">
                <div class="envo-time">${item.time}</div>
                <div class="envo-name">${item.name}</div>
                <div class="envo-city">${item.city}</div>
            </div>
        `).join('') + (todayItems.length > 4 ? `<div style="text-align:center;font-size:12px;color:#9a8b7a;padding-top:8px;">还有 ${todayItems.length - 4} 个景点</div>` : '');

        // 保存第一个项目的引用，用于点击跳转
        widget.dataset.tripId = todayItems[0].tripId;
        widget.dataset.dayIdx = todayItems[0].dayIdx;
    },

    renderQuickCheckin() {
        const widget = document.getElementById('checkinWidget');
        const subEl = document.getElementById('checkinSub');
        if (!widget || !subEl) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const trips = AIMemory.getAllTrips();
        let pendingItems = [];

        Object.values(trips).forEach(trip => {
            if (!trip.startDate || trip.deletedAt) return;
            const sd = new Date(trip.startDate + 'T00:00:00');
            if (isNaN(sd.getTime())) return;
            const dayIdx = Math.floor((today - sd) / (1000 * 60 * 60 * 24));
            const days = trip.days || trip.dayPlans?.length || 0;
            if (dayIdx < 0 || dayIdx >= days) return;

            const dayPlan = trip.dayPlans?.[dayIdx];
            if (!dayPlan || !dayPlan.spots?.length) return;

            dayPlan.spots.forEach((spot, idx) => {
                if (!spot.record?.checkedIn && !spot.checked) {
                    pendingItems.push({
                        name: spot.name,
                        city: dayPlan.city || trip.destination || '',
                        tripId: trip.id,
                        dayIdx,
                        spotIdx: idx
                    });
                }
            });
        });

        if (pendingItems.length === 0) {
            widget.style.display = 'none';
            return;
        }

        widget.style.display = '';
        const first = pendingItems[0];
        subEl.textContent = pendingItems.length === 1
            ? `${first.city} · ${first.name}`
            : `${first.city} · ${first.name} 等 ${pendingItems.length} 个景点`;
        widget.dataset.tripId = first.tripId;
        widget.dataset.dayIdx = first.dayIdx;
        widget.dataset.spotIdx = first.spotIdx;
    },

    _fmtMonthDay(d) {
        return `${d.getMonth() + 1}月${d.getDate()}日`;
    },

    openNearestTrip() {
        const widget = document.getElementById('countdownWidget');
        if (!widget) return;
        // 通过重新计算找到 nearest 并打开
        const trips = AIMemory.getAllTrips();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let nearest = null;
        let minDiff = Infinity;
        Object.values(trips).forEach(trip => {
            if (!trip.startDate || trip.deletedAt) return;
            const sd = new Date(trip.startDate + 'T00:00:00');
            if (isNaN(sd.getTime())) return;
            const days = trip.days || trip.dayPlans?.length || 1;
            const ed = new Date(sd);
            ed.setDate(ed.getDate() + days - 1);
            let diff = sd.getTime() - today.getTime();
            const isOngoing = today >= sd && today <= ed;
            if (isOngoing) diff = 0;
            if (diff < 0 && !isOngoing) return;
            if (diff < minDiff) { minDiff = diff; nearest = trip; }
        });
        if (nearest && typeof App !== 'undefined') {
            App.openTripDetail(nearest.id);
        }
    },

    openTodayPlan() {
        const widget = document.getElementById('todayWidget');
        if (!widget || !widget.dataset.tripId) return;
        if (typeof App !== 'undefined') {
            App.openTripDetail(widget.dataset.tripId);
        }
    },

    openQuickCheckin() {
        const widget = document.getElementById('checkinWidget');
        if (!widget || !widget.dataset.tripId) return;
        if (typeof App !== 'undefined') {
            App.openTripDetail(widget.dataset.tripId);
        }
    },

    openMemorySpace() {
        const self = this;
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips).sort((a, b) => b.savedAt - a.savedAt);

        // SVG 图标工具
        const _svgIcon = (name, size = 14) => {
            const icons = {
                'map-pin': `<path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
                'camera': `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`,
                'book-open': `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
                'download': `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>`,
                'tag': `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>`,
                'utensils': `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>`,
                'landmark': `<line x1="3" x2="21" y1="22" y2="22"/><path d="M6 22V8l6-4 6 4v14"/><path d="M10 22v-6h4v6"/>`,
                'building': `<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>`,
                'tree-pine': `<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>`,
                'shopping-bag': `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
                'bed': `<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>`,
                'car': `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>`,
                'plane': `<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>`,
                'train': `<rect width="16" height="12" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 19v-2"/><path d="M16 19v-2"/><path d="M2 19h20"/>`,
                'coffee': `<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>`,
                'music': `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
                'trophy': `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
                'waves': `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>`,
                'mountain': `<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>`,
                'droplets': `<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25C3 14.47 4.8 16.3 7 16.3z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>`,
                'sun': `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
            };
            const path = icons[name] || icons['map-pin'];
            return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">${path}</svg>`;
        };

        // 根据景点类型获取SVG图标
        const _getSpotIcon = (type) => {
            const typeStr = type || '';
            if (typeStr.includes('美食') || typeStr.includes('餐厅') || typeStr.includes('咖啡') || typeStr.includes('酒吧')) return _svgIcon('utensils', 14);
            if (typeStr.includes('景点') || typeStr.includes('景区') || typeStr.includes('博物馆') || typeStr.includes('寺') || typeStr.includes('塔') || typeStr.includes('古城')) return _svgIcon('landmark', 14);
            if (typeStr.includes('公园') || typeStr.includes('自然') || typeStr.includes('山') || typeStr.includes('湖') || typeStr.includes('海滩') || typeStr.includes('温泉')) return _svgIcon('tree-pine', 14);
            if (typeStr.includes('购物') || typeStr.includes('商场')) return _svgIcon('shopping-bag', 14);
            if (typeStr.includes('酒店') || typeStr.includes('住宿')) return _svgIcon('bed', 14);
            if (typeStr.includes('交通') || typeStr.includes('机场') || typeStr.includes('车站')) return _svgIcon('plane', 14);
            if (typeStr.includes('娱乐') || typeStr.includes('演出') || typeStr.includes('乐园')) return _svgIcon('music', 14);
            if (typeStr.includes('体育')) return _svgIcon('trophy', 14);
            return _svgIcon('map-pin', 14);
        };

        // 收集所有标签
        const allTags = new Set();
        tripArr.forEach(trip => {
            if (trip.tag) allTags.add(trip.tag);
        });
        const tagList = Array.from(allTags);
        let activeTag = null; // null 表示全部

        let allEntries = [];
        let cities = new Set();

        const buildEntries = (filterTag = null) => {
            allEntries = [];
            let totalNotes = 0;
            let totalPhotos = 0;
            cities = new Set();

            tripArr.forEach(trip => {
                if (filterTag && trip.tag !== filterTag) return;
                if (trip.destination) cities.add(trip.destination);
                const startDate = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : new Date(trip.savedAt || Date.now());
                const _getDayDate = (dayIdx) => {
                    const d = new Date(startDate);
                    d.setDate(d.getDate() + dayIdx);
                    return d;
                };
                const _fmtDate = (d) => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
                const _weekday = (d) => ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
                const _fmtTime = (ts) => {
                    if (!ts) return '';
                    const d = new Date(ts);
                    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                };

                (trip.dayPlans || []).forEach((dp, di) => {
                    if (dp.city) cities.add(dp.city);
                    const dayDate = _getDayDate(di);
                    const dateLabel = _fmtDate(dayDate);
                    const weekday = _weekday(dayDate);
                    (dp.spots || []).forEach((spot) => {
                        const notes = spot.record?.notes || [];
                        const photos = spot.record?.photos || [];
                        notes.forEach(note => {
                            allEntries.push({
                                type: 'note',
                                tripTitle: trip.title || trip.destination,
                                dateLabel, weekday,
                                spotName: spot.name,
                                spotIcon: _getSpotIcon(spot.type || spot.name),
                                city: dp.city || trip.destination || '',
                                note,
                                photos: note.photos || [],
                                timestamp: note.createdAt || 0,
                                tripTag: trip.tag
                            });
                            totalNotes++;
                        });
                        photos.forEach(p => {
                            if (!notes.some(n => (n.photos || []).some(np => np.dataUrl === p.dataUrl || np === p))) {
                                allEntries.push({
                                    type: 'photo',
                                    tripTitle: trip.title || trip.destination,
                                    dateLabel, weekday,
                                    spotName: spot.name,
                                    spotIcon: _getSpotIcon(spot.type || spot.name),
                                    city: dp.city || trip.destination || '',
                                    photo: p,
                                    timestamp: p.createdAt || 0,
                                    tripTag: trip.tag
                                });
                                totalPhotos++;
                            }
                        });
                    });
                });
            });

            allEntries.sort((a, b) => b.timestamp - a.timestamp);
            return { totalNotes, totalPhotos };
        };

        const { totalNotes, totalPhotos } = buildEntries();

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';

        const renderEntries = () => {
            const { totalNotes: tn, totalPhotos: tp } = buildEntries(activeTag);
            let entriesHtml = '';
            let currentDate = '';

            if (allEntries.length === 0) {
                entriesHtml = `<div style="text-align:center;padding:80px 20px;color:#bbb;">
                    <div style="font-size:48px;margin-bottom:16px;">${_svgIcon('book-open', 48)}</div>
                    <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#8b7355;">还没有旅行记忆</div>
                    <div style="font-size:13px;line-height:1.6;color:#a08d75;">开始一段旅行，在景点写下想法、拍下照片<br/>这里会成为你的专属旅行空间</div>
                </div>`;
            } else {
                allEntries.forEach(e => {
                    if (e.dateLabel !== currentDate) {
                        currentDate = e.dateLabel;
                        entriesHtml += `<div class="mem-date-divider"><span class="mem-date-dot"></span><span class="mem-date-text">${e.dateLabel} ${e.weekday}</span></div>`;
                    }
                    const spotIcon = e.spotIcon;
                    if (e.type === 'note') {
                        const notePhotos = e.photos || [];
                        entriesHtml += `
                            <div class="mem-entry">
                                <div class="mem-entry-header">
                                    <span class="mem-spot">${spotIcon} ${e.spotName}</span>
                                    <span class="mem-meta">${e.city} · ${e.tripTitle}</span>
                                </div>
                                <div class="mem-content">${e.note.html || (e.note.text || '').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
                                ${notePhotos.length > 0 ? `<div class="${notePhotos.length === 1 ? 'mem-single-photo-wrap' : 'mem-photos-grid'}">${notePhotos.map(p => `<img src="${p.dataUrl || p}" class="${notePhotos.length === 1 ? 'mem-single-photo' : 'mem-photo'}">`).join('')}</div>` : ''}
                                <div class="mem-time">${_fmtTimeFromTs(e.timestamp)}</div>
                            </div>`;
                    } else if (e.type === 'photo') {
                        entriesHtml += `
                            <div class="mem-entry mem-photo-entry">
                                <div class="mem-entry-header">
                                    <span class="mem-spot">${spotIcon} ${e.spotName}</span>
                                    <span class="mem-meta">${e.city} · ${e.tripTitle}</span>
                                </div>
                                <img src="${e.photo.dataUrl || e.photo}" class="mem-single-photo">
                                <div class="mem-time">${_svgIcon('camera', 12)} 照片</div>
                            </div>`;
                    }
                });
            }

            // 更新统计
            const statNums = mask.querySelectorAll('.mem-stat-num');
            if (statNums[0]) statNums[0].textContent = tn;
            if (statNums[1]) statNums[1].textContent = tp;
            if (statNums[2]) statNums[2].textContent = cities.size;

            const timeline = mask.querySelector('.mem-timeline');
            if (timeline) timeline.innerHTML = entriesHtml;

            // 更新标签选中状态
            mask.querySelectorAll('.mem-tag-chip').forEach(chip => {
                const tag = chip.dataset.tag;
                if (tag === (activeTag || 'all')) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
        };

        function _fmtTimeFromTs(ts) {
            if (!ts) return '';
            const d = new Date(ts);
            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }

        // 标签栏HTML
        let tagBarHtml = '<div class="mem-tag-bar">';
        tagBarHtml += `<div class="mem-tag-chip mem-tag-chip-all active" data-tag="all">${_svgIcon('tag', 12)} 全部</div>`;
        tagList.forEach(tag => {
            tagBarHtml += `<div class="mem-tag-chip" data-tag="${tag}">${tag}</div>`;
        });
        tagBarHtml += `<button class="mem-export-btn" id="memExportBtn">${_svgIcon('download', 12)} 导出PDF</button>`;
        tagBarHtml += '</div>';

        mask.innerHTML = `
            <div class="ui-modal memory-space-modal">
                <div class="mem-header">
                    <div class="mem-header-top">
                        <button class="mem-close" id="memClose">✕</button>
                        <div class="mem-stats">
                            <div class="mem-stat"><div class="mem-stat-num">${totalNotes}</div><div class="mem-stat-label">记录</div></div>
                            <div class="mem-stat"><div class="mem-stat-num">${totalPhotos}</div><div class="mem-stat-label">照片</div></div>
                            <div class="mem-stat"><div class="mem-stat-num">${cities.size}</div><div class="mem-stat-label">城市</div></div>
                        </div>
                    </div>
                    <div class="mem-title">${_svgIcon('book-open', 20)} 我的旅行记忆</div>
                    <div class="mem-subtitle">每一段旅途，都值得被记住</div>
                </div>
                ${tagBarHtml}
                <div class="mem-timeline">
                    <!-- 内容由JS动态渲染 -->
                </div>
            </div>`;

        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        // 首次渲染
        renderEntries();

        // 标签切换
        mask.querySelectorAll('.mem-tag-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const tag = chip.dataset.tag;
                activeTag = tag === 'all' ? null : tag;
                renderEntries();
            });
        });

        // 导出PDF按钮
        const exportBtn = document.getElementById('memExportBtn');
        if (exportBtn) {
            exportBtn.onclick = (e) => {
                e.stopPropagation();
                UiKit.confirm({
                    title: '导出PDF',
                    message: activeTag ? `确定要导出「${activeTag}」标签下的所有旅行记忆吗？` : '确定要导出所有旅行记忆吗？',
                    onConfirm: () => {
                        // 跳转到记忆导出页面，并带上标签筛选
                        const tagParam = activeTag ? `?tag=${encodeURIComponent(activeTag)}` : '';
                        window.location.href = `memory-export.html${tagParam}`;
                    }
                });
            };
        }

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        document.getElementById('memClose').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };
    },
};

const TripsModule = {
    currentTab: 0,
    selectMode: null, // null | 'delete' | 'archive'
    selectedTripId: null,
    _eventsBound: false,
    activeTag: null,
    _expandedTrips: new Set(), // 展开的行程ID集合（默认折叠）

    // ===== 选择模式（20 条上限时使用） =====
    enterSelectMode(mode) {
        this.selectMode = mode;
        this.selectedTripId = null;
        this.switchTripTab(0); // 切到第一个 tab
        this._renderSelectBar();
        this.renderTripCards();
    },

    exitSelectMode() {
        this.selectMode = null;
        this.selectedTripId = null;
        this._renderSelectBar();
        this.renderTripCards();
    },

    selectCard(tripId) {
        if (!this.selectMode) return;
        this.selectedTripId = this.selectedTripId === tripId ? null : tripId;
        this.renderTripCards();
        this._renderSelectBar();
    },

    async confirmSelect() {
        if (!this.selectedTripId || !this.selectMode) return;
        const id = this.selectedTripId;
        if (this.selectMode === 'delete') {
            await AIMemory.deleteTrip(id);
            UiKit.toast('已删除，可继续创建行程', 'success');
        } else if (this.selectMode === 'archive') {
            AIMemory.archiveTrip(id);
            UiKit.toast('已归档，可继续创建行程', 'success');
        }
        this.exitSelectMode();
    },

    _renderSelectBar() {
        let bar = document.getElementById('selectModeBar');
        if (!this.selectMode) {
            if (bar) bar.remove();
            return;
        }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'selectModeBar';
            bar.style.cssText = 'position:sticky;top:0;z-index:20;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;';
            const tripsPage = document.getElementById('tripsPage');
            const tripTabs = document.getElementById('tripTabs');
            tripsPage?.insertBefore(bar, tripTabs);
        }
        const actionText = this.selectMode === 'delete' ? '删除' : '归档';
        const btnDisabled = !this.selectedTripId;
        const btnBg = this.selectMode === 'delete' ? '#DC2626' : '#FF9500';
        bar.innerHTML = `
            <span style="font-size:14px;color:#333;">选择要${actionText}的行程</span>
            <div style="display:flex;gap:8px;">
                <button onclick="TripsModule.exitSelectMode()" style="padding:6px 16px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#666;font-size:13px;">取消</button>
                <button onclick="TripsModule.confirmSelect()" ${btnDisabled ? 'disabled' : ''} style="padding:6px 16px;border:none;border-radius:8px;background:${btnBg};color:#fff;font-size:13px;${btnDisabled ? 'opacity:0.4;' : ''}">确认${actionText}</button>
            </div>`;
    },

    // ===== 事件监听（Task-15） =====
    _bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;
        EventBus.on('trip:synced', () => this.renderTripCards());
        EventBus.on('trip:archived', () => this.renderTripCards());
        EventBus.on('trip:unarchived', () => this.renderTripCards());
        EventBus.on('trip:deleted', () => this.renderTripCards());
        EventBus.on('trip:unpublished', () => this.renderTripCards());
        EventBus.on('trip:saved', () => this.renderTripCards());

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tc-cover-right')) {
                this.closeAllMoreMenus();
            }
        });
    },

    render() {
        this._bindEvents();
        this._loadExpandedState();
        this.renderTripCards();
        this.initSwipe();
    },

    // ===== 标签分类功能 =====
    _tagColors: [
        '#FF9500', '#FF6B6B', '#4ECDC4', '#45B7D1',
        '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500'
    ],

    getTagColor(tagName) {
        if (!tagName) return '#FF9500';
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const idx = Math.abs(hash) % this._tagColors.length;
        return this._tagColors[idx];
    },

    getTagList() {
        try {
            const raw = JSON.parse(localStorage.getItem('trip_tags') || '[]');
            if (Array.isArray(raw)) {
                return raw.map(t => {
                    if (typeof t === 'string') return t;
                    if (t && typeof t.name === 'string') return t.name;
                    return null;
                }).filter(Boolean);
            }
            return [];
        } catch { return []; }
    },

    saveTagList(tags) {
        const cleanTags = (tags || []).filter(t => typeof t === 'string');
        localStorage.setItem('trip_tags', JSON.stringify(cleanTags));
    },

    renderTagBar() {
        const bar = document.getElementById('tripTagBar');
        if (!bar) return;
        const tags = this.getTagList();
        const allActive = !this.activeTag;
        const trashActive = this.activeTag === '__trash__';
        let html = `<div class="trip-tag-item trip-tag-item--manage" onclick="TripsModule.showTagManager()" title="标签管理">⚙</div>`;
        html += `<div class="trip-tag-item trip-tag-item--all ${allActive ? 'active' : ''}" onclick="TripsModule.filterByTag(null)">全部</div>`;
        tags.forEach(t => {
            const active = this.activeTag === t ? 'active' : '';
            const safe = t.replace(/'/g, "\\'");
            const color = this.getTagColor(t);
            const dotStyle = active ? '' : `background:${color};`;
            const activeStyle = active ? `background:${color};` : '';
            html += `<div class="trip-tag-item ${active}" style="${activeStyle}" onclick="TripsModule.filterByTag('${safe}')"><span class="trip-tag-dot" style="${dotStyle}"></span>${t}</div>`;
        });
        // 回收站标签
        const trashCount = AIMemory.getDeletedTrips().length;
        if (trashCount > 0 || trashActive) {
            html += `<div class="trip-tag-item trip-tag-item--trash ${trashActive ? 'active' : ''}" onclick="TripsModule.filterByTag('__trash__')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                回收站<span class="trash-count-badge">${trashCount}</span>
            </div>`;
        }
        bar.innerHTML = html;
    },

    filterByTag(tag) {
        this.activeTag = tag;
        this.renderTripCards();
    },

    _saveExpandedState() {
        try {
            localStorage.setItem('trip_expanded_state', JSON.stringify([...this._expandedTrips]));
        } catch(e) {}
    },

    _loadExpandedState() {
        try {
            const saved = JSON.parse(localStorage.getItem('trip_expanded_state') || '[]');
            if (Array.isArray(saved)) {
                this._expandedTrips = new Set(saved);
            }
        } catch(e) {}
    },

    toggleCollapse(tripId) {
        const el = document.getElementById(`tc-expand-${tripId}`);
        if (!el) return;
        const arrow = document.querySelector(`[data-trip-id="${tripId}"] .tc-collapse-arrow`);
        const btn = document.querySelector(`[data-trip-id="${tripId}"] .tc-collapse-btn`);
        if (this._expandedTrips.has(tripId)) {
            this._expandedTrips.delete(tripId);
            el.classList.add('tc-expandable--collapsed');
            if (arrow) arrow.classList.add('tc-collapse-arrow--collapsed');
            if (btn) btn.title = '展开';
        } else {
            this._expandedTrips.add(tripId);
            el.classList.remove('tc-expandable--collapsed');
            if (arrow) arrow.classList.remove('tc-collapse-arrow--collapsed');
            if (btn) btn.title = '收起';
        }
        this._saveExpandedState();
        const toolbarBtn = document.querySelector('.trip-toggle-all-btn');
        if (toolbarBtn) {
            const allTrips = Object.values(AIMemory.getAllTrips());
            let visibleTrips = allTrips;
            if (this.activeTag) {
                visibleTrips = allTrips.filter(t => t.tag === this.activeTag);
            }
            const allExpanded = visibleTrips.every(t => this._expandedTrips.has(t.id));
            toolbarBtn.innerHTML = `<span class="trip-toggle-all-icon">${allExpanded ? '⌃' : '⌄'}</span>${allExpanded ? '全部收起' : '全部展开'}`;
        }
    },

    toggleAllCollapse() {
        const allTrips = Object.values(AIMemory.getAllTrips());
        let visibleTrips = allTrips;
        if (this.activeTag) {
            visibleTrips = allTrips.filter(t => t.tag === this.activeTag);
        }
        const allExpanded = visibleTrips.every(t => this._expandedTrips.has(t.id));
        if (allExpanded) {
            visibleTrips.forEach(t => {
                this._expandedTrips.delete(t.id);
                const el = document.getElementById(`tc-expand-${t.id}`);
                const arrow = document.querySelector(`[data-trip-id="${t.id}"] .tc-collapse-arrow`);
                const btn = document.querySelector(`[data-trip-id="${t.id}"] .tc-collapse-btn`);
                el?.classList.add('tc-expandable--collapsed');
                arrow?.classList.add('tc-collapse-arrow--collapsed');
                if (btn) btn.title = '展开';
            });
        } else {
            visibleTrips.forEach(t => {
                this._expandedTrips.add(t.id);
                const el = document.getElementById(`tc-expand-${t.id}`);
                const arrow = document.querySelector(`[data-trip-id="${t.id}"] .tc-collapse-arrow`);
                const btn = document.querySelector(`[data-trip-id="${t.id}"] .tc-collapse-btn`);
                el?.classList.remove('tc-expandable--collapsed');
                arrow?.classList.remove('tc-collapse-arrow--collapsed');
                if (btn) btn.title = '收起';
            });
        }
        const toolbarBtn = document.querySelector('.trip-toggle-all-btn');
        if (toolbarBtn) {
            const nowAllExpanded = visibleTrips.every(t => this._expandedTrips.has(t.id));
            toolbarBtn.innerHTML = `<span class="trip-toggle-all-icon">${nowAllExpanded ? '⌃' : '⌄'}</span>${nowAllExpanded ? '全部收起' : '全部展开'}`;
        }
        this._saveExpandedState();
    },

    showTagSelector(tripId) {
        const existing = document.getElementById('tagSelectorMask');
        if (existing) existing.remove();

        const trip = AIMemory.getTrip(tripId);
        if (!trip) return;
        const tags = this.getTagList();
        const currentTag = trip.tag || '';

        const itemsHtml = tags.map(t => {
            const isActive = t === currentTag;
            const safe = t.replace(/'/g, "\\'");
            const color = this.getTagColor(t);
            return `<div class="tag-selector-item ${isActive ? 'tag-selector-item--active' : ''}" onclick="TripsModule.setTripTag('${tripId}', '${safe}')">
                <span class="ts-tag-dot" style="background:${color};"></span>
                <span>${t}</span>
                <span class="ts-check">✓</span>
            </div>`;
        }).join('');

        const mask = document.createElement('div');
        mask.className = 'tag-selector-mask';
        mask.id = 'tagSelectorMask';
        mask.innerHTML = `
            <div class="tag-selector-sheet">
                <div class="tag-selector-title">选择标签</div>
                ${itemsHtml}
                <div class="tag-selector-divider"></div>
                <div class="tag-selector-item ${!currentTag ? 'tag-selector-item--active' : ''}" onclick="TripsModule.setTripTag('${tripId}', '')">
                    <span class="ts-tag-dot" style="visibility:hidden;"></span>
                    <span>无标签</span>
                    <span class="ts-check">✓</span>
                </div>
                <div class="tag-selector-divider"></div>
                <div class="tag-selector-add" onclick="TripsModule._promptNewTag('${tripId}')">+ 新建标签</div>
                <div class="tag-selector-cancel" onclick="TripsModule.closeTagSelector()">取消</div>
            </div>`;

        document.body.appendChild(mask);
        mask.addEventListener('click', (e) => { if (e.target === mask) this.closeTagSelector(); });
        requestAnimationFrame(() => mask.classList.add('show'));
    },

    closeTagSelector() {
        const mask = document.getElementById('tagSelectorMask');
        if (!mask) return;
        mask.classList.remove('show');
        setTimeout(() => mask.remove(), 250);
    },

    setTripTag(tripId, tag) {
        const trip = AIMemory.getTrip(tripId);
        if (!trip) return;
        if (tag) {
            trip.tag = tag;
        } else {
            delete trip.tag;
        }
        AIMemory.saveTrip(trip);
        this.closeTagSelector();
        this.renderTripCards();
        const toast = tag ? `已设置标签「${tag}」` : '已清除标签';
        if (typeof UiKit !== 'undefined') {
            UiKit.toast(toast, 'success');
        } else if (typeof UIRender !== 'undefined') {
            UIRender.showToast(toast);
        }
    },

    addNewTag(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) {
            if (typeof UiKit !== 'undefined') UiKit.toast('标签名不能为空', 'error');
            return false;
        }
        if (trimmed.length > 10) {
            if (typeof UiKit !== 'undefined') UiKit.toast('标签名最多10个字符', 'error');
            return false;
        }
        const tags = this.getTagList();
        if (tags.includes(trimmed)) {
            if (typeof UiKit !== 'undefined') UiKit.toast('该标签已存在', 'error');
            return false;
        }
        tags.push(trimmed);
        this.saveTagList(tags);
        return true;
    },

    async _promptNewTag(tripId) {
        const name = await UiKit.prompt('请输入标签名（最多10个字符）', {
            title: '新建标签',
            placeholder: '输入标签名',
            confirmText: '确定',
            cancelText: '取消'
        });
        if (name === null || name === undefined) return;
        if (this.addNewTag(name)) {
            if (tripId) {
                this.showTagSelector(tripId);
            } else {
                this._renderTagManagerList();
                this.renderTagBar();
            }
        }
    },

    showTagManager() {
        const existing = document.getElementById('tagManagerPage');
        if (existing) existing.remove();

        const page = document.createElement('div');
        page.className = 'tag-manager-page';
        page.id = 'tagManagerPage';
        page.innerHTML = `
            <div class="detail-nav-bar">
                <button class="detail-back" onclick="TripsModule.closeTagManager()">←</button>
                <div class="detail-title">标签管理</div>
                <div class="detail-right"></div>
            </div>
            <div class="tag-manager-list" id="tagManagerList"></div>`;

        document.body.appendChild(page);
        requestAnimationFrame(() => page.classList.add('active'));
        this._renderTagManagerList();
    },

    _renderTagManagerList() {
        const listEl = document.getElementById('tagManagerList');
        if (!listEl) return;
        const tags = this.getTagList();
        const trips = Object.values(AIMemory.getAllTrips());
        const trashCount = this.getTrashList().length;

        let html = `<div class="tag-selector-add" style="border-bottom:1px solid #f0f0f0;margin-bottom:4px;" onclick="TripsModule._promptNewTag(null)">+ 新建标签</div>`;

        if (tags.length === 0) {
            html += `<div class="tag-manager-empty">暂无标签<span>点击上方按钮新建第一个标签</span></div>`;
        } else {
            html += tags.map(t => {
                const count = trips.filter(tr => tr.tag === t).length;
                const safe = t.replace(/'/g, "\\'");
                const color = this.getTagColor(t);
                return `<div class="tag-manager-item">
                    <div class="tag-item-name"><span class="tm-tag-dot" style="background:${color};"></span>${t}</div>
                    <div class="tag-item-count">${count} 个行程</div>
                    <div class="tag-item-actions">
                        <button onclick="TripsModule._promptRenameTag('${safe}')" title="重命名">✏</button>
                        <button class="delete-btn" onclick="TripsModule.deleteTag('${safe}')" title="删除">🗑</button>
                    </div>
                </div>`;
            }).join('');
        }

        html += `<div class="tag-manager-trash-entry" onclick="TripsModule.showTagTrash()">
            <div class="tag-item-name">🗑 回收站<span class="trash-count">${trashCount} 个标签</span></div>
            <div class="tag-item-arrow">›</div>
        </div>`;

        listEl.innerHTML = html;
    },

    showTagTrash() {
        const existing = document.getElementById('tagTrashPage');
        if (existing) existing.remove();

        const page = document.createElement('div');
        page.className = 'tag-manager-page tag-trash-page';
        page.id = 'tagTrashPage';
        page.innerHTML = `
            <div class="detail-nav-bar">
                <button class="detail-back" onclick="TripsModule.closeTagTrash()">←</button>
                <div class="detail-title">标签回收站</div>
                <div class="detail-right"></div>
            </div>
            <div class="tag-trash-tip">删除的标签和行程将保留7天，到期后自动永久删除</div>
            <div class="tag-manager-list" id="tagTrashList"></div>`;

        document.body.appendChild(page);
        requestAnimationFrame(() => page.classList.add('active'));
        this._renderTagTrashList();
    },

    closeTagTrash() {
        const page = document.getElementById('tagTrashPage');
        if (!page) return;
        page.classList.remove('active');
        setTimeout(() => page.remove(), 200);
    },

    _renderTagTrashList() {
        const listEl = document.getElementById('tagTrashList');
        if (!listEl) return;
        const trash = this.getTrashList();

        if (trash.length === 0) {
            listEl.innerHTML = `<div class="tag-manager-empty">回收站为空<span>删除的标签会出现在这里</span></div>`;
            return;
        }

        let html = '';
        trash.forEach(entry => {
            const daysLeft = this.getDaysLeft(entry.deletedAt);
            const tripCount = (entry.trips || []).length;
            const safeName = entry.name.replace(/'/g, "\\'");
            const color = this.getTagColor(entry.name);
            html += `<div class="tag-trash-item">
                <div class="tag-trash-header">
                    <div class="tag-item-name"><span class="tm-tag-dot" style="background:${color};"></span>${entry.name}</div>
                    <div class="tag-trash-days">${daysLeft}天后删除</div>
                </div>
                <div class="tag-trash-trip-count">包含 ${tripCount} 个行程</div>
                <div class="tag-trash-actions">
                    <button class="trash-restore-btn" onclick="TripsModule.restoreTagFromTrash('${safeName}')">↩ 恢复</button>
                    <button class="trash-delete-btn" onclick="TripsModule.permanentlyDeleteFromTrash('${safeName}')">永久删除</button>
                </div>
            </div>`;
        });

        listEl.innerHTML = html;
    },

    async restoreTagFromTrash(tagName) {
        const ok = await UiKit.confirm(`确定要恢复标签「${tagName}」吗？\n该标签下的所有行程将一起恢复。`, {
            title: '恢复标签',
            confirmText: '恢复',
            cancelText: '取消'
        });
        if (!ok) return;
        const success = this.restoreTag(tagName);
        if (success) {
            this._renderTagTrashList();
            this._renderTagManagerList();
            if (typeof UiKit !== 'undefined') UiKit.toast('已恢复', 'success');
        }
    },

    async permanentlyDeleteFromTrash(tagName) {
        const ok = await UiKit.confirm(`确定要永久删除标签「${tagName}」吗？\n该标签下的所有行程将永久删除，无法恢复！`, {
            title: '永久删除',
            confirmText: '永久删除',
            cancelText: '取消',
            danger: true
        });
        if (!ok) return;
        const success = this.permanentlyDeleteTag(tagName);
        if (success) {
            this._renderTagTrashList();
            this._renderTagManagerList();
            if (typeof UiKit !== 'undefined') UiKit.toast('已永久删除', 'success');
        }
    },

    closeTagManager() {
        const page = document.getElementById('tagManagerPage');
        if (!page) return;
        page.classList.remove('active');
        setTimeout(() => page.remove(), 200);
    },

    renameTag(oldName, newName) {
        const trimmed = (newName || '').trim();
        if (!trimmed) {
            if (typeof UiKit !== 'undefined') UiKit.toast('标签名不能为空', 'error');
            return false;
        }
        if (trimmed.length > 10) {
            if (typeof UiKit !== 'undefined') UiKit.toast('标签名最多10个字符', 'error');
            return false;
        }
        if (trimmed === oldName) return false;
        const tags = this.getTagList();
        if (tags.includes(trimmed)) {
            if (typeof UiKit !== 'undefined') UiKit.toast('该标签已存在', 'error');
            return false;
        }
        const idx = tags.indexOf(oldName);
        if (idx === -1) return false;
        tags[idx] = trimmed;
        this.saveTagList(tags);
        // 同步更新使用该标签的行程
        Object.values(AIMemory.getAllTrips()).forEach(tr => {
            if (tr.tag === oldName) {
                tr.tag = trimmed;
                AIMemory.saveTrip(tr);
            }
        });
        if (this.activeTag === oldName) this.activeTag = trimmed;
        this._renderTagManagerList();
        this.renderTagBar();
        this.renderTripCards();
        if (typeof UiKit !== 'undefined') UiKit.toast('已重命名', 'success');
        return true;
    },

    async _promptRenameTag(oldName) {
        const newName = await UiKit.prompt('请输入新的标签名', {
            title: '重命名标签',
            defaultValue: oldName,
            placeholder: '输入新标签名',
            confirmText: '确定',
            cancelText: '取消'
        });
        if (newName === null || newName === undefined) return;
        this.renameTag(oldName, newName);
    },

    async deleteTag(name) {
        const ok = await UiKit.confirm(`确定要删除标签「${name}」吗？\n该标签下的所有行程将一起移至回收站，保留7天。`, {
            title: '删除标签',
            confirmText: '删除',
            cancelText: '取消'
        });
        if (!ok) return;
        const tags = this.getTagList();
        const idx = tags.indexOf(name);
        if (idx === -1) return;
        const tripsWithTag = Object.values(AIMemory.getAllTrips()).filter(t => t.tag === name);
        this._addToTrash(name, tripsWithTag);
        tags.splice(idx, 1);
        this.saveTagList(tags);
        tripsWithTag.forEach(t => {
            AIMemory.deleteTrip(t.id);
        });
        if (this.activeTag === name) this.activeTag = null;
        this._renderTagManagerList();
        this.renderTagBar();
        this.renderTripCards();
        if (typeof UiKit !== 'undefined') UiKit.toast('已移至回收站，保留7天', 'success');
    },

    // ===== 标签回收站 =====
    TRASH_KEY: 'tag_trash',
    TRASH_DAYS: 7,

    _getTrash() {
        try {
            return JSON.parse(localStorage.getItem(this.TRASH_KEY) || '[]');
        } catch(e) { return []; }
    },

    _saveTrash(trash) {
        localStorage.setItem(this.TRASH_KEY, JSON.stringify(trash || []));
    },

    _addToTrash(tagName, trips) {
        const trash = this._getTrash();
        const existingIdx = trash.findIndex(t => t.name === tagName);
        const entry = {
            name: tagName,
            deletedAt: Date.now(),
            trips: trips || []
        };
        if (existingIdx > -1) {
            trash[existingIdx] = entry;
        } else {
            trash.push(entry);
        }
        this._saveTrash(trash);
    },

    _cleanExpiredTrash() {
        const trash = this._getTrash();
        const now = Date.now();
        const expireTime = this.TRASH_DAYS * 24 * 60 * 60 * 1000;
        const valid = trash.filter(t => (now - t.deletedAt) < expireTime);
        if (valid.length !== trash.length) {
            this._saveTrash(valid);
        }
        return valid;
    },

    getTrashList() {
        return this._cleanExpiredTrash();
    },

    restoreTag(tagName) {
        const trash = this._getTrash();
        const idx = trash.findIndex(t => t.name === tagName);
        if (idx === -1) return false;
        const entry = trash[idx];
        const tags = this.getTagList();
        if (!tags.includes(tagName)) {
            tags.push(tagName);
            this.saveTagList(tags);
        }
        (entry.trips || []).forEach(trip => {
            AIMemory.saveTrip(trip);
        });
        trash.splice(idx, 1);
        this._saveTrash(trash);
        this.renderTagBar();
        this.renderTripCards();
        return true;
    },

    permanentlyDeleteTag(tagName) {
        const trash = this._getTrash();
        const idx = trash.findIndex(t => t.name === tagName);
        if (idx === -1) return false;
        trash.splice(idx, 1);
        this._saveTrash(trash);
        return true;
    },

    getDaysLeft(deletedAt) {
        const elapsed = Date.now() - deletedAt;
        const left = this.TRASH_DAYS - Math.ceil(elapsed / (24 * 60 * 60 * 1000));
        return Math.max(0, left);
    },

    toggleMoreMenu(tripId) {
        const menu = document.getElementById(`tc-more-menu-${tripId}`);
        if (!menu) return;
        const isOpen = menu.classList.contains('show');
        this.closeAllMoreMenus();
        if (!isOpen) {
            menu.classList.add('show');
        }
    },

    closeAllMoreMenus() {
        document.querySelectorAll('.tc-more-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    },

    async deleteTrip(tripId) {
        const trip = AIMemory.getTrip(tripId);
        const tripTitle = trip?.title || (trip?.destination || '此行程');
        const ok = await UiKit.confirm(`确定要删除「${tripTitle}」吗？删除后将移入回收站，保留7天。`, { title: '删除行程', confirmText: '删除', cancelText: '取消' });
        if (ok) {
            await AIMemory.deleteTrip(tripId);
            this.renderTripCards();
            UiKit.toast('已移入回收站', 'success');
        }
    },

    restoreTrip(tripId) {
        const trip = AIMemory.getTrip(tripId);
        const tripTitle = trip?.title || (trip?.destination || '此行程');
        AIMemory.restoreTrip(tripId);
        this.renderTripCards();
        UiKit.toast(`「${tripTitle}」已恢复`, 'success');
    },

    async permanentlyDeleteTrip(tripId) {
        const trip = AIMemory.getTrip(tripId);
        const tripTitle = trip?.title || (trip?.destination || '此行程');
        const ok = await UiKit.confirm(`确定要永久删除「${tripTitle}」吗？删除后无法恢复。`, { title: '永久删除', confirmText: '永久删除', cancelText: '取消', danger: true });
        if (ok) {
            AIMemory.permanentlyDeleteTrip(tripId);
            this.renderTripCards();
            UiKit.toast('已永久删除', 'success');
        }
    },

    unarchiveTrip(tripId) {
        AIMemory.unarchiveTrip(tripId);
        this.renderTripCards();
        if (typeof UIRender !== 'undefined') {
            UIRender.showToast('已退回旅行中 🧳');
        } else if (typeof UiKit !== 'undefined') {
            UiKit.toast('已退回旅行中 🧳', 'success');
        }
    },

    async useAsTemplate(tripId) {
        const trip = AIMemory.getTrip(tripId);
        if (!trip) return;
        const defaultName = (trip.title || trip.destination || '我的行程') + ' 模板';
        const name = await UiKit.prompt('给模板起个名字', {
            title: '保存为模板',
            defaultValue: defaultName,
            placeholder: '模板名称'
        });
        if (name === null) return;
        const template = AIMemory.saveAsTemplate(trip, (name || '').trim() || defaultName);
        if (template) {
            UiKit.toast('已保存为模板 ✨', 'success');
        }
    },

    showThemePicker(tripId) {
        const self = this;
        const trip = AIMemory.getTrip(tripId);
        if (!trip) return;

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';

        let selectedType = trip.themeId ? 'city' : (trip.customTheme ? 'custom' : (trip.customGradient ? 'customGradient' : 'default'));
        let selectedIdx = trip.themeIndex !== undefined ? trip.themeIndex : 0;
        let selectedCity = trip.themeId || null;
        let selectedCustomBg = trip.customTheme || null;
        let customGradientColors = trip.customGradient ? [...trip.customGradient] : ['#FFB983', '#FF8A3D'];

        const renderStrip = (bg, name, isSelected, dataAttrs) => {
            const selected = isSelected ? ' selected' : '';
            const bgStyle = bg.startsWith('url(') || bg.startsWith('data:') 
                ? `background-image:${bg};background-size:cover;background-position:center;`
                : `background:${bg};`;
            return `<div class="theme-strip${selected}" ${dataAttrs} style="${bgStyle}">
                <span class="theme-strip-name">${name}</span>
            </div>`;
        };

        let defaultThemesHtml = '';
        DEFAULT_THEMES.forEach((theme, i) => {
            const isSelected = selectedType === 'default' && selectedIdx === i;
            defaultThemesHtml += renderStrip(theme.bg, theme.name, isSelected,
                `data-type="default" data-idx="${i}"`);
        });

        let cityThemesHtml = '';
        Object.entries(CITY_THEMES).forEach(([city, theme]) => {
            const isSelected = selectedType === 'city' && selectedCity === city;
            cityThemesHtml += renderStrip(theme.bg, `${city} · ${theme.name}`, isSelected,
                `data-type="city" data-city="${city}"`);
        });

        let customImgHtml = '';
        if (selectedCustomBg) {
            customImgHtml += renderStrip(`url(${selectedCustomBg})`, '我的图片', selectedType === 'custom',
                `data-type="custom"`);
        }
        customImgHtml += `<div class="theme-upload-strip" id="themeUploadBtn">
            <span>📷</span>
            <span>上传图片背景</span>
            <input type="file" id="themeFileInput" accept="image/*" style="display:none;">
        </div>`;

        const customGradientBg = `linear-gradient(135deg, ${customGradientColors[0]} 0%, ${customGradientColors[1]} 100%)`;

        mask.innerHTML = `
            <div class="ui-modal theme-picker-modal">
                <div class="ui-modal-title">🎨 选择行程主题</div>
                <div class="ui-modal-body">
                    <div class="theme-section">
                        <div class="theme-section-title">上传图片</div>
                        <div class="theme-list" id="customImgList">${customImgHtml}</div>
                    </div>

                    <div class="custom-gradient-section">
                        <div class="cg-title">🎨 自定义渐变</div>
                        <div class="cg-preview" id="cgPreview" style="background:${customGradientBg}"></div>
                        <div class="cg-colors">
                            <div class="cg-color-item">
                                <span class="cg-color-label">起始色</span>
                                <input type="color" class="cg-color-input" id="cgColor1" value="${customGradientColors[0]}">
                            </div>
                            <span class="cg-arrow">→</span>
                            <div class="cg-color-item">
                                <span class="cg-color-label">结束色</span>
                                <input type="color" class="cg-color-input" id="cgColor2" value="${customGradientColors[1]}">
                            </div>
                        </div>
                        <button class="cg-apply-btn" id="cgApplyBtn">使用此渐变</button>
                    </div>

                    <div class="theme-section">
                        <div class="theme-section-title">精选渐变</div>
                        <div class="theme-list" id="defaultThemeList">${defaultThemesHtml}</div>
                    </div>

                    <div class="theme-section">
                        <div class="theme-section-title">城市印象</div>
                        <div class="theme-list" id="cityThemeList">${cityThemesHtml}</div>
                    </div>
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-cancel">取消</button>
                    <button class="ui-modal-btn ui-modal-confirm" id="themeConfirmBtn">确认</button>
                </div>
            </div>`;

        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };

        const clearAllSelected = () => {
            mask.querySelectorAll('.theme-strip').forEach(o => o.classList.remove('selected'));
        };

        const selectStrip = (opt) => {
            clearAllSelected();
            opt.classList.add('selected');
            const type = opt.dataset.type;
            selectedType = type;
            if (type === 'default') {
                selectedIdx = parseInt(opt.dataset.idx);
            } else if (type === 'city') {
                selectedCity = opt.dataset.city;
            } else if (type === 'custom') {
                selectedCustomBg = trip.customTheme;
            }
        };

        const applyCustomGradient = () => {
            selectedType = 'customGradient';
            customGradientColors = [
                document.getElementById('cgColor1').value,
                document.getElementById('cgColor2').value
            ];
            clearAllSelected();
        };

        const confirmTheme = () => {
            if (selectedType === 'default') {
                trip.themeIndex = selectedIdx;
                delete trip.themeId;
                delete trip.customTheme;
                delete trip.customGradient;
                delete trip.themeEmoji;
                delete trip.themeName;
            } else if (selectedType === 'city') {
                trip.themeId = selectedCity;
                delete trip.themeIndex;
                delete trip.customTheme;
                delete trip.customGradient;
                trip.themeEmoji = CITY_THEMES[trip.themeId].emoji;
                trip.themeName = CITY_THEMES[trip.themeId].name;
            } else if (selectedType === 'custom' && selectedCustomBg) {
                trip.customTheme = selectedCustomBg;
                delete trip.themeId;
                delete trip.themeIndex;
                delete trip.customGradient;
                trip.themeEmoji = '🖼️';
                trip.themeName = '自定义';
            } else if (selectedType === 'customGradient') {
                trip.customGradient = [...customGradientColors];
                delete trip.themeId;
                delete trip.themeIndex;
                delete trip.customTheme;
                trip.themeEmoji = '🎨';
                trip.themeName = '自定义渐变';
            }
            AIMemory.saveTrip(trip);
            self.renderTripCards();
            if (typeof HomeModule !== 'undefined') HomeModule.renderCurrentTripCard();
            close();
            UiKit.toast('主题已更换 ✨', 'success');
        };

        mask.querySelector('.ui-modal-cancel').onclick = close;
        mask.querySelector('#themeConfirmBtn').onclick = confirmTheme;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        mask.querySelectorAll('.theme-strip').forEach(opt => {
            opt.onclick = () => selectStrip(opt);
        });

        const cgPreview = document.getElementById('cgPreview');
        const cgColor1 = document.getElementById('cgColor1');
        const cgColor2 = document.getElementById('cgColor2');
        const updateGradientPreview = () => {
            const bg = `linear-gradient(135deg, ${cgColor1.value} 0%, ${cgColor2.value} 100%)`;
            cgPreview.style.background = bg;
        };
        cgColor1.oninput = updateGradientPreview;
        cgColor2.oninput = updateGradientPreview;

        document.getElementById('cgApplyBtn').onclick = () => {
            applyCustomGradient();
            UiKit.toast('已选择自定义渐变', 'success');
        };

        const fileInput = document.getElementById('themeFileInput');
        document.getElementById('themeUploadBtn').onclick = (e) => {
            e.stopPropagation();
            fileInput.click();
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const imgSrc = ev.target.result;
                self._showImageCropper(imgSrc, (croppedSrc) => {
                    selectedCustomBg = croppedSrc;
                    selectedType = 'custom';
                    const list = document.getElementById('customImgList');
                    const existingCustom = list.querySelector('[data-type="custom"]');
                    if (existingCustom) existingCustom.remove();
                    const newStrip = document.createElement('div');
                    newStrip.className = 'theme-strip theme-custom-img selected';
                    newStrip.dataset.type = 'custom';
                    newStrip.style.backgroundImage = `url(${croppedSrc})`;
                    newStrip.style.backgroundSize = 'cover';
                    newStrip.style.backgroundPosition = 'center';
                    newStrip.innerHTML = '<span class="theme-strip-name">我的图片</span>';
                    newStrip.onclick = () => selectStrip(newStrip);
                    const uploadBtn = document.getElementById('themeUploadBtn');
                    list.insertBefore(newStrip, uploadBtn);
                    clearAllSelected();
                    newStrip.classList.add('selected');
                });
            };
            reader.readAsDataURL(file);
        };
    },

    _showImageCropper(imgSrc, onConfirm) {
        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';

        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let imgNaturalWidth = 0;
        let imgNaturalHeight = 0;

        const CROP_RATIO = 4 / 3;
        const OUTPUT_WIDTH = 800;
        const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / CROP_RATIO);

        mask.innerHTML = `
            <div class="ui-modal crop-modal">
                <div class="ui-modal-title">✂️ 裁剪图片</div>
                <div class="ui-modal-body">
                    <div class="crop-container" id="cropContainer">
                        <div class="crop-image-wrapper" id="cropImageWrapper">
                            <img class="crop-image" id="cropImage" src="${imgSrc}" alt="">
                            <div class="crop-box" id="cropBox"></div>
                        </div>
                    </div>
                    <div class="crop-controls">
                        <div class="crop-slider-row">
                            <span class="crop-slider-label">缩放</span>
                            <input type="range" class="crop-slider" id="cropScaleSlider" min="0.5" max="3" step="0.01" value="1">
                        </div>
                        <div class="crop-hint">拖动图片调整位置，滑动缩放大小</div>
                    </div>
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-cancel" id="cropCancelBtn">取消</button>
                    <button class="ui-modal-btn ui-modal-confirm" id="cropConfirmBtn">确认</button>
                </div>
            </div>`;

        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };

        const img = mask.querySelector('#cropImage');
        const wrapper = mask.querySelector('#cropImageWrapper');
        const cropBox = mask.querySelector('#cropBox');
        const container = mask.querySelector('#cropContainer');
        const slider = mask.querySelector('#cropScaleSlider');

        const updateTransform = () => {
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };

        const setupCropBox = () => {
            const containerW = container.clientWidth;
            const containerH = container.clientHeight - 40;

            let boxW = Math.min(containerW * 0.9, 320);
            let boxH = boxW / CROP_RATIO;

            if (boxH > containerH * 0.85) {
                boxH = containerH * 0.85;
                boxW = boxH * CROP_RATIO;
            }

            const wrapperRect = wrapper.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();

            const left = (wrapperRect.width - boxW) / 2;
            const top = (wrapperRect.height - boxH) / 2;

            cropBox.style.width = boxW + 'px';
            cropBox.style.height = boxH + 'px';
            cropBox.style.left = left + 'px';
            cropBox.style.top = top + 'px';
        };

        const initImage = () => {
            imgNaturalWidth = img.naturalWidth;
            imgNaturalHeight = img.naturalHeight;

            const containerW = container.clientWidth;
            const containerH = container.clientHeight - 40;

            let boxW = Math.min(containerW * 0.9, 320);
            let boxH = boxW / CROP_RATIO;
            if (boxH > containerH * 0.85) {
                boxH = containerH * 0.85;
                boxW = boxH * CROP_RATIO;
            }

            const imgRatio = imgNaturalWidth / imgNaturalHeight;
            let initialScale;
            if (imgRatio > CROP_RATIO) {
                initialScale = boxH / imgNaturalHeight;
            } else {
                initialScale = boxW / imgNaturalWidth;
            }

            scale = initialScale;
            slider.value = initialScale;
            translateX = 0;
            translateY = 0;
            updateTransform();

            requestAnimationFrame(() => {
                setupCropBox();
            });
        };

        if (img.complete) {
            initImage();
        } else {
            img.onload = initImage;
        }

        slider.oninput = (e) => {
            scale = parseFloat(e.target.value);
            updateTransform();
        };

        const onImgMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            e.preventDefault();
        };

        const onImgMouseMove = (e) => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        };

        const onImgMouseUp = () => {
            isDragging = false;
        };

        const onImgTouchStart = (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            }
        };

        const onImgTouchMove = (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            updateTransform();
            e.preventDefault();
        };

        const onImgTouchEnd = () => {
            isDragging = false;
        };

        img.addEventListener('mousedown', onImgMouseDown);
        document.addEventListener('mousemove', onImgMouseMove);
        document.addEventListener('mouseup', onImgMouseUp);
        img.addEventListener('touchstart', onImgTouchStart, { passive: false });
        document.addEventListener('touchmove', onImgTouchMove, { passive: false });
        document.addEventListener('touchend', onImgTouchEnd);

        mask.querySelector('#cropCancelBtn').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        mask.querySelector('#cropConfirmBtn').onclick = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = OUTPUT_WIDTH;
            canvas.height = OUTPUT_HEIGHT;

            const cropBoxRect = cropBox.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();

            const cropX = (cropBoxRect.left - imgRect.left) / scale;
            const cropY = (cropBoxRect.top - imgRect.top) / scale;
            const cropW = cropBoxRect.width / scale;
            const cropH = cropBoxRect.height / scale;

            const sourceX = -translateX / scale + (cropBoxRect.left - imgRect.left) / scale;
            const sourceY = -translateY / scale + (cropBoxRect.top - imgRect.top) / scale;
            const sourceW = cropBoxRect.width / scale;
            const sourceH = cropBoxRect.height / scale;

            const actualSourceX = Math.max(0, (cropBoxRect.left - imgRect.left - translateX) / scale);
            const actualSourceY = Math.max(0, (cropBoxRect.top - imgRect.top - translateY) / scale);

            const imgDisplayW = imgNaturalWidth * scale;
            const imgDisplayH = imgNaturalHeight * scale;
            const imgOffsetX = (imgRect.width - imgDisplayW) / 2 + translateX;
            const imgOffsetY = (imgRect.height - imgDisplayH) / 2 + translateY;

            const srcX = (cropBoxRect.left - imgRect.left - imgOffsetX) / scale;
            const srcY = (cropBoxRect.top - imgRect.top - imgOffsetY) / scale;
            const srcW = cropBoxRect.width / scale;
            const srcH = cropBoxRect.height / scale;

            ctx.drawImage(
                img,
                Math.max(0, srcX),
                Math.max(0, srcY),
                Math.min(imgNaturalWidth - Math.max(0, srcX), srcW),
                Math.min(imgNaturalHeight - Math.max(0, srcY), srcH),
                0, 0,
                OUTPUT_WIDTH,
                OUTPUT_HEIGHT
            );

            const croppedSrc = canvas.toDataURL('image/jpeg', 0.9);
            onConfirm(croppedSrc);
            close();
        };
    },

    openJournalFromList(tripId) {
        event.stopPropagation();
        const trip = AIMemory.getTrip(tripId);
        if (!trip) return;

        const startDate = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : new Date(trip.savedAt || Date.now());
        const _fmtDate = (d) => `${d.getMonth()+1}月${d.getDate()}日`;
        const _weekday = (d) => ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
        const _getDayDate = (dayIdx) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + dayIdx);
            return d;
        };
        const _getSpotEmoji = (type) => {
            const map = { '美食':'🍜','餐厅':'🍜','景点':'🏛️','景区':'🏛️','公园':'🌳','自然':'🏞️','博物馆':'🏛️','购物':'🛍️','商场':'🛍️','酒店':'🏨','住宿':'🏨','交通':'🚗','机场':'✈️','车站':'🚉','酒吧':'🍸','咖啡':'☕','咖啡馆':'☕','娱乐':'🎡','演出':'🎭','体育':'⚽','温泉':'♨️','海滩':'🏖️','山':'⛰️','湖':'💧','寺':'⛩️','塔':'🗼','古城':'🏯','乐园':'🎢' };
            for (const [k,v] of Object.entries(map)) { if (type && type.includes(k)) return v; }
            return '📍';
        };
        const _fmtTime = (ts) => {
            if (!ts) return '';
            const d = new Date(ts);
            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        };

        const title = trip.title || trip.destination || '我的旅行手记';
        const dest = trip.destination || trip.dayPlans?.[0]?.city || '';
        
        let allEntries = [];
        let totalPhotos = 0;
        let totalNotes = 0;

        (trip.dayPlans || []).forEach((dp, di) => {
            const dayDate = _getDayDate(di);
            const dateLabel = `${_fmtDate(dayDate)} ${_weekday(dayDate)}`;
            (dp.spots || []).forEach((spot) => {
                const notes = spot.record?.notes || [];
                const photos = spot.record?.photos || spot.photos || [];
                notes.forEach(note => {
                    allEntries.push({ type: 'note', day: di + 1, dateLabel, spotName: spot.name, spotEmoji: spot.emoji || _getSpotEmoji(spot.type || spot.name), note, photos: note.photos || [] });
                    totalNotes++;
                });
                photos.forEach(p => {
                    if (!notes.some(n => (n.photos || []).some(np => np.dataUrl === p.dataUrl || np === p))) {
                        allEntries.push({ type: 'photo', day: di + 1, dateLabel, spotName: spot.name, spotEmoji: spot.emoji || _getSpotEmoji(spot.type || spot.name), photo: p });
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
        let currentDay = -1;
        if (allEntries.length === 0) {
            entriesHtml = `<div style="text-align:center;padding:60px 20px;color:#bbb;"><div style="font-size:48px;margin-bottom:12px;">📖</div><div style="font-size:14px;">还没有记录内容</div><div style="font-size:12px;margin-top:6px;color:#ccc;">在旅行中写下想法、拍下照片，这里会自动集结成你的旅行手记</div></div>`;
        } else {
            allEntries.forEach(e => {
                if (e.day !== currentDay) {
                    currentDay = e.day;
                    entriesHtml += `<div class="journal-day-divider"><span class="journal-day-label">Day ${e.day} · ${e.dateLabel}</span></div>`;
                }
                if (e.type === 'note') {
                    const notePhotos = e.photos || [];
                    entriesHtml += `<div class="journal-entry"><div class="journal-entry-header"><span class="journal-spot">${e.spotEmoji} ${e.spotName}</span><span class="journal-time">${_fmtTime(e.note.createdAt)}</span></div><div class="journal-content">${e.note.html || (e.note.text || '').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>${notePhotos.length > 0 ? `<div class="${notePhotos.length === 1 ? '' : 'journal-photos'}">${notePhotos.map(p => `<img src="${p.dataUrl || p}" class="${notePhotos.length === 1 ? 'journal-single-photo' : 'journal-photo'}">`).join('')}</div>` : ''}</div>`;
                } else if (e.type === 'photo') {
                    entriesHtml += `<div class="journal-entry journal-photo-entry"><div class="journal-entry-header"><span class="journal-spot">${e.spotEmoji} ${e.spotName}</span><span class="journal-time">📷</span></div><img src="${e.photo.dataUrl || e.photo}" class="journal-single-photo"></div>`;
                }
            });
        }

        mask.innerHTML = `<div class="ui-modal journal-modal"><div class="journal-modal-header"><button class="journal-close" id="jnlClose">✕</button><div class="journal-title-wrap"><div class="journal-title">📖 ${title}</div><div class="journal-subtitle">${dest ? dest + ' · ' : ''}共${totalNotes}条记录，${totalPhotos}张照片</div></div></div><div class="journal-content-scroll">${entriesHtml}</div></div>`;

        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        document.getElementById('jnlClose').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };
    },

    renderTripCards() {
        const paneAll = document.getElementById('tripListAll');
        const paneMemory = document.getElementById('tripListMemory');
        if (!paneAll) return;

        this.renderTagBar();

        const trips = AIMemory.getAllTrips();
        let tripArr = Object.values(trips);
        const totalCount = tripArr.length;

        if (totalCount === 0) {
            paneAll.innerHTML = `
                <div class="empty-trips">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="22" width="52" height="40" rx="4"/><path d="M28 22v-6a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v6"/><line x1="14" y1="38" x2="66" y2="38"/><circle cx="26" cy="50" r="3" fill="currentColor" stroke="none"/><circle cx="54" cy="50" r="3" fill="currentColor" stroke="none"/></svg>
                    </div>
                    <div class="empty-title">还没有行程</div>
                    <div class="empty-desc">点击右上角，让AI帮你规划一段精彩旅程</div>
                    <button class="empty-btn" onclick="App.navigateTo('plan')">开始规划</button>
                </div>`;
            this.updateTripCounts(0, 0);
            this.renderMemoryPane(paneMemory);
            return;
        }

        const isTrashView = this.activeTag === '__trash__';

        // 回收站视图
        if (isTrashView) {
            tripArr = AIMemory.getDeletedTrips();
            if (tripArr.length === 0) {
                paneAll.innerHTML = `
                    <div class="empty-trips">
                        <div class="empty-icon" style="font-size:48px;">🗑️</div>
                        <div class="empty-title">回收站为空</div>
                        <div class="empty-desc">删除的行程会在这里保留7天</div>
                        <button class="empty-btn" onclick="TripsModule.filterByTag(null)">查看全部行程</button>
                    </div>`;
                this.updateTripCounts(totalCount, totalCount);
                this.renderMemoryPane(paneMemory);
                return;
            }
        } else {
            // 正常视图：过滤掉已删除的
            tripArr = tripArr.filter(t => !t.deletedAt);

            // 标签筛选
            if (this.activeTag) {
                tripArr = tripArr.filter(t => t.tag === this.activeTag);
            }

            // 按状态优先级排序：进行中 > 待出发 > 已完成
            const statusOrder = { ongoing: 0, upcoming: 1, completed: 2 };
            tripArr.sort((a, b) => {
                const sa = statusOrder[getTripStatus(a)] ?? 9;
                const sb = statusOrder[getTripStatus(b)] ?? 9;
                if (sa !== sb) return sa - sb;
                return (b.savedAt || 0) - (a.savedAt || 0);
            });
        }

        // 该标签下无行程
        if (tripArr.length === 0 && !isTrashView) {
            paneAll.innerHTML = `
                <div class="empty-trips">
                    <div class="empty-icon" style="font-size:48px;">🏷️</div>
                    <div class="empty-title">「${this.activeTag}」下暂无行程</div>
                    <div class="empty-desc">给行程添加该标签后才会显示在这里</div>
                    <button class="empty-btn" onclick="TripsModule.filterByTag(null)">查看全部</button>
                </div>`;
            this.updateTripCounts(totalCount, totalCount);
            this.renderMemoryPane(paneMemory);
            return;
        }

        // 渲染行程列表
        const allExpanded = tripArr.every(t => this._expandedTrips.has(t.id));
        const toggleAllText = allExpanded ? '全部收起' : '全部展开';
        const toggleAllIcon = allExpanded ? '⌃' : '⌄';
        const listTitle = isTrashView ? '回收站' : '行程';
        const listCountText = isTrashView ? `共 ${tripArr.length} 个行程（保留7天）` : `共 ${tripArr.length} 个行程`;
        const toolbarHtml = isTrashView ? '' : `
            <div class="trip-list-toolbar">
                <span class="trip-list-count">${listCountText}</span>
                <button class="trip-toggle-all-btn" onclick="TripsModule.toggleAllCollapse()">
                    <span class="trip-toggle-all-icon">${toggleAllIcon}</span>
                    ${toggleAllText}
                </button>
            </div>`;
        paneAll.innerHTML = `
            ${toolbarHtml}
            ${tripArr.map((trip, i) => {
                const status = getTripStatus(trip);
                return formatTripCard(trip, i, status, isTrashView);
            }).join('')}
        `;

        this.updateTripCounts(totalCount, totalCount);
        this.bindLongPress();
        this._initBackToTop();
        this._cleanExpiredTrash();
        setTimeout(() => this.updateTripTabIndicator(this.currentTab || 0), 50);

        // 渲染旅行记忆
        this.renderMemoryPane(paneMemory);
    },

    _initBackToTop() {
        const swipe = document.getElementById('tripSwipe');
        if (!swipe) return;
        let btn = document.getElementById('tripBackToTop');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'tripBackToTop';
            btn.className = 'trip-back-to-top';
            btn.title = '回到顶部';
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
            btn.onclick = () => {
                const pane = document.querySelector('.trip-pane');
                if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
            };
            swipe.style.position = 'relative';
            swipe.appendChild(btn);
        }
        const paneAll = document.getElementById('tripListAll');
        if (paneAll && !paneAll._backToTopBound) {
            paneAll._backToTopBound = true;
            paneAll.addEventListener('scroll', () => {
                if (paneAll.scrollTop > 300) {
                    btn.classList.add('show');
                } else {
                    btn.classList.remove('show');
                }
            });
        }
    },

    // 渲染旅行记忆面板（按行程分组，为PDF导出做准备）
    renderMemoryPane(pane) {
        if (!pane) return;
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

        if (tripArr.length === 0) {
            pane.innerHTML = `
                <div style="text-align:center;padding:80px 20px;color:var(--text-muted);">
                    <div style="font-size:56px;margin-bottom:16px;">📄</div>
                    <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--text-primary);">还没有旅行记忆</div>
                    <div style="font-size:13px;line-height:1.6;">创建行程并记录旅途点滴<br/>这里可以随时导出为PDF留存</div>
                </div>`;
            return;
        }

        // 按行程生成分组卡片
        const tripCards = tripArr.map(trip => {
            const title = trip.title || trip.destination || '未命名行程';
            const dest = trip.destination || trip.city || '';
            const days = trip.days || trip.dayPlans?.length || 1;
            const startDate = trip.startDate || '';

            // 收集该行程的所有记忆条目
            const entries = [];
            let notesCount = 0;
            let photosCount = 0;
            const tripCities = new Set();

            const sd = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : new Date(trip.savedAt || Date.now());
            const _getDayDate = (dayIdx) => { const d = new Date(sd); d.setDate(d.getDate() + dayIdx); return d; };
            const _fmtDate = (d) => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
            const _weekday = (d) => ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];

            (trip.dayPlans || []).forEach((dp, di) => {
                if (dp.city) tripCities.add(dp.city);
                const dayDate = _getDayDate(di);
                const dateLabel = _fmtDate(dayDate);
                const weekday = _weekday(dayDate);
                const dayTheme = dp.theme || `第${di+1}天`;
                (dp.spots || []).forEach(spot => {
                    const notes = spot.record?.notes || [];
                    const photos = spot.record?.photos || [];
                    notes.forEach(note => {
                        entries.push({
                            type: 'note', dateLabel, weekday, dayTheme,
                            spotName: spot.name,
                            spotEmoji: spot.emoji || '📍',
                            note,
                            photos: note.photos || [],
                            timestamp: note.createdAt || 0
                        });
                        notesCount++;
                    });
                    photos.forEach(p => {
                        if (!notes.some(n => (n.photos || []).some(np => np.dataUrl === p.dataUrl || np === p))) {
                            entries.push({
                                type: 'photo', dateLabel, weekday, dayTheme,
                                spotName: spot.name,
                                spotEmoji: spot.emoji || '📍',
                                photo: p,
                                timestamp: p.createdAt || 0
                            });
                            photosCount++;
                        }
                    });
                });
            });

            entries.sort((a, b) => a.timestamp - b.timestamp);

            // 生成展开内容
            let entriesHtml = '';
            if (entries.length === 0) {
                entriesHtml = '<div class="mem-group-empty">暂无记录内容</div>';
            } else {
                let curDay = '';
                entries.forEach(e => {
                    const dayKey = e.dateLabel + e.dayTheme;
                    if (dayKey !== curDay) {
                        curDay = dayKey;
                        entriesHtml += `<div class="mem-group-day"><span class="mem-group-day-dot"></span><span class="mem-group-day-text">${e.dateLabel} ${e.weekday} · ${e.dayTheme}</span></div>`;
                    }
                    if (e.type === 'note') {
                        const np = e.photos || [];
                        entriesHtml += `
                            <div class="mem-entry">
                                <div class="mem-entry-header">
                                    <span class="mem-spot">${e.spotEmoji} ${e.spotName}</span>
                                </div>
                                <div class="mem-content">${e.note.html || (e.note.text || '').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
                                ${np.length > 0 ? `<div class="${np.length === 1 ? 'mem-single-photo-wrap' : 'mem-photos-grid'}">${np.map(p => `<img src="${p.dataUrl || p}" class="${np.length === 1 ? 'mem-single-photo' : 'mem-photo'}">`).join('')}</div>` : ''}
                            </div>`;
                    } else {
                        entriesHtml += `
                            <div class="mem-entry mem-photo-entry">
                                <div class="mem-entry-header">
                                    <span class="mem-spot">${e.spotEmoji} ${e.spotName}</span>
                                </div>
                                <img src="${e.photo.dataUrl || e.photo}" class="mem-single-photo">
                            </div>`;
                    }
                });
            }

            const tripId = trip.id;
            const cityText = tripCities.size > 0 ? Array.from(tripCities).join('·') : (dest || '');
            const dateText = startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) : '';

            return `
                <div class="mem-group" data-trip-id="${tripId}">
                    <div class="mem-group-header" onclick="TripsModule.toggleMemGroup('${tripId}')">
                        <label class="mem-group-check" onclick="event.stopPropagation()">
                            <input type="checkbox" class="mem-checkbox" data-trip-id="${tripId}" checked onchange="TripsModule.updateMemSelection()">
                            <span class="mem-check-box"></span>
                        </label>
                        <div class="mem-group-icon">🗺️</div>
                        <div class="mem-group-info">
                            <div class="mem-group-title">${title}</div>
                            <div class="mem-group-meta">${cityText}${dateText ? ' · ' + dateText : ''} · ${days}天 · ${notesCount}条笔记 · ${photosCount}张照片</div>
                        </div>
                        <svg class="mem-group-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <div class="mem-group-body" id="memBody_${tripId}" style="display:none;">
                        ${entriesHtml}
                    </div>
                </div>`;
        }).join('');

        pane.innerHTML = `
            <div class="mem-pane-intro">勾选要导出的行程，点击底部按钮一键导出PDF</div>
            <div class="mem-group-list">${tripCards}</div>
            <div class="mem-export-bar" id="memExportBar">
                <label class="mem-select-all" onclick="TripsModule.toggleAllMem(this)">
                    <input type="checkbox" id="memSelectAll" checked>
                    <span class="mem-check-box"></span>
                    <span>全选</span>
                </label>
                <div class="mem-export-info">已选 <span id="memSelectedCount">${tripArr.length}</span> 个行程</div>
                <button class="mem-export-btn" onclick="TripsModule.exportSelectedMem()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    导出PDF
                </button>
            </div>`;

        this._memSelected = new Set(tripArr.map(t => t.id));
    },

    // 展开/折叠行程记忆分组
    toggleMemGroup(tripId) {
        const body = document.getElementById('memBody_' + tripId);
        if (!body) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        const group = body.closest('.mem-group');
        if (group) group.classList.toggle('expanded', isHidden);
    },

    // 更新选中状态
    updateMemSelection() {
        const checkboxes = document.querySelectorAll('.mem-checkbox');
        const selected = new Set();
        checkboxes.forEach(cb => { if (cb.checked) selected.add(cb.dataset.tripId); });
        this._memSelected = selected;
        const countEl = document.getElementById('memSelectedCount');
        if (countEl) countEl.textContent = selected.size;
        const selectAll = document.getElementById('memSelectAll');
        if (selectAll) selectAll.checked = selected.size === checkboxes.length;
    },

    // 全选/全不选
    toggleAllMem(label) {
        const cb = label.querySelector('input');
        // 延迟获取实际状态（因为onclick在 onchange 之前触发）
        setTimeout(() => {
            const checked = cb.checked;
            document.querySelectorAll('.mem-checkbox').forEach(c => { c.checked = checked; });
            this.updateMemSelection();
        }, 0);
    },

    // 导出选中的行程为PDF（打开预览编辑器）
    async exportSelectedMem() {
        const selectedIds = this._memSelected;
        if (!selectedIds || selectedIds.size === 0) {
            UiKit.toast('请至少选择一个行程', 'info');
            return;
        }
        // 校验特权
        if (typeof LevelSystem !== 'undefined' && !LevelSystem.requirePrivilege('pdf_export')) {
            return;
        }
        const trips = [];
        selectedIds.forEach(id => {
            const trip = AIMemory.getTrip(id);
            if (trip) trips.push(trip);
        });
        if (trips.length === 0) {
            UiKit.toast('选中的行程不存在', 'error');
            return;
        }
        if (typeof PdfPreview === 'undefined') {
            UiKit.toast('PDF预览模块未加载', 'error');
            return;
        }
        PdfPreview.open(trips);
    },

    openExportForTrip(tripId) {
        App.switchTab('trips');
        setTimeout(() => {
            this.switchTripTab(1);
            setTimeout(() => {
                const checkboxes = document.querySelectorAll('.mem-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = cb.dataset.tripId === tripId;
                });
                this.updateMemSelection();
                const tripCard = document.querySelector(`.mem-checkbox[data-trip-id="${tripId}"]`)?.closest('.mem-group');
                if (tripCard) {
                    tripCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        }, 100);
    },

    updateTripCounts(allCount, memoryCount) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('cntAll', allCount);
        set('cntMemory', memoryCount);
    },

    switchTripTab(idx) {
        this.currentTab = idx;
        document.querySelectorAll('.trip-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
        const track = document.getElementById('tripSwipeTrack');
        if (track) track.style.transform = `translateX(-${idx * 50}%)`;
        this.updateTripTabIndicator(idx);
    },

    initSwipe() {
        const swipe = document.getElementById('tripSwipe');
        if (!swipe || swipe.dataset.swipeInit === '1') return;
        swipe.dataset.swipeInit = '1';
        let startX = 0, startY = 0, isHorizontal = false;
        swipe.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isHorizontal = false;
        }, { passive: true });
        swipe.addEventListener('touchmove', (e) => {
            const dx = Math.abs(e.touches[0].clientX - startX);
            const dy = Math.abs(e.touches[0].clientY - startY);
            if (dx > dy && dx > 10) isHorizontal = true;
        }, { passive: true });
        swipe.addEventListener('touchend', (e) => {
            if (!isHorizontal) return;
            const dx = e.changedTouches[0].clientX - startX;
            const threshold = 50;
            const activeTab = document.querySelector('.trip-tab.active');
            const currentIdx = parseInt(activeTab?.dataset.idx || '0');
            if (dx > threshold && currentIdx > 0) {
                this.switchTripTab(currentIdx - 1);
            } else if (dx < -threshold && currentIdx < 1) {
                this.switchTripTab(currentIdx + 1);
            }
        }, { passive: true });
    },

    updateTripTabIndicator(idx) {
        const indicator = document.getElementById('tripTabIndicator');
        const tabs = document.querySelectorAll('.trip-tab');
        if (!indicator || !tabs[idx]) return;
        const tab = tabs[idx];
        const rect = tab.getBoundingClientRect();
        const parentRect = tab.parentElement.getBoundingClientRect();
        const w = 32;
        const left = rect.left - parentRect.left + rect.width / 2 - w / 2;
        indicator.style.left = left + 'px';
        indicator.style.width = w + 'px';
    },

    bindLongPress() {
        const cards = document.querySelectorAll('.trip-card');
        cards.forEach(card => {
            let pressTimer = null;
            let longPressTriggered = false;
            let isTouch = false;
            let startX = 0;
            let startY = 0;
            const MOVE_THRESHOLD = 10;

            const handleMove = (e) => {
                let clientX, clientY;
                if (e.type === 'touchmove') {
                    const touch = e.touches[0] || e.changedTouches[0];
                    clientX = touch.clientX;
                    clientY = touch.clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                const dx = clientX - startX;
                const dy = clientY - startY;
                const distance = Math.hypot(dx, dy);

                if (distance > MOVE_THRESHOLD) {
                    cancelPress();
                }
            };

            const startPress = (e) => {
                if (e.type === 'touchstart') {
                    isTouch = true;
                }
                if (isTouch && e.type === 'mousedown') {
                    return;
                }

                longPressTriggered = false;

                if (e.type === 'touchstart') {
                    const touch = e.touches[0];
                    startX = touch.clientX;
                    startY = touch.clientY;
                    card.addEventListener('touchmove', handleMove, { passive: true });
                } else {
                    startX = e.clientX;
                    startY = e.clientY;
                    document.addEventListener('mousemove', handleMove);
                }

                pressTimer = setTimeout(() => {
                    longPressTriggered = true;
                    card.classList.add('trip-card-longpress');
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }, 500);
            };

            const cancelPress = () => {
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                if (longPressTriggered) {
                    card.classList.remove('trip-card-longpress');
                    longPressTriggered = false;
                }
                document.removeEventListener('mousemove', handleMove);
                card.removeEventListener('touchmove', handleMove);
            };

            const endPress = async (e) => {
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }

                document.removeEventListener('mousemove', handleMove);
                card.removeEventListener('touchmove', handleMove);

                if (longPressTriggered) {
                    const tripId = card.dataset.tripId;
                    card.classList.remove('trip-card-longpress');
                    const trip = AIMemory.getTrip(tripId);
                    const tripTitle = trip?.title || trip?.destination || '此行程';

                    const actions = [
                        { text: '删除此行程', value: 'delete', danger: true },
                    ];

                    const choice = await UiKit.showActionSheet(actions, tripTitle);

                    if (choice === 'delete') {
                        const ok = await UiKit.confirm(`确定要删除「${tripTitle}」吗？删除后将移入回收站，保留7天。`, { title: '删除行程', confirmText: '删除', cancelText: '取消' });
                        if (ok) {
                            await AIMemory.deleteTrip(tripId);
                            TripsModule.renderTripCards();
                            UiKit.toast('已移入回收站', 'success');
                        }
                    }
                }
            };

            card.addEventListener('mousedown', startPress);
            card.addEventListener('touchstart', startPress, { passive: true });

            card.addEventListener('mouseup', endPress);
            card.addEventListener('mouseleave', cancelPress);
            card.addEventListener('touchend', endPress);
            card.addEventListener('touchcancel', cancelPress);

            card.addEventListener('click', (e) => {
                if (longPressTriggered) {
                    e.preventDefault();
                    e.stopPropagation();
                    longPressTriggered = false;
                }
            }, true);
        });
    },
};

const CommunityModule = {
    activeCat: 'all',
    searchQuery: '',

    render() {
        this.renderWaterfall();
        this.setupTabs();
    },

    /**
     * 打开发布选择器：选择发布行程或写游记
     */
    openPublishPicker() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录后发布', 'info');
            Auth.requireAuth();
            return;
        }

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="publish-picker-modal">
                <div class="publish-picker-title">选择发布方式</div>
                <div class="publish-picker-options">
                    <div class="publish-option" data-type="trip">
                        <div class="publish-option-icon publish-icon-trip">🗺️</div>
                        <div class="publish-option-info">
                            <div class="publish-option-title">发布行程</div>
                            <div class="publish-option-desc">分享你的行程规划，让更多人参考</div>
                        </div>
                        <div class="publish-option-arrow">›</div>
                    </div>
                    <div class="publish-option" data-type="note">
                        <div class="publish-option-icon publish-icon-note">✍️</div>
                        <div class="publish-option-info">
                            <div class="publish-option-title">写游记</div>
                            <div class="publish-option-desc">记录旅途中的精彩瞬间和感受</div>
                        </div>
                        <div class="publish-option-arrow">›</div>
                    </div>
                </div>
                <button class="publish-picker-cancel">取消</button>
            </div>`;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };

        mask.querySelector('.publish-picker-cancel').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        mask.querySelectorAll('.publish-option').forEach(opt => {
            opt.onclick = () => {
                const type = opt.dataset.type;
                close();
                setTimeout(() => {
                    if (type === 'trip') {
                        this.openPublishDialog();
                    } else if (type === 'note') {
                        if (typeof TravelNote !== 'undefined') {
                            TravelNote.publish();
                        } else {
                            UiKit.toast('游记模块未加载', 'error');
                        }
                    }
                }, 200);
            };
        });
    },

    /**
     * 打开发布弹窗：显示用户未发布的行程列表，选择后发布到社区
     */
    async openPublishDialog() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录后发布', 'info');
            Auth.requireAuth();
            return;
        }
        if (typeof TripStorage === 'undefined') {
            UiKit.toast('系统未就绪', 'error');
            return;
        }

        const user = Auth.getCurrentUser();
        UiKit.showLoading('加载行程...');
        const trips = await TripStorage.getUserTrips(user.id);
        UiKit.hideLoading();

        const unpublished = trips.filter(t => t.status !== 'published');

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:380px;max-height:80vh;display:flex;flex-direction:column;">
                <div class="ui-modal-title">发布行程到社区</div>
                <div class="ui-modal-body" style="overflow-y:auto;flex:1;padding:12px 16px;">
                    ${unpublished.length === 0 ? `
                        <div style="text-align:center;padding:30px 0;color:#999;">
                            <div style="font-size:36px;margin-bottom:8px;">📋</div>
                            <div>暂无可发布的行程</div>
                            <div style="font-size:12px;margin-top:4px;">所有行程已发布或还未创建</div>
                        </div>
                    ` : `
                        <div style="font-size:12px;color:#999;margin-bottom:8px;">选择要发布的行程（发布后可在社区被浏览）</div>
                        ${unpublished.map(t => `
                            <div class="publish-trip-item" data-cloud-id="${t.cloudId}" style="display:flex;align-items:center;padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;">
                                <div style="font-size:20px;margin-right:10px;">🗺️</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title || '未命名行程'}</div>
                                    <div style="font-size:12px;color:#999;margin-top:2px;">${t.destination || ''} · ${t.days || 1}天 · ${t.dayPlans?.length || 0}个景点</div>
                                </div>
                                <div style="color:#1989fa;font-size:13px;font-weight:600;">发布</div>
                            </div>
                        `).join('')}
                    `}
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-confirm" style="flex:1;">关闭</button>
                </div>
            </div>`;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));
        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        mask.querySelector('.ui-modal-confirm').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        // 绑定行程项点击
        mask.querySelectorAll('.publish-trip-item').forEach(item => {
            item.onclick = async () => {
                const cloudId = item.dataset.cloudId;
                close();
                UiKit.showLoading('发布中...');
                const result = await TripStorage.publishTrip(cloudId, user.id);
                UiKit.hideLoading();
                if (result.success) {
                    UiKit.toast('已发布到社区', 'success');
                    this.renderWaterfall(); // 刷新社区列表
                } else {
                    UiKit.toast(result.error || '发布失败', 'error');
                }
            };
        });
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.community-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeCat = tab.dataset.cat;
                if (this._cachedTemplates && this._cachedTemplates.length > 0) {
                    this._renderWaterfallContent();
                } else {
                    this.renderWaterfall();
                }
            };
        });
    },

    search(query) {
        this.searchQuery = (query || '').trim();
        if (this._cachedTemplates && this._cachedTemplates.length > 0) {
            this._renderWaterfallContent();
        } else {
            this.renderWaterfall();
        }
    },

    _renderWaterfallContent() {
        const container = document.getElementById('communityWaterfall');
        if (!container) return;

        let templates = [...(this._cachedTemplates || [])];

        if (this._showFavoritesOnly) {
            templates = templates.filter(t => {
                const key = `${t.isNote ? 'note' : 'template'}_${t.isCloud ? t.cloudId : t.id}`;
                return !!this._favCache[key];
            });
        }

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase()
            templates = templates.filter(t =>
                (t.destination || '').toLowerCase().includes(q) ||
                (t.title || '').toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
            )
        }

        if (this.activeCat !== 'all') {
            templates = this._filterByCategory(templates, this.activeCat);
        }

        templates.sort((a, b) => {
            const scoreA = (a.likes || 0) + (a.votes || 0) * 2;
            const scoreB = (b.likes || 0) + (b.votes || 0) * 2;
            return scoreB - scoreA;
        });

        const heights = [210, 250, 230, 270, 240, 290]
        const coverBgs = [
          'linear-gradient(135deg, #FFB84D 0%, #FF9500 100%)',
          'linear-gradient(135deg, #A8E0FF 0%, #7B68EE 100%)',
          'linear-gradient(135deg, #FFD6A5 0%, #FFADAD 100%)',
          'linear-gradient(135deg, #caffbf 0%, #9bf6ff 100%)',
          'linear-gradient(135deg, #FFC8DD 0%, #BDB2FF 100%)',
          'linear-gradient(135deg, #FDFFB6 0%, #FFB7D5 100%)',
        ]
        if (templates.length === 0) {
            const isSearch = !!this.searchQuery;
            const isCatFilter = this.activeCat !== 'all';
            let emptyTitle = '没有找到相关内容';
            let emptyDesc = '换个关键词试试，或浏览全部推荐';
            let emptyIcon = '🔍';
            let emptyBtnText = '查看全部推荐';
            let emptyBtnAction = 'CommunityModule._resetFilters()';
            if (isCatFilter && !isSearch) {
                emptyTitle = '该分类下暂无内容';
                emptyDesc = '去发现更多精彩内容，或成为第一个发布者';
                emptyIcon = '📭';
            }
            if (!isSearch && !isCatFilter) {
                emptyTitle = '还没有任何内容';
                emptyDesc = '快来发布你的第一篇行程或游记吧';
                emptyIcon = '✨';
                emptyBtnText = '去发布';
                emptyBtnAction = 'document.querySelector(\'.sv-publish-btn\')?.click()';
            }
            container.innerHTML = `
                <div class="empty-state-block">
                    <div class="empty-state-icon">${emptyIcon}</div>
                    <div class="empty-state-title">${emptyTitle}</div>
                    <div class="empty-state-desc">${emptyDesc}</div>
                    <button class="empty-state-btn" onclick="${emptyBtnAction}">${emptyBtnText}</button>
                </div>
            `
            return
        }

        container.innerHTML = templates.map((t, i) => {
            const h = heights[i % heights.length]
            const bg = coverBgs[i % coverBgs.length]
            const tag = (t.tags && t.tags[0]) ? t.tags[0] : ''
            let clickHandler
            if (t.isNote) {
                clickHandler = `TravelNote.view('${t.cloudId}')`
            } else if (t.isCloud && t.cloudId) {
                clickHandler = `App.openCloudTrip('${t.cloudId}')`
            } else {
                clickHandler = `App.useTemplate('${t.id}')`
            }
            const avatarHtml = t.avatar && t.avatar.startsWith('http')
                ? `<img src="${t.avatar}" style="width:20px;height:20px;border-radius:50%;">`
                : `<span class="avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>`
            const authorClick = t.authorId
                ? `event.stopPropagation();AuthorSpace.open('${t.authorId}')`
                : ''
            const likeClick = `event.stopPropagation();CommunityModule.toggleLike('${t.isCloud ? t.cloudId : t.id}', ${t.isCloud ? 'true' : 'false'}, this)`
            const cardClass = t.isNote ? 'community-card note-card' : 'community-card'
            const tagHtml = t.isNote
                ? `<div class="community-card-tag note-tag">游记</div>`
                : (tag ? `<div class="community-card-tag">${tag}</div>` : '')
            const countIcon = t.isNote
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
            let coverImageUrl = ''
            if (t.coverImage) {
                coverImageUrl = t.coverImage
            } else if (t.destination || t.city) {
                const dest = t.destination || t.city || ''
                const destSeedMap = {
                    '杭州': 'hangzhou-west-lake',
                    '上海': 'shanghai-skyline',
                    '成都': 'chengdu-panda',
                    '西安': 'xian-terracotta',
                }
                let seed = 'travel-scenery'
                for (const [city, citySeed] of Object.entries(destSeedMap)) {
                    if (dest.includes(city)) {
                        seed = citySeed
                        break
                    }
                }
                coverImageUrl = `https://picsum.photos/seed/${seed}/400/600`
            } else {
                coverImageUrl = `https://picsum.photos/seed/trip-${i}/400/600`
            }
            const coverBgStyle = coverImageUrl
                ? `height:${h}px;background-image:url('${coverImageUrl}');background-size:cover;background-position:center;`
                : `height:${h}px;background:${bg}`
            const daysText = t.isNote ? '图文游记' : `${t.days || 1}天 ${t.budget ? '· ' + t.budget : ''}`
            const contentTags = (t.customTags || []).slice(0, 2)
            const contentTagsHtml = contentTags.length > 0
                ? `<div class="community-card-tags">${contentTags.map(tag => `<span class="cc-tag">#${tag}</span>`).join('')}</div>`
                : ''
            const authorTag = (t.authorTags || [])[0]
            const authorTagBadge = authorTag
                ? `<span class="community-author-badge">${authorTag}</span>`
                : ''
            const collectBtnHtml = (t.isCloud && t.cloudId)
                ? `<div class="community-card-collect" onclick="event.stopPropagation();(typeof AdvancedPrivileges!=='undefined'?AdvancedPrivileges.addToCollection('${t.cloudId}','${t.isNote ? 'note' : 'template'}'):UiKit.toast('特权模块未加载','error'))" title="加入我的专题合集"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>`
                : ''
            const cacheKey = `${t.isNote ? 'note' : 'template'}_${t.isCloud ? t.cloudId : t.id}`;
            const isFav = this._favCache?.[cacheKey] || false;
            const isLiked = this._isLiked(t.isCloud ? t.cloudId : t.id);
            return `
                <div class="${cardClass}" onclick="${clickHandler}" style="animation-delay:${i * 0.04}s">
                    <div class="community-card-cover" style="${coverBgStyle}">
                        <div class="community-card-cover-mask"></div>
                        <div class="community-card-copy-badge">${countIcon} ${t.copies || 0}</div>
                        <div class="community-card-cover-info">
                            <div class="cci-dest">${t.destination || t.city || ''}</div>
                            <div class="cci-days">${daysText}</div>
                        </div>
                        ${tagHtml}
                    </div>
                    <div class="community-card-body">
                        <div class="community-card-title-row">
                            <div class="community-card-title">${t.title}</div>
                            ${collectBtnHtml}
                        </div>
                        ${contentTagsHtml}
                        <div class="community-card-meta">
                            <div class="community-card-author" onclick="${authorClick}" style="cursor:pointer;">
                                ${avatarHtml}
                                <span class="community-author-name">${t.author || '旅行者'}</span>
                                ${authorTagBadge}
                            </div>
                            <div class="community-card-actions">
                                <div class="cc-action ${isFav ? 'faved' : ''}" onclick="event.stopPropagation();CommunityModule.toggleFav('${t.isCloud ? t.cloudId : t.id}', '${t.isNote ? 'note' : 'template'}', this, ${t.isCloud ? 'true' : 'false'})" title="收藏">
                                    <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                </div>
                                <div class="cc-action ${isLiked ? 'liked' : ''}" onclick="${likeClick}" title="点赞">
                                    <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                    <span class="action-count">${t.likes || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`
        }).join('')
    },

    async renderWaterfall() {
        const container = document.getElementById('communityWaterfall');
        if (!container) return;

        // 先显示加载态
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#999;">加载中...</div>';

        // 从 Supabase 加载已发布的行程
        let cloudTrips = [];
        if (typeof TripStorage !== 'undefined' && window.supabase) {
            try {
                const { data, error } = await supabase
                    .from('trip_templates')
                    .select('id, title, destination, city, days, budget, day_plans, suitable_for, custom_tags, likes, favorites, copies, created_at, author_id')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(50)
                if (!error && data) {
                    // 获取作者信息（含作者专属标签）
                    const authorIds = [...new Set(data.map(t => t.author_id))]
                    const { data: authors } = await supabase
                        .from('profiles')
                        .select('id, username, avatar_url, custom_tags')
                        .in('id', authorIds)
                    const authorMap = {}
                    ;(authors || []).forEach(a => { authorMap[a.id] = a })

                    cloudTrips = data.map(t => ({
                        cloudId: t.id,
                        title: t.title,
                        destination: t.destination || t.city || '',
                        city: t.city || '',
                        days: t.days || 1,
                        budget: t.budget || '',
                        dayPlans: t.day_plans || [],
                        tags: t.suitable_for || [],
                        customTags: t.custom_tags || [],
                        authorTags: authorMap[t.author_id]?.custom_tags || [],
                        likes: t.likes || 0,
                        favorites: t.favorites || 0,
                        copies: t.copies || 0,
                        authorId: t.author_id,
                        author: authorMap[t.author_id]?.username || '旅行者',
                        avatar: authorMap[t.author_id]?.avatar_url || '🧳',
                        isCloud: true,
                    }))
                }
            } catch (e) {
                console.warn('[Community] 加载云端行程失败:', e)
            }
        }

        // 合并种子模板（本地示例数据，不关联作者，避免与数据库数据不一致）
        let seedTemplates = AIMemory.getCommunityTemplates() || []
        seedTemplates = seedTemplates.map((t, i) => ({
          ...t,
          isCloud: false,
          authorId: '',       // 种子模板不设置作者ID，作者区域不可点击
          author: t.author || '旅行达人', // 保留作者名作为展示
          avatar: t.avatar || '🧳',
          authorTags: [],
          cloudId: null,
        }))

        // 加载云端游记
        let cloudNotes = [];
        if (typeof TravelNote !== 'undefined' && window.supabase) {
            try {
                cloudNotes = await TravelNote.getList({ limit: 20 });
                cloudNotes = cloudNotes.map(n => ({
                    ...n,
                    isNote: true,
                    isCloud: true,
                    cloudId: n.id,
                    title: n.title,
                    destination: n.destination || '',
                    days: '',
                    budget: '',
                    cover: n.cover_emoji || '✍️',
                    coverImage: n.cover_image,
                    likes: n.likes || 0,
                    copies: n.views || 0, // 游记用浏览数代替复制数显示
                    tags: ['游记'],
                    customTags: n.custom_tags || [],
                    authorTags: (n.profiles && n.profiles.custom_tags) || [],
                    authorId: n.author_id,
                    author: (n.profiles && n.profiles.username) || '旅行者',
                    avatar: (n.profiles && n.profiles.avatar_url) || '🧳',
                }));
            } catch (e) {
                console.warn('[Community] 加载游记失败:', e);
            }
        }

        let templates = [...cloudTrips, ...cloudNotes, ...seedTemplates]

        // Phase 5.1：批量加载投票数
        if (typeof Voting !== 'undefined' && window.supabase) {
            try {
                const cloudIds = templates.filter(t => t.isCloud && t.cloudId).map(t => t.cloudId);
                if (cloudIds.length > 0) {
                    // 查询所有相关投票
                    const { data: voteData } = await supabase
                        .from('votes')
                        .select('target_id, vote_count')
                        .in('target_id', cloudIds);
                    const voteMap = {};
                    (voteData || []).forEach(v => {
                        voteMap[v.target_id] = (voteMap[v.target_id] || 0) + (v.vote_count || 0);
                    });
                    templates.forEach(t => {
                        if (t.isCloud && t.cloudId) t.votes = voteMap[t.cloudId] || 0;
                        else t.votes = 0;
                    });
                } else {
                    templates.forEach(t => { t.votes = 0; });
                }
            } catch (e) {
                templates.forEach(t => { t.votes = 0; });
            }
        } else {
            templates.forEach(t => { t.votes = 0; });
        }

        let allTemplates = templates;

        // 搜索筛选
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase()
            templates = templates.filter(t =>
                (t.destination || '').toLowerCase().includes(q) ||
                (t.title || '').toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
            )
        }

        // 分类筛选 - 多维度匹配：标签、标题、描述、景点类型
        if (this.activeCat !== 'all') {
            templates = this._filterByCategory(templates, this.activeCat);
        }

        this._cachedTemplates = allTemplates;

        templates.sort((a, b) => {
            const scoreA = (a.likes || 0) + (a.votes || 0) * 2;
            const scoreB = (b.likes || 0) + (b.votes || 0) * 2;
            return scoreB - scoreA;
        });

        const heights = [210, 250, 230, 270, 240, 290]
        const coverBgs = [
          'linear-gradient(135deg, #FFB84D 0%, #FF9500 100%)',
          'linear-gradient(135deg, #A8E0FF 0%, #7B68EE 100%)',
          'linear-gradient(135deg, #FFD6A5 0%, #FFADAD 100%)',
          'linear-gradient(135deg, #caffbf 0%, #9bf6ff 100%)',
          'linear-gradient(135deg, #FFC8DD 0%, #BDB2FF 100%)',
          'linear-gradient(135deg, #FDFFB6 0%, #FFB7D5 100%)',
        ]
        if (templates.length === 0) {
            const isSearch = !!this.searchQuery;
            const isCatFilter = this.activeCat !== 'all';
            let emptyTitle = '没有找到相关内容';
            let emptyDesc = '换个关键词试试，或浏览全部推荐';
            let emptyIcon = '🔍';
            let emptyBtnText = '查看全部推荐';
            let emptyBtnAction = 'CommunityModule._resetFilters()';
            if (isCatFilter && !isSearch) {
                emptyTitle = '该分类下暂无内容';
                emptyDesc = '去发现更多精彩内容，或成为第一个发布者';
                emptyIcon = '📭';
            }
            if (!isSearch && !isCatFilter) {
                emptyTitle = '还没有任何内容';
                emptyDesc = '快来发布你的第一篇行程或游记吧';
                emptyIcon = '✨';
                emptyBtnText = '去发布';
                emptyBtnAction = 'document.querySelector(\'.sv-publish-btn\')?.click()';
            }
            container.innerHTML = `
                <div class="empty-state-block">
                    <div class="empty-state-icon">${emptyIcon}</div>
                    <div class="empty-state-title">${emptyTitle}</div>
                    <div class="empty-state-desc">${emptyDesc}</div>
                    <button class="empty-state-btn" onclick="${emptyBtnAction}">${emptyBtnText}</button>
                </div>
            `
            return
        }

        container.innerHTML = templates.map((t, i) => {
            const h = heights[i % heights.length]
            const bg = coverBgs[i % coverBgs.length]
            const tag = (t.tags && t.tags[0]) ? t.tags[0] : ''
            // 点击处理：游记 → TravelNote.view，云端行程 → openCloudTrip，种子 → useTemplate
            let clickHandler
            if (t.isNote) {
                clickHandler = `TravelNote.view('${t.cloudId}')`
            } else if (t.isCloud && t.cloudId) {
                clickHandler = `App.openCloudTrip('${t.cloudId}')`
            } else {
                clickHandler = `App.useTemplate('${t.id}')`
            }
            const avatarHtml = t.avatar && t.avatar.startsWith('http')
                ? `<img src="${t.avatar}" style="width:20px;height:20px;border-radius:50%;">`
                : `<span class="avatar">${t.avatar || '🧳'}</span>`
            // 作者区域点击：所有卡片都可点击进入作者空间
            const authorClick = t.authorId
                ? `event.stopPropagation();AuthorSpace.open('${t.authorId}')`
                : ''
            // 点赞区域点击
            const likeClick = `event.stopPropagation();CommunityModule.toggleLike('${t.isCloud ? t.cloudId : t.id}', ${t.isCloud ? 'true' : 'false'}, this)`
            // Phase 5.1：投票按钮（仅云端内容可投票）
            const voteClick = t.isCloud && t.cloudId
                ? `event.stopPropagation();Voting.openVoteDialog('${t.cloudId}', '${t.isNote ? 'note' : 'template'}', '${(t.title || '').replace(/'/g, "\\'")}')`
                : `event.stopPropagation();UiKit.toast('该内容暂不支持投票', 'info')`
            // 游记卡片特殊样式
            const cardClass = t.isNote ? 'community-card note-card' : 'community-card'
            // 游记：左上角"游记"标签；行程：普通标签
            const tagHtml = t.isNote
                ? `<div class="community-card-tag note-tag">游记</div>`
                : (tag ? `<div class="community-card-tag">${tag}</div>` : '')
            // 游记显示浏览数，行程显示套用数
            const countIcon = t.isNote
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
            // 生成封面图：优先用已有封面图，否则根据目的地生成真实图片
            let coverImageUrl = ''
            if (t.coverImage) {
                coverImageUrl = t.coverImage
            } else if (t.destination || t.city) {
                const dest = t.destination || t.city || ''
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
                }
                let seed = 'travel-scenery'
                for (const [city, citySeed] of Object.entries(destSeedMap)) {
                    if (dest.includes(city)) {
                        seed = citySeed
                        break
                    }
                }
                coverImageUrl = `https://picsum.photos/seed/${seed}/400/600`
            } else {
                coverImageUrl = `https://picsum.photos/seed/trip-${i}/400/600`
            }
            const coverBgStyle = coverImageUrl
                ? `height:${h}px;background-image:url('${coverImageUrl}');background-size:cover;background-position:center;`
                : `height:${h}px;background:${bg}`
            const daysText = t.isNote ? '图文游记' : `${t.days || 1}天 ${t.budget ? '· ' + t.budget : ''}`
            // Phase 5.5：内容专属标签 chips（最多展示 2 个，避免溢出）
            const contentTags = (t.customTags || []).slice(0, 2)
            const contentTagsHtml = contentTags.length > 0
                ? `<div class="community-card-tags">${contentTags.map(tag => `<span class="cc-tag">#${tag}</span>`).join('')}</div>`
                : ''
            // Phase 5.5：作者代表标签（取第一个，作为身份标识展示）
            const authorTag = (t.authorTags || [])[0]
            const authorTagBadge = authorTag
                ? `<span class="community-author-badge">${authorTag}</span>`
                : ''
            // Phase 5.5：加入合集按钮（仅云端内容显示，Lv9 特权；按钮内部做特权校验）
            const collectBtnHtml = (t.isCloud && t.cloudId)
                ? `<div class="community-card-collect" onclick="event.stopPropagation();(typeof AdvancedPrivileges!=='undefined'?AdvancedPrivileges.addToCollection('${t.cloudId}','${t.isNote ? 'note' : 'template'}'):UiKit.toast('特权模块未加载','error'))" title="加入我的专题合集"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>`
                : ''
            const cacheKey = `${t.isNote ? 'note' : 'template'}_${t.isCloud ? t.cloudId : t.id}`;
            const isFav = this._favCache?.[cacheKey] || false;
            const isLiked = this._isLiked(t.isCloud ? t.cloudId : t.id);
            return `
                <div class="${cardClass}" onclick="${clickHandler}" style="animation-delay:${i * 0.04}s">
                    <div class="community-card-cover" style="${coverBgStyle}">
                        <div class="community-card-cover-mask"></div>
                        <div class="community-card-copy-badge">${countIcon} ${t.copies || 0}</div>
                        <div class="community-card-cover-info">
                            <div class="cci-dest">${t.destination || t.city || ''}</div>
                            <div class="cci-days">${daysText}</div>
                        </div>
                        ${tagHtml}
                    </div>
                    <div class="community-card-body">
                        <div class="community-card-title-row">
                            <div class="community-card-title">${t.title}</div>
                            ${collectBtnHtml}
                        </div>
                        ${contentTagsHtml}
                        <div class="community-card-meta">
                            <div class="community-card-author" onclick="${authorClick}" style="cursor:pointer;">
                                ${avatarHtml}
                                <span class="community-author-name">${t.author || '旅行者'}</span>
                                ${authorTagBadge}
                            </div>
                            <div class="community-card-actions">
                                <div class="cc-action" onclick="${voteClick}" title="投票">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M9 5v14"/><path d="M15 5v14"/></svg>
                                </div>
                                <div class="cc-action ${isFav ? 'faved' : ''}" onclick="event.stopPropagation();CommunityModule.toggleFav('${t.isCloud ? t.cloudId : t.id}', '${t.isNote ? 'note' : 'template'}', this, ${t.isCloud ? 'true' : 'false'})" title="收藏">
                                    <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                </div>
                                <div class="cc-action ${isLiked ? 'liked' : ''}" onclick="${likeClick}" title="点赞">
                                    <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                    <span class="action-count">${t.likes || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        }).join('')
    },

    _cachedTemplates: [],
    _favCache: {},
    _favLoading: new Set(),

    async initFavCache() {
        this._favCache = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('fav_')) {
                    this._favCache[key.substring(4)] = true;
                }
            }
        } catch(e) {}

        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            return;
        }
        const user = Auth.getCurrentUser();
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('target_id, target_type')
                .eq('user_id', user.id)
                .in('target_type', ['template', 'note', 'location']);
            if (!error && data) {
                data.forEach(f => {
                    this._favCache[`${f.target_type}_${f.target_id}`] = true;
                });
            }
        } catch (e) {
            console.warn('[Community] 初始化收藏缓存失败:', e);
        }
    },

    async toggleFav(targetId, targetType, btnEl, isCloud) {
        const cacheKey = `${targetType}_${targetId}`;
        if (this._favLoading.has(cacheKey)) return;

        const svgEl = btnEl.querySelector('svg');
        const isCurrentlyFav = btnEl.classList.contains('active') || btnEl.classList.contains('faved');

        const triggerPopAnim = () => {
            btnEl.classList.remove('pop');
            void btnEl.offsetWidth;
            btnEl.classList.add('pop');
            setTimeout(() => btnEl.classList.remove('pop'), 500);
        };

        const newFav = !isCurrentlyFav;
        if (newFav) {
            if (svgEl) svgEl.setAttribute('fill', 'currentColor');
            btnEl.classList.add('active', 'faved');
            this._favCache[cacheKey] = true;
            try { localStorage.setItem('fav_' + cacheKey, '1'); } catch(e) {}
        } else {
            if (svgEl) svgEl.setAttribute('fill', 'none');
            btnEl.classList.remove('active', 'faved');
            delete this._favCache[cacheKey];
            try { localStorage.removeItem('fav_' + cacheKey); } catch(e) {}
        }
        triggerPopAnim();

        const isLoggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();
        if (!isLoggedIn) {
            if (typeof UiKit !== 'undefined') {
                UiKit.toast(newFav ? '收藏成功（本地保存，登录后可同步）' : '已取消收藏（本地）', newFav ? 'success' : 'info');
            }
            return;
        }

        this._favLoading.add(cacheKey);
        const user = Auth.getCurrentUser();

        try {
            if (newFav) {
                const extra = {};
                if (this._cachedTemplates) {
                    const tpl = this._cachedTemplates.find(t => {
                        if (targetType === 'template') return (t.isCloud ? t.cloudId : t.id) === targetId;
                        if (targetType === 'note') return t.cloudId === targetId && t.isNote;
                        return false;
                    });
                    if (tpl) {
                        extra.title = tpl.title;
                        extra.destination = tpl.destination;
                        extra.cover = tpl.cover;
                        extra.coverImage = tpl.coverImage;
                    }
                }
                await supabase.from('favorites').insert({
                    user_id: user.id,
                    target_id: targetId,
                    target_type: targetType,
                    extra: extra
                });
                if (typeof UiKit !== 'undefined') UiKit.toast('收藏成功', 'success');
            } else {
                await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('target_id', targetId)
                    .eq('target_type', targetType);
                if (typeof UiKit !== 'undefined') UiKit.toast('已取消收藏', 'info');
            }
            if (typeof PointsCore !== 'undefined' && typeof PointsCore.trigger === 'function' && newFav) {
                try { PointsCore.trigger('favorite').catch(() => {}); } catch(e) {}
            }
        } catch (e) {
            console.error('[Community] 收藏同步云端失败:', e);
        } finally {
            this._favLoading.delete(cacheKey);
        }
    },

    async toggleLike(targetId, isCloud, btnEl) {
        const cacheKey = `like_template_${targetId}`;
        if (this._likeLoading?.has(cacheKey)) return;
        if (!this._likeLoading) this._likeLoading = new Set();

        const countEl = btnEl.querySelector('.like-count, .action-count');
        const currentCount = parseInt(countEl?.textContent || '0', 10);
        const isCurrentlyLiked = btnEl.classList.contains('liked');

        const triggerPopAnim = () => {
            btnEl.classList.remove('pop');
            void btnEl.offsetWidth;
            btnEl.classList.add('pop');
            setTimeout(() => btnEl.classList.remove('pop'), 400);
        };

        const newLiked = !isCurrentlyLiked;
        const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

        if (newLiked) {
            btnEl.classList.add('liked');
            try { localStorage.setItem('like_' + cacheKey, '1'); } catch(e) {}
        } else {
            btnEl.classList.remove('liked');
            try { localStorage.removeItem('like_' + cacheKey); } catch(e) {}
        }
        if (countEl) countEl.textContent = newCount;
        triggerPopAnim();

        const isLoggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();
        if (!isLoggedIn) {
            if (typeof UiKit !== 'undefined') {
                UiKit.toast(newLiked ? '点赞成功（本地保存，登录后可同步）' : '已取消点赞（本地）', newLiked ? 'success' : 'info');
            }
            return;
        }

        this._likeLoading.add(cacheKey);
        try {
            if (typeof App !== 'undefined' && typeof App.toggleLike === 'function') {
                await App.toggleLike(targetId, isCloud, btnEl);
            }
        } catch (e) {
            console.error('[Community] 点赞同步云端失败:', e);
        } finally {
            this._likeLoading.delete(cacheKey);
        }
    },

    _isLiked(targetId) {
        const cacheKey = `like_template_${targetId}`;
        try {
            return localStorage.getItem('like_' + cacheKey) === '1';
        } catch(e) {
            return false;
        }
    },

    toggleFavFilter() {
        const favTab = document.querySelector('.community-tab-fav');
        const allTabs = document.querySelectorAll('.community-tab[data-cat]:not(.community-tab-fav)');

        if (this._showFavoritesOnly) {
            this._showFavoritesOnly = false;
            favTab?.classList.remove('active');
            allTabs.forEach(t => {
                if (t.dataset.cat === (this.activeCat || 'all')) {
                    t.classList.add('active');
                }
            });
        } else {
            this._showFavoritesOnly = true;
            favTab?.classList.add('active');
            allTabs.forEach(t => t.classList.remove('active'));
        }
        this._renderWaterfallContent();
    },

    _filterByCategory(templates, cat) {
        const categoryConfig = {
            food: {
                keywords: ['美食', '吃货', '吃', '餐厅', '火锅', '小吃', '餐饮'],
                spotTypes: ['美食', '餐饮', '美食街'],
                synonymTags: ['吃货', '美食家', '探店']
            },
            nature: {
                keywords: ['自然', '风景', '山水', '森林', '草原', '海边', '湖泊', '山', '公园'],
                spotTypes: ['自然', '景点', '公园', '山川'],
                synonymTags: ['自然风光', '户外', '徒步']
            },
            photo: {
                keywords: ['拍照', '摄影', '出片', '网红', '打卡', '拍照圣地'],
                spotTypes: [],
                synonymTags: ['摄影', '网红打卡', '出片地']
            },
            citywalk: {
                keywords: ['citywalk', 'city walk', '漫步', '散步', '逛街', 'city', 'walk'],
                spotTypes: ['景点', '街区'],
                synonymTags: ['城市漫步', '扫街', '闲逛']
            },
            niche: {
                keywords: ['小众', '秘境', '冷门', '私藏', '人少'],
                spotTypes: [],
                synonymTags: ['小众秘境', '冷门景点', '私藏']
            },
            family: {
                keywords: ['亲子', '家庭', '带娃', '孩子', '儿童', '爸妈', '全家'],
                spotTypes: [],
                synonymTags: ['亲子游', '家庭游', '带娃旅行']
            }
        };

        const config = categoryConfig[cat];
        if (!config) return templates;

        const allKeywords = [...config.keywords, ...config.synonymTags].map(k => k.toLowerCase());

        return templates.filter(t => {
            const allTags = [
                ...(t.tags || []),
                ...(t.customTags || []),
                ...(t.authorTags || []),
                ...(t.suitableFor || [])
            ].map(tag => tag.toLowerCase());

            const tagMatch = allTags.some(tag =>
                allKeywords.some(kw => tag.includes(kw))
            );

            const titleMatch = allKeywords.some(kw =>
                (t.title || '').toLowerCase().includes(kw)
            );

            const descMatch = allKeywords.some(kw =>
                (t.description || '').toLowerCase().includes(kw)
            );

            let spotTypeMatch = false;
            if (config.spotTypes.length > 0 && t.dayPlans) {
                for (const dp of t.dayPlans) {
                    for (const spot of (dp.spots || [])) {
                        const spotType = (spot.type || '').toLowerCase();
                        if (config.spotTypes.some(st => spotType.includes(st.toLowerCase()))) {
                            spotTypeMatch = true;
                            break;
                        }
                    }
                    if (spotTypeMatch) break;
                }
            }

            return tagMatch || titleMatch || descMatch || spotTypeMatch;
        });
    },

    _resetFilters() {
        this.activeCat = 'all';
        this.searchQuery = '';
        const tabs = document.querySelectorAll('.community-tab');
        tabs.forEach(t => t.classList.remove('active'));
        if (tabs[0]) tabs[0].classList.add('active');
        const searchInput = document.getElementById('communitySearchInput');
        if (searchInput) searchInput.value = '';
        if (this._cachedTemplates && this._cachedTemplates.length > 0) {
            this._renderWaterfallContent();
        } else {
            this.renderWaterfall();
        }
    },
};

// 短视频式沉浸浏览 - 深度技术增强版
const ShortVideoModule = {
    _templates: [],
    _allItems: [],
    _index: 0,
    _currentTab: 'recommend',
    _likedSet: new Set(),
    _followedUsers: new Set(),
    _communityScrollTop: 0,
    _loadFailed: false,
    _isLoading: false,
    _hasMore: true,
    _page: 1,

    _SECURITY_SALT: 'sv_salt_2026_wa_trip',
    _ACTION_THROTTLE_MS: 300,
    _actionTimestamps: new Map(),
    _backupQueue: [],
    _exposureObserver: null,
    _exposureRecords: new Map(),
    _gestureState: 'IDLE',
    _gestureStartX: 0,
    _gestureStartY: 0,
    _gestureStartTime: 0,
    _lastTapTime: 0,
    _lastTapX: 0,
    _lastTapY: 0,
    _heightCache: new Map(),
    _viewedIds: new Set(),
    _browseProgress: null,
    _eventListeners: [],
    _isDestroyed: false,
    _perfMonitor: {
        openTime: 0,
        slideCount: 0,
        errorCount: 0,
    },

    async open() {
        try {
            const overlay = document.getElementById('shortVideoOverlay');
            if (!overlay) {
                this._reportError('open_no_overlay', '找不到沉浸刷容器');
                return;
            }

            this._isDestroyed = false;
            this._perfMonitor = { openTime: Date.now(), slideCount: 0, errorCount: 0 };

            const communityScroll = document.querySelector('#communityPage .page-scroll');
            if (communityScroll) {
                this._communityScrollTop = communityScroll.scrollTop;
            }

            if (this._allItems.length > 0 && overlay.classList.contains('show')) {
                overlay.classList.add('show');
                this._resumeBrowse();
                return;
            }

            overlay.classList.add('show');
            this._showSkeleton();

            let items = [];
            this._loadFailed = false;

            if (typeof AIMemory !== 'undefined') {
                try {
                    const templates = AIMemory.getCommunityTemplates() || [];
                    const validTemplates = templates.filter(t => this._validateItem(t));
                    items = items.concat(validTemplates.map(t => ({ ...t, _source: 'template' })));
                } catch (e) {
                    this._reportError('aimemory_load_fail', e.message);
                }
            }

            if (typeof CommunityModule !== 'undefined' && CommunityModule._cachedTemplates) {
                try {
                    CommunityModule._cachedTemplates.forEach(t => {
                        if (this._validateItem(t) && !items.find(i => i.id === t.id)) {
                            items.push({ ...t, _source: 'community' });
                        }
                    });
                } catch (e) {
                    this._reportError('community_cache_fail', e.message);
                }
            }

            if (typeof CommunityModule !== 'undefined') {
                try {
                    const communityLiked = CommunityModule._likedSet || new Set();
                    communityLiked.forEach(id => this._likedSet.add(id));
                } catch (e) {}
            }

            if (typeof TravelNote !== 'undefined' && window.supabase) {
                try {
                    const notes = await TravelNote.getList({ limit: 20 });
                    const noteItems = (notes || [])
                        .filter(n => n && n.id)
                        .map(n => ({
                            ...n,
                            isNote: true,
                            isCloud: true,
                            cloudId: n.id,
                            id: 'note_' + n.id,
                            title: this._safeStr(n.title, 100),
                            destination: this._safeStr(n.destination || '', 50),
                            days: '',
                            budget: '',
                            cover: n.cover_emoji || '✍️',
                            coverImage: this._safeUrl(n.cover_image),
                            likes: Math.max(0, parseInt(n.likes) || 0),
                            copies: Math.max(0, parseInt(n.views) || 0),
                            tags: ['游记'],
                            customTags: Array.isArray(n.custom_tags) ? n.custom_tags.slice(0, 10) : [],
                            authorTags: (n.profiles && Array.isArray(n.profiles.custom_tags)) ? n.profiles.custom_tags : [],
                            authorId: n.author_id || '',
                            author: this._safeStr((n.profiles && n.profiles.username) || '旅行者', 20),
                            avatar: this._safeStr((n.profiles && n.profiles.avatar_url) || '🧳', 200),
                            content: this._safeStr(n.content || '', 5000),
                            _source: 'note',
                        }));
                    items = items.concat(noteItems);
                } catch (e) {
                    console.warn('[ShortVideo] 加载游记失败:', e);
                    this._loadFailed = true;
                    this._reportError('note_load_fail', e.message);
                }
            }

            try {
                const savedFollowed = this._decodeData(localStorage.getItem('sv_followed'));
                if (Array.isArray(savedFollowed)) {
                    savedFollowed.forEach(id => {
                        if (typeof id === 'string' && id.length < 100) {
                            this._followedUsers.add(id);
                        }
                    });
                }
            } catch (e) {}

            try {
                const savedViewed = this._decodeData(localStorage.getItem('sv_viewed'));
                if (Array.isArray(savedViewed)) {
                    savedViewed.slice(-200).forEach(id => {
                        if (typeof id === 'string') this._viewedIds.add(id);
                    });
                }
            } catch (e) {}

            try {
                this._browseProgress = JSON.parse(localStorage.getItem('sv_progress') || 'null');
            } catch (e) {}

            items = this._smartSort(items);
            this._allItems = items;
            this._page = 1;
            this._hasMore = items.length >= 15;

            this._currentTab = 'recommend';
            this._switchTabUI();

            if (items.length === 0) {
                this._showEmptyState('no-content');
                return;
            }

            this._templates = items;
            this._renderFeed();

            let startIdx = 0;
            if (this._browseProgress && this._browseProgress.tab === this._currentTab) {
                const savedIdx = parseInt(this._browseProgress.idx) || 0;
                if (savedIdx >= 0 && savedIdx < items.length) {
                    startIdx = savedIdx;
                }
            }
            this._index = startIdx;

            this._setupGestureHandlers();
            this._setupExposureObserver();

            requestAnimationFrame(() => {
                const feed = document.getElementById('svFeed');
                if (feed && startIdx > 0) {
                    feed.scrollTop = startIdx * feed.clientHeight;
                }
                this._updateProgress();
            });

            if (this._loadFailed) {
                this._showNetworkTip();
            }

            const hint = document.getElementById('svHint');
            if (hint) {
                hint.style.opacity = '1';
                clearTimeout(this._hintTimer);
                this._hintTimer = setTimeout(() => { hint.style.opacity = '0'; }, 2200);
            }
        } catch (e) {
            console.error('[ShortVideo] open 异常:', e);
            this._reportError('open_crash', e.message);
            if (typeof UIRender !== 'undefined') {
                UIRender.showToast('加载失败，请重试');
            }
        }
    },

    switchTab(tab) {
        if (this._currentTab === tab) return;
        this._currentTab = tab;
        this._switchTabUI();

        const feed = document.getElementById('svFeed');
        if (feed) {
            feed.style.opacity = '0';
            feed.style.transform = 'translateY(10px)';
        }

        setTimeout(() => {
            let filtered = this._allItems;
            if (tab === 'follow' && this._followedUsers.size > 0) {
                filtered = this._allItems.filter(item => this._followedUsers.has(item.authorId));
            } else if (tab === 'follow') {
                filtered = [];
            }

            this._templates = filtered;
            this._index = 0;

            if (filtered.length === 0 && tab === 'follow') {
                this._showEmptyState('follow-empty');
            } else {
                this._renderFeed();
                this._updateProgress();
            }

            if (feed) {
                feed.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                feed.style.opacity = '1';
                feed.style.transform = 'translateY(0)';
            }
        }, 150);
    },

    _switchTabUI() {
        document.querySelectorAll('.sv-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === this._currentTab);
        });
    },

    toggleFollow(authorId, btnEl) {
        if (this._followedUsers.has(authorId)) {
            this._followedUsers.delete(authorId);
            if (btnEl) btnEl.textContent = '+ 关注';
            if (typeof UIRender !== 'undefined') UIRender.showToast('已取消关注');
        } else {
            this._followedUsers.add(authorId);
            if (btnEl) btnEl.textContent = '✓ 已关注';
            if (typeof UIRender !== 'undefined') UIRender.showToast('关注成功，去关注页看看 Ta 的内容吧');
        }
        try { localStorage.setItem('sv_followed', JSON.stringify([...this._followedUsers])); } catch(e) {}
    },

    openAuthor(authorId) {
        this.close();
        setTimeout(() => {
            if (typeof AuthorSpace !== 'undefined') {
                AuthorSpace.open(authorId);
            } else if (typeof UIRender !== 'undefined') {
                UIRender.showToast('作者主页开发中');
            }
        }, 200);
    },

    _validateItem(item) {
        if (!item || typeof item !== 'object') return false;
        if (!item.id || typeof item.id !== 'string' || item.id.length > 100) return false;
        if (!item.title || typeof item.title !== 'string') return false;
        if (item.title.length > 200) return false;
        return true;
    },

    _safeStr(str, maxLen) {
        if (str == null) return '';
        if (typeof str !== 'string') str = String(str);
        if (str.length > maxLen) str = str.substring(0, maxLen);
        return str;
    },

    _safeUrl(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.length > 2000) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')) {
            return url;
        }
        return '';
    },

    _throttleAction(actionId) {
        const now = Date.now();
        const last = this._actionTimestamps.get(actionId) || 0;
        if (now - last < this._ACTION_THROTTLE_MS) {
            return false;
        }
        this._actionTimestamps.set(actionId, now);
        return true;
    },

    _encodeData(data) {
        try {
            const jsonStr = JSON.stringify(data);
            const salted = this._SECURITY_SALT + jsonStr;
            let encoded = '';
            for (let i = 0; i < salted.length; i++) {
                encoded += String.fromCharCode(salted.charCodeAt(i) ^ this._SECURITY_SALT.charCodeAt(i % this._SECURITY_SALT.length));
            }
            return btoa(unescape(encodeURIComponent(encoded)));
        } catch (e) {
            return null;
        }
    },

    _decodeData(encoded) {
        if (!encoded) return null;
        try {
            const decoded = decodeURIComponent(escape(atob(encoded)));
            let salted = '';
            for (let i = 0; i < decoded.length; i++) {
                salted += String.fromCharCode(decoded.charCodeAt(i) ^ this._SECURITY_SALT.charCodeAt(i % this._SECURITY_SALT.length));
            }
            if (salted.startsWith(this._SECURITY_SALT)) {
                return JSON.parse(salted.substring(this._SECURITY_SALT.length));
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    _backupAction(action, data) {
        this._backupQueue.push({
            action,
            data: JSON.parse(JSON.stringify(data)),
            timestamp: Date.now()
        });
        if (this._backupQueue.length > 50) {
            this._backupQueue.shift();
        }
    },

    _reportError(code, message) {
        try {
            this._perfMonitor.errorCount++;
            const errorInfo = {
                module: 'ShortVideo',
                code,
                message: this._safeStr(message, 500),
                timestamp: Date.now(),
                url: location.href,
                ua: navigator.userAgent.substring(0, 200),
            };
            console.error('[SV Error]', code, message);
            if (typeof window.__errorReport === 'function') {
                window.__errorReport(errorInfo);
            }
        } catch (e) {}
    },

    _setupGestureHandlers() {
        const feed = document.getElementById('svFeed');
        if (!feed) return;

        this._cleanupGestureHandlers();

        const self = this;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let lastTapTime = 0;
        let lastTapX = 0;
        let lastTapY = 0;

        const onTouchStart = function(e) {
            if (e.touches.length !== 1) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            self._gestureState = 'TOUCHING';
        };

        const onTouchMove = function(e) {
            if (self._gestureState !== 'TOUCHING') return;
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dy > 10 || dx > 10) {
                self._gestureState = 'SWIPING';
            }
        };

        const onTouchEnd = function(e) {
            if (e.changedTouches.length !== 1) return;
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const dx = Math.abs(endX - touchStartX);
            const dy = Math.abs(endY - touchStartY);
            const dt = Date.now() - touchStartTime;

            if (self._gestureState === 'TOUCHING' && dx < 10 && dy < 10 && dt < 300) {
                const now = Date.now();
                if (now - lastTapTime < 300 &&
                    Math.abs(endX - lastTapX) < 50 &&
                    Math.abs(endY - lastTapY) < 50) {
                    const slide = e.target.closest('.sv-slide');
                    if (slide) {
                        const idx = parseInt(slide.dataset.idx);
                        const id = slide.dataset.id;
                        if (!isNaN(idx) && id) {
                            self._doLike(idx, id);
                        }
                    }
                    lastTapTime = 0;
                } else {
                    lastTapTime = now;
                    lastTapX = endX;
                    lastTapY = endY;
                }
            }

            self._gestureState = 'IDLE';
        };

        const onMouseDown = function(e) {
            if (e.button !== 0) return;
            touchStartX = e.clientX;
            touchStartY = e.clientY;
            touchStartTime = Date.now();
            self._gestureState = 'TOUCHING';
        };

        const onMouseUp = function(e) {
            if (self._gestureState !== 'TOUCHING') return;
            const dx = Math.abs(e.clientX - touchStartX);
            const dy = Math.abs(e.clientY - touchStartY);
            const dt = Date.now() - touchStartTime;

            if (dx < 5 && dy < 5 && dt < 300) {
                const now = Date.now();
                if (now - lastTapTime < 300 &&
                    Math.abs(e.clientX - lastTapX) < 50 &&
                    Math.abs(e.clientY - lastTapY) < 50) {
                    const slide = e.target.closest('.sv-slide');
                    if (slide) {
                        const idx = parseInt(slide.dataset.idx);
                        const id = slide.dataset.id;
                        if (!isNaN(idx) && id) {
                            self._doLike(idx, id);
                        }
                    }
                    lastTapTime = 0;
                } else {
                    lastTapTime = now;
                    lastTapX = e.clientX;
                    lastTapY = e.clientY;
                }
            }

            self._gestureState = 'IDLE';
        };

        feed.addEventListener('touchstart', onTouchStart, { passive: true });
        feed.addEventListener('touchmove', onTouchMove, { passive: true });
        feed.addEventListener('touchend', onTouchEnd, { passive: true });
        feed.addEventListener('mousedown', onMouseDown);
        feed.addEventListener('mouseup', onMouseUp);

        this._eventListeners.push(
            { el: feed, type: 'touchstart', fn: onTouchStart },
            { el: feed, type: 'touchmove', fn: onTouchMove },
            { el: feed, type: 'touchend', fn: onTouchEnd },
            { el: feed, type: 'mousedown', fn: onMouseDown },
            { el: feed, type: 'mouseup', fn: onMouseUp },
        );
    },

    _cleanupGestureHandlers() {
        this._eventListeners.forEach(({ el, type, fn }) => {
            try { el.removeEventListener(type, fn); } catch(e) {}
        });
        this._eventListeners = [];
    },

    _setupExposureObserver() {
        if (this._exposureObserver) {
            try { this._exposureObserver.disconnect(); } catch(e) {}
        }

        if (!('IntersectionObserver' in window)) {
            this._setupScrollExposure();
            return;
        }

        const self = this;
        this._exposureObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                const slide = entry.target;
                const id = slide.dataset.id;
                const idx = parseInt(slide.dataset.idx);

                if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
                    if (!self._exposureRecords.has(id)) {
                        self._exposureRecords.set(id, {
                            firstShow: Date.now(),
                            idx,
                            duration: 0,
                        });
                        self._viewedIds.add(id);
                        self._trackExposure(id, idx, 'show');
                    }
                    const record = self._exposureRecords.get(id);
                    if (record) record._lastVisible = Date.now();
                } else {
                    const record = self._exposureRecords.get(id);
                    if (record && record._lastVisible) {
                        record.duration += Date.now() - record._lastVisible;
                        record._lastVisible = null;
                    }
                }
            });
        }, {
            threshold: [0, 0.5, 0.8, 1],
            root: document.getElementById('svFeed')
        });

        requestAnimationFrame(() => {
            const slides = document.querySelectorAll('.sv-slide');
            slides.forEach(slide => {
                try { self._exposureObserver.observe(slide); } catch(e) {}
            });
        });
    },

    _setupScrollExposure() {
        const feed = document.getElementById('svFeed');
        if (!feed) return;
        const self = this;
        let lastIdx = -1;
        const onScroll = function() {
            const idx = Math.round(feed.scrollTop / feed.clientHeight);
            if (idx !== lastIdx && idx >= 0 && idx < self._templates.length) {
                lastIdx = idx;
                const tpl = self._templates[idx];
                if (tpl && !self._exposureRecords.has(tpl.id)) {
                    self._exposureRecords.set(tpl.id, {
                        firstShow: Date.now(),
                        idx,
                        duration: 0,
                    });
                    self._viewedIds.add(tpl.id);
                    self._trackExposure(tpl.id, idx, 'show');
                }
            }
        };
        feed.addEventListener('scroll', onScroll, { passive: true });
        this._eventListeners.push({ el: feed, type: 'scroll', fn: onScroll });
    },

    _trackExposure(id, idx, action) {
        if (typeof window.__trackEvent === 'function') {
            try {
                window.__trackEvent('sv_exposure', {
                    item_id: id,
                    index: idx,
                    action,
                    tab: this._currentTab,
                    timestamp: Date.now(),
                });
            } catch(e) {}
        }
    },

    _saveBrowseProgress() {
        try {
            localStorage.setItem('sv_progress', JSON.stringify({
                tab: this._currentTab,
                idx: this._index,
                timestamp: Date.now(),
            }));
        } catch (e) {}
    },

    _saveViewedIds() {
        try {
            const arr = Array.from(this._viewedIds).slice(-200);
            const encoded = this._encodeData(arr);
            if (encoded) localStorage.setItem('sv_viewed', encoded);
        } catch (e) {}
    },

    _resumeBrowse() {
        this._endTipShown = false;
        this._preloadTriggered = false;
    },

    close() {
        try {
            this._saveBrowseProgress();
            this._saveViewedIds();

            try {
                if (typeof CommunityModule !== 'undefined' && CommunityModule._likedSet) {
                    this._likedSet.forEach(id => CommunityModule._likedSet.add(id));
                }
            } catch(e) {}

            try {
                const encoded = this._encodeData(Array.from(this._followedUsers));
                if (encoded) localStorage.setItem('sv_followed', encoded);
            } catch(e) {}

            this._cleanupGestureHandlers();

            if (this._exposureObserver) {
                try { this._exposureObserver.disconnect(); } catch(e) {}
                this._exposureObserver = null;
            }

            this._isDestroyed = true;

            const overlay = document.getElementById('shortVideoOverlay');
            if (overlay) overlay.classList.remove('show');

            const communityScroll = document.querySelector('#communityPage .page-scroll');
            if (communityScroll && this._communityScrollTop > 0) {
                setTimeout(() => {
                    try { communityScroll.scrollTop = this._communityScrollTop; } catch(e) {}
                }, 100);
            }

            if (typeof window.__trackEvent === 'function') {
                window.__trackEvent('sv_close', {
                    duration: Date.now() - this._perfMonitor.openTime,
                    slideCount: this._perfMonitor.slideCount,
                    errorCount: this._perfMonitor.errorCount,
                    tab: this._currentTab,
                });
            }
        } catch (e) {
            console.error('[ShortVideo] close 异常:', e);
            this._reportError('close_crash', e.message);
        }
    },

    _smartSort(items) {
        const scored = items.map((t, i) => {
            let score = 0;
            const likes = t.likes || 0;
            const copies = t.copies || 0;
            score += likes * 2 + copies * 3;
            if (t.isNote) score += 5;
            score += Math.random() * 20;
            return { ...t, _score: score, _origIdx: i };
        });
        scored.sort((a, b) => b._score - a._score);
        const result = [];
        const lastDest = ['', ''];
        for (const item of scored) {
            const dest = item.destination || item.city || '';
            if (dest && lastDest[0] === dest && lastDest[1] === dest) {
                result.push(item);
                continue;
            }
            result.unshift(item);
            lastDest[1] = lastDest[0];
            lastDest[0] = dest;
        }
        return result;
    },

    _getCoverImage(t, i) {
        if (t.coverImage) return t.coverImage;

        const dest = t.destination || t.city || '';
        const tags = t.tags || [];
        const isNote = t.isNote;

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

        let seed = 'travel-scenery';

        for (const [city, citySeed] of Object.entries(destSeedMap)) {
            if (dest.includes(city)) {
                seed = citySeed;
                break;
            }
        }

        if (tags.some(t => t.includes('美食') || t.includes('吃'))) {
            seed = 'food-delicious';
        } else if (tags.some(t => t.includes('亲子') || t.includes('家庭') || t.includes('孩子'))) {
            seed = 'family-travel';
        } else if (tags.some(t => t.includes('拍照') || t.includes('摄影') || t.includes('出片'))) {
            seed = 'photography-scenic';
        } else if (tags.some(t => t.includes('徒步') || t.includes('户外') || t.includes('爬山'))) {
            seed = 'hiking-mountain';
        } else if (isNote) {
            seed = 'travel-diary';
        }

        return 'https://picsum.photos/seed/' + seed + '-' + (t.id || i) + '/800/1200';
    },

    _getCrowdTag(t) {
        const tags = t.tags || [];
        if (tags.some(t => t.includes('亲子') || t.includes('家庭'))) return '👨‍👩‍👧 亲子友好';
        if (tags.some(t => t.includes('情侣') || t.includes('约会'))) return '💑 情侣推荐';
        if (tags.some(t => t.includes('独行') || t.includes(' solo') || t.includes('一个人'))) return '🚶 独自旅行';
        if (tags.some(t => t.includes('闺蜜') || t.includes('朋友'))) return '👭 闺蜜出行';
        if (tags.some(t => t.includes('老年') || t.includes('爸妈') || t.includes('银发'))) return '👴 银发友好';
        return '';
    },

    _extractHighlight(t) {
        if (t.description) {
            const desc = String(t.description);
            const sentences = desc.split(/[。！？.!?\n]/).filter(s => s.trim().length > 0);
            if (sentences.length > 0) {
                return sentences[0].trim().substring(0, 50);
            }
        }
        if (t.tags && t.tags.length > 0) {
            return t.tags.slice(0, 2).join(' · ');
        }
        if (t.isNote) {
            return t.content ? String(t.content).replace(/<[^>]*>/g, '').substring(0, 50) : '来自旅行者的真实记录';
        }
        return '精选行程，一键套用出发';
    },

    _getNoteTypeBadge(t) {
        const tags = t.tags || [];
        const content = t.content ? String(t.content) : '';
        if (tags.some(t => t.includes('攻略')) || content.includes('攻略')) return '📋 攻略型';
        if (tags.some(t => t.includes('避坑') || t.includes('踩雷')) || content.includes('避坑')) return '⚠️ 避坑指南';
        if (tags.some(t => t.includes('美食'))) return '🍜 美食探店';
        return '📝 旅行记录';
    },

    _estimateReadTime(t) {
        const content = t.content ? String(t.content).replace(/<[^>]*>/g, '') : '';
        const images = (t.customTags && t.customTags.length) || 0;
        const words = content.length;
        const minutes = Math.max(1, Math.round(words / 300 + images * 0.3));
        return minutes + ' 分钟阅读';
    },

    _showSkeleton() {
        const feed = document.getElementById('svFeed');
        if (!feed) return;

        const progressBar = document.getElementById('svProgressBar');
        const counter = document.getElementById('svCounter');
        if (progressBar) {
            progressBar.innerHTML = `
                <div class="sv-progress-seg active"></div>
                <div class="sv-progress-seg"></div>
                <div class="sv-progress-seg"></div>
            `;
        }
        if (counter) counter.textContent = '加载中...';

        feed.innerHTML = `
            <div class="sv-skeleton">
                <div class="sv-skeleton-cover"></div>
                <div class="sv-skeleton-info">
                    <div class="sv-skeleton-line sv-skeleton-title"></div>
                    <div class="sv-skeleton-line sv-skeleton-sub"></div>
                    <div class="sv-skeleton-tags">
                        <div class="sv-skeleton-tag"></div>
                        <div class="sv-skeleton-tag"></div>
                    </div>
                </div>
            </div>
        `;
    },

    _showEmptyState(type) {
        const feed = document.getElementById('svFeed');
        if (!feed) return;

        const progressBar = document.getElementById('svProgressBar');
        const counter = document.getElementById('svCounter');
        if (progressBar) {
            progressBar.innerHTML = '<div class="sv-progress-seg"></div>';
        }
        if (counter) counter.textContent = '0/0';

        let icon = '📭';
        let title = '暂无内容';
        let desc = '稍后再来看看吧';
        let btnHtml = '';

        if (type === 'follow-empty') {
            icon = '👀';
            title = '还没有关注的人';
            desc = '去「推荐」页面发现有趣的旅行者吧';
            btnHtml = `<button class="sv-empty-btn" onclick="ShortVideoModule.switchTab('recommend')">去推荐看看</button>`;
        } else if (type === 'no-content') {
            icon = '✨';
            title = '暂无可浏览的内容';
            desc = '去社区发布第一条内容，成为旅行达人吧';
            btnHtml = `<button class="sv-empty-btn" onclick="ShortVideoModule.close();CommunityModule && CommunityModule.openPublishPicker && CommunityModule.openPublishPicker()">去发布</button>`;
        }

        feed.innerHTML = `
            <div class="sv-empty-state">
                <div class="sv-empty-icon">${icon}</div>
                <div class="sv-empty-title">${title}</div>
                <div class="sv-empty-desc">${desc}</div>
                ${btnHtml}
            </div>
        `;
    },

    _showNetworkTip() {
        const overlay = document.getElementById('shortVideoOverlay');
        if (!overlay) return;
        const tip = document.createElement('div');
        tip.className = 'sv-network-tip';
        tip.innerHTML = `
            <span>📡 网络不佳，部分内容未加载</span>
            <button onclick="ShortVideoModule._retryLoad()">重试</button>
        `;
        overlay.appendChild(tip);
        setTimeout(() => tip.classList.add('show'), 100);
        setTimeout(() => {
            tip.classList.remove('show');
            setTimeout(() => tip.remove(), 500);
        }, 5000);
    },

    async _retryLoad() {
        if (this._isLoading) return;
        this._allItems = [];
        this._templates = [];
        this._showSkeleton();
        await this.open();
    },

    _renderFeed() {
        const feed = document.getElementById('svFeed');
        if (!feed) return;
        const total = this._templates.length;
        if (total === 0) return;

        const progressBar = document.getElementById('svProgressBar');
        const counter = document.getElementById('svCounter');
        if (progressBar) {
            let progressHTML = '';
            for (let i = 0; i < total; i++) {
                progressHTML += '<div class="sv-progress-seg" data-idx="' + i + '"></div>';
            }
            progressBar.innerHTML = progressHTML;
        }
        if (counter) {
            counter.textContent = '1/' + total;
        }

        const heights = ['58%','50%','46%','56%','48%'];
        const self = this;
        feed.innerHTML = this._templates.map(function(t, i) {
            const coverH = heights[i % heights.length];
            const tags = (t.tags || []).slice(0, 3).map(function(tg) {
                return '<span class="sv-tag">' + tg + '</span>';
            }).join('');
            const liked = self._likedSet.has(t.id);
            const coverImageUrl = self._getCoverImage(t, i);
            const coverBgStyle = "background-image:url('" + coverImageUrl + "');background-size:cover;background-position:center;";

            const avatarHtml = (t.avatar && typeof t.avatar === 'string' && !t.avatar.startsWith('🧳') && t.avatar.startsWith('http'))
                ? '<img src="' + t.avatar + '" class="sv-avatar-img" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">'
                : '<span class="sv-avatar">' + (t.avatar || '🧳') + '</span>';

            const crowdTag = self._getCrowdTag(t);
            const highlight = self._extractHighlight(t);
            const authorId = t.authorId || '';
            const authorClickable = authorId ? 'onclick="event.stopPropagation();ShortVideoModule.openAuthor(\'' + authorId + '\')"' : '';
            const authorClass = authorId ? 'sv-author clickable' : 'sv-author';

            if (t.isNote) {
                const readTime = self._estimateReadTime(t);
                const isFollowed = self._followedUsers.has(authorId);
                return '<section class="sv-slide" data-id="' + t.id + '" data-idx="' + i + '">' +
                    '<div class="sv-cover" style="' + coverBgStyle + ' flex:' + coverH + '">' +
                        '<div class="sv-cover-grad"></div>' +
                    '</div>' +
                    '<div class="sv-info">' +
                        '<div class="sv-title">' + self._escapeHtml(t.title) + '</div>' +
                        '<div class="sv-highlight">💡 ' + self._escapeHtml(highlight) + '</div>' +
                        '<div class="sv-tags">' + tags + '</div>' +
                        '<div class="sv-meta">' +
                            '<div class="' + authorClass + '" ' + authorClickable + '>' + avatarHtml + self._escapeHtml(t.author || '旅行者') + '</div>' +
                            (authorId ? '<button class="sv-follow-btn ' + (isFollowed ? ' followed' : '') + '" onclick="event.stopPropagation();ShortVideoModule.toggleFollow(\'' + authorId + '\', this)">' + (isFollowed ? '✓ 已关注' : '+ 关注') + '</button>' : '') +
                        '</div>' +
                        '<div class="sv-extra">图文游记 · ' + ((t.customTags && t.customTags.length) || 0) + '张图 · ' + readTime + '</div>' +
                        (crowdTag ? '<div class="sv-crowd-tag">' + crowdTag + '</div>' : '') +
                        '<button class="sv-use-btn" onclick="ShortVideoModule.viewNote(\'' + (t.cloudId || t.id) + '\')">📖 阅读游记</button>' +
                    '</div>' +
                    '<div class="sv-side-actions">' +
                        '<button class="sv-side-btn ' + (liked ? 'liked' : '') + '" id="svLikeBtn' + i + '" onclick="event.stopPropagation();ShortVideoModule.toggleLike(' + i + ',\'' + t.id + '\')">' +
                            '<span class="sv-side-icon">' + (liked ? '❤️' : '🤍') + '</span>' +
                            '<span>' + ((t.likes || 0) + (liked ? 1 : 0)) + '</span>' +
                        '</button>' +
                        '<button class="sv-side-btn" onclick="event.stopPropagation();ShortVideoModule.toggleFav(\'' + t.id + '\', this)">' +
                            '<span class="sv-side-icon">⭐</span>' +
                            '<span>收藏</span>' +
                        '</button>' +
                    '</div>' +
                '</section>';
            } else {
                const isFollowed = self._followedUsers.has(authorId);
                const spots = t.dayPlans ? t.dayPlans.reduce(function(s, d) { return s + (d.spots ? d.spots.length : 0); }, 0) : 0;
                const route = (t.dayPlans && t.dayPlans[0] && t.dayPlans[0].spots)
                    ? t.dayPlans[0].spots.slice(0, 3).map(function(s) { return s.name; }).join(' → ')
                    : '';

                return '<section class="sv-slide" data-id="' + t.id + '" data-idx="' + i + '">' +
                    '<div class="sv-cover" style="' + coverBgStyle + ' flex:' + coverH + '">' +
                        '<div class="sv-cover-grad"></div>' +
                        '<div class="sv-dest-badge">' + (t.destination || t.city || '') + '</div>' +
                    '</div>' +
                    '<div class="sv-info">' +
                        '<div class="sv-title">' + self._escapeHtml(t.title) + '</div>' +
                        '<div class="sv-highlight">✨ ' + self._escapeHtml(highlight) + '</div>' +
                        '<div class="sv-route">' + self._escapeHtml(route) + (spots > 3 ? ' …' : '') + '</div>' +
                        '<div class="sv-tags">' + tags + '</div>' +
                        '<div class="sv-meta">' +
                            '<div class="' + authorClass + '" ' + authorClickable + '>' + avatarHtml + self._escapeHtml(t.author || '旅行达人') + '</div>' +
                        '</div>' +
                        '<div class="sv-extra">' + (t.days || 1) + '天 · ' + spots + '个地点' + (t.budget ? ' · ' + self._escapeHtml(t.budget) : '') + '</div>' +
                        (crowdTag ? '<div class="sv-crowd-tag">' + crowdTag + '</div>' : '') +
                        '<button class="sv-use-btn" onclick="ShortVideoModule.confirmUse(\'' + t.id + '\')">📋 套用此行程</button>' +
                    '</div>' +
                    '<div class="sv-side-actions">' +
                        '<button class="sv-side-btn ' + (liked ? 'liked' : '') + '" id="svLikeBtn' + i + '" onclick="event.stopPropagation();ShortVideoModule.toggleLike(' + i + ',\'' + t.id + '\')">' +
                            '<span class="sv-side-icon">' + (liked ? '❤️' : '🤍') + '</span>' +
                            '<span>' + ((t.likes || 0) + (liked ? 1 : 0)) + '</span>' +
                        '</button>' +
                        '<button class="sv-side-btn" onclick="event.stopPropagation();ShortVideoModule.toggleFav(\'' + t.id + '\', this)">' +
                            '<span class="sv-side-icon">⭐</span>' +
                            '<span>收藏</span>' +
                        '</button>' +
                    '</div>' +
                '</section>';
            }
        }).join('');

        feed.onscroll = function() { self._updateProgress(); };
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _updateProgress() {
        const feed = document.getElementById('svFeed');
        if (!feed) return;
        const idx = Math.round(feed.scrollTop / feed.clientHeight);

        if (idx !== this._index && idx >= 0 && idx < this._templates.length) {
            this._index = idx;
            this._perfMonitor.slideCount++;

            if (idx % 5 === 0) {
                this._saveBrowseProgress();
                if (idx % 10 === 0) {
                    this._saveViewedIds();
                }
            }
        }

        const progressBar = document.getElementById('svProgressBar');
        if (progressBar) {
            const segs = progressBar.querySelectorAll('.sv-progress-seg');
            segs.forEach(function(seg, i) {
                seg.classList.remove('active', 'done');
                if (i < idx) seg.classList.add('done');
                else if (i === idx) seg.classList.add('active');
            });
        }
        const counter = document.getElementById('svCounter');
        if (counter) counter.textContent = Math.min(idx + 1, this._templates.length) + '/' + this._templates.length;

        if (idx >= this._templates.length - 1 && this._templates.length > 0) {
            this._showEndTip();
        }
    },

    _showEndTip() {
        if (this._endTipShown) return;
        this._endTipShown = true;
        const feed = document.getElementById('svFeed');
        if (!feed) return;
        const tip = document.createElement('div');
        tip.className = 'sv-end-tip';
        tip.innerHTML = '✨ 已经到底啦，去社区发现更多精彩';
        feed.appendChild(tip);
        setTimeout(function() {
            tip.classList.add('show');
        }, 50);
    },

    toggleLike(idx, id) {
        try {
            if (!this._throttleAction('like_' + id)) {
                return;
            }

            const btn = document.getElementById('svLikeBtn' + idx);
            const wasLiked = this._likedSet.has(id);

            this._backupAction('toggleLike', { id, idx, wasLiked });

            if (wasLiked) {
                this._likedSet.delete(id);
                try {
                    if (typeof CommunityModule !== 'undefined' && CommunityModule._likedSet) {
                        CommunityModule._likedSet.delete(id);
                    }
                } catch(e) {}
            } else {
                this._likedSet.add(id);
                try {
                    if (typeof CommunityModule !== 'undefined' && CommunityModule._likedSet) {
                        CommunityModule._likedSet.add(id);
                    }
                } catch(e) {}
                try {
                    const likes = parseInt(localStorage.getItem('user_likes') || '0') + 1;
                    localStorage.setItem('user_likes', String(Math.min(likes, 999999)));
                } catch(e) {}
            }

            if (btn) {
                const liked = this._likedSet.has(id);
                btn.classList.toggle('liked', liked);
                const iconEl = btn.querySelector('.sv-side-icon');
                if (iconEl) iconEl.textContent = liked ? '❤️' : '🤍';
                const tpl = this._templates[idx];
                const countEl = btn.querySelector('span:last-child');
                if (countEl && tpl) {
                    countEl.textContent = (tpl.likes || 0) + (liked ? 1 : 0);
                }
                btn.classList.add('pop');
                setTimeout(function() { try { btn.classList.remove('pop'); } catch(e) {} }, 400);
            }

            if (typeof window.__trackEvent === 'function') {
                window.__trackEvent('sv_like', {
                    item_id: id,
                    index: idx,
                    action: wasLiked ? 'unlike' : 'like',
                    tab: this._currentTab,
                });
            }
        } catch (e) {
            console.error('[ShortVideo] toggleLike 异常:', e);
            this._reportError('toggle_like_fail', e.message);
        }
    },

    _doLike(idx, id) {
        if (!this._likedSet.has(id)) {
            this.toggleLike(idx, id);
        }
        const burst = document.getElementById('svLikeBurst');
        if (burst) {
            burst.classList.remove('burst');
            void burst.offsetWidth;
            burst.classList.add('burst');
        }
    },

    toggleFav(id, btn) {
        try {
            if (!this._throttleAction('fav_' + id)) {
                return;
            }

            this._backupAction('toggleFav', { id });

            const favs = ProfileModule._getFavorites();
            const isFaved = favs.includes(id);

            if (isFaved) {
                ProfileModule._removeFavorite(id);
                if (typeof UIRender !== 'undefined') UIRender.showToast('已取消收藏');
                btn.querySelector('.sv-side-icon').textContent = '⭐';
            } else {
                ProfileModule._addFavorite(id);
                if (typeof UIRender !== 'undefined') UIRender.showToast('已收藏');
                btn.querySelector('.sv-side-icon').textContent = '🌟';
            }
            btn.classList.add('pop');
            setTimeout(function() { try { btn.classList.remove('pop'); } catch(e) {} }, 400);

            if (typeof window.__trackEvent === 'function') {
                window.__trackEvent('sv_fav', {
                    item_id: id,
                    action: isFaved ? 'unfav' : 'fav',
                    tab: this._currentTab,
                });
            }
        } catch (e) {
            console.error('[ShortVideo] toggleFav 异常:', e);
            this._reportError('toggle_fav_fail', e.message);
        }
    },

    confirmUse(id) {
        const tpl = this._templates.find(function(t) { return t.id === id; });
        if (!tpl) return;

        if (typeof UIRender !== 'undefined' && UIRender.showConfirm) {
            UIRender.showConfirm({
                title: '套用此行程',
                message: '确定要套用「' + tpl.title + '」吗？套用后将生成到你的行程列表中。',
                confirmText: '确定套用',
                cancelText: '再看看',
                onConfirm: () => { this._doUse(id); }
            });
        } else {
            this._doUse(id);
        }
    },

    _doUse(id) {
        this.close();
        if (typeof App !== 'undefined' && App.useTemplate) {
            setTimeout(function() {
                App.useTemplate(id);
                if (typeof UIRender !== 'undefined') {
                    UIRender.showToast('行程已套用，去「我的行程」查看吧');
                }
            }, 300);
        }
    },

    use(id) {
        this.confirmUse(id);
    },

    viewNote(cloudId) {
        this.close();
        if (typeof TravelNote !== 'undefined') {
            setTimeout(function() {
                TravelNote.view(cloudId);
            }, 300);
        }
    },
};

const ProfileModule = {
    _collapsedGroups: null,

    _loadCollapsedState() {
        if (this._collapsedGroups !== null) return this._collapsedGroups;
        try {
            const saved = JSON.parse(localStorage.getItem('profile_collapsed_groups') || '[]');
            this._collapsedGroups = new Set(saved);
        } catch (e) {
            this._collapsedGroups = new Set();
        }
        return this._collapsedGroups;
    },

    _saveCollapsedState() {
        try {
            localStorage.setItem('profile_collapsed_groups', JSON.stringify([...this._collapsedGroups]));
        } catch (e) {}
    },

    async render() {
        this._renderMenuGroups();

        // 本地行程统计（保留，作为离线数据）
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips);
        const localTripCount = tripArr.length;

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

        // 默认显示本地数据
        set('statTrips', localTripCount);

        // ===== 社区化升级：登录后从 Supabase 加载真实数据 =====
        const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getCurrentUser() : null;
        if (user && window.supabase) {
            try {
                // 并行查询：发布行程数、发布游记数、获赞总数、收藏数、粉丝数
                const [tripRes, noteRes, likeRes, favRes, followRes] = await Promise.all([
                    supabase.from('trip_templates')
                        .select('id, likes, copies', { count: 'exact' })
                        .eq('author_id', user.id)
                        .eq('status', 'published'),
                    supabase.from('travel_notes')
                        .select('id, likes', { count: 'exact' })
                        .eq('author_id', user.id)
                        .eq('status', 'published'),
                    supabase.from('favorites')
                        .select('id', { count: 'exact', head: true })
                        .eq('target_type', 'template')
                        .in('target_id', (await supabase.from('trip_templates').select('id').eq('author_id', user.id)).data?.map(t => t.id) || []),
                    supabase.from('favorites')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', user.id),
                    supabase.from('follows')
                        .select('id', { count: 'exact', head: true })
                        .eq('following_id', user.id)
                ]);

                const tripCount = tripRes.count || 0;
                const noteCount = noteRes.count || 0;
                const tripLikes = (tripRes.data || []).reduce((s, t) => s + (t.likes || 0), 0);
                const noteLikes = (noteRes.data || []).reduce((s, n) => s + (n.likes || 0), 0);
                const totalLikes = tripLikes + noteLikes;
                const favCount = favRes.count || 0;
                const followerCount = followRes.count || 0;

                // 显示云端数据（行程数显示发布数，点赞为总获赞，收藏为云端收藏数）
                set('statTrips', tripCount + noteCount);
                set('statLikes', totalLikes);
                set('statCopies', followerCount); // 改为粉丝数
                set('statFavs', favCount);
                // 修改标签（兼容新旧布局）
                const lblCopies = document.querySelector('.stat-item:nth-child(3) .stat-label');
                if (lblCopies) lblCopies.textContent = '粉丝';
                const pstatLabels = document.querySelectorAll('.pstat-label');
                if (pstatLabels.length >= 3) pstatLabels[2].textContent = '粉丝';
            } catch (e) {
                console.warn('[Profile] 加载云端统计失败:', e);
            }
        } else {
            // 未登录：显示本地数据
            const likes = parseInt(localStorage.getItem('user_likes') || '0');
            const copies = parseInt(localStorage.getItem('user_copies') || '0');
            const favs = this._getFavorites().length;
            set('statLikes', likes);
            set('statCopies', copies);
            set('statFavs', favs);
        }

        // 积分（profiles.points）
        if (user && user.points !== undefined) {
            set('userPoints', user.points || 0);
        }
        const lvEl = document.querySelector('.profile-level');
        if (lvEl && user && user.level) {
            const lvName = this._levelName(user.level);
            lvEl.textContent = `Lv.${user.level} ${lvName}`;
        }

        // ===== 社区化升级：同步登录态用户信息 =====
        this._renderAuthUser();
    },

    // 渲染登录用户信息（头像、昵称、等级）
    _renderAuthUser() {
        const nameEl = document.querySelector('#profilePage .profile-name');
        const avatarEl = document.querySelector('#profilePage .profile-avatar');
        const lvEl = document.querySelector('.profile-level') || document.querySelector('.profile-level-tag span:first-child');
        const pointsEl = document.querySelector('.profile-points') || document.querySelector('.profile-points-row');
        const ppNumEl = document.querySelector('.pp-num');
        if (!nameEl || !avatarEl) return;

        const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getCurrentUser() : null;
        if (user) {
            nameEl.textContent = user.username || '旅行者';
            // 头像：优先使用 avatar_url，否则用首字母
            if (user.avatar_url) {
                avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.username}">`;
            } else {
                const initial = (user.username || 'U')[0].toUpperCase();
                avatarEl.textContent = initial;
                avatarEl.style.background = 'linear-gradient(135deg, #1989fa, #0d6efd)';
                avatarEl.style.color = '#fff';
                avatarEl.style.fontWeight = '600';
                avatarEl.style.fontSize = '24px';
            }
            // 等级用 profiles 表的字段（如果存在）
            if (lvEl && user.level) {
                const lvName = this._levelName(user.level);
                if (lvEl.classList.contains('profile-level')) {
                    lvEl.textContent = `Lv.${user.level} ${lvName}`;
                } else {
                    lvEl.textContent = `✨ ${lvName}`;
                }
            }
            // 更新积分数字
            if (ppNumEl && user.points !== undefined) {
                ppNumEl.textContent = user.points || 0;
            }
            // 绑定点击交互（onclick 避免重复绑定）
            nameEl.onclick = () => this._editUsername();
            nameEl.style.cursor = 'pointer';
            nameEl.title = '点击修改用户名';
            avatarEl.onclick = () => UiKit.toast('头像上传功能即将上线', 'info');
            avatarEl.style.cursor = 'pointer';
            if (lvEl) {
                lvEl.onclick = () => this._showLevelInfo();
                lvEl.style.cursor = 'pointer';
                lvEl.title = '点击查看等级特权';
            }
            if (pointsEl) {
                pointsEl.onclick = () => PointsLedger.open();
                pointsEl.style.cursor = 'pointer';
                pointsEl.title = '点击查看积分明细';
            }
            // 管理员审核菜单显示
            const modMenu = document.getElementById('adminModerationMenu');
            if (modMenu) modMenu.style.display = Auth.isAdmin() ? 'flex' : 'none';
            // Phase 5.3：应用 Lv8 主页主题（仅 Lv8+ 用户）
            if (typeof AdvancedPrivileges !== 'undefined' && user.theme && user.theme !== 'default') {
                if (LevelSystem.checkPrivilege('profile_theme')) {
                    AdvancedPrivileges.applyTheme(user.theme);
                }
            }
            // Phase 5.4：更新体验模式菜单状态
            this._updateExpModeTag();
        } else {
            // 未登录：保持默认
            nameEl.textContent = '旅行者';
            avatarEl.textContent = '🧑‍✈️';
            avatarEl.style.background = '';
            avatarEl.style.color = '';
            avatarEl.style.fontWeight = '';
            avatarEl.style.fontSize = '';
            // 未登录点击引导登录
            nameEl.onclick = () => Auth.requireAuth();
            nameEl.style.cursor = 'pointer';
            avatarEl.onclick = () => Auth.requireAuth();
            avatarEl.style.cursor = 'pointer';
            if (pointsEl) {
                pointsEl.onclick = () => Auth.requireAuth();
                pointsEl.style.cursor = 'pointer';
            }
            if (lvEl) {
                lvEl.onclick = () => this._showLevelInfo();
                lvEl.style.cursor = 'pointer';
            }
        }

        // 管理员审核入口
        this._renderAdminEntry();
    },

    /**
     * 管理员审核入口（仅管理员显示）
     */
    _renderAdminEntry() {
        const oldEntry = document.getElementById('adminReviewEntry');
        if (oldEntry) oldEntry.remove();

        if (typeof Auth === 'undefined' || !Auth.isLoggedIn() || !Auth.isAdmin()) return;

        // 兼容新旧布局
        const profileCard = document.querySelector('.profile-card');
        const profileHero = document.querySelector('.profile-hero-content');
        const container = profileCard || profileHero;
        if (!container) return;

        const entry = document.createElement('div');
        entry.id = 'adminReviewEntry';
        entry.style.cssText = 'position:absolute;top:8px;right:8px;background:linear-gradient(135deg,#ff9500,#ff6b00);color:#fff;font-size:11px;padding:4px 8px;border-radius:12px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(255,107,0,0.3);z-index:10;';
        entry.textContent = '🛡️ 审核';
        entry.onclick = () => this._showReviewPanel();
        container.style.position = 'relative';
        container.appendChild(entry);
    },

    /**
     * 管理员审核面板
     */
    async _showReviewPanel() {
        if (typeof TripStorage === 'undefined' || !Auth.isAdmin()) return;

        UiKit.showLoading('加载审核列表...');
        const reviews = await TripStorage.getReviewList('pending');
        UiKit.hideLoading();

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:400px;max-height:85vh;display:flex;flex-direction:column;">
                <div class="ui-modal-title">🛡️ 审核管理（${reviews.length}）</div>
                <div class="ui-modal-body" style="overflow-y:auto;flex:1;padding:12px 16px;">
                    ${reviews.length === 0 ? `
                        <div style="text-align:center;padding:30px 0;color:#999;">
                            <div style="font-size:36px;margin-bottom:8px;">✅</div>
                            <div>暂无待审核行程</div>
                        </div>
                    ` : reviews.map(r => `
                        <div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                                <div>
                                    <div style="font-weight:600;font-size:14px;">${r.trip_templates?.[0]?.title || r.trip_templates?.title || '未命名'}</div>
                                    <div style="font-size:12px;color:#999;margin-top:2px;">
                                        作者：${r.profiles?.username || '未知'} · ${r.trip_templates?.destination || ''}
                                        ${r.trip_templates?.days ? ' · ' + r.trip_templates.days + '天' : ''}
                                    </div>
                                </div>
                                <div style="font-size:11px;color:#ff9500;background:#fff5e6;padding:2px 6px;border-radius:4px;">待审核</div>
                            </div>
                            <div style="font-size:11px;color:#999;margin-bottom:8px;">${r.review_note || '自动触发'}</div>
                            <div style="display:flex;gap:8px;">
                                <button class="review-action-btn" data-review-id="${r.id}" data-action="approve"
                                    style="flex:1;padding:6px;border:none;border-radius:6px;background:#34c759;color:#fff;font-size:13px;cursor:pointer;">通过 (+2配额)</button>
                                <button class="review-action-btn" data-review-id="${r.id}" data-action="reject"
                                    style="flex:1;padding:6px;border:none;border-radius:6px;background:#ff3b30;color:#fff;font-size:13px;cursor:pointer;">拒绝</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-confirm" style="flex:1;">关闭</button>
                </div>
            </div>`;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));
        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        mask.querySelector('.ui-modal-confirm').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        // 绑定审核操作
        mask.querySelectorAll('.review-action-btn').forEach(btn => {
            btn.onclick = async () => {
                const reviewId = btn.dataset.reviewId;
                const action = btn.dataset.action;
                close();
                UiKit.showLoading('审核中...');
                const result = await TripStorage.reviewAction(
                    reviewId, action, Auth.getCurrentUser().id, 4, ''
                );
                UiKit.hideLoading();
                if (result.success) {
                    UiKit.toast(action === 'approve' ? '已通过，作者配额 +2' : '已拒绝', 'success');
                    this._showReviewPanel(); // 刷新列表
                } else {
                    UiKit.toast(result.error || '操作失败', 'error');
                }
            };
        });
    },

    // 积分明细弹窗
    _showPointsDetail() {
        const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getCurrentUser() : null;
        if (!user) {
            Auth.requireAuth();
            return;
        }
        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:360px;max-height:80vh;display:flex;flex-direction:column;">
                <div class="ui-modal-title">积分明细</div>
                <div class="ui-modal-body" style="overflow-y:auto;flex:1;padding:16px;">
                    <div style="text-align:center;padding:12px 0 16px;border-bottom:1px solid #eee;">
                        <div style="font-size:36px;font-weight:700;color:#1989fa;">${user.points || 0}</div>
                        <div style="font-size:13px;color:#999;margin-top:4px;">当前积分</div>
                    </div>
                    <div id="pointsLedgerList" style="padding:8px 0;">加载中...</div>
                    <div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#666;line-height:1.8;">
                        <div style="font-weight:600;margin-bottom:6px;color:#333;">积分规则</div>
                        <div>被看 +1 · 被点赞 +3 · 被收藏 +5</div>
                        <div>被采纳 +10 · 被关注 +15</div>
                        <div>实地打卡 +3 · 云打卡 +1 · 发吐槽 +5</div>
                        <div style="color:#ff3b30;">违规 -30（零容忍）</div>
                    </div>
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-confirm" style="flex:1;">关闭</button>
                </div>
            </div>`;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));
        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        mask.querySelector('.ui-modal-confirm').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };

        // 加载积分流水
        if (typeof PointsCore !== 'undefined') {
            PointsCore.getPointLedger(user.id, 20, 1).then(records => {
                const listEl = mask.querySelector('#pointsLedgerList');
                if (!listEl) return;
                if (!records || records.length === 0) {
                    listEl.innerHTML = '<div style="text-align:center;color:#999;padding:20px 0;">暂无积分记录</div>';
                    return;
                }
                const reasonMap = {
                    viewed: '内容被浏览', liked: '获得点赞', favorited: '被收藏',
                    adopted: '行程被采纳', followed: '获得关注',
                    checkin_field: '实地打卡', checkin_cloud: '云打卡',
                    roast: '发布吐槽', roast_liked: '吐槽获赞', roast_favorited: '吐槽被收藏',
                    violation: '违规扣分',
                };
                listEl.innerHTML = records.map(r => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;">
                        <div>
                            <div style="font-size:14px;color:#333;">${reasonMap[r.reason] || r.reason}</div>
                            <div style="font-size:11px;color:#999;margin-top:2px;">${new Date(r.created_at).toLocaleString('zh-CN')}</div>
                        </div>
                        <div style="font-weight:600;font-size:16px;color:${r.delta > 0 ? '#34c759' : '#ff3b30'};">
                            ${r.delta > 0 ? '+' : ''}${r.delta}
                        </div>
                    </div>`).join('');
            });
        }
    },

    // 编辑用户名
    _editUsername() {
        const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getCurrentUser() : null;
        if (!user) return;
        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:340px;">
                <div class="ui-modal-title">修改用户名</div>
                <div class="ui-modal-body">
                    <input type="text" id="usernameInput" value="${user.username || ''}" maxlength="20"
                        style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:16px;box-sizing:border-box;outline:none;">
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-cancel">取消</button>
                    <button class="ui-modal-btn ui-modal-confirm">保存</button>
                </div>
            </div>`;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));
        const input = mask.querySelector('#usernameInput');
        input.focus();
        input.select();
        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        mask.querySelector('.ui-modal-cancel').onclick = close;
        mask.querySelector('.ui-modal-confirm').onclick = async () => {
            const newName = input.value.trim();
            if (!newName) {
                UiKit.toast('用户名不能为空', 'error');
                return;
            }
            if (newName === user.username) {
                close();
                return;
            }
            const { error } = await supabase.from('profiles').update({ username: newName }).eq('id', user.id);
            if (error) {
                UiKit.toast('保存失败：' + error.message, 'error');
                return;
            }
            user.username = newName;
            UiKit.toast('用户名已更新', 'success');
            this._renderAuthUser();
            EventBus.emit('auth:changed', { user, event: 'PROFILE_UPDATED' });
            close();
        };
        mask.onclick = (e) => { if (e.target === mask) close(); };
        input.onkeydown = (e) => {
            if (e.key === 'Enter') mask.querySelector('.ui-modal-confirm').click();
        };
    },

    // 等级机制说明
    _showLevelInfo() {
        const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getCurrentUser() : null;
        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:360px;">
                <div class="ui-modal-title">等级与特权</div>
                <div class="ui-modal-body" style="padding:16px;">
                    <div style="padding:8px 0 16px;text-align:center;border-bottom:1px solid #eee;">
                        <div style="font-size:13px;color:#999;">当前等级</div>
                        <div style="font-size:24px;font-weight:700;color:#1989fa;margin-top:4px;">Lv.${user?.level || 1} ${this._levelName(user?.level || 1)}</div>
                    </div>
                    <div style="padding:12px 0;">
                        <div style="font-weight:600;margin-bottom:8px;color:#333;">升级机制</div>
                        <div style="font-size:13px;color:#666;line-height:1.8;">
                            · 1 积分 = 1 经验<br>
                            · 等级曲线递减（越往后越慢）<br>
                            · 发布内容、被互动获得积分<br>
                            · 完成新手任务可快速升级
                        </div>
                    </div>
                    <div style="padding:12px 0;border-top:1px solid #eee;">
                        <div style="font-weight:600;margin-bottom:8px;color:#333;">等级特权</div>
                        <div style="font-size:13px;color:#666;line-height:1.8;">
                            · Lv4：PDF 导出<br>
                            · Lv6：自定义标签<br>
                            · Lv8：个人主页装扮<br>
                            · Lv9：专题合集创建<br>
                            · Lv10：首页推荐加权<br>
                            · Lv12：认证规划师标识
                        </div>
                    </div>
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-confirm" style="flex:1;">知道了</button>
                </div>
            </div>`;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));
        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };
        mask.querySelector('.ui-modal-confirm').onclick = close;
        mask.onclick = (e) => { if (e.target === mask) close(); };
    },

    _renderMenuGroups() {
        const container = document.getElementById('profileMenuContainer');
        if (!container) return;

        const isExpMode = localStorage.getItem('expMode') === 'true';
        const collapsed = this._loadCollapsedState();

        const icons = {
            follow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            fans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
            vote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M9 5v14"/><path d="M15 5v14"/></svg>',
            event: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            level: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
            task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
            collection: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>',
            gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
            tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><circle cx="7" cy="7" r="2"/></svg>',
            theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M13.5 9c-3.5 0-6.5 2.5-7 6l-2 7 7-2c3.5-.5 6.5-3.5 7-7Z"/></svg>',
            book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
            poi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>',
            shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
            star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
            cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
            settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
            palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M13.5 9c-3.5 0-6.5 2.5-7 6l-2 7 7-2c3.5-.5 6.5-3.5 7-7Z"/></svg>'
        };

        const groups = [
            {
                id: 'community',
                title: '社区互动',
                collapsible: true,
                items: [
                    { icon: icons.follow, label: '我的关注', action: "ProfileModule.openFollows()" },
                    { icon: icons.fans, label: '我的粉丝', action: "ProfileModule.openFollowers()" },
                    { icon: icons.vote, label: '签到投票', badge: '+3票/天', badgeType: 'orange', action: "Voting.openPanel()" },
                    { icon: icons.event, label: '月度活动', action: "Items.openEvents()" },
                ]
            },
            {
                id: 'growth',
                title: '成长体系',
                collapsible: true,
                items: [
                    { icon: icons.level, label: '等级特权', action: "LevelSystem.openPrivilegesPanel()" },
                    { icon: icons.task, label: '新手任务', badge: '+345 EXP', badgeType: 'green', action: "NewbieTasks.openPanel()" },
                    { icon: icons.gift, label: '道具收藏柜', action: "Items.openCollection()" },
                    { icon: icons.star, label: '体验全部特权', badge: isExpMode ? '已开启' : '未开启', badgeType: 'green', id: 'expModeMenu', action: "ProfileModule.toggleExpMode()" },
                ]
            },
            {
                id: 'more',
                title: '更多功能',
                collapsible: true,
                items: [
                    { icon: icons.tag, label: '专属标签', badge: 'Lv6', badgeType: 'orange', action: "LevelSystem.requirePrivilege('custom_tags') && AdvancedPrivileges.openTagEditor()" },
                    { icon: icons.theme, label: '主页装扮', badge: 'Lv8', badgeType: 'orange', action: "LevelSystem.requirePrivilege('profile_theme') && AdvancedPrivileges.openThemePicker()" },
                    { icon: icons.book, label: '专题合集', badge: 'Lv9', badgeType: 'orange', action: "LevelSystem.requirePrivilege('collection_set') && AdvancedPrivileges.openCollections()" },
                    { icon: icons.poi, label: 'POI 专题', action: "PoiTopic.openList()" },
                    { icon: icons.palette, label: '主题皮肤', action: "ProfileModule.openThemes()" },
                    { icon: icons.shield, label: '内容审核', id: 'adminModerationMenu', hidden: true, action: "Moderation.openPanel()" },
                ]
            },
            {
                id: 'settings',
                title: '通用设置',
                collapsible: false,
                items: [
                    { type: 'switch', icon: icons.star, label: 'AI智能建议', id: 'aiSuggestToggle', action: "ProfileModule.toggleAiSuggest(this.checked)" },
                    { icon: icons.cloud, label: '云端用量', action: "ProfileModule.showCloudUsage()" },
                    { icon: icons.settings, label: '更多设置', action: "ProfileModule.openMoreSettings()" },
                ]
            },
        ];

        let html = '';
        groups.forEach(group => {
            const isCollapsed = group.collapsible && collapsed.has(group.id);
            const toggleIcon = group.collapsible
                ? `<span class="psh-toggle ${isCollapsed ? 'collapsed' : ''}" id="toggle-${group.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                   </span>`
                : '';
            const headerClick = group.collapsible
                ? `onclick="ProfileModule.toggleMenuGroup('${group.id}')"`
                : '';

            html += `
                <div class="profile-menu-section">
                    <div class="profile-section-header" ${headerClick}>
                        <span class="psh-title">${group.title}</span>
                        ${toggleIcon}
                    </div>
                    <div class="profile-ticket-card" id="group-${group.id}" style="${isCollapsed ? 'display:none;' : ''}">
                        ${group.items.map(item => {
                            if (item.hidden) return '';
                            if (item.type === 'switch') {
                                return `
                                    <div class="pt-item pt-item-switch" ${item.id ? `id="${item.id}"` : ''}>
                                        <div class="pt-icon">${item.icon}</div>
                                        <span class="pt-label">${item.label}</span>
                                        <label class="switch">
                                            <input type="checkbox" ${item.id ? `id="${item.id}"` : ''} checked onchange="${item.action}">
                                            <span class="switch-slider"></span>
                                        </label>
                                    </div>
                                `;
                            }
                            const badge = item.badge
                                ? `<span class="pt-badge pt-badge-${item.badgeType || 'orange'}">${item.badge}</span>`
                                : '';
                            return `
                                <div class="pt-item" ${item.id ? `id="${item.id}"` : ''} onclick="${item.action}">
                                    <div class="pt-icon">${item.icon}</div>
                                    <span class="pt-label">${item.label}</span>
                                    ${badge}
                                    <span class="pt-arrow">›</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    toggleMenuGroup(groupId) {
        const group = document.getElementById('group-' + groupId);
        const toggle = document.getElementById('toggle-' + groupId);
        if (!group || !toggle) return;

        const collapsed = this._loadCollapsedState();
        if (collapsed.has(groupId)) {
            collapsed.delete(groupId);
            group.style.display = '';
            toggle.classList.remove('collapsed');
        } else {
            collapsed.add(groupId);
            group.style.display = 'none';
            toggle.classList.add('collapsed');
        }
        this._saveCollapsedState();
    },

    toggleAiSuggest(enabled) {
        localStorage.setItem('aiSuggestEnabled', enabled ? 'true' : 'false');
        document.querySelectorAll('.ai-inline-suggestion').forEach(el => el.style.display = enabled ? 'flex' : 'none');
        document.querySelectorAll('.ai-tips-toggle').forEach(el => el.style.display = enabled ? 'inline-flex' : 'none');
        UiKit.toast(enabled ? 'AI智能建议已开启' : 'AI智能建议已关闭', 'info');
    },

    async showCloudUsage() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录查看云端用量', 'info');
            return;
        }
        UiKit.showLoading('加载中...');
        try {
            const trips = AIMemory.getAllTrips();
            const tripArr = Object.values(trips);
            const totalTrips = tripArr.length;
            const syncedTrips = tripArr.filter(t => t.cloudId).length;
            const deletedTrips = tripArr.filter(t => t.deletedAt).length;
            
            // 估算存储大小（简单估算：每个行程约 50KB）
            const estimatedSizeKB = totalTrips * 50;
            const sizeText = estimatedSizeKB >= 1024 
                ? (estimatedSizeKB / 1024).toFixed(1) + ' MB' 
                : estimatedSizeKB + ' KB';
            
            const html = `
                <div style="padding: 8px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;color:#fff;margin-bottom:20px;">
                        <div>
                            <div style="font-size:13px;opacity:0.85;margin-bottom:4px;">云端存储用量</div>
                            <div style="font-size:28px;font-weight:700;">${sizeText}</div>
                        </div>
                        <div style="font-size:48px;opacity:0.3;">☁️</div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                        <div style="padding:14px;background:#f8f9fa;border-radius:10px;text-align:center;">
                            <div style="font-size:22px;font-weight:700;color:#333;">${totalTrips - deletedTrips}</div>
                            <div style="font-size:12px;color:#999;margin-top:2px;">我的行程</div>
                        </div>
                        <div style="padding:14px;background:#f8f9fa;border-radius:10px;text-align:center;">
                            <div style="font-size:22px;font-weight:700;color:#667eea;">${syncedTrips}</div>
                            <div style="font-size:12px;color:#999;margin-top:2px;">已同步云端</div>
                        </div>
                    </div>
                    <div style="background:#fff8e1;border-radius:10px;padding:12px 14px;margin-bottom:20px;">
                        <div style="font-size:13px;color:#f57c00;font-weight:600;margin-bottom:4px;">💡 同步说明</div>
                        <div style="font-size:12px;color:#e65100;line-height:1.6;">
                            · 发布到社区的行程会自动同步到云端<br>
                            · 云端存储方便多设备访问和数据备份<br>
                            · 批量同步可一次性备份所有行程
                        </div>
                    </div>
                    <button onclick="ProfileModule._startBatchSync()" style="width:100%;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">
                        🚀 一键批量同步所有行程
                    </button>
                </div>
            `;
            UiKit.hideLoading();
            if (typeof UIRender !== 'undefined' && UIRender.showAlertModal) {
                UIRender.showAlertModal('云端用量', html);
            } else {
                UiKit.showModal('云端用量', html, { showConfirm: false, showCancel: true, cancelText: '关闭' });
            }
        } catch (e) {
            UiKit.hideLoading();
            UiKit.toast('加载失败，请稍后重试', 'error');
            console.error('[Profile] 加载云端用量失败:', e);
        }
    },

    openMoreSettings() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            return;
        }
        const user = Auth.getCurrentUser();
        const syncEnabled = localStorage.getItem('cloud_sync_enabled') !== 'false';
        const localTrips = typeof StorageMigrate !== 'undefined' ? StorageMigrate.getLocalTripCount() : 0;

        const html = `
            <div style="padding: 4px 0;">
                <div style="font-size:13px;font-weight:600;color:#999;margin-bottom:10px;padding:0 4px;">账号</div>
                <div style="background:#f8f9fa;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                    <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;" onclick="ProfileModule._editUsername()">
                        <div style="flex:1;font-size:14px;color:#333;">用户名</div>
                        <div style="font-size:13px;color:#999;margin-right:4px;">${user.username || '--'}</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                    <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;" onclick="ProfileModule._changePassword()">
                        <div style="flex:1;font-size:14px;color:#333;">修改密码</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                    <div style="display:flex;align-items:center;padding:14px 16px;" onclick="Auth.signOut()">
                        <div style="flex:1;font-size:14px;color:#333;">退出登录</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                </div>

                <div style="font-size:13px;font-weight:600;color:#999;margin-bottom:10px;padding:0 4px;">云端同步</div>
                <div style="background:#f8f9fa;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                    <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;">
                        <div style="flex:1;">
                            <div style="font-size:14px;color:#333;">自动同步</div>
                            <div style="font-size:11px;color:#999;margin-top:2px;">开启后变更自动同步到云端</div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" ${syncEnabled ? 'checked' : ''} onchange="ProfileModule.toggleCloudSync(this.checked)">
                            <span class="switch-slider"></span>
                        </label>
                    </div>
                    <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;" onclick="ProfileModule._syncFromCloud()">
                        <div style="flex:1;font-size:14px;color:#333;">从云端同步</div>
                        <div style="font-size:12px;color:#999;margin-right:4px;">拉取云端数据</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                    <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;" onclick="ProfileModule._syncToCloud()">
                        <div style="flex:1;font-size:14px;color:#333;">上传到云端</div>
                        <div style="font-size:12px;color:#999;margin-right:4px;">备份本地数据</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                    <div style="display:flex;align-items:center;padding:14px 16px;" onclick="ProfileModule._importLocalToCloud()">
                        <div style="flex:1;font-size:14px;color:#333;">导入本地行程</div>
                        <div style="font-size:12px;color:#999;margin-right:4px;">${localTrips} 条待导入</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                </div>

                <div style="font-size:13px;font-weight:600;color:#999;margin-bottom:10px;padding:0 4px;">其他</div>
                <div style="background:#f8f9fa;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                    <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;" onclick="ProfileModule._clearCache()">
                        <div style="flex:1;font-size:14px;color:#333;">清除缓存</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                    <div style="display:flex;align-items:center;padding:14px 16px;" onclick="ProfileModule._about()">
                        <div style="flex:1;font-size:14px;color:#333;">关于哇途</div>
                        <div style="font-size:12px;color:#999;margin-right:4px;">v1.0.0</div>
                        <span style="color:#ccc;font-size:16px;">›</span>
                    </div>
                </div>

                <button onclick="ProfileModule._deleteAccount()" style="width:100%;padding:14px;background:#fff;color:#FF3B30;border:1px solid #FFE5E5;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">
                    注销账户
                </button>
            </div>
        `;

        if (typeof UIRender !== 'undefined' && UIRender.showAlertModal) {
            UIRender.showAlertModal('更多设置', html);
        } else {
            UiKit.showModal('更多设置', html, { showConfirm: false, showCancel: true, cancelText: '关闭' });
        }
    },

    toggleCloudSync(enabled) {
        localStorage.setItem('cloud_sync_enabled', enabled ? 'true' : 'false');
        UiKit.toast(enabled ? '已开启自动同步' : '已关闭自动同步', 'success', 1500);
    },

    async _syncFromCloud() {
        if (typeof UIRender !== 'undefined' && UIRender.closeAlertModal) {
            UIRender.closeAlertModal();
        }
        if (typeof TripStorage === 'undefined' || typeof Auth === 'undefined') {
            UiKit.toast('同步模块未就绪', 'error');
            return;
        }
        const user = Auth.getCurrentUser();
        if (!user) return;
        UiKit.showLoading('正在从云端同步...');
        try {
            const r = await TripStorage.syncFromCloud(user.id);
            UiKit.hideLoading();
            UiKit.toast(`同步完成：合并 ${r.merged || 0} 条`, 'success', 2000);
            if (typeof TripsModule !== 'undefined') TripsModule.render();
            if (typeof HomeModule !== 'undefined') HomeModule.render();
        } catch (e) {
            UiKit.hideLoading();
            UiKit.toast('同步失败：' + e.message, 'error');
        }
    },

    async _syncToCloud() {
        if (typeof UIRender !== 'undefined' && UIRender.closeAlertModal) {
            UIRender.closeAlertModal();
        }
        this.batchSyncToCloud();
    },

    async _importLocalToCloud() {
        if (typeof UIRender !== 'undefined' && UIRender.closeAlertModal) {
            UIRender.closeAlertModal();
        }
        if (typeof StorageMigrate === 'undefined' || typeof Auth === 'undefined') {
            UiKit.toast('功能未就绪', 'error');
            return;
        }
        const user = Auth.getCurrentUser();
        if (!user) return;
        const count = StorageMigrate.getLocalTripCount();
        if (count === 0) {
            UiKit.toast('没有可导入的本地行程', 'info');
            return;
        }
        const confirmed = await UiKit.confirm(
            `检测到本地有 ${count} 条行程，是否导入到云端？<br><span style="font-size:12px;color:#999;">导入后可在多设备访问，本地数据保留不删除</span>`,
            { title: '导入本地行程', confirmText: '导入', cancelText: '取消' }
        );
        if (!confirmed) return;
        StorageMigrate.resetMigration(user.id);
        await StorageMigrate.checkAndMigrate(user.id);
        if (typeof TripsModule !== 'undefined') TripsModule.render();
    },

    _clearCache() {
        UiKit.confirm('确定要清除本地缓存吗？<br><span style="font-size:12px;color:#999;">仅清除临时缓存，行程数据不会删除</span>', {
            title: '清除缓存',
            confirmText: '清除',
            cancelText: '取消'
        }).then(ok => {
            if (!ok) return;
            const keysToKeep = ['trip_history', 'trip_custom_prefs', 'trip_tags', 'theme_color', 'home_widgets', 'cloud_sync_enabled'];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key) && !key.startsWith('trip_migrated_') && !key.startsWith('trip_')) {
                    localStorage.removeItem(key);
                }
            });
            UiKit.toast('缓存已清除', 'success', 1500);
        });
    },

    _about() {
        UiKit.alert('哇途·AI旅行规划<br><br>版本 v1.0.0<br>让每一次旅行都充满惊喜 ✨', { title: '关于哇途' });
    },

    async _deleteAccount() {
        if (typeof UIRender !== 'undefined' && UIRender.closeAlertModal) {
            UIRender.closeAlertModal();
        }
        const confirmed1 = await UiKit.confirm(
            '注销账户后，您的所有数据将被永久删除，无法恢复。确定要继续吗？',
            { title: '注销账户', confirmText: '确定注销', cancelText: '再想想' }
        );
        if (!confirmed1) return;

        const input = await UiKit.prompt('请输入"确认注销"以继续：', {
            title: '二次确认',
            placeholder: '请输入确认注销',
            confirmText: '确认',
            cancelText: '取消'
        });
        if (!input || input.trim() !== '确认注销') {
            UiKit.toast('输入不正确，已取消', 'info');
            return;
        }

        UiKit.showLoading('正在注销...');
        try {
            if (typeof Auth !== 'undefined' && typeof supabase !== 'undefined') {
                const user = Auth.getCurrentUser();
                if (user) {
                    await supabase.from('profiles').delete().eq('id', user.id);
                    await supabase.auth.admin.deleteUser(user.id).catch(() => {});
                }
            }
            localStorage.clear();
            UiKit.hideLoading();
            UiKit.toast('账户已注销', 'info', 2000);
            setTimeout(() => location.reload(), 1500);
        } catch (e) {
            UiKit.hideLoading();
            UiKit.toast('注销失败：' + e.message, 'error');
        }
    },

    _editUsername() {
        UiKit.toast('功能开发中', 'info');
    },

    _changePassword() {
        UiKit.toast('功能开发中', 'info');
    },

    _startBatchSync() {
        if (typeof UIRender !== 'undefined' && UIRender.closeAlertModal) {
            UIRender.closeAlertModal();
        }
        this.batchSyncToCloud();
    },

    async batchSyncToCloud() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            return;
        }
        if (typeof TripStorage === 'undefined') {
            UiKit.toast('同步模块未就绪', 'error');
            return;
        }
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips).filter(t => !t.deletedAt && !t.cloudId);
        if (tripArr.length === 0) {
            UiKit.toast('所有行程都已同步到云端啦 ✨', 'success');
            return;
        }
        const ok = await UiKit.confirm(`确定要将 ${tripArr.length} 个行程同步到云端吗？`, { title: '批量同步', confirmText: '开始同步', cancelText: '取消' });
        if (!ok) return;
        
        UiKit.showLoading(`同步中... 0/${tripArr.length}`);
        let successCount = 0;
        let failCount = 0;
        for (let i = 0; i < tripArr.length; i++) {
            const trip = tripArr[i];
            UiKit.showLoading(`同步中... ${i + 1}/${tripArr.length}`);
            try {
                const result = await TripStorage.syncToCloud(trip, Auth.getUserId());
                if (result.success && result.id) {
                    trip.cloudId = result.id;
                    AIMemory.saveTrip(trip);
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (e) {
                failCount++;
                console.error('[BatchSync] 同步失败:', trip.id, e);
            }
            // 稍微延迟一下，避免请求太频繁
            await new Promise(r => setTimeout(r, 200));
        }
        UiKit.hideLoading();
        UiKit.toast(`同步完成：成功 ${successCount} 个，失败 ${failCount} 个`, successCount > 0 ? 'success' : 'error');
        TripsModule.renderTripCards();
    },

    // 等级名称映射（与数据库 schema 对齐）
    _levelName(lv) {
        const map = {
            1: '萌新探索者', 2: '初心行者', 3: '进阶旅人',
            4: '资深探索者', 5: '环球旅行家',
            6: '自定义标签', 8: '主题特权', 10: '首页加权',
            12: '认证规划师',
        };
        return map[lv] || '探索者';
    },

    _level(pts) {
        if (pts >= 1000) return { num: 5, name: '环球旅行家' };
        if (pts >= 600) return { num: 4, name: '资深探索者' };
        if (pts >= 300) return { num: 3, name: '进阶旅人' };
        if (pts >= 100) return { num: 2, name: '初心行者' };
        return { num: 1, name: '萌新探索者' };
    },

    _getFavorites() {
        try { return JSON.parse(localStorage.getItem('user_favorites') || '[]'); }
        catch { return []; }
    },
    _addFavorite(tplId) {
        const favs = this._getFavorites();
        if (!favs.includes(tplId)) {
            favs.push(tplId);
            localStorage.setItem('user_favorites', JSON.stringify(favs));
        }
    },
    _removeFavorite(tplId) {
        const favs = this._getFavorites().filter(f => f !== tplId);
        localStorage.setItem('user_favorites', JSON.stringify(favs));
    },

    _getMyPosts() {
        try { return JSON.parse(localStorage.getItem('user_posts') || '[]'); }
        catch { return []; }
    },

    // ===== 主题皮肤 =====
    _themes: [
        { id: 'orange',  name: '暖橙',   brand: '#FF8A3D', light: '#FFB983', dark: '#E87025' },
        { id: 'ocean',   name: '海洋蓝', brand: '#3B82F6', light: '#93C5FD', dark: '#2563EB' },
        { id: 'forest',  name: '森林绿', brand: '#10B981', light: '#6EE7B7', dark: '#059669' },
        { id: 'sakura',  name: '樱花粉', brand: '#EC4899', light: '#F9A8D4', dark: '#DB2777' },
        { id: 'sunset',  name: '日落红', brand: '#EF4444', light: '#FCA5A5', dark: '#DC2626' },
        { id: 'grape',   name: '葡萄紫', brand: '#8B5CF6', light: '#C4B5FD', dark: '#7C3AED' },
    ],

    openThemes() {
        const current = localStorage.getItem('app_theme') || 'orange';
        const html = `<div class="theme-grid">` + this._themes.map(t => `
            <div class="theme-swatch ${t.id === current ? 'active' : ''}" onclick="ProfileModule.applyTheme('${t.id}')">
                <div class="swatch-circle" style="background:linear-gradient(135deg, ${t.light}, ${t.brand});">
                    ${t.id === current ? '<span class="swatch-check">✓</span>' : ''}
                </div>
                <div class="swatch-name">${t.name}</div>
            </div>
        `).join('') + `</div>`;
        UIRender.showAlertModal('主题皮肤', html);
    },

    applyTheme(id) {
        const t = this._themes.find(x => x.id === id);
        if (!t) return;
        const root = document.documentElement;
        root.style.setProperty('--brand', t.brand);
        root.style.setProperty('--brand-light', t.light);
        root.style.setProperty('--brand-dark', t.dark);
        root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${t.light} 0%, ${t.brand} 50%, ${t.dark} 100%)`);
        localStorage.setItem('app_theme', id);
        // 关闭弹窗并重新打开以更新选中态
        const modal = document.getElementById('alertModal');
        if (modal) { modal.classList.remove('show'); setTimeout(() => modal.style.display = 'none', 200); }
        UIRender.showToast('已切换为「' + t.name + '」主题');
        setTimeout(() => this.openThemes(), 250);
    },

    restoreTheme() {
        const id = localStorage.getItem('app_theme');
        if (id && id !== 'orange') this.applyTheme(id);
    },

    // ===== Phase 5.4：体验模式开关 =====
    toggleExpMode() {
        if (typeof LevelSystem === 'undefined') return;
        const enabled = LevelSystem.toggleExperienceMode();
        UiKit.toast(
            enabled ? '🎁 体验模式已开启：全部特权可试用' : '体验模式已关闭',
            'info', 2200
        );
        this._updateExpModeTag();
        // 刷新等级特权面板（若开着）
        const modal = document.getElementById('alertModal');
        if (modal && modal.classList.contains('show')) {
            modal.classList.remove('show');
            setTimeout(() => LevelSystem.openPrivilegesPanel(), 250);
        }
    },

    _updateExpModeTag() {
        const tagEl = document.getElementById('expModeTag');
        if (!tagEl || typeof LevelSystem === 'undefined') return;
        const enabled = LevelSystem.isExperienceMode();
        tagEl.textContent = enabled ? '已开启' : '未开启';
        tagEl.style.color = enabled ? '#34C759' : '#999';
    },

    // ===== 成就徽章 =====
    _badges: [
        { id: 'firstCity',    icon: '🌆', name: '初见之城',   desc: '去过第1个城市',        cat: 'city',   check: s => s.cities >= 1 },
        { id: 'threeCities',  icon: '🏙️', name: '三城记',     desc: '去过3个不同城市',      cat: 'city',   check: s => s.cities >= 3 },
        { id: 'fiveCities',   icon: '🌉', name: '五湖四海',   desc: '去过5个城市',          cat: 'city',   check: s => s.cities >= 5 },
        { id: 'tenCities',    icon: '🗺️', name: '十城行者',   desc: '去过10个城市',         cat: 'city',   check: s => s.cities >= 10 },
        { id: 'firstCheckin', icon: '📍', name: '初次打卡',   desc: '第1次实地打卡',        cat: 'checkin',check: s => s.checkins >= 1 },
        { id: 'checkin10',    icon: '🏃', name: '打卡达人',   desc: '累计打卡10个地点',     cat: 'checkin',check: s => s.checkins >= 10 },
        { id: 'checkin30',    icon: '🚶', name: '足迹遍布',   desc: '累计打卡30个地点',     cat: 'checkin',check: s => s.checkins >= 30 },
        { id: 'firstPhoto',   icon: '📷', name: '第一张照片', desc: '上传第1张旅行照片',    cat: 'memory', check: s => s.photos >= 1 },
        { id: 'photo20',      icon: '📸', name: '摄影师',     desc: '累计20张旅行照片',     cat: 'memory', check: s => s.photos >= 20 },
        { id: 'note5',        icon: '✍️', name: '记录者',     desc: '写了5篇旅行笔记',      cat: 'memory', check: s => s.notes >= 5 },
        { id: 'firstTrip',    icon: '🎒', name: '初次启程',   desc: '创建第1个行程',        cat: 'trip',   check: s => s.trips >= 1 },
        { id: 'days10',       icon: '✈️', name: '远行客',     desc: '累计旅行10天',         cat: 'trip',   check: s => s.days >= 10 },
    ],

    async openAchievements() {
        const trips = AIMemory.getAllTrips();
        const tripArr = Object.values(trips);
        let spots = 0, days = 0;
        const citySet = new Set();
        let photos = 0, notes = 0;
        tripArr.forEach(t => {
            days += t.dayPlans?.length || 0;
            t.dayPlans?.forEach(dp => {
                if (dp.city) citySet.add(dp.city);
                spots += dp.spots?.length || 0;
                dp.spots?.forEach(sp => {
                    if (sp.record?.photos) photos += sp.record.photos.length;
                    if (sp.record?.notes && sp.record.notes.length > 0) {
                        notes += sp.record.notes.filter(n => n.content && n.content.trim()).length;
                    }
                });
            });
        });

        let checkins = 0;
        const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getCurrentUser() : null;
        if (user && window.supabase) {
            try {
                const { count } = await supabase
                    .from('checkins')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                checkins = count || 0;
            } catch (e) {
                console.warn('[Achievements] 加载打卡数失败:', e);
            }
        }

        const stats = {
            trips: tripArr.length,
            spots,
            cities: citySet.size,
            days,
            checkins,
            photos,
            notes,
            points: tripArr.length * 100 + spots * 10 + days * 20
        };

        const earned = this._badges.filter(b => b.check(stats)).length;
        const catLabels = { city: '城市探索', checkin: '打卡足迹', memory: '回忆记录', trip: '旅程深度' };
        const cats = ['city', 'checkin', 'memory', 'trip'];

        let html = `<div style="margin-bottom:16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${earned}<span style="font-size:14px;color:#999;">/${this._badges.length}</span></div>
            <div style="font-size:12px;color:#999;margin-top:2px;">已解锁徽章</div>
        </div>`;

        cats.forEach(cat => {
            const catBadges = this._badges.filter(b => b.cat === cat);
            const catEarned = catBadges.filter(b => b.check(stats)).length;
            html += `
                <div style="margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${catLabels[cat]}</span>
                        <span style="font-size:11px;color:#999;">${catEarned}/${catBadges.length}</span>
                    </div>
                    <div class="badge-grid" style="grid-template-columns:repeat(${catBadges.length}, 1fr);gap:8px;">
                        ${catBadges.map(b => {
                            const got = b.check(stats);
                            return `<div class="badge-item ${got ? 'earned' : 'locked'}" style="padding:8px 4px;">
                                <div class="badge-icon" style="font-size:24px;">${got ? b.icon : '🔒'}</div>
                                <div class="badge-name" style="font-size:11px;">${b.name}</div>
                                <div class="badge-desc" style="font-size:10px;">${b.desc}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        const progress = Math.round((earned / this._badges.length) * 100);
        html += `
            <div style="margin-top:12px;padding:12px;background:#fff8f3;border-radius:12px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                    <span style="color:#666;">收集进度</span>
                    <span style="color:var(--brand);font-weight:600;">${progress}%</span>
                </div>
                <div style="height:6px;background:#ffe8d6;border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,var(--brand-light),var(--brand));border-radius:3px;transition:width 0.5s;"></div>
                </div>
            </div>
        `;

        UIRender.showAlertModal('成就徽章', html);
    },

    // ===== 我的收藏（云端：行程+游记）=====
    async openFavorites(withFilters) {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            Auth.requireAuth();
            return;
        }
        const user = Auth.getCurrentUser();
        UiKit.showLoading('加载中...');
        try {
            // 查询收藏表（行程+游记）
            const [tripFavRes, noteFavRes] = await Promise.all([
                supabase.from('favorites')
                    .select('id, target_id, created_at')
                    .eq('user_id', user.id)
                    .eq('target_type', 'template'),
                supabase.from('favorites')
                    .select('id, target_id, created_at')
                    .eq('user_id', user.id)
                    .eq('target_type', 'note')
            ]);
            const tripFavs = tripFavRes.data || [];
            const noteFavs = noteFavRes.data || [];

            // 查询对应的行程和游记详情
            let favTrips = [];
            let favNotes = [];
            if (tripFavs.length > 0) {
                const tripIds = tripFavs.map(f => f.target_id);
                const { data: td } = await supabase.from('trip_templates')
                    .select('id, title, destination, city, days, likes, copies, suitable_for, author_id, profiles:author_id(username)')
                    .in('id', tripIds)
                    .eq('status', 'published');
                favTrips = td || [];
            }
            if (noteFavs.length > 0) {
                const noteIds = noteFavs.map(f => f.target_id);
                const { data: nd } = await supabase.from('travel_notes')
                    .select('id, title, destination, cover_image, cover_emoji, views, likes, author_id, profiles:author_id(username)')
                    .in('id', noteIds)
                    .eq('status', 'published');
                favNotes = nd || [];
            }
            UiKit.hideLoading();
            this._renderFavoritesModal(favTrips, favNotes, tripFavs, noteFavs, withFilters);
        } catch (e) {
            UiKit.hideLoading();
            console.error('[Profile] 加载收藏失败:', e);
            UiKit.toast('加载失败', 'error');
        }
    },

    _renderFavoritesModal(trips, notes, tripFavs, noteFavs, withFilters) {
        const self = this;
        const allTrips = trips;
        const allNotes = notes;

        const destinations = [...new Set([
            ...allTrips.map(t => t.destination || t.city || '').filter(Boolean),
            ...allNotes.map(n => n.destination || '').filter(Boolean)
        ])].slice(0, 8);

        const _filterTrips = (keyword, dest, daysRange) => {
            return allTrips.filter(t => {
                if (keyword && !(t.title || '').toLowerCase().includes(keyword.toLowerCase())) return false;
                if (dest && dest !== 'all' && (t.destination || t.city || '') !== dest) return false;
                if (daysRange && daysRange !== 'all') {
                    const days = t.days || 1;
                    if (daysRange === 'short' && days > 3) return false;
                    if (daysRange === 'medium' && (days < 4 || days > 7)) return false;
                    if (daysRange === 'long' && days < 8) return false;
                }
                return true;
            });
        };

        const _filterNotes = (keyword, dest) => {
            return allNotes.filter(n => {
                if (keyword && !(n.title || '').toLowerCase().includes(keyword.toLowerCase())) return false;
                if (dest && dest !== 'all' && (n.destination || '') !== dest) return false;
                return true;
            });
        };

        const _renderTripList = (list) => {
            if (list.length === 0) {
                return `<div class="profile-empty"><div class="profile-empty-icon">🔍</div><div class="profile-empty-title">没有找到匹配的行程</div><div class="profile-empty-desc">试试换个关键词或筛选条件</div></div>`;
            }
            return `<div class="profile-list">` + list.map(t => {
                const authorName = (t.profiles && t.profiles.username) || '旅行者';
                return `<div class="profile-list-item" onclick="App.openCloudTrip('${t.id}');document.getElementById('alertModal').classList.remove('show')">
                    <div class="pli-cover" style="background:#FFE5B4">🗺️</div>
                    <div class="pli-info">
                        <div class="pli-title">${t.title}</div>
                        <div class="pli-meta">${t.destination || t.city || ''} · ${t.days || 1}天 · ${authorName}</div>
                    </div>
                </div>`;
            }).join('') + `</div>`;
        };

        const _renderNoteList = (list) => {
            if (list.length === 0) {
                return `<div class="profile-empty"><div class="profile-empty-icon">🔍</div><div class="profile-empty-title">没有找到匹配的游记</div><div class="profile-empty-desc">试试换个关键词或筛选条件</div></div>`;
            }
            return `<div class="profile-list">` + list.map(n => {
                const authorName = (n.profiles && n.profiles.username) || '旅行者';
                const coverStyle = n.cover_image
                    ? `background-image:url('${n.cover_image}');background-size:cover;background-position:center;`
                    : `background:linear-gradient(135deg,#fdf6e3,#ffe8d6);`;
                return `<div class="profile-list-item" onclick="TravelNote.view('${n.id}');document.getElementById('alertModal').classList.remove('show')">
                    <div class="pli-cover" style="${coverStyle}">${n.cover_image ? '' : (n.cover_emoji || '✍️')}</div>
                    <div class="pli-info">
                        <div class="pli-title">${n.title}</div>
                        <div class="pli-meta">${n.destination || '游记'} · ${authorName}</div>
                    </div>
                </div>`;
            }).join('') + `</div>`;
        };

        const filterHtml = withFilters ? `
            <div class="fav-search-bar" style="margin-bottom:12px;">
                <input type="text" id="favSearchInput" placeholder="搜索标题或目的地..."
                    style="width:100%;padding:10px 14px;border:1px solid #eee;border-radius:12px;font-size:14px;box-sizing:border-box;outline:none;background:#f9f9f9;">
            </div>
            <div class="fav-filter-section" style="margin-bottom:12px;">
                <div class="fav-filter-label" style="font-size:12px;color:#999;margin-bottom:6px;">目的地</div>
                <div class="fav-tag-list" id="favDestTags" style="display:flex;gap:6px;flex-wrap:wrap;">
                    <span class="fav-tag active" data-dest="all" style="padding:4px 12px;background:#fff3ea;color:#ff8a3d;border-radius:999px;font-size:12px;cursor:pointer;">全部</span>
                    ${destinations.map(d => `<span class="fav-tag" data-dest="${d}" style="padding:4px 12px;background:#f5f5f7;color:#666;border-radius:999px;font-size:12px;cursor:pointer;">${d}</span>`).join('')}
                </div>
            </div>
            <div class="fav-filter-section" id="favDaysFilter" style="margin-bottom:12px;">
                <div class="fav-filter-label" style="font-size:12px;color:#999;margin-bottom:6px;">行程天数</div>
                <div class="fav-tag-list" style="display:flex;gap:6px;flex-wrap:wrap;">
                    <span class="fav-days-tag active" data-days="all" style="padding:4px 12px;background:#fff3ea;color:#ff8a3d;border-radius:999px;font-size:12px;cursor:pointer;">全部</span>
                    <span class="fav-days-tag" data-days="short" style="padding:4px 12px;background:#f5f5f7;color:#666;border-radius:999px;font-size:12px;cursor:pointer;">1-3天</span>
                    <span class="fav-days-tag" data-days="medium" style="padding:4px 12px;background:#f5f5f7;color:#666;border-radius:999px;font-size:12px;cursor:pointer;">4-7天</span>
                    <span class="fav-days-tag" data-days="long" style="padding:4px 12px;background:#f5f5f7;color:#666;border-radius:999px;font-size:12px;cursor:pointer;">7天以上</span>
                </div>
            </div>
        ` : '';

        const html = `
            ${filterHtml}
            <div class="my-posts-tabs" style="display:flex;border-bottom:1px solid #eee;margin-bottom:12px;">
                <button class="mp-tab active" data-tab="trips" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:#ff8a3d;border-bottom:2px solid #ff8a3d;cursor:pointer;">行程（${allTrips.length}）</button>
                <button class="mp-tab" data-tab="notes" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:#999;border-bottom:2px solid transparent;cursor:pointer;">游记（${allNotes.length}）</button>
            </div>
            <div class="mp-content" id="mpTripsContent">${_renderTripList(allTrips)}</div>
            <div class="mp-content" id="mpNotesContent" style="display:none;">${_renderNoteList(allNotes)}</div>
        `;
        UIRender.showAlertModal('我的收藏', html);

        setTimeout(() => {
            const modal = document.getElementById('alertModal');
            if (!modal) return;

            let currentTab = 'trips';
            let currentKeyword = '';
            let currentDest = 'all';
            let currentDays = 'all';

            const _applyFilter = () => {
                if (currentTab === 'trips') {
                    const filtered = _filterTrips(currentKeyword, currentDest, currentDays);
                    document.getElementById('mpTripsContent').innerHTML = _renderTripList(filtered);
                } else {
                    const filtered = _filterNotes(currentKeyword, currentDest);
                    document.getElementById('mpNotesContent').innerHTML = _renderNoteList(filtered);
                }
            };

            modal.querySelectorAll('.mp-tab').forEach(btn => {
                btn.onclick = () => {
                    modal.querySelectorAll('.mp-tab').forEach(b => {
                        b.classList.remove('active');
                        b.style.color = '#999';
                        b.style.borderBottom = '2px solid transparent';
                    });
                    btn.classList.add('active');
                    btn.style.color = '#ff8a3d';
                    btn.style.borderBottom = '2px solid #ff8a3d';
                    currentTab = btn.dataset.tab;
                    document.getElementById('mpTripsContent').style.display = currentTab === 'trips' ? '' : 'none';
                    document.getElementById('mpNotesContent').style.display = currentTab === 'notes' ? '' : 'none';
                    const daysFilter = document.getElementById('favDaysFilter');
                    if (daysFilter) daysFilter.style.display = currentTab === 'trips' ? '' : 'none';
                };
            });

            if (withFilters) {
                const searchInput = document.getElementById('favSearchInput');
                if (searchInput) {
                    let searchTimer;
                    searchInput.addEventListener('input', (e) => {
                        clearTimeout(searchTimer);
                        searchTimer = setTimeout(() => {
                            currentKeyword = e.target.value.trim();
                            _applyFilter();
                        }, 200);
                    });
                }

                modal.querySelectorAll('.fav-tag').forEach(tag => {
                    tag.onclick = () => {
                        modal.querySelectorAll('.fav-tag').forEach(t => {
                            t.classList.remove('active');
                            t.style.background = '#f5f5f7';
                            t.style.color = '#666';
                        });
                        tag.classList.add('active');
                        tag.style.background = '#fff3ea';
                        tag.style.color = '#ff8a3d';
                        currentDest = tag.dataset.dest;
                        _applyFilter();
                    };
                });

                modal.querySelectorAll('.fav-days-tag').forEach(tag => {
                    tag.onclick = () => {
                        modal.querySelectorAll('.fav-days-tag').forEach(t => {
                            t.classList.remove('active');
                            t.style.background = '#f5f5f7';
                            t.style.color = '#666';
                        });
                        tag.classList.add('active');
                        tag.style.background = '#fff3ea';
                        tag.style.color = '#ff8a3d';
                        currentDays = tag.dataset.days;
                        _applyFilter();
                    };
                });
            }
        }, 50);
    },

    // ===== 我的关注 =====
    async openFollows() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            Auth.requireAuth();
            return;
        }
        const user = Auth.getCurrentUser();
        UiKit.showLoading('加载中...');
        try {
            // follows 表：follower_id = 我, following_id = 被关注的人
            const { data: followRecords, error } = await supabase
                .from('follows')
                .select('following_id, created_at')
                .eq('follower_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const followList = followRecords || [];
            let users = [];
            if (followList.length > 0) {
                const ids = followList.map(f => f.following_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, bio, level, role')
                    .in('id', ids);
                users = profiles || [];
            }
            UiKit.hideLoading();
            this._renderFollowModal('我的关注', users);
        } catch (e) {
            UiKit.hideLoading();
            console.error('[Profile] 加载关注列表失败:', e);
            UiKit.toast('加载失败', 'error');
        }
    },

    // ===== 我的粉丝 =====
    async openFollowers() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            Auth.requireAuth();
            return;
        }
        const user = Auth.getCurrentUser();
        UiKit.showLoading('加载中...');
        try {
            // follows 表：following_id = 我, follower_id = 粉丝
            const { data: fanRecords, error } = await supabase
                .from('follows')
                .select('follower_id, created_at')
                .eq('following_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const fanList = fanRecords || [];
            let users = [];
            if (fanList.length > 0) {
                const ids = fanList.map(f => f.follower_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, bio, level, role')
                    .in('id', ids);
                users = profiles || [];
            }
            UiKit.hideLoading();
            this._renderFollowModal('我的粉丝', users);
        } catch (e) {
            UiKit.hideLoading();
            console.error('[Profile] 加载粉丝列表失败:', e);
            UiKit.toast('加载失败', 'error');
        }
    },

    // 渲染关注/粉丝列表弹窗
    _renderFollowModal(title, users) {
        const html = users.length === 0
            ? `<div class="profile-empty">
                   <div class="profile-empty-icon">👥</div>
                   <div class="profile-empty-title">还没有${title}</div>
                   <div class="profile-empty-desc">${title === '我的关注' ? '在社区点击作者头像去关注Ta吧' : '发布优质内容让更多人认识你'}</div>
               </div>`
            : `<div class="profile-list">` + users.map(u => {
                const avatarHtml = u.avatar_url
                    ? `<img src="${u.avatar_url}" alt="${u.username}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">`
                    : `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1989fa,#0d6efd);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;">${(u.username || '?')[0]}</div>`;
                const isAdmin = u.role === 'admin';
                const lvName = this._levelName(u.level || 1);
                return `<div class="profile-list-item" data-uid="${u.id}" style="cursor:pointer;">
                    <div class="pli-cover" style="background:transparent;display:flex;align-items:center;justify-content:center;">${avatarHtml}</div>
                    <div class="pli-info">
                        <div class="pli-title">${u.username || '旅行者'} ${isAdmin ? '<span style="font-size:10px;color:#fff;background:#ff8a3d;padding:1px 6px;border-radius:8px;margin-left:4px;">管理员</span>' : ''}</div>
                        <div class="pli-meta">Lv.${u.level || 1} ${lvName} · ${u.bio ? u.bio.slice(0, 18) : '这个人很懒，还没写简介'}</div>
                    </div>
                    <span style="color:#ccc;font-size:20px;">›</span>
                </div>`;
            }).join('') + `</div>`;

        UIRender.showAlertModal(`${title}（${users.length}）`, html);

        // 绑定点击 → 打开作者空间
        setTimeout(() => {
            const modal = document.getElementById('alertModal');
            if (!modal) return;
            modal.querySelectorAll('.profile-list-item[data-uid]').forEach(item => {
                item.onclick = () => {
                    const uid = item.dataset.uid;
                    modal.classList.remove('show');
                    if (typeof AuthorSpace !== 'undefined') {
                        AuthorSpace.open(uid);
                    }
                };
            });
        }, 50);
    },

    // ===== 谁赞了我 =====
    async openLikers() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            Auth.requireAuth();
            return;
        }
        const user = Auth.getCurrentUser();
        UiKit.showLoading('加载中...');
        try {
            const [tripLikesRes, noteLikesRes] = await Promise.all([
                supabase.from('trip_templates')
                    .select('id')
                    .eq('author_id', user.id)
                    .eq('status', 'published'),
                supabase.from('travel_notes')
                    .select('id')
                    .eq('author_id', user.id)
                    .eq('status', 'published'),
            ]);
            const tripIds = (tripLikesRes.data || []).map(t => t.id);
            const noteIds = (noteLikesRes.data || []).map(n => n.id);
            const allTargetIds = [...tripIds, ...noteIds];

            let likers = [];
            if (allTargetIds.length > 0) {
                const { data: likeRecords } = await supabase
                    .from('likes')
                    .select('user_id, created_at, target_id, target_type, profiles:user_id(username, avatar_url, level)')
                    .in('target_id', allTargetIds)
                    .order('created_at', { ascending: false })
                    .limit(50);

                const seen = new Set();
                likers = (likeRecords || []).filter(r => {
                    if (seen.has(r.user_id)) return false;
                    seen.add(r.user_id);
                    return r.user_id !== user.id;
                }).map(r => ({
                    ...(r.profiles || {}),
                    id: r.user_id,
                    liked_at: r.created_at,
                    target_type: r.target_type,
                }));
            }
            UiKit.hideLoading();
            this._renderFollowModal('谁赞了我', likers);
        } catch (e) {
            UiKit.hideLoading();
            console.error('[Profile] 加载点赞列表失败:', e);
            UiKit.toast('加载失败', 'error');
        }
    },

    // ===== 我的发布（云端：行程+游记）=====
    async openMyPosts() {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            UiKit.toast('请先登录', 'info');
            Auth.requireAuth();
            return;
        }
        const user = Auth.getCurrentUser();
        UiKit.showLoading('加载中...');
        try {
            // 并行加载行程+游记
            const [tripRes, noteRes] = await Promise.all([
                supabase.from('trip_templates')
                    .select('id, title, destination, city, days, likes, favorites, copies, status, suitable_for, created_at')
                    .eq('author_id', user.id)
                    .order('created_at', { ascending: false }),
                supabase.from('travel_notes')
                    .select('id, title, destination, cover_image, cover_emoji, views, likes, favorites, status, created_at')
                    .eq('author_id', user.id)
                    .order('created_at', { ascending: false })
            ]);
            const trips = tripRes.data || [];
            const notes = noteRes.data || [];
            UiKit.hideLoading();
            this._renderMyPostsModal(trips, notes);
        } catch (e) {
            UiKit.hideLoading();
            console.error('[Profile] 加载我的发布失败:', e);
            UiKit.toast('加载失败', 'error');
        }
    },

    _renderMyPostsModal(trips, notes) {
        const tripHtml = trips.length === 0
            ? `<div class="profile-empty"><div class="profile-empty-icon">🗺️</div><div class="profile-empty-title">还没有发布行程</div><div class="profile-empty-desc">在行程详情页点「发布」即可分享到社区</div></div>`
            : `<div class="profile-list">` + trips.map((t, i) => {
                const statusBadge = t.status === 'published'
                    ? `<span style="font-size:10px;color:#27ae60;background:#e8f8ef;padding:2px 6px;border-radius:4px;margin-left:6px;">已发布</span>`
                    : `<span style="font-size:10px;color:#999;background:#f5f5f7;padding:2px 6px;border-radius:4px;margin-left:6px;">${t.status === 'reviewing' ? '审核中' : '私有'}</span>`;
                const bg = ['#FFE5B4','#D4EDDA','#FFE0E0','#E0E0FF','#FFF0D4'][i % 5];
                return `<div class="profile-list-item" onclick="App.openCloudTrip('${t.id}');document.getElementById('alertModal').classList.remove('show')">
                    <div class="pli-cover" style="background:${bg}">🗺️</div>
                    <div class="pli-info">
                        <div class="pli-title">${t.title}${statusBadge}</div>
                        <div class="pli-meta">${t.destination || t.city || ''} · ${t.days || 1}天 · ❤️ ${t.likes || 0} · 📋 ${t.copies || 0}</div>
                    </div>
                </div>`;
            }).join('') + `</div>`;

        const noteHtml = notes.length === 0
            ? `<div class="profile-empty"><div class="profile-empty-icon">✍️</div><div class="profile-empty-title">还没有发布游记</div><div class="profile-empty-desc">在社区页点「写游记」分享你的旅行故事</div></div>`
            : `<div class="profile-list">` + notes.map(n => {
                const statusBadge = n.status === 'published'
                    ? `<span style="font-size:10px;color:#27ae60;background:#e8f8ef;padding:2px 6px;border-radius:4px;margin-left:6px;">已发布</span>`
                    : `<span style="font-size:10px;color:#999;background:#f5f5f7;padding:2px 6px;border-radius:4px;margin-left:6px;">草稿</span>`;
                const coverStyle = n.cover_image
                    ? `background-image:url('${n.cover_image}');background-size:cover;background-position:center;`
                    : `background:linear-gradient(135deg,#fdf6e3,#ffe8d6);`;
                return `<div class="profile-list-item" onclick="TravelNote.view('${n.id}');document.getElementById('alertModal').classList.remove('show')">
                    <div class="pli-cover" style="${coverStyle}">${n.cover_image ? '' : (n.cover_emoji || '✍️')}</div>
                    <div class="pli-info">
                        <div class="pli-title">${n.title}${statusBadge}</div>
                        <div class="pli-meta">${n.destination || '游记'} · 👁️ ${n.views || 0} · ❤️ ${n.likes || 0}</div>
                    </div>
                </div>`;
            }).join('') + `</div>`;

        const html = `
            <div class="my-posts-tabs" style="display:flex;border-bottom:1px solid #eee;margin-bottom:12px;">
                <button class="mp-tab active" data-tab="trips" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:#ff8a3d;border-bottom:2px solid #ff8a3d;cursor:pointer;">行程（${trips.length}）</button>
                <button class="mp-tab" data-tab="notes" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:#999;border-bottom:2px solid transparent;cursor:pointer;">游记（${notes.length}）</button>
            </div>
            <div class="mp-content" id="mpTripsContent">${tripHtml}</div>
            <div class="mp-content" id="mpNotesContent" style="display:none;">${noteHtml}</div>
        `;
        UIRender.showAlertModal('我的发布', html);

        // Tab 切换
        setTimeout(() => {
            const modal = document.getElementById('alertModal');
            if (!modal) return;
            modal.querySelectorAll('.mp-tab').forEach(btn => {
                btn.onclick = () => {
                    modal.querySelectorAll('.mp-tab').forEach(b => {
                        b.classList.remove('active');
                        b.style.color = '#999';
                        b.style.borderBottom = '2px solid transparent';
                    });
                    btn.classList.add('active');
                    btn.style.color = '#ff8a3d';
                    btn.style.borderBottom = '2px solid #ff8a3d';
                    const tab = btn.dataset.tab;
                    document.getElementById('mpTripsContent').style.display = tab === 'trips' ? '' : 'none';
                    document.getElementById('mpNotesContent').style.display = tab === 'notes' ? '' : 'none';
                };
            });
        }, 50);
    },
};

function showConfirm(title, message) {
    const modal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMsg = document.getElementById('confirmMsg');
    const confirmOk = document.getElementById('confirmOk');
    const confirmCancel = document.getElementById('confirmCancel');

    confirmTitle.textContent = title;
    confirmMsg.textContent = message;

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    };

    return new Promise((resolve) => {
        const handleOk = () => {
            cleanup();
            closeModal();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            closeModal();
            resolve(false);
        };

        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };

        const cleanup = () => {
            confirmOk.removeEventListener('click', handleOk);
            confirmCancel.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleOverlayClick);
        };

        confirmOk.addEventListener('click', handleOk);
        confirmCancel.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleOverlayClick);
    });
}
