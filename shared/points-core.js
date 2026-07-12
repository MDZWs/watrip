/**
 * 积分系统核心
 * 职责：积分增减原子操作、UV 去重、防刷校验、经验灌入
 * 依赖：lib/supabase-client.js、shared/ui-kit.js、shared/auth.js
 * 文档：specs/community-platform-upgrade/产品概述.md（积分权重章节）
 *
 * 积分权重（产品概述确认）：
 *   - 被看 +1 / 被点赞 +3 / 被收藏 +5 / 被采纳(模板化) +10 / 被关注 +15
 *   - UV 去重：每用户每天每内容只计一次
 *
 * 打卡积分：
 *   - 实地 +3 / 云 +1 / 吐槽 +5 / 吐槽被点赞 +2 / 吐槽被收藏 +3
 *   - 防刷：每 POI 24h 1 次打卡，每日最多 5 个 POI
 *
 * 违规零容忍：吐槽被举报违规确认 → 作者 -30 积分
 * 积分→经验：1 积分 = 1 经验，等级曲线递减
 */
(function (global) {
  const { supabase, UiKit, EventBus } = global

  // 积分权重常量（与产品概述对齐）
  const POINT_WEIGHTS = {
    viewed: 1,        // 被看
    liked: 3,         // 被点赞
    favorited: 5,     // 被收藏
    adopted: 10,      // 被采纳（模板化）
    followed: 15,     // 被关注
    // 打卡相关
    checkin_field: 3, // 实地打卡
    checkin_cloud: 1, // 云打卡
    roast: 5,         // 发吐槽
    roast_liked: 2,   // 吐槽被点赞
    roast_favorited: 3, // 吐槽被收藏
    // 违规
    violation: -30,   // 违规零容忍
  }

  // 等级曲线：累计经验达到阈值即升级，越往后越慢
  // Lv1→2: 100, Lv2→3: 300, Lv3→4: 600, Lv4→5: 1000, Lv5→6: 1500...
  // 公式：lv_n_threshold = 50 * n * (n-1) （n 为目标等级）
  function _levelThreshold(level) {
    return 50 * level * (level - 1)
  }

  // 根据总经验计算当前等级
  function _calcLevel(totalExp) {
    let lv = 1
    while (lv < 100 && totalExp >= _levelThreshold(lv + 1)) lv++
    return lv
  }

  // target_type 枚举
  const TARGET_TYPES = {
    TEMPLATE: 'trip_template',
    NOTE: 'travel_note',
    ROAST: 'roast',
    CHECKIN: 'checkin',
    USER: 'user',
  }

  const PointsCore = {
    state: {
      initialized: false,
    },

    // 初始化（目前无需特殊初始化，预留）
    init() {
      this.state.initialized = true
    },

    // ========== 核心：积分增减（原子操作） ==========

    /**
     * 增减积分（内部核心方法）
     * @param {string} userId - 接收积分的用户 ID
     * @param {number} delta - 积分变化（正数增加，负数扣减）
     * @param {string} reason - 原因（如 'liked' / 'checkin_field' / 'violation'）
     * @param {object} target - { id, type } 目标内容
     * @returns {Promise<boolean>} 是否成功
     */
    async _addPoints(userId, delta, reason, target = {}) {
      if (!supabase || !userId) return false
      try {
        // 1. 写入积分流水
        const { error: ledgerError } = await supabase
          .from('point_ledger')
          .insert({
            user_id: userId,
            delta,
            reason,
            target_id: target.id || null,
            target_type: target.type || null,
          })
        if (ledgerError) {
          console.error('[PointsCore] 写入 point_ledger 失败:', ledgerError.message)
          return false
        }

        // 2. 更新 profiles.points（累加）
        // 注意：前端无法做真正的原子事务，这里用 select-then-update 模拟
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('points, exp, level')
          .eq('id', userId)
          .single()
        if (profileError || !profile) {
          console.error('[PointsCore] 读取 profiles 失败:', profileError?.message)
          return false
        }

        const newPoints = Math.max(0, (profile.points || 0) + delta)
        const updates = { points: newPoints }

        // 3. 积分→经验灌入（1 积分 = 1 经验，仅正积分灌入经验）
        if (delta > 0) {
          const newExp = (profile.exp || 0) + delta
          updates.exp = newExp
          // 检查升级
          const newLevel = _calcLevel(newExp)
          if (newLevel > (profile.level || 1)) {
            updates.level = newLevel
            // 写入经验流水
            await supabase.from('exp_ledger').insert({
              user_id: userId,
              delta,
              reason,
            })
            // 升级通知
            EventBus.emit('level:up', { userId, newLevel, oldLevel: profile.level })
            UiKit.toast(`🎉 恭升 Lv.${newLevel}！`, 'success', 3000)
          } else {
            // 仅记录经验流水
            await supabase.from('exp_ledger').insert({
              user_id: userId,
              delta,
              reason,
            })
          }
        } else if (delta < 0) {
          // 负积分（违规扣分）：经验也扣减，但不低于 0
          const newExp = Math.max(0, (profile.exp || 0) + delta)
          updates.exp = newExp
          await supabase.from('exp_ledger').insert({
            user_id: userId,
            delta,
            reason,
          })
        }

        // 4. 更新 profiles
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
        if (updateError) {
          console.error('[PointsCore] 更新 profiles 失败:', updateError.message)
          return false
        }

        // 5. 通知积分变化
        EventBus.emit('points:changed', { userId, delta, reason, newPoints: updates.points })
        return true
      } catch (e) {
        console.error('[PointsCore] _addPoints 异常:', e)
        return false
      }
    },

    // ========== UV 去重 ==========

    /**
     * UV 去重检查：每用户每天每内容只计一次
     * @param {string} viewerId - 浏览者 ID
     * @param {string} targetId - 目标内容 ID
     * @param {string} targetType - 目标类型
     * @returns {Promise<boolean>} true=未去过（可计分），false=已去过（不计分）
     */
    async _checkUV(viewerId, targetId, targetType) {
      if (!supabase) return false
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const { data, error } = await supabase
        .from('views')
        .select('id')
        .eq('user_id', viewerId)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('viewed_date', today)
        .limit(1)
      if (error) {
        console.warn('[PointsCore] UV 检查失败:', error.message)
        return false
      }
      return !data || data.length === 0
    },

    /**
     * 记录 UV（写入 views 表）
     */
    async _recordUV(viewerId, targetId, targetType) {
      if (!supabase) return
      const today = new Date().toISOString().slice(0, 10)
      await supabase.from('views').insert({
        user_id: viewerId,
        target_id: targetId,
        target_type: targetType,
        viewed_date: today,
      })
    },

    // ========== 内容互动积分（带 UV 去重） ==========

    /**
     * 被浏览（+1，UV 去重）
     * @param {string} authorId - 内容作者 ID（接收积分的人）
     * @param {string} viewerId - 浏览者 ID
     * @param {string} targetId - 内容 ID
     * @param {string} targetType - 内容类型
     */
    async onViewed(authorId, viewerId, targetId, targetType) {
      if (authorId === viewerId) return false // 自己看自己不计分
      const isUnique = await this._checkUV(viewerId, targetId, targetType)
      if (!isUnique) return false
      await this._recordUV(viewerId, targetId, targetType)
      return this._addPoints(authorId, POINT_WEIGHTS.viewed, 'viewed', { id: targetId, type: targetType })
    },

    /**
     * 被点赞（+3，不去重，允许取消点赞时扣回）
     */
    async onLiked(authorId, targetId, targetType) {
      const result = this._addPoints(authorId, POINT_WEIGHTS.liked, 'liked', { id: targetId, type: targetType })
      // 彩蛋：互动达阈值自动触发审核
      if (targetType === TARGET_TYPES.TEMPLATE && typeof TripStorage !== 'undefined') {
        TripStorage._checkAndAutoSubmitReview(targetId, authorId)
      }
      return result
    },

    /**
     * 被收藏（+5）
     */
    async onFavorited(authorId, targetId, targetType) {
      const result = this._addPoints(authorId, POINT_WEIGHTS.favorited, 'favorited', { id: targetId, type: targetType })
      if (targetType === TARGET_TYPES.TEMPLATE && typeof TripStorage !== 'undefined') {
        TripStorage._checkAndAutoSubmitReview(targetId, authorId)
      }
      return result
    },

    /**
     * 被采纳/模板化（+10）
     */
    async onAdopted(authorId, targetId, targetType) {
      const result = this._addPoints(authorId, POINT_WEIGHTS.adopted, 'adopted', { id: targetId, type: targetType })
      if (targetType === TARGET_TYPES.TEMPLATE && typeof TripStorage !== 'undefined') {
        TripStorage._checkAndAutoSubmitReview(targetId, authorId)
      }
      return result
    },

    /**
     * 被关注（+15）
     */
    async onFollowed(authorId, followerId) {
      return this._addPoints(authorId, POINT_WEIGHTS.followed, 'followed', { id: followerId, type: TARGET_TYPES.USER })
    },

    // ========== 打卡积分（带防刷） ==========

    /**
     * 打卡积分（实地+3 / 云+1）
     * 防刷：每 POI 24h 1 次，每日最多 5 个 POI
     * @param {string} userId - 打卡用户
     * @param {string} poiId - POI ID
     * @param {boolean} isField - 是否实地打卡
     */
    async onCheckin(userId, poiId, isField) {
      if (!supabase) return false
      // 防刷检查
      const canCheckin = await this._checkCheckinAntiSpam(userId, poiId)
      if (!canCheckin.allowed) {
        UiKit.toast(canCheckin.reason, 'info')
        return false
      }
      const delta = isField ? POINT_WEIGHTS.checkin_field : POINT_WEIGHTS.checkin_cloud
      return this._addPoints(userId, delta, isField ? 'checkin_field' : 'checkin_cloud', {
        id: poiId,
        type: TARGET_TYPES.CHECKIN,
      })
    },

    /**
     * 发吐槽（+5）
     */
    async onRoastPosted(userId, roastId) {
      return this._addPoints(userId, POINT_WEIGHTS.roast, 'roast', { id: roastId, type: TARGET_TYPES.ROAST })
    },

    /**
     * 吐槽被点赞（+2）
     */
    async onRoastLiked(authorId, roastId) {
      return this._addPoints(authorId, POINT_WEIGHTS.roast_liked, 'roast_liked', { id: roastId, type: TARGET_TYPES.ROAST })
    },

    /**
     * 吐槽被收藏（+3）
     */
    async onRoastFavorited(authorId, roastId) {
      return this._addPoints(authorId, POINT_WEIGHTS.roast_favorited, 'roast_favorited', { id: roastId, type: TARGET_TYPES.ROAST })
    },

    // ========== 防刷校验 ==========

    /**
     * 打卡防刷：每 POI 24h 1 次，每日最多 5 个 POI
     * @returns {Promise<{allowed: boolean, reason: string}>}
     */
    async _checkCheckinAntiSpam(userId, poiId) {
      if (!supabase) return { allowed: false, reason: '系统未就绪' }
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

      // 1. 检查该 POI 24h 内是否已打卡
      const { data: recentCheckin } = await supabase
        .from('checkins')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('poi_id', poiId)
        .gte('created_at', yesterday)
        .limit(1)
      if (recentCheckin && recentCheckin.length > 0) {
        return { allowed: false, reason: '该地点 24 小时内已打卡' }
      }

      // 2. 检查今日打卡数是否已达上限 5
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const { count } = await supabase
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart)
      if (count && count >= 5) {
        return { allowed: false, reason: '今日打卡数已达上限（5 个）' }
      }

      return { allowed: true, reason: '' }
    },

    // ========== 违规处理 ==========

    /**
     * 违规扣分（零容忍：-30 积分）
     * @param {string} userId - 违规用户
     * @param {string} contentId - 违规内容 ID
     * @param {string} contentType - 内容类型
     */
    async onViolation(userId, contentId, contentType) {
      const ok = await this._addPoints(userId, POINT_WEIGHTS.violation, 'violation', {
        id: contentId,
        type: contentType,
      })
      if (ok) {
        EventBus.emit('violation:penalty', { userId, delta: POINT_WEIGHTS.violation })
      }
      return ok
    },

    // ========== 查询 ==========

    /**
     * 获取用户积分流水
     * @param {string} userId
     * @param {number} limit
     * @param {number} page
     */
    async getPointLedger(userId, limit = 20, page = 1) {
      if (!supabase) return []
      const from = (page - 1) * limit
      const to = from + limit - 1
      const { data, error } = await supabase
        .from('point_ledger')
        .select('delta, reason, target_id, target_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) {
        console.error('[PointsCore] 查询积分流水失败:', error.message)
        return []
      }
      return data || []
    },

    /**
     * 获取用户等级信息
     * @param {string} userId
     * @returns {Promise<object|null>} { level, exp, points, nextLevelExp, progress }
     */
    async getUserLevelInfo(userId) {
      if (!supabase) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('level, exp, points')
        .eq('id', userId)
        .single()
      if (error || !data) return null

      const currentLevel = data.level || 1
      const currentLevelExp = _levelThreshold(currentLevel)
      const nextLevelExp = _levelThreshold(currentLevel + 1)
      const progress = data.exp - currentLevelExp
      const totalNeeded = nextLevelExp - currentLevelExp

      return {
        level: currentLevel,
        exp: data.exp || 0,
        points: data.points || 0,
        nextLevelExp,
        progress,
        totalNeeded,
        progressPercent: Math.min(100, Math.round((progress / totalNeeded) * 100)),
      }
    },

    // ========== 工具方法 ==========

    // 获取积分权重常量（供 UI 展示）
    getWeights() {
      return { ...POINT_WEIGHTS }
    },

    // 获取等级阈值
    getLevelThreshold(level) {
      return _levelThreshold(level)
    },

    // 根据经验算等级
    calcLevel(exp) {
      return _calcLevel(exp)
    },
  }

  global.PointsCore = PointsCore
})(window)
