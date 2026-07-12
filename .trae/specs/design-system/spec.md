# 哇途 · 设计系统(Design System) - 需求文档

> 文档版本：v1.0
> 生成时间：2026-07-03
> 阶段：功能需求澄清完成 / 待技术方案设计
> 工作流：SpecForge 功能级 - Skill 8

---

## 1. 功能概述

为「哇途」App 建立一套统一的设计系统(Design System),作为后续所有页面 UI 增强、信息架构重构、迭代功能的视觉与交互地基。

设计系统包含两层产出：
- **Token 层**：完整的色彩、字体、间距、圆角、阴影、动效变量，落地到 `css/variables.css`
- **组件层**：8 个基础组件样式，落地到 `css/ui-kit.css`，覆盖 80% 通用 UI 场景

设计系统本身不直接改造业务页面，只提供"语言规则"。具体页面应用放到下一阶段（Phase 2）。

---

## 2. 品牌定位

### 2.1 品牌名
- **「哇途」**（Wā Tú）
- "哇" = 旅行中惊叹的瞬间（看见绝美风景、踩到雷、发现宝藏）
- "途" = 旅途本身
- 念出来自带惊喜感，简洁好注册

### 2.2 品牌情绪
- 年轻、轻快、有惊喜感
- 不文艺、不沉闷、不工具化
- 让用户每次打开都觉得"可能会有哇时刻"

### 2.3 品牌名替换范围
- App 标题、状态栏、启动页、分享文案、所有"圆周"字样
- 后续 logo 设计基于"哇途"二字做视觉延展（logo 本身不在本期范围）

---

## 3. 设计目标与原则

### 3.1 核心目标
1. **统一视觉语言**：消除现有界面"杂乱 emoji + 内联渐变 + 风格不一"的问题
2. **双面适配**：既能服务工具面（行程规划/记账/行李清单），又能服务内容面（社区/游记/打卡）
3. **内容优先**：让用户产生的图、文、吐槽成为视觉主角，设计退到背后
4. **可维护性**：所有视觉决策落到 CSS 变量，后续改版只动 token 不动业务代码

### 3.2 设计原则（5 条铁律）

| 原则 | 含义 | 反例 |
|------|------|------|
| **工具区用新拟态，内容区用扁平** | 操作控件保留凹凸质感；内容卡片用纯净底色 + 大图 | 给游记封面加新拟态阴影框 |
| **品牌色克制使用** | 只用在主 CTA、激活态、关键强调；其他让中性色说话 | 所有按钮都涂橙色 |
| **暖底子，不纯白** | 底色一律带暖调（暖灰 / 暖白），让内容图发光 | 用 `#FFFFFF` 纯白 |
| **emoji 不出现在功能区** | 功能 icon 全部 SVG 化；emoji 只允许在用户内容里 | 导航、按钮里出现 emoji |
| **间距有节奏** | 用 4px 基础栅格，重要留白用 16/24/32 三档 | 随意用 13px、17px、22px |

---

## 4. 视觉风格基调

### 4.1 风格定位
**混合风格：工具区新拟态 + 内容区扁平暖底**

- **工具区**（导航、按钮、tab、控件、表单、输入框）：保留新拟态双向阴影，柔和有质感
- **内容区**（社区瀑布流、游记详情、打卡专题、图片画廊）：扁平 + 暖白底 + 大图优先
- **过渡区**（卡片标题、列表项）：极浅阴影 + 圆角，介于两者之间
- **品牌色统一**：橙色 `#FF8A3D` 作为唯一品牌色，贯穿工具区激活态与内容区关键强调

### 4.2 色彩体系

#### 4.2.1 品牌色（保留现有橙色资产）
| Token | 色值 | 用途 |
|-------|------|------|
| `--brand` | `#FF8A3D` | 主品牌色，激活态、主 CTA |
| `--brand-light` | `#FFB983` | 品牌色浅态，hover/渐变 |
| `--brand-dark` | `#E87025` | 品牌色深态，active/pressed |
| `--brand-gradient` | `linear-gradient(135deg, #FFA35C 0%, #FF8A3D 50%, #FF7020 100%)` | 主 CTA 渐变 |

#### 4.2.2 辅助色（保留现有）
| Token | 色值 | 用途 |
|-------|------|------|
| `--accent-blue` | `#5CC6FF` | 链接/信息提示 |
| `--accent-purple` | `#8B7CF5` | 已有，保留，次级强调（如创作相关元素） |

