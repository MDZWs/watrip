# 行程标签分类 - 技术方案设计

> 文档版本：v1.0
> 生成时间：2026-07-09
> 阶段：技术方案设计完成 / 待任务规划
> 工作流：SpecForge 功能级 - Skill 9

---

## 1. 架构决策

### 1.1 新增模块

创建独立的 `TripTagManager` 模块（`js/trip-tag-manager.js`），负责标签的 CRUD、存储、排序。遵循项目现有的模块化模式（如 `AIMemory`、`TripsModule`），挂载到 `window` 上供全局调用。

### 1.2 改造范围

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `js/trip-tag-manager.js` | **新增** | 标签数据管理 + 最近删除管理 |
| `js/pages.js` | **改造** | `TripsModule` 增加标签栏渲染、标签筛选、标签选择器、标签管理页 |
| `js/trip-detail.js` | **改造** | `renderHeader()` 增加标签选择器入口 |
| `js/ai-memory.js` | **改造** | `saveTrip` 保留 `tagId` 字段透传 |
| `index.html` | **改造** | tripsPage 增加标签栏容器 + 标签管理页 HTML |
| `css/pages.css` | **改造** | 标签栏、标签选择器、标签管理页、最近删除样式 |

### 1.3 复用现有能力

| 能力 | 来源 | 复用方式 |
|------|------|---------|
| 底部弹窗 | `UiKit.showActionSheet()` | 标签选择面板 |
| 输入弹窗 | `UiKit.prompt()` | 新建/重命名标签 |
| 确认弹窗 | `UiKit.confirm()` | 删除标签确认 |
| Toast | `UiKit.toast()` | 操作反馈 |
| EventBus | `EventBus.emit/on()` | 标签变更通知 |
| 页面导航 | `App.switchTab()` / pageStack | 标签管理页导航 |
| localStorage 模式 | `AIMemory.KEYS` 模式 | 标签数据存储 |

---

## 2. 数据模型设计

### 2.1 标签数据

```javascript
// localStorage key: 'trip_tags'
// 结构：数组，按 order 排序
[
  {
    id: 'tag_1720500000000',    // 'tag_' + Date.now()
    name: '休闲出行',             // 标签名
    createdAt: 1720500000000,    // 创建时间戳
    order: 0                     // 排序序号，初始=创建顺序
  }
]
```

### 2.2 行程-标签关联

在现有 trip 对象上新增字段：
```javascript
trip.tagId = 'tag_1720500000000'  // 标签ID
// 或
trip.tagId = null                  // 无标签（在"全部"中）
```

**迁移策略**：无需迁移脚本。`trip.tagId` 为 `undefined` 时视为 `null`（无标签），读取时用 `trip.tagId || null`。

### 2.3 最近删除数据

```javascript
// localStorage key: 'trip_recently_deleted'
// 结构：数组
[
  {
    ...tripData,              // 完整行程数据（原 trip 对象的深拷贝）
    tagId: 'tag_xxx',         // 原标签ID（恢复时用不到，保留用于追溯）
    deletedAt: 1720500000000  // 删除时间戳，用于7天倒计时
  }
]
```

---

## 3. 模块设计

### 3.1 TripTagManager 模块（`js/trip-tag-manager.js`）

