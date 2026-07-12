# 手动规划热门景点选择页 - Implementation Plan

## [ ] Task 1: 手动规划页HTML结构搭建
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 [index.html](file:///C:/Users/Administrator/Desktop/trip/index.html) 中添加 `manualPlanPage` 页面结构（参考templatePreviewPage的页面模式）
  - 页面包含：
    - 导航栏：返回按钮 + 标题"选择景点" + 城市名
    - 社区推荐区（section）：标题"🔥 热门行程方案" + 横向滚动的模板卡片列表
    - 筛选栏（filter-chips）：横向滚动的分类标签（全部/🏛️必游/🍜美食/📸拍照/🌿自然/✨小众）
    - 景点列表区：垂直滚动的景点卡片列表
    - 底部固定操作栏：已选计数 + "生成行程"按钮（默认置灰）
  - 每个社区模板卡片：封面emoji(大)、标题、天数、作者头像+名字、采纳数（"X人套用"）、标签、"预览"按钮
  - 每个景点卡片：左侧emoji+名称+类型+地址+评分，右侧圆形checkbox
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-7
- **Test Requirements**:
  - `programmatic` TR-1.1: index.html中存在id="manualPlanPage"元素
  - `human-judgement` TR-1.2: 页面结构完整，各区域位置正确
  - `human-judgement` TR-1.3: 社区模板卡片信息布局清晰
  - `human-judgement` TR-1.4: 景点卡片含名称/类型/地址/评分/勾选框
- **Notes**: 给manualPlanPage加上class="page"，默认style="display:none;"

## [ ] Task 2: 页面CSS样式
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 [pages.css](file:///C:/Users/Administrator/Desktop/trip/css/pages.css) 末尾添加手动规划页样式：
    - `.manual-plan-page` 基础布局，使用与其他页面一致的背景色(#F5F5F7)
    - `.mp-nav-bar` 导航栏样式（复用现有nav-bar模式）
    - `.mp-community-section` 社区推荐区：padding、section标题样式
    - `.mp-tpl-scroll` 横向滚动容器，隐藏滚动条
    - `.mp-tpl-card` 社区模板卡片：白色圆角卡片，宽度约160px，内有cover emoji(48px)、title(2行)、meta信息（天数+采纳数）、preview小按钮
    - `.mp-tpl-empty` 无模板提示样式
    - `.mp-filter-bar` 筛选栏：横向滚动，padding 12px 16px，背景白色
    - `.mp-filter-chip` 筛选标签：圆角pill样式，选中时橙色背景白字
    - `.mp-spots-list` 景点列表容器，padding
    - `.mp-spot-card` 景点卡片：白色圆角，flex布局，左边信息右边checkbox
    - `.mp-spot-card.selected` 选中状态：橙色左边框或浅橙背景
    - `.mp-spot-emoji` emoji(32px)、`.mp-spot-info`、`.mp-spot-name`、`.mp-spot-meta`（类型标签+地址+评分星标）
    - `.mp-checkbox` 自定义圆形checkbox：未选时灰色边框，选中时橙色背景白色对勾
    - `.mp-bottom-bar` 底部固定栏：毛玻璃背景，左侧"已选N个景点"文字，右侧主按钮
    - `.mp-gen-btn` 生成行程按钮：置灰时#ccc，激活时橙色渐变
    - `.mp-loading` 骨架屏/loading样式
    - `.mp-empty` / `.mp-error` 空/错误状态样式
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-5, AC-7, AC-8
- **Test Requirements**:
  - `human-judgement` TR-2.1: 社区模板卡片横向滚动，样式美观
  - `human-judgement` TR-2.2: 景点卡片选中状态视觉明显（橙色左边框+浅橙背景）
  - `human-judgement` TR-2.3: 筛选标签选中状态清晰
  - `human-judgement` TR-2.4: 底部栏固定在底部，按钮置灰/激活状态明显
  - `human-judgement` TR-2.5: 375px宽度无横向溢出

## [ ] Task 3: ManualPlan模块JavaScript - 页面打开/关闭/社区模板渲染
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 创建新文件 [js/manual-plan.js](file:///C:/Users/Administrator/Desktop/trip/js/manual-plan.js)，实现ManualPlan模块对象：
    - 属性：city（当前城市）、selectedSpots（Set）、currentFilter（'all'）、communityTemplates（[]）、pois（[]）、isLoading（false）
    - `open(city)` 方法：
      - 显示manualPlanPage，记录city
      - 更新导航栏城市名
      - 调用loadCommunityTemplates(city)
      - 调用loadHotSpots(city, 'all')
      - 重置selectedSpots
    - `close()` 方法：隐藏manualPlanPage，返回上一页
    - `loadCommunityTemplates(city)`：
      - 调用AIMemory.getCommunityTemplates()
      - 过滤：template.city包含city 或 template.destination包含city（模糊匹配）
      - 按copies字段降序排列
      - 取前3条
      - 调用renderCommunityTemplates(templates)
    - `renderCommunityTemplates(templates)`：
      - 若templates为空，显示.mp-tpl-empty"暂无当地行程模板"
      - 否则渲染横向滚动卡片，每个卡片点击调用TemplatePreview.open(template.id)
      - 卡片上"预览"按钮也调用TemplatePreview.open，阻止冒泡
  - 在 [index.html](file:///C:/Users/Administrator/Desktop/trip/index.html) 添加manual-plan.js的script引用（在其他js之后）
  - 修改App.switchTab中的pageMap添加'manual-plan': 'manualPlanPage'
  - 修改App.manualPlan()方法：
    - 若this.destinations.length === 0，显示toast"请先输入目的地"
    - 否则调用ManualPlan.open(this.destinations[0])
    - pageStack记录当前页
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-10
- **Test Requirements**:
  - `programmatic` TR-3.1: ManualPlan.open(city)正确显示页面并设置标题
  - `programmatic` TR-3.2: 社区模板按city过滤+copies降序排列
  - `human-judgement` TR-3.3: 点击模板卡片打开TemplatePreview
  - `human-judgement` TR-3.4: 返回按钮返回输入页
  - `programmatic` TR-3.5: App.manualPlan()在无目的地时不跳转
- **Notes**: 城市匹配时做toLowerCase和trim处理，兼容"杭州市" vs "杭州"

## [ ] Task 4: 热门景点POI加载与渲染
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 在ManualPlan模块中添加：
    - `async loadHotSpots(city, filter)`：
      - 设置isLoading=true，渲染loading状态
      - 构建prefs参数：根据filter传入MapModule.searchCityPOIs
        - 'all' → []
        - 'classic' → ['history']
        - 'food' → ['food']
        - 'photo' → ['photo']
        - 'nature' → ['nature']
        - 'niche' → ['niche']
      - 调用await MapModule.searchCityPOIs(city, prefs)
      - 若失败，显示错误状态+重试按钮
      - 结果赋值this.pois，调用renderSpotsList()
    - `renderSpotsList()`：
      - 遍历this.pois，渲染景点卡片
      - 每个卡片：根据POI type匹配emoji（用_getSpotEmoji逻辑或内建映射）
      - 类型标签用_getTypeName转换
      - 评分显示：有rating时显示"⭐ X.X"
      - checkbox根据selectedSpots判断是否选中
      - 卡片点击切换选中状态
    - `toggleSpot(poi)`：
      - 若poi.name在selectedSpots中则移除，否则添加
      - 更新对应卡片的selected class
      - 更新底部栏选中计数和按钮状态
    - `updateBottomBar()`：
      - 更新"已选N个景点"文字
      - N>0时生成按钮激活（移除disabled class，绑定onclick）
      - N=0时按钮置灰
  - 景点emoji映射规则（与现有_getSpotEmoji一致）：
    - 餐饮/美食 → 🍜
    - 酒店/住宿 → 🏨
    - 购物/商场/步行街 → 🛍️
    - 博物馆/展览馆 → 🏛️
    - 公园/自然/风景 → 🌿
    - 娱乐/游乐 → 🎢
    - 默认景点 → 📍
- **Acceptance Criteria Addressed**: AC-5, AC-6, AC-7, AC-8, AC-11
- **Test Requirements**:
  - `human-judgement` TR-4.1: 景点列表正确加载显示
  - `human-judgement` TR-4.2: 点击筛选标签切换分类，重新加载对应POI
  - `human-judgement` TR-4.3: 点击景点卡片切换选中，视觉反馈明显
  - `human-judgement` TR-4.4: 底部栏实时更新已选数量
  - `human-judgement` TR-4.5: 加载失败显示重试按钮，点击可重新加载
  - `programmatic` TR-4.6: pois按rating降序排列

## [ ] Task 5: 筛选栏交互
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 给筛选栏的.mp-filter-chip绑定点击事件：
    - 移除所有chip的active class
    - 给当前点击的chip加active class
    - 更新currentFilter为chip的data-filter值
    - 调用loadHotSpots(city, currentFilter)重新加载
  - 筛选切换时保留已选的selectedSpots（跨分类累加选择）
  - 切换筛选时列表滚动到顶部
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 点击筛选标签切换active状态
  - `human-judgement` TR-5.2: 切换后列表更新为对应分类
  - `human-judgement` TR-5.3: 已选景点在切换分类后仍然保持选中状态

## [ ] Task 6: 生成行程逻辑
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 在ManualPlan中实现 `generateTrip()` 方法：
    - 获取selectedSpots对应的POI对象数组（从this.pois和跨分类的选中记录中收集）
    - 若选中0个，return（按钮已置灰）
    - 构建trip对象：
      ```javascript
      const trip = {
        id: 'manual_' + Date.now(),
        title: this.city + '自由行',
        destination: this.city,
        city: this.city,
        days: 1,
        dayPlans: [{ day: 1, theme: '自由行', spots: [] }],
        createdAt: Date.now(),
        source: 'manual'
      };
      ```
    - 时间安排逻辑：
      - 起始时间 startMin = 540（9:00）
      - 每个景点默认duration = 90分钟
      - 交通间隙 gap = 30分钟
      - 遍历选中POI：
        ```javascript
        spots.forEach((poi, i) => {
          const spotStart = i === 0 ? startMin : prevEnd + gap;
          const spotEnd = spotStart + 90;
          trip.dayPlans[0].spots.push({
            name: poi.name, type: _getTypeName(poi.type) || '景点',
            emoji: _getSpotEmoji(poi.type), lng: poi.lng, lat: poi.lat,
            address: poi.address || '', rating: poi.rating || '',
            cost: '', duration: '1.5小时', startMin: spotStart, endMin: spotEnd,
            intro: poi.address || '', desc: poi.address || ''
          });
          prevEnd = spotEnd;
        });
        ```
      - 如果总时间超过23:00（1380分钟），自动拆分到Day 2及以后：
        - 计算每个景点endMin，超过1380的放到新的day，新day startMin重置为540
    - 调用AIMemory.saveTrip(trip)保存行程
    - 获取tripId
    - 关闭ManualPlan页面
    - 调用TripDetail.open(trip, tripId)进入行程详情
    - pageStack设置正确（让返回时回到trips页）
- **Acceptance Criteria Addressed**: AC-9, AC-12
- **Test Requirements**:
  - `programmatic` TR-6.1: 生成的trip对象结构正确（含dayPlans、spots）
  - `programmatic` TR-6.2: 时间从9:00开始，每个景点90分钟+30分钟间隙
  - `programmatic` TR-6.3: 景点超过1天容量时自动拆分到Day 2
  - `human-judgement` TR-6.4: 生成后跳转TripDetail页面，景点显示正确
  - `human-judgement` TR-6.5: 返回时不回到输入页（回到行程列表）
- **Notes**: _getSpotEmoji和_getTypeName函数可从trip-detail.js中复用或提取为公共函数，或在manual-plan.js中内联简化版

## [ ] Task 7: App路由集成与返回逻辑
- **Priority**: medium
- **Depends On**: Task 3, Task 6
- **Description**:
  - 在App.switchTab的pageMap中注册'manual-plan': 'manualPlanPage'
  - ManualPlan.close()中：
    - 若pageStack有上一页则goBack()，否则switchTab('plan')
  - 修改App.goBack()确保manual-plan页能正确返回
  - 生成行程后设置App.pageStack为['trips', 'trip-detail']（避免返回手动规划页）
  - 确保TemplatePreview从manual-plan打开时，关闭后返回manual-plan而非trips页
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `human-judgement` TR-7.1: 返回按钮从手动规划页回到输入页
  - `human-judgement` TR-7.2: 从手动规划页预览模板后关闭预览，回到手动规划页
  - `human-judgement` TR-7.3: 生成行程后返回，到行程列表页而非输入页

## [ ] Task 8: 加载态、空态、错误态处理 + 骨架屏
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 加载中：显示6个骨架卡片（灰色shimmer动画）
  - 加载失败：显示错误图标+"加载失败"+"点击重试"按钮，点击重新调用loadHotSpots
  - 搜索结果为空（某分类无POI）：显示"暂无相关景点"提示
  - 社区模板区无匹配：显示"暂无当地行程模板，试试热门景点吧"
  - 骨架屏CSS：添加shimmer动画
- **Acceptance Criteria Addressed**: AC-4, AC-11
- **Test Requirements**:
  - `human-judgement` TR-8.1: 加载时显示骨架屏
  - `human-judgement` TR-8.2: 空结果有友好提示
  - `human-judgement` TR-8.3: 错误态重试按钮有效
