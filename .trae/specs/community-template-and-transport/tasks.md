# 社区参考旅程预览 & 出行方式提示 - The Implementation Plan

## [x] Task 1: 增强种子模板数据，补充完整dayPlans
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 [ai-memory.js](file:///C:/Users/Administrator/Desktop/trip/js/ai-memory.js) 中的 `getSeedCommunityTemplates()` 方法
  - 为6个种子模板（杭州、上海、成都、厦门、北京、西安）各补充完整的 dayPlans 数据
  - 每个dayPlan包含：day序号、theme主题、spots数组
  - 每个spot包含：name名称、address地址、emoji图标、type类型、duration建议时长（分钟）、startMin/endMin时间安排、intro简介
  - 为每个模板补充city字段
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-1.1: 调用AIMemory.getSeedCommunityTemplates()返回的每个模板对象都包含dayPlans数组 ✅
  - `programmatic` TR-1.2: 每个dayPlan包含day(number)、theme(string)、spots(array) ✅
  - `programmatic` TR-1.3: 每个spot包含name、address、emoji、duration字段 ✅
  - `programmatic` TR-1.4: dayPlans.length与模板的days字段一致 ✅
- **Notes**: 景点数据应基于真实景点和合理路线，时间安排从上午9点到晚上9点

## [x] Task 2: 集成高德骑行路径规划API
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 [index.html](file:///C:/Users/Administrator/Desktop/trip/index.html) 中的高德SDK加载script标签，在plugin参数中增加 `AMap.Riding`
  - 修改 [map.js](file:///C:/Users/Administrator/Desktop/trip/js/map.js)：
    - 在init()中初始化riding服务实例（AMap.Riding）
    - 新增通用方法 `calcRoute(from, to, mode)` 支持mode为driving/walking/riding
    - 骑行mode使用AMap.Riding服务，接口模式与driving/walking一致
    - 返回统一格式 {success, distance(米), time(秒), path(坐标数组)}
    - 保留原drawRouteBetween但改造为调用calcRoute
    - 新增估算方法 `estimateRoute(distKm, mode)` 作为API失败时的降级：步行~5km/h、骑行~15km/h、驾车~35km/h(市区)、公交~18km/h
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-2.1: MapModule初始化后this.riding不为null ✅
  - `programmatic` TR-2.2: 调用calcRoute传入两个坐标点和mode='riding'，返回对象包含distance>0和time>0 ✅
  - `programmatic` TR-2.3: 骑行2km距离返回的time约为480秒左右（8分钟），误差在合理范围 ✅
  - `programmatic` TR-2.4: estimateRoute方法能为每种交通模式返回合理的估算时间 ✅
- **Notes**: 高德Riding插件的search回调与Driving/Walking类似（status, result），result.routes[0]包含distance和time

## [x] Task 3: 添加预览页HTML结构和CSS样式
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 [index.html](file:///C:/Users/Administrator/Desktop/trip/index.html) 中添加预览页DOM结构（id="templatePreviewPage"）
  - 预览页结构参考tripDetailPage但简化：
    - 顶部导航栏（返回按钮、标题、分享/收藏占位）
    - 封面区域（大emoji/渐变色背景、标题、作者信息、标签、统计数据）
    - 列表/地图模式切换按钮（复用浮动FAB按钮样式）
    - 列表模式容器（previewListMode）- 包含day pills和itinerary内容
    - 地图模式容器（previewMapMode）- 包含地图div、day pills、toolbar
    - 底部固定操作栏：返回按钮 + "套用此行程"主按钮
  - 在CSS文件中添加预览页样式：
    - 修改 [pages.css](file:///C:/Users/Administrator/Desktop/trip/css/pages.css) 添加预览页相关样式
    - 预览页为只读状态，卡片样式与trip-detail一致但去除编辑交互样式
    - 封面hero区域设计要美观
    - 底部操作栏fixed定位
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-3.1: 预览页HTML结构完整，包含封面、列表、地图、底部按钮区域 ✅
  - `human-judgement` TR-3.2: 预览页样式与app整体风格一致，使用品牌橙色系 ✅
  - `programmatic` TR-3.3: index.html中存在id="templatePreviewPage"元素 ✅
- **Notes**: 可复用trip-detail-page的大部分CSS类名，新增preview-前缀的修饰类

## [x] Task 4: 添加出行提示卡片组件HTML/CSS
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 [index.html](file:///C:/Users/Administrator/Desktop/trip/index.html) 中不需要新增DOM（由JS动态渲染）
  - 在 [pages.css](file:///C:/Users/Administrator/Desktop/trip/css/pages.css) 添加出行提示卡片样式：
    - `.transport-hint` 卡片：位于两个timeline-item之间
    - 紧凑横条设计：左侧出行方式emoji+文字（如"🚶 步行"），中间距离和时间（如"1.2km · 15分钟"），右侧可点击切换的方式选择器
    - 出行方式切换为小胶囊按钮组：步行🚶/骑行🚴/驾车🚗/公交🚌
    - 选中状态使用品牌色高亮
    - 只读模式下（预览页）不显示切换按钮，仅显示推荐方式
    - 卡片应有微妙的连接线与上下景点轴线衔接
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 出行提示卡片视觉上位于两个景点之间，不突兀 ✅
  - `human-judgement` TR-4.2: 出行方式胶囊按钮选中状态明显 ✅
  - `human-judgement` TR-4.3: 只读模式下切换按钮不显示 ✅
- **Notes**: 卡片高度约32-40px，足够紧凑不占太多空间

## [x] Task 5: 实现预览页JavaScript逻辑（列表渲染+地图渲染）
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - 创建新文件 [js/template-preview.js](file:///C:/Users/Administrator/Desktop/trip/js/template-preview.js)
  - 实现TemplatePreview模块：
    - `open(templateId)`: 打开预览页，加载模板数据，渲染列表模式
    - `close()`: 关闭预览页返回社区页
    - `renderList()`: 渲染列表模式的行程时间轴（只读）
    - `switchToMap()`: 切换到地图模式
    - `switchToList()`: 切换回列表模式
    - `renderMap()`: 渲染地图模式，初始化地图、添加标记、绘制路线
    - `applyTemplate()`: 套用行程
  - 修改 [app.js](file:///C:/Users/Administrator/Desktop/trip/js/app.js)：
    - 将App.useTemplate()方法改为调用TemplatePreview.open()
    - 添加预览页的路由/导航逻辑
    - 在script标签加载中添加template-preview.js
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: 点击社区卡片调用TemplatePreview.open()，预览页显示 ✅
  - `human-judgement` TR-5.2: 列表模式正确显示每日行程，景点信息完整 ✅
  - `human-judgement` TR-5.3: 点击地图模式按钮切换到地图视图，显示景点标记和路线 ✅
  - `programmatic` TR-5.4: 点击"套用此行程"后，AIMemory.getAllTrips()中新增一条行程数据 ✅
  - `programmatic` TR-5.5: 套用后跳转到行程详情页(tripDetailPage)，该行程可编辑 ✅
- **Notes**: 地理编码过程应异步进行，列表先显示（无坐标），坐标回来后再更新地图和路线

## [x] Task 6: 在行程详情页渲染出行提示卡片+方式切换逻辑
- **Priority**: high
- **Depends On**: Task 2, Task 4
- **Description**:
  - 修改 [js/trip-detail.js](file:///C:/Users/Administrator/Desktop/trip/js/trip-detail.js) 中的renderItinerary()方法：
    - 在相邻两个spot的timeline-item之间插入transport-hint卡片HTML
    - 可编辑模式下显示出行方式切换胶囊按钮
  - 添加switchTransport/formatTransportDisplay/renderTransportHint等方法
  - 添加_ensureTransportDefaults和_recalcAllTransport方法
  - transport数据持久化保存
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-6.1: 行程详情页中相邻景点之间显示出行提示卡片 ✅
  - `programmatic` TR-6.2: 点击骑行按钮后，该段的transportMode更新为riding ✅
  - `programmatic` TR-6.3: 切换出行方式后距离和时间数据更新并显示 ✅
  - `programmatic` TR-6.4: 出行方式选择被保存 ✅
  - `human-judgement` TR-6.5: 出行提示卡片视觉设计美观 ✅
- **Notes**: calcRoute需要两个点都有经纬度坐标，如果缺失则先用估算值

## [x] Task 7: 完善地图模式下的路线绘制（使用用户选择的交通方式）
- **Priority**: medium
- **Depends On**: Task 5, Task 6
- **Description**:
  - drawDayRoute已支持使用spot中存储的transportMode绘制路线
  - 切换交通方式后切换到地图会重新绘制对应路线
- **Acceptance Criteria Addressed**: AC-3, AC-6
- **Test Requirements**:
  - `programmatic` TR-7.2: 地图路线使用用户选择的交通方式绘制 ✅
- **Notes**: 路线颜色根据交通方式微调为优化项，核心功能已实现

## [x] Task 8: 端到端测试与视觉打磨
- **Priority**: medium
- **Depends On**: Task 1-7
- **Description**:
  - 在浏览器中完整测试用户流程
  - 修复了trip-detail返回preview页的路由bug
  - 验证了所有核心功能正常工作
- **Acceptance Criteria Addressed**: AC-1 through AC-8
- **Test Requirements**:
  - `human-judgement` TR-8.1: 完整用户流程无阻断性bug ✅
  - `human-judgement` TR-8.2: 视觉效果与app整体风格一致 ✅
  - `programmatic` TR-8.3: 控制台无应用级JavaScript错误 ✅
  - `human-judgement` TR-8.4: 出行方式切换响应流畅 ✅
- **Notes**: 在http://localhost:8081测试通过
