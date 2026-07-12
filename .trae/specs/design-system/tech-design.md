# 哇途 · 设计系统 - 技术方案设计

> 文档版本：v1.0
> 生成时间：2026-07-03
> 阶段：技术方案设计完成 / 待任务规划
> 工作流：SpecForge 功能级 - Skill 9

---

## 1. 现状盘点

### 1.1 已有可复用资产

| 文件 | 现状 | 复用方式 |
|------|------|---------|
| `css/variables.css` | 已有 14 个 token（brand/orange/blue/purple/bg/text/shadow/radius 等） | **增量扩展**，不重写已有 token |
| `css/ui-kit.css` | 已有 4 个基础组件：`.ui-toast`、`.ui-modal`、`.ui-loading`、`.ui-empty`；另有大量 feature 专用样式（`.pl-*`、`.ls-*`、`.ck-*`、`.roast-*`、`.vt-*`、`.item-*`、`.ap-*` 等） | **保留 feature 样式不动**；只重构 4 个基础组件引用 token |
| `shared/ui-kit.js` | 已有 `UiKit` 全局对象，含 `toast()` / `confirm()` / `showLoading()` / `hideLoading()` / `EventBus` | **JS API 不动**，本期只改 CSS |
| `css/pages.css` | `.bottom-tab-bar` / `.tab-item` 已实现新拟态效果，但阴影硬编码 | **保留逻辑**，把硬编码阴影值替换为 token 引用 |

### 1.2 现有问题（技术债）

1. **硬编码色值散布**：`#1989fa`（Vant 蓝）、`#ff8a3d`、`#ff6b00`、`#FFB983`、`#999`、`#333` 等散落在 ui-kit.css 和 pages.css
2. **Toast/Modal 配色不一致**：Toast 用 `rgba(220, 53, 69, 0.9)`，Modal 用 `#1989fa`，与品牌色脱节
3. **新拟态阴影未 token 化**：`.tab-item` 的 `inset 4px 4px 8px #c4c4c4, inset -4px -4px 8px #ffffff` 是硬编码
4. **缺少 4 个基础组件类**：`.ui-btn`、`.ui-card`、`.ui-input`、`.ui-tag`、`.ui-avatar`、`.ui-skeleton` 不存在
5. **`#1989fa` Vant 蓝遗留**：在 Modal 确认按钮、Loading spinner、`.pl-load-more` 中使用，与品牌橙脱节

---

## 2. 技术决策

### 2.1 直接定的决策（沿用项目已有做法）

| 决策 | 选择 | 理由 |
|------|------|------|
| Token 落地位置 | 扩展 `css/variables.css` | 现有 token 已在此文件，保持单一来源 |
| 组件样式落地位置 | 扩展 `css/ui-kit.css` | 现有 4 个基础组件已在此文件 |
| 命名规范 | BEM-like：`.ui-btn`、`.ui-btn--primary`、`.ui-card--tool` | 与现有 `.ui-toast-*` 命名风格一致 |
| Token 命名 | `--xxx-yyy` kebab-case | 与现有 `--brand-light` 等一致 |
| JS 层改动 | **不改** `ui-kit.js` 的 API | 现有 `UiKit.toast/confirm/showLoading` 已稳定，只改 CSS |
| 现有 feature 样式 | **不触碰**（`.pl-*`、`.ls-*`、`.ck-*` 等） | 这些是各业务模块专用，超出本期 AC 范围 |
| 编码方式 | 纯 CSS，不用预处理器 | 项目规范要求纯原生 |
| 字体引入 | 系统 fallback 字体栈，不引外部字体 | 性能优先，避免 FOUT |

### 2.2 需要你确认的 3 个决策

#### 决策 A · SVG icon 策略（影响所有组件）

8 个基础组件几乎都涉及 icon（按钮 loading spinner、Toast 类型 icon、空状态插画、头像占位、输入框 search icon）。三种走法：

- **A1 · 内联 SVG**（推荐）：直接在 HTML 里写 `<svg>`。优点：可控制颜色（`currentColor`）、无需额外请求；缺点：HTML 略冗长
- **A2 · CSS background-image SVG**：把 SVG 编码成 data URI 写进 CSS。优点：HTML 干净；缺点：无法用 `currentColor`，颜色固定
- **A3 · Icon 字体**：引入 iconfont 或 FontAwesome。优点：使用方便；缺点：增加依赖、与项目"纯原生"原则冲突

