# 长按优化与AI推荐三层架构重构 - The Implementation Plan

## [ ] Task 1: 优化长按删除逻辑（容差+移动追踪）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 pages.js 中 TripsModule.bindLongPress 方法
  - 添加 startX/startY 记录按压起始坐标
  - 在 touchmove/mousemove 事件中计算位移，使用 Math.hypot(dx, dy) 计算距离
  - 位移超过10px才触发cancelPress，容差内不取消
  - 改进长按视觉反馈：除了scale/opacity外，添加::after伪元素或内部元素显示🗑️图标（可选）
  - 保留震动反馈(navigator.vibrate(50))
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 记录起始坐标，移动<10px不取消定时器
  - `programmatic` TR-1.2: 移动>10px调用cancelPress清除定时器
  - `human-judgement` TR-1.3: 手指轻微抖动时长按不会中断，体验流畅
- **Notes**: mousemove事件需在mousedown后才监听，mouseup/mouseleave后移除，避免全局监听

## [ ] Task 2: 自定义删除确认弹窗
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 index.html 中添加一个隐藏的自定义模态框div（id=confirmModal），包含：
    - 半透明遮罩 confirm-overlay
    - 居中的弹窗卡片 confirm-box
    - 标题"删除行程"
    - 显示行程名称的文本
    - 两个按钮：取消(confirm-cancel)、删除(confirm-ok，红色/橙色渐变)
  - 添加CSS样式（在pages.css中），风格与应用一致：圆角16px、阴影、按钮渐变、动画
  - 在 pages.js 中实现 showConfirm(title, message) -> Promise<boolean> 函数
  - 修改 bindLongPress 中endPress逻辑：longPressTriggered时调用showConfirm而不是原生confirm
  - confirm-ok按钮resolve(true)，confirm-cancel和遮罩点击resolve(false)
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: showConfirm返回Promise，点删除resolve(true)，点取消resolve(false)
  - `programmatic` TR-2.2: 弹窗打开/关闭时display样式正确切换
  - `human-judgement` TR-2.3: 弹窗样式美观，与应用整体风格一致
  - `human-judgement` TR-2.4: 点击遮罩可关闭弹窗
- **Notes**: 模态框全局复用一次即可，不需要每个卡片单独创建

## [ ] Task 3: 在MapModule中新增searchNearbyPOIs周边搜索方法
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 map.js 中新增 async searchNearbyPOIs(centerLng, centerLat, category, radius=20000) 方法
  - 内部使用 this.placeSearch（已有实例）的 searchNearBy 方法
  - category到关键词映射：
    - food: '美食|餐厅|小吃|特色菜'（同时citylimit=false，搜索跨类型）
    - hotel: '酒店|宾馆|民宿'
    - scenic: '景点|风景区|名胜古迹|博物馆'
    - experience: '茶馆|相声|非遗|市集|体验馆|艺术馆|咖啡馆'
  - 设置pageSize=25, extensions='all'
  - 搜索回调中：
    - 遍历pois，过滤掉没有location的
    - 对每个poi使用_calcDistance计算与中心点的距离(km)
    - 过滤掉 distance > 20km 的POI（硬约束）
    - 去重：seenNames Set，同名保留最近的
    - 评分归一化：biz_ext.rating
    - 排序：food/hotel/experience按 (rating*3 - distance*0.3) 综合排序，scenic按距离升序
    - 取Top5
  - 返回结构化数组：[{name, address, lng, lat, distance(km,1位小数), rating, cost, tel, type}]
  - 结果加入geocodeCache缓存
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 返回结果每个POI的distance <= 20
  - `programmatic` TR-3.2: 返回结果数量<=5
  - `programmatic` TR-3.3: 结果按排序规则正确排序
  - `programmatic` TR-3.4: 搜索异常时resolve空数组不抛异常
- **Notes**: searchNearBy是AMap.PlaceSearch的原生方法，签名：searchNearBy(keyword, center, radius, callback)，center可以是[lng,lat]数组

