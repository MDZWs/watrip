# 哇途 · 首页应用设计系统 - 技术设计

> 文档版本：v1.0
> 生成时间：2026-07-03
> 阶段：技术设计完成 / 待任务规划
> 工作流：SpecForge 功能级 - Skill 9

---

## 1. 资产盘点

### 1.1 现有代码资产

| 文件 | 范围 | 现状 |
|------|------|------|
| `index.html` 第 32-199 行 | `#homePage` 整段 | 结构清晰，6 个模块：header / stats / weather / quick-actions / current-trip / quick-tools / banner |
| `css/variables.css` | 全局 token | Phase 1 已建立 32+ token，本期需新增 4 个天气色 token |
| `css/ui-kit.css` | 组件库 | Phase 1 已建立 8 个组件类，本期应用 4 个（card 系列） |
| `css/pages.css` 第 96-547 行 | 首页相关样式 | 大量硬编码颜色与字号间距，本期改造重点 |

### 1.2 现有硬编码颜色清单（首页范围）

| 颜色 | 出现位置 | 替换为 |
|------|---------|--------|
| `#fff` / `#ffffff` | quick-action-card / travel-stats-card / qt-item / current-trip-card | `var(--card-bg)` |
| `linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)` | weather-widget | `linear-gradient(135deg, var(--weather-blue) 0%, var(--weather-blue-dark) 100%)` |
| `rgba(74,144,217,0.3)` | weather-widget shadow | `var(--shadow-weather)` |
| `linear-gradient(135deg, #A8E0FF 0%, #7B68EE 100%)` | home-banner | 整段移除（Banner 删除） |
| `linear-gradient(135deg, #FFE0CC 0%, #FFB983 100%)` | home-avatar | `linear-gradient(135deg, var(--brand-light) 0%, var(--brand) 100%)` |
| `linear-gradient(135deg, #FFB983 0%, #FF8A3D 100%)` | ticket-top | `var(--brand-gradient)` |
| `linear-gradient(135deg, #FFF5EE 0%, #FFE8D6 100%)` | quick-action-card:hover | `linear-gradient(135deg, var(--brand-light-soft) 0%, var(--brand-light) 100%)` |
| `#E8E8ED` | ticket-dashed-line | `var(--border)` |
| `#F0F0F5` | ticket-progress | `var(--bg-tool)` |
| `rgba(0,0,0,0.04)` | travel-stats-card / qt-item shadow | `var(--shadow-sm)` |
| `rgba(0,0,0,0.05)` | quick-action-card shadow | `var(--shadow-sm)` |
| `rgba(0,0,0,0.08)` | current-trip-card shadow | `var(--shadow-md)` |
| 内联 `style="background:linear-gradient(135deg,#FFB983,#FF8A3D);"` | 4 个 qa-icon | 移除内联，CSS 类统一 |

### 1.3 现有字号/间距字面量（首页范围）

| 类型 | 字面量 | 替换为 |
|------|--------|--------|
| font-size | 24px / 20px / 18px / 16px / 14px / 13px / 12px / 11px / 10px | `var(--text-2xl/xl/lg/base/sm/xs)` 等 |
| padding / margin | 4/6/8/10/12/14/16/20/24px | `var(--space-xs/sm/md/lg/xl/2xl/3xl)` 等 |
| border-radius | 10/12/14/16/20px / 999px / 50% | `var(--radius-sm/md/lg/xl/pill)` 或 50%保留 |
| font-weight | 500/600/700/800 | `var(--font-medium/semibold/bold/heavy)` |

---

## 2. 技术决策

### 决策 D1：组件类应用策略 - 共存而非替换

**选项**：
- A. 直接替换原类名为新组件类
- B. 新组件类与原类名共存（如 `class="travel-stats-card ui-card"`）

**选择**：B
**原因**：
- 原类名承载了 JS 选择器与业务样式（如 `.travel-stats-card` 的 flex 布局）
- 新组件类仅提供基础视觉（背景、阴影、圆角）
- 共存可避免 JS 逻辑回归风险
- 后续 Phase 2 其他页面应用时也遵循此策略

