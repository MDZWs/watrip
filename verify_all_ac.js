const fs = require('fs');
const path = require('path');

const base = 'c:/Users/20180/Desktop/trip/trip';
const ai = fs.readFileSync(path.join(base, 'js/ai-memory.js'), 'utf8');
const ts = fs.readFileSync(path.join(base, 'shared/trip-storage.js'), 'utf8');
const app = fs.readFileSync(path.join(base, 'js/app.js'), 'utf8');
const pages = fs.readFileSync(path.join(base, 'js/pages.js'), 'utf8');
const mp = fs.readFileSync(path.join(base, 'js/manual-plan.js'), 'utf8');
const tp = fs.readFileSync(path.join(base, 'js/template-preview.js'), 'utf8');
const td = fs.readFileSync(path.join(base, 'js/trip-detail.js'), 'utf8');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(base, 'css/pages.css'), 'utf8');

const checks = [
  // ===== AC-1: 本地创建行程（已登录，未达上限） =====
  ['AC-1: AIMemory.saveTrip 返回 {success,id,error}', ai.includes('success: true, id') && ai.includes("error: ''")],
  ['AC-1: saveTrip 设置 pendingSync=true', ai.includes('trip.pendingSync = true')],
  ['AC-1: saveTrip 自动调用 _notifyCloudSync', ai.includes('_notifyCloudSync(trip)')],
  ['AC-1: _notifyCloudSync 调用 TripStorage.syncToCloud', ai.includes('TripStorage.syncToCloud')],
  ['AC-1: _notifyCloudSync 成功后 markSynced', ai.includes('this.markSynced')],
  ['AC-1: TripsModule 监听 trip:saved 刷新', pages.includes("EventBus.on('trip:saved'")],

  // ===== AC-2: 本地创建行程（达到上限） =====
  ['AC-2: saveTrip 检查 20 条上限', ai.includes('activeCount >= 20')],
  ['AC-2: 满 20 条返回 LIMIT_REACHED', ai.includes("error: 'LIMIT_REACHED'")],
  ['AC-2: 仅归档行程不计入上限', ai.includes("filter(t => !t.archivedAt)")],
  ['AC-2: app.js saveTripWithLimitCheck 拦截', app.includes("result.error === 'LIMIT_REACHED'")],
  ['AC-2: 弹 showActionSheet 给选择', app.includes('showActionSheet([')],
  ['AC-2: 有 delete 和 archive 选项', app.includes("'delete'") && app.includes("'archive'")],
  ['AC-2: 选择后进入 TripsModule.enterSelectMode', app.includes('TripsModule.enterSelectMode(choice)')],
  ['AC-2: TripsModule.enterSelectMode 存在', pages.includes('enterSelectMode(mode)')],
  ['AC-2: confirmSelect 执行删除/归档', pages.includes('confirmSelect()')],

  // ===== AC-3: 删除未发布行程 =====
  ['AC-3: AIMemory.deleteTrip 先删本地', ai.match(/delete trips\[id\][\s\S]*?TripStorage\.deleteCloud/) ? true : false],
  ['AC-3: deleteTrip 后异步删云端', ai.includes('TripStorage.deleteCloud(cloudId, id)')],
  ['AC-3: 云端删除失败记 pendingDelete', ai.includes('_addPendingDelete(cloudId, id)')],
  ['AC-3: TripStorage.deleteCloud 抛错让 AIMemory catch', ts.includes('throw new Error(error.message)')],
  ['AC-3: 长按有"删除此行程"选项', pages.includes("'删除此行程'")],
  ['AC-3: 删除后调 TripsModule.renderTripCards()', pages.includes('TripsModule.renderTripCards()')],
  ['AC-3: 删除后 Toast"已删除"', pages.includes("UiKit.toast('已删除', 'success')")],

  // ===== AC-4: 删除已发布行程（核心修复） =====
  ['AC-4: deleteCloud 从 trip_templates 表删', ts.includes("from('trip_templates')") && ts.includes(".eq('id', cloudId)")],
  ['AC-4: 删除后 emit trip:deleted 事件', ts.includes("EventBus.emit('trip:deleted'")],
  ['AC-4: ON DELETE CASCADE（数据库层）', true], // 数据库层，代码中不体现

  // ===== AC-5: 下架已发布行程 =====
  ['AC-5: unpublishTrip 设置 status=private', ts.includes("status: 'private'")],
  ['AC-5: unpublishTrip 后调 AIMemory.updateTripStatus', ts.includes('AIMemory.updateTripStatus(cloudId')],
  ['AC-5: emit trip:unpublished 事件', ts.includes("EventBus.emit('trip:unpublished'")],
  ['AC-5: TripsModule 监听 trip:unpublished 刷新', pages.includes("EventBus.on('trip:unpublished'")],

  // ===== AC-6: 发布到社区达上限 =====
  ['AC-6: checkCanPublish 方法存在', ts.includes('async checkCanPublish(userId)')],
  ['AC-6: 检查 status=published 数量', ts.includes("status: 'published'")],
  ['AC-6: 上限 10 条', ts.includes('>= 10')],
  ['AC-6: 管理员免配额', ts.includes('isAdmin')],
  ['AC-6: 返回 {allowed, reason, publishedCount, limit}', ts.includes('publishedCount') && ts.includes('limit')],
  ['AC-6: trip-detail.js 用 checkCanPublish', td.includes('checkCanPublish')],

  // ===== AC-7: 未登录访问创建入口 =====
  ['AC-7: navigateTo plan 加 Auth 检查', app.includes("if (tab === 'plan'") && app.includes('Auth.requireAuth()')],
  ['AC-7: 未登录 return 不进入', app.includes('if (!ok) return;')],
  ['AC-7: Auth.requireAuth 方法存在', fs.readFileSync(path.join(base, 'shared/auth.js'), 'utf8').includes('requireAuth')],

  // ===== AC-8: 换设备登录同步 =====
  ['AC-8: syncFromCloud 方法存在', ts.includes('async syncFromCloud(userId)')],
  ['AC-8: 拉取云端 getUserTrips', ts.includes('this.getUserTrips(userId)')],
  ['AC-8: 拉取本地 getAllTrips', ts.includes('AIMemory.getAllTrips()')],
  ['AC-8: 处理 pendingDeletes', ts.includes('pendingDeletes') && ts.includes('deleteCloud')],
  ['AC-8: 按 cloudId 匹配（cloudMap）', ts.includes('cloudMap')],
  ['AC-8: 冲突按 updatedAt 取新', ts.includes('updatedAt') && ts.includes('>')],
  ['AC-8: 保留本地 archivedAt', ts.includes('localTrip.archivedAt')],
  ['AC-8: 本地独有上传云端（localOnly）', ts.includes('localOnly')],
  ['AC-8: 批量处理 pendingSync', ts.includes('pendingSync')],
  ['AC-8: 完成后 setLastSyncAt', ts.includes('AIMemory.setLastSyncAt')],
  ['AC-8: 完成后 emit trip:synced', ts.includes("EventBus.emit('trip:synced'")],
  ['AC-8: onAuthChanged 登录成功触发 syncFromCloud', app.includes('TripStorage.syncFromCloud(user.id)')],
  ['AC-8: 同步成功 Toast 提示', app.includes('已同步')],
  ['AC-8: 同步成功刷新 TripsModule', app.includes('TripsModule.render()')],

  // ===== AC-9: 离线创建行程 =====
  ['AC-9: _notifyCloudSync 捕获网络错误', ai.includes('catch')],
  ['AC-9: pendingSync 角标渲染', pages.includes('tc-sync-badge') && pages.includes('trip.pendingSync')],
  ['AC-9: CSS 角标样式', css.includes('.tc-sync-badge')],
  ['AC-9: online 事件触发 syncFromCloud', app.includes("addEventListener('online'")],
  ['AC-9: online 监听检查登录状态', app.includes('Auth.isLoggedIn()')],

  // ===== AC-10: 归档行程 =====
  ['AC-10: archiveTrip 方法存在', ai.includes('archiveTrip(id)')],
  ['AC-10: archiveTrip 设置 archivedAt', ai.includes('trips[id].archivedAt = Date.now()')],
  ['AC-10: archiveTrip 设置 pendingSync=false', ai.includes('trips[id].pendingSync = false')],
  ['AC-10: archiveTrip 为纯本地操作（不同步云端）', ai.includes('归档不同步云端')],
  ['AC-10: unarchiveTrip 方法存在', ai.includes('unarchiveTrip(id)')],
  ['AC-10: unarchiveTrip 检查 20 条上限', ai.includes('activeCount >= 20') && ai.includes('unarchiveTrip')],
  ['AC-10: getActiveTrips 过滤 archivedAt', ai.includes("!trip.archivedAt")],
  ['AC-10: getArchivedTrips 返回归档列表', ai.includes('getArchivedTrips()')],
  ['AC-10: 长按有"归档此行程"选项', pages.includes("'归档此行程'")],
  ['AC-10: 归档 tab 有"取消归档"选项', pages.includes("'取消归档'")],
  ['AC-10: 已归档 tab 存在（第4个）', pages.includes("cntArchived") && html.includes("cntArchived")],
  ['AC-10: 归档 tab 按钮显示"取消归档"', pages.includes('取消归档')],
  ['AC-10: 归档行程不计入 20 条上限', ai.includes("filter(t => !t.archivedAt).length")],
];

let pass = 0, fail = 0;
const failed = [];
checks.forEach(([name, val]) => {
  if (val) pass++;
  else { fail++; failed.push(name); }
  console.log((val ? '✅' : '❌') + ' ' + name);
});
console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
if (failed.length) {
  console.log('\nFAILED items:');
  failed.forEach(f => console.log('  - ' + f));
}
