export class CanvasEngine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number = window.innerWidth;
    height: number = window.innerHeight;

    particles: Particle[] = [];
    structures: Structure[] = []; // 월드 빌딩 에셋
    monsterX: number = window.innerWidth + 200; // 화면 밖
    redSkyAlpha: number = 0; // 0 ~ 1, 유휴 시 증가

    constructor() {
        this.canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();
        this.loop();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    addSpark(x: number, y: number) {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(x, y));
        }
    }

    buildStructure() {
        // 플레이 진행도에 따라 구조물(건물, 나무) 랜덤 추가
        if (Math.random() > 0.8) {
            const x = Math.random() * (this.width - 200) + 100;
            const type = Math.random() > 0.5 ? 'tree' : 'building';
            this.structures.push(new Structure(x, this.height, type));
        }
    }

    reset() {
        this.structures = [];
        this.monsterX = this.width + 200;
        this.redSkyAlpha = 0;
    }

    update(idleRatio: number) {
        // idleRatio (0.0 to 1.0) 
        // 0 = active, 1.0 = deadline reached

        // Background Color based on Idle ratio
        if (idleRatio > 0.5) {
            this.redSkyAlpha = (idleRatio - 0.5) * 2; // 0.5~1.0을 0~1.0으로 스케일
        } else {
            this.redSkyAlpha = 0;
        }

        // Monster Approaches
        if (idleRatio > 0.5) {
            const approachDistance = this.width * 0.8; // 다가올 최대 거리
            const ratio = (idleRatio - 0.5) * 2;
            this.monsterX = this.width - (approachDistance * ratio);
        } else {
            this.monsterX += 10; // 멀어짐
            if (this.monsterX > this.width + 200) this.monsterX = this.width + 200;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        this.structures.forEach(s => s.update());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Red Sky layer
        if (this.redSkyAlpha > 0) {
            this.ctx.fillStyle = `rgba(100, 0, 0, ${this.redSkyAlpha * 0.5})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Draw Structures
        this.structures.forEach(s => s.draw(this.ctx));

        // Draw Monster (간단한 직사각형/눈동자 형태)
        this.ctx.fillStyle = '#000000'; // 새까만 그림자
        this.ctx.beginPath();
        this.ctx.ellipse(this.monsterX, this.height - 150, 200, 300, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 눈
        if (this.monsterX < this.width) { // 화면 안에 있으면
            this.ctx.fillStyle = 'red';
            this.ctx.beginPath();
            // 눈물방울이나 날카로운 눈
            this.ctx.ellipse(this.monsterX - 50, this.height - 200, 20, 10, Math.PI / 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));
    }

    loop() {
        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }
}

class Structure {
    x: number;
    y: number;
    type: string;
    height: number;
    maxHeight: number;
    color: string;

    constructor(x: number, y: number, type: string) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.height = 0;
        this.maxHeight = type === 'tree' ? 100 + Math.random() * 50 : 200 + Math.random() * 150;
        this.color = type === 'tree' ? '#14532d' : '#334155'; // Dark green or slate
    }

    update() {
        if (this.height < this.maxHeight) {
            this.height += 2; // 자라나는 애니메이션
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        if (this.type === 'tree') {
            ctx.fillRect(this.x - 10, this.y - this.height, 20, this.height); // 기둥
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height, 40, 0, Math.PI * 2); // 잎
            ctx.fill();
        } else {
            ctx.fillRect(this.x - 30, this.y - this.height, 60, this.height);
        }
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

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.maxLife = Math.random() * 20 + 20;
        this.life = this.maxLife;

        const colors = ['#60a5fa', '#3b82f6', '#fcd34d']; // 파란색/노란색 스파크
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.life--;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}