### 决策 D2：Banner 移除策略 - HTML 与 CSS 同步清理

**选项**：
- A. 仅删除 HTML，保留 CSS（防回归）
- B. HTML 与 CSS 同步删除

**选择**：B
**原因**：
- Banner 已确认永久移除，CSS 残留只会增加文件体积
- 同步清理保持文件干净，符合"不留无用代码"原则
- Git 可追溯历史，无需担心找回

### 决策 D3：内联 style 处理 - 移除并改为 CSS 类

**选项**：
- A. 保留内联 style 但改为 `var(--brand-gradient)`
- B. 移除内联 style，在 CSS 中统一 `.qa-icon { background: var(--brand-gradient); }`

**选择**：B
**原因**：
- 内联 style 难以维护，4 个 icon 颜色统一后无需差异化
- CSS 类方式便于后续主题切换
- 符合"样式与结构分离"原则

### 决策 D4：当前行程卡上移 - DOM 顺序调整

**选项**：
- A. 用 CSS `order` 属性调整视觉顺序
- B. 直接调整 HTML DOM 顺序

**选择**：B
**原因**：
- DOM 顺序即视觉顺序，更符合无障碍访问（屏幕阅读器）
- CSS order 在 flex 容器中才生效，home-scroll 是普通 block 容器
- 直接调整 HTML 更直观

---

## 3. Token 新增清单

在 `css/variables.css` 中新增以下 4 个 token：

```css
/* === 天气色（保留蓝色视觉，token 化便于后续调整）=== */
--weather-blue: #4A90D9;
--weather-blue-dark: #357ABD;
--weather-blue-light: #A8E0FF;
--shadow-weather: 0 4px 16px rgba(74,144,217,0.3);
```

**位置**：插入到 `/* === 状态色 === */` 区块之后，新增 `/* === 天气色 === */` 区块。

---

## 4. 改动映射表（AC → 具体代码改动）

### AC-Arch-1：信息架构调整

| 改动 | 文件 | 行号 | 操作 |
|------|------|------|------|
| 当前行程卡上移 | `index.html` | 125-167 | 将整段 `<div class="current-trip-card">...</div>` 移动到旅行统计卡（67 行结尾）之后、天气 widget（69 行）之前 |
| Banner 移除 | `index.html` | 192-198 | 删除整段 `<div class="home-banner">...</div>` |

### AC-Color-1：硬编码颜色 token 化

| 改动 | 文件 | 行号 | 操作 |
|------|------|------|------|
| home-avatar 背景 | `pages.css` | 121 | `linear-gradient(135deg, #FFE0CC 0%, #FFB983 100%)` → `linear-gradient(135deg, var(--brand-light) 0%, var(--brand) 100%)` |
| quick-action-card 背景 | `pages.css` | 146 | `#fff` → `var(--card-bg)` |
| quick-action-card shadow | `pages.css` | 156 | `0 2px 8px rgba(0,0,0,0.05)` → `var(--shadow-sm)` |
| quick-action-card:hover 背景 | `pages.css` | 162 | `linear-gradient(135deg, #FFF5EE 0%, #FFE8D6 100%)` → `linear-gradient(135deg, var(--brand-light-soft) 0%, var(--brand-light) 100%)` |
| travel-stats-card 背景 | `pages.css` | 214 | `#fff` → `var(--card-bg)` |
| travel-stats-card shadow | `pages.css` | 218 | `0 2px 8px rgba(0,0,0,0.04)` → `var(--shadow-sm)` |
| weather-widget 背景 | `pages.css` | 251 | `linear-gradient(135deg, #4A90D9 0%, #357ABD 100%)` → `linear-gradient(135deg, var(--weather-blue) 0%, var(--weather-blue-dark) 100%)` |
| weather-widget shadow | `pages.css` | 257 | `0 4px 16px rgba(74,144,217,0.3)` → `var(--shadow-weather)` |
| qt-item 背景 | `pages.css` | 351 | `#fff` → `var(--card-bg)` |
| qt-item shadow | `pages.css` | 357 | `0 2px 8px rgba(0,0,0,0.04)` → `var(--shadow-sm)` |
| qt-item:active shadow | `pages.css` | 361 | `0 1px 4px rgba(0,0,0,0.08)` → `var(--shadow-sm)`（或保留 active 态特殊处理） |
| current-trip-card 背景 | `pages.css` | 379 | `#fff` → `var(--card-bg)` |
| current-trip-card shadow | `pages.css` | 381 | `0 4px 16px rgba(0,0,0,0.08)` → `var(--shadow-md)` |
| ticket-dashed-line border | `pages.css` | 416 | `#E8E8ED` → `var(--border)` |
| ticket-top 背景 | `pages.css` | 425 | `linear-gradient(135deg, #FFB983 0%, #FF8A3D 100%)` → `var(--brand-gradient)` |
| ticket-progress 背景 | `pages.css` | 480 | `#F0F0F5` → `var(--bg-tool)` |
| Banner 整段移除 | `pages.css` | 525-547 | 删除 `.home-banner` / `.banner-title` / `.banner-desc` / `.banner-emoji` 整段 |

