/**
 * 高德地图 API 纯封装层
 * 职责：POI 搜索、地理编码、逆地理、路径规划、POI 图片获取
 * 特点：不依赖地图实例，供社区模块（checkin、travel-note 等）独立调用
 * 依赖：高德 JS SDK（index.html 引入）、js/config.js
 * 文档：specs/community-platform-upgrade/技术栈.md、项目结构.md
 *
 * 与 js/map.js 的区别：
 *   - map.js 含地图实例、marker、polyline 等 UI 逻辑，服务行程规划页
 *   - amap-helper.js 是纯 API 层，无 UI，服务社区模块
 */
(function (global) {
  const CONFIG = global.CONFIG || {}

  // 内存缓存（同 map.js 的 geocodeCache 思路）
  const cache = new Map()
  const cacheKey = (prefix, ...parts) => prefix + '_' + parts.map(p => String(p)).join('_')

  // 等待高德 SDK 加载完成
  function _waitForAMap(maxWait = 5000) {
    return new Promise((resolve) => {
      if (global.AMap) return resolve(global.AMap)
      const start = Date.now()
      const timer = setInterval(() => {
        if (global.AMap) {
          clearInterval(timer)
          resolve(global.AMap)
        } else if (Date.now() - start > maxWait) {
          clearInterval(timer)
          console.warn('[AmapHelper] 高德SDK加载失败，启用本地POI降级模式')
          resolve(null)
        }
      }, 100)
    })
  }

  // 距离计算（公里，Haversine 公式）
  function _haversine(lng1, lat1, lng2, lat2) {
    const R = 6371
    const toRad = (d) => (d * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(a))
  }

  // ========== POI 搜索 ==========

  /**
   * 按关键词搜索 POI（含评分、图片、地址等扩展信息）
   * @param {string} keyword - 搜索关键词
   * @param {object} opts - { city, pageSize, citylimit }
   * @returns {Promise<Array>} POI 列表
   */
  async function searchPOI(keyword, opts = {}) {
    if (!keyword) return []
    const AMap = await _waitForAMap()
    const city = opts.city || '全国'
    const pageSize = opts.pageSize || 10
    const ck = cacheKey('poi', keyword, city, pageSize)
    if (cache.has(ck)) return cache.get(ck)

    if (!AMap) {
      const results = global.PoiSeedData ? global.PoiSeedData.searchPOI(keyword, { city, pageSize }) : []
      cache.set(ck, results)
      return results
    }

    return new Promise((resolve) => {
      AMap.plugin(['AMap.PlaceSearch'], () => {
        const ps = new AMap.PlaceSearch({
          pageSize,
          pageIndex: 1,
          extensions: 'all',
          city,
          citylimit: opts.citylimit !== false,
        })
        ps.search(keyword, (status, result) => {
          const list = []
          if (status === 'complete' && result.poiList && result.poiList.pois) {
            result.poiList.pois.forEach((poi) => {
              if (!poi.location) return
              list.push({
                name: poi.name,
                address: poi.address || '',
                lng: parseFloat(poi.location.lng),
                lat: parseFloat(poi.location.lat),
                type: poi.type || '',
                rating: poi.biz_ext && poi.biz_ext.rating ? parseFloat(poi.biz_ext.rating) : 0,
                cost: poi.biz_ext && poi.biz_ext.cost ? parseFloat(poi.biz_ext.cost) : 0,
                tel: poi.tel || '',
                photos: (poi.photos || []).map((p) => ({ url: p.url, title: p.title })),
                cityname: poi.cityname || '',
                adname: poi.adname || '',
                poi_id: poi.id || '',
              })
            })
          }
          cache.set(ck, list)
          resolve(list)
        })
      })
    })
  }

  /**
   * 搜索附近 POI（带硬性距离过滤 <20km + 距离升序 Top5）
   * 符合项目硬约束：后端代码实现距离过滤和排序，确定性输出
   * @param {number} lng - 中心点经度
   * @param {number} lat - 中心点纬度
   * @param {string} category - food/hotel/scenic/experience
   * @param {number} radius - 搜索半径（米），默认 20000
   * @returns {Promise<Array>} Top5 POI 列表
   */
  async function searchNearbyPOI(lng, lat, category = 'scenic', radius = 20000) {
    const AMap = await _waitForAMap()
    if (!AMap) return []
    const ck = cacheKey('nearby', lng.toFixed(3), lat.toFixed(3), category, radius)
    if (cache.has(ck)) return cache.get(ck)

    const categoryMap = {
      food: '美食|餐厅|小吃|特色菜|老字号',
      hotel: '酒店|宾馆|民宿|住宿',
      scenic: '景点|风景区|名胜古迹|博物馆|古镇',
      experience: '茶馆|相声|非遗|市集|体验馆|艺术馆|咖啡馆|文艺',
    }
    const keywords = categoryMap[category] || '景点|美食'

    return new Promise((resolve) => {
      AMap.plugin(['AMap.PlaceSearch'], () => {
        const ps = new AMap.PlaceSearch({
          pageSize: 25,
          pageIndex: 1,
          extensions: 'all',
        })
        ps.searchNearBy(keywords, [lng, lat], radius, (status, result) => {
          if (status !== 'complete' || !result.poiList || !result.poiList.pois) {
            resolve([])
            return
          }
          // 硬性距离过滤 <20km + 同名去重保留最近的
          const seen = new Map()
          result.poiList.pois.forEach((poi) => {
            if (!poi.location) return
            const dist = _haversine(lng, lat, poi.location.lng, poi.location.lat)
            if (dist > 20) return
            const name = poi.name
            if (!seen.has(name) || dist < seen.get(name)._dist) {
              seen.set(name, { poi, _dist: dist })
            }
          })
          let list = Array.from(seen.values()).map((item) => {
            const poi = item.poi
            return {
              name: poi.name,
              address: poi.address || '',
              lng: parseFloat(poi.location.lng),
              lat: parseFloat(poi.location.lat),
              distance: Math.round(item._dist * 10) / 10,
              rating: poi.biz_ext && poi.biz_ext.rating ? parseFloat(poi.biz_ext.rating) : 0,
              cost: poi.biz_ext && poi.biz_ext.cost ? parseFloat(poi.biz_ext.cost) : 0,
              tel: poi.tel || '',
              type: poi.type || '',
              category,
              photos: (poi.photos || []).map((p) => ({ url: p.url, title: p.title })),
              poi_id: poi.id || '',
            }
          })
          // 后端代码排序：景点按距离升序，其他按评分加权
          if (category === 'scenic') {
            list.sort((a, b) => a.distance - b.distance)
          } else {
            list.sort((a, b) => b.rating * 3 - b.distance * 0.3 - (a.rating * 3 - a.distance * 0.3))
          }
          list = list.slice(0, 5) // Top5 确定性输出
          cache.set(ck, list)
          resolve(list)
        })
      })
    })
  }

  // ========== 地理编码 ==========

  /**
   * 地理编码：地址/景点名 → 坐标 + 详情
   * 带评分机制：优先城市/区域匹配 + 接近市中心
   * @param {string} city - 城市
   * @param {string} name - 地点名称
   * @returns {Promise<object|null>} { lng, lat, address, photos, biz_ext, ... }
   */
  async function geocode(city, name) {
    if (!name) return null
    const ck = cacheKey('geo', city, name)
    if (cache.has(ck)) return cache.get(ck)

    const AMap = await _waitForAMap()

    if (!AMap) {
      const result = global.PoiSeedData ? global.PoiSeedData.geocodeSpot(city, name) : null
      cache.set(ck, result)
      return result
    }

    // 先用 PlaceSearch 精确搜索（含 photos、biz_ext）
    const pois = await searchPOI(name, { city, pageSize: 10, citylimit: true })
    if (pois.length === 0) {
      // 降级到 Geocoder
      return new Promise((resolve) => {
        AMap.plugin(['AMap.Geocoder'], () => {
          const gc = new AMap.Geocoder({ city: city || '全国' })
          gc.getLocation(name, (status, result) => {
            if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
              const g = result.geocodes[0]
              const data = {
                lng: g.location.lng,
                lat: g.location.lat,
                address: g.formattedAddress || name,
                photos: [],
                biz_ext: {},
                tel: '',
                type: '',
                cityname: g.addressComponent && g.addressComponent.city ? g.addressComponent.city : '',
                adname: g.addressComponent && g.addressComponent.district ? g.addressComponent.district : '',
              }
              cache.set(ck, data)
              resolve(data)
            } else {
              resolve(null)
            }
          })
        })
      })
    }

    // 评分机制：优先城市/区域匹配 + 接近市中心
    const cityCenter = await getCityCenter(city)
    let best = null
    let bestScore = -Infinity
    pois.forEach((poi) => {
      let score = 0
      // 城市匹配加分
      if (city && poi.cityname && poi.cityname.includes(city.substring(0, 2))) score += 50
      if (city && poi.adname && poi.adname.includes(city.substring(0, 2))) score += 20
      // 评分加分
      if (poi.rating) score += poi.rating * 2
      // 接近市中心加分（距离越近分越高）
      if (cityCenter) {
        const dist = _haversine(cityCenter.lng, cityCenter.lat, poi.lng, poi.lat)
        score += Math.max(0, 30 - dist)
      }
      if (score > bestScore) {
        bestScore = score
        best = poi
      }
    })
    cache.set(ck, best)
    return best
  }

  /**
   * 逆地理编码：坐标 → 地址
   * @param {number} lng
   * @param {number} lat
   * @returns {Promise<object|null>} { address, city, district, province }
   */
  async function reverseGeocode(lng, lat) {
    const ck = cacheKey('revgeo', lng.toFixed(4), lat.toFixed(4))
    if (cache.has(ck)) return cache.get(ck)
    const AMap = await _waitForAMap()
    if (!AMap) return null

    return new Promise((resolve) => {
      AMap.plugin(['AMap.Geocoder'], () => {
        const gc = new AMap.Geocoder({ city: '全国' })
        gc.getAddress([lng, lat], (status, result) => {
          if (status === 'complete' && result.regeocode) {
            const re = result.regeocode
            const comp = re.addressComponent
            const data = {
              address: re.formattedAddress || '',
              province: comp.province || '',
              city: Array.isArray(comp.city) ? (comp.city[0] || '') : (comp.city || ''),
              district: Array.isArray(comp.district) ? (comp.district[0] || '') : (comp.district || ''),
              township: comp.township || '',
            }
            cache.set(ck, data)
            resolve(data)
          } else {
            resolve(null)
          }
        })
      })
    })
  }

  /**
   * 获取城市中心点坐标
   * @param {string} city
   * @returns {Promise<object|null>} { lng, lat }
   */
  async function getCityCenter(city) {
    if (!city) return null
    const ck = cacheKey('citycenter', city)
    if (cache.has(ck)) return cache.get(ck)
    const AMap = await _waitForAMap()

    if (!AMap) {
      const result = global.PoiSeedData ? global.PoiSeedData.getCityCenter(city) : null
      cache.set(ck, result)
      return result
    }

    return new Promise((resolve) => {
      AMap.plugin(['AMap.Geocoder'], () => {
        const gc = new AMap.Geocoder({ city: '全国' })
        gc.getLocation(city, (status, result) => {
          if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
            const g = result.geocodes[0]
            const data = { lng: g.location.lng, lat: g.location.lat }
            cache.set(ck, data)
            resolve(data)
          } else {
            resolve(null)
          }
        })
      })
    })
  }

  // ========== 路径规划 ==========

  /**
   * 获取两点间路径信息（距离 + 耗时）
   * @param {number} fromLng
   * @param {number} fromLat
   * @param {number} toLng
   * @param {number} toLat
   * @param {string} mode - driving/walking/riding/transfer
   * @returns {Promise<object|null>} { distance, duration, mode }
   */
  async function getRoute(fromLng, fromLat, toLng, toLat, mode = 'walking') {
    const AMap = await _waitForAMap()
    if (!AMap) return null

    const policyMap = {
      driving: () => new AMap.Driving({ map: null, autoFitView: false, policy: AMap.DrivingPolicy.LEAST_TIME }),
      walking: () => new AMap.Walking({ map: null, autoFitView: false }),
      riding: () => new AMap.Riding({ map: null, autoFitView: false, policy: AMap.RidingPolicy.FASTEST }),
      transfer: () => new AMap.Transfer({ map: null, autoFitView: false, city: '全国' }),
    }
    const planner = policyMap[mode]
    if (!planner) return null

    return new Promise((resolve) => {
      AMap.plugin([`AMap.${mode.charAt(0).toUpperCase() + mode.slice(1)}`], () => {
        const p = planner()
        const from = new AMap.LngLat(fromLng, fromLat)
        const to = new AMap.LngLat(toLng, toLat)
        p.search(from, to, (status, result) => {
          if (status !== 'complete' || !result.routes || result.routes.length === 0) {
            resolve(null)
            return
          }
          const route = result.routes[0]
          resolve({
            distance: route.distance, // 米
            duration: route.time, // 秒
            mode,
          })
        })
      })
    })
  }

  // ========== POI 图片 ==========

  /**
   * 获取 POI 图片（从搜索结果中提取）
   * @param {string} name - POI 名称
   * @param {string} city - 城市
   * @param {number} limit - 最多返回几张
   * @returns {Promise<Array>} [{ url, title }]
   */
  async function getPOIPhotos(name, city, limit = 5) {
    const pois = await searchPOI(name, { city, pageSize: 5, citylimit: true })
    const photos = []
    pois.forEach((poi) => {
      if (poi.photos && poi.photos.length > 0) {
        poi.photos.forEach((p) => {
          if (photos.length < limit) photos.push(p)
        })
      }
    })
    return photos
  }

  // ========== GPS 定位 ==========

  /**
   * 获取当前 GPS 位置（实地打卡用）
   * @param {number} timeout - 超时毫秒
   * @returns {Promise<object|null>} { lng, lat, accuracy }
   */
  function getCurrentPosition(timeout = 10000) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            accuracy: pos.coords.accuracy,
          })
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout, maximumAge: 0 }
      )
    })
  }

  /**
   * 校验 GPS 位置是否在 POI 附近（500m 内为实地打卡）
   * @param {number} poiLng
   * @param {number} poiLat
   * @param {number} userLng
   * @param {number} userLat
   * @param {number} threshold - 阈值（米），默认 500
   * @returns {boolean}
   */
  function isNearby(poiLng, poiLat, userLng, userLat, threshold = 500) {
    const distKm = _haversine(poiLng, poiLat, userLng, userLat)
    return distKm * 1000 <= threshold
  }

  // 导出
  global.AmapHelper = {
    searchPOI,
    searchNearbyPOI,
    geocode,
    reverseGeocode,
    getCityCenter,
    getRoute,
    getPOIPhotos,
    getCurrentPosition,
    isNearby,
    // 暴露内部方法供测试
    _haversine,
    _clearCache: () => cache.clear(),
  }
})(window)