**我的推荐**：A1 内联 SVG。组件级 SVG 由 `ui-kit.js` 在创建 DOM 时注入（如 Toast 的 icon），业务页面自行写 SVG。

#### 决策 B · 现有 4 个基础组件是否重构

`ui-kit.css` 里现有的 Toast/Modal/Loading/Empty 用了硬编码色值（`#1989fa`、`rgba(220,53,69,0.9)` 等）。两种走法：

- **B1 · 重构现有 4 个组件引用 token**（推荐）：把硬编码色值替换为 `var(--brand)`、`var(--error)` 等。优点：视觉立刻统一；风险：极小概率影响现有交互（只改色值不改结构）
- **B2 · 保留现有不动，只新增 4 个组件**：现有 Toast 等保持原样。优点：零回归风险；缺点：视觉不统一，与设计系统目标相悖

**我的推荐**：B1 重构。风险可控（只改色值不改结构），收益是设计系统立刻生效。

#### 决策 C · `#1989fa` Vant 蓝的处理

这个蓝色散布在 Modal 确认按钮、Loading spinner、`.pl-load-more` 等处。它是 Vant UI 库的默认蓝，但本项目没用 Vant，是早期抄过来的残留。三种走法：

- **C1 · 全部替换为 `--brand`**（推荐）：确认按钮、Loading spinner、load-more 都用品牌橙
- **C2 · 保留 `#1989fa`**：作为"信息蓝"独立存在，定义为 `--info-blue` token
- **C3 · 只重构基础组件，feature 样式保留**：Toast/Modal/Loading 里的 `#1989fa` 换成 `--brand`；`.pl-load-more` 等业务样式不动

**我的推荐**：C3 折中。基础组件必须用品牌色（设计系统核心），feature 样式留待 Phase 2 各页改造时再统一。

---

## 3. 实现方案

### 3.1 Token 层实现（`css/variables.css`）

**策略**：在现有 `:root` 内增量添加新 token，保留已有 token 不动。

#### 3.1.1 需要新增的 token（共 32 个）

```css
:root {
  /* === 已有 token 保留不动 === */
  /* --brand, --orange, --brand-light, --brand-dark, --brand-gradient,
     --blue, --blue-light, --purple, --purple-light,
     --bg, --card-bg, --text-primary, --text-secondary, --text-muted,
     --border, --shadow-sm/md/lg, --radius-xl/lg/md/sm */

  /* === 新增：辅助色 === */
  --accent-blue: #5CC6FF;
  --accent-purple: #8B7CF5;
  --accent-purple-light: #E8E4FF;

  /* === 新增：状态色 === */
  --success: #34C759;
  --warning: #FF9500;
  --error: #FF3B30;
  --info: #5AC8FA;

  /* === 新增：分区底色 === */
  --bg-tool: #E4E4E4;       /* 工具区底色（新拟态） */
  --bg-content: #FAF8F4;    /* 内容区底色（暖白） */

  /* === 新增：新拟态阴影色对 === */
  --neu-shadow-dark: #C4C4C4;
  --neu-shadow-light: #FFFFFF;
  --neu-outset: 6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light);
  --neu-inset: inset 4px 4px 8px var(--neu-shadow-dark), inset -4px -4px 8px var(--neu-shadow-light);
  --neu-pressed: inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light);

  /* === 新增：字体族 === */
  --font-sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif;
  --font-serif: "PingFang SC", "Noto Serif SC", serif;

  /* === 新增：字号阶梯 === */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 32px;

  /* === 新增：行高 === */
  --leading-xs: 16px;
  --leading-sm: 20px;
  --leading-base: 24px;
  --leading-lg: 26px;
  --leading-xl: 28px;
  --leading-2xl: 32px;
  --leading-3xl: 40px;

  /* === 新增：字重 === */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-heavy: 800;

  /* === 新增：间距阶梯（4px 栅格）=== */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 48px;

  /* === 新增：圆角补充 === */
  --radius-pill: 999px;

  /* === 新增：动效 === */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
  --transition-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  /* === 新增：z-index 层级 === */
  --z-toast: 10000;
  --z-modal: 9999;
  --z-loading: 9998;
  --z-dropdown: 1000;
  --z-sticky: 100;
}
```

