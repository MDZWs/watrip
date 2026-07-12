/**
 * 行程存储模块
 * 职责：实时云端存储 + 配额检查 + 离线缓存 + 审核提交
 * 策略：
 *   1. 云端为主存储，localStorage 作离线缓存
 *   2. 新建行程前检查配额（基础 3，审核通过 +2）
 *   3. 保存时先写云端，成功后更新本地缓存
 *   4. 读取时优先云端，失败降级 localStorage
 * 依赖：lib/supabase-client.js、shared/ui-kit.js、shared/auth.js
 * 文档：specs/community-platform-upgrade/database-schema.sql
 */
(function (global) {
  const { supabase, UiKit, EventBus } = global

  const TripStorage = {
    state: {
      initialized: false,
    },

    init() {
      this.state.initialized = true
    },

    // ========== 发布配额管理 ==========

    /**
     * 检查是否可以发布到社区（社区发布上限 10 条，管理员不限）
     * @param {string} userId
     * @returns {Promise<{allowed: boolean, reason: string, publishedCount: number, limit: number}>}
     */
    async checkCanPublish(userId) {
      if (!supabase || !userId) return { allowed: false, reason: '未登录', publishedCount: 0, limit: 10 }
      if (typeof Auth !== 'undefined' && Auth.isAdmin()) {
        return { allowed: true, reason: '', publishedCount: 0, limit: 999 }
      }
      try {
        const { count, error } = await supabase
          .from('trip_templates')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', userId)
          .eq('status', 'published')
        const publishedCount = count || 0
        if (publishedCount >= 10) {
          return { allowed: false, reason: '社区发布上限 10 条，请先下架或删除已发布行程', publishedCount, limit: 10 }
        }
        return { allowed: true, reason: '', publishedCount, limit: 10 }
      } catch (e) {
        console.error('[TripStorage] 检查发布配额失败:', e)
        return { allowed: true, reason: '', publishedCount: 0, limit: 10 }
      }
    },

    // ========== 云端同步存储 ==========

    /**
     * 同步行程到云端（新建或更新）
     * 职责：仅管云端 CRUD，本地存储由 AIMemory 统一管理
     * @param {object} trip - 行程对象（含 cloudId 则 update，无则 insert）
     * @param {string} userId - 用户 ID
     * @returns {Promise<{success: boolean, id: string|null, updatedAt: string, synced: boolean, error: string}>}
     */
    async syncToCloud(trip, userId) {
      if (!userId || !supabase) {
        return { success: false, id: null, updatedAt: '', synced: false, error: '未登录或 Supabase 未就绪' }
      }
      const row = this._mapTripToRow(trip, userId)
      const now = new Date().toISOString()
      try {
        // 有 cloudId → 更新
        if (trip.cloudId) {
          const { data, error } = await supabase
            .from('trip_templates')
            .update({
              title: row.title,
              day_plans: row.day_plans,
              days: row.days,
              destination: row.destination,
              city: row.city,
              budget: row.budget,
              suitable_for: row.suitable_for,
              updated_at: now,
            })
            .eq('id', trip.cloudId)
            .eq('author_id', userId)
            .select('id, updated_at')
            .single()
          if (!error) {
            EventBus.emit('trip:saved', { trip, cloudId: data.id, isNew: false })
            return { success: true, id: data.id, updatedAt: data.updated_at || now, synced: true, error: '' }
          }
          // 更新失败可能是行不存在，降级到 insert
        }

        // 新建插入
        const { data, error } = await supabase
          .from('trip_templates')
          .insert(row)
          .select('id, updated_at')
          .single()
        if (error) {
          console.error('[TripStorage] 云端同步失败:', error.message)
          return { success: false, id: null, updatedAt: '', synced: false, error: error.message }
        }

        EventBus.emit('trip:saved', { trip, cloudId: data.id, isNew: true })
        // Phase 3.3：首次保存到云端触发新手任务
        if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('first_save')
        return { success: true, id: data.id, updatedAt: data.updated_at || now, synced: true, error: '' }
      } catch (e) {
        console.error('[TripStorage] 同步异常:', e)
        return { success: false, id: null, updatedAt: '', synced: false, error: e.message }
      }
    },

    /**
     * 获取单个行程（仅查云端，本地查询由 AIMemory 负责）
     * @param {string} cloudId - 云端 ID
     * @returns {Promise<object|null>}
     */
    async getTrip(cloudId) {
      if (!supabase) return null
      try {
        const { data, error } = await supabase
          .from('trip_templates')
          .select('id, title, destination, city, days, budget, day_plans, suitable_for, status, author_id, likes, copies, created_at, updated_at')
          .eq('id', cloudId)
          .single()
        if (error || !data) {
          console.warn('[TripStorage] 云端查询行程失败:', error?.message || '无数据')
          return null
        }
        return this._mapRowToTrip(data)
      } catch (e) {
        console.warn('[TripStorage] 云端查询行程异常:', e.message)
        return null
      }
    },

    /**
     * 获取用户所有行程（仅查云端，本地查询由 AIMemory 负责）
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async getUserTrips(userId) {
      if (!supabase || !userId) return []
      try {
        const { data, error } = await supabase
          .from('trip_templates')
          .select('id, title, destination, city, days, budget, day_plans, suitable_for, status, created_at, updated_at')
          .eq('author_id', userId)
          .order('updated_at', { ascending: false })
        if (error || !data) return []
        return data.map((row) => this._mapRowToTrip(row))
      } catch {
        return []
      }
    },

    /**
     * 删除云端行程（本地删除由 AIMemory 负责）
     * 失败时抛错，让 AIMemory 记 pendingDelete 等待补删
     * @param {string} cloudId - 云端 ID
     * @param {string} localId - 本地 ID（用于事件通知，可选）
     * @returns {Promise<{success: boolean, error: string}>}
     */
    async deleteCloud(cloudId, localId) {
      if (!cloudId || !supabase) {
        return { success: false, error: '参数缺失或 Supabase 未就绪' }
      }
      const { error } = await supabase.from('trip_templates').delete().eq('id', cloudId)
      if (error) {
        throw new Error(error.message) // 抛错让 AIMemory 记 pendingDelete
      }
      EventBus.emit('trip:deleted', { cloudId, localId })
      return { success: true, error: '' }
    },

    // ========== 智能合并同步 ==========

    /**
     * 云端 → 本地智能合并（换设备登录 / 联网时触发）
     * 算法：按 cloudId 匹配，updatedAt 取新，保留本地 archivedAt
     * @param {string} userId
     * @returns {Promise<{merged: number, uploaded: number, deleted: number}>}
     */
    async syncFromCloud(userId) {
      if (!userId || !supabase) {
        return { merged: 0, uploaded: 0, deleted: 0 }
      }

      try {
        // 1. 拉取云端全部行程
        const cloudTrips = await this.getUserTrips(userId)
        const cloudMap = new Map()
        cloudTrips.forEach(t => cloudMap.set(t.cloudId, t))

        // 2. 拉取本地全部行程
        const localTrips = typeof AIMemory !== 'undefined' ? AIMemory.getAllTrips() : {}
        const localByCloudId = new Map()
        const localOnly = [] // 本地独有（无 cloudId）

        Object.values(localTrips).forEach(t => {
          if (t.cloudId) localByCloudId.set(t.cloudId, t)
          else localOnly.push(t)
        })

        // 3. 处理 pendingDelete：云端有但本地已标记删除的，从云端删
        const pendingDeletes = typeof AIMemory !== 'undefined' ? AIMemory.getPendingDeletes() : []
        let deleted = 0
        for (const pd of pendingDeletes) {
          if (cloudMap.has(pd.cloudId)) {
            try {
              await this.deleteCloud(pd.cloudId, pd.localId)
              cloudMap.delete(pd.cloudId)
              deleted++
            } catch (e) {
              console.warn('[TripStorage] 补删失败:', pd.cloudId, e?.message)
            }
          }
        }
        if (typeof AIMemory !== 'undefined') AIMemory.clearPendingDeletes()

        // 4. 智能合并：云端为主遍历
        const mergeResults = []
        cloudTrips.forEach(cloudTrip => {
          const localTrip = localByCloudId.get(cloudTrip.cloudId)
          if (!localTrip) {
            // 云端有本地无：下载到本地
            mergeResults.push({ action: 'download', trip: cloudTrip })
          } else {
            // 两端都有：按 updatedAt 取新
            const localUpdated = new Date(localTrip.updatedAt || localTrip.savedAt || 0).getTime()
            const cloudUpdated = new Date(cloudTrip.updatedAt).getTime()
            if (cloudUpdated > localUpdated) {
              // 云端新：用云端覆盖本地（保留本地 archivedAt，归档不跨设备同步）
              const archivedAt = localTrip.archivedAt
              mergeResults.push({ action: 'update_local', trip: { ...cloudTrip, archivedAt } })
            } else if (localUpdated > cloudUpdated) {
              // 本地新：上传本地覆盖云端
              mergeResults.push({ action: 'update_cloud', trip: localTrip })
            }
            // 时间相等：不动
          }
        })

        // 5. 本地独有：上传云端
        localOnly.forEach(localTrip => {
          mergeResults.push({ action: 'upload', trip: localTrip })
        })

        // 6. 执行合并
        let merged = 0, uploaded = 0
        for (const r of mergeResults) {
          try {
            if (r.action === 'download' || r.action === 'update_local') {
              if (typeof AIMemory !== 'undefined') AIMemory.applyCloudTrip(r.trip)
              merged++
            } else if (r.action === 'update_cloud' || r.action === 'upload') {
              const result = await this.syncToCloud(r.trip, userId)
              if (result.success && result.id && typeof AIMemory !== 'undefined') {
                AIMemory.updateCloudId(r.trip.id, result.id, result.updatedAt)
                uploaded++
              }
            }
          } catch (e) {
            console.warn('[TripStorage] 合并单条失败:', r.action, e?.message)
          }
        }

        // 7. 批量处理 pendingSync 的行程（离线创建后联网）
        if (typeof AIMemory !== 'undefined') {
          const pendingSyncTrips = AIMemory.getPendingSyncTrips()
          for (const trip of pendingSyncTrips) {
            try {
              const result = await this.syncToCloud(trip, userId)
              if (result.success) {
                AIMemory.markSynced(trip.id, result.id, result.updatedAt)
              }
            } catch (e) {
              console.warn('[TripStorage] 补传失败:', trip.id, e?.message)
            }
          }
          AIMemory.setLastSyncAt(Date.now())
        }

        EventBus.emit('trip:synced', { merged, uploaded, deleted })
        return { merged, uploaded, deleted }
      } catch (e) {
        console.error('[TripStorage] syncFromCloud 异常:', e)
        return { merged: 0, uploaded: 0, deleted: 0 }
      }
    },

    // ========== 发布到社区 ==========

    /**
     * 发布行程到社区
     * @param {string} cloudId - 云端 ID
     * @param {string} userId - 用户 ID
     * @returns {Promise<{success: boolean, error: string}>}
     */
    async publishTrip(cloudId, userId, customTags) {
      if (!supabase || !cloudId) return { success: false, error: '参数缺失' }
      try {
        const updateData = { status: 'published', updated_at: new Date().toISOString() }
        // Phase 5.5：发布时一并写入专属标签（Lv6 特权）；仅在传入非空数组时更新，避免覆盖已有标签
        if (Array.isArray(customTags) && customTags.length > 0) {
          updateData.custom_tags = customTags
        }
        const { error } = await supabase
          .from('trip_templates')
          .update(updateData)
          .eq('id', cloudId)
          .eq('author_id', userId)
        if (error) {
          return { success: false, error: error.message }
        }
        EventBus.emit('trip:published', { cloudId, userId })
        // Phase 3.3：发布行程触发新手任务
        if (typeof NewbieTasks !== 'undefined') NewbieTasks.trigger('publish_trip')
        return { success: true, error: '' }
      } catch (e) {
        console.error('[TripStorage] 发布失败:', e)
        return { success: false, error: e.message }
      }
      // Phase 5.2：发布行程触发道具掉落
      try { if (typeof Items !== 'undefined') Items.tryDrop('publish_trip'); } catch(e) {}
    },

    /**
     * 取消发布（下架）
     */
    async unpublishTrip(cloudId, userId) {
      if (!supabase || !cloudId) return { success: false, error: '参数缺失' }
      try {
        const { error } = await supabase
          .from('trip_templates')
          .update({ status: 'private', updated_at: new Date().toISOString() })
          .eq('id', cloudId)
          .eq('author_id', userId)
        if (error) return { success: false, error: error.message }
        // 同步更新本地状态（下架仅改 status，不删数据）
        if (typeof AIMemory !== 'undefined') AIMemory.updateTripStatus(cloudId, 'private')
        EventBus.emit('trip:unpublished', { cloudId, userId })
        return { success: true, error: '' }
      } catch (e) {
        return { success: false, error: e.message }
      }
    },

    /**
     * 获取行程发布信息（状态 + 互动数据 + 审核状态）
     * @param {string} cloudId
     * @returns {Promise<object>}
     */
    async getPublishInfo(cloudId) {
      if (!supabase || !cloudId) return { status: 'private', likes: 0, favorites: 0, copies: 0, reviewStatus: 'none' }
      try {
        const { data, error } = await supabase
          .from('trip_templates')
          .select('status, likes, favorites, copies')
          .eq('id', cloudId)
          .single()
        if (error || !data) return { status: 'private', likes: 0, favorites: 0, copies: 0, reviewStatus: 'none' }

        // 查询审核状态
        let reviewStatus = 'none'
        try {
          const { data: review } = await supabase
            .from('template_reviews')
            .select('status')
            .eq('template_id', cloudId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (review) reviewStatus = review.status
        } catch {}

        return {
          status: data.status || 'private',
          likes: data.likes || 0,
          favorites: data.favorites || 0,
          copies: data.copies || 0,
          reviewStatus,
        }
      } catch {
        return { status: 'private', likes: 0, favorites: 0, copies: 0, reviewStatus: 'none' }
      }
    },

    // ========== 审核自动触发（彩蛋机制） ==========

    /**
     * 检查并自动触发审核
     * 规则：发布到社区 + 点赞+收藏+采纳 ≥ 10 → 自动提交审核
     * 审核通过后 profiles.storage_quota += 2
     * 应在 PointsCore.onLiked/onFavorited/onAdopted 后调用
     * @param {string} templateId - 行程模板 ID
     * @param {string} authorId - 行程作者 ID
     */
    async _checkAndAutoSubmitReview(templateId, authorId) {
      if (!supabase || !templateId || !authorId) return
      try {
        const info = await this.getPublishInfo(templateId)
        // 仅已发布的行程才检查
        if (info.status !== 'published') return
        // 已审核过（无论通过/拒绝）的不重复触发
        if (info.reviewStatus !== 'none') return

        const totalEngagement = info.likes + info.favorites + info.copies
        // 阈值：总互动数 ≥ 10
        if (totalEngagement < 10) return

        // 自动创建审核记录
        const { error } = await supabase.from('template_reviews').insert({
          template_id: templateId,
          author_id: authorId,
          status: 'pending',
          review_note: `自动触发：点赞${info.likes}+收藏${info.favorites}+采纳${info.copies}=${totalEngagement}`,
        })
        if (!error) {
          console.log('[TripStorage] 自动触发审核:', templateId)
          EventBus.emit('review:auto_triggered', { templateId, authorId })
        }
      } catch (e) {
        console.warn('[TripStorage] 审核检查失败:', e)
      }
    },

    /**
     * 获取审核状态
     */
    async getReviewStatus(templateId) {
      if (!supabase) return { status: 'none' }
      try {
        const { data } = await supabase
          .from('template_reviews')
          .select('status, quality_score, review_note, created_at')
          .eq('template_id', templateId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        return data || { status: 'none' }
      } catch {
        return { status: 'none' }
      }
    },

    // ========== 管理员审核 ==========

    /**
     * 获取待审核列表（管理员用）
     * @param {string} status - pending/approved/rejected
     * @returns {Promise<Array>}
     */
    async getReviewList(status = 'pending') {
      if (!supabase) return []
      try {
        const { data, error } = await supabase
          .from('template_reviews')
          .select(`
            id, status, quality_score, review_note, created_at, reviewed_at,
            template_id, author_id,
            trip_templates(title, destination, days, day_plans),
            profiles:author_id(username, avatar_url)
          `)
          .eq('status', status)
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) {
          console.error('[TripStorage] 获取审核列表失败:', error.message)
          return []
        }
        return data || []
      } catch (e) {
        console.error('[TripStorage] 获取审核列表异常:', e)
        return []
      }
    },

    /**
     * 审核操作（管理员用）
     * @param {string} reviewId - 审核记录 ID
     * @param {string} action - approve/reject
     * @param {string} reviewerId - 审核人 ID
     * @param {number} score - 质量评分 1-5
     * @param {string} note - 审核备注
     * @returns {Promise<{success: boolean, error: string}>}
     */
    async reviewAction(reviewId, action, reviewerId, score = 3, note = '') {
      if (!supabase) return { success: false, error: '系统未就绪' }
      try {
        const newStatus = action === 'approve' ? 'approved' : 'rejected'
        // 1. 更新审核记录
        const { data: review, error: e1 } = await supabase
          .from('template_reviews')
          .update({
            status: newStatus,
            quality_score: score,
            review_note: note,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', reviewId)
          .select('template_id, author_id')
          .single()
        if (e1) return { success: false, error: e1.message }

        // 2. 如果通过，给作者 +2 配额
        if (action === 'approve' && review?.author_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('storage_quota')
            .eq('id', review.author_id)
            .single()
          if (profile) {
            await supabase
              .from('profiles')
              .update({ storage_quota: profile.storage_quota + 2 })
              .eq('id', review.author_id)
          }
          // 给作者发通知
          EventBus.emit('review:approved', {
            templateId: review.template_id,
            authorId: review.author_id,
            bonus: 2,
          })
        }

        return { success: true, error: '' }
      } catch (e) {
        console.error('[TripStorage] 审核操作异常:', e)
        return { success: false, error: e.message }
      }
    },

    // ========== 字段映射 ==========

    _mapTripToRow(trip, userId) {
      const cities = []
      if (Array.isArray(trip.dayPlans)) {
        trip.dayPlans.forEach((dp) => {
          if (dp.city && !cities.includes(dp.city)) cities.push(dp.city)
        })
      }
      const destination = trip.destination || cities[0] || ''
      const peopleMap = {
        solo: '一个人', couple: '情侣', family: '亲子',
        friends: '朋友', business: '商务',
      }
      return {
        author_id: userId,
        title: trip.title || `${destination}行程`,
        destination: destination,
        city: cities[0] || destination,
        days: trip.days || (Array.isArray(trip.dayPlans) ? trip.dayPlans.length : 1),
        budget: trip.budget || null,
        day_plans: trip.dayPlans || [],
        suitable_for: trip.people ? [peopleMap[trip.people] || trip.people] : [],
        status: 'private',
      }
    },

    _mapRowToTrip(row) {
      // 防御性解析 day_plans
      let dayPlans = row.day_plans || [];
      if (typeof dayPlans === 'string') {
        try { dayPlans = JSON.parse(dayPlans); } catch (e) { dayPlans = []; }
      }
      if (!Array.isArray(dayPlans)) dayPlans = [];

      // 确保每个 dayPlan 都有 spots 数组
      // 兼容旧格式：如果有 items 字段但没有 spots，将 items 转换为 spots
      dayPlans = dayPlans.map(dp => {
        if (!dp || typeof dp !== 'object') return { spots: [] };
        // 兼容 items 字段（旧格式）
        if ((!dp.spots || !Array.isArray(dp.spots) || dp.spots.length === 0)
            && dp.items && Array.isArray(dp.items) && dp.items.length > 0) {
          dp.spots = dp.items.map(item => ({
            name: item.name || '',
            type: item.type || '景点',
            intro: item.desc || item.intro || '',
            lng: item.lng || null,
            lat: item.lat || null,
            address: item.address || '',
            rating: item.rating || (item.biz_ext && item.biz_ext.rating) || null,
            photos: item.photos || [],
            emoji: item.emoji || '',
            duration: item.duration || 60,
            startMin: item.startMin || null,
            endMin: item.endMin || null,
            time: item.time || '',
          }));
        }
        if (!dp.spots || !Array.isArray(dp.spots)) dp.spots = [];
        return dp;
      });

      return {
        id: row.id,
        cloudId: row.id,
        author_id: row.author_id,
        title: row.title,
        destination: row.destination,
        city: row.city,
        days: row.days,
        budget: row.budget,
        dayPlans: dayPlans,
        people: row.suitable_for?.[0] || '',
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        savedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      };
    },

  }

  global.TripStorage = TripStorage
})(window)
