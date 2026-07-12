const AIChat = {
    overlay: null,
    panel: null,
    messagesEl: null,
    inputEl: null,
    sendBtn: null,
    chipsEl: null,
    messages: [],
    isOpen: false,
    isLoading: false,
    currentTrip: null,
    currentDay: 0,
    undoStack: [],
    _msgIdCounter: 0,

    QUICK_CHIPS: [
        { icon: '🍜', label: '找附近美食', action: 'food' },
        { icon: '🏨', label: '推荐酒店', action: 'hotel' },
        { icon: '🗺️', label: '优化路线', action: 'optimize' },
        { icon: '🎭', label: '当地体验', action: 'experience' },
        { icon: '⏰', label: '填充时间', action: 'filltime' },
        { icon: '💡', label: '避坑提醒', action: 'tips' },
    ],

    init() {
        this.overlay = document.getElementById('aiChatPanel');
        this.messagesEl = document.getElementById('aiChatMessages');
        this.inputEl = document.getElementById('aiChatInput');
        this.sendBtn = document.getElementById('aiChatSend');
        this.chipsEl = document.getElementById('aiQuickChips');
        this._bindEvents();
    },

    _bindEvents() {
        document.getElementById('aiChatClose').onclick = () => this.close();
        this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };
        this.sendBtn.onclick = () => this._onSend();
        this.inputEl.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._onSend();
            }
        };
    },

    open(trip, day = 0) {
        if (!this.overlay) this.init();
        this.currentTrip = trip;
        this.currentDay = day;
        this.isOpen = true;
        this.overlay.classList.add('show');
        this.renderQuickChips();
        setTimeout(() => this.inputEl?.focus(), 300);
    },

    close() {
        this.isOpen = false;
        this.overlay?.classList.remove('show');
    },

    setContext(trip, day) {
        this.currentTrip = trip;
        if (day !== undefined) this.currentDay = day;
        if (this.isOpen) this.renderQuickChips();
    },

    reset() {
        this.messages = [];
        this.undoStack = [];
        if (this.messagesEl) {
            this.messagesEl.innerHTML = `
                <div class="ai-msg ai-msg-ai">
                    <div class="ai-msg-avatar">✨</div>
                    <div class="ai-msg-bubble">
                        你好！我是你的AI旅行助手小哇途😊<br>有什么可以帮你的？比如找附近美食、推荐酒店、优化路线...
                    </div>
                </div>`;
        }
    },

    renderQuickChips() {
        if (!this.chipsEl) return;
        this.chipsEl.innerHTML = this.QUICK_CHIPS.map(c =>
            `<button class="ai-chip" data-action="${c.action}">${c.icon} ${c.label}</button>`
        ).join('');
        this.chipsEl.querySelectorAll('.ai-chip').forEach(btn => {
            btn.onclick = () => this.handleQuickAction(btn.dataset.action);
        });
    },

    async _getReferencePoint() {
        const dp = this.currentTrip?.dayPlans?.[this.currentDay];
        const spots = dp?.spots || [];
        for (let i = spots.length - 1; i >= 0; i--) {
            const s = spots[i];
            if (s && typeof s.lng === 'number' && typeof s.lat === 'number' && !isNaN(s.lng) && !isNaN(s.lat)) {
                return { lng: s.lng, lat: s.lat, name: s.name, source: 'spot' };
            }
        }
        const city = this.currentTrip?.dayPlans?.[this.currentDay]?.city || this.currentTrip?.dayPlans?.[0]?.city || this.currentTrip?.destination;
        if (city && typeof MapModule !== 'undefined' && MapModule.getCityCenter) {
            try {
                const center = await MapModule.getCityCenter(city);
                if (center) return { lng: center.lng, lat: center.lat, name: city, source: 'city' };
            } catch(e) { console.warn('getCityCenter failed:', e); }
        }
        return null;
    },

    async handleQuickAction(action) {
        const day = this.currentDay;
        const city = this.currentTrip?.dayPlans?.[day]?.city || this.currentTrip?.dayPlans?.[0]?.city || this.currentTrip?.destination || '';
        const dp = this.currentTrip?.dayPlans?.[day];
        const spots = dp?.spots || [];
        const spotsList = spots.map((s,i) => `${i+1}. ${s.name}`).join('、');

        const nearbyCategories = { food: 'food', hotel: 'hotel', experience: 'experience' };
        
        if (nearbyCategories[action]) {
            return this._handleNearbyRecommendation(action, city, day, spotsList, spots);
        }

        const prompts = {
            optimize: `请分析我在${city}第${day+1}天的行程路线：${spotsList}。这些景点的顺序是否合理？有没有可以优化减少折返的地方？给出具体的重排建议。如果有优化方案，用\`\`\`json返回：
\`\`\`json
{
  "textReply": "分析说明",
  "optimize": true,
  "newOrder": [0,2,1,3,...]
}
\`\`\`
如果路线已经合理，返回{"textReply":"路线已经比较合理啦！","optimize":false}`,
            filltime: `分析我第${day+1}天的行程时间安排，看看哪里有空闲时间可以填充。当前行程：${spotsList}。推荐一些适合30-60分钟的小活动。`,
            tips: `给我一些${city}旅行的避坑提醒和注意事项，防止被宰踩雷，包括交通、餐饮、景区购票等方面。`
        };

        const text = prompts[action];
        if (text) {
            this.inputEl.value = '';
            await this.sendMessage(text);
        }
    },

    async _handleNearbyRecommendation(action, city, day, spotsList, spots) {
        if (this.isLoading) return;
        this.isLoading = true;
        this.sendBtn.disabled = true;

        const categoryNames = { food: '美食', hotel: '酒店住宿', experience: '特色体验' };
        const emojis = { food: '🍜', hotel: '🏨', experience: '🎭' };
        const typeNames = { food: '美食', hotel: '酒店', experience: '体验' };
        const catName = categoryNames[action];
        
        const userMsg = `帮我推荐附近的${catName}`;
        this.appendUserMessage(userMsg);
        this.messages.push({ role: 'user', content: userMsg });
        
        const loadingEl = this.showLoading();
        const loadingText = loadingEl.querySelector('.ai-loading-text');
        if (loadingText) loadingText.textContent = `正在搜索附近${catName}...`;
        this.scrollToBottom();
        
        try {
            const ref = await this._getReferencePoint();
            if (!ref) {
                loadingEl.remove();
                this.appendAIMessage(`需要先添加行程景点或设置目的地城市，才能搜索附近${catName}哦~`);
                return;
            }
            
            const pois = await MapModule.searchNearbyPOIs(ref.lng, ref.lat, action, 20000);
            
            if (!pois || pois.length === 0) {
                loadingEl.remove();
                this.appendAIMessage(`抱歉，在${ref.name}附近20km内没找到合适的${catName}，你可以尝试手动添加或换个地方搜索~`);
                return;
            }
            
            const poiText = pois.map((p, i) => 
                `${i+1}. ${p.name}（距离${p.distance}km，地址：${p.address || '暂无'}${p.rating ? '，评分：' + p.rating : ''}）`
            ).join('\n');
            
            const sysPrompt = `你是一位旅行顾问。以下是用户所在位置（${ref.name}）20km范围内真实存在的${catName}POI列表（按综合排序）：\n${poiText}\n\n请基于以上真实POI数据写一段简短的推荐语（80字以内），然后以\`\`\`json包裹返回：\n\`\`\`json\n{\n  "textReply": "你的推荐语",\n  "recommendations": [\n    {"name":"POI名称","type":"${typeNames[action]}","emoji":"${emojis[action]}","reason":"一句话特色描述","estimatedCost":"人均价格"}\n  ]\n}\n\`\`\`\n严格要求：\n1. recommendations数组必须包含上面列出的所有${pois.length}个POI，一个都不能少\n2. name字段必须与列表中的POI名称完全一致，禁止修改、禁止新增列表外的地点\n3. reason简短描述特色（基于名称/地址/评分合理推断）\n4. 如果是美食estimatedCost给出人均参考（如"人均80元"），酒店给出价格区间，体验给出门票/费用`;
            
            const msgsForAI = [{ role: 'user', content: userMsg }];
            
            const result = await AIService.chat(msgsForAI, { 
                systemPrompt: sysPrompt,
                temperature: 0.3
            });
            
            loadingEl.remove();
            
            if (result.success) {
                const parsed = this._parseAIResponse(result.content);
                const aiRecs = parsed.recommendations || [];
                const poiMap = new Map();
                pois.forEach(p => poiMap.set(p.name, p));
                
                const mergedRecs = [];
                aiRecs.forEach(ar => {
                    const realPoi = poiMap.get(ar.name);
                    if (realPoi) {
                        mergedRecs.push({
                            ...ar,
                            name: realPoi.name,
                            lng: realPoi.lng,
                            lat: realPoi.lat,
                            address: realPoi.address || ar.address || '',
                            distance: realPoi.distance,
                            photos: realPoi.photos || [],
                            rating: realPoi.rating,
                            cost: realPoi.cost,
                            type: ar.type || typeNames[action],
                            emoji: ar.emoji || emojis[action],
                        });
                    }
                });
                
                if (mergedRecs.length === 0) {
                    mergedRecs.push(...pois.map(p => ({
                        name: p.name, type: typeNames[action], emoji: emojis[action],
                        reason: `距离${p.distance}km`, estimatedCost: p.cost ? `人均${p.cost}元` : '',
                        lng: p.lng, lat: p.lat, address: p.address, distance: p.distance,
                        photos: p.photos, rating: p.rating, cost: p.cost
                    })));
                }
                
                const aiContent = '```json\n' + JSON.stringify({ textReply: (parsed.text || `为你找到${ref.name}附近的${catName}，按距离和口碑排序：`), recommendations: mergedRecs }) + '\n```';
                this.appendAIMessage(aiContent);
                this.messages.push({ role: 'assistant', content: result.content });
            } else {
                this.appendAIMessage(`搜索到${pois.length}家${catName}，但AI润色失败，直接为你展示：\n` + 
                    pois.map((p,i)=>`${i+1}. ${p.name}（${p.distance}km）`).join('\n'));
            }
        } catch(e) {
            if (loadingEl) loadingEl.remove();
            console.error('Nearby recommendation error:', e);
            this.appendAIMessage('抱歉，搜索附近地点时出错了，请稍后再试 😅');
        } finally {
            this.isLoading = false;
            this.sendBtn.disabled = false;
        }
    },

    async _onSend() {
        const text = this.inputEl.value.trim();
        if (!text || this.isLoading) return;
        this.inputEl.value = '';
        await this.sendMessage(text);
    },

    async sendMessage(text) {
        if (this.isLoading) return;
        this.isLoading = true;
        this.sendBtn.disabled = true;

        this.appendUserMessage(text);
        this.messages.push({ role: 'user', content: text });

        const loadingEl = this.showLoading();
        this.scrollToBottom();

        try {
            const sysPrompt = AIService.DEFAULT_SYSTEM_PROMPT + '\n\n' +
                '当前行程信息：\n' + AIService.buildTripContext(this.currentTrip, this.currentDay, -1);

            const recentMsgs = this.messages.slice(-10);

            const result = await AIService.chat(recentMsgs, {
                systemPrompt: sysPrompt,
                temperature: 0.7
            });

            loadingEl.remove();

            if (result.success) {
                this.appendAIMessage(result.content);
                this.messages.push({ role: 'assistant', content: result.content });
            } else {
                this.appendAIMessage('抱歉，AI暂时无法响应，请稍后再试 😅' + (result.error === 'timeout' ? '（超时）' : ''));
            }
        } catch (e) {
            loadingEl.remove();
            this.appendAIMessage('出错了，请稍后再试 😅');
            console.error('AIChat error:', e);
        }

        this.isLoading = false;
        this.sendBtn.disabled = false;
        this.scrollToBottom();
    },

    appendUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'ai-msg ai-msg-user';
        div.innerHTML = `
            <div class="ai-msg-avatar">我</div>
            <div class="ai-msg-bubble">${this._escapeHtml(text)}</div>
        `;
        this.messagesEl.appendChild(div);
    },

    appendAIMessage(content) {
        const { text, recommendations, itineraryPlan } = this._parseAIResponse(content);
        const msgId = `aimsg-${++this._msgIdCounter}`;

        const div = document.createElement('div');
        div.className = 'ai-msg ai-msg-ai';
        div.dataset.msgId = msgId;

        let html = `<div class="ai-msg-avatar">✨</div><div class="ai-msg-bubble">${this._formatText(text)}`;

        // 改动B：行程计划改为勾选+批量添加
        if (itineraryPlan && itineraryPlan.length > 0) {
            html += `<div class="ai-itinerary-plan">`;
            html += `<div class="ai-plan-title">🗺️ AI行程规划</div>`;
            itineraryPlan.forEach((day, dayIdx) => {
                const spots = day.spots || day.activities || day.places || [];
                const dayTitle = day.theme || day.title || day.day || `第${dayIdx+1}天`;
                html += `<div class="ai-plan-day">`;
                html += `<div class="ai-plan-day-header">${this._escapeHtml(dayTitle)}</div>`;
                spots.forEach((spot, sIdx) => {
                    const spotName = spot.name || spot.place || spot;
                    const name = typeof spotName === 'string' ? spotName : (spotName.name || '');
                    html += `<label class="ai-plan-spot">`;
                    html += `<input type="checkbox" data-day="${dayIdx}" data-spot="${sIdx}" checked>`;
                    html += `<span class="ai-plan-spot-emoji">${spot.emoji || '📍'}</span>`;
                    html += `<span class="ai-plan-spot-name">${this._escapeHtml(name)}</span>`;
                    if (spot.reason) html += `<span class="ai-plan-spot-reason">${this._escapeHtml(spot.reason).substring(0,40)}</span>`;
                    html += `</label>`;
                });
                html += `</div>`;
            });
            html += `<button class="ai-plan-batch-btn">添加已选到行程</button>`;
            html += `</div>`;
        }

        // 改动A：推荐卡片改为勾选+批量添加
        if (recommendations && recommendations.length > 0) {
            html += `<div class="ai-rec-list" data-rec-group="${msgId}">`;
            recommendations.forEach((rec, idx) => {
                const emoji = rec.emoji || '📍';
                const type = rec.type || '景点';
                const cost = rec.estimatedCost ? ` · ${rec.estimatedCost}` : '';
                const rating = rec.rating ? ` · ⭐${rec.rating}` : '';
                html += `
                    <div class="ai-rec-card">
                        <label class="ai-rec-check">
                            <input type="checkbox" data-idx="${idx}" checked>
                            <span class="ai-rec-checkmark"></span>
                        </label>
                        <div class="ai-rec-emoji">${emoji}</div>
                        <div class="ai-rec-info">
                            <div class="ai-rec-name">${this._escapeHtml(rec.name)}</div>
                            <div class="ai-rec-meta">${this._escapeHtml(type)}${cost}${rec.distance ? ' · 📍' + rec.distance + 'km' : ''}${rating}${rec.reason ? ' · ' + this._escapeHtml(rec.reason).substring(0,30) : ''}</div>
                        </div>
                    </div>`;
            });
            html += `</div>`;
            html += `<button class="ai-rec-batch-btn" data-rec-group="${msgId}">添加已选(${recommendations.length})</button>`;
        }

        // 改动C：优化路线改为"查看优化方案"
        const optMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (optMatch) {
            try {
                const opt = JSON.parse(optMatch[1].trim());
                if (opt.optimize && Array.isArray(opt.newOrder)) {
                    html += `<button class="ai-opt-btn" onclick="AIChat._showOptimizeCompare(${JSON.stringify(opt.newOrder).replace(/"/g,'&quot;')})">📊 查看优化方案</button>`;
                }
            } catch(e) {}
        }

        html += `</div>`;
        div.innerHTML = html;
        this.messagesEl.appendChild(div);

        // 事件绑定：推荐卡片的checkbox变化时更新按钮文字，批量添加按钮点击
        if (recommendations && recommendations.length > 0) {
            const recGroup = div.querySelector(`[data-rec-group="${msgId}"]`);
            const recBatchBtn = div.querySelector('.ai-rec-batch-btn');
            if (recGroup && recBatchBtn) {
                recGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.onchange = () => {
                        const checkedCount = recGroup.querySelectorAll('input:checked').length;
                        recBatchBtn.textContent = `添加已选(${checkedCount})`;
                    };
                });
                recBatchBtn.onclick = () => this._addSelectedRecommendations(recommendations, div);
            }
        }

        // 事件绑定：行程计划的checkbox变化时更新按钮文字，批量添加按钮点击
        if (itineraryPlan && itineraryPlan.length > 0) {
            const planContainer = div.querySelector('.ai-itinerary-plan');
            const planBatchBtn = div.querySelector('.ai-plan-batch-btn');
            if (planContainer && planBatchBtn) {
                const updatePlanBtn = () => {
                    const checkedCount = planContainer.querySelectorAll('input:checked').length;
                    planBatchBtn.textContent = `添加已选到行程(${checkedCount})`;
                };
                planContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.onchange = updatePlanBtn;
                });
                updatePlanBtn();
                planBatchBtn.onclick = () => this._addSelectedItineraryPlan(itineraryPlan, div);
            }
        }

        this._recommendations = recommendations || [];
        this._currentItineraryPlan = itineraryPlan;
    },

    _showOptimizeCompare(newOrder) {
        if (!this.currentTrip?.dayPlans?.[this.currentDay]) return;
        const dp = this.currentTrip.dayPlans[this.currentDay];
        const spots = dp.spots || [];
        const valid = newOrder.every(i => i >= 0 && i < spots.length) && newOrder.length === spots.length;
        if (!valid) {
            UIRender.showToast('路线优化方案无效');
            return;
        }

        // 构建对比弹窗
        const modal = document.createElement('div');
        modal.className = 'ai-opt-modal-overlay';

        let compareHtml = '';
        const maxLen = Math.max(spots.length, newOrder.length);
        for (let i = 0; i < maxLen; i++) {
            const oldSpot = spots[i];
            const newIdx = newOrder[i];
            const newSpot = newIdx !== undefined ? spots[newIdx] : null;
            const changed = oldSpot && newSpot && oldSpot.name !== newSpot.name;

            compareHtml += `<div class="ai-opt-row ${changed ? 'changed' : ''}">`;
            compareHtml += `<div class="ai-opt-cell ai-opt-old">`;
            compareHtml += `<span class="ai-opt-num">${i+1}</span>`;
            compareHtml += `<span class="ai-opt-name">${oldSpot ? this._escapeHtml(oldSpot.name) : '—'}</span>`;
            compareHtml += `</div>`;
            compareHtml += `<div class="ai-opt-arrow">${changed ? '→' : '='}</div>`;
            compareHtml += `<div class="ai-opt-cell ai-opt-new">`;
            compareHtml += `<span class="ai-opt-num">${i+1}</span>`;
            compareHtml += `<span class="ai-opt-name">${newSpot ? this._escapeHtml(newSpot.name) : '—'}</span>`;
            compareHtml += `</div>`;
            compareHtml += `</div>`;
        }

        modal.innerHTML = `
            <div class="ai-opt-modal">
                <div class="ai-opt-modal-header">
                    <h3>路线优化对比</h3>
                    <button class="ai-opt-modal-close" onclick="this.closest('.ai-opt-modal-overlay').remove()">✕</button>
                </div>
                <div class="ai-opt-modal-body">
                    <div class="ai-opt-columns">
                        <div class="ai-opt-col-title">当前路线</div>
                        <div class="ai-opt-col-arrow"></div>
                        <div class="ai-opt-col-title">优化后路线</div>
                    </div>
                    ${compareHtml}
                </div>
                <div class="ai-opt-modal-footer">
                    <button class="ai-opt-cancel" onclick="this.closest('.ai-opt-modal-overlay').remove()">取消</button>
                    <button class="ai-opt-confirm" onclick="AIChat._applyOptimizeWithUndo([${newOrder.join(',')}])">确认优化</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('show'));
    },

    _applyOptimizeWithUndo(newOrder) {
        // 关闭对比弹窗
        document.querySelector('.ai-opt-modal-overlay')?.remove();

        if (!this.currentTrip?.dayPlans?.[this.currentDay]) return;
        const dp = this.currentTrip.dayPlans[this.currentDay];
        const oldSpots = JSON.parse(JSON.stringify(dp.spots || []));

        // 保存撤销快照
        this._pushUndoSnapshot({
            action: '路线优化',
            undo: () => {
                if (this.currentTrip?.dayPlans?.[this.currentDay]) {
                    this.currentTrip.dayPlans[this.currentDay].spots = oldSpots;
                    TripDetail.renderItinerary();
                    TripDetail._saveTrip();
                }
            }
        });

        // 应用优化
        dp.spots = newOrder.map(i => oldSpots[i]);
        TripDetail.renderItinerary();
        TripDetail._saveTrip();

        // 显示Toast+撤销
        this._showUndoToast('路线已优化', '撤销路线优化');

        UIRender.showToast('路线已优化！');
    },

    async _addSelectedRecommendations(recommendations, msgEl) {
        const checkboxes = msgEl.querySelectorAll('.ai-rec-check input:checked');
        const selectedRecs = Array.from(checkboxes).map(cb => recommendations[parseInt(cb.dataset.idx)]);
        if (selectedRecs.length === 0) {
            UIRender.showToast('请至少选择一个地点');
            return;
        }

        const batchBtn = msgEl.querySelector('.ai-rec-batch-btn');
        if (batchBtn) {
            batchBtn.disabled = true;
            batchBtn.textContent = '添加中...';
        }

        // 保存撤销快照
        const tripSnapshot = JSON.parse(JSON.stringify(this.currentTrip));

        const dayIdx = this.currentDay;
        const city = this.currentTrip?.dayPlans?.[dayIdx]?.city || this.currentTrip?.dayPlans?.[0]?.city || this.currentTrip?.destination || '';
        let addedCount = 0;
        const addedNames = [];

        for (const rec of selectedRecs) {
            let emoji = rec.emoji || '📍';
            let type = rec.type || '景点';
            let duration = 90;

            if (type.includes('美食') || type.includes('餐') || type.includes('吃')) {
                emoji = rec.emoji || '🍜'; duration = 60;
            } else if (type.includes('酒店') || type.includes('住宿')) {
                emoji = rec.emoji || '🏨'; duration = 0;
            } else if (type.includes('体验')) {
                emoji = rec.emoji || '🎭'; duration = 90;
            }

            let poiData = {
                name: rec.name, type, emoji,
                address: rec.address || '', intro: rec.reason || '',
                duration, cost: rec.estimatedCost || '',
                lng: rec.lng, lat: rec.lat,
                photos: rec.photos, rating: rec.rating, distance: rec.distance
            };

            if (!rec.lng || !rec.lat) {
                try {
                    if (typeof MapModule !== 'undefined' && MapModule.geocodeSpot) {
                        const pos = await MapModule.geocodeSpot(city, rec.name);
                        if (pos) {
                            poiData.lng = pos.lng; poiData.lat = pos.lat;
                            poiData.address = pos.address || poiData.address;
                            if (pos.photos?.length > 0) {
                                poiData.photos = pos.photos;
                                poiData.photoUrl = pos.photos[0].url || '';
                            }
                        }
                    }
                } catch(e) { console.warn('Geocode failed:', e); }
            }

            try {
                TripDetail.addSpotToTrip({ name: rec.name, typeName: type, ...poiData }, dayIdx);
                addedCount++;
                addedNames.push(rec.name);
            } catch(e) { console.error('Add rec failed:', e); }
        }

        if (batchBtn) {
            batchBtn.textContent = `✓ 已添加${addedCount}个`;
            batchBtn.style.background = '#52C41A';
        }

        // 撤销机制
        this._pushUndoSnapshot({
            action: `添加${addedCount}个推荐地点`,
            undo: () => {
                this.currentTrip = tripSnapshot;
                if (typeof AIMemory !== 'undefined') {
                    AIMemory.saveTrip(this.currentTrip);
                }
                TripDetail.currentTrip = this.currentTrip;
                TripDetail.renderItinerary();
            }
        });

        this._showUndoToast(`已添加${addedCount}个地点`, '撤销添加');
        this._showUndoInChat(`已添加 ${addedNames.join('、')}`, `撤销添加${addedCount}个地点`);
    },

    async _addSelectedItineraryPlan(itineraryPlan, msgEl) {
        const checkboxes = msgEl.querySelectorAll('.ai-plan-spot input:checked');
        if (checkboxes.length === 0) {
            UIRender.showToast('请至少选择一个景点');
            return;
        }

        const batchBtn = msgEl.querySelector('.ai-plan-batch-btn');
        if (batchBtn) { batchBtn.disabled = true; batchBtn.textContent = '添加中...'; }

        const tripSnapshot = JSON.parse(JSON.stringify(this.currentTrip));
        const city = this.currentTrip?.dayPlans?.[0]?.city || this.currentTrip?.destination || '';
        let addedCount = 0;
        const addedNames = [];

        for (const cb of checkboxes) {
            const dayIdx = parseInt(cb.dataset.day);
            const spotIdx = parseInt(cb.dataset.spot);
            const day = itineraryPlan[dayIdx];
            const spots = day.spots || day.activities || day.places || [];
            const spot = spots[spotIdx];
            const spotName = typeof spot === 'string' ? spot : (spot.name || spot.place || '');
            if (!spotName) continue;

            let emoji = spot.emoji || '📍';
            let type = spot.type || '景点';
            let duration = spot.duration || 90;
            let reason = spot.reason || spot.desc || spot.intro || '';
            let cost = spot.estimatedCost || spot.cost || '';

            if (type.includes('美食') || type.includes('餐') || type.includes('吃') || /餐厅|饭店|小吃/.test(spotName)) {
                emoji = spot.emoji || '🍜'; type = '美食'; duration = 60;
            } else if (type.includes('酒店') || type.includes('住宿') || /酒店|民宿/.test(spotName)) {
                emoji = spot.emoji || '🏨'; type = '住宿'; duration = 0;
            }

            let poiData = { name: spotName, type, emoji, address: spot.address || '', intro: reason, duration, cost };

            try {
                if (typeof MapModule !== 'undefined' && MapModule.geocodeSpot) {
                    const pos = await MapModule.geocodeSpot(city, spotName);
                    if (pos) {
                        poiData.lng = pos.lng; poiData.lat = pos.lat;
                        poiData.address = pos.address || poiData.address;
                        if (pos.photos?.length > 0) { poiData.photos = pos.photos; poiData.photoUrl = pos.photos[0].url || ''; }
                    }
                }
            } catch(e) { console.warn('Geocode failed:', e); }

            try {
                TripDetail.addSpotToTrip({ name: spotName, typeName: type, ...poiData }, dayIdx);
                addedCount++; addedNames.push(spotName);
            } catch(e) { console.error('Add plan spot failed:', e); }
        }

        if (batchBtn) { batchBtn.textContent = `✓ 已添加${addedCount}个`; batchBtn.style.background = '#52C41A'; }

        this._pushUndoSnapshot({
            action: `添加${addedCount}个行程景点`,
            undo: () => {
                this.currentTrip = tripSnapshot;
                if (typeof AIMemory !== 'undefined') AIMemory.saveTrip(this.currentTrip);
                TripDetail.currentTrip = this.currentTrip;
                TripDetail.renderItinerary();
            }
        });

        this._showUndoToast(`已添加${addedCount}个景点`, '撤销添加');
        this._showUndoInChat(`已添加 ${addedNames.join('、')}`, `撤销添加${addedCount}个行程景点`);

        TripDetail.switchToList();
        TripDetail.switchTab('itinerary');
    },

    _pushUndoSnapshot(snapshot) {
        this.undoStack.push(snapshot);
        if (this.undoStack.length > 5) this.undoStack.shift();
    },

    _undo() {
        const snapshot = this.undoStack.pop();
        if (snapshot && snapshot.undo) {
            snapshot.undo();
            UIRender.showToast(`已撤销：${snapshot.action}`);
            // 移除对话中的撤销按钮
            const undoBtn = this.messagesEl.querySelector('.ai-undo-btn');
            if (undoBtn) undoBtn.remove();
        } else {
            UIRender.showToast('没有可撤销的操作');
        }
    },

    _showUndoToast(message, undoLabel) {
        // 使用 UiKit 或自定义 toast
        if (typeof UiKit !== 'undefined' && UiKit.toast) {
            UiKit.toast(message, 'success', { actionText: undoLabel, action: () => this._undo() });
        } else {
            UIRender.showToast(message);
        }
        // 5秒后自动消失的toast由UiKit处理
    },

    _showUndoInChat(message, undoLabel) {
        const div = document.createElement('div');
        div.className = 'ai-msg ai-msg-system';
        div.innerHTML = `
            <div class="ai-msg-bubble ai-msg-system-bubble">
                <span class="ai-system-text">${this._escapeHtml(message)}</span>
                <button class="ai-undo-btn" onclick="AIChat._undo()">${this._escapeHtml(undoLabel)}</button>
            </div>
        `;
        this.messagesEl.appendChild(div);
        this.scrollToBottom();
    },

    _parseAIResponse(content) {
        let text = content;
        let recommendations = [];
        let itineraryPlan = null;

        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1].trim());
                if (data.recommendations && Array.isArray(data.recommendations)) {
                    recommendations = data.recommendations;
                }
                if (data.itinerary && Array.isArray(data.itinerary)) {
                    itineraryPlan = data.itinerary;
                }
                if (data.days && Array.isArray(data.days)) {
                    itineraryPlan = data.days;
                }
                if (data.dayPlans && Array.isArray(data.dayPlans)) {
                    itineraryPlan = data.dayPlans;
                }
                if (data.textReply) {
                    text = data.textReply;
                } else {
                    text = content.replace(/```json[\s\S]*?```/, '').trim();
                }
            } catch(e) {
            }
        }

        if (recommendations.length === 0 && !itineraryPlan) {
            const braceMatch = content.match(/\{[\s\S]*("recommendations"|"itinerary"|"days"|"dayPlans")[\s\S]*\}/);
            if (braceMatch) {
                try {
                    const data = JSON.parse(braceMatch[0]);
                    if (data.recommendations) recommendations = data.recommendations;
                    if (data.itinerary) itineraryPlan = data.itinerary;
                    if (data.days) itineraryPlan = data.days;
                    if (data.dayPlans) itineraryPlan = data.dayPlans;
                    if (data.textReply) text = data.textReply;
                } catch(e) {}
            }
        }

        return { text: text || content, recommendations, itineraryPlan };
    },

    showLoading() {
        const div = document.createElement('div');
        div.className = 'ai-msg ai-msg-ai';
        div.id = 'ai-loading-msg';
        div.innerHTML = `
            <div class="ai-msg-avatar">✨</div>
            <div class="ai-msg-bubble">
                <div class="ai-msg-loading"><span></span><span></span><span></span></div>
                <div class="ai-loading-text" style="margin-top:6px;font-size:12px;color:#999;"></div>
            </div>`;
        this.messagesEl.appendChild(div);
        return div;
    },

    scrollToBottom() {
        requestAnimationFrame(() => {
            if (this.messagesEl) {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            }
        });
    },

    _formatText(text) {
        if (!text) return '';
        let html = this._escapeHtml(text);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\n/g, '<br>');
        return html;
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
