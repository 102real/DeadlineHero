// 간단한 절차적 생성(Procedural Generation) 오디오 엔진
export class AudioEngine {
    ctx: AudioContext | null = null;
    weaponType: string = 'keyboard';
    lastHeartbeat: number = 0;

    constructor() {
        // 오디오 컨텍스트는 사용자 상호작용 후 생성
    }

    init(weapon: string) {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.weaponType = weapon;
    }

    playTypingSound() {
        if (!this.ctx || this.weaponType === 'none') return;

        if (this.weaponType === 'sword') {
            // 검 휘두르는 소리 (짧은 슬라이드 다운)
            this.playTone(800, 200, 'triangle', 0.1, 0.05, 0.5);
        } else if (this.weaponType === 'magic') {
            // 마법 발사 소리 (높은 피치 슬라이드 업)
            this.playTone(1200, 1800, 'sine', 0.15, 0.1, 0.3);
        } else {
            // 기본 키보드 (기계식 타건음 흉내 - 짧은 틱)
            this.playTone(300 + Math.random() * 50, 0, 'square', 0.05, 0.01, 0.2);
        }
    }

    playHeartbeat() {
        if (!this.ctx || this.weaponType === 'none') return;
        const now = this.ctx.currentTime;
        if (now - this.lastHeartbeat < 0.5) return; // 너무 자주 재생 방지
        this.lastHeartbeat = now;

        // 심장 박동 (쿵쾅)
        this.playTone(100, 40, 'sine', 0.3, 0.1, 1.0);
        setTimeout(() => {
            this.playTone(120, 50, 'sine', 0.4, 0.1, 0.8);
        }, 150);
    }

    playDeathSound() {
        if (!this.ctx || this.weaponType === 'none') return;

        // 폭발/글자 파괴 소리 (노이즈 흉내)
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.playTone(100 + Math.random() * 500, 50, 'square', 0.3 + Math.random() * 0.2, 0.05, 0.5);
            }, Math.random() * 300);
        }
    }

    playClearSound() {
        if (!this.ctx || this.weaponType === 'none') return;
        // 빰빰빰
        this.playTone(440, 440, 'triangle', 0.2, 0.05, 0.5);
        setTimeout(() => this.playTone(554, 554, 'triangle', 0.2, 0.05, 0.5), 200);
        setTimeout(() => this.playTone(659, 659, 'triangle', 0.4, 0.1, 0.6), 400);
    }

    private playTone(startFreq: number, endFreq: number, type: OscillatorType, duration: number, attack: number, vol: number) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, t);
        if (endFreq > 0) {
            osc.frequency.exponentialRampToValueAtTime(endFreq || 0.01, t + duration);
        }

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + attack);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration);
    }
}
