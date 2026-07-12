(function(global) {
    'use strict';

    const CanvasEffects = {
        instances: [],
        
        init() {
            this.initHomeParticles();
            this.initClickRipple();
            this.enhanceLoading();
            this.initCheckInConfetti();
            window.addEventListener('resize', () => this.handleResize());
        },

        initHomeParticles() {
            const homePage = document.getElementById('homePage');
            if (!homePage) return;

            homePage.style.position = 'relative';
            homePage.style.overflow = 'hidden';

            const canvas = document.createElement('canvas');
            canvas.className = 'canvas-bg-particles';
            canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
            
            const homeScroll = homePage.querySelector('.home-scroll');
            const homeHeader = homePage.querySelector('.home-header');
            
            if (homeHeader) {
                homeHeader.style.position = 'relative';
                homeHeader.style.zIndex = '1';
            }
            if (homeScroll) {
                homeScroll.style.position = 'relative';
                homeScroll.style.zIndex = '1';
            }
            
            homePage.insertBefore(canvas, homePage.firstChild);

            const ctx = canvas.getContext('2d');
            const particles = [];
            let width, height;
            let planeX = -100, planeY = 100;
            let planePhase = 0;
            let trailPoints = [];

            class Particle {
                constructor() {
                    this.reset(true);
                }
                reset(initial) {
                    this.x = Math.random() * width;
                    this.y = initial ? Math.random() * height : height + 30;
                    this.baseSize = Math.random() * 10 + 4;
                    this.size = this.baseSize;
                    this.speedX = (Math.random() - 0.5) * 0.8;
                    this.speedY = -(Math.random() * 0.6 + 0.2);
                    this.opacity = Math.random() * 0.45 + 0.25;
                    this.pulseSpeed = Math.random() * 0.03 + 0.02;
                    this.pulsePhase = Math.random() * Math.PI * 2;
                    const rand = Math.random();
                    if (rand > 0.7) {
                        this.type = 'star';
                    } else if (rand > 0.45) {
                        this.type = 'diamond';
                    } else {
                        this.type = 'bubble';
                    }
                    this.hueShift = Math.random() * 20 - 10;
                }
                update() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                    this.pulsePhase += this.pulseSpeed;
                    
                    this.size = this.baseSize * (Math.sin(this.pulsePhase) * 0.2 + 1);
                    
                    if (this.y < -40 || this.x < -40 || this.x > width + 40) {
                        this.reset(false);
                    }
                }
                draw(ctx) {
                    const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
                    const alpha = this.opacity * pulse;
                    
                    if (this.type === 'bubble') {
                        const gradient = ctx.createRadialGradient(
                            this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                            this.x, this.y, this.size
                        );
                        gradient.addColorStop(0, `rgba(255,200,160,${alpha})`);
                        gradient.addColorStop(0.4, `rgba(255,158,90,${alpha * 0.5})`);
                        gradient.addColorStop(1, `rgba(255,138,61,0)`);
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
                        ctx.beginPath();
                        ctx.arc(this.x - this.size * 0.25, this.y - this.size * 0.25, this.size * 0.2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (this.type === 'star') {
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.rotate(this.pulsePhase * 0.3);
                        ctx.fillStyle = `rgba(255,138,61,${alpha})`;
                        this.drawStar(ctx, 0, 0, 5, this.size * 0.8, this.size * 0.4);
                        ctx.fillStyle = `rgba(255,200,150,${alpha * 0.5})`;
                        this.drawStar(ctx, 0, 0, 5, this.size, this.size * 0.5);
                        ctx.restore();
                    } else {
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.rotate(Math.PI / 4 + this.pulsePhase * 0.2);
                        ctx.fillStyle = `rgba(255,170,110,${alpha * 0.7})`;
                        ctx.beginPath();
                        ctx.moveTo(0, -this.size);
                        ctx.lineTo(this.size * 0.6, 0);
                        ctx.lineTo(0, this.size);
                        ctx.lineTo(-this.size * 0.6, 0);
                        ctx.closePath();
                        ctx.fill();
                        ctx.restore();
                    }
                }
                drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
                    let rot = Math.PI / 2 * 3;
                    let x = cx;
                    let y = cy;
                    const step = Math.PI / spikes;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - outerRadius);
                    for (let i = 0; i < spikes; i++) {
                        x = cx + Math.cos(rot) * outerRadius;
                        y = cy + Math.sin(rot) * outerRadius;
                        ctx.lineTo(x, y);
                        rot += step;
                        x = cx + Math.cos(rot) * innerRadius;
                        y = cy + Math.sin(rot) * innerRadius;
                        ctx.lineTo(x, y);
                        rot += step;
                    }
                    ctx.lineTo(cx, cy - outerRadius);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            function resize() {
                const rect = homePage.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
                width = rect.width;
                height = rect.height;
            }
            
            function initParticles() {
                particles.length = 0;
                const particleCount = 65;
                for (let i = 0; i < particleCount; i++) {
                    particles.push(new Particle());
                }
            }
            resize();
            initParticles();

            function drawAirplane(ctx) {
                planePhase += 0.008;
                planeX += 0.8;
                planeY = height * 0.25 + Math.sin(planePhase) * 15;
                
                if (planeX > width + 100) {
                    planeX = -80;
                    planeY = height * (0.15 + Math.random() * 0.25);
                    trailPoints = [];
                }
                
                trailPoints.push({ x: planeX - 10, y: planeY, alpha: 0.7, size: 2.5 });
                if (trailPoints.length > 50) trailPoints.shift();
                
                trailPoints.forEach((p, i) => {
                    p.alpha *= 0.95;
                    p.size *= 0.985;
                    ctx.beginPath();
                    ctx.arc(p.x - i * 0.6, p.y + Math.sin(i * 0.3) * 3, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.5})`;
                    ctx.fill();
                });
                
                ctx.save();
                ctx.translate(planeX, planeY);
                ctx.fillStyle = 'rgba(255,138,61,0.85)';
                ctx.beginPath();
                ctx.moveTo(18, 0);
                ctx.lineTo(-10, -8);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-10, 8);
                ctx.closePath();
                ctx.fill();
                ctx.fillRect(-16, -2, 10, 4);
                ctx.restore();
            }

            function drawCloud(ctx, x, y, size, alpha) {
                ctx.fillStyle = `rgba(255,240,230,${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
                ctx.arc(x + size * 0.8, y, size * 0.45, 0, Math.PI * 2);
                ctx.arc(x + size * 0.3, y + size * 0.2, size * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }

            let cloudOffset = 0;
            const clouds = [
                { x: 0.1, y: 0.08, size: 55, speed: 0.15, alpha: 0.4 },
                { x: 0.7, y: 0.15, size: 45, speed: 0.1, alpha: 0.35 },
                { x: 0.4, y: 0.05, size: 40, speed: 0.12, alpha: 0.3 },
                { x: 0.85, y: 0.28, size: 35, speed: 0.08, alpha: 0.25 }
            ];

            function animate() {
                ctx.clearRect(0, 0, width, height);
                
                cloudOffset += 0.015;
                clouds.forEach(c => {
                    let cx = ((c.x * width + cloudOffset * c.speed * 60) % (width + 120)) - 60;
                    drawCloud(ctx, cx, c.y * height, c.size, c.alpha);
                });
                
                particles.forEach(p => {
                    p.update();
                    p.draw(ctx);
                });
                
                drawAirplane(ctx);
                
                requestAnimationFrame(animate);
            }
            animate();

            this.instances.push({ 
                type: 'homeParticles', 
                resize: () => { 
                    resize(); 
                    initParticles();
                }, 
                canvas 
            });
        },

        initClickRipple() {
            document.addEventListener('click', (e) => {
                const target = e.target.closest('button, .quick-action-card, .qa-icon, .mp-filter-chip, .pref-tag-btn, .community-tab, .detail-tab, .tab-item, .ai-action-card, .menu-item, .share-option, .mp-spot-card, .timeline-card, .community-card');
                if (!target) return;
                
                const rect = target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                this.createRipple(target, x, y);
                
                if (target.closest('.main-btn, .mp-gen-btn, .record-checkin-btn, .preview-btn-apply, .exp-save-btn, .empty-btn, .smart-btn')) {
                    this.createParticleBurst(e.clientX, e.clientY);
                }
            });
        },

        createRipple(element, x, y) {
            const existing = element.querySelectorAll('.canvas-ripple');
            existing.forEach(r => r.remove());

            const canvas = document.createElement('canvas');
            canvas.className = 'canvas-ripple';
            canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;border-radius:inherit;overflow:hidden;';
            
            const computedStyle = getComputedStyle(element);
            const pos = computedStyle.position;
            if (pos === 'static') {
                element.style.position = 'relative';
            }
            element.style.overflow = 'hidden';
            element.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            const rect = element.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            let radius = 0;
            const maxRadius = Math.max(rect.width, rect.height) * 1.5;
            const duration = 600;
            const startTime = performance.now();

            function animateRipple() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                ctx.clearRect(0, 0, rect.width, rect.height);
                
                const eased = 1 - Math.pow(1 - progress, 3);
                radius = maxRadius * eased;
                const alpha = 0.5 * (1 - progress);
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,138,61,${alpha})`;
                ctx.fill();
                
                if (progress > 0.2) {
                    ctx.beginPath();
                    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,200,160,${alpha * 0.4})`;
                    ctx.fill();
                }

                if (progress < 1) {
                    requestAnimationFrame(animateRipple);
                } else {
                    canvas.remove();
                }
            }
            animateRipple();
        },

        createParticleBurst(x, y) {
            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            const particles = [];
            const colors = ['#FF8A3D', '#FFB983', '#FFD6A5', '#FF7020', '#FFA35C', '#FFE0CC'];
            const particleCount = 25;

            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.6;
                const speed = Math.random() * 5 + 2.5;
                particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2.5,
                    size: Math.random() * 6 + 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 1,
                    decay: Math.random() * 0.018 + 0.012,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.25,
                    type: Math.random() > 0.4 ? 'circle' : 'rect'
                });
            }

            const duration = 600;
            const startTime = performance.now();

            function animateBurst() {
                const elapsed = performance.now() - startTime;
                if (elapsed > duration) {
                    canvas.remove();
                    return;
                }

                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

                particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.12;
                    p.vx *= 0.98;
                    p.life -= p.decay;
                    p.rotation += p.rotSpeed;

                    if (p.life <= 0) return;

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    
                    if (p.type === 'circle') {
                        ctx.beginPath();
                        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    }
                    ctx.restore();
                });

                requestAnimationFrame(animateBurst);
            }
            animateBurst();
        },

        enhanceLoading() {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (!loadingOverlay) return;

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((m) => {
                    if (m.attributeName === 'style' && m.target.style.display !== 'none') {
                        setTimeout(() => this.drawLoadingStars(), 100);
                    }
                });
            });
            observer.observe(loadingOverlay, { attributes: true });
        },

        drawLoadingStars() {
            const thinkingBody = document.querySelector('.thinking-body');
            if (!thinkingBody) return;
            
            const existing = thinkingBody.querySelector('.canvas-loading-stars');
            if (existing) existing.remove();

            const container = thinkingBody.querySelector('div');
            if (!container) return;
            container.style.position = 'relative';

            const canvas = document.createElement('canvas');
            canvas.className = 'canvas-loading-stars';
            canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
            container.insertBefore(canvas, container.firstChild);

            const ctx = canvas.getContext('2d');
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const stars = [];
            for (let i = 0; i < 25; i++) {
                stars.push({
                    x: Math.random() * rect.width,
                    y: Math.random() * rect.height,
                    size: Math.random() * 3 + 1,
                    twinkleSpeed: Math.random() * 0.04 + 0.02,
                    phase: Math.random() * Math.PI * 2,
                    vx: (Math.random() - 0.5) * 0.3
                });
            }

            const orbitCx = rect.width / 2;
            const orbitCy = rect.height * 0.3;
            let orbitAngle = 0;

            function animateLoading() {
                const overlay = document.getElementById('loadingOverlay');
                if (!overlay || overlay.style.display === 'none') {
                    canvas.remove();
                    return;
                }

                ctx.clearRect(0, 0, rect.width, rect.height);

                stars.forEach(s => {
                    s.phase += s.twinkleSpeed;
                    s.x += s.vx;
                    if (s.x < 0) s.x = rect.width;
                    if (s.x > rect.width) s.x = 0;
                    const alpha = 0.3 + Math.sin(s.phase) * 0.35;
                    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size * (Math.sin(s.phase) * 0.3 + 0.8), 0, Math.PI * 2);
                    ctx.fill();
                });

                orbitAngle += 0.025;
                for (let i = 0; i < 4; i++) {
                    const angle = orbitAngle + (Math.PI * 2 / 4) * i;
                    const orbitR = 45 + i * 12;
                    const px = orbitCx + Math.cos(angle) * orbitR;
                    const py = orbitCy + Math.sin(angle) * orbitR * 0.5;
                    const size = 4 - i * 0.7;
                    const alpha = 0.7 - i * 0.12;
                    
                    const gradient = ctx.createRadialGradient(px, py, 0, px, py, size * 2);
                    gradient.addColorStop(0, `rgba(255,220,180,${alpha})`);
                    gradient.addColorStop(1, `rgba(255,138,61,0)`);
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(px, py, size * 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = `rgba(255,245,230,${alpha})`;
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.strokeStyle = 'rgba(255,185,131,0.15)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.ellipse(orbitCx, orbitCy, 45 + i * 12, (45 + i * 12) * 0.5, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }

                requestAnimationFrame(animateLoading);
            }
            animateLoading();
        },

        initCheckInConfetti() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('#recordCheckinBtn')) {
                    setTimeout(() => this.confettiEffect(), 300);
                }
            });
        },

        confettiEffect() {
            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:10000;';
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            const confetti = [];
            const colors = ['#FF8A3D', '#FFB983', '#5CC6FF', '#8B7CF5', '#FFD6A5', '#FFADAD', '#caffbf', '#9bf6ff', '#FFD700'];
            const shapes = ['rect', 'circle', 'triangle', 'star'];

            for (let i = 0; i < 100; i++) {
                confetti.push({
                    x: canvas.width / dpr / 2 + (Math.random() - 0.5) * 80,
                    y: canvas.height / dpr * 0.35,
                    vx: (Math.random() - 0.5) * 10,
                    vy: -(Math.random() * 10 + 5),
                    size: Math.random() * 10 + 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    shape: shapes[Math.floor(Math.random() * shapes.length)],
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.35,
                    life: 1,
                    decay: Math.random() * 0.006 + 0.004,
                    gravity: 0.12 + Math.random() * 0.05
                });
            }

            function animateConfetti() {
                ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                let alive = false;

                confetti.forEach(c => {
                    if (c.life <= 0) return;
                    alive = true;

                    c.x += c.vx;
                    c.y += c.vy;
                    c.vy += c.gravity;
                    c.vx *= 0.99;
                    c.rotation += c.rotSpeed;
                    c.life -= c.decay;

                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.rotate(c.rotation);
                    ctx.globalAlpha = c.life;
                    ctx.fillStyle = c.color;

                    if (c.shape === 'rect') {
                        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
                    } else if (c.shape === 'circle') {
                        ctx.beginPath();
                        ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (c.shape === 'triangle') {
                        ctx.beginPath();
                        ctx.moveTo(0, -c.size / 2);
                        ctx.lineTo(-c.size / 2, c.size / 2);
                        ctx.lineTo(c.size / 2, c.size / 2);
                        ctx.closePath();
                        ctx.fill();
                    } else {
                        ctx.beginPath();
                        const spikes = 5;
                        const outerR = c.size / 2;
                        const innerR = c.size / 4;
                        let rot = Math.PI / 2 * 3;
                        const step = Math.PI / spikes;
                        ctx.moveTo(0, -outerR);
                        for (let i = 0; i < spikes; i++) {
                            ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
                            rot += step;
                            ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR);
                            rot += step;
                        }
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.restore();
                });

                if (alive) {
                    requestAnimationFrame(animateConfetti);
                } else {
                    canvas.remove();
                }
            }
            animateConfetti();
        },

        handleResize() {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => {
                this.instances.forEach(inst => {
                    if (inst.resize) inst.resize();
                });
            }, 200);
        },

        drawProgressRing(canvas, progress, color) {
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            const cx = w / 2;
            const cy = h / 2;
            const r = Math.min(w, h) / 2 - 4;
            const lineWidth = 4;

            ctx.clearRect(0, 0, w, h);

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + Math.PI * 2 * progress;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.strokeStyle = color || '#FF8A3D';
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    };

    global.CanvasEffects = CanvasEffects;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CanvasEffects.init());
    } else {
        CanvasEffects.init();
    }
})(window);