#### 4.2.3 中性色（核心调整：暖化）
| Token | 色值 | 用途 |
|-------|------|------|
| `--bg` | `#ECE9E5` | 全局底色（暖灰，从纯灰 `#E8E8E8` 暖化） |
| `--bg-tool` | `#E4E4E4` | 工具区底色（保留现有新拟态底色） |
| `--bg-content` | `#FAF8F4` | 内容区底色（暖白） |
| `--card-bg` | `#FFFFFF` | 卡片底色 |
| `--text-primary` | `#1A1A1A` | 主文字 |
| `--text-secondary` | `#8A8A8A` | 次要文字 |
| `--text-muted` | `#B5B5B5` | 弱化文字 |
| `--border` | `#EDEEF0` | 分割线 |

#### 4.2.4 状态色
| Token | 色值 | 用途 |
|-------|------|------|
| `--success` | `#34C759` | 成功 |
| `--warning` | `#FF9500` | 警告 |
| `--error` | `#FF3B30` | 错误 |
| `--info` | `#5AC8FA` | 信息 |

#### 4.2.5 新拟态阴影色（关键：双向阴影的色值对）
| Token | 色值 | 用途 |
|-------|------|------|
| `--neu-shadow-dark` | `#C4C4C4` | 阴影暗部 |
| `--neu-shadow-light` | `#FFFFFF` | 阴影亮部 |

### 4.3 字体体系

#### 4.3.1 字体族
| Token | 值 | 用途 |
|-------|------|------|
| `--font-sans` | `-apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif` | 全局默认 |
| `--font-serif` | `"PingFang SC", "Noto Serif SC", serif` | 备用，游记正文可选 |

#### 4.3.2 字号阶梯（4px 基础栅格）
| Token | 字号 | 行高 | 用途 |
|-------|------|------|------|
| `--text-xs` | 12px | 16px | 辅助文字、标签 |
| `--text-sm` | 14px | 20px | 次要正文 |
| `--text-base` | 16px | 24px | 主正文 |
| `--text-lg` | 18px | 26px | 卡片标题 |
| `--text-xl` | 20px | 28px | 页面次级标题 |
| `--text-2xl` | 24px | 32px | 页面主标题 |
| `--text-3xl` | 32px | 40px | Hero 标题（仅首页/启动页） |

#### 4.3.3 字重
| Token | 值 | 用途 |
|-------|------|------|
| `--font-regular` | 400 | 正文 |
| `--font-medium` | 500 | 次强调 |
| `--font-semibold` | 600 | 卡片标题、按钮 |
| `--font-bold` | 700 | 页面标题 |
| `--font-heavy` | 800 | Hero 标题 |

### 4.4 间距体系（4px 栅格）
| Token | 值 | 用途 |
|-------|------|------|
| `--space-xs` | 4px | 紧凑间距（图标与文字） |
| `--space-sm` | 8px | 行内间距 |
| `--space-md` | 12px | 卡片内间距 |
| `--space-lg` | 16px | 卡片间距、列表项间距 |
| `--space-xl` | 24px | 区块间距 |
| `--space-2xl` | 32px | 大区块间距 |
| `--space-3xl` | 48px | 页面级间距 |

### 4.5 圆角体系
| Token | 值 | 用途 |
|-------|------|------|
| `--radius-sm` | 12px | 小组件（标签、badge） |
| `--radius-md` | 16px | 中型组件（按钮、输入框） |
| `--radius-lg` | 24px | 大型组件（卡片） |
| `--radius-xl` | 32px | 特殊组件（弹窗、Hero 卡） |
| `--radius-pill` | 999px | 胶囊形（头像、tag） |

### 4.6 阴影体系
| Token | 值 | 用途 |
|-------|------|------|
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,0.04)` | 轻微浮起（列表项） |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | 卡片浮起 |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | 弹窗、模态 |
| `--neu-outset` | `6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)` | 新拟态凸起（激活态） |
| `--neu-inset` | `inset 4px 4px 8px var(--neu-shadow-dark), inset -4px -4px 8px var(--neu-shadow-light)` | 新拟态内凹（默认态） |
| `--neu-pressed` | `inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)` | 新拟态按压（pressed） |

### 4.7 动效体系
| Token | 值 | 用途 |
|-------|------|------|
| `--transition-fast` | `0.15s ease` | 微交互（hover、tap） |
| `--transition-base` | `0.2s ease` | 标准交互（按钮、tab 切换） |
| `--transition-slow` | `0.3s ease` | 大区块过渡（页面切换、抽屉） |
| `--transition-spring` | `0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性效果（点赞、收藏反馈） |

