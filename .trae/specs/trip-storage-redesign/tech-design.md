# 哇途 · 行程存储与删除联动重构 - 技术方案设计

> 文档版本：v1.0
> 生成时间：2026-07-08
> 阶段：✅ 技术方案设计（SpecForge Skill 9）
> 输入：[spec.md](./spec.md)（10 个 AC）
> 下一步：Skill 10 任务规划

---

## 0. 设计原则

1. **本地为主，云端附属**：所有读写以 localStorage 为先，云端为备份+发布渠道，UI 永远只等本地操作完成
2. **统一入口**：App 层只调 `AIMemory`，`TripStorage` 降级为云端同步层，不再被 App 直接调用
3. **不引入新依赖**：沿用现有 Supabase + localStorage 技术栈，不引入 IndexedDB / RxDB / PWA sync 框架
4. **字段而非新表**：归档、pendingSync、pendingDelete 通过行程对象新增字段实现，不动数据库 schema
5. **元数据以云端为准**：status / likes / favorites / copies 这些"社交元数据"只在云端维护，本地不擅自修改

---

## 1. 现状架构分析

### 1.1 双系统并行问题

```
当前调用关系（混乱）：
App.saveTrip ──┬──> AIMemory.saveTrip（写本地 trip_history）
                └──> TripStorage.saveTrip（写云端 + 又写本地 trip_history）
                      └── _updateLocalCache（重复写本地）

App.deleteTrip ──> AIMemory.deleteTrip ──> TripStorage.deleteTrip（已修复联动）
```

