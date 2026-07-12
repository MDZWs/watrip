const UIRender = {
    dayColors: [
        { main: '#FF8A3D', light: '#FFB983', gradient: 'linear-gradient(135deg, #FFA35C 0%, #FF8A3D 100%)', shadow: 'rgba(255, 138, 61, 0.5)' },
        { main: '#8B7CF5', light: '#B8ADFF', gradient: 'linear-gradient(135deg, #A395FF 0%, #8B7CF5 100%)', shadow: 'rgba(139, 124, 245, 0.5)' },
        { main: '#5CC6FF', light: '#A8E0FF', gradient: 'linear-gradient(135deg, #7DD3FF 0%, #5CC6FF 100%)', shadow: 'rgba(92, 198, 255, 0.5)' },
        { main: '#FF6B8A', light: '#FFA3B5', gradient: 'linear-gradient(135deg, #FF8BA0 0%, #FF6B8A 100%)', shadow: 'rgba(255, 107, 138, 0.5)' },
        { main: '#34C759', light: '#7DD892', gradient: 'linear-gradient(135deg, #5DD87E 0%, #34C759 100%)', shadow: 'rgba(52, 199, 89, 0.5)' },
        { main: '#FFD60A', light: '#FFE86B', gradient: 'linear-gradient(135deg, #FFDF4D 0%, #FFD60A 100%)', shadow: 'rgba(255, 214, 10, 0.5)' },
        { main: '#FF9500', light: '#FFB84D', gradient: 'linear-gradient(135deg, #FFAF4D 0%, #FF9500 100%)', shadow: 'rgba(255, 149, 0, 0.5)' },
    ],

    getDayColor(dayNum) {
        return this.dayColors[(dayNum - 1) % this.dayColors.length];
    },

    getSpotImage(spot) {
        if (spot.photos && spot.photos.length > 0 && spot.photos[0].url) {
            return spot.photos[0].url;
        }
        if (spot.photoUrl) {
            return spot.photoUrl;
        }
        const typeSeedMap = {
            '历史古迹': 'landmark-history',
            '自然风光': 'nature-scenery',
            '美食': 'food-restaurant',
            '景点': 'tourist-spot',
            '购物': 'shopping-mall',
            '文化': 'culture-museum',
            '休闲': 'leisure-park',
            '公园': 'park-green',
            '博物馆': 'museum-art',
            '寺庙': 'temple-religion',
            '海滩': 'beach-ocean',
            '山脉': 'mountain-hike',
            '湖泊': 'lake-view',
            '古镇': 'ancient-town',
        };
        const seed = typeSeedMap[spot.type] || `spot-${(spot.name || 'default').charCodeAt(0)}`;
        return `https://picsum.photos/seed/${seed}/400/300`;
    },

    renderDestTags() {
        const container = document.getElementById('destTags');
        container.innerHTML = App.destinations.map((d, i) => `
            <div class="dest-tag">
                ${d}
                <span class="remove" onclick="event.stopPropagation(); App.removeDestination(${i})">×</span>
            </div>
        `).join('');
    },

    renderDrawerTabs(trip) {
        const container = document.getElementById('drawerTabs');
        let html = '<button class="drawer-tab active" onclick="App.switchDrawerTab(\'overview\')">总览</button>';
        
        trip.dayPlans.forEach(day => {
            html += `
                <button class="drawer-tab" onclick="App.switchDrawerTab('day', ${day.day}, this)">
                    ${day.dateLabel}
                </button>
            `;
        });
        
        container.innerHTML = html;
    },

    renderOverview(trip) {
        const container = document.getElementById('drawerContent');
        const startD = App.startDate || new Date();
        const endD = App.endDate || new Date(startD.getTime() + (trip.days-1)*24*60*60*1000);
        
        let html = `
            <div class="overview-header">
                <div class="overview-title">${trip.title}</div>
                <div class="overview-subinfo">
                    <span>${CalendarModule.formatDateShort(startD)}至${CalendarModule.formatDateShort(endD)}</span>
                    <span>${trip.days}天${trip.days-1}晚</span>
                    <span class="overview-author">
                        <span class="author-avatar">🍑</span>
                        哇途AI
                    </span>
                </div>
            </div>
        `;
        
        html += `
            <div class="plan-overview-card">
                <div class="plan-overview-title">计划概览</div>
        `;
        
        trip.dayPlans.forEach((day) => {
            const spotNames = day.spots.map(s => s.name).join(' → ');
            html += `
                <div class="day-summary">
                    <div class="day-summary-header">
                        <div>
                            <span class="day-summary-title">${day.dateLabel} ${day.theme}</span>
                        </div>
                    </div>
                    <div class="day-summary-city">${day.city}</div>
                    <div class="day-summary-route">${spotNames}</div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;

        let thinkingHtml = '';
        if (App.currentTripId) {
            const thinkingData = AIMemory.getThinking(App.currentTripId);
            if (thinkingData) {
                thinkingHtml = `
                    <div class="thinking-history-entry" onclick="App.showThinkingHistory()">
                        <div class="the-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                        </div>
                        <div class="the-text">
                            <span class="the-title">已深度思考</span>
                            <span class="the-duration">${thinkingData.duration}秒</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="the-arrow"><polyline points="9,18 15,12 9,6"/></svg>
                    </div>
                `;
            }
        }
        
        html += thinkingHtml;
        
        html += `
            <div class="quick-cards-row">
                <div class="quick-card note">
                    <div class="quick-card-title">便签</div>
                    <div class="quick-card-text">
                        为你规划了${App.destinations.join('')}${trip.days}天「经典+小众+美食」深度行程，点击日期标签查看每日详情～
                    </div>
                </div>
                <div class="quick-card luggage">
                    <div class="quick-card-title">行李建议</div>
                    <div class="luggage-dashed" onclick="UIRender.showToast('行李清单功能开发中')">点击添加清单</div>
                </div>
            </div>
        `;
        
        html += `
            <div class="chat-bar">
                <div class="chat-input" onclick="ChatModule.show()">
                    <svg viewBox="0 0 32 32">
                        <defs>
                            <linearGradient id="aiGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#9B8CFF"/>
                                <stop offset="100%" style="stop-color:#7B68EE"/>
                            </linearGradient>
                        </defs>
                        <path d="M16 8L18 14L24 15L20 19L21 25L16 22L11 25L12 19L8 15L14 14L16 8Z" fill="url(#aiGrad2)"/>
                    </svg>
                    和哇途AI聊聊，修改行程...
                </div>
                <button class="share-btn" onclick="ShareModule.show()">
                    <span>📤</span> 分享
                </button>
            </div>
        `;
        
        container.innerHTML = html;
    },

    renderDaySpots(dayNum) {
        const container = document.getElementById('drawerContent');
        const day = App.tripData.dayPlans.find(d => d.day === dayNum);
        if (!day) return;
        
        const color = this.getDayColor(dayNum);
        const dayDate = App.getDateOfDay(dayNum);
        const dateStr = CalendarModule.formatDateShort(dayDate);
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dayName = dayNames[dayDate.getDay()];

        let html = `
            <div class="day-plan-header">
                <div>
                    <span class="day-plan-title">${dateStr} ${dayName}</span>
                    <span class="day-plan-subtitle">${day.theme || '城市探索'}</span>
                </div>
                <div style="font-size:20px;">⬆️</div>
            </div>
            <div class="day-plan-list" id="dayPlanList_${dayNum}">
        `;
        
        day.spots.forEach((spot, i) => {
            const spotNum = i + 1;
            const timeStr = (spot.startTime || '09:00') + ' - ' + (spot.endTime || '11:00');
            const imgSrc = this.getSpotImage(spot);
            const nextSpot = day.spots[i + 1];
            
            html += `
                <div class="timeline-item" data-day="${dayNum}" data-index="${i}" draggable="true">
                    <div class="timeline-left" onclick="App.focusSpot(${dayNum}, ${i})">
                        <div class="timeline-img">
                            <div class="drag-handle">⋮⋮</div>
                            <img src="${imgSrc}" alt="${spot.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'drag-handle\\'>⋮⋮</div>${spot.emoji}';">
                        </div>
            `;
            
            if (nextSpot) {
                const transportIcon = nextSpot.transport === '步行' ? '🚶' : 
                                      nextSpot.transport === '驾车' ? '🚗' :
                                      nextSpot.transport === '公交' ? '🚌' :
                                      nextSpot.transport === '骑行' ? '🚲' : '🚇';
                html += `
                    <div class="timeline-transport">
                        <div class="transport-icon">${transportIcon}</div>
                        <div>${nextSpot.distance || '500米'}</div>
                        <div>${nextSpot.travelTime || '10分钟'}</div>
                    </div>
                `;
            } else {
                html += `<div class="timeline-line"></div>`;
            }
            
            html += `
                    </div>
                    <div class="timeline-right">
                        <div class="timeline-spot-type" onclick="App.focusSpot(${dayNum}, ${i})">${spot.type || '景点'}</div>
                        <div class="timeline-spot-name" onclick="App.focusSpot(${dayNum}, ${i})">${spotNum}. ${spot.name}</div>
                        <div class="timeline-spot-card">
                            <div class="timeline-time editable-time" contenteditable="true" 
                                 onblur="App.updateSpotTime(${dayNum}, ${i}, this.innerText)"
                                 onkeydown="App.handleEditableKeydown(event)"
                                 onclick="event.stopPropagation()">${timeStr}</div>
                            <div class="timeline-desc editable-desc" contenteditable="true" 
                                 onblur="App.updateSpotDesc(${dayNum}, ${i}, this.innerText)"
                                 onkeydown="App.handleEditableKeydown(event)"
                                 onclick="event.stopPropagation()">${spot.description || '这是一个非常值得一去的地方'}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        const isLastDay = dayNum >= App.tripData.dayPlans.length;
        if (!isLastDay) {
            html += `
                <div class="next-day-hint">
                    <div class="next-day-divider"></div>
                    <div class="next-day-text">下滑查看下一天 →</div>
                </div>
            `;
        }
        
        html += `</div>`;
        
        container.innerHTML = html;
        
        setTimeout(() => {
            DragModule.setupDayList(dayNum);
            App.setupDayScrollListener(dayNum);
        }, 100);
    },

    showGeocodeProgress(current, total) {
        let el = document.querySelector('.geocode-progress');
        if (!el) {
            el = document.createElement('div');
            el.className = 'geocode-progress';
            el.innerHTML = '<div class="spinner"></div><span class="progress-text"></span>';
            document.querySelector('.map-wrap').appendChild(el);
        }
        el.classList.add('show');
        el.querySelector('.progress-text').textContent = `正在定位景点... ${current}/${total}`;
        if (current >= total) {
            setTimeout(() => el.classList.remove('show'), 500);
        }
    },

    showToast(message, duration = 2000) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    },

    showAlertModal(title, content, onConfirm) {
        let modal = document.getElementById('alertModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'alertModal';
            modal.className = 'alert-modal-overlay';
            modal.innerHTML = `
                <div class="alert-modal-box">
                    <div class="alert-modal-title"></div>
                    <div class="alert-modal-body"></div>
                    <div class="alert-modal-actions"></div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.style.display = 'none', 200);
                }
            });
        }
        modal.querySelector('.alert-modal-title').textContent = title;
        modal.querySelector('.alert-modal-body').innerHTML = content;
        const actionsEl = modal.querySelector('.alert-modal-actions');
        const close = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 200);
        };
        if (onConfirm) {
            actionsEl.innerHTML = `<button class="alert-modal-cancel">取消</button><button class="alert-modal-ok">确认</button>`;
            actionsEl.querySelector('.alert-modal-cancel').onclick = close;
            actionsEl.querySelector('.alert-modal-ok').onclick = () => { close(); onConfirm(); };
        } else {
            actionsEl.innerHTML = `<button class="alert-modal-ok" style="width:100%;">知道了</button>`;
            actionsEl.querySelector('.alert-modal-ok').onclick = close;
        }
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('show'));
    },

    animateThinkingChain(steps, onComplete) {
        const chain = document.getElementById('thinkingChain');
        const template = document.getElementById('thinkingStepTemplate');
        const progressFill = document.getElementById('thinkingProgressFill');
        const statusText = document.getElementById('thinkingStatusText');
        const timeBadge = document.getElementById('thinkingTimeBadge');
        const timeText = document.getElementById('thinkingTimeText');
        
        if (!chain || !template) return;
        
        const existingSteps = chain.querySelectorAll('.thinking-step:not(#thinkingStepTemplate)');
        existingSteps.forEach(el => el.remove());
        
        progressFill.style.width = '0%';
        timeBadge.style.display = 'none';
        statusText.textContent = '正在思考...';
        
        const startTime = Date.now();
        const timeInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            timeText.textContent = `已思考 ${elapsed}秒`;
        }, 1000);
        
        let currentStep = 0;
        const completedSteps = [];
        let finished = false;
        let stepTimer = null;
        
        const finish = () => {
            if (finished) return;
            finished = true;
            if (stepTimer) clearTimeout(stepTimer);
            
            for (let i = currentStep; i < steps.length; i++) {
                const step = steps[i];
                const el = template.cloneNode(true);
                el.id = '';
                el.style.display = 'flex';
                el.classList.add('done');
                el.querySelector('.step-label').innerHTML = step.label;
                el.querySelector('.step-detail').innerHTML = step.detail;
                chain.appendChild(el);
                completedSteps.push(step);
            }
            currentStep = steps.length;
            
            clearInterval(timeInterval);
            const totalSeconds = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
            progressFill.style.width = '100%';
            statusText.textContent = '思考完成';
            timeBadge.style.display = 'flex';
            chain.parentElement.scrollTop = chain.parentElement.scrollHeight;
            const dot = document.querySelector('#loadingOverlay .thinking-dot');
            if (dot) {
                dot.style.animation = 'none';
                dot.style.background = '#34C759';
            }
            
            if (onComplete) onComplete({ steps: completedSteps, duration: totalSeconds });
        };
        
        const labels = ['理解需求...', '搜索景点...', '规划路线...', '安排时间...', '推荐美食...', '标记打卡点...', '挖掘小众点...', '定位位置...'];
        
        const renderStep = (index) => {
            if (finished) return;
            if (index >= steps.length) {
                finish();
                return;
            }
            
            const step = steps[index];
            const el = template.cloneNode(true);
            el.id = '';
            el.style.display = 'flex';
            el.classList.add('active');
            
            el.querySelector('.step-label').innerHTML = step.label;
            el.querySelector('.step-detail').innerHTML = step.detail;
            
            chain.appendChild(el);
            chain.parentElement.scrollTop = chain.parentElement.scrollHeight;
            
            progressFill.style.width = `${((index + 1) / steps.length) * 100}%`;
            
            const delay = 350 + Math.random() * 200;
            
            stepTimer = setTimeout(() => {
                if (finished) return;
                el.classList.remove('active');
                el.classList.add('done');
                completedSteps.push(step);
                currentStep++;
                
                if (currentStep < steps.length) {
                    statusText.textContent = labels[currentStep] || '思考中...';
                }
                
                renderStep(currentStep);
            }, delay);
        };
        
        renderStep(0);
        
        return {
            stop: () => clearInterval(timeInterval),
            finish: finish
        };
    },

    showThinkingHistory(thinkingData) {
        if (!thinkingData || !thinkingData.steps) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'poi-detail-overlay show';
        overlay.style.zIndex = '800';
        overlay.innerHTML = `
            <div class="poi-detail-sheet" onclick="event.stopPropagation()" style="max-height:85vh;">
                <div class="poi-detail-handle"><div class="poi-detail-handle-bar"></div></div>
                <div class="poi-detail-header">
                    <div class="poi-detail-title" style="font-size:22px;">🤖 AI思考过程</div>
                    <button class="poi-detail-close" onclick="this.closest('.poi-detail-overlay').remove()">×</button>
                </div>
                <div style="padding: 0 20px 12px; display:flex; gap:8px; align-items:center;">
                    <span style="background:var(--purple-light);color:var(--purple);padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;">思考用时 ${thinkingData.duration}秒</span>
                    <span style="font-size:12px;color:var(--text-muted);">${new Date(thinkingData.timestamp).toLocaleString('zh-CN')}</span>
                </div>
                <div style="padding: 0 20px 24px; max-height:60vh; overflow-y:auto;">
                    <div class="thinking-chain">
                        ${thinkingData.steps.map((step, i) => `
                            <div class="thinking-step done">
                                <div class="step-indicator">
                                    <div class="step-dot"></div>
                                    ${i < thinkingData.steps.length - 1 ? '<div class="step-line"></div>' : ''}
                                </div>
                                <div class="step-content">
                                    <div class="step-label">${step.label}</div>
                                    <div class="step-detail">${step.detail}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    },
};