---

## 5. 组件清单（8 个基础组件）

### 5.1 按钮（Button）
- **变体**：主按钮（品牌渐变）、次按钮（新拟态凸起）、文字按钮（无背景）、危险按钮（红色）
- **状态**：默认、hover、pressed、disabled、loading
- **尺寸**：大（48px 高）、中（40px）、小（32px）
- **AC 见第 8 节**

### 5.2 卡片（Card）
- **变体**：工具卡（新拟态内凹）、内容卡（扁平 + 阴影）、过渡卡（极浅阴影）
- **结构**：header / body / footer 三段式
- **可点击态**：pressed 时缩放 0.98 + 阴影变浅

### 5.3 输入框（Input）
- **变体**：文本输入、搜索输入（带 icon）、文本域
- **状态**：默认（新拟态内凹）、focus（brand 描边）、error（红描边）、disabled
- **配件**：label、placeholder、helper text、error text

### 5.4 Toast 提示
- **变体**：success / warning / error / info
- **位置**：屏幕顶部下移 80px，居中
- **时长**：默认 2 秒，error 3 秒
- **动画**：从上滑入 + 淡出

### 5.5 标签（Badge / Tag）
- **变体**：实心（品牌色）、描边、新拟态、胶囊
- **尺寸**：小（12px 字）、中（14px 字）
- **场景**：等级徽章、状态标签、分类标签

### 5.6 头像（Avatar）
- **变体**：图片头像、emoji 头像、文字头像（首字）、icon 占位
- **尺寸**：xs(24) / sm(32) / md(40) / lg(56) / xl(72)
- **配件**：角标（等级徽章、在线状态）

### 5.7 空状态（Empty State）
- **结构**：SVG 插画 + 标题 + 描述 + 可选 CTA
- **场景**：无行程、无网络、无搜索结果、无打卡记录
- **插画风格**：几何线条 + 品牌色点缀

### 5.8 加载态（Loading）
- **变体**：全屏加载（带文案）、卡片骨架屏、列表骨架屏、按钮内 loading（spinner）
- **动画**：骨架屏 shimmer 效果

---

## 6. 图片策略

### 6.1 图片来源分层
| 场景 | 来源 | 说明 |
|------|------|------|
| 游记封面、景点配图 | 高德 POI 图片库（已有方案） | 第一阶段方案保持 |
| 首页 Banner、Onboarding、空状态插画 | 几何 SVG 插画（自绘） | 与品牌调性一致，零图片成本 |
| 产品演示图、内容占位 | Unsplash / Pexels（免费可商用） | 真实旅行摄影 |
| 用户上传 | 第二阶段接入（不在本期） | 后续加阿里云内容审核 |

### 6.2 图片处理规范
- **比例**：游记封面 4:3，景点配图 1:1，Banner 16:9，头像 1:1
- **圆角**：图片本身不加圆角，外层容器加 `--radius-lg`
- **占位**：图片加载时显示暖灰底 `--bg-tool` + 居中 spinner
- **错误态**：图片加载失败显示 SVG fallback（断图 icon + "图片加载失败"）

---

## 7. emoji 政策

### 7.1 政策分级
| 区域 | 政策 | 替代方案 |
|------|------|---------|
| **功能区**（导航、按钮、tab、菜单、状态指示） | **全删** | SVG icon |
| **数据区**（数字、标签、徽章） | **全删** | SVG icon 或纯文字 |
| **用户内容区**（吐槽正文、游记正文、评论） | **保留** | 不干预 |
| **用户头像** | **保留** | 允许用户用 emoji 作头像 |
| **运营文案**（活动标题、Push 通知） | **允许少量** | 标题首字可带 1 个 emoji，正文不带 |

### 7.2 现有 emoji 清理范围
- 首页问候语 `👋` → 移除
- 头像默认 `🧳` → 移除，改为文字头像（用户名首字）
- 天气图标 `☀️` 等 → 保留（这是天气数据原生 emoji，属于内容）
- 快捷入口 `✨🗺️👥` → 全部换 SVG
- 所有按钮内 emoji → 全部移除

---

## 8. 验收标准（AC）

### AC-Brand-1：品牌名替换
- **Given**：用户打开 App 任意页面
- **When**：页面加载完成
- **Then**：所有原本显示"圆周"的位置显示"哇途"，包括标题栏、启动页、分享文案
- **Verification**：human-judgment

