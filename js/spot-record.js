(function() {
var SpotRecord = {
    overlay: null,
    di: 0,
    si: 0,
    spot: null,
    editor: null,
    recordMode: 'live',
    autoSaveTimer: null,
    currentFontFamily: 'system-ui',
    currentFontSize: 16,
    currentFontWeight: 400,
    currentLineHeight: 1.8,
    currentLetterSpacing: 0,
    toolbarExpanded: false,
    _activeSlider: null,

    FONTS: [
        { key: 'system-ui', label: '系统', sample: '系统字体' },
        { key: '"PingFang SC", "Microsoft YaHei", sans-serif', label: '黑体', sample: '思源黑体' },
        { key: '"STKaiti", "KaiTi", serif', label: '楷体', sample: '楷体手写' },
        { key: '"STSong", "SimSun", serif', label: '宋体', sample: '宋体印刷' },
        { key: '"Ma Shan Zheng", cursive', label: '手写', sample: '手写字形' },
    ],

    COLORS: ['#333333', '#FF6B6B', '#FF8A3D', '#FFB347', '#4ECDC4', '#45B7D1', '#96CEB4', '#9B59B6', '#E91E63', '#2C3E50'],

    DEFAULT_TOOLBAR: [
        'bold', 'italic', 'underline', '|',
        'justifyLeft', 'justifyCenter', 'justifyRight', '|',
        'textColor', 'list'
    ],
    DEFAULT_INSERT_TOOLBAR: [
        'fontSize', 'fontFamily', 'insertTime', 'insertPhoto', 'spacer', 'ai'
    ],

    getToolbarConfig() {
        try {
            const saved = localStorage.getItem('sr_toolbar_config');
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return { format: [...this.DEFAULT_TOOLBAR], insert: [...this.DEFAULT_INSERT_TOOLBAR] };
    },

    saveToolbarConfig(config) {
        localStorage.setItem('sr_toolbar_config', JSON.stringify(config));
    },

    getToolButton(cmd) {
        const tools = {
            bold: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>', title: '加粗' },
            italic: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>', title: '斜体' },
            underline: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>', title: '下划线' },
            justifyLeft: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>', title: '左对齐', align: true },
            justifyCenter: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>', title: '居中', align: true },
            justifyRight: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>', title: '右对齐', align: true },
            textColor: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 20h16L12 2z" fill="#FF6B6B"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>', title: '颜色' },
            list: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>', title: '列表' },
            fontSize: { html: '<span class="sr-btn-label">字号</span><span class="sr-btn-val" id="srFontVal">16</span>', title: '字号', style: true },
            fontFamily: { html: '<span class="sr-btn-label">字体</span>', title: '字体', style: true },
            insertTime: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', title: '插入时间' },
            insertPhoto: { html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>照片</span>', title: '添加照片', isPhoto: true },
            ai: { html: '<span style="font-size:11px;font-weight:600;">AI</span><span>润色</span>', title: 'AI润色', isAi: true },
            settings: { html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', title: '自定义工具栏' }
        };
        return tools[cmd] || null;
    },

    renderToolbar() {
        const config = this.getToolbarConfig();
        const formatRow = document.querySelector('.sr-toolbar-format');
        const insertRow = document.querySelector('.sr-toolbar-insert');
        if (!formatRow || !insertRow) return;

        const renderBtn = (cmd) => {
            if (cmd === '|') return '<div class="sr-tb-divider"></div>';
            if (cmd === 'spacer') return '<div class="sr-tb-spacer"></div>';
            const tool = this.getToolButton(cmd);
            if (!tool) return '';
            let cls = 'sr-tb-btn';
            if (tool.align) cls += ' sr-align-btn';
            if (tool.style) cls += ' sr-style-btn';
            if (tool.isPhoto) cls += ' sr-photo-btn';
            if (tool.isAi) cls += ' sr-ai-btn';
            return `<button class="${cls}" data-cmd="${cmd}" title="${tool.title}">${tool.html}</button>`;
        };

        formatRow.innerHTML = config.format.map(renderBtn).join('') + 
            `<button class="sr-tb-btn sr-settings-btn" data-cmd="toolbarSettings" title="自定义工具栏">${this.getToolButton('settings').html}</button>`;
        insertRow.innerHTML = config.insert.map(renderBtn).join('');
    },

    openToolbarSettings() {
        const config = this.getToolbarConfig();
        const allFormatTools = ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'textColor', 'list'];
        const allInsertTools = ['fontSize', 'fontFamily', 'insertTime', 'insertPhoto', 'ai'];

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:360px;">
                <div class="ui-modal-title" style="margin-bottom:12px;">⚙️ 自定义工具栏</div>
                <div style="font-size:12px;color:#888;margin-bottom:16px;">点击按钮可显示/隐藏，调整完成后点击保存</div>
                <div style="margin-bottom:16px;">
                    <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#333;">格式工具</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;" id="tbFormatTools">
                        ${allFormatTools.map(cmd => {
                            const tool = this.getToolButton(cmd);
                            const isActive = config.format.includes(cmd);
                            return `<button class="tb-toggle-btn ${isActive ? 'active' : ''}" data-cmd="${cmd}" data-row="format">${tool.title}</button>`;
                        }).join('')}
                    </div>
                </div>
                <div style="margin-bottom:20px;">
                    <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#333;">插入工具</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;" id="tbInsertTools">
                        ${allInsertTools.map(cmd => {
                            const tool = this.getToolButton(cmd);
                            const isActive = config.insert.includes(cmd);
                            return `<button class="tb-toggle-btn ${isActive ? 'active' : ''}" data-cmd="${cmd}" data-row="insert">${tool.title}</button>`;
                        }).join('')}
                    </div>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="ui-modal-btn ui-modal-cancel" id="tbResetBtn" style="flex:1;">恢复默认</button>
                    <button class="ui-modal-btn ui-modal-confirm" id="tbSaveBtn" style="flex:1;">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };

        const newConfig = { format: [...config.format], insert: [...config.insert] };

        mask.querySelectorAll('.tb-toggle-btn').forEach(btn => {
            btn.onclick = () => {
                const cmd = btn.dataset.cmd;
                const row = btn.dataset.row;
                const isActive = btn.classList.contains('active');
                if (isActive) {
                    btn.classList.remove('active');
                    const idx = newConfig[row].indexOf(cmd);
                    if (idx > -1) newConfig[row].splice(idx, 1);
                } else {
                    btn.classList.add('active');
                    if (!newConfig[row].includes(cmd)) {
                        if (cmd === 'insertPhoto' || cmd === 'ai') {
                            const spacerIdx = newConfig[row].indexOf('spacer');
                            if (spacerIdx > -1) newConfig[row].splice(spacerIdx, 0, cmd);
                            else newConfig[row].push(cmd);
                        } else {
                            newConfig[row].push(cmd);
                        }
                    }
                }
            };
        });

        mask.querySelector('#tbResetBtn').onclick = () => {
            newConfig.format = [...this.DEFAULT_TOOLBAR];
            newConfig.insert = [...this.DEFAULT_INSERT_TOOLBAR];
            this.saveToolbarConfig(newConfig);
            this.renderToolbar();
            this._rebindToolbarEvents();
            close();
            UiKit.toast('已恢复默认工具栏', 'success');
        };

        mask.querySelector('#tbSaveBtn').onclick = () => {
            if (!newConfig.format.includes('bold')) newConfig.format.push('bold');
            if (!newConfig.insert.includes('insertPhoto')) {
                const spacerIdx = newConfig.insert.indexOf('spacer');
                if (spacerIdx > -1) newConfig.insert.splice(spacerIdx, 0, 'insertPhoto');
                else newConfig.insert.push('insertPhoto');
            }
            this.saveToolbarConfig(newConfig);
            this.renderToolbar();
            this._rebindToolbarEvents();
            close();
            UiKit.toast('工具栏已更新', 'success');
        };

        mask.onclick = (e) => { if (e.target === mask) close(); };
    },

    _rebindToolbarEvents() {
        if (!this.overlay) return;
        this.overlay.querySelectorAll('.sr-tb-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const cmd = btn.dataset.cmd;
                if (cmd === 'toolbarSettings') {
                    this.openToolbarSettings();
                    return;
                }
                if (!this.editor) {
                    this._createNewNote();
                    setTimeout(() => this._handleToolbarCmd(cmd, btn), 150);
                } else {
                    this._handleToolbarCmd(cmd, btn);
                }
            };
        });
    },

    open(di, si) {
        this.di = di;
        this.si = si;
        this.spot = TripDetail.trip.dayPlans[di]?.spots?.[si];
        if (!this.spot) return;

        if (!this.spot.record) this.spot.record = {
            notes: [],
            photos: [],
            mode: 'live',
            createdAt: Date.now()
        };
        if (!this.spot.record.notes) this.spot.record.notes = [];
        if (!this.spot.record.photos) this.spot.record.photos = this.spot.photos || [];

        this._checkLocationMode();
        this._createOverlay();
        this._renderNotesList();
        this._bindEvents();
    },

    close() {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            setTimeout(() => {
                if (this.overlay) this.overlay.remove();
                this.overlay = null;
                this.editor = null;
            }, 300);
        }
        if (TripDetail) TripDetail.renderItinerary();
    },

    _checkLocationMode() {
        const record = this.spot.record;
        const now = new Date();
        const isToday = TripDetail.currentDay === this.di;
        
        if (!record.mode) {
            record.mode = isToday ? 'live' : 'memory';
        }
        this.recordMode = record.mode;
        this._locationVerified = false;
        if (this.recordMode === 'live') {
            this._verifyLocation();
        }
    },

    async _verifyLocation() {
        if (!this.spot.lng || !this.spot.lat) {
            this._locationVerified = true;
            return;
        }
        if (!navigator.geolocation) {
            this._locationVerified = true;
            return;
        }
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 60000
                });
            });
            const dist = this._calcDistance(
                position.coords.latitude, position.coords.longitude,
                this.spot.lat, this.spot.lng
            );
            this._locationVerified = dist <= 500;
            if (!this._locationVerified) {
                UiKit.toast('当前不在景点附近，将以回忆模式记录', 'info');
                this.recordMode = 'memory';
                this.spot.record.mode = 'memory';
            }
        } catch(e) {
            this._locationVerified = true;
        }
    },

    _calcDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lng2-lng1) * Math.PI/180;
        const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    _createOverlay() {
        const spot = this.spot;
        const hasNotes = (spot.record.notes || []).length > 0;

        const mask = document.createElement('div');
        mask.className = 'spot-record-mask';
        mask.innerHTML = `
            <div class="sr-container">
                <div class="sr-header">
                    <button class="sr-back-btn" id="srBackBtn">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div class="sr-header-info">
                        <div class="sr-spot-name">${this._escapeHtml(spot.name)}</div>
                        <div class="sr-mode-switch">
                            <button class="sr-mode-btn ${this.recordMode === 'live' ? 'active' : ''}" data-mode="live">
                                <span class="sr-mode-dot ${this.recordMode === 'live' ? 'live' : ''}"></span>
                                实况
                            </button>
                            <button class="sr-mode-btn ${this.recordMode === 'memory' ? 'active' : ''}" data-mode="memory">
                                <span class="sr-mode-dot memory"></span>
                                回忆
                            </button>
                        </div>
                    </div>
                    <button class="sr-save-btn" id="srSaveBtn">完成</button>
                </div>

                <div class="sr-toolbar" id="srToolbar" style="display:none;">
                    <div class="sr-toolbar-row sr-toolbar-format"></div>
                    <div class="sr-toolbar-row sr-toolbar-insert"></div>
                    <div class="sr-slider-panel" id="srSliderPanel"></div>
                </div>

                <div class="sr-body" id="srBody">
                    <div class="sr-notes-header" id="srNotesHeader" style="display:none;">
                        <button class="sr-ai-summary-btn" id="srAiSummaryBtn">
                            <span>✨</span> AI总结成攻略
                        </button>
                    </div>
                    <div class="sr-notes-list" id="srNotesList"></div>
                    <div class="sr-editor-area" id="srEditorArea" style="display:none;">
                        <div class="sr-editor-meta">
                            <span class="sr-meta-time" id="srNoteTime"></span>
                            <span class="sr-meta-mode" id="srNoteMode"></span>
                        </div>
                        <div class="sr-editor" id="srEditor" contenteditable="true"></div>
                    </div>
                    <div class="sr-empty-state" id="srEmpty">
                        <div class="sr-empty-icon">✏️</div>
                        <div class="sr-empty-text">还没有记录，写下你的想法吧</div>
                        <button class="sr-add-note-btn" id="srAddNoteBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            写想法
                        </button>
                    </div>
                </div>

                <div class="sr-footer" id="srFooter" style="display:none;">
                    <button class="sr-footer-btn sr-cancel-btn" id="srCancelBtn">取消</button>
                    <button class="sr-footer-btn sr-save-main-btn" id="srSaveNoteBtn">保存记录</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        this.overlay = mask;
        requestAnimationFrame(() => mask.classList.add('show'));

        this._initSliders();
        this.renderToolbar();
    },

    _initSliders() {
        this.sliders = {
            fontSize: { min: 12, max: 36, value: 16, step: 1, unit: 'px', label: '字号', apply: this._applyFontSize.bind(this) },
            fontWeight: { min: 300, max: 900, value: 400, step: 100, unit: '', label: '粗细', apply: this._applyFontWeight.bind(this), labels: { 300: '纤细', 400: '常规', 500: '中等', 600: '半粗', 700: '加粗', 800: '粗体', 900: '特粗' } },
            lineHeight: { min: 12, max: 30, value: 18, step: 1, unit: '', label: '行距', apply: this._applyLineHeight.bind(this), display: v => (v/10).toFixed(1) }
        };
    },

    _showSliderPanel(type) {
        const panel = document.getElementById('srSliderPanel');
        
        if (this._activeSlider === type) {
            this._hideSliderPanel();
            return;
        }

        this._activeSlider = type;

        if (type === 'fontFamily') {
            panel.innerHTML = this._renderFontPicker();
            panel.style.display = 'flex';
            this._bindFontEvents(panel);
            return;
        }

        if (type === 'textColor') {
            panel.innerHTML = this._renderColorPicker();
            panel.style.display = 'flex';
            this._bindColorEvents(panel);
            return;
        }

        const config = this.sliders[type];
        if (!config) return;

        const displayVal = config.display ? config.display(config.value) : config.value + config.unit;
        panel.innerHTML = `
            <div class="sr-slider-panel-inner">
                <div class="sr-slider-header">
                    <span class="sr-slider-title">${config.label}</span>
                    <span class="sr-slider-current" id="srSliderCurrent">${displayVal}</span>
                </div>
                <div class="sr-slider-track-wrap">
                    <input type="range" class="sr-slider-input" id="srSliderInput" 
                        min="${config.min}" max="${config.max}" value="${config.value}" step="${config.step}">
                    <div class="sr-slider-ticks">
                        <span>小</span>
                        <span>大</span>
                    </div>
                </div>
                <div class="sr-slider-quick">
                    ${this._getQuickButtons(type)}
                </div>
            </div>
        `;
        panel.style.display = 'flex';
        this._bindSliderEvents(panel, type);
    },

    _getQuickButtons(type) {
        if (type === 'fontSize') {
            return [14, 16, 18, 20, 24].map(v => `
                <button class="sr-quick-btn ${this.sliders.fontSize.value === v ? 'active' : ''}" data-val="${v}">${v}</button>
            `).join('');
        }
        if (type === 'fontWeight') {
            return [400, 500, 600, 700].map(v => `
                <button class="sr-quick-btn ${this.sliders.fontWeight.value === v ? 'active' : ''}" data-val="${v}">${this.sliders.fontWeight.labels[v]}</button>
            `).join('');
        }
        if (type === 'lineHeight') {
            return [14, 16, 18, 22, 26].map(v => `
                <button class="sr-quick-btn ${this.sliders.lineHeight.value === v ? 'active' : ''}" data-val="${v}">${(v/10).toFixed(1)}</button>
            `).join('');
        }
        return '';
    },

    _hideSliderPanel() {
        const panel = document.getElementById('srSliderPanel');
        panel.style.display = 'none';
        panel.innerHTML = '';
        this._activeSlider = null;
    },

    _renderFontPicker() {
        return `
            <div class="sr-font-picker">
                <div class="sr-slider-header">
                    <span class="sr-slider-title">字体</span>
                </div>
                <div class="sr-font-grid">
                    ${this.FONTS.map(f => `
                        <button class="sr-font-opt ${f.key === this.currentFontFamily ? 'active' : ''}" data-font="${f.key}" style="font-family:${f.key}">
                            <span class="sr-font-sample">${f.sample}</span>
                            <span class="sr-font-label">${f.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    _renderColorPicker() {
        return `
            <div class="sr-color-picker-wrap">
                <div class="sr-slider-header">
                    <span class="sr-slider-title">文字颜色</span>
                </div>
                <div class="sr-color-grid">
                    ${this.COLORS.map(c => `
                        <button class="sr-color-opt" data-color="${c}" style="background:${c}"></button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    _bindSliderEvents(panel, type) {
        const input = panel.querySelector('#srSliderInput');
        const current = panel.querySelector('#srSliderCurrent');
        const config = this.sliders[type];

        const updateSlider = (v) => {
            config.value = v;
            config.apply(v);
            const displayVal = config.display ? config.display(v) : v + config.unit;
            current.textContent = displayVal;
            const pct = ((v - config.min) / (config.max - config.min)) * 100;
            input.style.background = `linear-gradient(to right, #FF8A3D 0%, #FF8A3D ${pct}%, #E8E8ED ${pct}%, #E8E8ED 100%)`;
            
            panel.querySelectorAll('.sr-quick-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.val) === v);
            });
        };

        input.oninput = (e) => updateSlider(parseInt(e.target.value));
        
        const pct = ((config.value - config.min) / (config.max - config.min)) * 100;
        input.style.background = `linear-gradient(to right, #FF8A3D 0%, #FF8A3D ${pct}%, #E8E8ED ${pct}%, #E8E8ED 100%)`;

        panel.querySelectorAll('.sr-quick-btn').forEach(btn => {
            btn.onclick = () => {
                const v = parseInt(btn.dataset.val);
                input.value = v;
                updateSlider(v);
            };
        });
    },

    _bindFontEvents(panel) {
        panel.querySelectorAll('.sr-font-opt').forEach(btn => {
            btn.onclick = () => {
                this.currentFontFamily = btn.dataset.font;
                this._applyFontFamily(btn.dataset.font);
                panel.querySelectorAll('.sr-font-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
    },

    _bindColorEvents(panel) {
        panel.querySelectorAll('.sr-color-opt').forEach(btn => {
            btn.onclick = () => {
                document.execCommand('foreColor', false, btn.dataset.color);
                this._hideSliderPanel();
                this.editor?.focus();
            };
        });
    },

    _getCurrentBlock() {
        const sel = window.getSelection();
        if (!sel?.anchorNode) return null;
        let el = sel.anchorNode;
        while (el && el !== this.editor) {
            if (el.nodeType === 1 && ['P','DIV','LI','BLOCKQUOTE','H1','H2','H3'].includes(el.tagName)) {
                return el;
            }
            el = el.parentNode;
        }
        return null;
    },

    _wrapSelection(styleObj) {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) {
            const block = this._getCurrentBlock();
            if (block) {
                Object.assign(block.style, styleObj);
            }
            return;
        }
        const range = sel.getRangeAt(0);
        const contents = range.extractContents();
        const span = document.createElement('span');
        Object.assign(span.style, styleObj);
        span.appendChild(contents);
        range.insertNode(span);
        sel.removeAllRanges();
    },

    _applyFontSize(v) {
        this.currentFontSize = v;
        const block = this._getCurrentBlock();
        if (block) {
            block.style.fontSize = v + 'px';
        } else {
            document.execCommand('fontSize', false, '7');
            const fonts = this.editor?.querySelectorAll('font[size="7"]');
            fonts?.forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = v + 'px';
            });
        }
        const valEl = document.getElementById('srFontVal');
        if (valEl) valEl.textContent = v;
    },

    _applyFontWeight(v) {
        this.currentFontWeight = v;
        const block = this._getCurrentBlock();
        if (block) {
            block.style.fontWeight = v;
        } else {
            this._wrapSelection({ fontWeight: v });
        }
    },

    _applyLineHeight(v) {
        this.currentLineHeight = v / 10;
        const block = this._getCurrentBlock();
        if (block) {
            block.style.lineHeight = (v/10).toFixed(1);
        }
    },

    _applyFontFamily(font) {
        this.currentFontFamily = font;
        document.execCommand('fontName', false, font);
    },

    _renderNotesList() {
        const notes = this.spot.record.notes || [];
        const listEl = document.getElementById('srNotesList');
        const emptyEl = document.getElementById('srEmpty');
        const editorArea = document.getElementById('srEditorArea');
        const notesHeader = document.getElementById('srNotesHeader');
        const toolbar = document.getElementById('srToolbar');
        const sliderPanel = document.getElementById('srSliderPanel');

        if (toolbar) toolbar.style.display = 'none';
        if (sliderPanel) sliderPanel.style.display = 'none';
        this._activeSlider = null;

        if (notes.length === 0) {
            listEl.style.display = 'none';
            emptyEl.style.display = 'flex';
            editorArea.style.display = 'none';
            notesHeader.style.display = 'none';
            document.getElementById('srFooter').style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        listEl.style.display = 'flex';
        editorArea.style.display = 'none';
        notesHeader.style.display = notes.length > 0 ? 'block' : 'none';
        document.getElementById('srFooter').style.display = 'none';

        const aiBtn = document.getElementById('srAiSummaryBtn');
        if (aiBtn) {
            aiBtn.onclick = () => this._aiSummary();
        }

        listEl.innerHTML = notes.map((note, i) => `
            <div class="sr-timeline-item">
                <div class="sr-timeline-dot ${note.mode}"></div>
                <div class="sr-note-card" data-idx="${i}">
                    <div class="sr-note-header">
                        <span class="sr-note-time">${this._formatTime(note.createdAt)}</span>
                        <span class="sr-note-mode ${note.mode}">${note.mode === 'live' ? '🔴 实况' : '💭 回忆'}</span>
                        <button class="sr-note-del" onclick="event.stopPropagation();SpotRecord.deleteNote(${i})">✕</button>
                    </div>
                    <div class="sr-note-content">${note.html || this._escapeHtml(note.text || '')}</div>
                    ${note.photos && note.photos.length > 0 ? `
                        <div class="sr-note-photos">
                            ${note.photos.slice(0, 6).map(p => `<img src="${p.dataUrl || p}" class="sr-note-photo" onclick="event.stopPropagation();">`).join('')}
                            ${note.photos.length > 6 ? `<div class="sr-note-more">+${note.photos.length - 6}</div>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('') + `
            <button class="sr-timeline-add-btn" id="srTimelineAddBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                <span>添加新记录</span>
                <span class="sr-timeline-add-time">${this._formatCurrentTime()}</span>
            </button>
        `;

        listEl.querySelectorAll('.sr-note-card').forEach(card => {
            card.onclick = () => {
                const idx = parseInt(card.dataset.idx);
                this._editNote(idx);
            };
        });

        const addBtn = document.getElementById('srTimelineAddBtn');
        if (addBtn) {
            addBtn.onclick = () => this._createNewNote();
        }
    },

    _formatCurrentTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    },

    _editNote(idx) {
        const note = this.spot.record.notes[idx];
        if (!note) return;
        this._editingIdx = idx;
        this._openEditor(note);
    },

    _createNewNote() {
        this._editingIdx = -1;
        const note = {
            id: 'note_' + Date.now(),
            mode: this.recordMode,
            html: '',
            text: '',
            photos: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this._openEditor(note);
    },

    _openEditor(note) {
        const listEl = document.getElementById('srNotesList');
        const emptyEl = document.getElementById('srEmpty');
        const editorArea = document.getElementById('srEditorArea');
        const footer = document.getElementById('srFooter');
        const toolbar = document.getElementById('srToolbar');
        const notesHeader = document.getElementById('srNotesHeader');

        listEl.style.display = 'none';
        emptyEl.style.display = 'none';
        if (notesHeader) notesHeader.style.display = 'none';
        editorArea.style.display = 'flex';
        footer.style.display = 'flex';
        if (toolbar) toolbar.style.display = 'block';
        this._hideSliderPanel();

        document.getElementById('srNoteTime').textContent = this._formatTime(note.createdAt);
        document.getElementById('srNoteMode').textContent = note.mode === 'live' ? '🔴 实况记录' : '💭 回忆记录';
        document.getElementById('srNoteMode').className = 'sr-meta-mode ' + note.mode;

        this.editor = document.getElementById('srEditor');
        this.editor.innerHTML = note.html || '';
        this.editor.focus();

        this._currentNote = note;
        this._setupAutoSave();
        this._updateAlignStates();
    },

    _setupAutoSave() {
        if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = setInterval(() => {
            if (this.editor) {
                this._currentNote.html = this.editor.innerHTML;
                this._currentNote.text = this.editor.innerText;
                this._currentNote.updatedAt = Date.now();
                this.spot.record.updatedAt = Date.now();
                TripDetail._saveTrip();
            }
        }, 2000);
    },

    _saveNote() {
        if (!this._currentNote || !this.editor) return;
        this._currentNote.html = this.editor.innerHTML;
        this._currentNote.text = this.editor.innerText;
        this._currentNote.updatedAt = Date.now();
        this.spot.record.updatedAt = Date.now();

        if (this._editingIdx >= 0) {
            this.spot.record.notes[this._editingIdx] = this._currentNote;
        } else {
            this.spot.record.notes.push(this._currentNote);
        }

        if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
        
        const trip = TripDetail.trip;
        trip._lastModified = Date.now();
        TripDetail._saveTrip();
        
        this._renderNotesList();
        UiKit.toast('已保存', 'success');
    },

    async deleteNote(idx) {
        const ok = await UiKit.confirm('确定删除这条记录吗？', { title: '删除记录', confirmText: '删除', cancelText: '取消' });
        if (!ok) return;
        this.spot.record.notes.splice(idx, 1);
        TripDetail._saveTrip();
        this._renderNotesList();
        UiKit.toast('已删除', 'success');
    },

    _insertTime() {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        const timeHtml = `<span style="background:#FFF0E6;color:#FF8A3D;padding:3px 10px;border-radius:100px;font-size:0.85em;font-weight:500;display:inline-block;margin:2px 4px;">🕐 ${timeStr}</span>&nbsp;`;
        document.execCommand('insertHTML', false, timeHtml);
    },

    async _insertPhoto() {
        const photos = await PhotoUpload.selectAndCompress();
        if (!photos || photos.length === 0) return;
        
        photos.forEach(p => {
            const imgHtml = `<div style="margin:12px 0;"><img src="${p.dataUrl}" style="max-width:100%;border-radius:12px;display:block;"></div>`;
            document.execCommand('insertHTML', false, imgHtml);
            if (!this._currentNote.photos) this._currentNote.photos = [];
            this._currentNote.photos.push(p);
        });
    },

    _toggleList() {
        document.execCommand('insertUnorderedList', false, null);
    },

    _indent() {
        document.execCommand('indent', false, null);
    },

    _outdent() {
        document.execCommand('outdent', false, null);
    },

    _toggleParaIndent() {
        const block = this._getCurrentBlock();
        if (block) {
            const currentIndent = block.style.textIndent;
            block.style.textIndent = currentIndent === '2em' ? '' : '2em';
        } else {
            document.execCommand('insertHTML', false, '<p style="text-indent:2em;margin:10px 0;line-height:1.8;"></p>');
        }
    },

    _insertLineBreak() {
        document.execCommand('insertHTML', false, '<br><br>');
    },

    _alignLeft() { document.execCommand('justifyLeft', false, null); },
    _alignCenter() { document.execCommand('justifyCenter', false, null); },
    _alignRight() { document.execCommand('justifyRight', false, null); },

    async _aiPolish() {
        if (!this.editor || !this._currentNote) return;
        const text = this.editor.innerText?.trim();
        if (!text || text.length < 5) {
            UiKit.toast('内容太少，无法润色', 'info');
            return;
        }
        if (typeof AIService === 'undefined') {
            UiKit.toast('AI服务暂不可用', 'info');
            return;
        }

        UiKit.showLoading('AI润色中...');
        try {
            const result = await AIService.ask(
                `请对以下旅行手帐内容进行润色，保持原意，让文字更生动优美，适合作为旅行回忆：\n\n${text}\n\n只返回润色后的内容，不要加解释。`
            );
            UiKit.hideLoading();
            if (result) {
                document.execCommand('selectAll', false, null);
                document.execCommand('insertHTML', false, result.replace(/\n/g, '<br>'));
                UiKit.toast('润色完成', 'success');
            }
        } catch(e) {
            UiKit.hideLoading();
            UiKit.toast('润色失败，请重试', 'error');
        }
    },

    async _aiSummary() {
        const notes = this.spot.record.notes || [];
        if (notes.length === 0) {
            UiKit.toast('还没有记录可总结', 'info');
            return;
        }
        if (typeof AIService === 'undefined') {
            UiKit.toast('AI服务暂不可用', 'info');
            return;
        }

        const allText = notes.map(n => n.text || '').filter(Boolean).join('\n\n');
        if (allText.length < 10) {
            UiKit.toast('内容太少，无法总结', 'info');
            return;
        }

        UiKit.showLoading('AI正在总结攻略...');
        try {
            const result = await AIService.askForJSON(
                `基于以下关于「${this.spot.name}」的旅行手帐记录，总结成结构化的旅行攻略：\n\n${allText}`,
                `{
                    "summary": "一句话总结这个地点的游玩体验（30字以内）",
                    "tips": ["实用贴士1", "实用贴士2", "实用贴士3"],
                    "bestTime": "最佳游玩时间建议",
                    "recommend": true/false,
                    "highlights": "亮点总结，一句话",
                    "warnings": "避坑提醒，没有则为空字符串"
                }`,
                { temperature: 0.6 }
            );
            UiKit.hideLoading();

            if (result.success && result.data) {
                this._showSummaryResult(result.data);
            } else {
                UiKit.toast('总结失败，请重试', 'error');
            }
        } catch(e) {
            UiKit.hideLoading();
            UiKit.toast('总结失败，请重试', 'error');
        }
    },

    _showSummaryResult(data) {
        const tipsHtml = (data.tips || []).map(t => `<li>${this._escapeHtml(t)}</li>`).join('');
        const html = `
            <div class="sr-summary-result">
                <div class="sr-sum-header">
                    <span class="sr-sum-icon">✨</span>
                    <span class="sr-sum-title">AI 攻略总结</span>
                </div>
                <div class="sr-sum-section">
                    <div class="sr-sum-label">📝 总结</div>
                    <div class="sr-sum-text">${this._escapeHtml(data.summary || '')}</div>
                </div>
                ${data.highlights ? `
                <div class="sr-sum-section">
                    <div class="sr-sum-label">⭐ 亮点</div>
                    <div class="sr-sum-text">${this._escapeHtml(data.highlights)}</div>
                </div>` : ''}
                ${data.bestTime ? `
                <div class="sr-sum-section">
                    <div class="sr-sum-label">⏰ 最佳时间</div>
                    <div class="sr-sum-text">${this._escapeHtml(data.bestTime)}</div>
                </div>` : ''}
                ${tipsHtml ? `
                <div class="sr-sum-section">
                    <div class="sr-sum-label">💡 实用贴士</div>
                    <ul class="sr-sum-tips">${tipsHtml}</ul>
                </div>` : ''}
                ${data.warnings ? `
                <div class="sr-sum-section">
                    <div class="sr-sum-label">⚠️ 避坑提醒</div>
                    <div class="sr-sum-text" style="color:#FF3B30;">${this._escapeHtml(data.warnings)}</div>
                </div>` : ''}
                <div class="sr-sum-actions">
                    <button class="sr-sum-btn sr-sum-copy" id="srSumCopy">复制攻略</button>
                    <button class="sr-sum-btn sr-sum-share" id="srSumShare">分享到社区</button>
                </div>
            </div>
        `;

        const mask = document.createElement('div');
        mask.className = 'ui-modal-mask';
        mask.innerHTML = `
            <div class="ui-modal" style="max-width:340px;">
                <div class="ui-modal-body" style="padding:0;max-height:60vh;overflow-y:auto;">
                    ${html}
                </div>
                <div class="ui-modal-actions">
                    <button class="ui-modal-btn ui-modal-cancel" id="srSumClose">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.classList.add('ui-modal-show'));

        const close = () => {
            mask.classList.remove('ui-modal-show');
            setTimeout(() => mask.remove(), 200);
        };

        mask.querySelector('#srSumClose').onclick = close;
        mask.querySelector('#srSumCopy').onclick = () => {
            const text = `【${this.spot.name}】\n${data.summary}\n\n亮点：${data.highlights || ''}\n最佳时间：${data.bestTime || ''}\n\n贴士：\n${(data.tips || []).map(t => '· ' + t).join('\n')}${data.warnings ? '\n\n⚠️ ' + data.warnings : ''}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => UiKit.toast('已复制到剪贴板', 'success'));
            } else {
                UiKit.toast('复制成功', 'success');
            }
        };
        mask.querySelector('#srSumShare').onclick = () => {
            close();
            this._shareToCommunity(data);
        };
        mask.onclick = (e) => { if (e.target === mask) close(); };
    },

    _shareToCommunity(summaryData) {
        if (typeof TravelNote === 'undefined') {
            UiKit.toast('社区功能暂不可用', 'info');
            return;
        }
        const content = `【${this.spot.name}】\n\n${summaryData.summary}\n\n${summaryData.highlights ? '⭐ ' + summaryData.highlights + '\n\n' : ''}${summaryData.bestTime ? '⏰ 最佳时间：' + summaryData.bestTime + '\n\n' : ''}${(summaryData.tips || []).length > 0 ? '💡 实用贴士：\n' + summaryData.tips.map(t => '· ' + t).join('\n') + '\n\n' : ''}${summaryData.warnings ? '⚠️ ' + summaryData.warnings : ''}`;
        if (TravelNote.createFromSpot) {
            TravelNote.createFromSpot(this.spot, content, this.di);
        } else {
            UiKit.toast('分享功能开发中...', 'info');
        }
    },

    _bindEvents() {
        document.getElementById('srBackBtn').onclick = () => this.close();
        document.getElementById('srSaveBtn').onclick = () => this.close();
        document.getElementById('srAddNoteBtn').onclick = () => this._createNewNote();
        document.getElementById('srCancelBtn').onclick = () => {
            if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
            this._renderNotesList();
        };
        document.getElementById('srSaveNoteBtn').onclick = () => this._saveNote();

        this.overlay.querySelectorAll('.sr-mode-btn').forEach(btn => {
            btn.onclick = () => {
                this.recordMode = btn.dataset.mode;
                this.spot.record.mode = this.recordMode;
                this.overlay.querySelectorAll('.sr-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        this.overlay.querySelectorAll('.sr-tb-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const cmd = btn.dataset.cmd;
                if (!this.editor) {
                    this._createNewNote();
                    setTimeout(() => this._handleToolbarCmd(cmd, btn), 150);
                } else {
                    this._handleToolbarCmd(cmd, btn);
                }
            };
        });

        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.close();
            if (!e.target.closest('.sr-slider-panel') && !e.target.closest('.sr-style-btn') && !e.target.closest('#srColorBtn')) {
                this._hideSliderPanel();
            }
        };

        document.addEventListener('selectionchange', () => {
            if (this.editor && document.activeElement === this.editor) {
                this._updateToolbarState();
                this._updateToolbarActiveStates();
                this._updateAlignStates();
            }
        });
    },

    _updateToolbarState() {
        try {
            const block = this._getCurrentBlock();
            if (block) {
                const fs = parseInt(block.style.fontSize) || this.currentFontSize;
                this.sliders.fontSize.value = fs;
                const valEl = document.getElementById('srFontVal');
                if (valEl) valEl.textContent = fs;
            }
        } catch(e) {}
    },

    _handleToolbarCmd(cmd, btn) {
        if (this.editor) {
            this.editor.focus();
            const selection = window.getSelection();
            if (selection && selection.rangeCount === 0) {
                const range = document.createRange();
                range.selectNodeContents(this.editor);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        switch(cmd) {
            case 'bold':
                document.execCommand('bold', false, null);
                this._updateToolbarActiveStates();
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                this._updateToolbarActiveStates();
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                this._updateToolbarActiveStates();
                break;
            case 'fontSize': this._showSliderPanel('fontSize'); break;
            case 'fontWeight': this._showSliderPanel('fontWeight'); break;
            case 'lineHeight': this._showSliderPanel('lineHeight'); break;
            case 'fontFamily': this._showSliderPanel('fontFamily'); break;
            case 'textColor': this._showSliderPanel('textColor'); break;
            case 'justifyLeft':
                this._alignLeft();
                this._updateAlignStates();
                break;
            case 'justifyCenter':
                this._alignCenter();
                this._updateAlignStates();
                break;
            case 'justifyRight':
                this._alignRight();
                this._updateAlignStates();
                break;
            case 'list': this._toggleList(); break;
            case 'indent': this._indent(); break;
            case 'outdent': this._outdent(); break;
            case 'paraIndent': this._toggleParaIndent(); break;
            case 'lineBreak': this._insertLineBreak(); break;
            case 'insertTime': this._insertTime(); break;
            case 'insertPhoto': this._insertPhoto(); break;
            case 'ai': this._aiPolish(); break;
        }
    },

    _updateToolbarActiveStates() {
        setTimeout(() => {
            const states = {
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline')
            };
            this.overlay?.querySelectorAll('.sr-tb-btn[data-cmd]').forEach(btn => {
                const cmd = btn.dataset.cmd;
                if (['bold', 'italic', 'underline'].includes(cmd)) {
                    btn.classList.toggle('active', states[cmd]);
                }
            });
        }, 10);
    },

    _updateAlignStates() {
        setTimeout(() => {
            this.overlay?.querySelectorAll('.sr-align-btn').forEach(btn => btn.classList.remove('active'));
            if (document.queryCommandState('justifyLeft')) {
                this.overlay?.querySelector('[data-cmd="justifyLeft"]')?.classList.add('active');
            } else if (document.queryCommandState('justifyCenter')) {
                this.overlay?.querySelector('[data-cmd="justifyCenter"]')?.classList.add('active');
            } else if (document.queryCommandState('justifyRight')) {
                this.overlay?.querySelector('[data-cmd="justifyRight"]')?.classList.add('active');
            }
        }, 10);
    },

    _formatTime(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        if (isToday) return `今天 ${time}`;
        return `${d.getMonth()+1}月${d.getDate()}日 ${time}`;
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    hasUnread(spot) {
        if (!spot?.record?.notes) return true;
        return spot.record.notes.length === 0;
    },

    getStructuredData(spot) {
        if (!spot?.record) return null;
        return {
            notes: (spot.record.notes || []).map(n => ({
                id: n.id,
                mode: n.mode,
                html: n.html,
                text: n.text,
                photos: (n.photos || []).map(p => ({
                    id: p.id,
                    dataUrl: p.dataUrl ? p.dataUrl.substring(0, 100) + '...[truncated]' : null
                })),
                createdAt: n.createdAt,
                updatedAt: n.updatedAt
            })),
            photos: (spot.record.photos || []).length,
            mode: spot.record.mode,
            createdAt: spot.record.createdAt,
            updatedAt: spot.record.updatedAt
        };
    }
};

window.SpotRecord = SpotRecord;
})();
