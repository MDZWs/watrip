# AI旅行助手深度增强 - Implementation Plan

## [x] Task 1: 模型升级 + AI服务层抽象
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 [config.js](file:///C:/Users/Administrator/Desktop/trip/js/config.js)：将MODEL_NAME改为'qwen-plus'
  - 创建新文件 [js/ai-service.js](file:///C:/Users/Administrator/Desktop/trip/js/ai-service.js)：
    - 封装统一的AI调用方法 `chat(messages, options)` - 支持多轮对话消息数组
    - 封装 `quickAsk(prompt, systemPrompt)` - 单次快速问答
    - 封装 `askForJSON(prompt, jsonDesc, options)` - 请求JSON格式响应
    - 优化system prompt：更专业的旅行顾问角色定义
    - 统一错误处理和重试逻辑
    - buildTripContext()构建行程上下文
  - 在index.html中添加ai-service.js的script引用
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: CONFIG.MODEL_NAME === 'qwen-plus'
  - `programmatic` TR-1.2: AIService.chat()能正常返回AI回复
  - `programmatic` TR-1.3: askForJSON能解析JSON响应
- **Status**: ✅ 已完成

## [x] Task 2: AI浮动按钮(FAB) + 对话面板HTML/CSS
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 [index.html](file:///C:/Users/Administrator/Desktop/trip/index.html) 的tripDetailPage中添加AI FAB和对话面板overlay
  - 在 [pages.css](file:///C:/Users/Administrator/Desktop/trip/css/pages.css) 添加完整AI相关样式
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: AI FAB可见不遮挡
  - `human-judgement` TR-2.2: 面板平滑滑入/关闭
  - `human-judgement` TR-2.3: 样式与整体风格一致
  - `programmatic` TR-2.4: DOM元素存在
- **Status**: ✅ 已完成

## [x] Task 3: 对话面板JavaScript逻辑
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 创建 [js/ai-chat.js](file:///C:/Users/Administrator/Desktop/trip/js/ai-chat.js) 实现AIChat模块
  - 实现open/close/sendMessage/appendMessage/renderQuickChips/handleQuickAction等方法
  - 修改trip-detail.js绑定FAB点击事件
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-8
- **Test Requirements**:
  - `human-judgement` TR-3.1: 发送后AI正常回复
  - `human-judgement` TR-3.2: 快捷芯片触发对应功能
  - `programmatic` TR-3.3: 消息历史正确追加
  - `human-judgement` TR-3.4: loading状态显示
- **Status**: ✅ 已完成

## [x] Task 4: AI结构化推荐 + 一键添加功能
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 在AIChat中实现AI回复JSON解析（_parseAIResponse）
  - 渲染推荐卡片（.ai-rec-card），包含emoji/名称/类型/理由/添加按钮
  - 实现添加到行程（_addRecommendation调用TripDetail.addSpotToTrip）
- **Acceptance Criteria Addressed**: AC-3, AC-5, AC-7
- **Test Requirements**:
  - `human-judgement` TR-4.1: 推荐显示为卡片样式
  - `human-judgement` TR-4.2: 添加后景点出现在时间轴
  - `programmatic` TR-4.4: 推荐数据解析正确
- **Status**: ✅ 已完成

## [x] Task 5: 上下文智能建议（Inline Suggestions）
- **Priority**: high
- **Depends On**: Task 1, Task 3
- **Description**:
  - 在TripDetail中实现analyzeAndSuggest()本地规则分析
  - 识别饭点缺口（午餐/晚餐时段无餐厅）和时间空隙（≥45分钟空闲）
  - 建议卡片轻量样式（浅橙色渐变背景），不打断时间轴
  - "问问AI"按钮接受建议后打开AI对话获取具体推荐
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 饭点缺口显示美食建议
  - `human-judgement` TR-5.2: 时间空隙显示填充建议
  - `human-judgement` TR-5.4: 忽略后建议消失
  - `human-judgement` TR-5.5: 建议卡片轻量不破坏时间轴
- **Status**: ✅ 已完成

## [x] Task 6: 景点卡片AI贴士增强
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 在景点卡片底部添加"💡 AI小贴士"折叠按钮
  - 点击展开异步调用AI生成拍照贴士/最佳时间/避坑提醒
  - 贴士结果缓存到spot.aiTips避免重复生成
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-6.1: AI贴士入口可见
  - `human-judgement` TR-6.2: 展开显示📸/⏰/💡三类贴士
  - `human-judgement` TR-6.3: 默认折叠不增加高度
- **Status**: ✅ 已完成

## [x] Task 7: 快捷场景能力实现
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Description**:
  - 增强handleQuickAction发送精准JSON格式prompt
  - 美食推荐：本地人常去餐厅，含人均价格
  - 酒店推荐：结合行程位置推荐住宿区域
  - 路线优化：返回newOrder数组，支持一键优化
  - 当地体验：特色文化活动推荐（茶馆/非遗/市集等）
  - 时间填充：分析空闲时段推荐小活动
  - 避坑提醒：交通/餐饮/购票注意事项
  - 实现_applyOptimize一键路线重排
- **Acceptance Criteria Addressed**: AC-3, AC-5
- **Test Requirements**:
  - `human-judgement` TR-7.1~7.4: 各快捷场景正常返回结果
- **Status**: ✅ 已完成

## [x] Task 8: 视觉打磨 + 交互细节 + 设置开关
- **Priority**: medium
- **Depends On**: Task 2-7
- **Description**:
  - AI FAB滚动半透明效果
  - 面板平滑滑入动画（transform+opacity）
  - 消息渐入动画
  - Enter键发送消息（Shift+Enter换行）
  - "我的"页面添加AI智能建议开关（localStorage持久化）
  - 关闭AI后隐藏FAB/inline suggestions/AI tips
  - 确保375px宽度正常显示
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `human-judgement` TR-8.1: 动画流畅
  - `human-judgement` TR-8.2: 设置开关生效
  - `human-judgement` TR-8.5: 视觉不冗杂，AI元素融入设计
- **Status**: ✅ 已完成