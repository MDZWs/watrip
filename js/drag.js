const DragModule = {
    draggedElement: null,
    draggedDay: null,
    draggedIndex: null,

    setupDayList(dayNum) {
        const list = document.getElementById(`dayPlanList_${dayNum}`);
        if (!list) return;

        const items = list.querySelectorAll('.timeline-item');
        items.forEach((item, index) => {
            item.removeEventListener('dragstart', this.handleDragStart);
            item.removeEventListener('dragend', this.handleDragEnd);
            item.removeEventListener('dragover', this.handleDragOver);
            item.removeEventListener('drop', this.handleDrop);
            item.removeEventListener('dragleave', this.handleDragLeave);

            item.addEventListener('dragstart', (e) => this.handleDragStart(e, item, dayNum, index));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e, item));
            item.addEventListener('dragover', (e) => this.handleDragOver(e, item));
            item.addEventListener('drop', (e) => this.handleDrop(e, item, dayNum, index));
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e, item));
        });
    },

    handleDragStart(e, item, dayNum, index) {
        this.draggedElement = item;
        this.draggedDay = dayNum;
        this.draggedIndex = index;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    },

    handleDragEnd(e, item) {
        item.classList.remove('dragging');
        document.querySelectorAll('.timeline-item').forEach(el => {
            el.classList.remove('drag-over');
        });
        this.draggedElement = null;
    },

    handleDragOver(e, item) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
    },

    handleDragLeave(e, item) {
        item.classList.remove('drag-over');
    },

    handleDrop(e, targetItem, targetDay, targetIndex) {
        e.preventDefault();
        targetItem.classList.remove('drag-over');

        if (!this.draggedElement || this.draggedDay !== targetDay) return;
        if (this.draggedIndex === targetIndex) return;

        const day = App.tripData.dayPlans.find(d => d.day === targetDay);
        if (!day) return;

        const [movedSpot] = day.spots.splice(this.draggedIndex, 1);
        day.spots.splice(targetIndex, 0, movedSpot);

        App.spotsReordered(targetDay);
    }
};