## [ ] Task 4: 新增AIChat._getReferencePoint获取参考中心点
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 ai-chat.js 中新增 _getReferencePoint() async方法
  - 逻辑：
    1. 获取 this.currentTrip.dayPlans[this.currentDay]?.spots || []
    2. 从后往前遍历，找到第一个有 lng 和 lat（且为有效数字）的spot
    3. 如果找到：返回 { lng: spot.lng, lat: spot.lat, name: spot.name, source: 'spot' }
    4. 如果没找到：回退到城市中心
       - 取 city = this.currentTrip.destination || dayPlans[0].city
       - 调用 MapModule.getCityCenter(city) 获取城市中心
       - 返回 { lng, lat, name: city, source: 'city' }
    5. 如果都失败：返回null
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 当天有坐标景点时返回最后一个有坐标景点的坐标
  - `programmatic` TR-4.2: 当天无坐标景点时返回城市中心坐标
  - `programmatic` TR-4.3: 无城市信息时返回null不报错

## [ ] Task 5: 重构handleQuickAction为三层流程
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Description**: 
  - 修改 ai-chat.js 的 handleQuickAction 方法
  - 将 action 分为两类：
    - "附近推荐类"：food/hotel/experience 走三层流程
    - "其他类"：optimize/tips/filltime 走原有纯AI流程（filltime可改为附近推荐景点填充）
  - 三层流程实现：
    1. appendUserMessage显示用户消息（如"帮我推荐附近的美食"）
    2. 显示loading提示"正在搜索附近{type}..."
    3. const ref = await this._getReferencePoint()
    4. if (!ref) 降级：显示提示"需要先添加行程或设置目的地才能搜索附近"
    5. const categoryMap = {food:'food', hotel:'hotel', experience:'experience'}; 
       const pois = await MapModule.searchNearbyPOIs(ref.lng, ref.lat, categoryMap[action], 20000)
    6. if (pois.length === 0) 降级：显示"附近20km内未找到合适的{类型}"
    7. 构建POI列表文本：pois.map((p,i)=>`${i+1}. ${p.name}(距离${p.distance}km, 地址:${p.address}${p.rating?', 评分:'+p.rating:''})`).join('\n')
    8. 构建三层prompt，包含：用户原始意图、参考点位置、POI候选列表（严格约束：只能使用这些POI，不得新增、改名、编造坐标）
    9. 调用 AIService.chat，temperature设为0.3
    10. 解析AI返回：textReply是推荐语，recommendations需要与代码层pois合并（以pois数据为准填充lng/lat/address/distance，reason/emoji/estimatedCost用AI返回的）
    11. appendAIMessage展示，推荐卡片显示距离标签
  - 确保appendAIMessage的推荐卡片能正确显示距离（在ai-rec-meta中增加" · 距离Xkm"）
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: 三层流程中AI被传入真实POI列表
  - `programmatic` TR-5.2: 最终recommendations的lng/lat来自MapModule返回的pois，不是AI编造的
  - `programmatic` TR-5.3: POI为空时显示降级提示
  - `human-judgement` TR-5.4: 推荐结果都是真实存在的地点，距离准确
  - `human-judgement` TR-5.5: 推荐卡片显示距离信息
- **Notes**: AI返回的recommendations顺序可能与pois不同，需要通过name匹配；如果AI返回的name不在pois中，丢弃该条（硬过滤）

## [ ] Task 6: 更新AI系统提示词支持三层润色约束
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 修改 ai-service.js 的 DEFAULT_SYSTEM_PROMPT
  - 增加说明：当收到候选POI列表时，严格只使用列表中的地点，不得虚构；recommendations数组必须包含所有提供的候选地点，name必须完全匹配
  - temperature在三层流程调用时设为0.3（在handleQuickAction中传参）
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-6.1: prompt包含"禁止新增/虚构景点"的约束
  - `programmatic` TR-6.2: 三层流程调用时AIService.chat传入temperature:0.3

## [ ] Task 7: appendAIMessage推荐卡片显示距离
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 修改 ai-chat.js 的 appendAIMessage 方法中ai-rec-card的渲染
  - 如果rec有distance字段，在ai-rec-meta中显示" · 📍{distance}km"
  - 推荐卡片添加数据后，_addRecommendation中点击添加按钮时，rec的lng/lat/address直接从pois数据带入（已经在Task5合并过）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-7.1: 推荐卡片显示距离信息
  - `programmatic` TR-7.2: distance存在时才显示，不存在不显示（兼容普通AI推荐）
