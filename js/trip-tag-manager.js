/**
 * 行程标签分类管理器
 * 职责：标签 CRUD、行程-标签关联、最近删除管理
 * 存储：localStorage（trip_tags / trip_recently_deleted）
 * 依赖：AIMemory（读取/保存行程）
 */
const TripTagManager = {
    STORAGE_KEY: 'trip_tags',
    DELETED_KEY: 'trip_recently_deleted',
    RETENTION_DAYS: 7,

    // ===== 标签 CRUD =====

    getAllTags() {
        try {
            const tags = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
            return tags.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        } catch {
            return [];
        }
    },

    getTag(id) {
        if (!id) return null;
        return this.getAllTags().find(t => t.id === id) || null;
    },

    createTag(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return null;
        const tags = this.getAllTags();
        const tag = {
            id: 'tag_' + Date.now(),
            name: trimmed,
            createdAt: Date.now(),
            order: tags.length,
        };
        tags.push(tag);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tags));
        if (typeof EventBus !== 'undefined') EventBus.emit('tag:changed');
        return tag;
    },

    renameTag(id, name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return false;
        const tags = this.getAllTags();
        const tag = tags.find(t => t.id === id);
        if (!tag) return false;
        tag.name = trimmed;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tags));
        if (typeof EventBus !== 'undefined') EventBus.emit('tag:changed');
        return true;
    },

    deleteTag(id) {
        const tags = this.getAllTags().filter(t => t.id !== id);
        // 重新编号 order
        tags.forEach((t, i) => { t.order = i; });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tags));
        if (typeof EventBus !== 'undefined') EventBus.emit('tag:changed');
    },

    reorderTags(tagIds) {
        const tags = this.getAllTags();
        const reordered = tagIds.map((id, i) => {
            const tag = tags.find(t => t.id === id);
            return tag ? { ...tag, order: i } : null;
        }).filter(Boolean);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reordered));
        if (typeof EventBus !== 'undefined') EventBus.emit('tag:changed');
    },

    // ===== 行程-标签关联 =====

    setTripTag(tripId, tagId) {
        const trips = AIMemory.getAllTrips();
        if (!trips[tripId]) return false;
        trips[tripId].tagId = tagId || null;
        trips[tripId].updatedAt = new Date().toISOString();
        trips[tripId].pendingSync = true;
        localStorage.setItem(AIMemory.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        if (typeof EventBus !== 'undefined') EventBus.emit('trip:saved', { id: tripId });
        return true;
    },

    getTripsByTag(tagId) {
        return Object.values(AIMemory.getAllTrips())
            .filter(t => t.tagId === tagId);
    },

    getUntaggedTrips() {
        return Object.values(AIMemory.getAllTrips())
            .filter(t => !t.tagId);
    },

    countTripsByTag(tagId) {
        return Object.values(AIMemory.getAllTrips())
            .filter(t => t.tagId === tagId).length;
    },

    /** 删除标签时，将关联行程的 tagId 置 null */
    clearTagFromTrips(tagId) {
        const trips = AIMemory.getAllTrips();
        let changed = 0;
        Object.values(trips).forEach(t => {
            if (t.tagId === tagId) {
                t.tagId = null;
                t.updatedAt = new Date().toISOString();
                t.pendingSync = true;
                changed++;
            }
        });
        if (changed > 0) {
            localStorage.setItem(AIMemory.KEYS.TRIP_HISTORY, JSON.stringify(trips));
        }
        return changed;
    },

    // ===== 最近删除 =====

    getDeletedTrips() {
        try {
            return JSON.parse(localStorage.getItem(this.DELETED_KEY) || '[]');
        } catch {
            return [];
        }
    },

    /** 将行程从 trip_history 移入最近删除（不触发云端删除） */
    moveToDeleted(tripId, tagId) {
        const trips = AIMemory.getAllTrips();
        const trip = trips[tripId];
        if (!trip) return false;

        const deletedList = this.getDeletedTrips();
        // 深拷贝行程数据，附加删除元信息
        deletedList.push({
            ...JSON.parse(JSON.stringify(trip)),
            tagId: tagId || trip.tagId || null,
            deletedAt: Date.now(),
        });
        localStorage.setItem(this.DELETED_KEY, JSON.stringify(deletedList));

        // 从 trip_history 中直接删除（不走 AIMemory.deleteTrip，避免触发云端删除）
        delete trips[tripId];
        localStorage.setItem(AIMemory.KEYS.TRIP_HISTORY, JSON.stringify(trips));

        return true;
    },

    /** 恢复单条行程到 trip_history（tagId=null），返回是否成功 */
    restoreTrip(tripId) {
        const deletedList = this.getDeletedTrips();
        const item = deletedList.find(t => t.id === tripId);
        if (!item) return { success: false, error: '行程不存在' };

        // 检查20条上限
        const activeCount = AIMemory.getActiveCount();
        if (activeCount >= 20) {
            return { success: false, error: 'LIMIT_REACHED' };
        }

        // 移除删除元信息，恢复行程
        const tripData = { ...item };
        delete tripData.deletedAt;
        tripData.tagId = null;
        tripData.pendingSync = true;

        const trips = AIMemory.getAllTrips();
        trips[tripId] = tripData;
        localStorage.setItem(AIMemory.KEYS.TRIP_HISTORY, JSON.stringify(trips));

        // 从最近删除移除
        const remaining = deletedList.filter(t => t.id !== tripId);
        localStorage.setItem(this.DELETED_KEY, JSON.stringify(remaining));

        if (typeof EventBus !== 'undefined') EventBus.emit('trip:saved', { id: tripId });
        return { success: true, error: '' };
    },

    /** 恢复全部行程 */
    restoreAll() {
        const deletedList = this.getDeletedTrips();
        const results = { restored: 0, failed: 0, error: '' };

        for (const item of deletedList) {
            const r = this.restoreTrip(item.id);
            if (r.success) results.restored++;
            else results.failed++;
        }

        return results;
    },

    /** 永久删除单条 */
    permanentlyDelete(tripId) {
        const deletedList = this.getDeletedTrips();
        const remaining = deletedList.filter(t => t.id !== tripId);
        localStorage.setItem(this.DELETED_KEY, JSON.stringify(remaining));
    },

    /** 永久删除全部 */
    permanentlyDeleteAll() {
        localStorage.removeItem(this.DELETED_KEY);
    },

    /** 清理超过7天的删除行程，返回清理数量 */
    cleanupExpired() {
        const deletedList = this.getDeletedTrips();
        const now = Date.now();
        const RETENTION_MS = this.RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const remaining = deletedList.filter(t => (now - (t.deletedAt || 0)) < RETENTION_MS);
        const cleaned = deletedList.length - remaining.length;
        if (cleaned > 0) {
            localStorage.setItem(this.DELETED_KEY, JSON.stringify(remaining));
        }
        return cleaned;
    },

    /** 计算剩余天数 */
    getDaysRemaining(deletedAt) {
        const now = Date.now();
        const elapsed = now - (deletedAt || 0);
        const RETENTION_MS = this.RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const remaining = RETENTION_MS - elapsed;
        if (remaining <= 0) return 0;
        return Math.ceil(remaining / (24 * 60 * 60 * 1000));
    },
};

window.TripTagManager = TripTagManager;
