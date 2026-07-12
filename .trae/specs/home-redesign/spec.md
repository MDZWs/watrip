# 哇途 · 首页应用设计系统 - 需求文档

> 文档版本：v1.0
> 生成时间：2026-07-03
> 阶段：需求澄清完成 / 待技术设计
> 工作流：SpecForge 功能级 - Skill 8

---

## 1. 背景

Phase 1 已建立设计系统（Token + 8 个基础组件 + SVG 图标 + 品牌替换 + 首页功能区 emoji 清理）。本期 Phase 2 第一站：将设计系统应用到首页（homePage），同时做中等力度的信息架构调整，让首页视觉统一、信息层级清晰。

## 2. 用户决策摘要

| 决策点 | 选择 | 说明 |
|--------|------|------|
| 信息架构力度 | 中等调整 | 合并快捷入口与快捷工具为统一功能区；当前行程卡上移；移除 Banner |
| 天气 widget 视觉 | 保留蓝色但用 token | 提取 `--weather-blue` 系列 token，蓝色视觉保留但变量化 |
| 快捷入口 icon 配色 | 统一品牌橙渐变 | 4 个 icon 背景统一为 `var(--brand-gradient)`，靠 SVG 图形区分 |
| Banner 去留 | 移除 | 功能与快捷入口"社区"重复，移除以聚焦核心 |

## 3. 范围

### 3.1 本期范围内（in scope）

- 首页（`#homePage`）所有模块的样式应用设计系统
- 首页信息架构中等调整（模块重排 + 功能合并 + Banner 移除）
- `pages.css` 中首页相关样式（约第 96-547 行）的硬编码颜色 token 化
- 新建 `--weather-blue` 系列 token（在 variables.css 中）
- 偿还 DEBT-01（首页范围内的 `#1989fa` 等遗留色，本期首页无此色但相关浅灰硬编码 `#F5F5F7` 等需处理）
- 偿还 DEBT-02（首页范围内已无 emoji，本期保持）

### 3.2 本期范围外（out of scope）

- 行程页 / 社区页 / 我的页的应用（后续 Phase 2 子任务）
- 首页功能逻辑变更（仅视觉与重排，不改变交互行为）
- 新功能添加
- 加载态 / 空状态组件替换（除首页现有空状态外）

## 4. 信息架构调整方案

### 4.1 调整后首页结构（自上而下）

```
homePage
├── home-header（保持）
│   ├── greeting-text（保持）
│   └── home-avatar（保持，配色统一为品牌橙渐变）
└── home-scroll
    ├── travel-stats-card（保持位置，应用新组件样式）
    ├── current-trip-card（⬆ 上移到此位置，核心信息优先）
    │   └── 默认 hidden，有行程时显示
    ├── weather-widget（保持位置，蓝色保留但 token 化）
    ├── quick-actions（⬇ 合并区，4 个核心入口）
    │   ├── AI规划（品牌橙）
    │   ├── 行程（品牌橙）
    │   ├── 社区（品牌橙）
    │   └── 记账（品牌橙）
    ├── quick-tools-section（保持，4 个工具入口）
    │   ├── 天气
    │   ├── 汇率
    │   ├── 紧急
    │   └── 离线
    └── ❌ home-banner（移除）
```

### 4.2 调整说明

1. **当前行程卡上移**：从快捷入口下方移到统计卡下方。理由：当前行程是首页最核心信息（如有），应优先展示。无行程时该区域不占位（保持 `display:none`）。
2. **快捷入口配色统一**：4 个 icon 背景统一为 `var(--brand-gradient)`，仅靠 SVG 图形区分功能。
3. **Banner 移除**：与快捷入口"社区"功能重复，移除以减少视觉噪音。
4. **保持不变**：
   - 旅行统计卡（仅 token 化）
   - 天气 widget（蓝色保留，提取 token）
   - 快捷工具栏（仅 token 化）

## 5. 验收标准（Acceptance Criteria）

### AC-Arch-1：信息架构调整

**Given** 用户打开首页
**When** 页面加载完成
**Then** 自上而下依次显示：问候语 header → 旅行统计卡 → 当前行程卡（有行程时）→ 天气 widget → 快捷入口（4 个）→ 快捷工具栏（4 个）
**And** 底部不再显示"发现精彩旅程" Banner
**And** 当前行程卡默认 `display:none`，仅 `App.openCurrentTrip()` 触发或后端返回当前行程时显示

### AC-Color-1：硬编码颜色 token 化

**Given** 开发者在 `pages.css` 中查看 `.home-header` 到 `.banner-*` 范围内的样式
**When** 搜索硬编码颜色
**Then** 以下颜色不再以字面量出现，全部替换为 token：
- `#fff` / `#ffffff` → `var(--card-bg)`
- `#4A90D9` / `#357ABD` → `var(--weather-blue)` / `var(--weather-blue-dark)`
- `#A8E0FF` / `#7B68EE`（Banner）→ 整段移除
- `#FFE0CC` / `#FFB983`（avatar）→ `var(--brand-light)` / `var(--brand)`
- `#FFB983` / `#FF8A3D`（ticket-top）→ `var(--brand-gradient)`
- `#FFF5EE` / `#FFE8D6`（quick-action hover）→ `var(--brand-light-soft)` / `var(--brand-light)`
- `#E8E8ED`（ticket-dashed-line）→ `var(--border)`
- `#F0F0F5`（ticket-progress）→ `var(--bg-tool)`
- `rgba(0,0,0,0.04)` / `rgba(0,0,0,0.08)` → `var(--shadow-sm)` / `var(--shadow-md)`
- `rgba(74,144,217,0.3)`（weather-widget shadow）→ `var(--shadow-weather)`