### AC-Color-2：天气 widget token 化

| 改动 | 文件 | 操作 |
|------|------|------|
| 新增天气色 token | `variables.css` | 在状态色区块后新增 `/* === 天气色 === */` 区块，含 4 个 token |

### AC-Icon-1：快捷入口 icon 统一品牌色

| 改动 | 文件 | 操作 |
|------|------|------|
| 移除 4 个 qa-icon 内联 style | `index.html` | 删除第 84, 94, 104, 114 行的 `style="background:linear-gradient(135deg,#XXX,#XXX);"` |
| CSS 统一 qa-icon 背景 | `pages.css` | `.qa-icon` 选择器内新增 `background: var(--brand-gradient);` |

### AC-Comp-1：新组件应用

| 改动 | 文件 | 操作 |
|------|------|------|
| travel-stats-card | `index.html` 第 47 行 | `class="travel-stats-card"` → `class="travel-stats-card ui-card"` |
| current-trip-card | `index.html` 第 125 行 | `class="current-trip-card"` → `class="current-trip-card ui-card ui-card--content"` |
| quick-action-card | `index.html` 第 83, 93, 103, 113 行 | `class="quick-action-card"` → `class="quick-action-card ui-card ui-card--flat ui-card--clickable"` |
| qt-item | `index.html` 第 173, 177, 181, 185 行 | `class="qt-item"` → `class="qt-item ui-card ui-card--flat ui-card--clickable"` |

**注意**：组件类的 `box-shadow` 与 `padding` 可能与原类冲突，需在 `pages.css` 中检查并调整优先级（必要时用 `:where()` 降低组件类优先级，或在原类中覆盖）。

### AC-Space-1：字号间距 token 化

`pages.css` 第 96-547 行范围内所有 `font-size` / `padding` / `margin` / `border-radius` / `font-weight` 字面量替换为 token。

**批量替换规则**：
- `font-size: 10px` → `var(--text-xs)` ⚠ 但 `--text-xs` 是 12px，10px 不在阶梯内 → 保留 10px 字面量（DEBT-05 记录）
- `font-size: 11px` → 保留 11px 字面量（同上）
- `font-size: 12px` → `var(--text-xs)`
- `font-size: 13px` → 保留 13px 字面量（同上）
- `font-size: 14px` → `var(--text-sm)`
- `font-size: 16px` → `var(--text-base)`
- `font-size: 18px` → `var(--text-lg)`
- `font-size: 20px` → `var(--text-xl)`
- `font-size: 24px` → `var(--text-2xl)`
- `font-size: 32px` → `var(--text-3xl)`
- `font-size: 44px` → 保留（天气图标特殊尺寸）
- `font-size: 48px` → 保留（banner emoji 已删除）

