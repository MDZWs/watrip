/**
 * 进阶特权（Phase 5.3）
 * 职责：Lv6 专属标签 + Lv8 主页装扮 + Lv9 专题合集
 * 依赖：Auth、LevelSystem、UiKit、UIRender、EventBus
 */
(function (global) {
  // 主页主题预设
  const PROFILE_THEMES = [
    { id: 'default', name: '默认', gradient: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', headerColor: '#333' },
    { id: 'sunset', name: '日落橙', gradient: 'linear-gradient(135deg, #FFB983, #FF8A3D)', headerColor: '#fff' },
    { id: 'ocean', name: '海洋蓝', gradient: 'linear-gradient(135deg, #A8E0FF, #5CC6FF)', headerColor: '#fff' },
    { id: 'forest', name: '森林绿', gradient: 'linear-gradient(135deg, #7DD892, #34C759)', headerColor: '#fff' },
    { id: 'lavender', name: '薰衣草', gradient: 'linear-gradient(135deg, #B8ADFF, #8B7CF5)', headerColor: '#fff' },
    { id: 'rose', name: '玫瑰粉', gradient: 'linear-gradient(135deg, #FFA3B5, #FF6B8A)', headerColor: '#fff' },
    { id: 'gold', name: '璀璨金', gradient: 'linear-gradient(135deg, #FFE86B, #FFD60A)', headerColor: '#333' },
    { id: 'midnight', name: '午夜黑', gradient: 'linear-gradient(135deg, #2C3E50, #1a1a2e)', headerColor: '#fff' },
  ];

  const AdvancedPrivileges = {
    state: {
      myCollections: [],
    },

    // ========== Lv6 专属标签 ==========

    /**
     * 打开专属标签编辑器
     */
    async openTagEditor() {
      if (!LevelSystem.requirePrivilege('custom_tags')) return;
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;

      const user = Auth.getCurrentUser();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('custom_tags')
        .eq('id', user.id)
        .single();

      const currentTags = profile?.custom_tags || [];

      const html = `
        <div class="ap-tag-wrap">
          <div class="ap-tag-intro">
            为你的作品添加专属标签，让社区更容易识别你的风格。最多 5 个标签，每个不超过 8 字。
          </div>
          <div class="ap-tag-input-row">
            <input type="text" id="apTagInput" class="ap-tag-input" placeholder="输入标签（如：深度游、小众秘境）" maxlength="8">
            <button class="ap-tag-add-btn" id="apTagAdd">添加</button>
          </div>
          <div class="ap-tag-list" id="apTagList">
            ${currentTags.map((t, i) => `
              <div class="ap-tag-chip" data-idx="${i}">
                <span>${this._escapeHtml(t)}</span>
                <button class="ap-tag-remove" data-tag="${this._escapeHtml(t)}">×</button>
              </div>
            `).join('')}
          </div>
          <div class="ap-tag-count">已用 <span id="apTagCount">${currentTags.length}</span>/5</div>
          <button class="ap-tag-save" id="apTagSave">保存</button>
        </div>
      `;
      UIRender.showAlertModal('专属标签（Lv6 特权）', html);

      let tags = [...currentTags];
      setTimeout(() => {
        const input = document.getElementById('apTagInput');
        const addBtn = document.getElementById('apTagAdd');
        const listEl = document.getElementById('apTagList');
        const countEl = document.getElementById('apTagCount');
        const saveBtn = document.getElementById('apTagSave');

        const renderTags = () => {
          listEl.innerHTML = tags.map((t, i) => `
            <div class="ap-tag-chip">
              <span>${this._escapeHtml(t)}</span>
              <button class="ap-tag-remove" data-idx="${i}">×</button>
            </div>
          `).join('') || '<div style="color:#ccc;font-size:12px;">暂无标签</div>';
          countEl.textContent = tags.length;
          listEl.querySelectorAll('.ap-tag-remove').forEach(btn => {
            btn.onclick = () => {
              tags.splice(parseInt(btn.dataset.idx), 1);
              renderTags();
            };
          });
        };

        const addTag = () => {
          const val = input.value.trim();
          if (!val) return;
          if (tags.length >= 5) { UiKit.toast('最多 5 个标签', 'info'); return; }
          if (tags.includes(val)) { UiKit.toast('标签已存在', 'info'); return; }
          tags.push(val);
          input.value = '';
          renderTags();
        };
        addBtn.onclick = addTag;
        input.onkeydown = (e) => { if (e.key === 'Enter') addTag(); };

        saveBtn.onclick = async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = '保存中...';
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ custom_tags: tags })
              .eq('id', user.id);
            if (error) throw error;
            if (Auth.state.user) Auth.state.user.custom_tags = tags;
            UiKit.toast('标签已保存', 'success');
            const modal = document.getElementById('alertModal');
            if (modal) modal.classList.remove('show');
          } catch (e) {
            UiKit.toast('保存失败', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = '保存';
          }
        };
      }, 50);
    },

    /**
     * 获取当前用户专属标签
     */
    getMyTags() {
      const user = Auth.getCurrentUser();
      return user?.custom_tags || [];
    },

    // ========== Lv8 主页装扮 ==========

    /**
     * 打开主题选择器
     */
    async openThemePicker() {
      if (!LevelSystem.requirePrivilege('profile_theme')) return;
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;

      const user = Auth.getCurrentUser();
      const currentTheme = user.theme || 'default';

      const html = `
        <div class="ap-theme-wrap">
          <div class="ap-theme-intro">选择一个主题装扮你的个人主页，让主页更有个性。</div>
          <div class="ap-theme-grid">
            ${PROFILE_THEMES.map(t => `
              <div class="ap-theme-card ${currentTheme === t.id ? 'ap-theme-active' : ''}" data-theme="${t.id}" style="background:${t.gradient};">
                <div class="ap-theme-name" style="color:${t.headerColor};">${t.name}</div>
                ${currentTheme === t.id ? '<div class="ap-theme-check">✓</div>' : ''}
              </div>
            `).join('')}
          </div>
          <button class="ap-theme-save" id="apThemeSave">应用主题</button>
        </div>
      `;
      UIRender.showAlertModal('主页装扮（Lv8 特权）', html);

      let selectedTheme = currentTheme;
      setTimeout(() => {
        document.querySelectorAll('.ap-theme-card').forEach(card => {
          card.onclick = () => {
            document.querySelectorAll('.ap-theme-card').forEach(c => c.classList.remove('ap-theme-active'));
            card.classList.add('ap-theme-active');
            selectedTheme = card.dataset.theme;
            // 更新勾选标记
            document.querySelectorAll('.ap-theme-check').forEach(c => c.remove());
            const check = document.createElement('div');
            check.className = 'ap-theme-check';
            check.textContent = '✓';
            card.appendChild(check);
          };
        });
        document.getElementById('apThemeSave').onclick = async () => {
          const btn = document.getElementById('apThemeSave');
          btn.disabled = true;
          btn.textContent = '应用中...';
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ theme: selectedTheme })
              .eq('id', user.id);
            if (error) throw error;
            if (Auth.state.user) Auth.state.user.theme = selectedTheme;
            // 立即应用主题
            this.applyTheme(selectedTheme);
            UiKit.toast('主题已应用', 'success');
            const modal = document.getElementById('alertModal');
            if (modal) modal.classList.remove('show');
          } catch (e) {
            UiKit.toast('应用失败', 'error');
            btn.disabled = false;
            btn.textContent = '应用主题';
          }
        };
      }, 50);
    },

    /**
     * 应用主题到当前页面
     */
    applyTheme(themeId) {
      const theme = PROFILE_THEMES.find(t => t.id === themeId) || PROFILE_THEMES[0];
      const header = document.querySelector('.profile-header, .profile-info-section');
      if (header) {
        header.style.background = theme.gradient;
        header.style.color = theme.headerColor;
      }
    },

    /**
     * 获取主题配置
     */
    getTheme(themeId) {
      return PROFILE_THEMES.find(t => t.id === themeId) || PROFILE_THEMES[0];
    },

    // ========== Lv9 专题合集 ==========

    /**
     * 打开合集管理面板
     */
    async openCollections() {
      if (!LevelSystem.requirePrivilege('collection_set')) return;
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;

      UiKit.showLoading('加载合集...');
      try {
        const user = Auth.getCurrentUser();
        const { data, error } = await supabase
          .from('collections')
          .select('id, name, description, cover_emoji, is_public, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        UiKit.hideLoading();
        if (error) throw error;
        this.state.myCollections = data || [];
        this._renderCollections(data || []);
      } catch (e) {
        UiKit.hideLoading();
        UiKit.toast('加载失败', 'error');
      }
    },

    _renderCollections(collections) {
      const listHtml = collections.length === 0
        ? `<div class="ap-col-empty">
             <div style="font-size:32px;margin-bottom:6px;">📚</div>
             <div>还没有合集</div>
             <div style="font-size:11px;margin-top:4px;">创建合集整理你喜欢的行程和游记</div>
           </div>`
        : collections.map(c => `
            <div class="ap-col-card" data-id="${c.id}">
              <div class="ap-col-emoji">${c.cover_emoji || '📚'}</div>
              <div class="ap-col-info">
                <div class="ap-col-name">${this._escapeHtml(c.name)}</div>
                <div class="ap-col-desc">${this._escapeHtml(c.description || '暂无描述')}</div>
                <div class="ap-col-meta">${c.is_public ? '🌐 公开' : '🔒 私有'}</div>
              </div>
            </div>
          `).join('');

      const html = `
        <div class="ap-col-wrap">
          <button class="ap-col-create-btn" id="apColCreate">+ 创建新合集</button>
          <div class="ap-col-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('专题合集（Lv9 特权）', html);

      setTimeout(() => {
        document.getElementById('apColCreate')?.addEventListener('click', () => this._createCollection());
        document.querySelectorAll('.ap-col-card').forEach(card => {
          card.onclick = () => this._viewCollection(card.dataset.id);
        });
      }, 50);
    },

    async _createCollection() {
      const name = await this._prompt('合集名称', '如：江浙沪周末游');
      if (!name) return;
      const desc = await this._prompt('合集描述（选填）', '简单描述这个合集');
      try {
        const user = Auth.getCurrentUser();
        const { error } = await supabase.from('collections').insert({
          user_id: user.id,
          name,
          description: desc || null,
          cover_emoji: '📚',
        });
        if (error) throw error;
        UiKit.toast('合集已创建', 'success');
        this.openCollections();
      } catch (e) {
        UiKit.toast('创建失败', 'error');
      }
    },

    async _viewCollection(colId) {
      UiKit.showLoading('加载合集内容...');
      try {
        const { data: items } = await supabase
          .from('collection_items')
          .select('id, target_id, target_type, added_at')
          .eq('collection_id', colId)
          .order('added_at', { ascending: false });

        // 批量获取内容
        const templateIds = (items || []).filter(i => i.target_type === 'template').map(i => i.target_id);
        const noteIds = (items || []).filter(i => i.target_type === 'note').map(i => i.target_id);
        let contentMap = {};
        if (templateIds.length > 0) {
          const { data } = await supabase.from('trip_templates').select('id, title, destination').in('id', templateIds);
          (data || []).forEach(t => contentMap['template_' + t.id] = t);
        }
        if (noteIds.length > 0) {
          const { data } = await supabase.from('travel_notes').select('id, title, destination').in('id', noteIds);
          (data || []).forEach(n => contentMap['note_' + n.id] = n);
        }

        UiKit.hideLoading();
        const listHtml = (items || []).length === 0
          ? '<div class="ap-col-empty"><div style="font-size:28px;">📭</div><div>合集暂无内容</div></div>'
          : items.map(i => {
              const c = contentMap[i.target_type + '_' + i.target_id];
              if (!c) return '';
              const icon = i.target_type === 'template' ? '🗺️' : '✍️';
              return `
                <div class="ap-col-item" data-type="${i.target_type}" data-id="${i.target_id}">
                  <div class="ap-col-item-icon">${icon}</div>
                  <div class="ap-col-item-name">${this._escapeHtml(c.title)}</div>
                  <div class="ap-col-item-meta">${c.destination || ''}</div>
                </div>
              `;
            }).join('');

        const html = `<div class="ap-col-detail">${listHtml}</div>`;
        UIRender.showAlertModal('合集内容', html);

        setTimeout(() => {
          document.querySelectorAll('.ap-col-item').forEach(el => {
            el.onclick = () => {
              const modal = document.getElementById('alertModal');
              if (modal) modal.classList.remove('show');
              if (el.dataset.type === 'template' && typeof App !== 'undefined') {
                App.openCloudTrip(el.dataset.id);
              } else if (el.dataset.type === 'note' && typeof TravelNote !== 'undefined') {
                TravelNote.view(el.dataset.id);
              }
            };
          });
        }, 50);
      } catch (e) {
        UiKit.hideLoading();
        UiKit.toast('加载失败', 'error');
      }
    },

    /**
     * 加入合集（公开 API，供社区卡片调用）
     * Phase 5.5：让"加入合集"按钮真正可用
     * @param {string} targetId - 内容 ID（trip_template.id 或 travel_note.id）
     * @param {string} targetType - 内容类型：'template' | 'note'
     */
    async addToCollection(targetId, targetType) {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        UiKit.toast('请先登录后操作', 'info');
        Auth.requireAuth();
        return;
      }
      if (!targetId || !['template', 'note'].includes(targetType)) {
        UiKit.toast('参数错误', 'error');
        return;
      }
      // Lv9 特权校验（未解锁会自动弹提示，体验模式下放行）
      if (!LevelSystem.requirePrivilege('collection_set')) return;

      UiKit.showLoading('加载我的合集...');
      try {
        const user = Auth.getCurrentUser();
        const { data: collections, error } = await supabase
          .from('collections')
          .select('id, name, description, cover_emoji, is_public, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        UiKit.hideLoading();
        if (error) throw error;

        if (!collections || collections.length === 0) {
          // 没有合集，直接引导创建（创建后自动加入目标内容）
          UiKit.toast('请先创建一个合集', 'info');
          this._createCollectionWithTarget(targetId, targetType);
          return;
        }

        // 查询已加入该内容的合集 ID 集合（用于标记"已加入"，避免重复）
        const { data: existing } = await supabase
          .from('collection_items')
          .select('collection_id')
          .eq('target_id', targetId)
          .eq('target_type', targetType);
        const existingSet = new Set((existing || []).map(i => i.collection_id));

        this._renderAddToCollection(collections, existingSet, targetId, targetType);
      } catch (e) {
        UiKit.hideLoading();
        UiKit.toast('加载合集失败', 'error');
      }
    },

    _renderAddToCollection(collections, existingSet, targetId, targetType) {
      const listHtml = collections.map(c => {
        const added = existingSet.has(c.id);
        return `
          <div class="ap-add-item ${added ? 'ap-add-item-added' : ''}" data-id="${c.id}" data-added="${added ? '1' : '0'}">
            <div class="ap-add-emoji">${c.cover_emoji || '📚'}</div>
            <div class="ap-add-info">
              <div class="ap-add-name">${this._escapeHtml(c.name)}</div>
              <div class="ap-add-meta">${c.is_public ? '🌐 公开' : '🔒 私有'}${c.description ? ' · ' + this._escapeHtml(c.description) : ''}</div>
            </div>
            <div class="ap-add-action">${added ? '✓ 已加入' : '+ 加入'}</div>
          </div>
        `;
      }).join('');

      const html = `
        <div class="ap-add-wrap">
          <div class="ap-add-intro">选择一个合集，把内容添加进去；也可以创建新合集。</div>
          <button class="ap-add-create" id="apAddCreate">+ 创建新合集</button>
          <div class="ap-add-list">${listHtml}</div>
        </div>
      `;
      UIRender.showAlertModal('加入合集', html);

      setTimeout(() => {
        document.getElementById('apAddCreate')?.addEventListener('click', () => {
          // 关闭当前弹窗，进入创建合集流程（创建完成后自动加入目标内容）
          const modal = document.getElementById('alertModal');
          if (modal) modal.classList.remove('show');
          this._createCollectionWithTarget(targetId, targetType);
        });
        document.querySelectorAll('.ap-add-item').forEach(item => {
          item.onclick = async () => {
            if (item.dataset.added === '1') {
              UiKit.toast('该内容已在合集中', 'info');
              return;
            }
            const colId = item.dataset.id;
            try {
              const { error } = await supabase.from('collection_items').insert({
                collection_id: colId,
                target_id: targetId,
                target_type: targetType,
              });
              if (error) throw error;
              UiKit.toast('已加入合集', 'success');
              // 更新 UI 标记，避免重复点击
              item.dataset.added = '1';
              item.classList.add('ap-add-item-added');
              item.querySelector('.ap-add-action').textContent = '✓ 已加入';
            } catch (e) {
              UiKit.toast('加入失败', 'error');
            }
          };
        });
      }, 50);
    },

    /**
     * 创建合集并自动把目标内容加入（用于"加入合集"流程中创建新合集）
     */
    async _createCollectionWithTarget(targetId, targetType) {
      const name = await this._prompt('合集名称', '如：江浙沪周末游');
      if (!name) return;
      const desc = await this._prompt('合集描述（选填）', '简单描述这个合集');
      try {
        const user = Auth.getCurrentUser();
        // 1. 创建合集
        const { data: col, error: colErr } = await supabase.from('collections').insert({
          user_id: user.id,
          name,
          description: desc || null,
          cover_emoji: '📚',
        }).select('id').single();
        if (colErr) throw colErr;
        // 2. 把目标内容加入新合集
        const { error: itemErr } = await supabase.from('collection_items').insert({
          collection_id: col.id,
          target_id: targetId,
          target_type: targetType,
        });
        if (itemErr) throw itemErr;
        UiKit.toast('合集已创建并加入', 'success');
        const modal = document.getElementById('alertModal');
        if (modal) modal.classList.remove('show');
      } catch (e) {
        UiKit.toast('创建失败', 'error');
      }
    },

    // ========== 工具 ==========

    _escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    _prompt(label, placeholder) {
      return new Promise(resolve => {
        const html = `
          <div class="ap-prompt-wrap">
            <div class="ap-prompt-label">${label}</div>
            <input type="text" class="ap-prompt-input" id="apPromptInput" placeholder="${placeholder}" maxlength="20">
            <div class="ap-prompt-btns">
              <button class="ap-prompt-cancel" id="apPromptCancel">取消</button>
              <button class="ap-prompt-ok" id="apPromptOk">确定</button>
            </div>
          </div>
        `;
        UIRender.showAlertModal('输入', html);
        setTimeout(() => {
          const input = document.getElementById('apPromptInput');
          const modal = document.getElementById('alertModal');
          const close = (val) => { if (modal) modal.classList.remove('show'); resolve(val); };
          document.getElementById('apPromptOk').onclick = () => close(input.value.trim());
          document.getElementById('apPromptCancel').onclick = () => close(null);
          input.onkeydown = (e) => { if (e.key === 'Enter') close(input.value.trim()); };
          input.focus();
        }, 50);
      });
    },
  };

  // 暴露主题预设供其他模块使用
  AdvancedPrivileges.PROFILE_THEMES = PROFILE_THEMES;

  global.AdvancedPrivileges = AdvancedPrivileges;
})(window);