```javascript
const TripTagManager = {
    STORAGE_KEY: 'trip_tags',
    DELETED_KEY: 'trip_recently_deleted',
    RETENTION_DAYS: 7,

    // ===== 标签 CRUD =====
    getAllTags()           // 读取所有标签，按 order 排序
    getTag(id)             // 获取单个标签
    createTag(name)        // 新建标签，返回 {id, name, createdAt, order}
    renameTag(id, name)    // 重命名
    deleteTag(id)          // 删除标签（仅删标签数据，不动行程）
    reorderTags(tagIds)    // 按传入的 id 数组重排 order

    // ===== 行程-标签关联 =====
    setTripTag(tripId, tagId)   // 给行程设置标签（tagId=null 表示移除标签）
    getTripsByTag(tagId)        // 获取某标签下的行程
    getUntaggedTrips()          // 获取无标签行程

    // ===== 最近删除 =====
    getDeletedTrips()                 // 获取最近删除列表
    moveToDeleted(tripId, tagId)      // 将行程移入最近删除
    restoreTrip(tripId)               // 恢复单条（回到 trip_history，tagId=null）
    restoreAll()                      // 恢复全部
    permanentlyDelete(tripId)         // 永久删除单条
    permanentlyDeleteAll()            // 永久删除全部
    cleanupExpired()                  // 清理超过7天的，返回清理数量
    getDaysRemaining(deletedAt)       // 计算剩余天数
}
```

**关键实现决策**：

- `setTripTag(tripId, tagId)`：从 `AIMemory.getTrip(tripId)` 读取 trip，设置 `tagId`，调用 `AIMemory.saveTrip(trip)` 保存。复用现有的 save 机制，触发 `trip:saved` 事件。
- `moveToDeleted(tripId, tagId)`：从 `trip_history` 中删除行程，深拷贝存入 `trip_recently_deleted`。注意：不调用 `AIMemory.deleteTrip()`（那个会触发云端删除），而是直接操作 localStorage。
- `restoreTrip(tripId)`：从 `trip_recently_deleted` 移除，写回 `trip_history`，设置 `tagId=null`。
- `cleanupExpired()`：在 `App.init()` 中调用，应用启动时自动清理。

### 3.2 TripsModule 改造（`js/pages.js`）

#### 3.2.1 新增状态

```javascript
const TripsModule = {
    // ...existing...
    activeTagFilter: 'all',  // 'all' | 'tag_<id>' | 'deleted'
    // ...
}
```

#### 3.2.2 新增方法

| 方法 | 职责 |
|------|------|
| `renderTagBar()` | 渲染顶部横向标签栏 HTML |
| `switchTagFilter(tagKey)` | 切换标签筛选，重新渲染行程列表 |
| `showTagSelector(tripId)` | 弹出底部标签选择面板 |
| `setTripTag(tripId, tagId)` | 设置行程标签，刷新卡片 |
| `openTagManager()` | 打开标签管理页 |
| `closeTagManager()` | 关闭标签管理页 |
| `renderTagManager()` | 渲染标签管理页内容 |
| `createTagFromManager()` | 在管理页新建标签 |
| `renameTagFromManager(id)` | 在管理页重命名 |
| `deleteTagFromManager(id)` | 在管理页删除标签（弹窗三选项） |
| `renderDeletedTrips()` | 渲染最近删除视图 |
| `restoreDeletedTrip(tripId)` | 恢复单条 |
| `restoreAllDeleted()` | 恢复全部 |
| `permanentlyDeleteAll()` | 永久删除全部 |

#### 3.2.3 renderTripCards() 改造

```javascript
renderTripCards() {
    // ...existing 获取 trips 逻辑...

    // 新增：按 activeTagFilter 筛选
    let filteredTrips = tripArr;
    if (this.activeTagFilter === 'deleted') {
        // 渲染最近删除视图，直接 return
        this.renderDeletedTrips();
        return;
    } else if (this.activeTagFilter !== 'all') {
        const tagId = this.activeTagFilter; // 'tag_xxx'
        filteredTrips = tripArr.filter(t => t.tagId === tagId);
    }

    // 空状态判断改为 filteredTrips
    if (filteredTrips.length === 0) {
        // 标签筛选下的空状态："这个分类下还没有行程"
        paneAll.innerHTML = this._emptyTagState();
        return;
    }

    // 排序逻辑不变，用 filteredTrips
    // 渲染逻辑不变
}
```

#### 3.2.4 render() 改造

```javascript
render() {
    this._bindEvents();
    this.renderTagBar();       // 新增：渲染标签栏
    this.renderTripCards();
    this.initSwipe();
    this._ensureBackToTop();
}
```

