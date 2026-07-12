# 行程体验升级任务规划

## 阶段划分
共分 **6个阶段**，按依赖顺序执行：

---

## 第1阶段：基础重构（分类+数据同步）
预计工时：90分钟

### Task-01：行程分类UI重构 [40min]
**通俗解释**：将原来的三个Tab改成「旅行中」和「回忆长廊」两个，调整样式更文艺
**修改文件**：
- [index.html](file:///c:/Users/20180/Desktop/trip/trip/index.html)：修改tripTabs区域的Tab按钮
- [css/pages.css](file:///c:/Users/20180/Desktop/trip/trip/css/pages.css)：调整Tab样式
**验证标准**：页面只显示两个分类Tab，点击可切换

### Task-02：行程状态与分组逻辑 [30min]
**通俗解释**：重构状态判断逻辑，实现「进行中置顶、未开始按时间、已完成归档」
**修改文件**：[js/pages.js](file:///c:/Users/20180/Desktop/trip/trip/js/pages.js)
- 修改 `getTripStatus()` 函数，只返回 `traveling`/`archived` 两种状态
- 重构行程列表渲染的分组排序逻辑
- 卡片状态标识改为 📍旅行中 / ✅已完成
**验证标准**：
- 已开始的行程在「旅行中」最顶部
- 未开始的按出发日期排序
- 已结束的在「回忆长廊」按完成时间倒序

### Task-03：数据同步与统计统一 [20min]
**通俗解释**：详情页返回列表时自动刷新，统一花费/进度/景点数计算逻辑
**修改文件**：
- [js/pages.js](file:///c:/Users/20180/Desktop/trip/trip/js/pages.js)：添加通用 `calcTripStats()` 函数
- [js/trip-detail.js](file:///c:/Users/20180/Desktop/trip/trip/js/trip-detail.js)：在 `close()` 方法中调用列表重新渲染
- [css/pages.css](file:///c:/Users/20180/Desktop/trip/trip/css/pages.css)：为 `.tc-days-preview` 添加滚动样式
**验证标准**：
- 详情页修改花费/打卡/增减景点后返回，卡片数据同步更新
- 卡片内天数预览区域可上下滚动查看所有天
- 预览页显示全部天数（不再只显示前3天）

---

## 第2阶段：照片功能
预计工时：80分钟

### Task-04：照片上传与压缩模块 [30min]
**通俗解释**：实现照片选择、压缩、存储功能，支持拍照/相册
**新建文件**：[js/photo-upload.js](file:///c:/Users/20180/Desktop/trip/trip/js/photo-upload.js)
- 封装 `PhotoUpload` 模块：选择文件、Canvas压缩、转base64
- 单张最大压缩到1200px宽，质量0.8，约300-500KB
**验证标准**：可选择图片并获得压缩后的base64数据

### Task-05：景点照片布局与渲染 [30min]
**通俗解释**：在景点卡片顶部添加照片区域，支持0-3张照片的不同布局，相机按钮
**修改文件**：
- [js/trip-detail.js](file:///c:/Users/20180/Desktop/trip/trip/js/trip-detail.js)：修改 `renderItinerary()` 中的景点卡片渲染
- [css/pages.css](file:///c:/Users/20180/Desktop/trip/trip/css/pages.css)：添加照片区域布局样式（1/3高度、1-3张图布局、相机按钮）
**验证标准**：
- 默认显示占位+加号
- 1张图全宽、2张并排、3张一主两副
- 相机按钮在右上角，点击触发上传

### Task-06：全屏照片预览 [20min]
**通俗解释**：点击照片可全屏查看，左右滑动切换
**修改文件**：[js/trip-detail.js](file:///c:/Users/20180/Desktop/trip/trip/js/trip-detail.js)
- 添加全屏预览层，支持滑动切换
- 点击关闭
**验证标准**：点击照片全屏显示，可滑动切换，点击关闭

---

## 第3阶段：拖拽排序与插入
预计工时：120分钟

### Task-07：长按拖拽核心逻辑实现 [60min]
**通俗解释**：实现长按触发拖拽、跟随手指移动、位置检测
**新建文件**：[js/drag-sort.js](file:///c:/Users/20180/Desktop/trip/trip/js/drag-sort.js)
- 封装 `DragSort` 模块
- 长按500ms触发拖拽，卡片浮起效果
- Touch事件处理：touchstart/touchmove/touchend
- 位置检测：计算当前悬浮的目标位置
**验证标准**：长按景点卡片可拖拽，跟随手指移动

### Task-08：跨天移动、插入与删除 [60min]
**通俗解释**：支持拖拽到其他天、两个景点间插入、拖拽到删除区删除
**修改文件**：
- [js/drag-sort.js](file:///c:/Users/20180/Desktop/trip/trip/js/drag-sort.js)：
  - 检测Day边界，支持跨天移动
  - 两个景点间显示「+ 添加」按钮
  - 底部删除区域，拖拽上去变红提示
- [js/trip-detail.js](file:///c:/Users/20180/Desktop/trip/trip/js/trip-detail.js)：拖拽完成后更新数据并重新渲染，重算时间
**验证标准**：
- 景点可拖拽排序
- 可跨天移动
- 中间点击+可插入新景点
- 拖拽到底部可删除
- 排序后时间自动重算

---

## 第4阶段：手帐编辑器（写想法）
预计工时：150分钟

### Task-09：红点角标与设置开关 [20min]
**通俗解释**：景点卡片加红点提示未记录，设置中可开关
**修改文件**：
- [js/trip-detail.js](file:///c:/Users/20180/Desktop/trip/trip/js/trip-detail.js)：渲染景点卡片时，若note为空且开关开启则显示红点
- 设置面板添加开关项，本地存储记录
**验证标准**：未写想法的景点显示红点，设置中关闭后红点消失

### Task-10：手帐编辑器面板UI与基础框架 [40min]
**通俗解释**：从底部滑出的编辑面板，顶部切换、工具栏、编辑区
**新建文件**：[js/note-editor.js](file:///c:/Users/20180/Desktop/trip/trip/js/note-editor.js)
- 底部滑出动画
- 顶部：「实况打卡」「回忆补记」切换、关闭按钮
- 工具栏：字号滑块、加粗、斜体、对齐、缩进、插入图片、插入时间
- 编辑区：contenteditable
- 底部：保存按钮、AI总结按钮
**修改文件**：[css/components.css](file:///c:/Users/20180/Desktop/trip/trip/css/components.css)：添加编辑器样式
**验证标准**：点击红点可打开编辑器面板，UI显示正常

### Task-11：富文本编辑功能实现 [50min]
**通俗解释**：实现加粗、斜体、字号、对齐、缩进、插入时间等功能
**修改文件**：[js/note-editor.js](file:///c:/Users/20180/Desktop/trip/trip/js/note-editor.js)
- 使用 document.execCommand 实现基础格式化
- 字号滑块：修改选中文本的fontSize
- 插入时间：在光标位置插入当前HH:mm格式时间
- 自动保存：每30秒自动保存到spot.note
**验证标准**：
- 选中文字可加粗/斜体
- 滑动滑块可调整字号
- 对齐/缩进功能正常
- 插入时间功能正常
- 自动保存，关闭后内容不丢失

### Task-12：图文混排与定位校验 [40min]
**通俗解释**：支持插入景点照片到编辑区，实况打卡定位校验
**修改文件**：[js/note-editor.js](file:///c:/Users/20180/Desktop/trip/trip/js/note-editor.js)
- 插入照片：显示该景点已上传照片，点击插入到光标位置
- 定位校验：实况模式调用高德定位，判断是否在景点500米范围内，不在则提示降级为回忆
- 记录类型标记：保存时记录type（realtime/retro）、recordTime、location
**验证标准**：
- 可插入照片到文字中间，图文混排
- 实况打卡自动定位，不在范围内提示
- 两种类型标记正确保存

---

## 第5阶段：AI总结与分享
预计工时：60分钟

### Task-13：AI总结攻略功能 [40min]
**通俗解释**：点击按钮调用AI，将随笔整理成结构化攻略
**修改文件**：[js/note-editor.js](file:///c:/Users/20180/Desktop/trip/trip/js/note-editor.js)
- 提取note.content纯文本
- 调用已有AI接口，传入总结提示词
- 显示结果弹窗，支持编辑修改
**验证标准**：点击按钮后AI生成结构化攻略，可编辑

### Task-14：分享到社区入口 [20min]
**通俗解释**：总结后的内容可一键跳转到游记发布页
**修改文件**：[js/note-editor.js](file:///c:/Users/20180/Desktop/trip/trip/js/note-editor.js)
- 添加「分享到社区」按钮
- 点击后跳转到游记编辑器，自动填充总结后的内容
**验证标准**：点击分享可跳转，内容自动填充

---

## 第6阶段：PDF导出铺垫与收尾
预计工时：40分钟

### Task-15：数据结构标准化与toHtml方法 [40min]
**通俗解释**：确保所有数据结构化，实现行程转HTML方法，为PDF导出准备
**修改文件**：
- [shared/trip-storage.js](file:///c:/Users/20180/Desktop/trip/trip/shared/trip-storage.js)：添加 `tripToHtml(trip)` 方法
- 确保照片、手帐HTML结构标准
- 修复原有"到此一游"按钮，移除相关代码
**验证标准**：
- "到此一游"按钮已移除
- tripToHtml可生成完整HTML文档，包含排版、照片
- 所有功能正常，无控制台报错

---

## 里程碑验收
- **M1（第1阶段完成）**：分类重构完成，数据同步正常 ✅
- **M2（第2-3阶段完成）**：照片上传、拖拽排序功能可用 ✅
- **M3（第4阶段完成）**：手帐编辑器完整可用，图文混排正常 ✅
- **M4（全部完成）**：AI总结、分享功能可用，数据结构完整 ✅