### AC-Color-2：天气 widget token 化

**Given** `variables.css` 中新增天气色 token
**When** 查看变量定义
**Then** 以下 token 存在：
- `--weather-blue: #4A90D9`
- `--weather-blue-dark: #357ABD`
- `--weather-blue-light: #A8E0FF`
- `--shadow-weather: 0 4px 16px rgba(74,144,217,0.3)`
**And** `.weather-widget` 的 background 改为 `linear-gradient(135deg, var(--weather-blue) 0%, var(--weather-blue-dark) 100%)`
**And** `.weather-widget` 的 box-shadow 改为 `var(--shadow-weather)`

### AC-Icon-1：快捷入口 icon 统一品牌色

**Given** 首页快捷入口区有 4 个 `.qa-icon` 元素
**When** 页面渲染完成
**Then** 4 个 `.qa-icon` 的 `background` 都是 `var(--brand-gradient)`
**And** 4 个 SVG icon 的 `stroke="#fff"` 保持白色
**And** HTML 中不再有 `style="background:linear-gradient(135deg,#FFB983,#FF8A3D);"` 等内联样式

### AC-Comp-1：新组件应用

**Given** 首页各模块渲染完成
**When** 检查 DOM 结构
**Then** 以下模块应用了新的组件类（与现有类共存，不删除原有类）：
- `.travel-stats-card` 增加 `.ui-card` 类
- `.current-trip-card` 增加 `.ui-card.ui-card--content` 类
- `.quick-action-card` 增加 `.ui-card.ui-card--flat.ui-card--clickable` 类
- `.qt-item` 增加 `.ui-card.ui-card--flat.ui-card--clickable` 类

### AC-Space-1：字号间距 token 化

**Given** `pages.css` 中首页相关样式
**When** 查看属性值
**Then** 以下属性全部使用 token：
- `font-size` 值为 `var(--text-xs/sm/base/lg/xl/2xl/3xl)` 之一
- `margin-top` / `margin-bottom` / `padding` 的值（4px 栅格倍数）为 `var(--space-xs/sm/md/lg/xl/2xl/3xl)` 之一
- `border-radius` 值为 `var(--radius-sm/md/lg/xl/pill)` 之一
- `font-weight` 值为 `var(--font-regular/medium/semibold/bold/heavy)` 之一

### AC-Visual-1：视觉无断层

**Given** 用户从其他页面切换到首页
**When** 视觉对比调整前后
**Then** 整体色调与设计系统一致（暖灰底色 + 白色卡片 + 橙色品牌点缀 + 天气蓝色保留）
**And** 无明显的颜色断层、字号跳变、间距不一致
**And** 移动端（375px 宽度）下排版正常，无横向滚动

### AC-Remove-1：Banner 移除

**Given** `index.html` 中首页 HTML
**When** 检查 DOM
**Then** `<div class="home-banner" onclick="App.switchTab('community')">...</div>` 整段被移除
**And** `pages.css` 中 `.home-banner` / `.banner-title` / `.banner-desc` / `.banner-emoji` / `.banner-content` 样式块被移除（保持文件干净）

### AC-NoReg-1：无功能回归

**Given** 首页所有交互
**When** 用户执行以下操作
**Then** 行为与调整前一致：
- 点击问候语头像 → 触发 `App.handleAvatarClick()`
- 点击旅行统计卡 → 无变化（保持非 clickable）
- 点击当前行程卡 → 触发 `App.openCurrentTrip()`
- 点击天气 widget → 触发 `App.openWeatherDetail()`
- 点击快捷入口 4 个卡片 → 分别触发对应 `App.navigateTo` / `App.switchTab` / `App.openQuickExpense`
- 点击快捷工具 4 个 → 分别触发对应 `App.openWeatherDetail` / `App.openExchangeRate` / `App.openEmergencyInfo` / `App.openOfflineMaps`

## 6. 验证方式

| AC 类型 | 验证方式 |
|---------|---------|
| AC-Arch-1 / AC-Remove-1 | 人工视觉核对 + DOM 检查 |
| AC-Color-1 / AC-Color-2 | Grep 校验 `pages.css` 中无硬编码颜色字面量 |
| AC-Icon-1 | 人工视觉核对 + DOM computed style 校验 |
| AC-Comp-1 | DOM 检查类名存在 |
| AC-Space-1 | Grep 校验 `pages.css` 中首页范围内无字号/间距字面量 |
| AC-Visual-1 | 人工视觉核对（移动端 375px 视口） |
| AC-NoReg-1 | 手动点击测试 8+ 个交互点 |

## 7. 不确定项

无。所有关键决策已在第 2 节明确。

---

> 下一步：进入技术方案设计（SpecForge Skill 9 - feature-tech-design）
