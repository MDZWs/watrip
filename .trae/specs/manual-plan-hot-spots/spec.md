# 手动规划 - 热门景点选择 + 社区推荐页 - Product Requirement Document

## Overview
- **Summary**: 实现"手动规划"功能页。用户在输入目的地后点击"手动规划"，进入一个混合选择页，上方为按采纳数排序的社区行程模板（按城市过滤），下方为高德API实时搜索的热门景点列表（支持多选），用户勾选景点后可一键生成行程进入编辑。
- **Purpose**: 当前"手动规划"按钮仅显示toast占位提示，用户无法自由选择景点组合行程。手动规划满足用户"自己挑景点、参考别人行程"的自主规划需求，与AI智能规划形成互补。
- **Target Users**: 喜欢自己掌控行程细节、不想完全依赖AI生成的旅行者；想参考热门路线并微调的用户。

## Goals
- 用户点击"手动规划"后进入景点选择页，而非弹出toast
- 页面顶部显示该城市的社区行程模板（按copies采纳数降序），支持点击预览/套用
- 页面主体显示高德API搜索的热门景点POI列表，按评分排序，支持多选勾选
- 热门景点支持分类筛选（全部/必游景点/美食/拍照/小众等）
- 选中景点后底部显示"已选N个"确认栏，点击"生成行程"创建空白行程并将选中景点加入
- 生成行程后直接进入TripDetail页面，用户可自由拖拽调整顺序、添加/删除

## Non-Goals (Out of Scope)
- 不实现景点拖拽排序（在选择页不排序，生成后在TripDetail拖拽）
- 不实现实时路线距离计算（生成后在TripDetail已有transport hint功能）
- 不实现城市库本地存储（高德API实时搜索即可）
- 不实现多城市手动规划（首版支持单城市，与智能规划一致）
- 不在本页实现酒店/美食搜索（这些通过AI助手在TripDetail中完成）

## Background & Context
- 现有代码已有 `MapModule.searchCityPOIs(city, prefs)` 方法，使用AMap.PlaceSearch搜索城市POI，返回name/address/lng/lat/type/rating/cost字段
- 现有 `AIMemory.getCommunityTemplates()` 返回6个种子模板，每个有city、copies（采纳数）、tags、dayPlans字段
- 现有 `TemplatePreview.open(templateId)` 可预览社区模板，`TemplatePreview.applyTemplate()` 可套用
- 现有TripDetail.addSpotToTrip可将POI添加到行程
- 手动规划按钮在inputPage底部，用户输入目的地(destinations)后才出现

## Functional Requirements
- **FR-1**: 点击"手动规划"按钮时，若已有目的地，进入手动规划选择页（manualPlanPage）
- **FR-2**: 手动规划页顶部展示该城市的社区模板推荐区，按copies（采纳人数）降序排列，最多显示3条
- **FR-3**: 社区模板卡片展示：封面emoji、标题、天数、作者、采纳人数（copies）、标签，点击后打开TemplatePreview预览
- **FR-4**: 若无匹配城市的社区模板，社区推荐区隐藏，显示"暂无本地行程模板"提示
- **FR-5**: 热门景点区展示高德PlaceSearch搜索的POI列表，按rating评分降序排列，最多显示30个
- **FR-6**: 景点卡片展示：emoji（根据type自动匹配）、名称、类型标签、地址、评分、勾选checkbox
- **FR-7**: 景点分类筛选栏：横向滚动的标签按钮（全部/🏛️必游/🍜美食/📸拍照/🌿自然/✨小众），切换后重新搜索
- **FR-8**: 加载状态显示骨架屏或loading动画，搜索失败显示重试按钮
- **FR-9**: 用户可勾选多个景点，已勾选的景点卡片高亮显示
- **FR-10**: 底部固定操作栏显示已选数量和"生成行程"按钮，未选景点时按钮置灰
- **FR-11**: 点击"生成行程"后，创建新行程对象，将选中景点按默认顺序放入Day 1，保存到AIMemory，然后跳转到TripDetail页面
- **FR-12**: 生成行程时自动安排时间（从9:00开始，每个景点默认90分钟，景点间加交通间隙），保证时间逻辑合理
- **FR-13**: 导航栏有返回按钮可返回输入页

## Non-Functional Requirements
- **NFR-1**: 高德POI搜索应在2秒内返回结果（超时5秒显示失败）
- **NFR-2**: 页面在375px宽度手机上正常显示，无横向溢出
- **NFR-3**: 景点列表滚动流畅，勾选操作无延迟
- **NFR-4**: 社区模板过滤为纯前端操作，响应时间<100ms
- **NFR-5**: 选中状态使用localStorage不持久化（页面关闭后清除）

