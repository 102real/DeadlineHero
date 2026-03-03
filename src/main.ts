import { CanvasEngine } from './canvasEngine';
import { AudioEngine } from './audioEngine';

// ================================================
// DOM Elements
// ================================================
const screenQuest = document.getElementById('screen-quest') as HTMLElement;
const screenBattle = document.getElementById('screen-battle') as HTMLElement;
const screenResult = document.getElementById('screen-result') as HTMLElement;

const questForm = document.getElementById('quest-form') as HTMLFormElement;
const goalInput = document.getElementById('goal-words') as HTMLInputElement;
const weaponSelect = document.getElementById('weapon-sound') as HTMLSelectElement;

const textEditor = document.getElementById('text-editor') as HTMLElement;
const bossHpBar = document.getElementById('boss-hp-bar') as HTMLElement;
const progressText = document.getElementById('progress-text') as HTMLElement;
const tensionBar = document.getElementById('tension-bar') as HTMLElement;
const tensionValueDisplay = document.getElementById('tension-value') as HTMLElement;

const idleTimerBar = document.getElementById('idle-timer-bar') as HTMLElement;
const idleTimerLabel = document.getElementById('idle-timer-label') as HTMLElement;

const resultTitle = document.getElementById('result-title') as HTMLElement;
const resultDesc = document.getElementById('result-desc') as HTMLElement;
const survivingText = document.getElementById('surviving-text') as HTMLElement;
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement;
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;

// ================================================
// Game State
// ================================================
type GameState = 'menu' | 'playing' | 'gameover' | 'clear';
let currentState: GameState = 'menu';

let targetWords = 100;
let currentWords = 0;
let tension = 0;
let maxIdleTime = 10000;

let lastTypeTime = 0;
let timerInterval: number | null = null;
let savedText = '';

const engine = new CanvasEngine();
const audio = new AudioEngine();

// ================================================
// Utils
// ================================================
function switchScreen(screen: HTMLElement) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active-screen'));
    screen.classList.add('active-screen');
}

function getCharCount(text: string): number {
    return text.replace(/\s/g, '').length;
}

function getCaretCoordinates(): { x: number; y: number } {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.x === 0 && rect.y === 0) {
        const editorRect = textEditor.getBoundingClientRect();
        return { x: editorRect.left + 20, y: editorRect.top + 20 };
    }
    return { x: rect.right, y: rect.bottom };
}

function getDifficultyValue(): string {
    const checked = document.querySelector('input[name="difficulty"]:checked') as HTMLInputElement | null;
    return checked ? checked.value : 'normal';
}

// ================================================
// Timer Bar Update
// ================================================
function updateTimerBar(idleTime: number) {
    const ratio = Math.min(1, idleTime / maxIdleTime);
    idleTimerBar.style.width = `${ratio * 100}%`;

    // Colour: blue → yellow → orange → red
    const hue = Math.round(220 - ratio * 220); // 220 (blue) → 0 (red)
    const sat = 80 + ratio * 15;
    const lit = 50 + ratio * 5;
    idleTimerBar.style.background = `hsl(${hue}, ${sat}%, ${lit}%)`;

    if (ratio > 0.7) {
        idleTimerBar.style.boxShadow = `0 0 ${ratio * 14}px hsl(${hue}, 90%, 55%)`;
    } else {
        idleTimerBar.style.boxShadow = 'none';
    }

    // Label
    const secsLeft = Math.ceil((maxIdleTime - idleTime) / 1000);
    if (ratio < 0.01) {
        idleTimerLabel.textContent = '안전';
    } else if (ratio < 1) {
        idleTimerLabel.textContent = `${secsLeft}초`;
    } else {
        idleTimerLabel.textContent = '위험!';
    }
}

function resetTimerBar() {
    idleTimerBar.style.width = '0%';
    idleTimerBar.style.background = '#3b82f6';
    idleTimerBar.style.boxShadow = 'none';
    idleTimerLabel.textContent = '안전';
}

// ================================================
// HUD Updates
// ================================================
function updateHUD() {
    const ratio = Math.min(1, currentWords / targetWords);
    bossHpBar.style.width = `${(1 - ratio) * 100}%`;
    progressText.innerText = `${currentWords} / ${targetWords} 자`;
}

function updateTensionBar() {
    tensionBar.style.width = `${tension}%`;
    tensionValueDisplay.textContent = `${Math.round(tension)}%`;
    if (tension >= 100) {
        tensionBar.style.background = 'linear-gradient(90deg, #7c3aed, #8b5cf6, #a78bfa)';
        tensionBar.style.boxShadow = '0 0 16px rgba(139, 92, 246, 0.7)';
    } else {
        tensionBar.style.background = 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)';
        tensionBar.style.boxShadow = 'none';
    }
}

// ================================================
// Game Flow
// ================================================
function startGame(e: Event) {
    e.preventDefault();

    targetWords = parseInt(goalInput.value) || 100;
    maxIdleTime = getDifficultyValue() === 'hardcore' ? 5000 : 10000;

    currentWords = 0;
    tension = 0;
    savedText = '';
    textEditor.innerHTML = '';
    textEditor.style.visibility = 'visible';
    document.body.className = '';

    engine.reset();
    audio.init(weaponSelect.value);

    updateHUD();
    updateTensionBar();
    resetTimerBar();
    switchScreen(screenBattle);

    currentState = 'playing';
    lastTypeTime = Date.now();

    setTimeout(() => textEditor.focus(), 120);
    startTimer();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(gameLoop, 100);
}