#### 3.2.5 formatTripCard() 改造

在卡片元信息行（`.tc-meta-row`）中新增标签 chip：

```javascript
// 在 tc-meta-row 内，日期chip前面加一个标签chip
const tagInfo = trip.tagId ? TripTagManager.getTag(trip.tagId) : null;
const tagChipHtml = tagInfo
    ? `<div class="tc-meta-item tc-tag-chip" onclick="event.stopPropagation();TripsModule.showTagSelector('${trip.id}')">
         <span class="tc-tag-dot"></span>
         <span>${tagInfo.name}</span>
       </div>`
    : '';
```

行程卡片操作区增加"设置标签"按钮（放在折叠按钮后面）：

```javascript
// 在 tc-cover-right 内，折叠按钮后加一个标签按钮
<button class="tc-tag-btn" onclick="event.stopPropagation();TripsModule.showTagSelector('${trip.id}')" title="设置标签">
    <svg ...>标签图标</svg>
</button>
```

### 3.3 行程详情页改造（`js/trip-detail.js`）

在 `renderHeader()` 中，标题下方增加标签选择器：

```javascript
renderHeader() {
    // ...existing 标题逻辑...

    // 新增：标签显示与选择
    const tagEl = document.getElementById('detailSubtitle');
    const trip = this.trip;
    const tagInfo = trip.tagId ? TripTagManager.getTag(trip.tagId) : null;
    tagEl.innerHTML = `共${stats.totalSpots}个景点
        <span class="detail-tag-selector" onclick="TripsModule.showTagSelector('${this.tripId}')">
            ${tagInfo ? tagInfo.name : '设置标签'}
        </span>`;
}
```

### 3.4 标签管理页

采用**全屏覆盖式页面**（类似 tripDetailPage），不复用 pageStack 导航，而是独立的 show/hide 机制。

#### HTML 结构（index.html 新增）

```html
<div class="page tag-manager-page" id="tagManagerPage" style="display:none;">
    <div class="detail-nav-bar">
        <button class="detail-back" id="tagManagerBack">
            <svg>...返回箭头...</svg>
        </button>
        <div class="detail-title-wrap">
            <h1 class="detail-title">标签管理</h1>
        </div>
        <div class="detail-nav-actions">
            <button class="detail-icon-btn" id="tagManagerAddBtn" title="新建标签">
                <svg>...加号...</svg>
            </button>
        </div>
    </div>
    <div class="tag-manager-list" id="tagManagerList">
        <!-- 动态渲染标签列表 -->
    </div>
</div>
```

#### 交互

- 打开：`TripsModule.openTagManager()` → 显示页面，渲染标签列表
- 关闭：点击返回 / `TripsModule.closeTagManager()` → 隐藏页面，刷新标签栏
- 新建：点击右上角"+" → `UiKit.prompt()` 输入名称 → 创建 → 刷新列表
- 重命名：点击标签项 → `UiKit.prompt()` → 重命名 → 刷新列表
- 删除：点击标签项右侧删除按钮 → 三选项弹窗 → 执行
- 排序：长按标签项拖动 → 释放后调用 `reorderTags()` → 刷新

---

## 4. UI 设计

### 4.1 标签栏（TripTagBar）

```
┌──────────────────────────────────────────────┐
│ [全部] [休闲出行] [商务出差] [亲子游]  ... [🗑]│  ← 横向滚动
└──────────────────────────────────────────────┘
```

- 位置：`#tripsPage` 内，`#tripTabs` 下方，`#tripSwipe` 上方
- 容器：`<div class="trip-tag-bar" id="tripTagBar">`，`overflow-x: auto`
- 标签项：`<span class="trip-tag-item">`，选中态 `.active`
- "全部"固定第一个，`.trip-tag-item--all`
- "最近删除"固定最后一个，`.trip-tag-item--deleted`，带垃圾桶图标
- 样式：pill 形，白底灰边，选中态橙底白字（`var(--primary)`）