**问题根因**：
- [ai-memory.js:85](file:///c:/Users/20180/Desktop/trip/trip/js/ai-memory.js#L85) `saveTrip` 写本地，[trip-storage.js:89](file:///c:/Users/20180/Desktop/trip/trip/shared/trip-storage.js#L89) `saveTrip` 又写本地（`_updateLocalCache`），两套 API 都操作同一个 `trip_history` key
- App 层 [app.js:1089](file:///c:/Users/20180/Desktop/trip/trip/js/app.js#L1089) 同时调两个模块，职责不清
- TripStorage 既管云端又管本地缓存，违反单一职责

### 1.2 配额逻辑错位

[trip-storage.js:64](file:///c:/Users/20180/Desktop/trip/trip/shared/trip-storage.js#L64) `checkCanCreate` 基础配额 3 条，与需求"本地 20 条"不一致。配额检查放在云端模块也导致离线无法创建。

### 1.3 缺失机制

| 机制 | 现状 | 需补齐 |
|------|------|--------|
| 智能合并 | 无 | 换设备同步按 updatedAt 去重 |
| pendingSync | 无 | 离线创建标记 + 联网补传 |
| pendingDelete | 无 | 离线删除标记 + 联网补删 |
| 归档 | 仅 `unarchiveTrip` 半成品 | 完整 archive/unarchive + 主列表过滤 |
| 登录门槛 | 无 | 创建入口拦截 |
| 发布上限 | 仅基础配额 3 | 独立的发布数 ≤10 检查 |

---

## 2. 目标架构

### 2.1 分层职责

```
┌─────────────────────────────────────────────┐
│  App 层（app.js / pages.js）                  │
│  只调 AIMemory，不直接调 TripStorage          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  AIMemory（ai-memory.js）—— 本地主存储 + 业务  │
│  职责：                                       │
│  · localStorage CRUD（trip_history）          │
│  · 20 条上限检查（非归档）                     │
│  · 归档 / 取消归档                            │
│  · 删除（本地硬删 + 异步通知 TripStorage）     │
│  · 登录门槛辅助（提供 hasReachedLimit）        │
└──────────────────┬──────────────────────────┘
                   │ 异步调用（不阻塞 UI）
┌──────────────────▼──────────────────────────┐
│  TripStorage（trip-storage.js）—— 云端附属层  │
│ 职责：                                        │
│  · 云端 CRUD（supabase trip_templates）       │
│  · 发布 / 下架管理                            │
│  · 发布数 ≤10 检查                            │
│  · 智能合并（syncFromCloud）                  │
│  · pendingSync / pendingDelete 处理           │
│  · 审核自动触发（保留现有彩蛋机制）            │
└─────────────────────────────────────────────┘
```

### 2.2 调用关系（重构后）

```
App.saveTrip(trip)
  └─> AIMemory.saveTrip(trip)            // 1. 写本地 + 20 条检查
        └─> 异步 TripStorage.syncToCloud(trip, userId)  // 2. 云端 upsert
              └─> 成功：回写 cloudId 到 AIMemory + 清除 pendingSync
                  失败：标记 pendingSync=true，UI 显示角标

App.deleteTrip(id)
  └─> AIMemory.deleteTrip(id)            // 1. 本地硬删
        └─> 异步 TripStorage.deleteCloud(cloudId)  // 2. 云端删
              └─> 成功：从 pendingDeleteIds 移除
                  失败：加入 pendingDeleteIds，联网重试

Auth.onLogin(user)  // 换设备/重新登录触发
  └─> TripStorage.syncFromCloud(userId)  // 智能合并
        └─> 回调 AIMemory.applySyncResult(merged)
```

---

## 3. 数据模型变更

### 3.1 行程对象新增字段（localStorage）

```javascript
{
  // 已有字段
  id: 'trip_xxx',
  cloudId: 'uuid',           // 云端 ID
  title: '...',
  dayPlans: [...],
  status: 'private',         // private | published
  savedAt: 1783000000000,
  
  // 新增字段
  pendingSync: false,        // 离线创建/修改待同步
  pendingDelete: false,      // 离线删除待同步（仅云端有记录时标记）
  archivedAt: null,          // 归档时间戳，null=未归档
  updatedAt: '2026-07-08T...', // ISO 字符串，智能合并用
  syncMeta: {                // 云端元数据快照（仅已同步行程）
    likes: 0, favorites: 0, copies: 0
  }
}
```

**字段说明**：
- `pendingSync`：本地有改动但未同步云端。新建/编辑/归档/取消归档时设为 true，云端同步成功后设为 false
- `pendingDelete`：本地已删除但云端未删除。仅当行程有 `cloudId` 且云端删除失败时设置。这个标记存在一个独立的 `trip_pending_deletes` 数组中（见 3.2），不存进行程对象（行程已删）
- `archivedAt`：归档时间戳。归档操作只改本地字段，不触发云端变更（归档是本地管理行为，云端不感知）
- `updatedAt`：每次本地保存时更新为当前 ISO 时间；云端同步时以云端为准
- `syncMeta`：缓存云端的社交元数据，避免每次都要查云端

### 3.2 新增 localStorage keys

```javascript
AIMemory.KEYS = {
  TRIP_HISTORY: 'trip_history',          // 已有
  TRIP_TRASH: 'trip_trash',              // 废弃，删除迁移逻辑后清除
  PENDING_DELETES: 'trip_pending_deletes', // 新增：[{cloudId, localId, deletedAt}]
  LAST_SYNC_AT: 'trip_last_sync_at',     // 新增：上次同步时间戳
  // 其他已有 keys 保留
}
```

### 3.3 数据库 schema

**无变更**。`trip_templates` 表已有 `status` 字段支持 private/published，删除依赖现有 ON DELETE CASCADE 清理 likes/favorites/views。

---

## 4. 核心算法设计

### 4.1 统一存储 API（AIMemory 改造）

#### `saveTrip(trip)` 改造

```javascript
saveTrip(trip) {
  const trips = this.getAllTrips();
  const id = trip.id || ('trip_' + Date.now());
  const isNew = !trips[id];
  
  // 20 条上限检查（仅新建 + 非归档行程计数）
  if (isNew) {
    const activeCount = Object.values(trips).filter(t => !t.archivedAt).length;
    if (activeCount >= 20) {
      return { success: false, error: 'LIMIT_REACHED', id: null };
    }
  }
  
  trip.id = id;
  trip.savedAt = Date.now();
  trip.updatedAt = new Date().toISOString();
  trip.pendingSync = true;  // 标记待同步
  if (!trip.archivedAt) trip.archivedAt = null;
  
  trips[id] = trip;
  localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
  
  // 异步触发云端同步（不阻塞）
  this._notifyCloudSync(trip);
  
  return { success: true, id, error: '' };
}
```

**决策说明**：
- 50 条上限改为 20 条，仅计非归档行程（归档不计入上限）
- 返回值改为对象 `{success, id, error}`，便于上层判断上限场景
- `pendingSync` 标记由 saveTrip 自动设置，云端同步成功后由 TripStorage 回调清除
- 移除原"自动删除最旧"逻辑（原第 92-95 行），改为返回 `LIMIT_REACHED` 让 UI 处理

#### `deleteTrip(id)` 完善（已修复 P0，补 pendingDelete）

```javascript
async deleteTrip(id) {
  const trips = this.getAllTrips();
  const trip = trips[id];
  if (!trip) return { success: false, error: '行程不存在' };
  
  const cloudId = trip.cloudId;
  
  // 本地硬删
  delete trips[id];
  localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
  
  // 云端联动
  if (cloudId && typeof TripStorage !== 'undefined') {
    try {
      await TripStorage.deleteCloud(cloudId, id);
    } catch (e) {
      // 离线或失败：记录 pendingDelete，联网后补删
      this._addPendingDelete(cloudId, id);
      console.warn('[AIMemory] 云端删除失败，已加入 pendingDelete:', e?.message);
    }
  }
  return { success: true, error: '' };
}
```

**关键变化**：`await` 等待云端删除（而非原 fire-and-forget），失败时记 pendingDelete。这里**打破"不阻塞 UI"原则**的决策理由：

- AC-3/AC-4 要求"列表立即移除"——本地删除是同步的，列表已立即移除，UI 不阻塞
- `await` 仅等云端请求完成（通常 <500ms），失败时不抛错而是记 pendingDelete，不影响用户继续操作
- 原 fire-and-forget 方案的问题：用户离线删除后关闭页面，云端删除永远不执行；await+pendingDelete 方案保证最终一致性

**折中**：为避免弱网下 UI 卡顿，给云端删除加 3s 超时，超时按失败处理记 pendingDelete。

#### 新增 `archiveTrip(id)` / `unarchiveTrip(id)`

```javascript
archiveTrip(id) {
  const trips = this.getAllTrips();
  if (!trips[id]) return { success: false, error: '行程不存在' };
  trips[id].archivedAt = Date.now();
  trips[id].updatedAt = new Date().toISOString();
  trips[id].pendingSync = true;  // 归档状态需同步云端？决策：不同步，归档是纯本地概念
  // 修正：archivedAt 不同步云端，pendingSync 设 false
  trips[id].pendingSync = false;
  localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
  return { success: true, error: '' };
}

unarchiveTrip(id) {
  const trips = this.getAllTrips();
  if (!trips[id]) return { success: false, error: '行程不存在' };
  trips[id].archivedAt = null;
  trips[id].updatedAt = new Date().toISOString();
  // 取消归档时需检查是否超过 20 条上限
  const activeCount = Object.values(trips).filter(t => !t.archivedAt && t.id !== id).length;
  if (activeCount >= 20) {
    return { success: false, error: 'LIMIT_REACHED' };
  }
  localStorage.setItem(this.KEYS.TRIP_HISTORY, JSON.stringify(trips));
  return { success: true, error: '' };
}
```

**决策**：归档（archivedAt）是纯本地管理概念，不同步云端。理由：
- 云端 trip_templates 无 archived 字段，加字段需 migration，违反"不动 schema"原则
- 归档是用户的多设备行为差异（设备 A 归档不影响设备 B），符合"本地为主"架构
- 如用户在设备 A 归档后换设备 B，设备 B 智能合并会拉回未归档状态——这是预期行为（归档不跨设备）

#### 新增查询方法

```javascript
getActiveTrips() {
  // 主列表用：未归档
  return Object.values(this.getAllTrips())
    .filter(t => !t.archivedAt)
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

getArchivedTrips() {
  // 已归档列表用
  return Object.values(this.getAllTrips())
    .filter(t => t.archivedAt)
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
}

getPendingSyncTrips() {
  // 联网恢复后批量上传用
  return Object.values(this.getAllTrips()).filter(t => t.pendingSync);
}

getActiveCount() {
  // 20 条上限检查用
  return Object.values(this.getAllTrips()).filter(t => !t.archivedAt).length;
}
```

#### 废弃代码清理

- 移除 `permanentDeleteTrip` / `restoreTrip` / `getTrash` / `KEYS.TRIP_TRASH`
- 移除 `trip_trash` localStorage key（不主动清除数据，避免误删；仅停止读写）

---

### 4.2 云端同步层改造（TripStorage）

#### `saveTrip` 拆分为 `syncToCloud`

```javascript
// 原 saveTrip 拆分：syncToCloud 只管云端，不碰本地缓存
async syncToCloud(trip, userId) {
  if (!userId || !supabase) {
    return { success: false, error: '未登录或网络不可用', synced: false };
  }
  
  const row = this._mapTripToRow(trip, userId);
  
  try {
    // upsert：有 cloudId 更新，无 cloudId 插入
    if (trip.cloudId) {
      const { data, error } = await supabase
        .from('trip_templates')
        .update({
          title: row.title, day_plans: row.day_plans, days: row.days,
          destination: row.destination, city: row.city, budget: row.budget,
          suitable_for: row.suitable_for, updated_at: new Date().toISOString(),
        })
        .eq('id', trip.cloudId)
        .eq('author_id', userId)
        .select('id, updated_at')
        .single();
      
      if (error) throw error;
      return { success: true, id: data.id, updatedAt: data.updated_at, synced: true };
    }
    
    // 新建
    const { data, error } = await supabase
      .from('trip_templates')
      .insert(row)
      .select('id, updated_at')
      .single();
    
    if (error) throw error;
    return { success: true, id: data.id, updatedAt: data.updated_at, synced: true };
  } catch (e) {
    return { success: false, error: e.message, synced: false };
  }
}
```

**决策说明**：
- 原 `saveTrip`（[trip-storage.js:89](file:///c:/Users/20180/Desktop/trip/trip/shared/trip-storage.js#L89)）含配额检查 + 本地缓存写入，职责混杂。拆分后 `syncToCloud` 纯云端操作
- 移除 `_updateLocalCache` / `_saveLocal` 调用——本地缓存由 AIMemory 统一管理
- 移除 `isNew` 配额检查参数——配额检查移到 AIMemory（本地 20 条）+ 独立的发布数检查（见 4.3）

#### `deleteTrip` 重命名为 `deleteCloud`

```javascript
async deleteCloud(cloudId, localId) {
  if (!cloudId || !supabase) {
    return { success: false, error: '参数缺失' };
  }
  const { error } = await supabase
    .from('trip_templates')
    .delete()
    .eq('id', cloudId);
  if (error) throw new Error(error.message);
  EventBus.emit('trip:deleted', { cloudId, localId });
  return { success: true };
}
```

**变化**：移除本地缓存删除（已由 AIMemory 处理），失败时抛错让 AIMemory 记 pendingDelete。

#### 新增 `syncFromCloud`（智能合并核心）

```javascript
async syncFromCloud(userId) {
  if (!userId || !supabase) {
    return { merged: 0, uploaded: 0, deleted: 0 };
  }
  
  // 1. 拉取云端全部行程
  const cloudTrips = await this.getUserTrips(userId); // 已有方法
  const cloudMap = new Map();
  cloudTrips.forEach(t => cloudMap.set(t.cloudId, t));
  
  // 2. 拉取本地全部行程
  const localTrips = AIMemory.getAllTrips();
  const localByCloudId = new Map();
  const localOnly = [];  // 本地独有（无 cloudId）
  
  Object.values(localTrips).forEach(t => {
    if (t.cloudId) localByCloudId.set(t.cloudId, t);
    else localOnly.push(t);
  });
  
  // 3. 处理 pendingDelete：云端有但本地已标记删除的，从云端删
  const pendingDeletes = AIMemory.getPendingDeletes();
  for (const pd of pendingDeletes) {
    if (cloudMap.has(pd.cloudId)) {
      await this.deleteCloud(pd.cloudId, pd.localId);
      cloudMap.delete(pd.cloudId);
    }
  }
  AIMemory.clearPendingDeletes();
  
  // 4. 智能合并：云端为主遍历
  const mergeResults = [];
  cloudTrips.forEach(cloudTrip => {
    const localTrip = localByCloudId.get(cloudTrip.cloudId);
    if (!localTrip) {
      // 云端有本地无：下载到本地
      mergeResults.push({ action: 'download', trip: cloudTrip });
    } else {
      // 两端都有：按 updatedAt 取新
      const localUpdated = new Date(localTrip.updatedAt || localTrip.savedAt || 0).getTime();
      const cloudUpdated = new Date(cloudTrip.updatedAt).getTime();
      if (cloudUpdated > localUpdated) {
        // 云端新：用云端覆盖本地（保留本地 archivedAt，归档不跨设备同步）
        const archivedAt = localTrip.archivedAt;
        mergeResults.push({ action: 'update_local', trip: { ...cloudTrip, archivedAt } });
      } else if (localUpdated > cloudUpdated) {
        // 本地新：上传本地覆盖云端
        mergeResults.push({ action: 'update_cloud', trip: localTrip });
      }
      // 时间相等：不动
    }
  });
  
  // 5. 本地独有：上传云端
  localOnly.forEach(localTrip => {
    mergeResults.push({ action: 'upload', trip: localTrip });
  });
  
  // 6. 执行合并
  let merged = 0, uploaded = 0, deleted = 0;
  for (const r of mergeResults) {
    if (r.action === 'download') {
      AIMemory.applyCloudTrip(r.trip);
      merged++;
    } else if (r.action === 'update_local') {
      AIMemory.applyCloudTrip(r.trip);
      merged++;
    } else if (r.action === 'update_cloud' || r.action === 'upload') {
      const result = await this.syncToCloud(r.trip, userId);
      if (result.success && result.id) {
        AIMemory.updateCloudId(r.trip.id, result.id, result.updatedAt);
        uploaded++;
      }
    }
  }
  
  // 7. 批量处理 pendingSync 的行程（离线创建后联网）
  const pendingSyncTrips = AIMemory.getPendingSyncTrips();
  for (const trip of pendingSyncTrips) {
    const result = await this.syncToCloud(trip, userId);
    if (result.success) {
      AIMemory.markSynced(trip.id, result.id, result.updatedAt);
    }
  }
  
  AIMemory.setLastSyncAt(Date.now());
  return { merged, uploaded, deleted, total: cloudTrips.length + localOnly.length };
}
```

**算法说明**：
- 匹配键：`cloudId`。无 cloudId 的本地行程视为"本地独有"，上传云端获取 cloudId
- 冲突解决：`updatedAt` 时间戳大的胜出。相等不动
- 元数据同步：云端 trip 的 likes/favorites/copies 通过 `applyCloudTrip` 写入本地 `syncMeta`
- 归档保留：合并时保留本地 `archivedAt`（归档不跨设备）
- pendingDelete 优先：合并前先处理删除待办，避免被合并拉回

**边界场景**：
- 云端返回空（新设备首次登录）：本地独有全部上传
- 本地为空：云端全部下载
- 网络中断：已合并的部分保留，剩余下次再同步（幂等）

---

### 4.3 发布数 ≤10 检查（新增）

```javascript
// TripStorage 新增
async checkCanPublish(userId) {
  if (!supabase || !userId) return { allowed: false, reason: '未登录' };
  
  // 管理员免限制
  if (typeof Auth !== 'undefined' && Auth.isAdmin()) {
    return { allowed: true, publishedCount: 0, limit: 999 };
  }
  
  const { count, error } = await supabase
    .from('trip_templates')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .eq('status', 'published');
  
  const publishedCount = count || 0;
  if (publishedCount >= 10) {
    return {
      allowed: false,
      reason: '社区发布上限 10 条，请先下架或删除已发布行程',
      publishedCount,
      limit: 10,
    };
  }
  return { allowed: true, publishedCount, limit: 10 };
}
```

**决策**：发布上限走云端 count 查询，不靠本地缓存。理由：发布数是社交属性，必须以云端为准，避免多设备发布超额。

---

### 4.4 下架机制（沿用现有 + 补元数据同步）

现有 [trip-storage.js:261](file:///c:/Users/20180/Desktop/trip/trip/shared/trip-storage.js#L261) `unpublishTrip` 已实现云端 status 改 private，逻辑正确。需补：

```javascript
async unpublishTrip(cloudId, userId) {
  // ... 现有云端更新逻辑保留 ...
  
  // 新增：同步本地行程 status
  if (typeof AIMemory !== 'undefined') {
    AIMemory.updateTripStatus(cloudId, 'private');
  }
  
  // 新增：通知别人收藏失效
  // 这部分由数据库视图/RLS 处理，应用层不主动删别人收藏
  // 收藏表查询时 JOIN trip_templates 过滤 status=published 即可
  
  EventBus.emit('trip:unpublished', { cloudId, userId });
  return { success: true };
}
```

**决策**：别人收藏列表过滤已下架行程，通过查询时 JOIN `trip_templates WHERE status='published'` 实现，不物理删除收藏记录。理由：
- 物理删收藏记录需要遍历所有用户，性能差
- 用户重新发布时收藏自动恢复，体验更好
- AC-5 要求"别人收藏列表中此行程消失"——查询过滤即满足

---

## 5. 交互流程设计

### 5.1 20 条上限触发流程（AC-2）

```
用户点击"新建行程"
  │
  ▼
App.navigateTo('plan')
  │
  ▼
检查 AIMemory.getActiveCount() >= 20 ?
  │
  ├─ 否 → 正常进入规划页
  │
  └─ 是 → UiKit.actionSheet({
          title: '已达 20 条上限，请先处理',
          actions: [
            { text: '删除一个旧行程', value: 'delete' },
            { text: '归档一个旧行程', value: 'archive' },
            { text: '取消', value: 'cancel' },
          ]
        })
        │
        ├─ delete → 进入选择模式 → 选中后 AIMemory.deleteTrip(id) → 重新进入规划页
        ├─ archive → 进入选择模式 → 选中后 AIMemory.archiveTrip(id) → 重新进入规划页
        └─ cancel → 返回
```

### 5.2 登录门槛流程（AC-7）

```
用户点击"新建行程" / "AI 规划" / "手动规划"
  │
  ▼
Auth.requireAuth()  // 已有方法
  │
  ├─ 已登录 → 继续原操作
  │
  └─ 未登录 → 弹出登录弹窗（已有 Auth UI）
              │
              ├─ 登录成功 → 继续原操作 + 触发 syncFromCloud
              └─ 取消 → 返回
```

**实现位置**：
- [app.js](file:///c:/Users/20180/Desktop/trip/trip/js/app.js) `navigateTo('plan')` 入口加 `await Auth.requireAuth()`
- [app.js](file:///c:/Users/20180/Desktop/trip/trip/js/app.js) `switchTab('trips')` 不加（已登录用户查看行程列表无需拦截，但未登录看到空列表会引导登录）

**决策**：`switchTab('trips')` 不强制登录，未登录显示空状态 + "登录后查看行程"按钮。理由：行程列表本身不创建内容，强制登录体验差；但创建入口必须拦截。

### 5.3 归档入口设计（AC-10）

```
tripsPage（行程列表页）
  │
  ├─ 顶部 Tab：待出发 / 进行中 / 已完成 / [已归档]  ← 新增第4个 tab
  │
  └─ 行程卡片长按菜单（已有长按删除）扩展：
      ├─ 删除
      └─ 归档  ← 新增（仅"进行中"/"已完成" tab 显示）
```

**决策**：归档作为第 4 个 tab 而非独立页面。理由：
- 沿用现有三 tab + 滑动切换架构，改动最小
- 归档行程不频繁访问，放底部 tab 符合使用频率
- 第 4 tab 无数量限制，展示归档时间倒序

### 5.4 pendingSync 角标（AC-9）

```
行程卡片渲染（pages.js formatTripCard）
  │
  ▼
trip.pendingSync === true ?
  │
  ├─ 是 → 卡片右上角显示"⏳ 待同步"角标（小号灰色标签）
  │
  └─ 否 → 不显示

网络恢复事件（window online / Auth.onLogin）
  │
  ▼
TripStorage.syncFromCloud(userId)
  │
  ▼
完成后 EventBus.emit('trip:synced')
  │
  ▼
pages.js 监听 → 重新渲染列表 → 角标消失
```

**决策**：用 emoji ⏳ 作为角标。违反"功能 UI 用 SVG"原则的例外：角标是状态指示而非功能按钮，用文字+emoji 成本最低。如用户反馈不喜欢可换 SVG。

---

## 6. 事件总线集成

新增/复用事件：

| 事件名 | 触发时机 | 监听方 | 作用 |
|--------|---------|--------|------|
| `trip:synced` | syncFromCloud 完成 | pages.js | 刷新列表，清除角标 |
| `trip:limit_reached` | saveTrip 返回 LIMIT_REACHED | app.js | 弹出选择面板 |
| `trip:archived` | archiveTrip 完成 | pages.js | 从主列表移除 |
| `trip:unarchived` | unarchiveTrip 完成 | pages.js | 加回主列表 |
| `auth:login_success` | 登录成功 | app.js | 触发 syncFromCloud |
| `network:online` | window online | app.js | 触发 syncFromCloud |

---

## 7. 影响范围与改造清单

### 7.1 必改文件

| 文件 | 改造内容 | 涉及 AC |
|------|---------|---------|
| [js/ai-memory.js](file:///c:/Users/20180/Desktop/trip/trip/js/ai-memory.js) | saveTrip 50→20 + 返回对象 / deleteTrip 补 pendingDelete / 新增 archiveTrip/getActiveTrips/getArchivedTrips/getPendingSyncTrips/getActiveCount/applyCloudTrip/updateCloudId/markSynced/updateTripStatus / 移除回收站代码 | AC-1,2,3,4,8,9,10 |
| [shared/trip-storage.js](file:///c:/Users/20180/Desktop/trip/trip/shared/trip-storage.js) | saveTrip 拆 syncToCloud / deleteTrip 改 deleteCloud / 新增 syncFromCloud/checkCanPublish / unpublishTrip 补本地同步 / 移除 _updateLocalCache/_saveLocal/_getLocalTrip/_getAllLocalTrips/_deleteLocalTrip（本地缓存归 AIMemory） | AC-1,3,4,5,6,8,9 |
| [js/app.js](file:///c:/Users/20180/Desktop/trip/trip/js/app.js) | navigateTo('plan') 加 Auth.requireAuth / 保存逻辑改只调 AIMemory / 登录成功触发 syncFromCloud / online 事件触发 syncFromCloud | AC-1,2,7,8,9 |
| [js/pages.js](file:///c:/Users/20180/Desktop/trip/trip/js/pages.js) | tripsPage 新增"已归档"tab / 卡片菜单加"归档"项 / 渲染 pendingSync 角标 / 20 条上限弹窗 / 监听 trip:synced 刷新 / 移除 restoreFromTrash/permanentDelete/toggleTrash/formatTrashCard 死代码 | AC-2,9,10 |

### 7.2 不改文件

- 数据库 schema（无 migration）
- 社区页瀑布流（删除联动后自动生效）
- 等级/积分系统（配额提升机制调整阈值在后端 profiles.storage_quota，本期不改）

---

## 8. 技术决策记录（ADR）

### ADR-1：归档不同步云端

**决策**：archivedAt 仅存本地，不写入云端 trip_templates。
**理由**：数据库无 archived 字段，加字段需 migration 违反"不动 schema"原则；归档是用户多设备差异化行为，不跨设备同步符合"本地为主"。
**代价**：换设备后归档状态丢失，需重新归档。可接受。

### ADR-2：pendingDelete 存独立数组而非行程对象

**决策**：pendingDelete 存 `trip_pending_deletes` 数组 `[{cloudId, localId, deletedAt}]`，不存进行程对象。
**理由**：行程已被本地硬删，对象不存在。如存在行程对象里需保留"墓碑"，违反"硬删无回收站"原则。
**代价**：syncFromCloud 时需单独读取处理，增加一步。可接受。

### ADR-3：发布数检查走云端 count 查询

**决策**：checkCanPublish 用 `supabase.from('trip_templates').select(count).eq(status,'published')` 实时查询，不靠本地缓存。
**理由**：发布是多设备行为，本地缓存会过期导致超额发布。性能上 count 查询轻量，可接受。
**代价**：离线时无法发布（但离线本就无法发布，发布需写云端）。无额外代价。

### ADR-4：删除 await 云端而非 fire-and-forget

**决策**：deleteTrip 中 `await TripStorage.deleteCloud`，失败记 pendingDelete。打破原"不阻塞 UI"设计。
**理由**：fire-and-forget 在离线场景下云端删除永远不执行；await+pendingDelete 保证最终一致性。UI 实际不阻塞（本地同步删，列表立即移除；await 仅等网络请求，加 3s 超时）。
**代价**：弱网下用户可能等 3s 才能继续操作。可接受（超时后按失败处理，不阻断）。

### ADR-5：下架不物理删别人收藏

**决策**：下架行程时不删 favorites 表记录，查询收藏列表时 JOIN 过滤 `status='published'`。
**理由**：物理删需遍历所有用户，性能差；用户重新发布时收藏自动恢复，体验更好。
**代价**：favorites 表有"孤儿"记录（指向 private 行程），但查询时不显示。可接受。

---

## 9. AC 覆盖汇总表

| AC | 描述 | 技术实现位置 | 覆盖状态 |
|----|------|-------------|---------|
| AC-1 | 本地创建（未达上限） | AIMemory.saveTrip（20检查）+ 异步 TripStorage.syncToCloud + 回写 cloudId | ✅ |
| AC-2 | 本地创建（达上限） | saveTrip 返回 LIMIT_REACHED + app.js 弹 actionSheet + 删除/归档后重试 | ✅ |
| AC-3 | 删除未发布行程 | AIMemory.deleteTrip（本地硬删）+ deleteCloud（云端硬删，CASCADE 清理） | ✅ |
| AC-4 | 删除已发布行程（核心） | 同 AC-3，CASCADE 自动清 likes/favorites；别人复制副本独立保留 | ✅ |
| AC-5 | 下架已发布行程 | TripStorage.unpublishTrip（status→private）+ AIMemory.updateTripStatus + 收藏查询 JOIN 过滤 | ✅ |
| AC-6 | 发布达上限 | TripStorage.checkCanPublish（count 查询 ≥10 阻止） | ✅ |
| AC-7 | 未登录访问创建入口 | app.js navigateTo('plan') 加 Auth.requireAuth | ✅ |
| AC-8 | 换设备同步（本地无） | TripStorage.syncFromCloud：云端全部 download 到本地 | ✅ |
| AC-8b | 换设备同步（本地有） | syncFromCloud：按 updatedAt 合并 + 本地独有 upload + pendingDelete 处理 | ✅ |
| AC-9 | 离线创建 | saveTrip 标 pendingSync=true + UI 角标 + online 事件触发 syncFromCloud 批量上传 | ✅ |
| AC-10 | 归档行程 | AIMemory.archiveTrip（archivedAt）+ getActiveTrips 过滤 + tripsPage 第4 tab + unarchiveTrip 上限检查 | ✅ |

---

## 10. 风险与降级

| 风险 | 概率 | 影响 | 降级方案 |
|------|------|------|---------|
| syncFromCloud 网络中断 | 中 | 部分同步 | 幂等设计，下次登录重试；已合并部分保留 |
| updatedAt 时区不一致 | 低 | 合并方向错误 | 统一用 ISO 字符串，云端 supabase 自动 UTC，本地 `new Date().toISOString()` 也是 UTC |
| pendingDelete 数组无限增长 | 低 | 内存占用 | syncFromCloud 成功后 clearPendingDeletes；数组上限 50 条 |
| 20 条上限检查竞态（多 tab 同时创建） | 极低 | 超额 1 条 | 可接受，下次保存时回退；不引入锁 |
| 归档不跨设备导致用户困惑 | 中 | 用户反馈 | 文案说明"归档仅当前设备可见"；下期迭代考虑加云端字段 |

---

## 11. 待确认问题

无。所有技术决策已在本方案中确定，沿用项目已有做法的决策直接定，引入新概念（pendingSync/pendingDelete/archivedAt/智能合并算法）的决策已说明理由。

---

## 12. 下一步

进入 SpecForge Skill 10（任务规划），将本技术方案拆解为原子任务，每个任务带验证标准，按依赖顺序排期。

预计任务分组：
- 阶段 1：AIMemory 改造（本地层）
- 阶段 2：TripStorage 改造（云端层）
- 阶段 3：App 入口与登录门槛
- 阶段 4：tripsPage UI 适配
- 阶段 5：事件总线与网络监听
- 阶段 6：废弃代码清理 + 回归测试