**间距/圆角/字重**：按 4px 栅格与 token 阶梯对齐，能对齐的替换，不能对齐的保留并记录。

### AC-Remove-1：Banner 移除

见 AC-Arch-1 改动表。

### AC-NoReg-1：无功能回归

无代码改动，仅手动测试验证。

---

## 5. AC 覆盖汇总表

| AC ID | 描述 | 覆盖状态 | 改动来源 |
|-------|------|---------|---------|
| AC-Arch-1 | 信息架构调整 | ✅ 完全覆盖 | DOM 重排 + Banner 删除 |
| AC-Color-1 | 硬编码颜色 token 化 | ✅ 完全覆盖 | pages.css 16 处替换 |
| AC-Color-2 | 天气 widget token 化 | ✅ 完全覆盖 | variables.css 新增 4 token + pages.css 2 处替换 |
| AC-Icon-1 | 快捷入口 icon 统一品牌色 | ✅ 完全覆盖 | index.html 4 处内联 style 删除 + pages.css 1 处新增 |
| AC-Comp-1 | 新组件应用 | ✅ 完全覆盖 | index.html 10 处类名新增 |
| AC-Space-1 | 字号间距 token 化 | ⚠ 部分覆盖 | 10/11/13px 不在阶梯内，保留字面量（DEBT-05） |
| AC-Visual-1 | 视觉无断层 | ✅ 完全覆盖 | 人工视觉核对 |
| AC-Remove-1 | Banner 移除 | ✅ 完全覆盖 | HTML + CSS 同步删除 |
| AC-NoReg-1 | 无功能回归 | ✅ 完全覆盖 | 手动测试 8+ 交互点 |

**覆盖率**：8/9 完全覆盖，1/9 部分覆盖（AC-Space-1 有 3 个非阶梯字号保留为 DEBT-05）。

---

## 6. 技术债务预记录

### DEBT-05：非阶梯字号保留

- **描述**：`font-size: 10px / 11px / 13px` 不在现有 token 阶梯内（xs=12, sm=14, base=16...）
- **影响位置**：首页 `.qa-title` (12px✓) / `.qa-desc` (10px⚠) / `.qa-label` (11px⚠) / `.ts-label` (11px⚠) / `.ww-desc` (13px⚠) / `.ww-location` (12px✓) / `.wwf-day` (10px⚠) / `.wwf-temp` (11px⚠) / `.ticket-city-name` (10px⚠) / `.ticket-date-badge` (11px⚠) / `.ticket-info-label` (10px⚠) / `.qt-label` (11px⚠)
- **处理**：本期保留字面量
- **偿还计划**：Phase 2 后期统一审视字号阶梯，如需要可新增 `--text-2xs: 10px` / `--text-xs-: 11px` / `--text-sm-: 13px` 三档

### DEBT-06：组件类与原类优先级冲突风险

- **描述**：`.ui-card` 提供 `box-shadow` 与 `padding`，可能与原类 `.travel-stats-card` 的 `padding: 14px 8px` 等冲突
- **处理**：编码时检查每处应用，必要时在原类中用更高优先级覆盖
- **偿还计划**：编码过程中即时处理，无遗留

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 组件类优先级冲突导致视觉错乱 | 中 | 中 | 编码时逐一检查，必要时调整原类 |
| 当前行程卡上移后 JS 选择器失效 | 低 | 高 | 仅 DOM 顺序调整，类名与 ID 不变，JS 无影响 |
| Banner 移除后 JS 引用报错 | 低 | 中 | 编码前 Grep 校验 `home-banner` 在 JS 中的引用 |
| 字号 token 替换后视觉断层 | 低 | 低 | 10/11/13px 保留字面量，仅替换阶梯内字号 |

---

> 下一步：进入任务规划（SpecForge Skill 10 - feature-task-planning）
