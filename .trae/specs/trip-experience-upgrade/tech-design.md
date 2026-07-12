# 行程体验升级技术方案

## 一、技术栈与依赖
- 现有技术栈：原生 JavaScript + CSS + localStorage（无需新增框架）
- 拖拽功能：使用原生 Touch/Pointer 事件实现，不引入第三方库（轻量）
- 定位功能：复用已有高德地图 API（amap-helper.js）
- 富文本编辑：使用 contenteditable 实现轻量手帐编辑器，不引入大型富文本库
- 图片压缩：使用 Canvas 压缩上传图片，避免 localStorage 溢出

---

## 二、数据结构变更

### 2.1 行程（Trip）数据结构扩展
```javascript
{
  id: string,
  title: string,
  destination: string,
  startDate: string,
  days: number,
  expenses: Array, // 原有花费记录
  dayPlans: Array<DayPlan>, // 原有每日行程
  // 新增字段
  status: 'traveling' | 'archived', // 旅行中 | 回忆长廊
  completedAt?: number, // 完成时间戳
  lastModified: number, // 最后修改时间，用于列表刷新
}
```

### 2.2 景点（Spot）数据结构扩展
```javascript
{
  name: string,
  location?: { lat: number, lng: number },
  startMin: number,
  endMin: number,
  duration: number,
  checked?: boolean,
  // 新增字段
  photos: Array<{
    id: string,
    dataUrl: string, // 压缩后的base64
    isCover: boolean
  }>,
  poiCoverUrl?: string, // 高德POI官方封面
  note: {
    content: string, // HTML格式的富文本内容
    type: 'realtime' | 'retro', // 实况 | 回忆
    recordTime: number, // 记录时间戳
    location?: { lat: number, lng: number }, // 记录时位置
    lastUpdated: number
  },
  hasNewNote?: boolean // 红点角标标记（本地状态）
}
```

---

## 三、各模块技术实现

