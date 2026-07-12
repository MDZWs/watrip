# AI旅行助手深度增强 - Verification Checklist

## 模型与服务层
- [x] CONFIG.MODEL_NAME已改为'qwen-plus'（config.js）
- [x] AIService模块已创建，包含chat/quickAsk/askForJSON/buildTripContext方法
- [x] AI服务层统一错误处理
- [x] index.html中正确引用ai-service.js和ai-chat.js

## AI浮动按钮与对话面板
- [x] AI FAB按钮（✨）在行程详情页可见，位于右下角
- [x] 点击FAB后面板从底部平滑滑入
- [x] 面板关闭按钮（✕）正常工作
- [x] 面板样式与app整体风格一致（圆角、品牌橙色）
- [x] 面板overlay使用opacity+pointer-events平滑过渡
- [x] 面板panel使用transform:translateY滑入动画

## 对话交互
- [x] 输入文字后点击发送，AI正常回复
- [x] Enter键发送消息（Shift+Enter换行）
- [x] 发送时显示loading状态
- [x] 消息有淡入动画（aiMsgFadeIn）
- [x] AI回复后自动滚动到底部
- [x] 新消息自动追加到对话历史
- [x] 快捷芯片（6个：找美食/酒店/优化路线/当地体验/填充时间/避坑提醒）正常显示
- [x] 多轮对话上下文保持

## AI结构化推荐与一键添加
- [x] AI推荐解析为卡片样式（.ai-rec-card）
- [x] 推荐卡片包含emoji/名称/类型/理由/添加按钮
- [x] 点击"添加到行程"后景点出现在时间轴
- [x] 添加成功后显示toast提示
- [x] 已添加的推荐标记为✓状态
- [x] 路线优化返回newOrder时显示"🔄 一键优化路线"按钮
- [x] 一键优化路线正确重排spots

## 上下文智能建议（Inline Suggestions）
- [x] 饭点缺口（午餐12-13点/晚餐18-19点无餐厅）显示美食建议
- [x] 时间空隙≥45分钟显示填充建议
- [x] 建议卡片样式轻量（浅橙渐变，不打断时间轴）
- [x] "问问AI"按钮打开AI对话获取具体推荐
- [x] "忽略"按钮移除建议卡片
- [x] 建议渲染在交通提示之后、下一个景点之前
- [x] 建议异步加载（不阻塞初始渲染）

## 景点AI贴士
- [x] 每个景点卡片底部有"💡 AI小贴士"折叠入口
- [x] 默认折叠不增加卡片高度
- [x] 点击展开异步调用AI生成贴士
- [x] 贴士包含📸拍照贴士/⏰最佳时间/💡避坑提醒
- [x] 贴士结果缓存（不重复生成）
- [x] loading状态显示"AI正在生成贴士..."
- [x] 再次点击可折叠

## 快捷场景
- [x] 🍜找美食：发送本地美食推荐prompt（含人均价格），返回JSON格式
- [x] 🏨推荐酒店：结合行程位置推荐住宿区域
- [x] 🗺️优化路线：返回newOrder数组支持一键重排
- [x] 🎭当地体验：推荐特色文化活动（茶馆/非遗/市集等）
- [x] ⏰填充时间：分析空闲时段推荐活动
- [x] 💡避坑提醒：交通/餐饮/购票注意事项
- [x] 各场景prompt要求AI返回JSON结构化数据

## 设置开关
- [x] "我的"页面有"✨ AI智能建议"开关
- [x] 开关默认开启
- [x] 开关状态持久化到localStorage
- [x] 关闭后隐藏AI FAB
- [x] 关闭后不显示inline suggestions
- [x] 关闭后不显示AI小贴士按钮
- [x] 关闭后跳过analyzeAndSuggest分析

## 视觉与交互细节
- [x] AI FAB有breathing呼吸动画
- [x] FAB滚动超过100px时半透明（opacity 0.7）
- [x] AI建议卡片有淡入动画（aiSugFadeIn）
- [x] 整体AI元素非侵入式设计，不冗杂
- [x] 375px小屏宽度正常显示
- [x] 控制台无JavaScript错误