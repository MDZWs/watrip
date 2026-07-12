const DragSort = {
    isDragging: false,
    dragEl: null,
    placeholder: null,
    startY: 0,
    startX: 0,
    currentDi: 0,
    currentSi: 0,
    longPressTimer: null,
    onDrop: null,
    container: null,
    _bound: false,

    init(container, onDropCallback) {
        if (this.container === container && this._bound) {
            this.onDrop = onDropCallback;
            this._bindItems(container);
            return;
        }
        this.onDrop = onDropCallback;
        this.container = container;
        this._bound = true;
        this._bindItems(container);
    },

    _bindItems(container) {
        const items = container.querySelectorAll('.timeline-item:not([data-drag-bound])');
        items.forEach((item, idx) => {
            item.dataset.dragBound = '1';
            item.addEventListener('touchstart', (e) => this._onTouchStart(e, item, container), { passive: false });
            item.addEventListener('mousedown', (e) => this._onMouseDown(e, item, container));
        });
    },

    _onTouchStart(e, item, container) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.spot-img')) return;
        
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.dragEl = item;
        
        const di = parseInt(item.dataset.di);
        const si = parseInt(item.dataset.si);
        this.currentDi = di;
        this.currentSi = si;

        this.longPressTimer = setTimeout(() => {
            this._startDrag(container, touch.clientX, touch.clientY);
        }, 500);

        const onMove = (e) => {
            const t = e.touches[0];
            const dx = Math.abs(t.clientX - this.startX);
            const dy = Math.abs(t.clientY - this.startY);
            if (dx > 10 || dy > 10) {
                clearTimeout(this.longPressTimer);
            }
            if (this.isDragging) {
                e.preventDefault();
                this._onMove(t.clientX, t.clientY, container);
            }
        };

        const onEnd = (e) => {
            clearTimeout(this.longPressTimer);
            if (this.isDragging) {
                this._endDrag(container);
            }
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    },

    _onMouseDown(e, item, container) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.spot-img')) return;
        if ('ontouchstart' in window) return;

        this.startX = e.clientX;
        this.startY = e.clientY;
        this.dragEl = item;
        
        const di = parseInt(item.dataset.di);
        const si = parseInt(item.dataset.si);
        this.currentDi = di;
        this.currentSi = si;

        this.longPressTimer = setTimeout(() => {
            this._startDrag(container, e.clientX, e.clientY);
        }, 300);

        const onMove = (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this._onMove(e.clientX, e.clientY, container);
            }
        };

        const onEnd = () => {
            clearTimeout(this.longPressTimer);
            if (this.isDragging) {
                this._endDrag(container);
            }
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    },

    _startDrag(container, x, y) {
        this.isDragging = true;
        if (navigator.vibrate) navigator.vibrate(50);

        const rect = this.dragEl.getBoundingClientRect();
        this.dragEl.style.width = rect.width + 'px';
        this.dragEl.style.height = rect.height + 'px';
        this.dragEl.classList.add('dragging');

        this.placeholder = document.createElement('div');
        this.placeholder.className = 'drag-placeholder';
        this.placeholder.style.height = rect.height + 'px';
        this.dragEl.parentNode.insertBefore(this.placeholder, this.dragEl);

        this._offsetX = x - rect.left;
        this._offsetY = y - rect.top;

        this._showDeleteZone();
        requestAnimationFrame(() => {
            const dz = document.getElementById('dragDeleteZone');
            if (dz) dz.classList.add('show');
        });
    },

    _onMove(x, y, container) {
        this.dragEl.style.position = 'fixed';
        this.dragEl.style.left = (x - this._offsetX) + 'px';
        this.dragEl.style.top = (y - this._offsetY) + 'px';
        this.dragEl.style.zIndex = '9999';
        this.dragEl.style.pointerEvents = 'none';

        const deleteZone = document.getElementById('dragDeleteZone');
        if (deleteZone) {
            const dzRect = deleteZone.getBoundingClientRect();
            const dragRect = this.dragEl.getBoundingClientRect();
            const inZone = dragRect.bottom > dzRect.top + 30;
            deleteZone.classList.toggle('active', inZone);
            deleteZone.querySelector('span').textContent = inZone ? '🗑️ 松开删除' : '🗑️ 拖到这里删除';
        }

        this.dragEl.style.display = 'none';
        const below = document.elementFromPoint(x, y);
        this.dragEl.style.display = '';

        const targetItem = below?.closest('.timeline-item');
        const targetDay = below?.closest('.day-section');
        
        if (targetItem && targetItem !== this.dragEl) {
            const targetRect = targetItem.getBoundingClientRect();
            const after = y > targetRect.top + targetRect.height / 2;
            if (after) {
                targetItem.parentNode.insertBefore(this.placeholder, targetItem.nextSibling);
            } else {
                targetItem.parentNode.insertBefore(this.placeholder, targetItem);
            }
        } else if (targetDay && !targetItem) {
            const list = targetDay.querySelector('.timeline-list');
            if (list && !list.contains(this.placeholder)) {
                list.appendChild(this.placeholder);
            }
        }
    },

    _endDrag(container) {
        this.isDragging = false;

        const deleteZone = document.getElementById('dragDeleteZone');
        let isDelete = false;
        
        if (deleteZone) {
            const dzRect = deleteZone.getBoundingClientRect();
            const dragRect = this.dragEl.getBoundingClientRect();
            const centerY = dragRect.top + dragRect.height / 2;
            isDelete = centerY > dzRect.top + 30;
            deleteZone.classList.remove('show', 'active');
            setTimeout(() => deleteZone.remove(), 280);
        }

        this.dragEl.classList.remove('dragging');
        this.dragEl.style.position = '';
        this.dragEl.style.left = '';
        this.dragEl.style.top = '';
        this.dragEl.style.width = '';
        this.dragEl.style.height = '';
        this.dragEl.style.zIndex = '';
        this.dragEl.style.pointerEvents = '';

        this.placeholder.parentNode.insertBefore(this.dragEl, this.placeholder);
        const newDi = parseInt(this.placeholder.closest('.day-section')?.dataset.day || this.currentDi);
        let newSi = Array.from(this.placeholder.parentNode.querySelectorAll('.timeline-item')).indexOf(this.dragEl);
        
        this.placeholder.remove();
        this.placeholder = null;
        this.dragEl = null;

        if (isDelete) {
            if (this.onDrop) {
                this.onDrop({ type: 'delete', fromDi: this.currentDi, fromSi: this.currentSi });
            }
        } else {
            if (this.onDrop && (newDi !== this.currentDi || newSi !== this.currentSi)) {
                this.onDrop({ type: 'move', fromDi: this.currentDi, fromSi: this.currentSi, toDi: newDi, toSi: newSi });
            }
        }
    },

    _showDeleteZone() {
        const dz = document.createElement('div');
        dz.id = 'dragDeleteZone';
        dz.className = 'drag-delete-zone';
        dz.innerHTML = '<span>🗑️ 拖到这里删除</span>';
        document.body.appendChild(dz);
    }
};

window.DragSort = DragSort;