### 模块1：行程分类重构
**实现位置**：[pages.js](file:///c:/Users/20180/Desktop/trip/trip/js/pages.js)
1. 修改行程列表Tab HTML：替换原三个Tab为两个：「旅行中」「回忆长廊」
2. 重构 `getTripStatus()` 函数：
   - `traveling`：已开始（startDate <= 今天）且未手动结束，或没有设置startDate的行程
   - `archived`：用户手动点击「结束行程」，或打卡进度100%超过24小时
3. 修改列表渲染逻辑：
   - 「旅行中」分组：先过滤出 isOngoing 的行程置顶，再按 startDate 升序排列未开始的
   - 「回忆长廊」分组：按 completedAt 倒序排列
4. 卡片状态标识：右上角显示 📍旅行中 / ✅已完成，替换原彩色状态标签

### 模块2：卡片预览与数据同步
**实现位置**：[pages.js](file:///c:/Users/20180/Desktop/trip/trip/js/pages.js)、[trip-detail.js](file:///c:/Users/20180/Desktop/trip/trip/js/trip-detail.js)
1. 为 `.tc-days-preview` 添加CSS：`max-height: 180px; overflow-y: auto; -webkit-overflow-scrolling: touch;`
2. 修改 `formatTripCard()` 函数：渲染所有天数（而非仅前3天），但容器滚动限制高度
3. 数据同步：在 `TripDetail.close()` 方法中，调用 `TripsModule.renderTrips()` 重新渲染列表，保证从详情页返回时数据刷新
4. 统计函数统一：封装通用的 `calcTripStats(trip)` 函数，列表和详情页共用，保证打卡数、花费、进度统计口径一致

### 模块3：景点照片功能
**实现位置**：[trip-detail.js](file:///c:/Users/20180/Desktop/trip/trip/js/trip-detail.js)、新增 `js/photo-upload.js`
1. POI封面获取：在景点卡片渲染时，若有location且无自定义照片，调用高德POI搜索接口获取封面图，缓存到 `spot.poiCoverUrl`
2. 照片上传：
   - 文件选择：使用 `<input type="file" accept="image/*" capture="environment">` 支持拍照和相册选择
   - 图片压缩：使用Canvas将图片压缩到最大宽度1200px，质量0.8，转base64存储
   - 最多3张，超过提示
3. 照片布局：
   - 0张：显示默认占位+加号按钮
   - 1张：全宽显示作为封面
   - 2张：左右各50%布局
   - 3张：1大2小网格布局
4. 照片预览：点击照片打开全屏预览层，支持左右滑动切换
5. 相机图标按钮：固定在照片区域右上角，半透明黑色背景白色图标

### 模块4：拖拽排序与插入
**实现位置**：新增 `js/drag-sort.js`
1. 长按触发：触摸景点卡片超过500ms进入拖拽模式，卡片放大1.05倍，添加阴影
2. 拖拽逻辑：
   - 监听touchmove事件，跟随手指移动
   - 检测悬浮位置：计算当前手指下的卡片/日期分隔区域
   - 跨天移动：拖拽到Day标题区域时，自动展开该天区域，可插入到任意天的任意位置
3. 插入按钮：在两个景点卡片之间渲染一个高度8px的热区，hover/长按显示「+ 添加景点」按钮
4. 删除区域：屏幕底部显示删除区域，拖拽到该区域变红，松开删除景点
5. 时间重算：拖拽完成后，调用已有的 `_recalcAllTransport()` 方法重新计算所有景点时间

### 模块5：手帐编辑器（写想法）
**实现位置**：新增 `js/note-editor.js`
1. 红点角标：
   - 景点卡片右上角添加小红点，当 `spot.note.content` 为空且开启提示时显示
   - 在设置中添加开关项，本地存储 `noteDotEnabled: true/false`
2. 记录面板：从底部滑出的半屏面板，包含：
   - 顶部栏：「实况打卡」/「回忆补记」切换按钮，关闭按钮
   - 工具栏：字号滑动条、加粗、斜体、左/中/右对齐、缩进、插入照片、插入时间
   - 编辑区：contenteditable div，支持图文混排
   - 底部：「AI总结攻略」按钮、「保存」按钮
3. 定位校验：
   - 实况模式：调用高德定位获取当前位置，计算与景点距离<500m则标记为真实况，否则提示「不在景点范围内，将标记为回忆补记」
   - 回忆模式：不校验定位
4. 自动保存：每30秒自动保存到 localStorage，关闭前确认保存
5. 照片插入：点击插入照片按钮，弹出该景点已上传照片列表，点击插入到光标位置

### 模块6：AI总结攻略
**实现位置**：[note-editor.js](file:///c:/Users/20180/Desktop/trip/trip/js/note-editor.js)、复用已有AI接口
1. 点击「AI总结攻略」按钮：
   - 将用户的note.content（HTML转纯文本）作为上下文
   - 调用已有的AI服务，提示词："请将以下旅行随笔整理成结构化的景点游玩攻略，包含：景点亮点、游玩建议、避坑Tips、推荐游玩时长四个部分，语言简洁实用：[用户内容]"
2. 生成后显示在弹窗中，用户可编辑修改
3. 提供「分享到社区」按钮，跳转到游记发布页，自动填充内容

### 模块7：PDF导出铺垫
1. 确保所有手帐内容使用标准HTML标签（`<p>` `<strong>` `<em>` `<img>` `<h4>`等），内联样式
2. 照片使用base64存储，确保离线可访问
3. 在trip对象中添加 `toHtml()` 方法，可将整个行程渲染为完整HTML文档，为后续PDF导出（如使用html2pdf.js）预留接口

---

## 四、AC覆盖验证表
| AC编号 | 实现方式 | 验证点 |
|--------|----------|--------|
| AC1.1 | 修改Tab HTML | 只有两个分类Tab |
| AC1.2-1.5 | 重构分组排序逻辑 | 旅行中置顶，未开始按时间，已完成归档 |
| AC2.1 | CSS overflow-y: auto | 天数预览区域可滚动 |
| AC2.2-2.4 | close()时重新渲染，统一统计函数 | 数据同步一致 |
| AC3.1-3.5 | photo-upload.js + 布局CSS | 支持1-3张图，默认POI封面，相机上传 |
| AC4.1-4.6 | drag-sort.js 原生拖拽实现 | 长按拖拽、跨天、插入、删除 |
| AC5.1-5.6 | note-editor.js 手帐编辑器 | 红点角标、两种模式、富文本、图文混排 |
| AC6.1-6.4 | AI总结逻辑 + 分享入口 | AI生成攻略，默认私有可分享 |
| AC7.1-7.3 | 数据结构标准化 + toHtml方法 | 结构化存储，PDF导出就绪 |

---

## 五、风险与应对
1. **localStorage容量限制**：图片压缩到单张最大500KB，单景点3张最多1.5MB，总行程控制在10MB以内，超出提示用户清理照片
2. **拖拽性能**：虚拟滚动优化，拖拽时只重排必要DOM，避免卡顿
3. **富文本兼容性**：只使用移动端浏览器广泛支持的contenteditable API和execCommand，避免复杂功能
4. **定位权限**：实况打卡若用户拒绝定位权限，自动降级为回忆模式，不阻塞使用