#### 3.1.2 已有 token 需要调整的（仅 1 处）

```css
/* 原 */
--bg: #F6F7F9;
/* 改为 */
--bg: #ECE9E5;  /* 暖灰全局底色 */
```

**注意**：`body` 的 `background: #E8E8E8` 也要同步改为 `var(--bg)`，让全局底色由 token 控制。

---

### 3.2 组件层实现（`css/ui-kit.css`）

#### 3.2.1 现有 4 个组件的重构（决策 B1）

| 组件 | 重构内容 |
|------|---------|
| `.ui-toast` | `rgba(220, 53, 69, 0.9)` → `var(--error)`；`rgba(40, 167, 69, 0.9)` → `var(--success)`；`rgba(0, 0, 0, 0.8)` → `rgba(0, 0, 0, 0.78)`；border-radius 引用 `var(--radius-md)`；padding 引用 `var(--space-sm) var(--space-lg)` |
| `.ui-modal` | `.ui-modal-confirm` 的 `#1989fa` → `var(--brand)`；`.ui-modal-cancel` 的 `#999` → `var(--text-secondary)`；`#333` → `var(--text-primary)`；`#666` → `var(--text-secondary)`；`#eee` → `var(--border)`；`border-radius: 12px` → `var(--radius-md)` |
| `.ui-loading` | `.ui-loading-spinner` 的 `border-top-color: #1989fa` → `var(--brand)`；`#e0e0e0` → `var(--bg-tool)`；`#666` → `var(--text-secondary)` |
| `.ui-empty` | `#999` → `var(--text-secondary)`；新增 `.ui-empty-icon` 的 SVG 默认尺寸与配色规则 |

#### 3.2.2 新增 4 个组件（共 6 个类族）

##### A. 按钮 `.ui-btn`

```css
/* 基类 */
.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 0 var(--space-lg);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast);
  user-select: none;
  white-space: nowrap;
}

/* 尺寸 */
.ui-btn--lg { height: 48px; font-size: var(--text-base); }
.ui-btn--md { height: 40px; font-size: var(--text-base); }
.ui-btn--sm { height: 32px; font-size: var(--text-sm); padding: 0 var(--space-md); }

/* 变体 */
.ui-btn--primary {
  background: var(--brand-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 138, 61, 0.3);
}
.ui-btn--primary:active { transform: scale(0.98); box-shadow: 0 2px 6px rgba(255, 138, 61, 0.4); }

.ui-btn--ghost {
  background: var(--bg-tool);
  color: var(--text-primary);
  box-shadow: var(--neu-outset);
}
.ui-btn--ghost:active { box-shadow: var(--neu-pressed); transform: scale(0.98); }

.ui-btn--text {
  background: transparent;
  color: var(--brand);
  padding: 0 var(--space-sm);
}
.ui-btn--text:active { opacity: 0.7; }

.ui-btn--danger {
  background: var(--error);
  color: #fff;
}
.ui-btn--danger:active { transform: scale(0.98); opacity: 0.9; }

/* 状态 */
.ui-btn:disabled, .ui-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.ui-btn--loading {
  position: relative;
  color: transparent !important;
  pointer-events: none;
}
.ui-btn--loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ui-btn-spin 0.6s linear infinite;
}
@keyframes ui-btn-spin { to { transform: rotate(360deg); } }
```

##### B. 卡片 `.ui-card`

```css
.ui-card {
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.ui-card--tool {
  background: var(--bg-tool);
  box-shadow: var(--neu-inset);
}

.ui-card--content {
  background: var(--card-bg);
  box-shadow: var(--shadow-md);
}

.ui-card--flat {
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
}

/* 可点击态 */
.ui-card--clickable { cursor: pointer; }
.ui-card--clickable:active { transform: scale(0.98); }

/* 结构 */
.ui-card__header { margin-bottom: var(--space-md); }
.ui-card__title { font-size: var(--text-lg); font-weight: var(--font-semibold); color: var(--text-primary); }
.ui-card__body { font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-base); }
.ui-card__footer { margin-top: var(--space-md); display: flex; gap: var(--space-sm); }
```

