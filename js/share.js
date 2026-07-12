const ShareModule = {
    show() {
        document.getElementById('shareOverlay').classList.add('show');
    },

    close() {
        document.getElementById('shareOverlay').classList.remove('show');
    },

    closeOnOverlay(e) {
        if (e.target.id === 'shareOverlay') this.close();
    },

    exportICS() {
        if (!App.tripData) return;

        let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//哇途旅行//TripPlan//CN\r\nCALSCALE:GREGORIAN\r\n';

        App.tripData.dayPlans.forEach(day => {
            const date = App.getDateOfDay(day.day);
            day.spots.forEach((spot, i) => {
                const startHour = parseInt((spot.startTime || '09:00').split(':')[0]);
                const startMin = parseInt((spot.startTime || '09:00').split(':')[1] || 0);
                const endHour = parseInt((spot.endTime || '11:00').split(':')[0]);
                const endMin = parseInt((spot.endTime || '11:00').split(':')[1] || 0);

                const start = new Date(date);
                start.setHours(startHour, startMin, 0);
                const end = new Date(date);
                end.setHours(endHour, endMin, 0);

                const formatICSDate = (d) => {
                    return d.getFullYear() +
                           String(d.getMonth()+1).padStart(2,'0') +
                           String(d.getDate()).padStart(2,'0') + 'T' +
                           String(d.getHours()).padStart(2,'0') +
                           String(d.getMinutes()).padStart(2,'0') + '00';
                };

                ics += 'BEGIN:VEVENT\r\n';
                ics += `UID:trip-${Date.now()}-${day.day}-${i}@yuanzhou.app\r\n`;
                ics += `DTSTAMP:${formatICSDate(new Date())}\r\n`;
                ics += `DTSTART:${formatICSDate(start)}\r\n`;
                ics += `DTEND:${formatICSDate(end)}\r\n`;
                ics += `SUMMARY:${spot.emoji || '📍'} ${spot.name}\r\n`;
                ics += `DESCRIPTION:${(spot.description || '').replace(/\n/g, '\\n')}\\n地址: ${spot.address || ''}\\n交通: ${spot.transport || ''}\r\n`;
                ics += `LOCATION:${spot.address || spot.name}\r\n`;
                ics += 'END:VEVENT\r\n';
            });
        });

        ics += 'END:VCALENDAR\r\n';

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${App.tripData.title || '旅行行程'}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        UIRender.showToast('日历文件已下载 📅');
        this.close();
    },

    copyText() {
        if (!App.tripData) return;

        let text = `🗺️ ${App.tripData.title}\n\n`;
        App.tripData.dayPlans.forEach(day => {
            text += `📅 ${day.dateLabel} ${day.theme}\n`;
            day.spots.forEach((spot, i) => {
                text += `${i+1}. ${spot.emoji} ${spot.name} (${spot.startTime}-${spot.endTime})\n`;
                if (spot.address) text += `   📍 ${spot.address}\n`;
            });
            text += '\n';
        });
        text += '—— 由 哇途·AI旅行规划师 生成 ✨';

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                UIRender.showToast('行程已复制到剪贴板 📋');
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            UIRender.showToast('行程已复制到剪贴板 📋');
        }
        this.close();
    },

    generatePoster() {
        if (!App.tripData) return;
        UIRender.showToast('海报生成功能正在完善中 🎨');
        this.close();
    },

    saveToLocal() {
        if (!App.tripData) return;

        try {
            const tripToSave = {
                ...App.tripData,
                destinations: App.destinations,
                startDate: App.startDate ? CalendarModule.formatDateFull(App.startDate) : null,
                endDate: App.endDate ? CalendarModule.formatDateFull(App.endDate) : null,
                prefs: App.selectedPrefs,
                createdAt: new Date().toISOString(),
            };
            
            let savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
            savedTrips.unshift(tripToSave);
            if (savedTrips.length > 20) savedTrips = savedTrips.slice(0, 20);
            localStorage.setItem('savedTrips', JSON.stringify(savedTrips));
            
            UIRender.showToast('行程已保存到本地 💾');
        } catch (e) {
            UIRender.showToast('保存失败，请重试');
        }
        this.close();
    }
};
