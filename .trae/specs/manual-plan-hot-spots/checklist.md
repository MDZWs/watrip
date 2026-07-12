# 手动规划热门景点选择页 - Verification Checklist

## 页面结构
- [ ] index.html中添加了id="manualPlanPage"页面，默认display:none
- [ ] manualPlanPage包含导航栏（返回+标题+城市名）
- [ ] 包含社区推荐区（横向滚动模板卡片）
- [ ] 包含分类筛选栏（横向滚动chip）
- [ ] 包含景点列表容器
- [ ] 包含底部固定操作栏（已选计数+生成按钮）
- [ ] index.html正确引用了manual-plan.js
- [ ] App.switchTab的pageMap注册了'manual-plan'

## 社区模板
- [ ] 社区模板按city/destination字段匹配过滤
- [ ] 社区模板按copies采纳数降序排列
- [ ] 最多显示3条社区模板
- [ ] 每个模板卡片显示emoji封面、标题、天数、采纳人数、作者
- [ ] 点击模板卡片打开TemplatePreview预览页
- [ ] 无匹配模板时显示"暂无当地行程模板"提示
- [ ] 城市名称模糊匹配（trim+toLowerCase，兼容"杭州市"=="杭州"）

## 热门景点列表
- [ ] 调用MapModule.searchCityPOIs(city, prefs)获取POI
- [ ] 景点列表按rating评分降序排列
- [ ] 每个景点卡片显示emoji、名称、类型标签、地址、评分
- [ ] emoji根据POI type正确映射（美食🍜、景点📍、自然🌿等）
- [ ] 类型标签可读（风景名胜→景点，餐饮服务→美食等）
- [ ] 列表加载时显示骨架屏loading
- [ ] 加载失败显示错误提示+重试按钮
- [ ] 空结果显示"暂无相关景点"

## 分类筛选
- [ ] 筛选标签：全部/🏛️必游/🍜美食/📸拍照/🌿自然/✨小众
- [ ] 点击标签切换active状态（橙色背景）
- [ ] 切换分类时重新调用searchCityPOIs（传入对应prefs）
- [ ] 已选景点在切换分类后保持选中状态（累加选择）
- [ ] 切换分类时列表滚动回顶部

## 景点多选
- [ ] 点击景点卡片切换选中/未选中
- [ ] 选中卡片有明显视觉高亮（橙色左边框+浅橙背景）
- [ ] 右侧checkbox显示勾选状态（橙色圆+白勾）
- [ ] 底部栏实时更新"已选N个景点"
- [ ] 选中0个时按钮置灰不可点击
- [ ] 选中≥1个时按钮为橙色可点击

## 生成行程
- [ ] 点击"生成行程"创建trip对象（含id/title/destination/dayPlans）
- [ ] 景点从9:00(startMin=540)开始安排
- [ ] 每个景点默认90分钟duration
- [ ] 相邻景点间有30分钟交通间隙
- [ ] 景点超过23:00(endMin>1380)时自动拆分到下一天
- [ ] trip通过AIMemory.saveTrip()保存
- [ ] 生成后跳转TripDetail.open()，景点正确显示
- [ ] 景点包含完整字段（name/type/emoji/lng/lat/address/startMin/endMin/duration）

## 导航路由
- [ ] 点击"手动规划"按钮时：有目的地→进入manualPlanPage；无目的地→toast提示
- [ ] 左上角返回按钮回到输入页(inputPage)
- [ ] 输入页之前输入的目的地信息在返回后保留
- [ ] 从手动规划页预览模板后关闭预览，回到手动规划页
- [ ] 生成行程后按返回键，回到行程列表页(tripsPage)而非输入页

## 视觉样式
- [ ] 页面整体风格与现有页面一致（#F5F5F7背景、圆角卡片、品牌橙色）
- [ ] 社区模板卡片横向滚动流畅，隐藏滚动条
- [ ] 筛选标签横向滚动，选中状态醒目
- [ ] 景点卡片间距合理，信息层次清晰
- [ ] 底部操作栏固定在底部，不被键盘顶起
- [ ] 375px宽度正常显示，无横向溢出
- [ ] 骨架屏有shimmer动画效果
- [ ] 选中/未选中状态切换有transition过渡

## 数据与API
- [ ] 高德POI搜索设置citylimit:true限定城市范围
- [ ] 搜索结果最多取30个POI
- [ ] POI数据包含name/address/lng/lat/type/rating
- [ ] 社区模板数据来自AIMemory.getCommunityTemplates()
- [ ] 无网络/API失败时优雅降级（显示重试按钮）
- [ ] 控制台无JavaScript错误