function gameLoop() {
    if (currentState !== 'playing') return;

    const now = Date.now();
    const idleTime = now - lastTypeTime;

    // Tension decay when idle
    if (idleTime > 1200 && tension > 0) {
        tension = Math.max(0, tension - 1.5);
        updateTensionBar();
    }

    const idleRatio = Math.min(1, idleTime / maxIdleTime);
    engine.update(idleRatio);
    updateTimerBar(idleTime);

    const warn1 = maxIdleTime * 0.5;
    const warn2 = maxIdleTime * 0.7;

    if (idleTime >= maxIdleTime) {
        // Death
        currentState = 'gameover';
        triggerShatterEffect();
        setTimeout(() => gameOver('timeout'), 2000);
    } else if (idleTime >= warn2) {
        document.body.className = 'warning-level-2';
        audio.playHeartbeat();
        engine.shake(6);
    } else if (idleTime >= warn1) {
        document.body.className = 'warning-level-1';
        audio.playHeartbeat();
    } else {
        document.body.className = '';
    }
}

function resetTimer() {
    lastTypeTime = Date.now();
    document.body.className = '';
    resetTimerBar();
}

// ================================================
// Typing Handler
// ================================================
function handleTyping() {
    if (currentState !== 'playing') return;
    resetTimer();
    audio.playTypingSound();

    const text = textEditor.innerText;
    const newCount = getCharCount(text);

    if (newCount > currentWords) {
        engine.buildStructure();
        const caret = getCaretCoordinates();
        engine.addSpark(caret.x, caret.y);
    }

    currentWords = newCount;
    tension = Math.min(100, tension + 4.5);
    updateTensionBar();
    updateHUD();

    if (currentWords >= targetWords) {
        gameClear(text);
    }
}

// ================================================
// Focus Lock
// ================================================
window.addEventListener('blur', () => {
    if (currentState === 'playing') {
        currentState = 'gameover';
        triggerShatterEffect();
        setTimeout(() => gameOver('focus_lost'), 2000);
    }
});

// ================================================
// Shatter Effect
// ================================================
function triggerShatterEffect() {
    if (timerInterval) clearInterval(timerInterval);
    document.body.className = '';
    audio.playDeathSound();

    const text = textEditor.innerText;
    savedText = text;
    const rect = textEditor.getBoundingClientRect();

    // Explode from editor center
    engine.addExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2);

    // Scatter characters (limit for perf)
    const chars = text.split('').slice(-180);
    textEditor.innerText = '';
    textEditor.style.visibility = 'hidden';

    chars.forEach((char, i) => {
        if (char === '\n' || char === ' ') return;
        const span = document.createElement('span');
        span.innerText = char;
        span.className = 'shatter-char';
        span.style.left = `${rect.left + Math.random() * rect.width}px`;
        span.style.top = `${rect.top + Math.random() * rect.height}px`;
        span.style.fontSize = '1.1rem';
        span.style.color = `hsl(${Math.random() * 30}, 90%, 60%)`;
        span.style.fontWeight = '600';
        document.body.appendChild(span);

        const vx = (Math.random() - 0.5) * 600;
        const rot = (Math.random() - 0.5) * 720;
        const delay = i * 2;

        span.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${vx}px, ${window.innerHeight + 80}px) rotate(${rot}deg)`, opacity: 0 },
        ], {
            duration: 1400 + Math.random() * 800,
            delay,
            easing: 'cubic-bezier(.17,.84,.44,1)',
            fill: 'forwards',
        });

        setTimeout(() => span.remove(), 2400 + delay);
    });
}

// ================================================
// Game Over / Clear
// ================================================
function gameOver(reason: 'timeout' | 'focus_lost') {
    engine.reset();
    textEditor.style.visibility = 'visible';

    const preview = savedText.length > 0
        ? savedText.slice(-120).trim()
        : '(없음)';

    survivingText.innerText = preview;

    resultTitle.innerText = '게임 오버';
    resultDesc.innerText = reason === 'timeout'
        ? '마감 몬스터에게 집어삼켜졌습니다.\n입력 시간이 초과되었습니다.'
        : '용사가 전장을 이탈하여 세계가 멸망했습니다.\n창 이탈이 감지되었습니다.';

    document.body.className = '';
    switchScreen(screenResult);

    btnCopy.style.display = 'none';
    btnDownload.style.display = 'none';
}

function gameClear(text: string) {
    currentState = 'clear';
    if (timerInterval) clearInterval(timerInterval);
    document.body.className = '';
    audio.playClearSound();

    savedText = text;

    // Victory sparks
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            engine.addSpark(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight * 0.7
            );
        }, i * 120);
    }

    survivingText.innerText = text.slice(-120).trim() || text;

    resultTitle.innerText = '임무 완수!';
    resultDesc.innerText = '마감 몬스터를 성공적으로 물리쳤습니다.\n글이 세계를 구원했습니다.';

    document.body.classList.add('success-state');
    switchScreen(screenResult);

    btnCopy.style.display = 'inline-block';
    btnDownload.style.display = 'inline-block';
}

// ================================================
// Event Listeners
// ================================================
questForm.addEventListener('submit', startGame);
textEditor.addEventListener('input', handleTyping);

btnRetry.addEventListener('click', () => {
    document.body.className = '';
    currentState = 'menu';
    savedText = '';
    switchScreen(screenQuest);
});

btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(savedText).then(() => {
        btnCopy.textContent = '✅ 복사됨!';
        setTimeout(() => { btnCopy.textContent = '📋 텍스트 복사'; }, 2000);
    });
});

btnDownload.addEventListener('click', () => {
    const blob = new Blob([savedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deadline_hero_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});
