// CanvasEngine: 2D background renderer for Deadline Hero
// Layers: sky gradient → stars → moon → structures → monster → particles

interface Star {
    x: number;
    y: number;
    size: number;
    twinkle: number;
    speed: number;
}

export class CanvasEngine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number = window.innerWidth;
    height: number = window.innerHeight;

    particles: Particle[] = [];
    stars: Star[] = [];
    structures: Structure[] = [];

    monsterX: number;
    monsterAlpha: number = 0;
    redSkyAlpha: number = 0;
    idleRatio: number = 0;

    shakeAmount: number = 0;
    frameCount: number = 0;

    constructor() {
        this.canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.monsterX = window.innerWidth + 350;

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();
        this.generateStars();
        this.loop();
    }

    private generateStars() {
        this.stars = [];
        for (let i = 0; i < 180; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height * 0.65,
                size: Math.random() * 1.8 + 0.3,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.04 + 0.01,
            });
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.generateStars();
    }

    addSpark(x: number, y: number) {
        for (let i = 0; i < 7; i++) {
            this.particles.push(new Particle(x, y, 'spark'));
        }
    }

    addExplosion(x: number, y: number) {
        for (let i = 0; i < 40; i++) {
            this.particles.push(new Particle(x, y, 'explosion'));
        }
    }

    buildStructure() {
        if (Math.random() > 0.72) {
            const x = Math.random() * (this.width - 250) + 125;
            const types: Array<'tree' | 'pine' | 'battlement' | 'ruin'> = ['tree', 'pine', 'battlement', 'ruin'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.structures.push(new Structure(x, this.height, type));
        }
    }

    shake(amount: number) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    reset() {
        this.structures = [];
        this.particles = [];
        this.monsterX = this.width + 350;
        this.monsterAlpha = 0;
        this.redSkyAlpha = 0;
        this.shakeAmount = 0;
        this.idleRatio = 0;
    }

    update(idleRatio: number) {
        this.idleRatio = idleRatio;
        this.frameCount++;

        // Sky danger redness
        if (idleRatio > 0.5) {
            this.redSkyAlpha = Math.min(1, (idleRatio - 0.5) * 2);
        } else {
            this.redSkyAlpha = Math.max(0, this.redSkyAlpha - 0.03);
        }

        // Monster approach
        if (idleRatio > 0.5) {
            const ratio = (idleRatio - 0.5) * 2;
            this.monsterAlpha = Math.min(1, ratio * 1.3);
            this.monsterX = this.width - 20 - (this.width * 0.75) * ratio;
        } else {
            this.monsterAlpha = Math.max(0, this.monsterAlpha - 0.04);
            this.monsterX = Math.min(this.monsterX + 12, this.width + 350);
        }

        // Shake decay
        this.shakeAmount = Math.max(0, this.shakeAmount - 0.7);

        // Twinkle stars
        this.stars.forEach(s => { s.twinkle += s.speed; });

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }

        this.structures.forEach(s => s.update());
    }

    draw() {
        const ctx = this.ctx;

        ctx.save();
        if (this.shakeAmount > 0.5) {
            const sx = (Math.random() - 0.5) * this.shakeAmount * 2;
            const sy = (Math.random() - 0.5) * this.shakeAmount * 2;
            ctx.translate(sx, sy);
        }

        ctx.clearRect(-20, -20, this.width + 40, this.height + 40);

        // --- Sky gradient ---
        const r = Math.round(10 + this.redSkyAlpha * 90);
        const g = Math.round(6 + this.redSkyAlpha * 2);
        const b = Math.round(22 - this.redSkyAlpha * 18);
        const r2 = Math.round(18 + this.redSkyAlpha * 110);
        const g2 = Math.round(12 + this.redSkyAlpha * 5);
        const b2 = Math.round(38 - this.redSkyAlpha * 30);

        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.72);
        skyGrad.addColorStop(0, `rgb(${r},${g},${b})`);
        skyGrad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Red danger vignette overlay
        if (this.redSkyAlpha > 0) {
            const vigRad = ctx.createRadialGradient(
                this.width * 0.5, this.height * 0.5, this.height * 0.1,
                this.width * 0.5, this.height * 0.5, this.height * 0.85
            );
            vigRad.addColorStop(0, 'rgba(0,0,0,0)');
            vigRad.addColorStop(1, `rgba(130,0,0,${this.redSkyAlpha * 0.45})`);
            ctx.fillStyle = vigRad;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // --- Stars ---
        this.stars.forEach(s => {
            const base = 0.35 + 0.65 * Math.abs(Math.sin(s.twinkle));
            const alpha = base * (1 - this.redSkyAlpha * 0.6) * (1 - this.idleRatio * 0.3);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // --- Moon ---
        this.drawMoon(ctx);

        // --- Ground + structures ---
        this.drawGround(ctx);
        this.structures.forEach(s => s.draw(ctx));

        // --- Monster ---
        if (this.monsterAlpha > 0.02) {
            this.drawMonster(ctx);
        }

        // --- Particles ---
        this.particles.forEach(p => p.draw(ctx));

        ctx.restore();
    }

    private drawMoon(ctx: CanvasRenderingContext2D) {
        const mx = this.width * 0.14;
        const my = this.height * 0.14;
        const r = 46;
        const moonAlpha = Math.max(0.05, 1 - this.redSkyAlpha * 0.85);

        ctx.save();
        ctx.globalAlpha = moonAlpha;

        // Outer glow
        const glow = ctx.createRadialGradient(mx, my, r * 0.6, mx, my, r * 2.8);
        glow.addColorStop(0, 'rgba(220, 225, 255, 0.12)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my, r * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Moon body
        const moonGrad = ctx.createRadialGradient(mx - r * 0.28, my - r * 0.28, r * 0.08, mx, my, r);
        moonGrad.addColorStop(0, '#dde4f0');
        moonGrad.addColorStop(0.6, '#b0b8cc');
        moonGrad.addColorStop(1, '#7a8499');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();

        // Moon craters
        ctx.globalAlpha = moonAlpha * 0.4;
        ctx.fillStyle = '#8090aa';
        [[mx + 10, my - 8, 7], [mx - 15, my + 12, 5], [mx + 5, my + 18, 4]].forEach(([cx, cy, cr]) => {
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    private drawGround(ctx: CanvasRenderingContext2D) {
        const groundY = this.height - 75;

        // Ground fill
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, this.height);
        groundGrad.addColorStop(0, '#0c1525');
        groundGrad.addColorStop(1, '#030810');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, this.width, this.height - groundY);

        // Horizon glow line
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.25 + this.idleRatio * 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.width, groundY);
        ctx.stroke();

        // Grass tufts
        ctx.fillStyle = '#1a3d28';
        for (let x = 5; x < this.width; x += 18) {
            const h = 4 + Math.sin(x * 0.13 + this.frameCount * 0.012) * 2;
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x + 3, groundY - h);
            ctx.lineTo(x + 6, groundY);
            ctx.fill();
        }
    }

    private drawMonster(ctx: CanvasRenderingContext2D) {
        const mx = this.monsterX;
        const groundY = this.height - 75;
        const danger = this.redSkyAlpha;
        const alpha = this.monsterAlpha;

        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha);

        const bodyH = 260 + danger * 60;
        const bodyW = 105 + danger * 25;

        // Ground shadow pool
        const shadowGrad = ctx.createRadialGradient(mx, groundY, 0, mx, groundY, bodyW * 1.6);
        shadowGrad.addColorStop(0, `rgba(180, 0, 0, ${alpha * danger * 0.55})`);
        shadowGrad.addColorStop(0.5, `rgba(100, 0, 0, ${alpha * danger * 0.2})`);
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(mx, groundY, bodyW * 1.8, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body silhouette (dark shadow figure)
        ctx.fillStyle = '#030408';
        ctx.beginPath();
        ctx.moveTo(mx - bodyW * 0.5, groundY);
        ctx.bezierCurveTo(
            mx - bodyW * 0.65, groundY - bodyH * 0.3,
            mx - bodyW * 0.42, groundY - bodyH * 0.65,
            mx - bodyW * 0.18, groundY - bodyH
        );
        ctx.lineTo(mx + bodyW * 0.18, groundY - bodyH);
        ctx.bezierCurveTo(
            mx + bodyW * 0.42, groundY - bodyH * 0.65,
            mx + bodyW * 0.65, groundY - bodyH * 0.3,
            mx + bodyW * 0.5, groundY
        );
        ctx.closePath();
        ctx.fill();

        // Left horn
        ctx.fillStyle = '#050508';
        ctx.beginPath();
        ctx.moveTo(mx - bodyW * 0.12, groundY - bodyH);
        ctx.lineTo(mx - bodyW * 0.42, groundY - bodyH - 90);
        ctx.lineTo(mx - bodyW * 0.28, groundY - bodyH - 50);
        ctx.lineTo(mx - bodyW * 0.05, groundY - bodyH - 10);
        ctx.closePath();
        ctx.fill();

        // Right horn
        ctx.beginPath();
        ctx.moveTo(mx + bodyW * 0.12, groundY - bodyH);
        ctx.lineTo(mx + bodyW * 0.42, groundY - bodyH - 90);
        ctx.lineTo(mx + bodyW * 0.28, groundY - bodyH - 50);
        ctx.lineTo(mx + bodyW * 0.05, groundY - bodyH - 10);
        ctx.closePath();
        ctx.fill();

        // Eyes
        const eyePulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
        const eyeBaseY = groundY - bodyH * 0.62;

        // Outer glow eyes
        this.drawEye(ctx, mx - 34, eyeBaseY, 16, eyePulse);
        this.drawEye(ctx, mx + 34, eyeBaseY, 16, eyePulse);
        // Smaller secondary eyes
        this.drawEye(ctx, mx - 18, eyeBaseY - 18, 10, eyePulse * 0.75);
        this.drawEye(ctx, mx + 18, eyeBaseY - 18, 10, eyePulse * 0.75);
        // Third center eye when near
        if (danger > 0.45) {
            this.drawEye(ctx, mx, eyeBaseY - 38, 20, eyePulse * ((danger - 0.45) / 0.55));
        }

        // Claws at bottom
        ctx.fillStyle = '#060609';
        for (let i = -2; i <= 2; i++) {
            const cx = mx + i * 22;
            ctx.beginPath();
            ctx.moveTo(cx - 7, groundY - 5);
            ctx.lineTo(cx + 7, groundY - 5);
            ctx.lineTo(cx + 2, groundY + 28);
            ctx.lineTo(cx, groundY + 34);
            ctx.lineTo(cx - 2, groundY + 28);
            ctx.closePath();
            ctx.fill();
        }

        // Tentacle arms when danger is high
        if (danger > 0.25) {
            const tentAlpha = Math.min(1, (danger - 0.25) / 0.75);
            ctx.globalAlpha = Math.min(1, alpha * tentAlpha);
            ctx.strokeStyle = '#060609';
            ctx.lineCap = 'round';

            const reach = danger * 220;
            const wave = Math.sin(Date.now() * 0.002) * 20;

            // Left arm
            ctx.lineWidth = 9 + danger * 7;
            ctx.beginPath();
            ctx.moveTo(mx - bodyW * 0.48, groundY - bodyH * 0.38);
            ctx.bezierCurveTo(
                mx - bodyW - reach * 0.4, groundY - bodyH * 0.55 + wave,
                mx - bodyW - reach * 0.75, groundY - bodyH * 0.15 + wave * 0.5,
                mx - bodyW - reach, groundY - 40
            );
            ctx.stroke();

            // Right arm (stretches more toward player)
            ctx.lineWidth = 7 + danger * 5;
            ctx.beginPath();
            ctx.moveTo(mx + bodyW * 0.48, groundY - bodyH * 0.38);
            ctx.bezierCurveTo(
                mx + bodyW * 0.3 + reach * 0.3, groundY - bodyH * 0.5 - wave,
                mx + bodyW * 0.1 + reach * 0.55, groundY - bodyH * 0.08 - wave * 0.4,
                mx + bodyW * 0.2 + reach * 0.7, groundY + 10
            );
            ctx.stroke();
        }

        ctx.restore();
    }

    private drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, intensity: number) {
        // Outer glow
        const glowR = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
        glowR.addColorStop(0, `rgba(255, 60, 0, ${intensity * 0.65})`);
        glowR.addColorStop(0.5, `rgba(200, 0, 0, ${intensity * 0.2})`);
        glowR.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowR;
        ctx.beginPath();
        ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Iris
        const irisR = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
        irisR.addColorStop(0, `rgba(255, ${Math.round(80 + intensity * 40)}, 0, 1)`);
        irisR.addColorStop(0.6, `rgba(200, 20, 0, 1)`);
        irisR.addColorStop(1, `rgba(80, 0, 0, 1)`);
        ctx.fillStyle = irisR;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Slit pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.22, r * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    loop() {
        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }
}

class Structure {
    x: number;
    y: number;
    type: 'tree' | 'pine' | 'battlement' | 'ruin';
    growHeight: number = 0;
    maxHeight: number;
    details: number[];

    constructor(x: number, y: number, type: 'tree' | 'pine' | 'battlement' | 'ruin') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.maxHeight = type === 'tree' || type === 'pine'
            ? 70 + Math.random() * 60
            : 130 + Math.random() * 110;
        this.details = [Math.random(), Math.random(), Math.random()];
    }

    update() {
        if (this.growHeight < this.maxHeight) this.growHeight += 2.5;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const h = Math.min(this.growHeight, this.maxHeight);
        const groundY = this.y - 75;
        const { x } = this;

        ctx.save();
        ctx.globalAlpha = Math.min(1, this.growHeight / (this.maxHeight * 0.3));

        if (this.type === 'tree') {
            ctx.fillStyle = '#0f3320';
            ctx.fillRect(x - 5, groundY - h * 0.38, 10, h * 0.38);
            ctx.fillStyle = '#122e1c';
            ctx.beginPath();
            ctx.arc(x, groundY - h * 0.52, h * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0d2718';
            ctx.beginPath();
            ctx.arc(x - h * 0.12, groundY - h * 0.70, h * 0.26, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + h * 0.1, groundY - h * 0.72, h * 0.24, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'pine') {
            ctx.fillStyle = '#0f3320';
            ctx.fillRect(x - 4, groundY - h * 0.28, 8, h * 0.28);
            const layers = 4;
            for (let i = 0; i < layers; i++) {
                const lw = h * 0.38 * (1 - i * 0.2);
                const ly = groundY - h * (0.28 + i * 0.19);
                ctx.fillStyle = i % 2 === 0 ? '#112b1e' : '#0d2316';
                ctx.beginPath();
                ctx.moveTo(x - lw, ly);
                ctx.lineTo(x + lw, ly);
                ctx.lineTo(x, ly - h * 0.3);
                ctx.closePath();
                ctx.fill();
            }
        } else if (this.type === 'battlement') {
            const w = 55 + this.details[0] * 35;
            ctx.fillStyle = '#141820';
            ctx.fillRect(x - w / 2, groundY - h, w, h);
            // Merlons
            ctx.fillStyle = '#0e121a';
            const mw = 11, mh = 18;
            const cnt = Math.floor(w / (mw * 2.2));
            for (let i = 0; i < cnt; i++) {
                const mx = x - w / 2 + i * (mw * 2.2) + mw * 0.3;
                ctx.fillRect(mx, groundY - h - mh, mw, mh);
            }
            // Window slit
            if (h > 70) {
                ctx.fillStyle = '#000';
                ctx.fillRect(x - 4, groundY - h * 0.55, 8, 18);
                // Faint glow from window
                const winGlow = ctx.createRadialGradient(x, groundY - h * 0.47, 0, x, groundY - h * 0.47, 18);
                winGlow.addColorStop(0, 'rgba(255,150,0,0.12)');
                winGlow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = winGlow;
                ctx.beginPath();
                ctx.arc(x, groundY - h * 0.47, 18, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'ruin') {
            const w = 18 + this.details[0] * 14;
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(x - w / 2, groundY - h, w, h);
            // Broken jagged top
            ctx.fillStyle = '#12100f';
            ctx.beginPath();
            ctx.moveTo(x - w / 2, groundY - h);
            const steps = 5;
            for (let i = 0; i <= steps; i++) {
                const px = x - w / 2 + (w / steps) * i;
                const py = groundY - h - (i % 2 === 0 ? 0 : 8 + this.details[1] * 12);
                ctx.lineTo(px, py);
            }
            ctx.lineTo(x + w / 2, groundY - h);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;

    constructor(x: number, y: number, type: 'spark' | 'explosion') {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = type === 'explosion' ? Math.random() * 9 + 4 : Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - (type === 'explosion' ? 3 : 0);
        this.maxLife = type === 'explosion' ? Math.random() * 45 + 30 : Math.random() * 22 + 12;
        this.life = this.maxLife;
        if (type === 'explosion') {
            const colors = ['#ef4444', '#f97316', '#fbbf24', '#dc2626', '#ff6600'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.size = Math.random() * 5 + 2.5;
        } else {
            const colors = ['#60a5fa', '#818cf8', '#fcd34d', '#a78bfa', '#38bdf8'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.size = Math.random() * 3 + 1;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.22;
        this.vx *= 0.97;
        this.life--;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
