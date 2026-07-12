/**
 * CheckinMap - 地图打卡页面
 * 功能：地图上显示当前定位 + 附近POI，支持搜索，点击打卡
 */
(function (global) {
  'use strict';

  const CheckinMap = {
    map: null,
    currentPos: null,
    markers: [],
    nearbyPois: [],
    searchPois: [],
    activeTab: 'nearby',
    searchTimer: null,

    /**
     * 打开地图打卡页面
     */
    async open() {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof UiKit !== 'undefined') UiKit.toast('请先登录', 'info');
        if (typeof Auth !== 'undefined') Auth.requireAuth();
        return;
      }

      const page = document.getElementById('checkinMapPage');
      if (!page) return;

      page.style.display = 'flex';

      // 初始化地图
      await this._initMap();

      // 定位
      this.locate();
    },

    /**
     * 关闭页面
     */
    close() {
      const page = document.getElementById('checkinMapPage');
      if (page) page.style.display = 'none';

      // 清理地图
      if (this.map) {
        this.map.destroy();
        this.map = null;
      }
      this.markers = [];
      this.currentPos = null;
    },

    /**
     * 初始化地图
     */
    _initMap() {
      return new Promise((resolve, reject) => {
        if (this.map) {
          resolve(this.map);
          return;
        }

        let attempts = 0;
        const maxAttempts = 100;
        const checkAMap = () => {
          if (typeof AMap !== 'undefined') {
            this.map = new AMap.Map('checkinMapContainer', {
              zoom: 15,
              center: [116.397428, 39.90923],
              mapStyle: 'amap://styles/normal',
              features: ['bg', 'road', 'building', 'point'],
              viewMode: '2D',
              zoomEnable: true,
              dragEnable: true,
            });
            resolve(this.map);
          } else {
            attempts++;
            if (attempts >= maxAttempts) {
              reject(new Error('AMap SDK failed to load'));
              return;
            }
            setTimeout(checkAMap, 100);
          }
        };
        checkAMap();
      });
    },

    /**
     * 定位到当前位置
     */
    async locate() {
      const content = document.getElementById('checkinSheetContent');
      if (content) content.innerHTML = '<div class="checkin-loading">定位中...</div>';

      try {
        const pos = await this._getCurrentPosition();
        if (!pos) {
          if (content) content.innerHTML = '<div class="checkin-empty">定位失败，请检查定位权限</div>';
          return;
        }

        this.currentPos = pos;

        // 移动地图到当前位置
        if (this.map) {
          this.map.setCenter([pos.lng, pos.lat]);
          this.map.setZoom(16);
        }

        // 添加当前位置标记
        this._addCurrentLocationMarker(pos);

        // 搜索附近POI
        this._searchNearby(pos);
      } catch (e) {
        console.error('[CheckinMap] 定位失败:', e);
        if (content) content.innerHTML = '<div class="checkin-empty">定位失败，请重试</div>';
      }
    },

    /**
     * 获取当前位置
     */
    _getCurrentPosition() {
      return new Promise((resolve) => {
        if (typeof AmapHelper !== 'undefined' && AmapHelper.getCurrentPosition) {
          AmapHelper.getCurrentPosition(10000).then(pos => {
            if (pos) {
              resolve({ lng: pos.longitude || pos.lng, lat: pos.latitude || pos.lat });
            } else {
              resolve(null);
            }
          }).catch(() => resolve(null));
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lng: p.coords.longitude, lat: p.coords.latitude }),
            () => resolve(null),
            { timeout: 10000, enableHighAccuracy: true }
          );
        } else {
          resolve(null);
        }
      });
    },

    /**
     * 添加当前位置标记
     */
    _addCurrentLocationMarker(pos) {
      if (!this.map) return;

      // 清除旧的
      if (this._currentMarker) {
        this._currentMarker.setMap(null);
      }

      // 创建蓝色圆点 + 外圈脉冲效果
      const marker = new AMap.Marker({
        position: [pos.lng, pos.lat],
        offset: new AMap.Pixel(-12, -12),
        content: `
          <div style="position:relative;">
            <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(255,138,61,0.2);top:-14px;left:-14px;animation:pulse 2s ease-in-out infinite;"></div>
            <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#FF8A3D,#FF6B00);border:3px solid #fff;box-shadow:0 2px 8px rgba(255,107,0,0.4);"></div>
          </div>
        `,
      });
      marker.setMap(this.map);
      this._currentMarker = marker;
    },

    /**
     * 搜索附近POI
     */
    async _searchNearby(pos) {
      const content = document.getElementById('checkinSheetContent');
      if (!content) return;

      if (this.activeTab !== 'nearby') return;

      content.innerHTML = '<div class="checkin-loading">加载附近地点...</div>';

      try {
        let pois = [];
        if (typeof AmapHelper !== 'undefined' && AmapHelper.aroundSearch) {
          pois = await AmapHelper.aroundSearch([pos.lng, pos.lat], {
            keywords: '景点|公园|美食|购物|娱乐',
            radius: 2000,
            pageSize: 20,
          });
        } else if (typeof AMap !== 'undefined' && AMap.PlaceSearch) {
          pois = await new Promise((resolve) => {
            AMap.plugin('AMap.PlaceSearch', () => {
              const placeSearch = new AMap.PlaceSearch({
                pageSize: 20,
                pageIndex: 1,
                extensions: 'base',
              });
              placeSearch.searchNearBy('景点|美食|购物', [pos.lng, pos.lat], 2000, (status, result) => {
                if (status === 'complete' && result.poiList) {
                  resolve(result.poiList.pois || []);
                } else {
                  resolve([]);
                }
              });
            });
          });
        }

        this.nearbyPois = pois || [];
        this._renderPoiList(this.nearbyPois);
        this._renderPoiMarkers(this.nearbyPois);
      } catch (e) {
        console.error('[CheckinMap] 附近POI搜索失败:', e);
        content.innerHTML = '<div class="checkin-empty">加载失败，请重试</div>';
      }
    },

    /**
     * 搜索POI
     */
    search(keyword) {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this._doSearch(keyword);
      }, 400);
    },

    _doSearch(keyword) {
      const content = document.getElementById('checkinSheetContent');
      if (!content) return;

      // 切换到搜索tab
      this.switchTab('search');

      if (!keyword.trim()) {
        content.innerHTML = '<div class="checkin-empty">输入关键词搜索地点</div>';
        this._clearPoiMarkers();
        return;
      }

      content.innerHTML = '<div class="checkin-loading">搜索中...</div>';

      const doSearch = async () => {
        try {
          let pois = [];
          if (typeof AmapHelper !== 'undefined' && AmapHelper.searchPOI) {
            pois = await AmapHelper.searchPOI(keyword, { pageSize: 20 });
          } else if (typeof AMap !== 'undefined' && AMap.PlaceSearch) {
            pois = await new Promise((resolve) => {
              AMap.plugin('AMap.PlaceSearch', () => {
                const placeSearch = new AMap.PlaceSearch({
                  pageSize: 20,
                  pageIndex: 1,
                  extensions: 'base',
                  city: '全国',
                });
                placeSearch.search(keyword, (status, result) => {
                  if (status === 'complete' && result.poiList) {
                    resolve(result.poiList.pois || []);
                  } else {
                    resolve([]);
                  }
                });
              });
            });
          }

          this.searchPois = pois || [];
          this._renderPoiList(this.searchPois);
          this._renderPoiMarkers(this.searchPois);

          if (this.searchPois.length > 0 && this.map) {
            const first = this.searchPois[0];
            const lng = first.lng || first.location?.lng;
            const lat = first.lat || first.location?.lat;
            if (lng && lat) {
              this.map.setCenter([lng, lat]);
              this.map.setZoom(15);
            }
          }
        } catch (e) {
          console.error('[CheckinMap] 搜索失败:', e);
          content.innerHTML = '<div class="checkin-empty">搜索失败，请重试</div>';
        }
      };

      doSearch();
    },

    /**
     * 切换tab
     */
    switchTab(tab) {
      this.activeTab = tab;

      // 更新tab样式
      document.querySelectorAll('.checkin-sheet-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });

      // 渲染对应内容
      if (tab === 'nearby') {
        if (this.nearbyPois.length > 0) {
          this._renderPoiList(this.nearbyPois);
          this._renderPoiMarkers(this.nearbyPois);
        } else if (this.currentPos) {
          this._searchNearby(this.currentPos);
        }
      } else if (tab === 'search') {
        if (this.searchPois.length > 0) {
          this._renderPoiList(this.searchPois);
          this._renderPoiMarkers(this.searchPois);
        } else {
          const content = document.getElementById('checkinSheetContent');
          if (content) content.innerHTML = '<div class="checkin-empty">输入关键词搜索地点</div>';
          this._clearPoiMarkers();
        }
      }
    },

    /**
     * 渲染POI列表
     */
    _renderPoiList(pois) {
      const content = document.getElementById('checkinSheetContent');
      if (!content) return;

      if (!pois || pois.length === 0) {
        content.innerHTML = '<div class="checkin-empty">未找到相关地点</div>';
        return;
      }

      content.innerHTML = pois.map((p, i) => {
        const name = p.name || '未命名';
        const addr = p.address || '';
        const lng = p.lng || p.location?.lng || 0;
        const lat = p.lat || p.location?.lat || 0;
        const dist = p.distance ? (p.distance > 1000 ? (p.distance / 1000).toFixed(1) + 'km' : p.distance + 'm') : '';

        return `
          <div class="checkin-poi-card" data-idx="${i}">
            <div class="checkin-poi-card-icon">📍</div>
            <div class="checkin-poi-card-info">
              <div class="checkin-poi-card-name">${name}</div>
              <div class="checkin-poi-card-addr">${addr}${dist ? ' · ' + dist : ''}</div>
            </div>
            <button class="checkin-poi-card-btn">打卡</button>
          </div>
        `;
      }).join('');

      // 绑定点击
      content.querySelectorAll('.checkin-poi-card').forEach(card => {
        card.onclick = () => {
          const idx = parseInt(card.dataset.idx, 10);
          const poi = pois[idx];
          if (poi) {
            const lng = poi.lng || poi.location?.lng;
            const lat = poi.lat || poi.location?.lat;
            if (lng && lat && this.map) {
              this.map.setCenter([lng, lat]);
            }
            this._checkinPoi(poi);
          }
        };
      });
    },

    /**
     * 渲染POI标记
     */
    _renderPoiMarkers(pois) {
      this._clearPoiMarkers();

      if (!this.map || !pois || pois.length === 0) return;

      pois.forEach((p, i) => {
        const lng = p.lng || p.location?.lng;
        const lat = p.lat || p.location?.lat;
        if (!lng || !lat) return;

        const marker = new AMap.Marker({
          position: [lng, lat],
          offset: new AMap.Pixel(-10, -28),
          content: `
            <div style="position:relative;cursor:pointer;" data-marker-idx="${i}">
              <div style="background:#fff;border:2px solid #FF8A3D;border-radius:50% 50% 50% 0;padding:4px 6px;font-size:11px;font-weight:600;color:#FF8A3D;white-space:nowrap;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                <span style="display:inline-block;transform:rotate(45deg);">📍</span>
              </div>
            </div>
          `,
        });

        marker.on('click', () => {
          this._checkinPoi(p);
        });

        marker.setMap(this.map);
        this.markers.push(marker);
      });
    },

    /**
     * 清除POI标记
     */
    _clearPoiMarkers() {
      this.markers.forEach(m => m.setMap(null));
      this.markers = [];
    },

    /**
     * 打卡POI
     */
    _checkinPoi(poi) {
      if (typeof CheckinAction === 'undefined') {
        if (typeof UiKit !== 'undefined') UiKit.toast('打卡模块未加载', 'error');
        return;
      }

      const lng = poi.lng || poi.location?.lng;
      const lat = poi.lat || poi.location?.lat;

      // 判断是否可以实地打卡
      let type = 'cloud';
      if (this.currentPos && lng && lat) {
        const dist = this._calcDistance(
          this.currentPos.lng, this.currentPos.lat,
          lng, lat
        );
        if (dist <= 500) {
          type = 'field';
        }
      }

      // 调用打卡确认
      if (CheckinAction._confirmCheckin) {
        CheckinAction._confirmCheckin(poi, type, this.currentPos);
      }
    },

    /**
     * 计算两点距离（米）
     */
    _calcDistance(lng1, lat1, lng2, lat2) {
      const radLat1 = lat1 * Math.PI / 180;
      const radLat2 = lat2 * Math.PI / 180;
      const a = radLat1 - radLat2;
      const b = lng1 * Math.PI / 180 - lng2 * Math.PI / 180;
      let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
      s = s * 6378.137;
      s = Math.round(s * 10000) / 10;
      return s;
    },
  };

  global.CheckinMap = CheckinMap;
})(window);
