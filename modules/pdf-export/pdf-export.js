/**
 * PDF 导出模块（Lv4 特权）
 * 职责：选择行程 → 生成打印 HTML → 调用浏览器打印（用户选「另存为 PDF」）
 * 依赖：Auth、UiKit、UIRender、AIMemory、LevelSystem、TripStorage
 *
 * Phase 3.2：等级特权 - Lv4 PDF 导出
 * 技术方案：零依赖，使用 window.print() + 打印专用 CSS
 */
(function (global) {
  const PRINT_CONTAINER_ID = 'pdfPrintContainer';

  const PdfExport = {
    state: {
      printing: false,
    },

    /**
     * 打开行程选择器
     */
    async openTripPicker() {
      // 1. 校验登录
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录', 'info');
        Auth.requireAuth();
        return;
      }
      // 2. 校验特权
      if (typeof LevelSystem !== 'undefined' && !LevelSystem.requirePrivilege('pdf_export')) {
        return;
      }

      UiKit.showLoading('加载行程...');
      try {
        const user = Auth.getCurrentUser();
        let trips = [];
        // 优先云端
        if (typeof TripStorage !== 'undefined') {
          trips = await TripStorage.getUserTrips(user.id);
        }
        // 兜底本地
        if ((!trips || trips.length === 0) && typeof AIMemory !== 'undefined') {
          const localTrips = AIMemory.getAllTrips();
          trips = Object.values(localTrips).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        }
        UiKit.hideLoading();

        if (!trips || trips.length === 0) {
          UiKit.toast('暂无可导出的行程', 'info');
          return;
        }
        this._renderPicker(trips);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[PdfExport] 加载行程失败:', e);
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 渲染行程选择弹窗
     */
    _renderPicker(trips) {
      const listHtml = trips.map(t => {
        const days = t.days || t.dayPlans?.length || 1;
        const spots = t.dayPlans?.reduce((s, d) => s + (d.spots?.length || 0), 0) || 0;
        const dest = t.destination || t.city || '未命名';
        return `
          <div class="pdf-pick-item" data-trip-id="${t.id}" data-cloud-id="${t.cloudId || ''}">
            <div class="pdf-pick-icon">🗺️</div>
            <div class="pdf-pick-info">
              <div class="pdf-pick-title">${t.title || '未命名行程'}</div>
              <div class="pdf-pick-meta">${dest} · ${days}天 · ${spots}个景点</div>
            </div>
            <div class="pdf-pick-action">导出</div>
          </div>
        `;
      }).join('');

      const html = `
        <div class="pdf-pick-wrap">
          <div class="pdf-pick-tip">选择要导出为 PDF 的行程</div>
          <div class="pdf-pick-intro">
            <div class="pdf-pick-intro-title">📄 PDF 导出能为你做什么？</div>
            <div class="pdf-pick-intro-list">
              · 离线打印行程单，旅途中无需联网也能查看<br>
              · 一键分享给同行伙伴，统一行程安排<br>
              · 永久存档经典旅程，留存美好回忆
            </div>
          </div>
          <div class="pdf-pick-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('导出 PDF（Lv4 特权）', html);

      setTimeout(() => {
        const modal = document.getElementById('alertModal');
        if (!modal) return;
        modal.querySelectorAll('.pdf-pick-item').forEach(item => {
          item.onclick = () => {
            const tripId = item.dataset.tripId;
            const cloudId = item.dataset.cloudId;
            modal.classList.remove('show');
            // 优先用 cloudId 查云端，否则用 tripId 查本地
            const id = cloudId || tripId;
            this.exportTrip(id);
          };
        });
      }, 50);
    },

    /**
     * 导出指定行程
     */
    async exportTrip(tripId) {
      if (this.state.printing) return;
      // 再次校验特权（防止绕过）
      if (typeof LevelSystem !== 'undefined' && !LevelSystem.requirePrivilege('pdf_export')) {
        return;
      }

      UiKit.showLoading('生成 PDF...');
      try {
        let trip = null;
        // 优先云端
        if (typeof TripStorage !== 'undefined' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId)) {
          trip = await TripStorage.getTrip(tripId);
        }
        // 兜底本地
        if (!trip && typeof AIMemory !== 'undefined') {
          const all = AIMemory.getAllTrips();
          trip = all[tripId] || Object.values(all).find(t => t.id === tripId || t.cloudId === tripId);
        }
        UiKit.hideLoading();

        if (!trip) {
          UiKit.toast('行程不存在', 'error');
          return;
        }

        this.state.printing = true;
        this._ensurePrintContainer();
        this._ensurePrintCss();

        const html = this._buildPrintHtml(trip);
        const container = document.getElementById(PRINT_CONTAINER_ID);
        container.innerHTML = html;

        // 延迟一帧让浏览器渲染完成再打印
        setTimeout(() => {
          window.print();
          // 清理
          setTimeout(() => {
            container.innerHTML = '';
            this.state.printing = false;
          }, 500);
        }, 100);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[PdfExport] 导出失败:', e);
        UiKit.toast('导出失败', 'error');
        this.state.printing = false;
      }
    },

    /**
     * 导出多个行程（合并为一个PDF，每行程分页）
     */
    async exportTrips(trips) {
      if (this.state.printing) return;
      if (typeof LevelSystem !== 'undefined' && !LevelSystem.requirePrivilege('pdf_export')) {
        return;
      }
      if (!trips || trips.length === 0) {
        UiKit.toast('没有可导出的行程', 'info');
        return;
      }

      UiKit.showLoading('生成 PDF...');
      try {
        this.state.printing = true;
        this._ensurePrintContainer();
        this._ensurePrintCss();

        // 每个行程之间插入分页符
        const html = trips.map((trip, i) => {
          const tripHtml = this._buildPrintHtml(trip);
          return i > 0 ? '<div style="page-break-before:always;"></div>' + tripHtml : tripHtml;
        }).join('');

        const container = document.getElementById(PRINT_CONTAINER_ID);
        container.innerHTML = html;

        UiKit.hideLoading();
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            container.innerHTML = '';
            this.state.printing = false;
          }, 500);
        }, 100);
      } catch (e) {
        UiKit.hideLoading();
        console.error('[PdfExport] 批量导出失败:', e);
        UiKit.toast('导出失败', 'error');
        this.state.printing = false;
      }
    },

    /**
     * 构建打印 HTML
     */
    _buildPrintHtml(trip) {
      const title = trip.title || '未命名行程';
      const dest = trip.destination || trip.city || '';
      const days = trip.days || trip.dayPlans?.length || 1;
      const budget = trip.budget || '';
      const startDate = trip.startDate || '';
      const dateStr = startDate ? new Date(startDate).toLocaleDateString('zh-CN') : '';

      const dayPlans = trip.dayPlans || [];
      const totalSpots = dayPlans.reduce((s, d) => s + (d.spots?.length || 0), 0);

      // 统计花费
      let totalExpense = 0;
      const expenses = trip.expenses || [];
      expenses.forEach(e => { totalExpense += (e.amount || 0); });

      // 封面
      const coverHtml = `
        <div class="pdf-cover">
          <div class="pdf-cover-emoji">🗺️</div>
          <h1 class="pdf-cover-title">${title}</h1>
          <div class="pdf-cover-meta">
            ${dest ? `<span>📍 ${dest}</span>` : ''}
            <span>📅 ${days}天</span>
            <span>🎯 ${totalSpots}个景点</span>
            ${budget ? `<span>💰 ${budget}</span>` : ''}
            ${dateStr ? `<span>出发日 ${dateStr}</span>` : ''}
          </div>
        </div>
      `;

      // 每日行程
      const daysHtml = dayPlans.map((dp, i) => {
        const dayTitle = dp.title || `第 ${i + 1} 天`;
        const dayCity = dp.city || '';
        const spots = dp.spots || [];
        const spotsHtml = spots.length === 0
          ? `<div class="pdf-empty-day">今日无安排</div>`
          : spots.map((s, idx) => {
              const time = s.time || s.timeSec ? (s.time || '') : '';
              const name = s.name || '未命名';
              const desc = s.desc || '';
              const notes = s.record?.notes || [];
              const notesHtml = notes.length > 0 ? notes.map(n => {
                const text = n.text || '';
                const mode = n.mode === 'live' ? '🔴实况' : '💭回忆';
                const noteTime = n.createdAt ? new Date(n.createdAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'}) : '';
                return text ? `<div class="pdf-spot-note"><span class="pdf-note-tag">${mode}${noteTime ? ' ' + noteTime : ''}</span> ${this._escapeHtml(text)}</div>` : '';
              }).join('') : '';
              return `
                <div class="pdf-spot">
                  <div class="pdf-spot-num">${idx + 1}</div>
                  <div class="pdf-spot-main">
                    <div class="pdf-spot-head">
                      <span class="pdf-spot-name">${name}</span>
                      ${time ? `<span class="pdf-spot-time">${time}</span>` : ''}
                    </div>
                    ${desc ? `<div class="pdf-spot-desc">${desc}</div>` : ''}
                    ${notesHtml}
                  </div>
                </div>
              `;
            }).join('');
        return `
          <div class="pdf-day">
            <div class="pdf-day-head">
              <div class="pdf-day-num">DAY ${i + 1}</div>
              <div class="pdf-day-title">${dayTitle}</div>
              ${dayCity ? `<div class="pdf-day-city">📍 ${dayCity}</div>` : ''}
            </div>
            <div class="pdf-spots">${spotsHtml}</div>
          </div>
        `;
      }).join('');

      // 花费清单
      const expensesHtml = expenses.length === 0 ? '' : `
        <div class="pdf-section">
          <div class="pdf-section-title">💰 花费清单（合计 ¥${totalExpense}）</div>
          <div class="pdf-expenses">
            ${expenses.map(e => `
              <div class="pdf-exp-item">
                <span>${e.category || '其他'} · ${e.desc || ''}</span>
                <span>¥${e.amount || 0}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // 页脚
      const footerHtml = `
        <div class="pdf-footer">
          <div>由 哇途·AI旅行规划 生成 · ${new Date().toLocaleDateString('zh-CN')}</div>
        </div>
      `;

      return coverHtml + daysHtml + expensesHtml + footerHtml;
    },

    /**
     * 确保打印容器存在
     */
    _ensurePrintContainer() {
      let el = document.getElementById(PRINT_CONTAINER_ID);
      if (!el) {
        el = document.createElement('div');
        el.id = PRINT_CONTAINER_ID;
        el.className = 'pdf-print-container';
        document.body.appendChild(el);
      }
    },

    /**
     * 注入打印 CSS（仅注入一次）
     */
    _ensurePrintCss() {
      const STYLE_ID = 'pdf-print-style';
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = this._printCss();
      document.head.appendChild(style);
    },

    _escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * 打印 CSS（含打印时隐藏其他元素）
     */
    _printCss() {
      return `
        /* PDF 打印容器：屏幕上隐藏 */
        .pdf-print-container { display: none; }

        /* 打印时：隐藏整个 body，仅显示打印容器 */
        @media print {
          body * { visibility: hidden !important; }
          .pdf-print-container, .pdf-print-container * { visibility: visible !important; }
          .pdf-print-container {
            display: block !important;
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          @page {
            size: A4;
            margin: 12mm 14mm;
          }

          /* 打印内容样式 */
          .pdf-cover {
            text-align: center;
            padding: 30px 0 24px;
            border-bottom: 2px solid #ff8a3d;
            margin-bottom: 20px;
            page-break-after: avoid;
          }
          .pdf-cover-emoji { font-size: 48px; margin-bottom: 8px; }
          .pdf-cover-title {
            font-size: 24px; font-weight: 700; color: #333;
            margin: 0 0 12px;
          }
          .pdf-cover-meta {
            display: flex; flex-wrap: wrap; justify-content: center;
            gap: 10px 16px; font-size: 12px; color: #666;
          }

          .pdf-day {
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .pdf-day-head {
            display: flex; align-items: center; gap: 10px;
            padding: 8px 12px;
            background: #fff6e5;
            border-left: 4px solid #ff8a3d;
            border-radius: 4px;
            margin-bottom: 10px;
            page-break-after: avoid;
          }
          .pdf-day-num {
            font-size: 12px; font-weight: 700;
            color: #ff6b00;
            background: #fff;
            padding: 2px 8px; border-radius: 10px;
          }
          .pdf-day-title { font-size: 15px; font-weight: 600; color: #333; }
          .pdf-day-city { font-size: 12px; color: #999; margin-left: auto; }

          .pdf-spots { padding-left: 6px; }
          .pdf-spot {
            display: flex; gap: 10px;
            padding: 8px 0;
            border-bottom: 1px dashed #eee;
            page-break-inside: avoid;
          }
          .pdf-spot-num {
            width: 22px; height: 22px;
            border-radius: 50%;
            background: #ff8a3d; color: #fff;
            font-size: 11px; font-weight: 600;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .pdf-spot-main { flex: 1; }
          .pdf-spot-head {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 3px;
          }
          .pdf-spot-name { font-size: 14px; font-weight: 600; color: #333; }
          .pdf-spot-time {
            font-size: 11px; color: #ff6b00;
            background: #fff6e5;
            padding: 1px 6px; border-radius: 3px;
          }
          .pdf-spot-desc { font-size: 12px; color: #666; line-height: 1.5; }
          .pdf-spot-note {
            font-size: 11px; color: #555; line-height: 1.6;
            margin-top: 4px; padding: 4px 0 4px 8px;
            border-left: 2px solid #ffe0c2;
          }
          .pdf-note-tag {
            display: inline-block; font-size: 10px;
            color: #ff8a3d; background: #fff6e5;
            padding: 0 4px; border-radius: 3px; margin-right: 4px;
          }
          .pdf-empty-day {
            padding: 16px 0; text-align: center;
            color: #bbb; font-size: 13px;
          }

          .pdf-section { margin-top: 24px; page-break-inside: avoid; }
          .pdf-section-title {
            font-size: 14px; font-weight: 600; color: #333;
            padding-bottom: 6px; border-bottom: 1px solid #eee;
            margin-bottom: 8px;
          }
          .pdf-expenses { font-size: 12px; }
          .pdf-exp-item {
            display: flex; justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #eee;
          }

          .pdf-footer {
            margin-top: 30px; padding-top: 12px;
            border-top: 1px solid #eee;
            text-align: center; font-size: 10px; color: #bbb;
          }
        }
      `;
    },
  };

  global.PdfExport = PdfExport;
})(window);
