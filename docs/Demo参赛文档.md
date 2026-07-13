# 哇途 · AI 旅行规划 —— Demo 参赛文档

> 一句话定义：哇途是一款面向自由行用户的移动端 AI 旅行规划与社区分享 App，集「AI 智能规划 + 行程管理 + 社区灵感 + PDF 导出于一体」。

---

## 1. Demo 简介

### 是什么

**哇途（Wow Journey）** 是一款基于 Web 技术栈实现的移动端旅行规划 App。它通过自然语言输入（如“周末去杭州玩 2 天”）或手动选择景点，结合高德真实 POI 数据，由 AI 生成可执行的每日行程；同时提供社区模板、游记、POI 打卡、记账、行李清单和 PDF 导出等完整旅行工具链。

### 面向谁

- **核心用户**：18-35 岁的自由行旅行者、周末短途游用户、旅行内容创作者。
- **典型场景**：
  - 周末想去周边城市，不知道去哪、怎么安排；
  - 做攻略太繁琐，希望 AI 一键生成并支持人工微调；
  - 旅行结束后想把照片、游记、行程整理成 PDF 留念或分享。

### 主要功能

- 功能 - 说明 - 解决的痛点 -
-------------
- **AI 智能规划** - 输入自然语言或选择偏好，AI 基于高德真实 POI 生成每日行程 - 做攻略耗时、信息过载 -
- **行程管理** - 支持标签分类、卡片折叠展开、列表/地图双模式、拖拽排序、时间编辑 - 行程一多就乱，找起来困难 -
- **社区灵感** - 小红书式双列瀑布流，浏览他人行程模板和游记 - 缺乏真实可参考的路线 -
- **AI 旅行助手** - 一键找美食、推荐酒店、优化路线、避坑提醒，推荐结果可勾选批量添加 - AI 直接改行程无法撤销、不透明 -
- **POI 打卡 & 游记** - 基于地图定位打卡，手写风游记编辑器记录想法 - 旅行记忆分散，难以沉淀 -
- **PDF 导出** - A4 分页预览 + 富文本排版 + 图片备注，支持多行程合并导出 - 旅行回忆无法美观地保存/打印 -

### 产品界面展示

> 以下为项目实际运行界面示意，可在本地启动 `python -m http.server 8765` 后访问 `http://127.0.0.1:8765/` 查看并截图替换。

#### 图 1：首页 —— 一站式旅行入口

![首页界面](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Mobile%20app%20home%20screen%20for%20a%20travel%20planner%20called%20Wow%20Journey%2C%20warm%20gray%20background%20%23ECE9E5%2C%20white%20cards%2C%20orange%20brand%20color%20%23FF8A3D%2C%20showing%20travel%20stats%2C%20current%20trip%20widget%2C%20weather%20widget%2C%20quick%20action%20grid%20for%20AI%20plan%2C%20my%20trips%2C%20community%2C%20expense%2C%20clean%20minimal%20Chinese%20UI%2C%20iPhone%20mockup&image_size=portrait_16_9)

- 顶部问候语 + 头像
- 旅行统计卡：行程 / 城市 / 天数 / 景点
- 我的行程组件 + 旅行记忆组件 + 天气组件
- 快捷入口：AI 规划、我的行程、发现社区、旅行记账

#### 图 2：我的行程 —— 标签 + 折叠，高效管理多行程

![我的行程界面](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Mobile%20app%20my%20trips%20screen%2C%20warm%20gray%20background%2C%20horizontal%20scrollable%20tag%20bar%20with%20All%2C%20Photography%2C%20Family%20tags%20in%20orange%20and%20pastel%20colors%2C%20collapsible%20trip%20cards%20with%20gradient%20covers%2C%20city%20badges%2C%20day%20spots%20preview%20when%20expanded%2C%20clean%20Chinese%20travel%20app%20UI%2C%20iPhone%20mockup&image_size=portrait_16_9)

- 顶部标签栏：可按「全部 / 拍照 / 亲子」等标签筛选
- 行程卡片默认折叠，点击展开显示每日景点、时间、打卡进度
- 长按卡片触发删除，带振动反馈和透明度缩放动画

#### 图 3：社区发现 —— 小红书式瀑布流

![社区界面](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Mobile%20app%20community%20discovery%20screen%20like%20Xiaohongshu%2C%20two-column%20masonry%20waterfall%20layout%2C%20portrait%20travel%20photos%20with%20rounded%20corners%2C%20small%20title%20and%20author%20avatar%20below%20each%20card%2C%20category%20tabs%20at%20top%20Recommend%2C%20Food%2C%20Nature%2C%20Photo%2C%20warm%20white%20background%2C%20clean%20Chinese%20UI%2C%20iPhone%20mockup&image_size=portrait_16_9)

- 双列瀑布流，卡片比例参考小红书（竖图为主）
- 支持分类筛选：推荐、美食、自然、拍照、CityWalk、小众、亲子
- 可对模板点赞、收藏、一键复用为自己的行程

#### 图 4：AI 旅行助手 —— 推荐可勾选、优化可对比

