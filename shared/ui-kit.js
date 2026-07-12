/**
 * 公共 UI 工具包 + 事件总线
 * 职责：toast/确认弹窗/加载态/空状态 + 模块间通信 EventBus
 * 依赖：无（最底层公共组件）
 * 文档：specs/community-platform-upgrade/项目结构.md、开发规范.md
 */
(function (global) {
  // ========== EventBus：模块间通信 ==========
  const listeners = {}

  const EventBus = {
    on(event, cb) {
      (listeners[event] = listeners[event] || []).push(cb)
      return () => EventBus.off(event, cb)
    },
    off(event, cb) {
      if (!listeners[event]) return
      listeners[event] = listeners[event].filter(fn => fn !== cb)
    },
    emit(event, data) {
      (listeners[event] || []).forEach(cb => {
        try { cb(data) } catch (e) { console.error(`[EventBus] ${event} 处理出错:`, e) }
      })
    },
    clear(event) {
      if (event) delete listeners[event]
      else Object.keys(listeners).forEach(k => delete listeners[k])
    }
  }

  // ========== Toast 提示 ==========
  function toast(msg, type = 'info', duration = 2500) {
    let container = document.querySelector('.ui-toast-container')
    if (!container) {
      container = document.createElement('div')
      container.className = 'ui-toast-container'
      document.body.appendChild(container)
    }
    const el = document.createElement('div')
    el.className = `ui-toast ui-toast-${type}`
    el.textContent = msg
    container.appendChild(el)
    // 触发动画
    requestAnimationFrame(() => el.classList.add('ui-toast-show'))
    setTimeout(() => {
      el.classList.remove('ui-toast-show')
      setTimeout(() => el.remove(), 300)
    }, duration)
  }

  // ========== 确认弹窗 ==========
  function confirm(message, { title = '提示', confirmText = '确定', cancelText = '取消' } = {}) {
    return new Promise(resolve => {
      const mask = document.createElement('div')
      mask.className = 'ui-modal-mask'
      mask.innerHTML = `
        <div class="ui-modal">
          <div class="ui-modal-title">${title}</div>
          <div class="ui-modal-body">${message}</div>
          <div class="ui-modal-actions">
            <button class="ui-modal-btn ui-modal-cancel">${cancelText}</button>
            <button class="ui-modal-btn ui-modal-confirm">${confirmText}</button>
          </div>
        </div>`
      document.body.appendChild(mask)
      requestAnimationFrame(() => mask.classList.add('ui-modal-show'))
      const close = (result) => {
        mask.classList.remove('ui-modal-show')
        setTimeout(() => mask.remove(), 200)
        resolve(result)
      }
      mask.querySelector('.ui-modal-cancel').onclick = () => close(false)
      mask.querySelector('.ui-modal-confirm').onclick = () => close(true)
      mask.onclick = (e) => { if (e.target === mask) close(false) }
    })
  }

  // ========== 加载态 ==========
  let loadingCount = 0
  function showLoading(text = '加载中...') {
    loadingCount++
    let el = document.querySelector('.ui-loading')
    if (!el) {
      el = document.createElement('div')
      el.className = 'ui-loading'
      el.innerHTML = `<div class="ui-loading-spinner"></div><div class="ui-loading-text"></div>`
      document.body.appendChild(el)
    }
    el.querySelector('.ui-loading-text').textContent = text
    el.style.display = 'flex'
  }
  function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1)
    if (loadingCount === 0) {
      const el = document.querySelector('.ui-loading')
      if (el) el.style.display = 'none'
    }
  }

  // ========== 空状态 ==========
  function emptyState(text = '暂无内容', scene = 'default') {
    const iconMap = {
      default: 'empty-result',
      trip: 'empty-trip',
      network: 'empty-network',
      result: 'empty-result',
      checkin: 'empty-checkin'
    }
    const iconName = iconMap[scene] || 'empty-result'
    return `<div class="ui-empty"><div class="ui-empty__icon">${icon(iconName)}</div><div class="ui-empty__title">${text}</div></div>`
  }

  // ========== SVG Icon 库（Design System）==========
  const ICONS = {
    // 功能 icon（小尺寸，stroke=currentColor）
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    // 空状态插画（80x80，几何线条，brand 色点缀）
    'empty-trip': `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="22" width="52" height="40" rx="4"/><path d="M28 22v-6a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v6"/><line x1="14" y1="38" x2="66" y2="38"/><circle cx="26" cy="50" r="3" fill="#FF8A3D" stroke="none"/><circle cx="54" cy="50" r="3" fill="#FF8A3D" stroke="none"/></svg>`,
    'empty-network': `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 30a48 48 0 0 1 56 0"/><path d="M20 40a36 36 0 0 1 40 0"/><path d="M28 50a24 24 0 0 1 24 0"/><path d="M36 60a12 12 0 0 1 8 0"/><line x1="16" y1="16" x2="64" y2="64" stroke="#FF8A3D"/></svg>`,
    'empty-result': `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="34" cy="34" r="18"/><path d="m48 48 16 16"/><path d="M28 34h12" stroke="#FF8A3D"/><path d="M34 28v12" stroke="#FF8A3D"/></svg>`,
    'empty-checkin': `<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M40 68s20-18 20-34a20 20 0 0 0-40 0c0 16 20 34 20 34Z"/><circle cx="40" cy="34" r="7" fill="#FF8A3D" stroke="none"/></svg>`,
    'image-broken': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`,
    // 通用 icon
    'plus': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    'arrow-right': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    'map': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
    'users': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'sparkles': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`
  }

  function icon(name) {
    return ICONS[name] || ''
  }

  // ========== 图片加载态（Design System）==========
  function img(imgEl) {
    if (!imgEl || !imgEl.parentElement) return
    const wrap = imgEl.parentElement
    if (!wrap.classList.contains('ui-img-wrap')) return
    const onLoad = () => {
      wrap.classList.add('ui-img-loaded')
      imgEl.removeEventListener('load', onLoad)
    }
    const onError = () => {
      wrap.classList.add('ui-img-error')
      imgEl.style.display = 'none'
      imgEl.removeEventListener('error', onError)
    }
    if (imgEl.complete && imgEl.naturalWidth > 0) {
      wrap.classList.add('ui-img-loaded')
    } else if (imgEl.complete) {
      onError()
    } else {
      imgEl.addEventListener('load', onLoad)
      imgEl.addEventListener('error', onError)
    }
  }

  // ========== 输入弹窗（替代原生prompt） ==========
  function prompt(message, { title = '输入', defaultValue = '', placeholder = '', confirmText = '确定', cancelText = '取消', inputType = 'text' } = {}) {
    return new Promise(resolve => {
      const mask = document.createElement('div')
      mask.className = 'ui-modal-mask'
      mask.innerHTML = `
        <div class="ui-modal ui-modal--prompt">
          <div class="ui-modal-title">${title}</div>
          <div class="ui-modal-body">
            <div style="margin-bottom:12px;color:#555;font-size:14px;line-height:1.5;">${message}</div>
            <input type="${inputType}" class="ui-prompt-input" value="${String(defaultValue).replace(/"/g,'&quot;')}" placeholder="${placeholder}" />
          </div>
          <div class="ui-modal-actions">
            <button class="ui-modal-btn ui-modal-cancel">${cancelText}</button>
            <button class="ui-modal-btn ui-modal-confirm">${confirmText}</button>
          </div>
        </div>`
      document.body.appendChild(mask)
      requestAnimationFrame(() => {
        mask.classList.add('ui-modal-show')
        const input = mask.querySelector('.ui-prompt-input')
        input.focus()
        input.select()
        const submit = () => {
          const val = input.value
          close(val)
        }
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          if (e.key === 'Escape') { e.preventDefault(); close(null) }
        })
        mask.querySelector('.ui-modal-cancel').onclick = () => close(null)
        mask.querySelector('.ui-modal-confirm').onclick = submit
        mask.onclick = (e) => { if (e.target === mask) close(null) }
      })
      const close = (result) => {
        mask.classList.remove('ui-modal-show')
        setTimeout(() => mask.remove(), 200)
        resolve(result)
      }
    })
  }

  // ========== 操作菜单 ==========
  function showActionSheet(items, title = '') {
    return new Promise(resolve => {
      const mask = document.createElement('div')
      mask.className = 'ui-action-sheet-mask'
      const itemsHtml = items.map(item => {
        if (!item) return ''
        const dangerClass = item.danger ? 'ui-as-item--danger' : ''
        return `<div class="ui-as-item ${dangerClass}" data-value="${item.value}">${item.text}</div>`
      }).join('')
      mask.innerHTML = `
        <div class="ui-action-sheet">
          ${title ? `<div class="ui-as-title">${title}</div>` : ''}
          ${itemsHtml}
          <div class="ui-as-cancel" data-action="cancel">取消</div>
        </div>`
      document.body.appendChild(mask)
      requestAnimationFrame(() => mask.classList.add('ui-as-show'))
      const close = (val) => {
        mask.classList.remove('ui-as-show')
        setTimeout(() => mask.remove(), 250)
        resolve(val)
      }
      mask.querySelectorAll('.ui-as-item').forEach(el => {
        el.onclick = () => close(el.dataset.value)
      })
      mask.querySelector('.ui-as-cancel').onclick = () => close(null)
      mask.onclick = (e) => { if (e.target === mask) close(null) }
    })
  }

  // 导出
  global.EventBus = EventBus
  global.UiKit = { toast, confirm, prompt, showLoading, hideLoading, emptyState, icon, img, showActionSheet }
})(window)
