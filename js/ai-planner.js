const AIPlanner = {
    parseNaturalLanguage(text) {
        const result = {
            destinations: [],
            days: null,
            startDate: null,
            endDate: null,
            prefs: [],
        };

        const multiCityPatterns = [
            /([\u4e00-\u9fa5]{2,8})(?:→|->|—|～|~|和|与|及|、|,|，|\s+)([\u4e00-\u9fa5]{2,8})/,
            /从([\u4e00-\u9fa5]{2,8})到([\u4e00-\u9fa5]{2,8})/,
        ];
        const stopWords = ['今天', '明天', '后天', '周末', '下周', '天', '日', '月', '第一', '第二', '第三', '玩', '游', '旅', '去'];
        const isCityLike = (c) => c.length >= 2 && c.length <= 8 && !stopWords.some(w => c.includes(w));

        for (const pattern of multiCityPatterns) {
            const match = text.match(pattern);
            if (match) {
                const c1 = match[1].replace(/[的了吧啊]$/, '');
                const c2 = match[2].replace(/[的了吧啊]$/, '');
                if (isCityLike(c1) && isCityLike(c2) && c1 !== c2) {
                    result.destinations.push(c1, c2);
                    break;
                }
            }
        }

        if (result.destinations.length < 2) {
            const moreCities = text.match(/([\u4e00-\u9fa5]{2,8})(?:→|->|—|～|~|、|,|，|\s+)([\u4e00-\u9fa5]{2,8})(?:→|->|—|～|~|、|,|，|\s+)([\u4e00-\u9fa5]{2,8})/);
            if (moreCities) {
                const cities = [moreCities[1], moreCities[2], moreCities[3]]
                    .map(c => c.replace(/[的了吧啊]$/, ''))
                    .filter(c => isCityLike(c));
                if (cities.length >= 3) {
                    result.destinations = [...new Set(cities)];
                }
            }
        }

        if (result.destinations.length === 0) {
            const cityPatterns = [
                /去([\u4e00-\u9fa5]{2,8}?)([玩游旅]|$)/,
                /([\u4e00-\u9fa5]{2,8}?)(?:玩|游|旅|之|行|自由行|攻略)/,
                /^([\u4e00-\u9fa5]{2,8})$/,
            ];

            for (const pattern of cityPatterns) {
                const match = text.match(pattern);
                if (match) {
                    const city = match[1].replace(/[的了吧啊]$/, '');
                    if (isCityLike(city)) {
                        if (!result.destinations.includes(city)) {
                            result.destinations.push(city);
                        }
                        break;
                    }
                }
            }
        }

        const daysMatch = text.match(/(\d+)\s*[天日]/);
        if (daysMatch) {
            result.days = parseInt(daysMatch[1]);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (text.includes('今天')) {
            result.startDate = new Date(today);
            if (!result.days) result.days = 1;
        } else if (text.includes('明天')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            result.startDate = tomorrow;
            if (!result.days) result.days = 1;
        } else if (text.includes('后天')) {
            const dayAfter = new Date(today);
            dayAfter.setDate(dayAfter.getDate() + 2);
            result.startDate = dayAfter;
            if (!result.days) result.days = 1;
        } else if (text.includes('周末')) {
            const sat = new Date(today);
            const dayOfWeek = sat.getDay();
            const daysToSat = (6 - dayOfWeek + 7) % 7;
            sat.setDate(sat.getDate() + daysToSat);
            result.startDate = sat;
            result.days = 2;
        } else if (text.includes('下周')) {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            result.startDate = nextWeek;
            if (!result.days) result.days = 2;
        }

        if (result.startDate && result.days) {
            result.endDate = new Date(result.startDate);
            result.endDate.setDate(result.endDate.getDate() + result.days - 1);
        }

        const prefMap = {
            '美食': 'food', '吃': 'food', '吃货': 'food', '好吃': 'food',
            '经典': 'classic', '必玩': 'classic', '必去': 'classic', '打卡': 'classic',
            '小众': 'niche', '人少': 'niche', '秘境': 'niche',
            '拍照': 'photo', '出片': 'photo', '摄影': 'photo',
            '购物': 'shopping', '逛街': 'shopping', '买': 'shopping',
            'citywalk': 'citywalk', 'city walk': 'citywalk', '漫步': 'citywalk', '步行': 'citywalk',
            '自然': 'nature', '风景': 'nature', '山水': 'nature', '户外': 'nature',
            '文艺': 'art', '展览': 'art', '博物馆': 'art', '艺术': 'art',
            '历史': 'history', '古建': 'history', '古迹': 'history', '文化': 'history',
        };

        for (const [keyword, pref] of Object.entries(prefMap)) {
            if (text.includes(keyword) && !result.prefs.includes(pref)) {
                result.prefs.push(pref);
            }
        }

        return result;
    },

    async callQwenAPI(prompt, temperature = 0.3) {
        const response = await fetch(CONFIG.QWEN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + CONFIG.QWEN_API_KEY,
            },
            body: JSON.stringify({
                model: CONFIG.MODEL_NAME,
                input: {
                    messages: [
                        { role: 'system', content: '你是专业旅行规划师，只返回真实存在的景点，严格按照要求的JSON格式返回数据，不要编造任何不存在的地点。' },
                        { role: 'user', content: prompt }
                    ]
                },
                parameters: {
                    result_format: 'message',
                    temperature: temperature,
                    top_p: 0.8,
                    enable_search: true,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        let content = data.output.choices[0].message.content;
        
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }
        
        return JSON.parse(content);
    },

    async generateTrip(destinations, days, prefs, startDate, endDate, onPOILoaded) {
        let realPOIs = [];
        const poisByCity = {};
        try {
            if (typeof MapModule !== 'undefined' && MapModule.searchCityPOIs) {
                const allPois = [];
                for (const dest of destinations) {
                    try {
                        const cityPois = await MapModule.searchCityPOIs(dest, prefs);
                        poisByCity[dest] = cityPois;
                        allPois.push(...cityPois.slice(0, 5));
                    } catch (e) {
                        console.warn(`[AIPlanner] ${dest} POI搜索失败:`, e);
                    }
                }
                realPOIs = allPois;
                if (onPOILoaded) onPOILoaded(realPOIs);
            }
        } catch (e) {
            console.warn('POI搜索失败，使用无POI模式:', e);
        }

        const prompt = AIMemory.buildPlannerPrompt(destinations, days, prefs, startDate, endDate, realPOIs);

        try {
            const parsed = await this.callQwenAPI(prompt, 0.3);
            this.validateAndFixTrip(parsed, destinations, days, startDate, realPOIs);
            this.enrichTripData(parsed, destinations.join('、'), days, startDate, realPOIs);
            return parsed;
            
        } catch (e) {
            console.error('AI生成失败，使用兜底数据', e);
            return this.buildMultiCityTripFromPOIs(poisByCity, destinations, days, startDate);
        }
    },

    buildMultiCityTripFromPOIs(poisByCity, destinations, days, startDate) {
        const numCities = destinations.length;
        const daysPerCity = Math.max(1, Math.floor(days / numCities));
        const extraDays = days % numCities;

        const dayPlans = [];
        const baseDate = startDate || new Date();
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const themes = ['经典地标·城市漫游', '深度体验·人文之旅', '自然风光·山水画卷', '美食探店·烟火人间'];

        let dayIndex = 0;
        destinations.forEach((city, cityIdx) => {
            const cityDays = daysPerCity + (cityIdx < extraDays ? 1 : 0);
            const cityPois = poisByCity[city] || this.getFallbackPOIs(city);

            for (let i = 0; i < cityDays && dayIndex < days; i++) {
                const date = new Date(baseDate);
                date.setDate(date.getDate() + dayIndex);

                const poisPerDay = Math.max(4, Math.ceil(cityPois.length / cityDays));
                const dayPois = cityPois.slice(i * poisPerDay, (i + 1) * poisPerDay);
                if (dayPois.length === 0) {
                    dayPois.push(...this.getFallbackPOIs(city).slice(0, 4));
                }

                const spots = dayPois.slice(0, 6).map((poi, j) => {
                    const hour = 9 + j * 2;
                    const endHour = Math.min(hour + 2, 21);
                    return {
                        name: poi.name,
                        type: this.inferType(poi.type),
                        startTime: hour.toString().padStart(2, '0') + ':00',
                        endTime: endHour.toString().padStart(2, '0') + ':00',
                        address: poi.address || city + poi.name,
                        description: (poi.type || city + '热门景点') + '，值得一游',
                        emoji: this.getEmojiByType(this.inferType(poi.type)),
                        tags: this.inferTags(poi.type),
                        duration: '1.5-2小时',
                        cost: poi.cost || 0,
                        businessHours: '09:00-18:00',
                        lng: poi.lng,
                        lat: poi.lat,
                    };
                });

                dayPlans.push({
                    day: dayIndex + 1,
                    dateLabel: (date.getMonth()+1).toString().padStart(2,'0') + '.' +
                              date.getDate().toString().padStart(2,'0') + ' ' + dayNames[date.getDay()],
                    theme: themes[(dayIndex) % themes.length] + `【${city}】`,
                    city: city,
                    spots: spots,
                });
                dayIndex++;
            }
        });

        return {
            title: destinations.join('→') + days + '天连线游',
            days: days,
            dayPlans: dayPlans,
            isMultiCity: true,
            cities: destinations,
        };
    },

    buildTripFromRealPOIs(realPOIs, dest, days, startDate) {
        const dayPlans = [];
        const baseDate = startDate || new Date();
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const themes = ['经典地标·城市漫游', '深度体验·人文之旅', '自然风光·山水画卷'];

        const pois = realPOIs.length > 0 ? realPOIs : this.getFallbackPOIs(dest);

        const poisPerDay = Math.max(4, Math.ceil(pois.length / days));

        for (let i = 0; i < days; i++) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() + i);
            
            const dayPois = pois.slice(i * poisPerDay, (i + 1) * poisPerDay);
            if (dayPois.length === 0) {
                dayPois.push(...this.getFallbackPOIs(dest).slice(0, 4));
            }

            const spots = dayPois.slice(0, 6).map((poi, j) => {
                const hour = 9 + j * 2;
                const endHour = Math.min(hour + 2, 21);
                return {
                    name: poi.name,
                    type: this.inferType(poi.type),
                    startTime: hour.toString().padStart(2, '0') + ':00',
                    endTime: endHour.toString().padStart(2, '0') + ':00',
                    address: poi.address || dest + poi.name,
                    description: (poi.type || dest + '热门景点') + '，值得一游',
                    emoji: this.getEmojiByType(this.inferType(poi.type)),
                    tags: this.inferTags(poi.type),
                    duration: '1.5-2小时',
                    cost: poi.cost || 0,
                    businessHours: '09:00-18:00',
                    lng: poi.lng,
                    lat: poi.lat,
                };
            });

            dayPlans.push({
                day: i + 1,
                dateLabel: (date.getMonth()+1).toString().padStart(2,'0') + '.' + 
                          date.getDate().toString().padStart(2,'0') + ' ' + dayNames[date.getDay()],
                theme: themes[i % themes.length],
                city: dest,
                spots: spots,
            });
        }

        return {
            title: dest + days + '天经典行程',
            days: days,
            dayPlans: dayPlans,
        };
    },

    getFallbackPOIs(dest) {
        const known = {
            '上海': [
                { name: '外滩', address: '上海市黄浦区中山东一路', type: '风景名胜', rating: 4.8 },
                { name: '豫园', address: '上海市黄浦区豫园路218号', type: '风景名胜', rating: 4.7 },
                { name: '东方明珠', address: '上海市浦东新区世纪大道1号', type: '风景名胜', rating: 4.6 },
                { name: '南京路步行街', address: '上海市黄浦区南京东路', type: '购物服务', rating: 4.5 },
                { name: '上海博物馆', address: '上海市黄浦区人民大道201号', type: '科教文化', rating: 4.8 },
                { name: '田子坊', address: '上海市黄浦区泰康路210弄', type: '风景名胜', rating: 4.4 },
                { name: '迪士尼乐园', address: '上海市浦东新区申迪西路753号', type: '风景名胜', rating: 4.7 },
                { name: '静安寺', address: '上海市静安区南京西路1686号', type: '风景名胜', rating: 4.5 },
            ],
            '北京': [
                { name: '故宫博物院', address: '北京市东城区景山前街4号', type: '风景名胜', rating: 4.9 },
                { name: '天安门广场', address: '北京市东城区天安门', type: '风景名胜', rating: 4.8 },
                { name: '颐和园', address: '北京市海淀区新建宫门路19号', type: '风景名胜', rating: 4.8 },
                { name: '长城(八达岭)', address: '北京市延庆区八达岭镇', type: '风景名胜', rating: 4.8 },
                { name: '天坛公园', address: '北京市东城区天坛路甲1号', type: '风景名胜', rating: 4.7 },
                { name: '南锣鼓巷', address: '北京市东城区南锣鼓巷', type: '购物服务', rating: 4.3 },
                { name: '什刹海', address: '北京市西城区羊房胡同', type: '风景名胜', rating: 4.6 },
                { name: '798艺术区', address: '北京市朝阳区酒仙桥路4号', type: '科教文化', rating: 4.5 },
            ],
            '杭州': [
                { name: '西湖', address: '浙江省杭州市西湖区', type: '风景名胜', rating: 4.9 },
                { name: '灵隐寺', address: '浙江省杭州市西湖区法云弄1号', type: '风景名胜', rating: 4.7 },
                { name: '宋城', address: '浙江省杭州市西湖区之江路148号', type: '风景名胜', rating: 4.5 },
                { name: '西溪湿地', address: '浙江省杭州市西湖区天目山路518号', type: '风景名胜', rating: 4.6 },
                { name: '河坊街', address: '浙江省杭州市上城区河坊街', type: '购物服务', rating: 4.4 },
                { name: '雷峰塔', address: '浙江省杭州市西湖区南山路15号', type: '风景名胜', rating: 4.5 },
            ],
            '成都': [
                { name: '大熊猫繁育研究基地', address: '四川省成都市成华区熊猫大道1375号', type: '风景名胜', rating: 4.8 },
                { name: '锦里古街', address: '四川省成都市武侯区武侯祠大街231号', type: '购物服务', rating: 4.5 },
                { name: '宽窄巷子', address: '四川省成都市青羊区长顺上街', type: '购物服务', rating: 4.5 },
                { name: '武侯祠', address: '四川省成都市武侯区武侯祠大街231号', type: '风景名胜', rating: 4.6 },
                { name: '杜甫草堂', address: '四川省成都市青羊区青华路37号', type: '风景名胜', rating: 4.6 },
                { name: '春熙路', address: '四川省成都市锦江区春熙路', type: '购物服务', rating: 4.5 },
            ],
        };
        
        if (known[dest]) return known[dest];
        
        return [
            { name: dest + '市中心', address: dest, type: '购物服务' },
            { name: dest + '博物馆', address: dest, type: '科教文化' },
            { name: dest + '古城/老街', address: dest, type: '风景名胜' },
            { name: dest + '公园', address: dest, type: '风景名胜' },
            { name: dest + '美食街', address: dest, type: '餐饮服务' },
        ];
    },

    inferType(typeStr) {
        if (!typeStr) return '景点';
        if (typeStr.includes('餐饮') || typeStr.includes('美食')) return '美食';
        if (typeStr.includes('购物') || typeStr.includes('商业')) return '购物';
        if (typeStr.includes('科教') || typeStr.includes('博物馆') || typeStr.includes('文化')) return '文化';
        if (typeStr.includes('风景') || typeStr.includes('公园') || typeStr.includes('自然')) return '自然风光';
        if (typeStr.includes('古迹') || typeStr.includes('历史')) return '历史古迹';
        return '景点';
    },

    inferTags(typeStr) {
        const t = typeStr || '';
        if (t.includes('餐饮')) return ['美食', '推荐'];
        if (t.includes('购物')) return ['购物', '商圈'];
        if (t.includes('博物馆') || t.includes('文化')) return ['文化', '博物馆'];
        if (t.includes('公园') || t.includes('自然')) return ['自然', '休闲'];
        if (t.includes('古迹') || t.includes('历史')) return ['历史', '古迹'];
        return ['热门', '必玩'];
    },

    validateAndFixTrip(trip, destinations, days, startDate, realPOIs = []) {
        if (!trip || !trip.dayPlans || !Array.isArray(trip.dayPlans)) {
            throw new Error('Invalid trip data');
        }

        const forbiddenLocations = ['月球', '火星', '太阳', '三体', '外星', '天堂', '地狱'];
        const dest = destinations.join('');

        const poiNameMap = new Map();
        realPOIs.forEach(p => {
            poiNameMap.set(p.name, p);
        });

        trip.dayPlans.forEach((day, idx) => {
            if (!day.spots || !Array.isArray(day.spots)) {
                day.spots = [];
            }

            day.spots = day.spots.filter(spot => {
                if (!spot.name) return false;
                const nameLower = spot.name + (spot.address || '');
                if (forbiddenLocations.some(loc => nameLower.includes(loc))) return false;
                return true;
            });

            day.spots = day.spots.map(spot => {
                const matched = poiNameMap.get(spot.name);
                if (matched) {
                    spot.lng = matched.lng;
                    spot.lat = matched.lat;
                    spot.address = matched.address || spot.address;
                    if (!spot.cost && matched.cost) spot.cost = matched.cost;
                }
                return spot;
            });

            if (day.spots.length < 4 && realPOIs.length > 0) {
                const usedNames = new Set(day.spots.map(s => s.name));
                const available = realPOIs.filter(p => !usedNames.has(p.name));
                const needed = 4 - day.spots.length;
                for (let i = 0; i < Math.min(needed, available.length); i++) {
                    const poi = available[i];
                    day.spots.push({
                        name: poi.name,
                        type: this.inferType(poi.type),
                        startTime: '14:00',
                        endTime: '16:00',
                        address: poi.address || dest,
                        description: '当地热门景点',
                        emoji: this.getEmojiByType(this.inferType(poi.type)),
                        tags: this.inferTags(poi.type),
                        duration: '1.5小时',
                        cost: poi.cost || 0,
                        businessHours: '09:00-18:00',
                        lng: poi.lng,
                        lat: poi.lat,
                    });
                }
            }

            if (day.spots.length < 4) {
                const filler = this.getFallbackPOIs(dest).slice(0, 4 - day.spots.length);
                filler.forEach(poi => {
                    day.spots.push({
                        name: poi.name,
                        type: this.inferType(poi.type),
                        startTime: '10:00',
                        endTime: '12:00',
                        address: poi.address || dest + poi.name,
                        description: dest + '知名景点',
                        emoji: this.getEmojiByType(this.inferType(poi.type)),
                        tags: this.inferTags(poi.type),
                        duration: '2小时',
                        cost: 0,
                        businessHours: '09:00-18:00',
                    });
                });
            }
        });
    },

    async chatModify(message, tripData) {
        const dest = tripData.dayPlans?.[0]?.city || '';
        let realPOIs = [];
        try {
            if (typeof MapModule !== 'undefined' && MapModule.searchCityPOIs) {
                realPOIs = await MapModule.searchCityPOIs(dest, []);
            }
        } catch (e) {}

        const prompt = `当前已有行程数据（景点来自高德地图真实数据）：
${JSON.stringify(tripData, null, 2)}
${realPOIs.length > 0 ? '\n可用景点库（只能使用这些真实景点，不能编造）：\n' + realPOIs.map((p,i) => `${i+1}. ${p.name}|${p.address}`).join('\n') : ''}

用户提出修改要求：${message}

请根据用户要求修改行程，返回修改后的完整JSON（格式和上面一致）。
约束规则：
1. 只可以使用上述可用景点库中的景点${realPOIs.length === 0 ? '，景点名称和地址必须真实存在' : ''}
2. 不要编造任何不存在的景点、餐厅或地址
3. 保持JSON结构完全一致
4. 修改要合理，时间安排要连贯

只返回JSON，不要其他文字。`;

        try {
            const parsed = await this.callQwenAPI(prompt, 0.4);
            if (parsed && parsed.dayPlans) {
                parsed.dayPlans.forEach(day => {
                    if (!day.spots) day.spots = [];
                    day.spots.forEach(spot => {
                        if (!spot.emoji) spot.emoji = this.getEmojiByType(spot.type);
                    });
                });
            }
            return parsed;
        } catch (e) {
            console.error('AI修改失败', e);
            return null;
        }
    },

    enrichTripData(trip, dest, days, startDate, realPOIs = []) {
        const poiMap = new Map();
        realPOIs.forEach(p => poiMap.set(p.name, p));

        trip.dayPlans.forEach((day, dayIdx) => {
            if (!day.city) day.city = dest;
            if (!day.dateLabel && startDate) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + dayIdx);
                const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                day.dateLabel = (d.getMonth()+1).toString().padStart(2,'0') + '.' + 
                               d.getDate().toString().padStart(2,'0') + ' ' + dayNames[d.getDay()];
            }
            day.spots.forEach((spot, i) => {
                const matched = poiMap.get(spot.name);
                if (matched) {
                    spot.lng = matched.lng;
                    spot.lat = matched.lat;
                    if (!spot.address) spot.address = matched.address;
                    if (!spot.cost && matched.cost) spot.cost = matched.cost;
                }
                if (!spot.emoji) spot.emoji = this.getEmojiByType(spot.type);
                if (!spot.duration) spot.duration = '1.5-2小时';
                if (spot.cost === undefined || spot.cost === null) spot.cost = 0;
                if (!spot.businessHours) spot.businessHours = '09:00-18:00';
                if (!spot.tags) spot.tags = [];
                if (!spot.description) spot.description = '当地知名景点';
                
                const hour = 9 + i * 2;
                if (!spot.startTime) spot.startTime = hour.toString().padStart(2,'0') + ':00';
                if (!spot.endTime) spot.endTime = Math.min(hour + 2, 21).toString().padStart(2,'0') + ':00';
            });
        });
    },

    getEmojiByType(type) {
        const map = {
            '历史古迹': '🏛️', '自然风光': '🏞️', '美食': '🍽️', '购物': '🛍️',
            '景点': '📍', '文化': '🎨', '休闲': '☕', '娱乐': '🎢',
        };
        return map[type] || '📍';
    },
};