### AC-Brand-2：品牌色调统一
- **Given**：设计师或开发者查看 `css/variables.css`
- **When**：搜索色彩 token
- **Then**：能找到完整的品牌色、辅助色、中性色、状态色、新拟态阴影色定义，无散落在业务代码里的硬编码色值
- **Verification**：programmatic

### AC-Token-1：色彩 token 完整
- **Given**：`css/variables.css` 已更新
- **When**：检查 `:root` 选择器
- **Then**：包含第 4.2 节列出的全部色彩 token，命名与文档一致
- **Verification**：programmatic

### AC-Token-2：字体 token 完整
- **Given**：`css/variables.css` 已更新
- **When**：检查字体相关 token
- **Then**：包含字体族、字号阶梯（7 档）、字重（5 档）的完整定义
- **Verification**：programmatic

### AC-Token-3：间距 token 完整
- **Given**：`css/variables.css` 已更新
- **When**：检查间距 token
- **Then**：包含 7 档间距（4/8/12/16/24/32/48），全部基于 4px 栅格
- **Verification**：programmatic

### AC-Token-4：阴影 token 完整（含新拟态）
- **Given**：`css/variables.css` 已更新
- **When**：检查阴影 token
- **Then**：包含 3 档普通阴影 + 3 档新拟态阴影（凸起/内凹/按压），新拟态阴影引用 `--neu-shadow-dark` 与 `--neu-shadow-light`
- **Verification**：programmatic

### AC-Comp-1：按钮组件可用
- **Given**：开发者在 HTML 中使用 `.ui-btn`、`.ui-btn--primary`、`.ui-btn--ghost`、`.ui-btn--text`、`.ui-btn--danger` 类名
- **When**：页面渲染
- **Then**：按钮显示正确变体，hover/pressed/disabled 状态视觉反馈符合设计原则，主按钮使用品牌渐变
- **Verification**：human-judgment

### AC-Comp-2：卡片组件三种风格可切换
- **Given**：开发者使用 `.ui-card`、`.ui-card--tool`、`.ui-card--content`、`.ui-card--flat` 类名
- **When**：页面渲染
- **Then**：工具卡显示新拟态内凹效果，内容卡显示扁平 + 阴影，过渡卡显示极浅阴影，三者底色分别使用 `--bg-tool` / `--bg-content` / `--card-bg`
- **Verification**：human-judgment

### AC-Comp-3：输入框组件状态完整
- **Given**：开发者使用 `.ui-input` 类名
- **When**：用户与输入框交互（focus、输入错误内容、blur）
- **Then**：默认态显示新拟态内凹，focus 态显示品牌色描边，error 态显示红色描边 + 错误文案
- **Verification**：human-judgment

### AC-Comp-4：Toast 提示四种类型
- **Given**：开发者调用 `UiKit.toast(message, type)` 方法，type 为 success / warning / error / info
- **When**：方法被调用
- **Then**：Toast 从屏幕顶部滑入，显示对应类型 icon 和配色，2 秒后（error 为 3 秒）淡出消失
- **Verification**：human-judgment

### AC-Comp-5：标签组件四种变体
- **Given**：开发者使用 `.ui-tag`、`.ui-tag--solid`、`.ui-tag--outline`、`.ui-tag--neu`、`.ui-tag--pill` 类名
- **When**：页面渲染
- **Then**：实心标签使用品牌色填充，描边标签显示边框，新拟态标签显示双向阴影，胶囊标签为圆角 999px
- **Verification**：human-judgment

### AC-Comp-6：头像组件支持多种类型
- **Given**：开发者使用 `.ui-avatar` 类名，配合 `data-type="image|emoji|text|icon"`
- **When**：页面渲染
- **Then**：图片头像显示图片，emoji 头像显示 emoji 居中，文字头像显示首字居中，icon 头像显示默认 SVG 占位
- **Verification**：human-judgment

### AC-Comp-7：空状态组件包含 SVG 插画
- **Given**：开发者使用 `.ui-empty` 类名，传入 `data-scene="no-trip|no-network|no-result|no-checkin"`
- **When**：页面渲染
- **Then**：显示对应场景的几何 SVG 插画 + 标题 + 描述，可选 CTA 按钮
- **Verification**：human-judgment

