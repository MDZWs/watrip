const MapModule = {
    map: null,
    markers: [],
    routePolylines: [],
    placeSearch: null,
    driving: null,
    walking: null,
    riding: null,
    transfer: null,
    geocoder: null,
    geocodeCache: new Map(),
    cityCenterCache: new Map(),
    initPromise: null,
    fallbackMode: false,
    _amapError: false,

    _timeout(ms, fallbackValue) {
        return new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms));
    },

    _enableFallback() {
        if (this.fallbackMode) return;
        console.warn('[MapModule] 高德地图API不可用，启用本地POI降级模式');
        this.fallbackMode = true;
        this._amapError = true;
    },

    init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise((resolve, reject) => {
            if (this.map) { resolve(this.map); return; }
            if (this.fallbackMode) { resolve(null); return; }
            
            let attempts = 0;
            const maxAttempts = 50;
            let pluginTimeout = null;
            
            const checkAMap = () => {
                if (typeof AMap !== 'undefined') {
                    try {
                        this.map = new AMap.Map('map', {
                            zoom: 12,
                            center: [CONFIG.DEFAULT_CENTER.lng, CONFIG.DEFAULT_CENTER.lat],
                            mapStyle: 'amap://styles/normal',
                            features: ['bg', 'road', 'building', 'point'],
                            viewMode: '2D',
                        });

                        this.map.on('error', () => {
                            this._enableFallback();
                        });
                    } catch (e) {
                        this._enableFallback();
                        resolve(null);
                        return;
                    }
                    
                    pluginTimeout = setTimeout(() => {
                        this._enableFallback();
                        resolve(null);
                    }, 5000);

                    try {
                        AMap.plugin(['AMap.PlaceSearch', 'AMap.Driving', 'AMap.Walking', 'AMap.Riding', 'AMap.Transfer', 'AMap.Geocoder'], () => {
                            if (pluginTimeout) clearTimeout(pluginTimeout);
                            if (this.fallbackMode) {
                                resolve(null);
                                return;
                            }
                            try {
                                this.placeSearch = new AMap.PlaceSearch({
                                    pageSize: 10,
                                    pageIndex: 1,
                                    extensions: 'all',
                                    city: '全国',
                                    citylimit: false,
                                });
                                this.driving = new AMap.Driving({ map: null, autoFitView: false, policy: AMap.DrivingPolicy.LEAST_TIME });
                                this.walking = new AMap.Walking({ map: null, autoFitView: false });
                                this.riding = new AMap.Riding({ map: null, autoFitView: false, policy: AMap.RidingPolicy.FASTEST });
                                this.transfer = new AMap.Transfer({ map: null, autoFitView: false, city: '全国' });
                                this.geocoder = new AMap.Geocoder({ city: '全国' });
                                resolve(this.map);
                            } catch (e) {
                                this._enableFallback();
                                resolve(null);
                            }
                        });
                    } catch (e) {
                        if (pluginTimeout) clearTimeout(pluginTimeout);
                        this._enableFallback();
                        resolve(null);
                    }
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        this._enableFallback();
                        resolve(null);
                        return;
                    }
                    setTimeout(checkAMap, 100);
                }
            };
            checkAMap();
        });
        
        return this.initPromise;
    },

    async calcRoute(from, to, mode) {
        await this.init()
        
        return new Promise((resolve) => {
            let service
            if (mode === 'driving') service = this.driving
            else if (mode === 'walking') service = this.walking
            else if (mode === 'riding') service = this.riding
            else if (mode === 'transit') {
                resolve({ success: false, distance: 0, time: 0, path: [] })
                return
            }
            
            if (!service) {
                resolve({ success: false, distance: 0, time: 0, path: [] })
                return
            }

            service.search(
                new AMap.LngLat(from.lng, from.lat),
                new AMap.LngLat(to.lng, to.lat),
                (status, result) => {
                    if (status === 'complete' && result.routes && result.routes.length > 0) {
                        const paths = []
                        const route = result.routes[0]
                        if (route.steps) {
                            route.steps.forEach(step => {
                                if (step.path) {
                                    step.path.forEach(p => paths.push([p.lng, p.lat]))
                                }
                            })
                        }
                        resolve({
                            success: true,
                            distance: route.distance || 0,
                            time: route.time || 0,
                            path: paths
                        })
                    } else {
                        resolve({ success: false, distance: 0, time: 0, path: [] })
                    }
                }
            )
        })
    },

    estimateRoute(distKm, mode) {
        const factors = {
            walking: { speedKmh: 5, factor: 1.2 },
            riding: { speedKmh: 14, factor: 1.25 },
            driving: { speedKmh: 40, factor: 1.4 },
            transit: { speedKmh: 16, factor: 1.5 }
        }
        
        const config = factors[mode] || factors.driving
        const actualDist = distKm * config.factor
        const distance = Math.round(actualDist * 1000)
        let timeMin = (actualDist / config.speedKmh) * 60
        if (mode === 'transit') timeMin += 10;
        if (mode === 'driving' && actualDist < 3) timeMin += 5;
        const time = Math.round(timeMin * 60)
        
        return { distance, time, estimated: true }
    },

    recommendTransport(distKm) {
        if (distKm < 1.5) return 'walking'
        if (distKm < 5) return 'riding'
        return 'driving'
    },

    async getCityCenter(city) {
        if (!city) return null;
        if (this.cityCenterCache.has(city)) {
            return this.cityCenterCache.get(city);
        }

        await this.init();

        if (this.fallbackMode) {
            const center = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityCenter(city) : null;
            this.cityCenterCache.set(city, center);
            return center;
        }
        
        return Promise.race([
            new Promise((resolve) => {
                try {
                    this.geocoder.getLocation(city, (status, result) => {
                        if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                            const loc = result.geocodes[0].location;
                            const center = { lng: parseFloat(loc.lng), lat: parseFloat(loc.lat) };
                            this.cityCenterCache.set(city, center);
                            resolve(center);
                        } else {
                            this.cityCenterCache.set(city, null);
                            resolve(null);
                        }
                    });
                } catch (e) {
                    this._enableFallback();
                    const fbCenter = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityCenter(city) : null;
                    this.cityCenterCache.set(city, fbCenter);
                    resolve(fbCenter);
                }
            }),
            new Promise(resolve => setTimeout(() => {
                const fbCenter = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityCenter(city) : null;
                this.cityCenterCache.set(city, fbCenter);
                resolve(fbCenter);
            }, 5000))
        ]);
    },

    _calcDistance(lng1, lat1, lng2, lat2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    async geocodeSpot(city, spotName) {
        const cacheKey = `v2_${city}_${spotName}`;
        if (this.geocodeCache.has(cacheKey)) {
            return this.geocodeCache.get(cacheKey);
        }

        await this.init();

        if (this.fallbackMode) {
            const data = typeof PoiSeedData !== 'undefined' ? PoiSeedData.geocodeSpot(city, spotName) : null;
            this.geocodeCache.set(cacheKey, data);
            return data;
        }

        const cityCenter = await this.getCityCenter(city);
        const cityPrefix = city ? city.substring(0, 2) : '';

        return new Promise((resolve) => {
            const selectBestPoi = (pois) => {
                if (!pois || pois.length === 0) return null;
                
                let bestPoi = null;
                let bestScore = -Infinity;
                let hasCityMatch = false;

                pois.forEach(poi => {
                    const loc = poi.location;
                    const poiLng = parseFloat(loc.lng);
                    const poiLat = parseFloat(loc.lat);
                    let score = 0;
                    
                    const address = (poi.address || '') + (poi.pname || '') + (poi.cityname || '') + (poi.adname || '');
                    
                    if (city && city.length > 0) {
                        let cityMatched = false;
                        if (poi.cityname && (poi.cityname === city || poi.cityname.includes(city) || city.includes(poi.cityname))) {
                            score += 2000;
                            cityMatched = true;
                        }
                        if (poi.adname && (poi.adname.includes(city) || city.includes(poi.adname))) {
                            score += 800;
                            cityMatched = true;
                        }
                        if (address.includes(city) || address.includes(cityPrefix)) {
                            score += 500;
                            cityMatched = true;
                        }
                        if (poi.pname && (poi.pname.includes(city) || city.includes(poi.pname))) {
                            score += 600;
                            cityMatched = true;
                        }
                        if (!cityMatched) {
                            score -= 5000;
                        } else {
                            hasCityMatch = true;
                        }
                    }
                    
                    if (cityCenter) {
                        const dist = this._calcDistance(cityCenter.lng, cityCenter.lat, poiLng, poiLat);
                        if (dist < 50) {
                            score += 300 - dist;
                        } else if (dist < 200) {
                            score += 100 - dist / 2;
                        } else {
                            score -= dist / 10;
                        }
                    }
                    
                    if (poi.name === spotName) {
                        score += 500;
                    } else if (poi.name && poi.name.includes(spotName)) {
                        score += 200;
                    } else if (spotName.includes(poi.name)) {
                        score += 100;
                    }
                    
                    if (poi.type && /风景名胜|公园|景点/.test(poi.type)) {
                        score += 50;
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestPoi = poi;
                    }
                });

                if (bestPoi && cityCenter) {
                    const loc = bestPoi.location;
                    const bestLng = parseFloat(loc.lng);
                    const bestLat = parseFloat(loc.lat);
                    const dist = this._calcDistance(cityCenter.lng, cityCenter.lat, bestLng, bestLat);
                    if (dist > 200) {
                        console.warn('[MapModule] geocode结果距离城市中心过远，可能城市名不正确：', city, spotName, Math.round(dist) + 'km');
                        bestPoi = null;
                    }
                }

                return bestPoi;
            };

            const doSearch = (retry = 0) => {
                const searchCity = (retry === 0 && city && city.length > 0) ? city : '全国';
                const localPlaceSearch = new AMap.PlaceSearch({
                    pageSize: 10,
                    pageIndex: 1,
                    extensions: 'all',
                    city: searchCity,
                    citylimit: retry === 0,
                });
                localPlaceSearch.search(spotName, (status, result) => {
                    if (status === 'complete' && result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                        let poi = selectBestPoi(result.poiList.pois);
                        
                        if (!poi && retry < 1) {
                            doSearch(retry + 1);
                            return;
                        }
                        
                        if (!poi) {
                            resolve(null);
                            return;
                        }
                        
                        const location = poi.location;
                        const data = {
                            lng: parseFloat(location.lng),
                            lat: parseFloat(location.lat),
                            name: poi.name,
                            id: poi.id || '',
                            poi_id: poi.id || '',
                            address: poi.address || '',
                            photos: poi.photos || [],
                            biz_ext: poi.biz_ext || {},
                            tel: poi.tel || '',
                            type: poi.type || '',
                            cityname: poi.cityname || '',
                            adname: poi.adname || '',
                        };
                        this.geocodeCache.set(cacheKey, data);
                        resolve(data);
                    } else if (retry < 1) {
                        doSearch(retry + 1);
                    } else {
                        resolve(null);
                    }
                });
            };
            doSearch();
        });
    },

    async searchCityPOIs(city, prefs = []) {
        const cacheKey = `pois_${city}_${prefs.join(',')}`;
        if (this.geocodeCache.has(cacheKey)) {
            return this.geocodeCache.get(cacheKey);
        }

        await this.init();

        if (this.fallbackMode) {
            const pois = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityPOIs(city, prefs) : [];
            this.geocodeCache.set(cacheKey, pois);
            return pois;
        }

        try {
            const cityCenter = await this.getCityCenter(city);

            let prefKeywords = [];
            if (prefs.includes('food')) prefKeywords = ['美食街|特色餐厅|老字号|小吃'];
            if (prefs.includes('nature')) prefKeywords = ['风景区|自然景观|山水|公园'];
            if (prefs.includes('photo')) prefKeywords = ['网红打卡|拍照胜地|观景台'];
            if (prefs.includes('history')) prefKeywords = ['博物馆|古迹|历史遗址|古镇'];
            if (prefs.includes('shopping')) prefKeywords = ['商业街|购物中心|步行街'];
            if (prefs.includes('citywalk')) prefKeywords = ['老街|步行街|历史街区|胡同'];
            if (prefs.includes('niche')) prefKeywords = ['小众景点|文艺街区|创意园'];
            if (prefs.includes('family')) prefKeywords = ['亲子|游乐园|动物园|海洋馆'];
            if (prefs.includes('art')) prefKeywords = ['美术馆|艺术馆|展览|剧院'];
            if (prefKeywords.length === 0) prefKeywords = ['必游景点|著名景点|热门景点'];

            const allPois = [];
            const seenNames = new Set();

            let poiSearch;
            try {
                poiSearch = new AMap.PlaceSearch({
                    pageSize: 20,
                    pageIndex: 1,
                    extensions: 'all',
                    city: city,
                    citylimit: true,
                });
            } catch (e) {
                this._enableFallback();
                const pois = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityPOIs(city, prefs) : [];
                this.geocodeCache.set(cacheKey, pois);
                return pois;
            }

            const searchKeyword = (kw) => Promise.race([
                new Promise((resolve) => {
                    try {
                        poiSearch.search(kw, (status, result) => {
                            if (status === 'complete' && result.poiList && result.poiList.pois) {
                                result.poiList.pois.forEach(poi => {
                                    if (poi.name && !seenNames.has(poi.name) && poi.location) {
                                        seenNames.add(poi.name);
                                        allPois.push({
                                            name: poi.name,
                                            address: poi.address || '',
                                            lng: poi.location.lng,
                                            lat: poi.location.lat,
                                            type: poi.type || '',
                                            rating: poi.biz_ext && poi.biz_ext.rating ? parseFloat(poi.biz_ext.rating) : 0,
                                            cost: poi.biz_ext && poi.biz_ext.cost ? parseFloat(poi.biz_ext.cost) : 0,
                                            tel: poi.tel || '',
                                        });
                                    }
                                });
                            }
                            resolve();
                        });
                    } catch (e) {
                        resolve();
                    }
                }),
                new Promise(resolve => setTimeout(resolve, 4000))
            ]);

            const searches = [];
            prefKeywords.forEach(kw => searches.push(searchKeyword(kw)));
            searches.push(searchKeyword(`${city}必去景点`));
            searches.push(searchKeyword(`${city}热门景点`));

            await Promise.all(searches);

            let filtered = allPois;
            if (cityCenter) {
                filtered = allPois.filter(p => {
                    const dist = this._calcDistance(cityCenter.lng, cityCenter.lat, p.lng, p.lat);
                    return dist <= 150;
                });
            }

            if (filtered.length < 3) {
                const fbPois = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityPOIs(city, prefs) : [];
                this.geocodeCache.set(cacheKey, fbPois);
                return fbPois;
            }

            filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

            const result = filtered.slice(0, 40);
            this.geocodeCache.set(cacheKey, result);
            return result;
        } catch (e) {
            console.warn('[MapModule] searchCityPOIs失败，使用兜底数据:', e);
            const pois = typeof PoiSeedData !== 'undefined' ? PoiSeedData.getCityPOIs(city, prefs) : [];
            this.geocodeCache.set(cacheKey, pois);
            return pois;
        }
    },

    async searchNearbyPOIs(centerLng, centerLat, category, radius = 20000) {
        const cacheKey = `nearby_${centerLng.toFixed(3)}_${centerLat.toFixed(3)}_${category}`;
        if (this.geocodeCache.has(cacheKey)) {
            return this.geocodeCache.get(cacheKey);
        }

        await this.init();

        const categoryMap = {
            food: '美食|餐厅|小吃|特色菜|老字号',
            hotel: '酒店|宾馆|民宿|住宿',
            scenic: '景点|风景区|名胜古迹|博物馆|古镇',
            experience: '茶馆|相声|非遗|市集|体验馆|艺术馆|咖啡馆|文艺',
        };
        const keywords = categoryMap[category] || '景点|美食';

        return new Promise((resolve) => {
            try {
                const ps = new AMap.PlaceSearch({
                    pageSize: 25,
                    pageIndex: 1,
                    extensions: 'all',
                });

                ps.searchNearBy(keywords, [centerLng, centerLat], radius, (status, result) => {
                    try {
                        if (status !== 'complete' || !result.poiList || !result.poiList.pois) {
                            resolve([]);
                            return;
                        }

                        const seenNames = new Map();

                        result.poiList.pois.forEach(poi => {
                            if (!poi.location) return;

                            const dist = this._calcDistance(centerLng, centerLat, poi.location.lng, poi.location.lat);
                            if (dist > 20) return;

                            const name = poi.name;
                            if (!seenNames.has(name) || dist < seenNames.get(name)._dist) {
                                seenNames.set(name, { poi, _dist: dist });
                            }
                        });

                        let list = Array.from(seenNames.values()).map(item => {
                            const poi = item.poi;
                            const d = item._dist;
                            return {
                                name: poi.name,
                                address: poi.address || '',
                                lng: parseFloat(poi.location.lng),
                                lat: parseFloat(poi.location.lat),
                                distance: Math.round(d * 10) / 10,
                                rating: poi.biz_ext && poi.biz_ext.rating ? parseFloat(poi.biz_ext.rating) : 0,
                                cost: poi.biz_ext && poi.biz_ext.cost ? parseFloat(poi.biz_ext.cost) : 0,
                                tel: poi.tel || '',
                                type: poi.type || '',
                                category: category,
                            };
                        });

                        if (category === 'scenic') {
                            list.sort((a, b) => a.distance - b.distance);
                        } else {
                            list.sort((a, b) => (b.rating * 3 - b.distance * 0.3) - (a.rating * 3 - a.distance * 0.3));
                        }

                        list = list.slice(0, 5);
                        this.geocodeCache.set(cacheKey, list);
                        resolve(list);
                    } catch (e) {
                        console.warn('searchNearbyPOIs callback error:', e);
                        resolve([]);
                    }
                });
            } catch (e) {
                console.warn('searchNearbyPOIs error:', e);
                resolve([]);
            }
        });
    },

    async batchGeocode(city, spots, onProgress) {
        const results = new Array(spots.length);
        const concurrency = CONFIG.GEOCODE_CONCURRENCY;
        let completed = 0;
        
        const runBatch = async (startIdx) => {
            const promises = [];
            for (let i = startIdx; i < Math.min(startIdx + concurrency, spots.length); i++) {
                const spot = spots[i];
                promises.push(
                    this.geocodeSpot(city, spot.name).then(pos => {
                        results[i] = pos;
                        completed++;
                        if (onProgress) onProgress(completed, spots.length);
                    })
                );
            }
            await Promise.all(promises);
        };

        for (let i = 0; i < spots.length; i += concurrency) {
            await runBatch(i);
        }

        return results;
    },

    createMarkerContent(number, color) {
        const colorStyle = color || { gradient: 'linear-gradient(135deg, #FFA35C 0%, #FF8A3D 100%)', shadow: 'rgba(255, 138, 61, 0.5)' };
        return `
            <div class="marker-appear" style="position:relative;display:flex;flex-direction:column;align-items:center;">
                <div style="
                    width: 40px;
                    height: 40px;
                    background: ${colorStyle.gradient};
                    color: #fff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 17px;
                    font-weight: 800;
                    box-shadow: 0 4px 14px ${colorStyle.shadow};
                    border: 3px solid #fff;
                ">${number}</div>
                <div style="
                    width: 0;
                    height: 0;
                    border-left: 7px solid transparent;
                    border-right: 7px solid transparent;
                    border-top: 9px solid #fff;
                    margin-top: -2px;
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
                "></div>
            </div>
        `;
    },

    addMarker(position, number, color, onClick, delay = 0) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const marker = new AMap.Marker({
                    position: [position.lng, position.lat],
                    content: this.createMarkerContent(number, color),
                    offset: new AMap.Pixel(-20, -42),
                    zIndex: 100 + number,
                });
                if (onClick) {
                    marker.on('click', onClick);
                }
                marker.setMap(this.map);
                this.markers.push(marker);
                resolve(marker);
            }, delay);
        });
    },

    clearMarkers() {
        this.markers.forEach(m => m.setMap(null));
        this.markers = [];
    },

    clearRoutes() {
        this.routePolylines.forEach(r => r.setMap(null));
        this.routePolylines = [];
    },

    async drawRouteBetween(start, end, color, transport = 'driving') {
        const routeResult = await this.calcRoute(start, end, transport)
        
        if (routeResult.success && routeResult.path && routeResult.path.length >= 2) {
            const polyline = new AMap.Polyline({
                path: routeResult.path,
                strokeColor: color.main,
                strokeWeight: 5,
                strokeOpacity: 0.8,
                lineJoin: 'round',
                lineCap: 'round',
                showDir: true,
                zIndex: 50,
            })
            polyline.setMap(this.map)
            this.routePolylines.push(polyline)
            return { success: true, distance: routeResult.distance, time: routeResult.time, transport }
        } else {
            this.drawStraightLine(start, end, color)
            const distKm = this.calcDistance(start.lng, start.lat, end.lng, end.lat)
            const estimated = this.estimateRoute(distKm, transport)
            return { success: false, distance: estimated.distance, time: estimated.time, transport, estimated: true }
        }
    },

    drawStraightLine(start, end, color) {
        const polyline = new AMap.Polyline({
            path: [[start.lng, start.lat], [end.lng, end.lat]],
            strokeColor: color.main,
            strokeWeight: 5,
            strokeOpacity: 0.6,
            strokeStyle: 'dashed',
            lineJoin: 'round',
            lineCap: 'round',
            showDir: true,
            zIndex: 50,
        });
        polyline.setMap(this.map);
        this.routePolylines.push(polyline);
    },

    async drawDayRoute(daySpots, color, markerClickHandler) {
        if (daySpots.length === 0) return;

        const spotsWithPos = daySpots.filter(s => s.lng && s.lat);
        if (spotsWithPos.length === 0) return;

        const transportTextMap = {
            walking: '步行',
            riding: '骑行',
            driving: '驾车',
            transit: '公交'
        }

        for (let i = 0; i < spotsWithPos.length; i++) {
            const spot = spotsWithPos[i];
            await this.addMarker(
                { lng: spot.lng, lat: spot.lat },
                i + 1,
                color,
                () => markerClickHandler && markerClickHandler(spot),
                i * 80
            );
        }

        for (let i = 0; i < spotsWithPos.length - 1; i++) {
            const from = spotsWithPos[i];
            const to = spotsWithPos[i + 1];
            const distKm = this.calcDistance(from.lng, from.lat, to.lng, to.lat);
            
            if (!to.transportMode) {
                to.transportMode = this.recommendTransport(distKm);
            }
            const transport = to.transportMode;
            
            const routeResult = await this.drawRouteBetween(
                { lng: from.lng, lat: from.lat },
                { lng: to.lng, lat: to.lat },
                color,
                transport
            );

            const distance = routeResult.distance;
            const time = routeResult.time;
            const distKmDisplay = distance / 1000;
            const timeMin = Math.round(time / 60);
            
            to.distance = distKmDisplay < 1 
                ? Math.round(distance) + '米' 
                : distKmDisplay.toFixed(1) + 'km';
            to.travelTime = timeMin + '分钟';
            to.transportMode = transport;
            to.transport = transportTextMap[transport] || '驾车';
            
            await new Promise(r => setTimeout(r, 100));
        }
    },

    calcDistance(lng1, lat1, lng2, lat2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    fitView(padding = [50, 50, 300, 50]) {
        if (this.markers.length > 0) {
            this.map.setFitView(this.markers, false, padding);
        }
    },

    focusOnSpot(lng, lat, zoom = 15) {
        this.map.setZoomAndCenter(zoom, [lng, lat], true);
    },

    fitDaySpots(spots, padding = [60, 60, 350, 60]) {
        const positions = spots.filter(s => s.lng && s.lat).map(s => new AMap.LngLat(s.lng, s.lat));
        if (positions.length > 0) {
            this.map.setFitView(positions, false, padding);
        }
    },

    toggleFullscreen() {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (el.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    },
};