### 4.2 标签选择面板（底部弹窗）

复用 `UiKit.showActionSheet()` 模式，但需要自定义内容（当前选中态高亮）：

```
┌──────────────────────────┐
│ 设置标签                  │
├──────────────────────────┤
│ ✓ 无标签（移到全部）      │  ← 当前选中
│   休闲出行                │
│   商务出差                │
│   亲子游                  │
├──────────────────────────┤
│ + 新建标签                │  ← 底部快捷新建
├──────────────────────────┤
│        取消               │
└──────────────────────────┘
```

实现方式：不直接用 `showActionSheet`，而是自建底部弹窗（因为需要选中态高亮 + 新建标签入口）。

### 4.3 行程卡片标签标识

在 `.tc-meta-row` 最前面加一个标签 chip：

```
┌─────────────────────────────────────┐
│ 🏷 休闲出行  📅 2026-07-15  💰 ¥800 │
└─────────────────────────────────────┘
```

- 样式：小圆角 pill，浅色背景，点击可弹出标签选择器
- 无标签时不显示

### 4.4 最近删除视图

```
┌──────────────────────────────────────┐
│ 🗑 最近删除              [全部恢复] [全部删除] │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ 上海2天经典行程          [恢复]   │ │
│ │ 📅 删除于 7月9日 · 5天后永久删除  │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 杭州周末游               [恢复]   │ │
│ │ 📅 删除于 7月7日 · 3天后永久删除  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- 每条卡片：行程标题 + 删除日期 + 剩余天数 + 恢复按钮
- 空状态："最近删除是空的"
- 底部不需要操作按钮，全部恢复/全部删除放顶部

### 4.5 标签管理页

```
┌──────────────────────────────────────┐
│ ←  标签管理                    ＋     │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ ≡  休闲出行              ✏️  🗑     │ │  ← 长按≡拖动排序
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ ≡  商务出差              ✏️  🗑     │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ ≡  亲子游                ✏️  🗑     │ │
│ └──────────────────────────────────┘ │
│                                      │
│        没有标签？点击右上角创建       │
└──────────────────────────────────────┘
```

- 每行：拖动手柄 + 标签名 + 重命名按钮 + 删除按钮
- 长按拖动手柄触发排序
- 空状态提示

---

## 5. 删除标签流程详解

```
用户点击删除标签
    ↓
弹出三选项弹窗：
    ┌─────────────────────────────┐
    │  删除"休闲出行"标签          │
    │  该标签下有 3 个行程         │
    ├─────────────────────────────┤
    │  删除标签，保留行程          │  → 标签删除，行程 tagId=null
    │  删除标签及全部行程          │  → 标签删除，行程移入最近删除
    │  取消                       │
    └─────────────────────────────┘