### AC-Comp-8：加载态组件三种形态
- **Given**：开发者使用 `.ui-loading`、`.ui-skeleton--card`、`.ui-skeleton--list`、`.ui-btn--loading` 类名
- **When**：页面渲染
- **Then**：全屏 loading 显示 spinner + 文案，骨架屏显示 shimmer 动画，按钮 loading 显示内嵌 spinner 并禁用点击
- **Verification**：human-judgment

### AC-Emoji-1：功能区 emoji 清零
- **Given**：用户浏览 App 所有页面
- **When**：检查导航、按钮、tab、菜单、状态指示等功能区
- **Then**：不出现任何 emoji，所有 icon 均为 SVG
- **Verification**：human-judgment

### AC-Emoji-2：用户内容区 emoji 保留
- **Given**：用户在吐槽、游记正文、评论中输入 emoji
- **When**：内容发布并展示
- **Then**：emoji 正常显示，不被过滤或替换
- **Verification**：human-judgment

### AC-Img-1：图片占位与错误态
- **Given**：图片正在加载或加载失败
- **When**：用户查看图片位置
- **Then**：加载中显示暖灰底 + spinner；加载失败显示 SVG fallback（断图 icon + "图片加载失败"文案）
- **Verification**：human-judgment

### AC-Doc-1：设计系统文档完整
- **Given**：开发者或设计师打开 `specs/design-system/` 目录
- **When**：查看文档
- **Then**：能找到完整的色彩色卡（含色值、用途、示例）、字体阶梯示例、间距示意、组件 HTML 示例代码
- **Verification**：human-judgment

### AC-Doc-2：Token 与文档一致
- **Given**：`css/variables.css` 与 `specs/design-system/spec.md` 同时存在
- **When**：比对两者的 token 命名与值
- **Then**：命名 100% 一致，色值 100% 一致，无文档写了但代码没实现、或代码实现了但文档没记录的情况
- **Verification**：programmatic

---

## 9. 非目标（Out of Scope）

- **不改造业务页面**：本期只产出 token + 基础组件，具体页面（首页/行程/社区/我的）的视觉重构放到 Phase 2
- **不做信息架构调整**：导航结构、页面归属的调整放到 Phase 2
- **不做 logo 设计**：品牌名锁定为"哇途"，但 logo 视觉设计不在本期范围
- **不做组件 HTML 物理模板**：只产出 CSS 类名，不产出可复用的 HTML 模板文件（那是 C 级方案）
- **不做视觉示例页**：不产出 `design-system-preview.html`（那是 C 级方案）
- **不接入用户上传图片**：图片上传与审核是社区化升级的独立模块
- **不做暗色模式**：本期仅亮色模式，暗色模式留待后续

---

## 10. 约束与假设

### 约束
- 必须基于现有 `css/variables.css` 增量更新，不推倒重来
- 必须保持纯原生 HTML/CSS/JS 架构，不引入 CSS 框架（如 Tailwind）
- 必须保留现有新拟态风格的视觉资产（底部导航、tab 等），不破坏现有交互
- 品牌橙色 `#FF8A3D` 必须保留，作为品牌连续性
- 所有 token 必须用 CSS 自定义属性（`--xxx`），不用预处理器变量

### 假设
- 现有 `css/ui-kit.css` 已存在部分组件样式，本期在其基础上扩展
- 现有 `js/ui-kit.js` 中 `UiKit` 全局对象已存在，Toast 等方法已实现，本期只调整样式不动 JS 逻辑
- 后续 Phase 2 改造业务页面时，会优先使用本期产出的 token 与组件

---

## 11. 待解决问题（Open Questions）

- [ ] 品牌名"哇途"是否需要英文名搭配（如 WATU / WaTu）用于国际化场景？
- [ ] 新拟态阴影在低端 Android 设备上的渲染性能是否可接受？
- [ ] 骨架屏 shimmer 动画是否需要支持 `prefers-reduced-motion` 无障碍设置？

---

## 12. 后续步骤

完成本期后进入 **Phase 2：逐页应用设计系统 + 信息架构重构**，按以下顺序：

1. 首页（homePage）—— 视觉重构 + 信息架构调整
2. 行程页（trips）—— 视觉重构 + 工具区新拟态统一
3. 社区页（community）—— 视觉重构 + 内容区扁平化
4. 我的页（profile）—— 视觉重构 + 等级徽章体系统一

每个页面走一遍功能级工作流（需求澄清 → 技术方案 → 任务规划 → 编码实现）。

---

> 下一步：进入技术方案设计（SpecForge Skill 9 - feature-tech-design）