##### C. 输入框 `.ui-input`

```css
.ui-input-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ui-input-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.ui-input {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-tool);
  box-shadow: var(--neu-inset);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--text-primary);
  outline: none;
  transition: box-shadow var(--transition-base);
  box-sizing: border-box;
}

.ui-input::placeholder { color: var(--text-muted); }

.ui-input:focus {
  box-shadow: var(--neu-inset), 0 0 0 2px var(--brand);
}

.ui-input--error {
  box-shadow: var(--neu-inset), 0 0 0 2px var(--error);
}

.ui-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-input-help {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.ui-input-error-msg {
  font-size: var(--text-xs);
  color: var(--error);
}

/* 搜索输入变体 */
.ui-input--search {
  padding-left: 40px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238A8A8A' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px center;
}

/* 文本域 */
.ui-textarea {
  min-height: 96px;
  padding: var(--space-md);
  resize: vertical;
  font-family: var(--font-sans);
  line-height: var(--leading-base);
}
```

##### D. 标签 `.ui-tag`

```css
.ui-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

.ui-tag--sm { font-size: var(--text-xs); padding: 1px var(--space-xs); }
.ui-tag--md { font-size: var(--text-sm); padding: 2px var(--space-sm); }

.ui-tag--solid {
  background: var(--brand);
  color: #fff;
}

.ui-tag--outline {
  background: transparent;
  border: 1px solid var(--brand);
  color: var(--brand);
}

.ui-tag--neu {
  background: var(--bg-tool);
  box-shadow: var(--neu-outset);
  color: var(--text-primary);
}

.ui-tag--pill {
  border-radius: var(--radius-pill);
  padding: 4px var(--space-md);
}
```

##### E. 头像 `.ui-avatar`

```css
.ui-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-tool);
  color: var(--text-secondary);
  font-weight: var(--font-semibold);
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}

.ui-avatar--xs { width: 24px; height: 24px; font-size: 10px; }
.ui-avatar--sm { width: 32px; height: 32px; font-size: 12px; }
.ui-avatar--md { width: 40px; height: 40px; font-size: 14px; }
.ui-avatar--lg { width: 56px; height: 56px; font-size: 18px; }
.ui-avatar--xl { width: 72px; height: 72px; font-size: 24px; }

.ui-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 头像角标 */
.ui-avatar__badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--brand);
  color: #fff;
  font-size: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-bold);
}
```

##### F. 空状态 `.ui-empty`（重构 + 扩展）

```css
.ui-empty {
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.ui-empty__icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ui-empty__icon svg {
  width: 100%;
  height: 100%;
  stroke: var(--text-muted);
  stroke-width: 1.5;
  fill: none;
}

.ui-empty__title {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

.ui-empty__desc {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: var(--leading-base);
  max-width: 240px;
}

.ui-empty__action {
  margin-top: var(--space-sm);
}
```

##### G. 骨架屏 `.ui-skeleton`

```css
.ui-skeleton {
  background: linear-gradient(90deg, var(--bg-tool) 25%, var(--card-bg) 50%, var(--bg-tool) 75%);
  background-size: 200% 100%;
  animation: ui-skeleton-shimmer 1.4s ease infinite;
  border-radius: var(--radius-sm);
}

@keyframes ui-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.ui-skeleton--text { height: 14px; margin-bottom: var(--space-xs); }
.ui-skeleton--text:last-child { width: 60%; }

.ui-skeleton--card {
  height: 120px;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-lg);
}

.ui-skeleton--circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.ui-skeleton--list {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--border);
}
```

##### H. 加载态 `.ui-loading`（重构 + 扩展）

```css
/* 全屏 loading 已存在，重构色值即可 */

/* 新增：按钮内 spinner（替代 .ui-btn--loading::after 的备选方案） */
.ui-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 138, 61, 0.2);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: ui-btn-spin 0.6s linear infinite;
}

.ui-spinner--sm { width: 12px; height: 12px; border-width: 1.5px; }
.ui-spinner--lg { width: 24px; height: 24px; border-width: 3px; }
```

