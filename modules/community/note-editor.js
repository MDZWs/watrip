/**
 * NoteEditor - 图文游记编辑器（Quill 封装 + 自定义 blot）
 *
 * 功能：
 *  - 富文本编辑（粗体/斜体/标题/列表/引用）
 *  - 图片插入（第一阶段：高德 POI 图片 URL）
 *  - 地点标注 blot（带坐标，点击跳地图）
 *  - 行程模板挂载 blot（卡片形式）
 *
 * 依赖：Quill CDN（window.Quill）
 */
(function () {
  'use strict';

  if (!window.Quill) {
    console.warn('[NoteEditor] Quill 未加载，编辑器不可用');
    return;
  }

  const Quill = window.Quill;
  const BlockEmbed = Quill.import('blots/block/embed');
  const Inline = Quill.import('blots/inline');

  // ==================== 自定义 Blot：地点标注 ====================
  class LocationBlot extends Inline {
    static create(data) {
      const node = super.create();
      node.contentEditable = 'false';
      node.dataset.lng = data.lng;
      node.dataset.lat = data.lat;
      node.dataset.name = data.name;
      node.dataset.address = data.address || '';
      node.classList.add('note-location-mark');
      node.innerHTML = `📍 ${data.name}`;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof App !== 'undefined' && App.openLocationOnMap) {
          App.openLocationOnMap(data);
        }
      });
      return node;
    }
    static formats(node) {
      return {
        lng: node.dataset.lng,
        lat: node.dataset.lat,
        name: node.dataset.name,
        address: node.dataset.address
      };
    }
  }
  LocationBlot.blotName = 'location';
  LocationBlot.tagName = 'span';
  Quill.register(LocationBlot, true);

  // ==================== 自定义 Blot：行程模板挂载卡 ====================
  class TemplateMountBlot extends BlockEmbed {
    static create(data) {
      const node = super.create();
      node.contentEditable = 'false';
      node.dataset.templateId = data.templateId;
      node.classList.add('note-template-mount');
      const cover = data.cover || '🗺️';
      const title = data.title || '未命名行程';
      const dest = data.destination || data.city || '';
      const days = data.days ? `${data.days}天` : '';
      node.innerHTML = `
        <div class="ntm-inner">
          <div class="ntm-cover">${cover}</div>
          <div class="ntm-info">
            <div class="ntm-title">${title}</div>
            <div class="ntm-meta">${dest} ${days} · 点击查看行程详情</div>
          </div>
          <div class="ntm-arrow">›</div>
        </div>
      `;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        if (data.templateId && typeof App !== 'undefined') {
          if (data.isCloud) {
            App.openCloudTrip(data.templateId);
          } else {
            App.useTemplate(data.templateId);
          }
        }
      });
      return node;
    }
    static formats(node) {
      return { templateId: node.dataset.templateId };
    }
  }
  TemplateMountBlot.blotName = 'template-mount';
  TemplateMountBlot.tagName = 'div';
  Quill.register(TemplateMountBlot, true);

  // ==================== 编辑器模块 ====================
  const NoteEditor = {
    state: {
      quill: null,
      container: null,
      overlay: null,
      onSave: null,
      onCancel: null,
      selectedTags: [], // Phase 5.5：选中的专属标签
    },

    /**
     * 打开编辑器
     * @param {Object} opts { title, content, template, onSave }
     */
    open(opts = {}) {
      opts = opts || {};
      this._buildOverlay();
      this._buildContainer(opts);
      this.state.overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
      // 初始化 Quill
      setTimeout(() => this._initQuill(opts.content), 50);
    },

    close() {
      if (this.state.quill) {
        this.state.quill = null;
      }
      if (this.state.container) {
        this.state.container.remove();
        this.state.container = null;
      }
      if (this.state.overlay) {
        this.state.overlay.classList.remove('show');
      }
      document.body.style.overflow = '';
    },

    getContentHTML() {
      return this.state.quill ? this.state.quill.root.innerHTML : '';
    },

    getTitle() {
      const input = document.getElementById('noteTitleInput');
      return input ? input.value.trim() : '';
    },

    // ============ 内部方法 ============
    _buildOverlay() {
      if (!this.state.overlay) {
        const overlay = document.createElement('div');
        overlay.className = 'note-editor-overlay';
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) this.close();
        });
        document.body.appendChild(overlay);
        this.state.overlay = overlay;
      }
    },

    _buildContainer(opts) {
      const old = document.getElementById('noteEditorWrap');
      if (old) old.remove();

      const wrap = document.createElement('div');
      wrap.id = 'noteEditorWrap';
      wrap.className = 'note-editor-wrap';
      wrap.innerHTML = `
        <div class="note-editor-header">
          <button class="ne-back" id="neBack">‹</button>
          <div class="ne-title">写游记</div>
          <button class="ne-publish" id="nePublish">发布</button>
        </div>
        <div class="note-editor-body">
          <input class="ne-title-input" id="noteTitleInput" type="text" placeholder="给游记起个标题..." maxlength="50" value="${this._escape(opts.title || '')}">
          <div class="ne-meta-row">
            <input class="ne-dest-input" id="noteDestInput" type="text" placeholder="目的地（选填）" maxlength="20" value="${this._escape(opts.destination || '')}">
          </div>
          <div class="ne-tag-row" id="neTagRow">
            ${this._renderTagPicker()}
          </div>
          <div class="ne-toolbar">
            <button class="ne-tb-btn" data-cmd="bold" title="加粗"><b>B</b></button>
            <button class="ne-tb-btn" data-cmd="italic" title="斜体"><i>I</i></button>
            <button class="ne-tb-btn" data-cmd="header" data-value="2" title="标题">H2</button>
            <button class="ne-tb-btn" data-cmd="blockquote" title="引用">❝</button>
            <button class="ne-tb-btn" data-cmd="list" data-value="bullet" title="无序列表">•</button>
            <button class="ne-tb-btn" id="neInsertImage" title="插入图片">🖼️</button>
            <button class="ne-tb-btn" id="neInsertLocation" title="标注地点">📍</button>
            <button class="ne-tb-btn" id="neMountTemplate" title="挂载行程">📎</button>
          </div>
          <div id="quillEditor" class="ne-quill"></div>
        </div>
      `;
      this.state.overlay.appendChild(wrap);
      this.state.container = wrap;

      // 绑定按钮
      document.getElementById('neBack').addEventListener('click', () => this.close());
      document.getElementById('nePublish').addEventListener('click', () => {
        if (typeof this.state.onSave === 'function') {
          this.state.onSave({
            title: this.getTitle(),
            destination: document.getElementById('noteDestInput').value.trim(),
            content: this.getContentHTML(),
            customTags: this.state.selectedTags || [],
          });
        }
      });

      // 工具栏
      wrap.querySelectorAll('.ne-tb-btn[data-cmd]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cmd = btn.dataset.cmd;
          const val = btn.dataset.value || null;
          this._format(cmd, val);
        });
      });

      document.getElementById('neInsertImage').addEventListener('click', () => this._insertImage());
      document.getElementById('neInsertLocation').addEventListener('click', () => this._insertLocation());
      document.getElementById('neMountTemplate').addEventListener('click', () => this._mountTemplate(opts.template));

      // Phase 5.5：专属标签选择交互
      this.state.selectedTags = [];
      const tagChips = wrap.querySelectorAll('.pub-tag-chip');
      const tagCountEl = wrap.querySelector('#neTagCount');
      tagChips.forEach((chip) => {
        chip.addEventListener('click', () => {
          const tag = chip.dataset.tag;
          if (this.state.selectedTags.includes(tag)) {
            this.state.selectedTags = this.state.selectedTags.filter((t) => t !== tag);
            chip.classList.remove('pub-tag-chip-selected');
          } else {
            if (this.state.selectedTags.length >= 3) {
              if (typeof UiKit !== 'undefined') UiKit.toast('最多选 3 个标签', 'info');
              return;
            }
            this.state.selectedTags.push(tag);
            chip.classList.add('pub-tag-chip-selected');
          }
          if (tagCountEl) tagCountEl.textContent = `已选 ${this.state.selectedTags.length}/3`;
        });
      });
      // "去设置专属标签"快捷入口
      const goSetBtn = wrap.querySelector('#neGoSetTags');
      if (goSetBtn) {
        goSetBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof AdvancedPrivileges !== 'undefined') AdvancedPrivileges.openTagEditor();
        });
      }

      this.state.onSave = opts.onSave;
    },

    /**
     * Phase 5.5：渲染专属标签选择器
     */
    _renderTagPicker() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return '';
      const user = Auth.getCurrentUser();
      const userTags = user?.custom_tags || [];
      const hasLv6 = typeof LevelSystem !== 'undefined' && LevelSystem.hasPrivilege('custom_tags', user?.level || 1);
      if (!hasLv6) {
        return `
          <div class="ne-tag-info">
            <span style="color:#666;">🏷️ 专属标签</span>
            <span style="font-size:11px;color:#999;">需 Lv6 解锁 · 发布时可添加自定义标签</span>
          </div>
        `;
      }
      if (userTags.length === 0) {
        return `
          <div class="ne-tag-info">
            <span style="color:#666;">🏷️ 专属标签</span>
            <a href="#" id="neGoSetTags" style="color:#ff8a3d;font-size:12px;font-weight:600;">去设置 ›</a>
          </div>
        `;
      }
      return `
        <div class="ne-tag-info">
          <span style="color:#666;">🏷️ 专属标签 <span style="font-size:11px;color:#999;">选填，最多 3 个</span></span>
          <span id="neTagCount" style="font-size:11px;color:#999;">已选 0/3</span>
        </div>
        <div class="ne-tag-list" id="neTagList">
          ${userTags.map((t) => `<div class="pub-tag-chip" data-tag="${this._escape(t)}">#${this._escape(t)}</div>`).join('')}
        </div>
      `;
    },

    _initQuill(content) {
      const quill = new Quill('#quillEditor', {
        theme: 'snow',
        placeholder: '分享你的旅行故事...',
        modules: {
          toolbar: false, // 用自定义工具栏
        },
      });
      this.state.quill = quill;
      if (content) {
      const delta = quill.clipboard.convert(content);
      quill.setContents(delta, 'silent');
      }
    },

    _format(cmd, val) {
      const quill = this.state.quill;
      if (!quill) return;
      quill.format(cmd, val || true);
    },

    _insertImage() {
      const url = window.prompt('请输入图片 URL（第一阶段支持高德 POI 图片）');
      if (!url) return;
      const quill = this.state.quill;
      const range = quill.getSelection();
      quill.insertEmbed(range.index, 'image', url, 'user');
      quill.setSelection(range.index + 1, 0);
    },

    _insertLocation() {
      const name = window.prompt('请输入地点名称（如：西湖）');
      if (!name) return;
      const address = window.prompt('请输入地址（选填）') || '';
      const lngStr = window.prompt('请输入经度（如：120.15）');
      const latStr = window.prompt('请输入纬度（如：30.25）');
      const lng = parseFloat(lngStr);
      const lat = parseFloat(latStr);
      if (isNaN(lng) || isNaN(lat)) {
        if (typeof UiKit !== 'undefined') UiKit.toast('经纬度格式错误', 'error');
        return;
      }
      const quill = this.state.quill;
      const range = quill.getSelection();
      quill.insertEmbed(range.index, 'location', { name, address, lng, lat }, 'user');
      quill.setSelection(range.index + 1, 0);
    },

    _mountTemplate(template) {
      if (!template) {
        if (typeof UiKit !== 'undefined') UiKit.toast('请先在行程详情页挂载行程', 'info');
        return;
      }
      const quill = this.state.quill;
      const range = quill.getSelection();
      quill.insertEmbed(range.index, 'template-mount', {
        templateId: template.cloudId || template.id,
        title: template.title,
        destination: template.destination || template.city,
        days: template.days,
        cover: template.cover,
        isCloud: !!template.cloudId,
      }, 'user');
      quill.setSelection(range.index + 1, 0);
    },

    _escape(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
  };

  window.NoteEditor = NoteEditor;
})();
