/**
 * 数据迁移模块
 * 职责：把 localStorage 里的行程数据导入 Supabase trip_templates 表
 * 策略：
 *   1. 检测本地 trip_history 中未迁移的行程
 *   2. 用户登录后提示迁移
 *   3. 迁移成功后标记 trip_migrated_<userId>，避免重复
 *   4. localStorage 数据保留（不删除，作为备份）
 * 依赖：lib/supabase-client.js、shared/ui-kit.js、shared/auth.js
 * 文档：specs/community-platform-upgrade/开发路线图.md（Phase 1.3）
 */
(function (global) {
  const { supabase, UiKit, EventBus } = global

  // 迁移标记前缀（每个用户独立标记）
  const MIGRATE_KEY_PREFIX = 'trip_migrated_'
  // 本地行程数据 key（与 ai-memory.js KEYS.TRIP_HISTORY 一致）
  const TRIP_HISTORY_KEY = 'trip_history'

  const StorageMigrate = {
    state: {
      migrating: false,
    },

    /**
     * 入口：检查并触发迁移
     * 应在用户登录成功后调用
     * @param {string} userId - 登录用户 ID
     */
    async checkAndMigrate(userId) {
      if (!supabase || !userId) return
      if (this.state.migrating) return

      // 立即加锁，防止重复调用弹出多个弹窗
      this.state.migrating = true

      try {
        // 检查是否已迁移过或用户已选择稍后
        const migrateKey = MIGRATE_KEY_PREFIX + userId
        const migrateStatus = localStorage.getItem(migrateKey)
        if (migrateStatus === 'done' || migrateStatus === 'dismissed') return

        // 检查本地是否有行程数据
        const localTrips = this._getLocalTrips()
        if (localTrips.length === 0) {
          // 没有本地数据，直接标记已迁移
          localStorage.setItem(migrateKey, 'done')
          return
        }

        // 提示用户迁移
        const confirmed = await UiKit.confirm(
          `检测到本地有 ${localTrips.length} 条行程，是否导入到云端？<br><span style="font-size:12px;color:#999;">导入后可在多设备访问，本地数据保留不删除</span>`,
          { title: '数据迁移', confirmText: '导入', cancelText: '稍后' }
        )
        if (!confirmed) {
          // 用户点了稍后，记住选择，不再重复提示
          localStorage.setItem(migrateKey, 'dismissed')
          return
        }

        // 执行迁移
        await this._doMigrate(localTrips, userId, migrateKey)
      } finally {
        this.state.migrating = false
      }
    },

    /**
     * 执行迁移
     * @param {Array} trips - 本地行程列表
     * @param {string} userId - 用户 ID
     * @param {string} migrateKey - 迁移标记 key
     */
    async _doMigrate(trips, userId, migrateKey) {
      this.state.migrating = true
      UiKit.showLoading('正在导入行程...')

      let success = 0
      let failed = 0
      const errors = []

      try {
        for (const trip of trips) {
          try {
            const row = this._mapTripToTemplate(trip, userId)
            const { error } = await supabase.from('trip_templates').insert(row)
            if (error) {
              console.warn('[StorageMigrate] 导入失败:', trip.title, error.message)
              failed++
              errors.push(`${trip.title || '未命名'}: ${error.message}`)
            } else {
              success++
            }
          } catch (e) {
            console.warn('[StorageMigrate] 导入异常:', trip.title, e)
            failed++
          }
        }

        // 标记已迁移（即使部分失败也标记，避免重复提示）
        localStorage.setItem(migrateKey, 'done')

        UiKit.hideLoading()

        if (success > 0 && failed === 0) {
          UiKit.toast(`成功导入 ${success} 条行程到云端`, 'success', 3000)
        } else if (success > 0 && failed > 0) {
          UiKit.toast(`导入 ${success} 条成功，${failed} 条失败`, 'info', 3000)
        } else if (success === 0 && failed > 0) {
          UiKit.toast(`导入失败，请稍后重试`, 'error', 3000)
          // 导入全部失败时不标记，允许重试
          localStorage.removeItem(migrateKey)
        }

        // 通知其他模块刷新
        EventBus.emit('migrate:done', { success, failed, userId })
      } catch (e) {
        console.error('[StorageMigrate] 迁移异常:', e)
        UiKit.hideLoading()
        UiKit.toast('迁移失败：' + e.message, 'error')
      } finally {
        this.state.migrating = false
      }
    },

    /**
     * 把本地 trip 对象映射为 trip_templates 表行
     * @param {object} trip - 本地行程对象
     * @param {string} userId - 用户 ID
     * @returns {object} trip_templates 行
     */
    _mapTripToTemplate(trip, userId) {
      // 从 dayPlans 中提取城市列表
      const cities = []
      if (Array.isArray(trip.dayPlans)) {
        trip.dayPlans.forEach((dp) => {
          if (dp.city && !cities.includes(dp.city)) cities.push(dp.city)
        })
      }
      const destination = trip.destination || cities[0] || ''

      // 人群类型映射
      const peopleMap = {
        solo: '一个人',
        couple: '情侣',
        family: '亲子',
        friends: '朋友',
        business: '商务',
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
        status: 'private', // 迁移的行程默认私有，用户可手动发布
        description: trip.description || '',
        // 保留原始创建时间
        created_at: trip.savedAt ? new Date(trip.savedAt).toISOString() : new Date().toISOString(),
      }
    },

    /**
     * 获取本地未迁移的行程列表
     * @returns {Array} 行程数组
     */
    _getLocalTrips() {
      try {
        const tripsMap = JSON.parse(localStorage.getItem(TRIP_HISTORY_KEY) || '{}')
        return Object.values(tripsMap).filter((t) => t && t.dayPlans)
      } catch {
        return []
      }
    },

    /**
     * 获取迁移状态
     * @param {string} userId
     * @returns {boolean} 是否已迁移或用户已选择稍后
     */
    isMigrated(userId) {
      const status = localStorage.getItem(MIGRATE_KEY_PREFIX + userId)
      return status === 'done' || status === 'dismissed'
    },

    /**
     * 重置迁移标记（允许重新迁移）
     * @param {string} userId
     */
    resetMigration(userId) {
      localStorage.removeItem(MIGRATE_KEY_PREFIX + userId)
    },

    /**
     * 获取本地行程数量
     */
    getLocalTripCount() {
      return this._getLocalTrips().length
    },
  }

  global.StorageMigrate = StorageMigrate
})(window)