---

### 3.3 SVG icon 策略（决策 A1）

#### 3.3.1 内联 SVG 模板

为减少重复代码，在 `ui-kit.js` 中新增 `UiKit.icon(name)` 方法，返回常用 SVG 字符串：

```js
UiKit.icon('search')   // 返回搜索 icon SVG
UiKit.icon('check')    // 返回对勾 icon SVG
UiKit.icon('warning')  // 返回警告 icon SVG
UiKit.icon('error')    // 返回错误 icon SVG
UiKit.icon('info')     // 返回信息 icon SVG
UiKit.icon('empty-trip')    // 无行程插画
UiKit.icon('empty-network') // 无网络插画
UiKit.icon('empty-result')  // 无搜索结果插画
UiKit.icon('empty-checkin') // 无打卡记录插画
UiKit.icon('image-broken')  // 图片加载失败
```

**注意**：这是 JS 层的小扩展，不算 API 破坏。原有 `toast/confirm/showLoading` 签名不变。

#### 3.3.2 空状态 SVG 插画风格

- 几何线条风格（stroke-width: 1.5）
- 主色 `var(--text-muted)` 描边
- 关键元素用 `var(--brand)` 点缀（如行李箱的把手、地图的图钉）
- 尺寸 80×80px

---

### 3.4 图片策略实现

#### 3.4.1 图片占位与错误态

新增 `.ui-img-wrap` 容器类，配合 `onerror` 处理：

```css
.ui-img-wrap {
  position: relative;
  background: var(--bg-tool);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ui-img-wrap::before {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  border: 2px solid var(--brand);
  border-top-color: transparent;
  border-radius: 50%;
  animation: ui-btn-spin 0.6s linear infinite;
}

.ui-img-wrap.ui-img-loaded::before { display: none; }

.ui-img-wrap.ui-img-error::before { display: none; }
.ui-img-wrap.ui-img-error::after {
  content: '';
  width: 48px;
  height: 48px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23B5B5B5' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}

.ui-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 1;
}
```

JS 层（`ui-kit.js` 扩展）：

```js
UiKit.img = function(imgEl) {
  imgEl.addEventListener('load', () => {
    imgEl.parentElement.classList.add('ui-img-loaded')
  })
  imgEl.addEventListener('error', () => {
    imgEl.parentElement.classList.add('ui-img-error')
    imgEl.style.display = 'none'
  })
}
```

---

### 3.5 品牌名替换实现

#### 3.5.1 静态文案替换

| 文件 | 替换内容 |
|------|---------|
| `index.html` | `<title>圆周·AI旅行规划</title>` → `<title>哇途 · AI旅行规划</title>` |
| `index.html` | 页面内所有"圆周"字样 → "哇途" |
| `js/config.js` | `appName: '圆周'` → `appName: '哇途'`（如有） |
| `js/share.js` | 分享文案中的"圆周" → "哇途" |
| `manifest.json`（如有） | `name` / `short_name` 字段 |

#### 3.5.2 替换策略

- 使用全局搜索替换，但**只替换"圆周"字样**，不动其他品牌相关词汇
- 替换后人工检查每个位置上下文是否通顺（如"圆周旅行"→"哇途旅行"通顺，但"圆周率"不应替换）

---

### 3.6 emoji 清理实现

#### 3.6.1 清理范围（基于 spec.md 第 7.2 节）

| 位置 | emoji | 替换为 |
|------|-------|-------|
| 首页问候语 | `👋` | 移除（纯文字"你好，旅行者"） |
| 首页头像默认 | `🧳` | 文字头像（用户名首字） |
| 首页快捷入口 | `✨` `🗺️` `👥` | SVG icon |
| 首页天气 | `☀️` 等 | 保留（属于天气数据内容） |
| 所有按钮内 emoji | 各类 | 移除 |

#### 3.6.2 清理策略

- **本期只清理首页（homePage）的 emoji**，作为示范
- 其他页面（行程/社区/我的）的 emoji 清理放到 Phase 2 各页改造时统一处理
- 用户内容区（吐槽、游记、评论）的 emoji 100% 保留

---