## Constraints
- **Technical**: 纯前端实现（无后端），使用现有高德Web JS API，localStorage存储
- **Business**: 种子模板仅6个（杭州/上海/成都/北京/西安/重庆），其他城市依赖高德搜索
- **Dependencies**: AMap.PlaceSearch API（已集成），AIMemory.getCommunityTemplates()（已存在），TemplatePreview（已存在）

## Assumptions
- 用户在点击"手动规划"前已经在inputPage输入了至少一个目的地（App.destinations有值）
- 高德PlaceSearch的citylimit:true能准确限定搜索范围
- 用户选择景点后会进入TripDetail再做详细调整（拖拽排序、修改时间等）
- 社区模板的city字段与用户输入的城市名能基本匹配（如"杭州"匹配"杭州"），做简单的包含匹配

## Acceptance Criteria

### AC-1: 进入手动规划页
- **Given**: 用户在输入页已输入城市（如"杭州"）
- **When**: 点击"手动规划"按钮
- **Then**: 页面切换到manualPlanPage，显示导航栏（含返回按钮）、社区推荐区、景点筛选栏、景点列表
- **Verification**: `human-judgment`

### AC-2: 社区模板按采纳数排序展示
- **Given**: 进入手动规划页，城市为"杭州"
- **When**: 页面加载
- **Then**: 社区推荐区显示city包含"杭州"的模板，按copies字段降序排列，最多3条，每条显示标题/天数/采纳数/封面
- **Verification**: `programmatic` + `human-judgment`

### AC-3: 社区模板点击预览
- **Given**: 社区模板列表已渲染
- **When**: 点击某个社区模板卡片
- **Then**: 打开TemplatePreview预览页，显示该模板的行程详情
- **Verification**: `human-judgment`

### AC-4: 无匹配社区模板时的降级
- **Given**: 用户输入的城市在种子模板中不存在（如"厦门"）
- **When**: 页面加载
- **Then**: 社区推荐区显示"暂无当地行程模板"提示，不显示空卡片
- **Verification**: `human-judgment`

### AC-5: 热门景点列表加载
- **Given**: 进入手动规划页
- **When**: 页面加载完成
- **Then**: 调用MapModule.searchCityPOIs获取该城市POI，列表显示景点名称/类型/emoji/地址/评分，按评分降序
- **Verification**: `programmatic` + `human-judgment`

### AC-6: 景点分类筛选
- **Given**: 景点列表已加载
- **When**: 点击筛选栏的"🍜美食"标签
- **Then**: 重新调用searchCityPOIs传入food偏好，结果更新为美食类POI
- **Verification**: `human-judgment`

### AC-7: 景点多选勾选
- **Given**: 景点列表已渲染
- **When**: 点击多个景点卡片的勾选框
- **Then**: 勾选的卡片高亮（橙色边框/背景），底部栏更新已选数量
- **Verification**: `human-judgment`

### AC-8: 生成行程按钮状态
- **Given**: 未选择任何景点
- **When**: 查看底部操作栏
- **Then**: "生成行程"按钮置灰不可点击；选择至少1个景点后，按钮变为可点击的橙色
- **Verification**: `human-judgment`

### AC-9: 生成行程并跳转
- **Given**: 已勾选3个景点
- **When**: 点击"生成行程"按钮
- **Then**: 创建新trip对象，3个景点按顺序放入dayPlans[0].spots，时间从9:00开始依次安排，保存到AIMemory，跳转到TripDetail页面显示该行程
- **Verification**: `programmatic` + `human-judgment`

### AC-10: 导航返回
- **Given**: 在手动规划页
- **When**: 点击左上角返回按钮
- **Then**: 返回输入页（inputPage），之前输入的目的地信息保留
- **Verification**: `human-judgment`

### AC-11: 加载失败处理
- **Given**: 高德API搜索失败（无网络等）
- **When**: 搜索超时或失败
- **Then**: 显示"加载失败，点击重试"提示，点击后重新搜索
- **Verification**: `human-judgment`

### AC-12: 时间自动安排合理
- **Given**: 勾选N个景点后生成行程
- **When**: 查看生成的dayPlans
- **Then**: 第一个景点startMin=540(9:00)，每个景点duration=90分钟，相邻景点间有30分钟交通间隙，最后一个景点endMin不超过1380(23:00)
- **Verification**: `programmatic`

## Open Questions
- [ ] 景点选中数量是否需要上限？（建议不限，超过1天容量时自动分多天）
- [ ] 社区模板是否需要"直接套用"快捷按钮（不进预览直接用）？（建议卡片上加"套用"小按钮）