![AI助手界面](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Mobile%20app%20AI%20chat%20assistant%20for%20travel%2C%20chat%20bubbles%20with%20recommendation%20cards%20showing%20restaurants%20and%20hotels%2C%20checkboxes%20for%20batch%20selection%2C%20quick%20chips%20at%20bottom%20for%20nearby%20food%2C%20hotel%2C%20route%20optimization%2C%20tips%2C%20orange%20brand%20accent%2C%20Chinese%20UI%2C%20iPhone%20mockup&image_size=portrait_16_9)

- 点击悬浮按钮直接进入 AI 聊天（无中间弹窗）
- 快捷按钮：找附近美食、推荐酒店、优化路线、当地体验、填充时间、避坑提醒
- 推荐结果带勾选框，用户确认后才写入行程，支持 5 秒内撤销

#### 图 5：PDF 预览编辑器 —— 旅行回忆可排版、可导出

![PDF预览界面](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Mobile%20app%20PDF%20preview%20editor%20for%20travel%20memories%2C%20A4%20page%20preview%20with%20rich%20text%20and%20photos%2C%20vertical%20scroll%20through%20pages%2C%20toolbar%20for%20adding%20photos%20and%20adjusting%20image%20size%2C%20warm%20white%20background%2C%20clean%20Chinese%20UI%2C%20iPhone%20mockup&image_size=portrait_16_9)

- A4 分页预览，支持上下滑动衔接浏览
- 可编辑文字、添加图片备注、调节图片大小
- 一键导出 PDF，支持多行程合并

---

## 2. Demo 创作思路

### 灵感来源

这个项目最初源于我自己做短途旅行攻略时的真实困扰：打开小红书找灵感，打开高德查地点，打开备忘录列行程，切换多个 App 非常割裂。后来看到很多旅行 App 把 AI 作为噱头放在首页，但 AI 生成的行程却直接修改用户数据、无法撤销，体验很差。于是我想做一款**把 AI 定位为“助理”而非“主导”**的旅行工具，让系统负责硬规则（距离、排序、时间），让 AI 负责内容润色，同时用社区和 PDF 导出把“规划—执行—回忆”串起来。

### 想解决的问题

- 痛点 - 哇途的解决方案 -
---------
- 做攻略信息分散，耗时久 - 自然语言一句话生成行程，AI 基于真实 POI 推荐 -
- 行程一多就乱，查找困难 - 标签分类 + 卡片折叠 + 列表/地图双模式 -
- AI 直接改行程，无法撤销 - 所有 AI 推荐先展示、用户勾选确认后才写入，支持撤销 -
- 旅行照片和想法分散 - 手写风游记编辑器 + 地图 POI 打卡，集中沉淀 -
- 旅行结束后没有好看的纪念册 - PDF 预览编辑器，可排版、加备注、导出打印 -

### 为什么做这个方向

1. **旅行是高频但低复购的场景**：用户不会天天旅行，但一次旅行会用到规划、记账、打卡、分享等多个工具，做一个 All-in-One 的工具比单点工具更有价值。
2. **AI 更适合做助理而非替代决策**：用户对自己的时间、预算、体力最清楚，AI 应该提供候选和解释，而不是直接安排。因此哇途设计了“勾选确认 + 对比弹窗 + 撤销”机制。
3. **社区能反哺规划**：用户生成的行程模板和游记，本身就是高质量的规划输入。小红书验证了“内容种草 + 工具落地”的模式，哇途把这套逻辑做进旅行场景。
4. **PDF 导出是闭环**：旅行结束后，把行程、照片、想法导出成册，既满足情感价值，也形成产品记忆点。

---

## 3. 核心功能巧思

### 3.1 社区：小红书式瀑布流 + 模板复用

- **卡片比例**：改为竖版双列瀑布流，图片占主导，标题和作者信息紧凑，视觉上更接近小红书的信息密度。
- **模板复用**：用户看到合适的行程模板，一键“复用”生成自己的行程，省去从头规划。
- **内容类型**：既有结构化行程模板，也有自由图文游记，满足不同创作习惯。

### 3.2 行程管理：标签 + 折叠，解决“多行程焦虑”

- **标签分类**：顶部横向滚动标签栏，一个行程只打一个标签（如“亲子”“拍照”），点击标签快速筛选。
- **标签管理页**：支持新建、重命名、删除标签，带回收站机制，防止误删。
- **卡片折叠**：默认折叠，只显示封面、目的地、标签和基础统计；点击展开才显示每日景点详情，长列表也不拥挤。
- **长按删除**：500ms 长按触发删除，带缩放透明动画和手机振动反馈。

### 3.3 AI 助手：从“自动修改”到“建议 + 确认”

- 旧的 AI 助手是快捷入口弹窗，点击后直接改行程，用户很反感。
- 改造后：点击悬浮按钮**直接进入 AI 聊天对话**，AI 推荐的结果以卡片形式展示，带 checkbox 让用户勾选。
- 路线优化提供“查看优化方案”按钮，弹窗展示对比，用户确认后才应用，并生成 undo 快照，5 秒内可撤销。

### 3.4 POI 打卡 & 游记：把旅行记忆留下来

