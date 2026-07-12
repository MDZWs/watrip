const CalendarModule = {
    calendarStart: null,
    calendarEnd: null,
    weatherData: {},
    weatherCity: '',
    mode: 'range',
    selectedDate: null,

    show(container, onConfirm, options = {}) {
        this.mode = options.mode || 'range';
        this.onConfirm = onConfirm;
        
        if (this.mode === 'single') {
            this.selectedDate = options.selectedDate ? new Date(options.selectedDate) : null;
            this.calendarStart = null;
            this.calendarEnd = null;
        } else {
            this.calendarStart = options.startDate ? new Date(options.startDate) : (App.startDate ? new Date(App.startDate) : null);
            this.calendarEnd = options.endDate ? new Date(options.endDate) : (App.endDate ? new Date(App.endDate) : null);
            this.selectedDate = null;
        }
        
        this.overlay = document.getElementById('datePickerOverlay');
        this.overlay.classList.add('show');
        
        const titleEl = this.overlay.querySelector('.date-picker-title');
        if (titleEl) {
            titleEl.textContent = options.title || (this.mode === 'single' ? '选择日期' : '选择日期');
        }
        
        const confirmBtn = document.getElementById('dateConfirmBtn');
        if (confirmBtn) {
            confirmBtn.textContent = options.confirmText || '确认';
        }
        
        this.render();
        if (options.loadWeather !== false) {
            this.loadWeather();
        }
    },

    close() {
        if (this.overlay) this.overlay.classList.remove('show');
    },

    closeOnOverlay(e) {
        if (e.target.id === 'datePickerOverlay') this.close();
    },

    render() {
        const body = document.getElementById('calendarBody');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let html = '';
        const startMonth = new Date(today);
        startMonth.setDate(1);
        
        for (let m = 0; m < 3; m++) {
            const monthDate = new Date(startMonth);
            monthDate.setMonth(startMonth.getMonth() + m);
            
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const firstWeekday = firstDay.getDay();
            
            html += `<div class="calendar-month">`;
            html += `<div class="calendar-month-title">${year}年${month + 1}月</div>`;
            html += `<div class="calendar-weekdays">
                <div class="calendar-weekday">日</div>
                <div class="calendar-weekday">一</div>
                <div class="calendar-weekday">二</div>
                <div class="calendar-weekday">三</div>
                <div class="calendar-weekday">四</div>
                <div class="calendar-weekday">五</div>
                <div class="calendar-weekday">六</div>
            </div>`;
            html += `<div class="calendar-days">`;
            
            for (let i = 0; i < firstWeekday; i++) {
                html += `<div></div>`;
            }
            
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d);
                const dateStr = this.formatDateFull(date);
                const isPast = date < today;
                const isToday = this.isSameDay(date, today);
                const isStart = this.calendarStart && this.isSameDay(date, this.calendarStart);
                const isEnd = this.calendarEnd && this.isSameDay(date, this.calendarEnd);
                const isSelected = this.mode === 'single' && this.selectedDate && this.isSameDay(date, this.selectedDate);
                
                let classes = 'calendar-day';
                if (isPast) classes += ' disabled';
                if (isToday) classes += ' today';
                if (isSelected) {
                    classes += ' range-start range-end';
                } else {
                    if (isStart) classes += ' range-start';
                    if (isEnd) classes += ' range-end';
                    if (!isStart && !isEnd && this.calendarStart && this.calendarEnd) {
                        const startDay = new Date(this.calendarStart.getFullYear(), this.calendarStart.getMonth(), this.calendarStart.getDate());
                        const endDay = new Date(this.calendarEnd.getFullYear(), this.calendarEnd.getMonth(), this.calendarEnd.getDate());
                        const curDay = new Date(year, month, d);
                        if (curDay > startDay && curDay < endDay) {
                            classes += ' in-range';
                        }
                    }
                }
                
                const weather = this.weatherData[dateStr];
                let weatherHtml = '';
                if (weather) {
                    weatherHtml = `<div class="weather-icon">${weather.icon}</div>`;
                }
                
                html += `<div class="${classes}" onclick="${isPast ? '' : `CalendarModule.selectDate('${dateStr}')`}">
                    <span>${d}</span>
                    ${weatherHtml}
                </div>`;
            }
            
            html += `</div></div>`;
        }
        
        body.innerHTML = html;
        this.updateConfirmBtn();
    },

    selectDate(dateStr) {
        const date = new Date(dateStr);
        
        if (this.mode === 'single') {
            this.selectedDate = date;
        } else {
            if (!this.calendarStart || (this.calendarStart && this.calendarEnd)) {
                this.calendarStart = date;
                this.calendarEnd = null;
            } else if (this.calendarStart && !this.calendarEnd) {
                if (date < this.calendarStart) {
                    this.calendarEnd = this.calendarStart;
                    this.calendarStart = date;
                } else if (date.getTime() === this.calendarStart.getTime()) {
                    this.calendarEnd = date;
                } else {
                    this.calendarEnd = date;
                }
            }
        }
        
        this.render();
    },

    confirm() {
        if (this.mode === 'single') {
            if (!this.selectedDate) return;
            if (this.onConfirm) this.onConfirm(new Date(this.selectedDate));
        } else {
            if (!this.calendarStart || !this.calendarEnd) return;
            
            App.startDate = new Date(this.calendarStart);
            App.endDate = new Date(this.calendarEnd);
            
            const textEl = document.getElementById('dateText');
            if (textEl) {
                textEl.textContent = this.formatDateShort(App.startDate) + ' 至 ' + this.formatDateShort(App.endDate);
                textEl.classList.add('selected');
            }
            
            if (this.onConfirm) this.onConfirm();
        }
        this.close();
    },

    updateConfirmBtn() {
        const btn = document.getElementById('dateConfirmBtn');
        if (!btn) return;
        if (this.mode === 'single') {
            btn.disabled = !this.selectedDate;
        } else {
            btn.disabled = !(this.calendarStart && this.calendarEnd);
        }
    },

    isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    },

    formatDateShort(d) {
        return (d.getMonth()+1).toString().padStart(2,'0') + '.' + d.getDate().toString().padStart(2,'0');
    },

    formatDateFull(d) {
        return d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
    },

    async loadWeather() {
        const city = App.destinations[0] || '上海';
        if (city === this.weatherCity && Object.keys(this.weatherData).length > 0) {
            this.render();
            return;
        }
        
        this.weatherCity = city;
        this.weatherData = {};
        
        try {
            const location = encodeURIComponent(city);
            const url = `https://api.seniverse.com/v3/weather/daily.json?key=${CONFIG.SENIVERSE_PRIVATE_KEY}&location=${location}&language=zh-Hans&unit=c&start=0&days=7`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.results && data.results[0] && data.results[0].daily) {
                data.results[0].daily.forEach(day => {
                    this.weatherData[day.date] = {
                        text_day: day.text_day,
                        text_night: day.text_night,
                        high: day.high,
                        low: day.low,
                        icon: this.getWeatherIcon(day.code_day)
                    };
                });
                this.render();
            }
        } catch(e) {
            console.error('天气加载失败', e);
        }
    },

    async getDayWeather(dayNum) {
        const city = App.destinations[0] || '上海';
        
        if (this.weatherCity === city && Object.keys(this.weatherData).length > 0) {
            const targetDate = App.getDateOfDay(dayNum);
            const dateStr = this.formatDateFull(targetDate);
            return this.weatherData[dateStr] || null;
        }
        
        try {
            const location = encodeURIComponent(city);
            const url = `https://api.seniverse.com/v3/weather/daily.json?key=${CONFIG.SENIVERSE_PRIVATE_KEY}&location=${location}&language=zh-Hans&unit=c&start=0&days=7`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.results && data.results[0] && data.results[0].daily) {
                this.weatherCity = city;
                this.weatherData = {};
                data.results[0].daily.forEach(day => {
                    this.weatherData[day.date] = {
                        text_day: day.text_day,
                        text_night: day.text_night,
                        high: day.high,
                        low: day.low,
                        icon: this.getWeatherIcon(day.code_day)
                    };
                });
                
                const targetDate = App.getDateOfDay(dayNum);
                const dateStr = this.formatDateFull(targetDate);
                return this.weatherData[dateStr] || null;
            }
            return null;
        } catch(e) {
            console.error('天气加载失败', e);
            return null;
        }
    },

    getWeatherIcon(code) {
        const iconMap = {
            '0': '☀️', '1': '🌤️', '2': '⛅', '3': '⛅', '4': '☁️',
            '9': '☁️', '10': '🌧️', '11': '🌧️', '12': '🌧️', '13': '⛈️',
            '14': '⛈️', '15': '🌨️', '16': '🌨️', '17': '🌨️', '18': '🌨️',
            '19': '🌫️', '20': '🌫️', '21': '🌫️', '22': '🌫️', '23': '🌪️',
            '24': '💨', '25': '🥶', '26': '🥵', '27': '🌬️', '28': '💨',
            '29': '🌫️', '30': '🌫️', '31': '🌙', '32': '🌙', '33': '🌙',
            '34': '🌙', '35': '🌙', '36': '🌙', '37': '🌙', '38': '🌙'
        };
        return iconMap[code] || '🌈';
    },

    async getWeatherByCity(city) {
        if (!city) return null;
        
        if (window.AMap) {
            try {
                const result = await this._getAmapWeather(city);
                if (result) return result;
            } catch(e) {
                console.warn('高德天气获取失败，降用心知天气', e);
            }
        }
        
        try {
            const location = encodeURIComponent(city);
            const url = `https://api.seniverse.com/v3/weather/daily.json?key=${CONFIG.SENIVERSE_PRIVATE_KEY}&location=${location}&language=zh-Hans&unit=c&start=0&days=7`;
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.results && data.results[0] && data.results[0].daily) {
                const daily = data.results[0].daily;
                const today = daily[0];
                return {
                    text_day: today.text_day,
                    text_night: today.text_night,
                    high: today.high,
                    low: today.low,
                    forecasts: daily.map(d => ({
                        text_day: d.text_day,
                        high: d.high,
                        low: d.low,
                        date: d.date
                    }))
                };
            }
            return null;
        } catch(e) {
            console.error('天气获取失败', e);
            return null;
        }
    },

    _getAmapWeather(city) {
        return new Promise((resolve, reject) => {
            if (!window.AMap) {
                reject(new Error('AMap not loaded'));
                return;
            }
            AMap.plugin(['AMap.Weather'], () => {
                const weather = new AMap.Weather();
                weather.getForecast(city + '市', (status, result) => {
                    if ((status === 'complete' || result?.info === 'OK') && result.forecasts && result.forecasts.length > 0) {
                        const forecasts = result.forecasts.map((f, i) => {
                            const dateStr = f.date;
                            return {
                                text_day: f.dayWeather,
                                text_night: f.nightWeather,
                                high: f.dayTemp,
                                low: f.nightTemp,
                                date: dateStr,
                                _code_day: this._amapWeatherCode(f.dayWeather)
                            };
                        });
                        const today = forecasts[0];
                        resolve({
                            text_day: today.text_day,
                            text_night: today.text_night,
                            high: today.high,
                            low: today.low,
                            forecasts: forecasts
                        });
                    } else {
                        reject(new Error('天气获取失败: ' + (status || result?.info)));
                    }
                });
            });
        });
    },

    _amapWeatherCode(weatherText) {
        const map = {
            '晴': '0',
            '多云': '4',
            '阴': '9',
            '阵雨': '10',
            '雷阵雨': '13',
            '小雨': '10',
            '中雨': '11',
            '大雨': '12',
            '暴雨': '12',
            '雨夹雪': '16',
            '小雪': '15',
            '中雪': '16',
            '大雪': '17',
            '雾': '19',
            '霾': '20',
        };
        for (const [key, code] of Object.entries(map)) {
            if (weatherText && weatherText.includes(key)) return code;
        }
        return '0';
    }
};
