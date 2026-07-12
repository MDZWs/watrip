const PoiSeedData = {
    _normCity(city) {
        if (!city) return '';
        let c = city.trim();
        c = c.replace(/[市区省县自治州]/g, '');
        for (const key of Object.keys(this._cityData)) {
            if (key === c || key.includes(c) || c.includes(key)) {
                return key;
            }
        }
        return '';
    },

    _cityData: {
        '北京': {
            center: { lng: 116.4074, lat: 39.9042 },
            pois: [
                { name: '故宫博物院', address: '北京市东城区景山前街4号', lng: 116.3974, lat: 39.9163, type: '风景名胜', rating: 4.9, cost: 60 },
                { name: '八达岭长城', address: '北京市延庆区G6京藏高速58号出口', lng: 116.0234, lat: 40.3579, type: '风景名胜', rating: 4.8, cost: 40 },
                { name: '颐和园', address: '北京市海淀区新建宫门路19号', lng: 116.2756, lat: 39.9999, type: '风景名胜', rating: 4.8, cost: 30 },
                { name: '天坛公园', address: '北京市东城区天坛东里甲1号', lng: 116.4109, lat: 39.8822, type: '风景名胜', rating: 4.7, cost: 15 },
                { name: '天安门广场', address: '北京市东城区长安街', lng: 116.3974, lat: 39.9087, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '南锣鼓巷', address: '北京市东城区南锣鼓巷胡同', lng: 116.4047, lat: 39.9375, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '798艺术区', address: '北京市朝阳区酒仙桥路4号', lng: 116.4962, lat: 39.9847, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '什刹海', address: '北京市西城区羊房胡同', lng: 116.3856, lat: 39.9404, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '圆明园', address: '北京市海淀区清华西路28号', lng: 116.3063, lat: 40.0047, type: '风景名胜', rating: 4.6, cost: 25 },
                { name: '鸟巢（国家体育场）', address: '北京市朝阳区国家体育场南路1号', lng: 116.3964, lat: 39.9931, type: '风景名胜', rating: 4.5, cost: 50 },
                { name: '全聚德（前门店）', address: '北京市东城区前门大街30号', lng: 116.3975, lat: 39.8974, type: '餐饮服务', rating: 4.3, cost: 150 },
                { name: '王府井步行街', address: '北京市东城区王府井大街', lng: 116.4108, lat: 39.9145, type: '购物服务', rating: 4.5, cost: 0 },
            ]
        },
        '上海': {
            center: { lng: 121.4737, lat: 31.2304 },
            pois: [
                { name: '外滩', address: '上海市黄浦区中山东一路', lng: 121.4905, lat: 31.2397, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '东方明珠', address: '上海市浦东新区世纪大道1号', lng: 121.4997, lat: 31.2397, type: '风景名胜', rating: 4.7, cost: 180 },
                { name: '豫园', address: '上海市黄浦区安仁街132号', lng: 121.4925, lat: 31.2273, type: '风景名胜', rating: 4.7, cost: 40 },
                { name: '南京路步行街', address: '上海市黄浦区南京东路', lng: 121.4807, lat: 31.2357, type: '购物服务', rating: 4.6, cost: 0 },
                { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇黄赵路310号', lng: 121.6654, lat: 31.1433, type: '风景名胜', rating: 4.8, cost: 435 },
                { name: '田子坊', address: '上海市黄浦区泰康路210弄', lng: 121.4668, lat: 31.2105, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '朱家角古镇', address: '上海市青浦区朱家角镇', lng: 121.0556, lat: 31.1158, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '上海博物馆', address: '上海市黄浦区人民大道201号', lng: 121.4754, lat: 31.2307, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '城隍庙', address: '上海市黄浦区方浜中路249号', lng: 121.4927, lat: 31.2256, type: '风景名胜', rating: 4.5, cost: 10 },
                { name: '新天地', address: '上海市黄浦区太仓路181弄', lng: 121.4754, lat: 31.2201, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '南翔小笼馆', address: '上海市黄浦区豫园路85号', lng: 121.4917, lat: 31.2276, type: '餐饮服务', rating: 4.4, cost: 50 },
                { name: '淮海路商业街', address: '上海市黄浦区淮海中路', lng: 121.4668, lat: 31.2201, type: '购物服务', rating: 4.5, cost: 0 },
            ]
        },
        '成都': {
            center: { lng: 104.0668, lat: 30.5728 },
            pois: [
                { name: '大熊猫繁育研究基地', address: '成都市成华区外北熊猫大道1375号', lng: 104.1435, lat: 30.7209, type: '风景名胜', rating: 4.9, cost: 55 },
                { name: '宽窄巷子', address: '成都市青羊区长顺上街127号', lng: 104.0668, lat: 30.6708, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '锦里古街', address: '成都市武侯区武侯祠大街231号', lng: 104.0435, lat: 30.6469, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '武侯祠', address: '成都市武侯区武侯祠大街231号', lng: 104.0435, lat: 30.6469, type: '风景名胜', rating: 4.7, cost: 50 },
                { name: '杜甫草堂', address: '成都市青羊区青华路37号', lng: 104.0235, lat: 30.6667, type: '风景名胜', rating: 4.6, cost: 50 },
                { name: '春熙路', address: '成都市锦江区春熙路', lng: 104.0835, lat: 30.6534, type: '购物服务', rating: 4.5, cost: 0 },
                { name: '青城山', address: '成都市都江堰市青城山', lng: 103.5867, lat: 30.9064, type: '风景名胜', rating: 4.8, cost: 80 },
                { name: '都江堰景区', address: '成都市都江堰市公园路', lng: 103.6156, lat: 31.0064, type: '风景名胜', rating: 4.8, cost: 80 },
                { name: '文殊院', address: '成都市青羊区文殊院街66号', lng: 104.0700, lat: 30.6869, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '人民公园', address: '成都市青羊区少城路12号', lng: 104.0600, lat: 30.6600, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '蜀大侠火锅', address: '成都市锦江区春熙路', lng: 104.0820, lat: 30.6540, type: '餐饮服务', rating: 4.5, cost: 100 },
                { name: '龙抄手（春熙路店）', address: '成都市锦江区春熙路', lng: 104.0810, lat: 30.6520, type: '餐饮服务', rating: 4.3, cost: 30 },
            ]
        },
        '重庆': {
            center: { lng: 106.5516, lat: 29.5630 },
            pois: [
                { name: '洪崖洞民俗风貌区', address: '重庆市渝中区嘉陵江滨江路88号', lng: 106.5860, lat: 29.5630, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '解放碑步行街', address: '重庆市渝中区民族路', lng: 106.5790, lat: 29.5570, type: '购物服务', rating: 4.6, cost: 0 },
                { name: '磁器口古镇', address: '重庆市沙坪坝区磁器口正街', lng: 106.4570, lat: 29.5480, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '长江索道', address: '重庆市渝中区新华路153号', lng: 106.5860, lat: 29.5550, type: '风景名胜', rating: 4.6, cost: 20 },
                { name: '武隆天生三桥', address: '重庆市武隆区仙女镇', lng: 107.8020, lat: 29.3690, type: '风景名胜', rating: 4.8, cost: 125 },
                { name: '南山一棵树观景台', address: '重庆市南岸区南山风景区', lng: 106.5760, lat: 29.5300, type: '风景名胜', rating: 4.5, cost: 30 },
                { name: '渣滓洞', address: '重庆市沙坪坝区歌乐山', lng: 106.4480, lat: 29.5610, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '白公馆', address: '重庆市沙坪坝区歌乐山', lng: 106.4470, lat: 29.5590, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '大足石刻', address: '重庆市大足区龙岗街道', lng: 105.7110, lat: 29.7110, type: '风景名胜', rating: 4.8, cost: 115 },
                { name: '李子坝轻轨站', address: '重庆市渝中区李子坝正街', lng: 106.5410, lat: 29.5440, type: '风景名胜', rating: 4.3, cost: 0 },
                { name: '小天鹅火锅', address: '重庆市渝中区解放碑', lng: 106.5780, lat: 29.5560, type: '餐饮服务', rating: 4.4, cost: 90 },
                { name: '好又来酸辣粉', address: '重庆市渝中区解放碑八一路', lng: 106.5770, lat: 29.5580, type: '餐饮服务', rating: 4.5, cost: 15 },
            ]
        },
        '杭州': {
            center: { lng: 120.1551, lat: 30.2741 },
            pois: [
                { name: '西湖', address: '杭州市西湖区', lng: 120.1451, lat: 30.2541, type: '风景名胜', rating: 4.9, cost: 0 },
                { name: '断桥残雪', address: '杭州市西湖区白堤', lng: 120.1475, lat: 30.2612, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '雷峰塔', address: '杭州市西湖区南山路15号', lng: 120.1486, lat: 30.2318, type: '风景名胜', rating: 4.6, cost: 40 },
                { name: '灵隐寺', address: '杭州市西湖区灵隐路法云弄1号', lng: 120.1050, lat: 30.2420, type: '风景名胜', rating: 4.7, cost: 30 },
                { name: '千岛湖', address: '杭州市淳安县千岛湖镇', lng: 119.0356, lat: 29.6038, type: '风景名胜', rating: 4.8, cost: 130 },
                { name: '宋城', address: '杭州市西湖区之江路148号', lng: 120.0867, lat: 30.1956, type: '风景名胜', rating: 4.6, cost: 300 },
                { name: '河坊街', address: '杭州市上城区河坊街', lng: 120.1710, lat: 30.2460, type: '购物服务', rating: 4.5, cost: 0 },
                { name: '西溪湿地', address: '杭州市西湖区西溪湿地', lng: 120.0650, lat: 30.2650, type: '风景名胜', rating: 4.6, cost: 80 },
                { name: '六和塔', address: '杭州市西湖区之江路16号', lng: 120.1150, lat: 30.1950, type: '风景名胜', rating: 4.5, cost: 20 },
                { name: '京杭大运河', address: '杭州市拱墅区', lng: 120.1450, lat: 30.3200, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '楼外楼', address: '杭州市西湖区孤山路30号', lng: 120.1420, lat: 30.2570, type: '餐饮服务', rating: 4.4, cost: 150 },
                { name: '知味观', address: '杭州市上城区仁和路83号', lng: 120.1680, lat: 30.2530, type: '餐饮服务', rating: 4.3, cost: 50 },
            ]
        },
        '西安': {
            center: { lng: 108.9398, lat: 34.3416 },
            pois: [
                { name: '秦始皇兵马俑', address: '西安市临潼区秦陵北路', lng: 109.2730, lat: 34.3850, type: '风景名胜', rating: 4.9, cost: 120 },
                { name: '华清宫', address: '西安市临潼区华清路38号', lng: 109.2150, lat: 34.4060, type: '风景名胜', rating: 4.7, cost: 120 },
                { name: '大雁塔', address: '西安市雁塔区大慈恩寺内', lng: 108.9640, lat: 34.2180, type: '风景名胜', rating: 4.6, cost: 30 },
                { name: '西安城墙', address: '西安市中心区', lng: 108.9480, lat: 34.2650, type: '风景名胜', rating: 4.8, cost: 54 },
                { name: '回民街', address: '西安市莲湖区北院门', lng: 108.9380, lat: 34.2620, type: '餐饮服务', rating: 4.5, cost: 0 },
                { name: '钟鼓楼', address: '西安市中心', lng: 108.9470, lat: 34.2600, type: '风景名胜', rating: 4.6, cost: 30 },
                { name: '陕西历史博物馆', address: '西安市雁塔区小寨东路91号', lng: 108.9680, lat: 34.2250, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '大唐不夜城', address: '西安市雁塔区大雁塔脚下', lng: 108.9650, lat: 34.2150, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '华山', address: '渭南市华阴市华山镇', lng: 110.0860, lat: 34.4980, type: '风景名胜', rating: 4.9, cost: 160 },
                { name: '壶口瀑布', address: '延安市宜川县壶口镇', lng: 110.4530, lat: 36.1340, type: '风景名胜', rating: 4.8, cost: 90 },
                { name: '老孙家羊肉泡馍', address: '西安市碑林区东关正街', lng: 108.9520, lat: 34.2580, type: '餐饮服务', rating: 4.3, cost: 40 },
                { name: '肉夹馍', address: '西安市莲湖区回民街', lng: 108.9390, lat: 34.2610, type: '餐饮服务', rating: 4.5, cost: 15 },
            ]
        },
        '厦门': {
            center: { lng: 118.0894, lat: 24.4798 },
            pois: [
                { name: '鼓浪屿', address: '厦门市思明区鼓浪屿', lng: 118.0650, lat: 24.4480, type: '风景名胜', rating: 4.8, cost: 35 },
                { name: '厦门大学', address: '厦门市思明区思明南路422号', lng: 118.0950, lat: 24.4340, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '南普陀寺', address: '厦门市思明区思明南路515号', lng: 118.0950, lat: 24.4350, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '曾厝垵', address: '厦门市思明区曾厝垵社', lng: 118.1150, lat: 24.4380, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '中山路步行街', address: '厦门市思明区中山路', lng: 118.0850, lat: 24.4550, type: '购物服务', rating: 4.5, cost: 0 },
                { name: '胡里山炮台', address: '厦门市思明区曾厝垵路2号', lng: 118.1150, lat: 24.4420, type: '风景名胜', rating: 4.5, cost: 25 },
                { name: '土楼', address: '漳州市南靖县', lng: 117.1750, lat: 24.3750, type: '风景名胜', rating: 4.8, cost: 90 },
                { name: '集美学村', address: '厦门市集美区嘉庚路', lng: 118.0850, lat: 24.5750, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '万石植物园', address: '厦门市思明区虎园路25号', lng: 118.0950, lat: 24.4520, type: '风景名胜', rating: 4.6, cost: 30 },
                { name: '环岛路', address: '厦门市思明区环岛路', lng: 118.1250, lat: 24.4450, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '沙茶面', address: '厦门市思明区中山路', lng: 118.0840, lat: 24.4540, type: '餐饮服务', rating: 4.4, cost: 20 },
                { name: '海蛎煎', address: '厦门市思明区鼓浪屿', lng: 118.0640, lat: 24.4470, type: '餐饮服务', rating: 4.3, cost: 25 },
            ]
        },
        '三亚': {
            center: { lng: 109.5082, lat: 18.2479 },
            pois: [
                { name: '亚龙湾', address: '三亚市吉阳区亚龙湾路', lng: 109.6380, lat: 18.2250, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '天涯海角', address: '三亚市天涯区天涯镇', lng: 109.3460, lat: 18.3030, type: '风景名胜', rating: 4.5, cost: 68 },
                { name: '蜈支洲岛', address: '三亚市海棠区蜈支洲岛', lng: 109.7570, lat: 18.3150, type: '风景名胜', rating: 4.8, cost: 144 },
                { name: '南山文化旅游区', address: '三亚市崖州区南山村', lng: 109.1830, lat: 18.2960, type: '风景名胜', rating: 4.7, cost: 129 },
                { name: '大东海', address: '三亚市吉阳区榆亚大道', lng: 109.5250, lat: 18.2350, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '三亚湾', address: '三亚市天涯区三亚湾路', lng: 109.4850, lat: 18.2550, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '海棠湾', address: '三亚市海棠区', lng: 109.7450, lat: 18.3050, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '呀诺达雨林', address: '保亭县三道镇', lng: 109.6650, lat: 18.4650, type: '风景名胜', rating: 4.6, cost: 100 },
                { name: '槟榔谷', address: '保亭县三道镇', lng: 109.6550, lat: 18.4550, type: '风景名胜', rating: 4.5, cost: 96 },
                { name: '第一市场', address: '三亚市天涯区新建路', lng: 109.5050, lat: 18.2450, type: '购物服务', rating: 4.4, cost: 0 },
                { name: '海鲜大餐', address: '三亚市第一市场', lng: 109.5040, lat: 18.2440, type: '餐饮服务', rating: 4.5, cost: 200 },
                { name: '清补凉', address: '三亚市天涯区解放路', lng: 109.5020, lat: 18.2460, type: '餐饮服务', rating: 4.4, cost: 15 },
            ]
        },
        '大理': {
            center: { lng: 100.2299, lat: 25.6065 },
            pois: [
                { name: '洱海', address: '大理市洱海', lng: 100.2299, lat: 25.7665, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '大理古城', address: '大理市大理镇', lng: 100.1550, lat: 25.6950, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '苍山', address: '大理市苍山', lng: 100.1450, lat: 25.6450, type: '风景名胜', rating: 4.7, cost: 30 },
                { name: '双廊古镇', address: '大理市双廊镇', lng: 100.2750, lat: 25.8050, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '喜洲古镇', address: '大理市喜洲镇', lng: 100.1850, lat: 25.8650, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '崇圣寺三塔', address: '大理市崇圣寺', lng: 100.1350, lat: 25.7150, type: '风景名胜', rating: 4.6, cost: 75 },
                { name: '蝴蝶泉', address: '大理市蝴蝶泉', lng: 100.1750, lat: 25.8850, type: '风景名胜', rating: 4.3, cost: 60 },
                { name: '南诏风情岛', address: '大理市双廊镇', lng: 100.2850, lat: 25.8050, type: '风景名胜', rating: 4.4, cost: 50 },
                { name: '挖色镇', address: '大理市挖色镇', lng: 100.2550, lat: 25.8850, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '小普陀', address: '大理市洱海', lng: 100.2650, lat: 25.8250, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '白族三道茶', address: '大理市大理古城', lng: 100.1540, lat: 25.6940, type: '餐饮服务', rating: 4.3, cost: 50 },
                { name: '饵丝', address: '大理市大理古城', lng: 100.1560, lat: 25.6960, type: '餐饮服务', rating: 4.4, cost: 15 },
            ]
        },
        '丽江': {
            center: { lng: 100.2330, lat: 26.8721 },
            pois: [
                { name: '丽江古城', address: '丽江市古城区', lng: 100.2330, lat: 26.8721, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '玉龙雪山', address: '丽江市玉龙县', lng: 100.2250, lat: 27.1050, type: '风景名胜', rating: 4.9, cost: 130 },
                { name: '束河古镇', address: '丽江市古城区束河街道', lng: 100.2050, lat: 26.9150, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '泸沽湖', address: '丽江市宁蒗县泸沽湖镇', lng: 100.7650, lat: 27.7050, type: '风景名胜', rating: 4.9, cost: 70 },
                { name: '虎跳峡', address: '迪庆州香格里拉市', lng: 100.0050, lat: 27.0050, type: '风景名胜', rating: 4.8, cost: 65 },
                { name: '拉市海', address: '丽江市玉龙县拉市镇', lng: 100.1750, lat: 26.8550, type: '风景名胜', rating: 4.5, cost: 30 },
                { name: '四方街', address: '丽江市古城区', lng: 100.2340, lat: 26.8710, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '木府', address: '丽江市古城区', lng: 100.2350, lat: 26.8700, type: '风景名胜', rating: 4.5, cost: 40 },
                { name: '黑龙潭', address: '丽江市古城区', lng: 100.2450, lat: 26.8850, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '玉龙雪山蓝月谷', address: '丽江市玉龙县玉龙雪山', lng: 100.2150, lat: 27.0850, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '腊排骨火锅', address: '丽江市古城区象山市场', lng: 100.2310, lat: 26.8850, type: '餐饮服务', rating: 4.4, cost: 60 },
                { name: '鸡豆凉粉', address: '丽江市古城区丽江古城', lng: 100.2320, lat: 26.8730, type: '餐饮服务', rating: 4.3, cost: 10 },
            ]
        },
        '南京': {
            center: { lng: 118.7969, lat: 32.0603 },
            pois: [
                { name: '中山陵', address: '南京市玄武区石象路7号', lng: 118.8450, lat: 32.0550, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '夫子庙', address: '南京市秦淮区夫子庙', lng: 118.7860, lat: 32.0220, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '南京总统府', address: '南京市玄武区长江路292号', lng: 118.8050, lat: 32.0450, type: '风景名胜', rating: 4.7, cost: 35 },
                { name: '明孝陵', address: '南京市玄武区紫金山', lng: 118.8450, lat: 32.0550, type: '风景名胜', rating: 4.7, cost: 70 },
                { name: '秦淮河', address: '南京市秦淮区', lng: 118.7860, lat: 32.0210, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '南京博物院', address: '南京市玄武区中山东路321号', lng: 118.8250, lat: 32.0450, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '玄武湖', address: '南京市玄武区玄武巷1号', lng: 118.7950, lat: 32.0750, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '侵华日军南京大屠杀遇难同胞纪念馆', address: '南京市建邺区水西门大街418号', lng: 118.7450, lat: 32.0350, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '雨花台', address: '南京市雨花台区雨花路215号', lng: 118.7750, lat: 32.0050, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '栖霞山', address: '南京市栖霞区栖霞街88号', lng: 118.9250, lat: 32.1050, type: '风景名胜', rating: 4.5, cost: 25 },
                { name: '鸭血粉丝汤', address: '南京市秦淮区夫子庙', lng: 118.7870, lat: 32.0230, type: '餐饮服务', rating: 4.5, cost: 15 },
                { name: '盐水鸭', address: '南京市秦淮区', lng: 118.7880, lat: 32.0240, type: '餐饮服务', rating: 4.4, cost: 30 },
            ]
        },
        '苏州': {
            center: { lng: 120.5853, lat: 31.2989 },
            pois: [
                { name: '拙政园', address: '苏州市姑苏区东北街178号', lng: 120.6250, lat: 31.3250, type: '风景名胜', rating: 4.8, cost: 70 },
                { name: '虎丘', address: '苏州市姑苏区虎丘山门内8号', lng: 120.5850, lat: 31.3350, type: '风景名胜', rating: 4.7, cost: 60 },
                { name: '留园', address: '苏州市姑苏区留园路338号', lng: 120.5950, lat: 31.3250, type: '风景名胜', rating: 4.7, cost: 55 },
                { name: '苏州博物馆', address: '苏州市姑苏区东北街204号', lng: 120.6250, lat: 31.3260, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '周庄古镇', address: '苏州市昆山市周庄镇', lng: 120.6050, lat: 31.1250, type: '风景名胜', rating: 4.7, cost: 100 },
                { name: '平江路历史街区', address: '苏州市姑苏区平江路', lng: 120.6250, lat: 31.3150, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '同里古镇', address: '苏州市吴江区同里镇', lng: 120.5650, lat: 31.1550, type: '风景名胜', rating: 4.6, cost: 80 },
                { name: '寒山寺', address: '苏州市姑苏区寒山寺弄24号', lng: 120.5650, lat: 31.3050, type: '风景名胜', rating: 4.5, cost: 20 },
                { name: '狮子林', address: '苏州市姑苏区园林路23号', lng: 120.6260, lat: 31.3230, type: '风景名胜', rating: 4.6, cost: 40 },
                { name: '网师园', address: '苏州市姑苏区带城桥路阔家头巷11号', lng: 120.6350, lat: 31.3050, type: '风景名胜', rating: 4.5, cost: 30 },
                { name: '松鼠鳜鱼', address: '苏州市姑苏区平江路', lng: 120.6240, lat: 31.3160, type: '餐饮服务', rating: 4.5, cost: 120 },
                { name: '苏式汤面', address: '苏州市姑苏区', lng: 120.6150, lat: 31.3150, type: '餐饮服务', rating: 4.4, cost: 20 },
            ]
        },
        '广州': {
            center: { lng: 113.2644, lat: 23.1291 },
            pois: [
                { name: '广州塔', address: '广州市海珠区阅江西路222号', lng: 113.3200, lat: 23.1050, type: '风景名胜', rating: 4.7, cost: 150 },
                { name: '沙面岛', address: '广州市荔湾区沙面北街', lng: 113.2350, lat: 23.1150, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '白云山', address: '广州市白云区广园中路801号', lng: 113.2350, lat: 23.1650, type: '风景名胜', rating: 4.6, cost: 5 },
                { name: '长隆旅游度假区', address: '广州市番禺区汉溪大道东', lng: 113.3250, lat: 23.0050, type: '风景名胜', rating: 4.8, cost: 250 },
                { name: '上下九步行街', address: '广州市荔湾区上下九路', lng: 113.2350, lat: 23.1250, type: '购物服务', rating: 4.5, cost: 0 },
                { name: '北京路步行街', address: '广州市越秀区北京路', lng: 113.2650, lat: 23.1250, type: '购物服务', rating: 4.5, cost: 0 },
                { name: '陈家祠', address: '广州市荔湾区中山七路恩龙里34号', lng: 113.2450, lat: 23.1350, type: '风景名胜', rating: 4.6, cost: 10 },
                { name: '越秀公园', address: '广州市越秀区解放北路988号', lng: 113.2650, lat: 23.1450, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '圣心大教堂', address: '广州市越秀区一德路旧部前56号', lng: 113.2650, lat: 23.1200, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '荔枝湾', address: '广州市荔湾区龙津西路', lng: 113.2350, lat: 23.1350, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '广州早茶', address: '广州市荔湾区上下九', lng: 113.2360, lat: 23.1260, type: '餐饮服务', rating: 4.7, cost: 50 },
                { name: '粤菜', address: '广州市越秀区北京路', lng: 113.2660, lat: 23.1260, type: '餐饮服务', rating: 4.6, cost: 80 },
            ]
        },
        '深圳': {
            center: { lng: 114.0859, lat: 22.5470 },
            pois: [
                { name: '世界之窗', address: '深圳市南山区深南大道9037号', lng: 113.9750, lat: 22.5350, type: '风景名胜', rating: 4.5, cost: 220 },
                { name: '欢乐谷', address: '深圳市南山区华侨城', lng: 113.9850, lat: 22.5450, type: '风景名胜', rating: 4.6, cost: 230 },
                { name: '东部华侨城', address: '深圳市盐田区大梅沙', lng: 114.3050, lat: 22.5850, type: '风景名胜', rating: 4.6, cost: 200 },
                { name: '深圳湾公园', address: '深圳市南山区深圳湾', lng: 114.0250, lat: 22.5150, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '大梅沙', address: '深圳市盐田区大梅沙', lng: 114.3050, lat: 22.5950, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '小梅沙', address: '深圳市盐田区小梅沙', lng: 114.3150, lat: 22.6050, type: '风景名胜', rating: 4.3, cost: 50 },
                { name: '锦绣中华', address: '深圳市南山区深南大道9003号', lng: 113.9750, lat: 22.5350, type: '风景名胜', rating: 4.4, cost: 200 },
                { name: '莲花山公园', address: '深圳市福田区红荔路6030号', lng: 114.0650, lat: 22.5550, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '东门老街', address: '深圳市罗湖区东门', lng: 114.1150, lat: 22.5450, type: '购物服务', rating: 4.4, cost: 0 },
                { name: '华强北', address: '深圳市福田区华强北路', lng: 114.0850, lat: 22.5450, type: '购物服务', rating: 4.3, cost: 0 },
                { name: '潮汕牛肉火锅', address: '深圳市福田区华强北', lng: 114.0860, lat: 22.5460, type: '餐饮服务', rating: 4.6, cost: 80 },
                { name: '港式茶餐厅', address: '深圳市罗湖区东门', lng: 114.1160, lat: 22.5460, type: '餐饮服务', rating: 4.5, cost: 30 },
            ]
        },
        '长沙': {
            center: { lng: 112.9388, lat: 28.2282 },
            pois: [
                { name: '橘子洲', address: '长沙市岳麓区橘子洲头', lng: 112.9650, lat: 28.2250, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '岳麓山', address: '长沙市岳麓区麓山路82号', lng: 112.9350, lat: 28.1850, type: '风景名胜', rating: 4.7, cost: 0 },
                { name: '太平老街', address: '长沙市天心区太平街', lng: 112.9350, lat: 28.2050, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '湖南博物院', address: '长沙市开福区东风路50号', lng: 112.9750, lat: 28.2050, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '花明楼', address: '长沙市宁乡市花明楼镇', lng: 112.5650, lat: 28.0350, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '世界之窗', address: '长沙市开福区三一大道485号', lng: 113.0550, lat: 28.2450, type: '风景名胜', rating: 4.5, cost: 200 },
                { name: '黄兴路步行街', address: '长沙市天心区黄兴南路', lng: 112.9350, lat: 28.1950, type: '购物服务', rating: 4.5, cost: 0 },
                { name: '马王堆汉墓', address: '长沙市芙蓉区马王堆', lng: 113.0250, lat: 28.2050, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '烈士公园', address: '长沙市开福区东风路1号', lng: 112.9850, lat: 28.2150, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '铜官窑', address: '长沙市望城区铜官街道', lng: 112.7050, lat: 28.2850, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '臭豆腐', address: '长沙市天心区太平街', lng: 112.9360, lat: 28.2060, type: '餐饮服务', rating: 4.6, cost: 10 },
                { name: '长沙小龙虾', address: '长沙市天心区黄兴路', lng: 112.9360, lat: 28.1960, type: '餐饮服务', rating: 4.7, cost: 120 },
            ]
        },
        '青岛': {
            center: { lng: 120.3826, lat: 36.0671 },
            pois: [
                { name: '栈桥', address: '青岛市市南区太平路', lng: 120.3850, lat: 36.0650, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '八大关', address: '青岛市市南区山海关路', lng: 120.3650, lat: 36.0550, type: '风景名胜', rating: 4.8, cost: 0 },
                { name: '崂山', address: '青岛市崂山区崂山', lng: 120.6650, lat: 36.2050, type: '风景名胜', rating: 4.7, cost: 130 },
                { name: '青岛啤酒博物馆', address: '青岛市市北区登州路56号', lng: 120.3650, lat: 36.0850, type: '风景名胜', rating: 4.6, cost: 60 },
                { name: '金沙滩', address: '青岛市黄岛区金沙滩路', lng: 120.2250, lat: 36.0050, type: '风景名胜', rating: 4.5, cost: 0 },
                { name: '五四广场', address: '青岛市市南区浮山湾', lng: 120.3350, lat: 36.0650, type: '风景名胜', rating: 4.6, cost: 0 },
                { name: '信号山公园', address: '青岛市市南区龙山路17号', lng: 120.3650, lat: 36.0750, type: '风景名胜', rating: 4.5, cost: 15 },
                { name: '海军博物馆', address: '青岛市市南区莱阳路8号', lng: 120.3750, lat: 36.0650, type: '风景名胜', rating: 4.5, cost: 30 },
                { name: '小青岛', address: '青岛市市南区青岛湾', lng: 120.3850, lat: 36.0550, type: '风景名胜', rating: 4.4, cost: 0 },
                { name: '中山路步行街', address: '青岛市市南区中山路', lng: 120.3750, lat: 36.0750, type: '购物服务', rating: 4.4, cost: 0 },
                { name: '青岛啤酒', address: '青岛市市北区登州路', lng: 120.3660, lat: 36.0860, type: '餐饮服务', rating: 4.7, cost: 10 },
                { name: '海鲜大餐', address: '青岛市市南区中山路', lng: 120.3760, lat: 36.0760, type: '餐饮服务', rating: 4.6, cost: 150 },
            ]
        },
    },

    getCityCenter(city) {
        if (!city) return null;
        const norm = this._normCity(city);
        if (!norm) return null;
        const cityData = this._cityData[norm];
        return cityData ? cityData.center : null;
    },

    getCityPOIs(city, prefs = []) {
        if (!city) return [];
        const norm = this._normCity(city);
        if (!norm) return [];
        const cityData = this._cityData[norm];
        if (!cityData) return [];

        let pois = cityData.pois.slice();

        if (prefs.length > 0) {
            const prefMap = {
                food: ['餐饮服务'],
                nature: ['风景名胜'],
                history: ['风景名胜'],
                shopping: ['购物服务'],
                art: ['风景名胜'],
                family: ['风景名胜'],
                niche: ['风景名胜'],
            };
            let preferredTypes = new Set();
            prefs.forEach(p => {
                if (prefMap[p]) prefMap[p].forEach(t => preferredTypes.add(t));
            });
            if (preferredTypes.size > 0) {
                pois.sort((a, b) => {
                    const aPref = preferredTypes.has(a.type) ? 1 : 0;
                    const bPref = preferredTypes.has(b.type) ? 1 : 0;
                    if (bPref !== aPref) return bPref - aPref;
                    return (b.rating || 0) - (a.rating || 0);
                });
            }
        }

        return pois.map(p => ({
            ...p,
            tel: '',
            photos: [],
            cityname: city,
            adname: city,
        }));
    },

    geocodeSpot(city, spotName) {
        if (!city || !spotName) return null;
        const norm = this._normCity(city);
        if (!norm) return null;
        const cityData = this._cityData[norm];
        if (!cityData) return null;

        const found = cityData.pois.find(p =>
            p.name === spotName || p.name.includes(spotName) || spotName.includes(p.name)
        );

        if (found) {
            return {
                ...found,
                tel: '',
                photos: [],
                cityname: norm,
                adname: norm,
            };
        }

        const center = cityData.center;
        return {
            name: spotName,
            address: norm,
            lng: center.lng + (Math.random() - 0.5) * 0.1,
            lat: center.lat + (Math.random() - 0.5) * 0.1,
            type: '风景名胜',
            rating: 4.5,
            cost: 0,
            tel: '',
            photos: [],
            cityname: norm,
            adname: norm,
        };
    },

    searchPOI(keyword, opts = {}) {
        const city = opts.city || '';
        const results = [];

        const normCity = city ? this._normCity(city) : '';
        if (normCity && this._cityData[normCity]) {
            this._cityData[normCity].pois.forEach(p => {
                if (p.name.includes(keyword) || keyword.includes(p.name)) {
                    results.push({
                        ...p,
                        tel: '',
                        photos: [],
                        cityname: normCity,
                        adname: normCity,
                        poi_id: '',
                    });
                }
            });
        }

        if (results.length === 0) {
            for (const [cityName, cityData] of Object.entries(this._cityData)) {
                cityData.pois.forEach(p => {
                    if (p.name.includes(keyword) || keyword.includes(p.name)) {
                        results.push({
                            ...p,
                            tel: '',
                            photos: [],
                            cityname: cityName,
                            adname: cityName,
                            poi_id: '',
                        });
                    }
                });
            }
        }

        return results.slice(0, opts.pageSize || 10);
    },

    hasCity(city) {
        return !!this._cityData[city];
    },

    getAvailableCities() {
        return Object.keys(this._cityData);
    }
};
