/**
 * ShortVideoModule 扩展增强
 * 核心逻辑已在 pages.js 中重写，此文件提供额外增强功能
 */
(function(global) {
  'use strict';

  if (typeof global.ShortVideoModule === 'undefined') return;

  // 加载本地存储的关注列表
  try {
    const saved = localStorage.getItem('sv_followed');
    if (saved) {
      const followed = JSON.parse(saved);
      if (Array.isArray(followed)) {
        followed.forEach(id => global.ShortVideoModule._followedUsers.add(id));
      }
    }
  } catch(e) {}

  // 增强：加载更多内容的预加载逻辑
  const origUpdateProgress = global.ShortVideoModule._updateProgress;
  global.ShortVideoModule._updateProgress = function() {
    origUpdateProgress.call(this);

    // 滑到倒数第3条时，预加载下一页（预留接口）
    const feed = document.getElementById('svFeed');
    if (!feed || !this._templates.length) return;
    const idx = Math.round(feed.scrollTop / feed.clientHeight);
    if (idx >= this._templates.length - 3 && !this._preloadTriggered) {
      this._preloadTriggered = true;
    }
  };

  // 增强：关闭时重置到底部提示标志
  const origClose = global.ShortVideoModule.close;
  global.ShortVideoModule.close = function() {
    this._endTipShown = false;
    this._preloadTriggered = false;
    origClose.call(this);
  };

  // 添加扩展样式
  const style = document.createElement('style');
  style.textContent = `
    .sv-note-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 138, 61, 0.9);
      color: #fff;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      backdrop-filter: blur(10px);
    }
    .sv-avatar-img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }
  `;
  document.head.appendChild(style);

})(window);
