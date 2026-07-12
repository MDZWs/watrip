# 社区参考旅程预览 & 出行方式提示 - Verification Checklist

## 种子模板数据
- [x] 6个种子模板（杭州、上海、成都、厦门、北京、西安）均包含完整dayPlans数组
- [x] 每个dayPlan有day、theme、spots字段
- [x] 每个spot有name、address、emoji、duration、startMin/endMin字段
- [x] dayPlans.length与模板days一致
- [x] 景点顺序按地理位置合理排列，不折返

## 高德骑行API集成
- [x] index.html高德SDK plugin中包含AMap.Riding
- [x] MapModule.init()中初始化了this.riding实例
- [x] calcRoute方法支持driving/walking/riding/transit四种模式
- [x] calcRoute返回{success, distance, time, path}格式
- [x] 骑行2km约返回8分钟（480秒）左右
- [x] estimateRoute方法为四种模式提供合理估算值（步行5km/h、骑行15km/h、驾车35km/h、公交18km/h）
- [x] API调用失败时自动降级到estimateRoute

## 预览页结构与样式
- [x] index.html包含id="templatePreviewPage"的DOM结构
- [x] 预览页包含：顶部导航栏、封面hero区域、列表模式容器、地图模式容器、底部操作栏
- [x] 封面区域显示emoji、标题、作者、标签、复制/点赞数
- [x] 底部固定"套用行程"主按钮和返回按钮
- [x] 样式与app整体风格一致，使用品牌橙色系
- [x] 预览页只读模式下景点卡片无编辑、拖拽、时间调整交互

## 出行提示卡片
- [x] .transport-hint样式类已定义
- [x] 卡片位于相邻两个景点timeline-item之间
- [x] 显示出行方式emoji、距离、时间
- [x] 可编辑模式下显示步行/骑行/驾车/公交胶囊切换按钮
- [x] 选中状态用品牌色高亮
- [x] 只读模式（预览页）不显示切换按钮
- [x] 卡片紧凑，高度合适不喧宾夺主
- [x] 卡片有与时间轴衔接的视觉连线

## 预览页交互逻辑
- [x] 社区卡片点击调用TemplatePreview.open()进入预览页
- [x] 列表模式渲染完整每日行程时间轴（只读）
- [x] 列表模式景点间显示transport-hint（只读）
- [x] 点击"地图模式"FAB按钮切换到地图视图
- [x] 地图模式显示景点标记和路线连线
- [x] 地图模式有day pills切换天数
- [x] 点击"套用行程"深拷贝模板到用户行程
- [x] 套用后跳转至tripDetailPage，行程可编辑
- [x] App.useTemplate()已更新为调用TemplatePreview.open()
- [x] 返回按钮正确返回社区页

## 行程详情页出行方式功能
- [x] renderItinerary()在相邻景点间插入transport-hint卡片
- [x] 默认推荐交通方式：<1.5km步行、1.5-5km骑行、>5km驾车
- [x] 点击出行方式胶囊按钮触发switchTransport
- [x] switchTransport调用MapModule.calcRoute计算
- [x] 无坐标时使用estimateRoute给出估算值
- [x] 切换后卡片距离和时间实时更新
- [x] transportMode/distanceNum/timeSec保存到spot数据
- [x] 地图模式路线绘制使用用户选择的交通方式

## 端到端验证
- [x] 社区浏览→点击卡片→预览列表→切换地图→套用→编辑→切换出行方式：完整流程无阻断
- [x] 控制台无应用级JavaScript错误
- [x] 预览页加载流畅（列表先显示，地图异步加载）
- [x] 套用后的行程可正常切换地图模式
- [x] 修复了trip-detail返回preview页的路由bug