## 4. AC 覆盖汇总表

| AC 编号 | AC 描述 | 技术方案覆盖 | 实现位置 |
|---------|---------|------------|---------|
| AC-Brand-1 | 品牌名替换 | 3.5 节 | `index.html`、`js/config.js`、`js/share.js` |
| AC-Brand-2 | 品牌色调统一 | 3.1 节 + 3.2.1 节 | `variables.css`、`ui-kit.css` 重构 |
| AC-Token-1 | 色彩 token 完整 | 3.1.1 节 | `variables.css` |
| AC-Token-2 | 字体 token 完整 | 3.1.1 节 | `variables.css` |
| AC-Token-3 | 间距 token 完整 | 3.1.1 节 | `variables.css` |
| AC-Token-4 | 阴影 token 完整（含新拟态） | 3.1.1 节 | `variables.css` |
| AC-Comp-1 | 按钮组件可用 | 3.2.2 A 节 | `ui-kit.css` |
| AC-Comp-2 | 卡片组件三种风格 | 3.2.2 B 节 | `ui-kit.css` |
| AC-Comp-3 | 输入框组件状态完整 | 3.2.2 C 节 | `ui-kit.css` |
| AC-Comp-4 | Toast 四种类型 | 3.2.1 节 + 3.3 节 | `ui-kit.css` 重构 + `ui-kit.js` icon 注入 |
| AC-Comp-5 | 标签四种变体 | 3.2.2 D 节 | `ui-kit.css` |
| AC-Comp-6 | 头像多类型 | 3.2.2 E 节 | `ui-kit.css` |
| AC-Comp-7 | 空状态 SVG 插画 | 3.2.2 F 节 + 3.3.2 节 | `ui-kit.css` + `ui-kit.js` |
| AC-Comp-8 | 加载态三种形态 | 3.2.2 G/H 节 | `ui-kit.css` |
| AC-Emoji-1 | 功能区 emoji 清零 | 3.6 节 | `index.html` 首页 |
| AC-Emoji-2 | 用户内容区 emoji 保留 | 不动用户内容相关代码 | 无需改动 |
| AC-Img-1 | 图片占位与错误态 | 3.4 节 | `ui-kit.css` + `ui-kit.js` |
| AC-Doc-1 | 设计系统文档完整 | 已有 `spec.md` + 本文档 | `specs/design-system/` |
| AC-Doc-2 | Token 与文档一致 | 实现时核对 | 全文件 |

**覆盖率：18/18 = 100%**

---

## 5. 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 重构现有 4 个组件导致回归 | 低 | 中 | 只改色值不改结构；改完后手动测试 Toast/Modal/Loading 在各页面的调用 |
| `--bg` 从 `#F6F7F9` 改为 `#ECE9E5` 影响全局视觉 | 高 | 中 | 这是预期变化，但需在实现后逐页检查是否有视觉断层 |
| SVG icon 注入逻辑影响 Toast 现有行为 | 低 | 低 | `UiKit.icon()` 是新增方法，不改 `toast()` 签名 |
| 品牌名替换遗漏 | 中 | 低 | 用全局搜索 "圆周" 二次核查 |
| 首页 emoji 清理影响布局 | 中 | 低 | 每个清理点单独测试，必要时调整 CSS |

---

## 6. 不在本期范围（重申）

- 不改造业务页面布局（首页/行程/社区/我的的视觉重构放 Phase 2）
- 不重构 feature 专用样式（`.pl-*`、`.ls-*`、`.ck-*` 等）
- 不做 logo 设计
- 不做组件 HTML 物理模板
- 不做视觉示例页 `design-system-preview.html`
- 不接入用户上传图片
- 不做暗色模式

---

## 7. 待解决问题（Open Questions）

- [ ] 决策 A（SVG icon 策略）：选 A1 内联 / A2 CSS background / A3 icon 字体？
- [ ] 决策 B（现有 4 组件是否重构）：选 B1 重构 / B2 保留？
- [ ] 决策 C（`#1989fa` 处理）：选 C1 全替换 / C2 保留 / C3 折中？

---

> 下一步：等你确认 3 个决策后，进入任务规划（SpecForge Skill 10 - feature-task-planning）
