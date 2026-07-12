const AutocompleteModule = {
    autoComplete: null,
    searchTimer: null,
    initPromise: null,
    fallbackMode: false,

    init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30;
            const checkAMap = () => {
                if (typeof AMap !== 'undefined') {
                    AMap.plugin('AMap.AutoComplete', () => {
                        this.autoComplete = new AMap.AutoComplete({ city: '全国' });
                        resolve();
                    });
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        console.warn('[AutocompleteModule] 高德SDK加载失败，启用本地POI降级模式');
                        this.fallbackMode = true;
                        resolve();
                        return;
                    }
                    setTimeout(checkAMap, 100);
                }
            };
            checkAMap();
        });
        return this.initPromise;
    },

    async search(keyword, callback) {
        if (!keyword || keyword.length === 0) {
            this.hideDropdown();
            return;
        }

        await this.init();
        
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            if (this.fallbackMode) {
                let results = [];
                if (typeof PoiSeedData !== 'undefined') {
                    const cityCenter = PoiSeedData.getCityCenter(keyword);
                    if (cityCenter) {
                        results = PoiSeedData.getCityPOIs(keyword, []).slice(0, 6);
                    } else {
                        results = PoiSeedData.searchPOI(keyword, { pageSize: 6 });
                    }
                }
                const tips = results.map(r => ({
                    name: r.name,
                    district: r.adname,
                    address: r.address,
                    type: r.type,
                    cityname: r.cityname,
                }));
                callback(tips, keyword);
                return;
            }
            
            this.autoComplete.search(keyword, (status, result) => {
                if (status === 'complete' && result.tips && result.tips.length > 0) {
                    const validTips = result.tips.filter(t => t.name && t.name.length > 0).slice(0, 6);
                    callback(validTips, keyword);
                } else {
                    callback([], keyword);
                }
            });
        }, 200);
    },

    renderSuggestions(tips, keyword) {
        const dropdown = document.getElementById('autoDropdown');
        let html = '';
        
        html += `
            <div class="auto-custom-item" onclick="App.addCustomDestination('${keyword.replace(/'/g, "\\'")}')">
                <div class="auto-icon">✨</div>
                <div class="auto-info">
                    <div class="auto-name">自定义：${keyword}</div>
                    <div class="auto-desc">AI将根据你的描述智能规划行程</div>
                </div>
            </div>
        `;

        tips.forEach(tip => {
            const icon = this.getPlaceIcon(tip.type);
            html += `
                <div class="auto-item" onclick="App.addSuggestionDestination('${(tip.name || '').replace(/'/g, "\\'")}')">
                    <div class="auto-icon">${icon}</div>
                    <div class="auto-info">
                        <div class="auto-name">${tip.name || ''}</div>
                        <div class="auto-addr">${tip.district || ''} ${tip.address || ''}</div>
                    </div>
                    <div class="auto-add">+</div>
                </div>
            `;
        });

        dropdown.innerHTML = html;
        dropdown.classList.add('show');
    },

    showCustomOnly(keyword) {
        const dropdown = document.getElementById('autoDropdown');
        dropdown.innerHTML = `
            <div class="auto-custom-item" onclick="App.addCustomDestination('${keyword.replace(/'/g, "\\'")}')">
                <div class="auto-icon">✨</div>
                <div class="auto-info">
                    <div class="auto-name">自定义：${keyword}</div>
                    <div class="auto-desc">AI将根据你的描述智能规划行程</div>
                </div>
            </div>
        `;
        dropdown.classList.add('show');
    },

    hideDropdown() {
        document.getElementById('autoDropdown').classList.remove('show');
    },

    getPlaceIcon(type) {
        if (!type) return '📍';
        if (type.includes('景点') || type.includes('风景名胜')) return '🏛️';
        if (type.includes('餐饮') || type.includes('美食')) return '🍽️';
        if (type.includes('购物') || type.includes('商场')) return '🛍️';
        if (type.includes('酒店') || type.includes('住宿')) return '🏨';
        if (type.includes('交通') || type.includes('车站') || type.includes('机场')) return '🚆';
        if (type.includes('公园') || type.includes('自然')) return '🏞️';
        if (type.includes('学校')) return '🎓';
        if (type.includes('医院')) return '🏥';
        return '📍';
    }
};