```

**"删除标签，保留行程"实现**：
1. `TripTagManager.deleteTag(id)` → 从 `trip_tags` 移除
2. 遍历 `trip_history`，将 `tagId === id` 的行程设为 `tagId = null`
3. 保存 `trip_history`
4. 刷新标签栏 + 行程列表

**"删除标签及全部行程"实现**：
1. 遍历 `trip_history`，找出 `tagId === id` 的行程
2. 对每个行程调用 `TripTagManager.moveToDeleted(tripId, id)`
3. `TripTagManager.deleteTag(id)` → 从 `trip_tags` 移除
4. 刷新标签栏 + 行程列表
5. Toast 提示"X个行程已移入最近删除"

---

## 6. 自动清理机制

在 `App.init()` 中调用：

```javascript
// app.js init() 末尾
const cleaned = TripTagManager.cleanupExpired();
if (cleaned > 0) {
    console.log(`[TripTagManager] 自动清理 ${cleaned} 条过期删除行程`);
}
```

`cleanupExpired()` 实现：
```javascript
cleanupExpired() {
    const deleted = this.getDeletedTrips();
    const now = Date.now();
    const RETENTION_MS = this.RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const remaining = deleted.filter(t => (now - t.deletedAt) < RETENTION_MS);
    const cleaned = deleted.length - remaining.length;
    if (cleaned > 0) {
        localStorage.setItem(this.DELETED_KEY, JSON.stringify(remaining));
    }
    return cleaned;
}
```

---

## 7. 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 标签下无行程时删除 | 三选项弹窗仍弹，但"删除标签及全部行程"提示"该标签下无行程" |
| 重命名为空 | `UiKit.prompt` 返回空字符串时提示"标签名不能为空"，不执行 |
| 重命名为重复名 | 允许重名（简化逻辑，不强制唯一性） |
| 行程详情页设置标签后返回列表 | `TripDetail.close()` 已调用 `TripsModule.renderTripCards()`，自动刷新 |
| 20条上限检查与最近删除恢复冲突 | 恢复时检查活跃行程数，超限提示"活跃行程已达20条上限，请先删除或归档部分行程" |
| 最近删除中的行程有云端ID | 恢复时保留 `cloudId`，设 `pendingSync=true` 触发重新同步；永久删除时不触发云端删除（已在删除标签时处理） |
| 标签栏在"旅行记忆"tab下的显示 | 标签栏仅在"我的行程"tab（currentTab=0）显示，切到"旅行记忆"时隐藏 |

---

## 8. AC 覆盖汇总表

| AC 编号 | AC 描述 | 技术设计覆盖 | 备注 |
|---------|---------|-------------|------|
| AC-标签-1 | 查看标签分类下的行程 | §3.2.3 renderTripCards 筛选 + §3.2.2 switchTagFilter | ✓ |
| AC-标签-2 | 从"全部"查看所有行程 | §3.2.3 activeTagFilter='all' 时不筛选 | ✓ |
| AC-标签-3 | 给行程设置标签 | §3.2.2 showTagSelector + setTripTag + §4.2 标签选择面板 | ✓ |
| AC-标签-4 | 给行程换标签 | §3.2.2 setTripTag 覆盖旧值 + §3.3 详情页标签选择器 | ✓ |
| AC-标签-5 | 新建标签 | §3.4 标签管理页 + UiKit.prompt + createTag | ✓ |
| AC-标签-6 | 重命名标签 | §3.4 标签管理页 + UiKit.prompt + renameTag | ✓ |
| AC-标签-7 | 标签拖动排序 | §3.4 标签管理页长按拖动 + reorderTags | ✓ |
| AC-标签-8 | 删除标签但保留行程 | §5 删除流程选项1 | ✓ |
| AC-标签-9 | 删除标签及行程进入最近删除 | §5 删除流程选项2 + moveToDeleted | ✓ |
| AC-标签-10 | 最近删除-单条恢复 | §3.2.2 restoreDeletedTrip + §3.1 restoreTrip | ✓ |
| AC-标签-11 | 最近删除-全部恢复 | §3.2.2 restoreAllDeleted + §3.1 restoreAll | ✓ |
| AC-标签-12 | 最近删除-7天自动清理 | §6 cleanupExpired + App.init() | ✓ |
| AC-标签-13 | 剩余天数正确显示 | §3.1 getDaysRemaining + §4.4 最近删除视图 | ✓ |

**所有 AC 均已覆盖，无技术不可实现项。**

---

## 9. 技术债务预判

| 债务 | 说明 | 应对 |
|------|------|------|
| 拖动排序实现复杂度 | 原生 JS 拖拽排序较繁琐 | MVP 可先用上下箭头按钮替代拖拽，后续迭代加拖拽 |
| 标签选择面板自建弹窗 | 不直接用 showActionSheet（需选中态高亮+新建入口） | 复用 showActionSheet 的 CSS 样式，JS 逻辑自建 |
| 云端同步标签 | MVP 不做，tagId 只存本地 | 后续 Supabase 迁移时在 trip 表加 tagId 字段 |

---

> 下一步：进入任务规划（SpecForge 功能级 - Skill 10）
