# UI优化与交互改进 - The Implementation Plan

## [x] Task 1: 控制AI浮动按钮按Tab显示/隐藏
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在trip-detail.js的switchTab方法中添加控制aiFabBtn显示/隐藏的逻辑
  - 当tab为'itinerary'时显示按钮，其他tab(expense/packing)隐藏按钮
  - 初始打开详情页默认在itinerary tab，按钮显示
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 调用switchTab('itinerary')后aiFabBtn的style.display应为'flex'（考虑aiEnabled开关）
  - `programmatic` TR-1.2: 调用switchTab('expense')后aiFabBtn应为隐藏
  - `programmatic` TR-1.3: 调用switchTab('packing')后aiFabBtn应为隐藏
  - `human-judgement` TR-1.4: 手动切换tab时按钮显示/隐藏平滑，无闪烁
- **Notes**: 需保留localStorage的aiSuggestEnabled开关判断

## [x] Task 2: 移除顶部导航栏AI按钮
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 从index.html中移除id为detailAiBtn的button元素
  - 从trip-detail.js的_bindEvents方法中移除对detailAiBtn的绑定和onclick处理
  - 清理CSS中相关样式（如有）
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 打开行程详情页，顶部导航栏只有返回按钮、标题、分享按钮，没有AI按钮
  - `programmatic` TR-2.2: 页面加载不报错，detailAiBtn为null时代码正常运行

## [x] Task 3: 行李面板默认空白并移除快捷模板
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改PackingModule.init方法：this.items初始化为trip.packingItems || []（空数组），不调用_buildFromTemplate
  - 从index.html中移除id为quickTplCard的整个quick-template-card区域
  - 清理相关事件绑定：移除packingSaveTplBtn的绑定（按钮已删除）
  - 保持"添加物品"浮动按钮不变
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 新行程（无packingItems）进入行李页，items数组长度应为0
  - `programmatic` TR-3.2: 页面不报错，getElementById找不到quickTplCard/packingTemplates时正常降级
  - `human-judgement` TR-3.3: 行李页顶部没有快捷模板卡片，直接显示进度和列表区域
  - `human-judgement` TR-3.4: 已有物品的老行程仍能正常显示物品（兼容旧数据）
- **Notes**: _renderTplBar已有if(!bar) return保护，需确保其他引用也做安全检查

## [x] Task 4: 为行程卡片添加长按删除功能
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改pages.js中的formatTripCard函数，为trip-card添加data-trip-id属性
  - 在TripsModule.renderTripCards渲染完成后，为每个卡片绑定长按事件
  - 实现长按检测逻辑：mousedown/touchstart启动500ms定时器，mouseup/mouseleave/touchend/touchmove清除定时器
  - 长按时添加视觉反馈类（如长按缩放效果）
  - 长按触发后标记，阻止后续click事件
  - 弹出确认对话框（使用confirm或自定义模态），确认后调用AIMemory.deleteTrip(id)
  - 删除后重新调用this.renderTripCards()刷新列表
  - 添加CSS长按反馈样式
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 长按卡片500ms后应触发删除确认
  - `programmatic` TR-4.2: 点击（短按）不触发删除，正常跳转详情页
  - `programmatic` TR-4.3: 确认删除后AIMemory中对应trip被移除，列表重新渲染
  - `programmatic` TR-4.4: 取消删除不改变行程列表
  - `human-judgement` TR-4.5: 长按时有视觉反馈（轻微震动/缩放）
  - `human-judgement` TR-4.6: 移动端touch长按和桌面端mouse长按都能正常工作
- **Notes**: 需防止长按后触发click跳转，可使用一个longPressTriggered标志位