- **地图打卡**：基于高德地图定位，支持现场 GPS 打卡和云端搜索打卡。
- **手写风游记编辑器**：支持调节字号、字重、行高、字体、颜色、段落缩进，支持图文混排，让记录更有“手账感”。
- **POI 话题 & 吐槽**：每个地点都有话题讨论区，用户可以发布真实体验、避坑提醒。

### 3.5 PDF 导出：从“数据”到“作品”

- 支持选择多个行程/记忆，按时间线合并。
- A4 分页预览，上下滑动浏览，避免翻页截断。
- 图片可调整大小、添加备注文字，行程数据自动排版。
- 一键导出为 PDF，可保存或打印。

---

## 4. TRAE 实践过程

### 4.1 开发流程

整个项目采用 **TRAE + 本地浏览器测试** 的迭代方式，主要流程如下：

1. **需求对齐**：先在 TRAE 中用文字描述需求，确认功能范围和技术方案。
2. **代码实现**：由 TRAE 读取项目文件、修改代码、新增模块。
3. **版本控制**：通过 `?v=` 缓存戳控制 JS/CSS 刷新，避免浏览器缓存旧代码。
4. **本地测试**：启动 `python -m http.server 8765`，在 TRAE 内置浏览器中访问验证。
5. **问题修复**：根据测试截图反馈，快速定位并修复问题。

### 4.2 关键开发步骤（附截图位置）

#### 步骤 1：用 TRAE 梳理需求并生成规划

> 截图位置：展示 TRAE 对话中需求讨论和任务拆分的界面。

- 输入产品需求后，TRAE 自动拆解为前端页面、数据存储、AI 接口调用等任务。
- 使用 TRAE 的搜索功能快速定位相关代码文件。

#### 步骤 2：TRAE 修改代码实现核心功能

> 截图位置：展示 TRAE 修改 `js/pages.js`、`js/trip-detail.js`、`js/ai-chat.js` 等关键文件的界面。

- 例：实现行程卡片折叠时，TRAE 在 `pages.js` 中新增 `TripsModule._expandedTrips` 集合和 `toggleCollapse()` 方法。
- 例：实现 AI 助手直进聊天时，TRAE 修改 `trip-detail.js` 第 382 行，将悬浮按钮从打开弹窗改为直接调用 `AIChat.open()`。

#### 步骤 3：本地启动并浏览器验证

> 截图位置：展示 TRAE 终端启动 `python -m http.server 8765` 和浏览器访问 `http://127.0.0.1:8765/` 的界面。

- 在 TRAE 终端启动本地服务器。
- 使用 TRAE 内置浏览器工具访问页面、点击元素、检查 DOM。

#### 步骤 4：根据测试结果迭代修复

> 截图位置：展示 TRAE 浏览器截图反馈问题、并修复后的对比。

- 例：社区卡片比例修改后，通过浏览器截图确认视觉上更接近小红书。
- 例：标签管理功能测试时，新建、编辑、筛选标签全程在浏览器中验证通过。

### 4.3 关键任务 Session ID

以下 Session ID 可用于证明本项目由 TRAE 开发完成：

- Session ID - 时间 - 关键任务 -
-------------
- `6a42c8526f186722aa6a1188` - 2026-07-01 - 修复 manual-plan.js 全局变量冲突、改进嵌入式组件、优化 AI 助手地图坐标和时间上限问题 -
- `6a456e6b062f84d3cb7cbfb3` - 2026-07-02 ~ 07-03 - 社区平台升级：Supabase 认证、行程模板发布、图文游记、积分等级特权系统 -
- `6a46ce583de5ed7971eac7fa` - 2026-07-03 ~ 07-13 - UI 设计系统落地、AI 助手直进聊天、PDF 预览编辑器、行程标签折叠管理、社区卡片小红书化、功能清单梳理 -

---

## 5. 技术栈

- 层级 - 技术 -
---------
- 前端 - HTML5 + CSS3 + 原生 JavaScript（无框架） -
- 地图 & POI - 高德地图 Web SDK 2.0 -
- 富文本编辑 - Quill 2.0.2 -
- PDF 导出 - jsPDF 2.5.2 + html2canvas 1.4.1 -
- 后端 & 数据库 - Supabase（PostgreSQL + Auth + Storage） -
- AI 模型 - 通义千问 / 兼容 OpenAI 接口的大模型服务 -
- 本地存储 - localStorage（主存储）+ Supabase（云同步） -

---

## 6. 总结

哇途的 Demo 核心亮点可以概括为三点：

1. **AI 是助理，不是老板**：所有 AI 建议都需用户确认，支持撤销，避免 AI 擅自修改行程。
2. **从规划到回忆的完整闭环**：AI 规划 → 行程管理 → 社区灵感 → POI 打卡 → 游记记录 → PDF 导出，覆盖一次旅行的完整生命周期。
3. **体验细节优先**：标签折叠、长按删除振动反馈、小红书式瀑布流、A4 滑动预览等，都是围绕“真实使用场景”打磨的交互。

---

*本 Demo 文档基于项目实际代码生成，可在 `c:\Users\20180\Desktop\trip\trip\docs\Demo参赛文档.md` 查阅。*
