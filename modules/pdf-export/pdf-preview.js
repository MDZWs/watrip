/**
 * PdfPreview - PDF 预览编辑器
 *
 * 功能：
 *  - 上下滑动连续预览（A4纸张样式，无缝衔接）
 *  - 内容可直接编辑（contenteditable + 工具栏：加粗/字号/颜色/对齐）
 *  - 自动按时间线生成（行程 → 天 → 景点 → 笔记/照片）
 *  - 图片可上传/添加/删除/备注，大小可调节（小/中/大）
 *  - html2canvas + jsPDF 导出多页 PDF（自动按A4高度切割）
 */
(function () {
  'use strict';

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const PIXELS_PER_MM = 3.78;

  const PdfPreview = {
    state: {
      overlay: null,
      trips: [],
      imageSize: 'medium',
    },

    /**
     * 打开预览编辑器
     */
    open(trips) {
      if (!trips || trips.length === 0) {
        if (typeof UiKit !== 'undefined') UiKit.toast('没有可导出的行程', 'info');
        return;
      }
      // 深拷贝，避免编辑污染原始数据
      this.state.trips = JSON.parse(JSON.stringify(trips));
      this.state.imageSize = 'medium';
      this._buildOverlay();
      this._buildContent();
      document.body.appendChild(this.state.overlay);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        this.state.overlay.classList.add('show');
      });
    },

    close() {
      if (this.state.overlay) {
        this.state.overlay.classList.remove('show');
        setTimeout(() => {
          this.state.overlay.remove();
          this.state.overlay = null;
          document.body.style.overflow = '';
        }, 300);
      }
    },

    // ==================== 构建 UI ====================

    _buildOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'pdf-preview-overlay';
      this.state.overlay = overlay;
    },

    _buildContent() {
      const overlay = this.state.overlay;
      overlay.innerHTML = `
        <div class="pdf-preview-frame">
          <div class="pdf-preview-toolbar">
            <div class="pdf-toolbar-left">
              <button class="pdf-tb-btn" onclick="PdfPreview.close()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                返回
              </button>
              <div class="pdf-tb-divider"></div>
              <span class="pdf-tb-title">PDF 预览编辑</span>
            </div>
            <div class="pdf-toolbar-center">
              <button class="pdf-tb-tool" data-cmd="bold" title="加粗"><b>B</b></button>
              <button class="pdf-tb-tool" data-cmd="italic" title="斜体"><i>I</i></button>
              <button class="pdf-tb-tool" data-cmd="underline" title="下划线"><u>U</u></button>
              <div class="pdf-tb-divider"></div>
              <select class="pdf-tb-select" data-cmd="fontSize" title="字号">
                <option value="">字号</option>
                <option value="2">小</option>
                <option value="3">正常</option>
                <option value="4">中</option>
                <option value="5">大</option>
                <option value="6">特大</option>
              </select>
              <input type="color" class="pdf-tb-color" data-cmd="foreColor" title="文字颜色" value="#333333">
              <div class="pdf-tb-divider"></div>
              <button class="pdf-tb-tool" data-cmd="justifyLeft" title="左对齐">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
              </button>
              <button class="pdf-tb-tool" data-cmd="justifyCenter" title="居中">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              </button>
              <div class="pdf-tb-divider"></div>
              <div class="pdf-tb-img-size" title="图片大小">
                <button class="pdf-tb-img-btn" data-size="small" onclick="PdfPreview.setImageSize('small')">小</button>
                <button class="pdf-tb-img-btn active" data-size="medium" onclick="PdfPreview.setImageSize('medium')">中</button>
                <button class="pdf-tb-img-btn" data-size="large" onclick="PdfPreview.setImageSize('large')">大</button>
              </div>
            </div>
            <div class="pdf-toolbar-right">
              <button class="pdf-tb-export" onclick="PdfPreview.export()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                下载 PDF
              </button>
            </div>
          </div>

          <div class="pdf-scroll-area" id="pdfScrollArea">
            <div class="pdf-paper" id="pdfPaperMain">
              <div class="pdf-paper-inner" id="pdfPaperInner">
                ${this._buildAllContentHtml()}
              </div>
            </div>
          </div>
        </div>
      `;

      this._bindToolbar();
      this._bindPhotoActions();
    },

    // ==================== 构建内容 ====================

    _buildAllContentHtml() {
      const trips = this.state.trips;
      return trips.map((trip, tripIdx) => {
        return this._buildTripHtml(trip, tripIdx);
      }).join('<div class="pdf-trip-separator"></div>');
    },

    _buildTripHtml(trip, tripIdx) {
      const title = trip.title || trip.destination || '未命名行程';
      const dest = trip.destination || trip.city || '';
      const days = trip.days || trip.dayPlans?.length || 1;
      const startDate = trip.startDate || '';
      const endDate = trip.endDate || '';

      let dateRange = '';
      if (startDate) {
        const sd = new Date(startDate + 'T00:00:00');
        dateRange = sd.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        if (endDate) {
          const ed = new Date(endDate + 'T00:00:00');
          dateRange += ' - ' + ed.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        }
      }

      let daysHtml = '';
      const sd = trip.startDate ? new Date(trip.startDate + 'T00:00:00') : new Date(trip.savedAt || Date.now());

      (trip.dayPlans || []).forEach((dp, di) => {
        const dayDate = new Date(sd);
        dayDate.setDate(dayDate.getDate() + di);
        const dayDateStr = dayDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
        const dayTheme = dp.theme || `第${di + 1}天`;
        const dayCity = dp.city || '';

        let spotsHtml = '';
        (dp.spots || []).forEach((spot, spotIdx) => {
          const spotName = spot.name || '';
          const spotTime = spot.time || '';
          const spotEmoji = spot.emoji || this._getSpotEmoji(spot.type || spot.name);
          const notes = spot.record?.notes || [];
          const photos = spot.record?.photos || [];

          let notesHtml = '';
          notes.forEach(note => {
            const content = note.html || (note.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
            const notePhotos = note.photos || [];
            let photosHtml = '';
            notePhotos.forEach((p, pi) => {
              const src = p.dataUrl || p;
              const caption = p.caption || '';
              photosHtml += this._buildPhotoBlock(src, caption, tripIdx, di, spotIdx, 'note', pi);
            });
            notesHtml += `
              <div class="pdf-note-text" contenteditable="true">${content}</div>
              ${photosHtml}`;
          });

          let standalonePhotos = '';
          photos.forEach((p, pi) => {
            if (!notes.some(n => (n.photos || []).some(np => np.dataUrl === p.dataUrl || np === p))) {
              const src = p.dataUrl || p;
              const caption = p.caption || '';
              standalonePhotos += this._buildPhotoBlock(src, caption, tripIdx, di, spotIdx, 'spot', pi);
            }
          });

          if (!notesHtml && !standalonePhotos && spotName) {
            notesHtml = `<div class="pdf-note-text" contenteditable="true" data-placeholder="点击添加描述..."></div>`;
          }

          spotsHtml += `
            <div class="pdf-spot">
              <div class="pdf-spot-header">
                <span class="pdf-spot-emoji">${spotEmoji}</span>
                <span class="pdf-spot-name">${spotName}</span>
                ${spotTime ? `<span class="pdf-spot-time">${spotTime}</span>` : ''}
              </div>
              ${notesHtml}
              ${standalonePhotos}
              <button class="pdf-add-photo-btn" onclick="PdfPreview.addPhoto(${tripIdx}, ${di}, ${spotIdx})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                添加图片
              </button>
            </div>`;
        });

        if (spotsHtml === '' && !dp.spots?.length) {
          spotsHtml = '<div class="pdf-empty-day">今日暂无安排</div>';
        }

        daysHtml += `
          <div class="pdf-day">
            <div class="pdf-day-header">
              <span class="pdf-day-num">第${di + 1}天</span>
              <span class="pdf-day-date">${dayDateStr}</span>
              ${dayTheme ? `<span class="pdf-day-theme">${dayTheme}</span>` : ''}
              ${dayCity ? `<span class="pdf-day-city">📍 ${dayCity}</span>` : ''}
            </div>
            ${spotsHtml}
          </div>`;
      });

      if (daysHtml === '') {
        daysHtml = '<div class="pdf-empty-day">暂无行程安排</div>';
      }

      return `
        <div class="pdf-trip" data-trip-idx="${tripIdx}">
          <div class="pdf-paper-cover">
            <div class="pdf-cover-deco"></div>
            <h1 class="pdf-cover-title" contenteditable="true">${title}</h1>
            <div class="pdf-cover-meta">
              ${dest ? `<span>📍 ${dest}</span>` : ''}
              ${dateRange ? `<span>📅 ${dateRange}</span>` : ''}
              <span>🗂️ ${days}天行程</span>
            </div>
            <div class="pdf-cover-line"></div>
          </div>
          <div class="pdf-paper-body">
            ${daysHtml}
          </div>
        </div>`;
    },

    _buildPhotoBlock(src, caption, tripIdx, dayIdx, spotIdx, type, photoIdx) {
      const uid = `photo_${tripIdx}_${dayIdx}_${spotIdx}_${type}_${photoIdx}`;
      return `
        <figure class="pdf-photo-block" data-uid="${uid}">
          <div class="pdf-photo-img-wrap size-${this.state.imageSize}">
            <img src="${src}" class="pdf-photo" />
          </div>
          <figcaption class="pdf-photo-caption" contenteditable="true" data-placeholder="点击添加图片说明...">${caption || ''}</figcaption>
          <button class="pdf-photo-delete" onclick="PdfPreview.deletePhoto('${uid}')" title="删除图片">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </figure>`;
    },

    _getSpotEmoji(type) {
      if (!type) return '📍';
      const map = { '美食':'🍜','餐厅':'🍜','景点':'🏛️','景区':'🏛️','公园':'🌳','自然':'🏞️','博物馆':'🏛️','购物':'🛍️','商场':'🛍️','酒店':'🏨','住宿':'🏨','交通':'🚗','机场':'✈️','车站':'🚉','酒吧':'🍸','咖啡':'☕','咖啡馆':'☕','娱乐':'🎡','演出':'🎭','温泉':'♨️','海滩':'🏖️','山':'⛰️','湖':'💧','寺':'⛩️','塔':'🗼' };
      for (const [k, v] of Object.entries(map)) { if (type.includes(k)) return v; }
      return '📍';
    },

    // ==================== 图片操作 ====================

    addPhoto(tripIdx, dayIdx, spotIdx) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          this._insertPhotoBlock(dataUrl, tripIdx, dayIdx, spotIdx);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },

    _insertPhotoBlock(dataUrl, tripIdx, dayIdx, spotIdx) {
      const spot = this.state.trips[tripIdx]?.dayPlans?.[dayIdx]?.spots?.[spotIdx];
      if (!spot) return;
      if (!spot.record) spot.record = { notes: [], photos: [] };
      if (!spot.record.photos) spot.record.photos = [];

      const photoIdx = spot.record.photos.length;
      spot.record.photos.push({ dataUrl, caption: '' });

      const spotEl = this.state.overlay.querySelector(`.pdf-trip[data-trip-idx="${tripIdx}"] .pdf-day:nth-child(${dayIdx + 1}) .pdf-spot:nth-child(${spotIdx + 1})`);
      if (spotEl) {
        const addBtn = spotEl.querySelector('.pdf-add-photo-btn');
        const html = this._buildPhotoBlock(dataUrl, '', tripIdx, dayIdx, spotIdx, 'spot', photoIdx);
        addBtn.insertAdjacentHTML('beforebegin', html);
      }
    },

    deletePhoto(uid) {
      const el = this.state.overlay.querySelector(`[data-uid="${uid}"]`);
      if (el) {
        el.style.transition = 'opacity 0.2s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 200);
      }
    },

    _bindPhotoActions() {
      // 阻止图片点击进入编辑
      const overlay = this.state.overlay;
      overlay.addEventListener('click', (e) => {
        if (e.target.classList.contains('pdf-photo')) {
          e.stopPropagation();
        }
      });
    },

    // ==================== 图片大小调节 ====================

    setImageSize(size) {
      this.state.imageSize = size;
      const btns = this.state.overlay.querySelectorAll('.pdf-tb-img-btn');
      btns.forEach(b => b.classList.toggle('active', b.dataset.size === size));
      this._applyImageSize();
    },

    _applyImageSize() {
      const wraps = this.state.overlay.querySelectorAll('.pdf-photo-img-wrap');
      wraps.forEach(wrap => {
        wrap.classList.remove('size-small', 'size-medium', 'size-large');
        wrap.classList.add('size-' + this.state.imageSize);
      });
    },

    // ==================== 工具栏 ====================

    _bindToolbar() {
      const tools = this.state.overlay.querySelectorAll('.pdf-tb-tool, .pdf-tb-select, .pdf-tb-color');
      tools.forEach(tool => {
        tool.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const cmd = tool.dataset.cmd;
          if (!cmd) return;

          const sel = window.getSelection();
          if (!sel.rangeCount || sel.isCollapsed) {
            const lastEdited = this.state.overlay.querySelector('.pdf-note-text:focus, .pdf-photo-caption:focus, .pdf-cover-title:focus');
            if (lastEdited) {
              lastEdited.focus();
              const range = document.createRange();
              range.selectNodeContents(lastEdited);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }

          if (tool.tagName === 'SELECT') {
            const val = tool.value;
            if (val) document.execCommand('fontSize', false, val);
            tool.selectedIndex = 0;
          } else if (tool.tagName === 'INPUT') {
            document.execCommand(cmd, false, tool.value);
          } else {
            document.execCommand(cmd, false, null);
          }
        });
      });
    },

    // ==================== 导出 PDF ====================

    async export() {
      const exportBtn = this.state.overlay.querySelector('.pdf-tb-export');
      if (exportBtn.disabled) return;

      if (typeof UiKit !== 'undefined') UiKit.showLoading('生成 PDF...');

      exportBtn.disabled = true;
      exportBtn.innerHTML = '<span class="pdf-tb-spinner"></span> 生成中...';

      try {
        const paperWidth = A4_WIDTH_MM * PIXELS_PER_MM;
        const paperHeight = A4_HEIGHT_MM * PIXELS_PER_MM;

        // 克隆内容到离屏容器，移除contenteditable和操作按钮
        const cloneContainer = document.createElement('div');
        cloneContainer.className = 'pdf-paper';
        cloneContainer.style.cssText = `width:${paperWidth}px;position:absolute;left:-9999px;top:0;visibility:hidden;background:#fff;`;
        cloneContainer.innerHTML = `<div class="pdf-paper-inner">${this.state.overlay.querySelector('#pdfPaperInner').innerHTML}</div>`;
        document.body.appendChild(cloneContainer);

        cloneContainer.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        cloneContainer.querySelectorAll('.pdf-add-photo-btn, .pdf-photo-delete').forEach(el => el.remove());

        // 生成完整canvas
        const fullCanvas = await html2canvas(cloneContainer, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: paperWidth,
          windowWidth: paperWidth,
        });

        cloneContainer.remove();

        // 按A4高度切割canvas为多页
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const canvasScale = fullCanvas.width / paperWidth;
        const pageCanvasHeight = paperHeight * canvasScale;
        const totalPages = Math.ceil(fullCanvas.height / pageCanvasHeight);

        for (let p = 0; p < totalPages; p++) {
          if (typeof UiKit !== 'undefined') UiKit.showLoading(`生成 PDF... ${p + 1}/${totalPages}`);

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = fullCanvas.width;
          pageCanvas.height = Math.min(pageCanvasHeight, fullCanvas.height - p * pageCanvasHeight);
          const ctx = pageCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(fullCanvas, 0, p * pageCanvasHeight, fullCanvas.width, pageCanvas.height, 0, 0, fullCanvas.width, pageCanvas.height);

          const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
          if (p > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
        }

        const filename = this.state.trips.length === 1
          ? `${this.state.trips[0].title || this.state.trips[0].destination || '行程'}.pdf`
          : '旅行记忆合集.pdf';
        pdf.save(filename);

        if (typeof UiKit !== 'undefined') UiKit.hideLoading();
        if (typeof UiKit !== 'undefined') UiKit.toast('PDF 已下载', 'success');
      } catch (e) {
        console.error('[PdfPreview] 导出失败:', e);
        if (typeof UiKit !== 'undefined') {
          UiKit.hideLoading();
          UiKit.toast('导出失败: ' + e.message, 'error');
        }
      } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 下载 PDF';
      }
    },
  };

  window.PdfPreview = PdfPreview;
})();
