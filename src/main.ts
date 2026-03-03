import { CanvasEngine } from './canvasEngine';
import { AudioEngine } from './audioEngine';

// DOM Elements
const screenQuest = document.getElementById('screen-quest') as HTMLElement;
const screenBattle = document.getElementById('screen-battle') as HTMLElement;
const screenResult = document.getElementById('screen-result') as HTMLElement;

const questForm = document.getElementById('quest-form') as HTMLFormElement;
const goalInput = document.getElementById('goal-words') as HTMLInputElement;
const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement;
const weaponSelect = document.getElementById('weapon-sound') as HTMLSelectElement;

const textEditor = document.getElementById('text-editor') as HTMLElement;
const bossHpBar = document.getElementById('boss-hp-bar') as HTMLElement;
const progressText = document.getElementById('progress-text') as HTMLElement;
const tensionBar = document.getElementById('tension-bar') as HTMLElement;

const resultTitle = document.getElementById('result-title') as HTMLElement;
const resultDesc = document.getElementById('result-desc') as HTMLElement;
const survivingText = document.getElementById('surviving-text') as HTMLElement;
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement;
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;

// Game State
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

// Utils
function switchScreen(screen: HTMLElement) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active-screen'));
  screen.classList.add('active-screen');
}

function getWordCount(text: string): number {
  const t = text.trim();
  return t ? t.length : 0;
}

function getCaretCoordinates(): { x: number, y: number } {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.x === 0 && rect.y === 0) {
    const editorRect = textEditor.getBoundingClientRect();
    return { x: editorRect.left + 20, y: editorRect.top + 20 };
  }
  return { x: rect.right, y: rect.bottom };
}

// Game Flow
function startGame(e: Event) {
  e.preventDefault();

  targetWords = parseInt(goalInput.value) || 100;
  maxIdleTime = difficultySelect.value === 'hardcore' ? 5000 : 10000;

  currentWords = 0;
  tension = 0;
  savedText = '';
  textEditor.innerHTML = '';
  document.body.className = '';

  engine.reset();
  audio.init(weaponSelect.value);

  updateHUD();
  switchScreen(screenBattle);

  currentState = 'playing';
  lastTypeTime = Date.now();

  setTimeout(() => textEditor.focus(), 100);
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

  if (idleTime > 1000 && tension > 0) {
    tension = Math.max(0, tension - 1);
    updateTensionBar();
  }

  const idleRatio = Math.min(1.0, idleTime / maxIdleTime);
  engine.update(idleRatio);

  let warningLimit1 = maxIdleTime * 0.5;
  let warningLimit2 = maxIdleTime * 0.7;

  if (idleTime >= maxIdleTime) {
    if (currentState === 'playing') {
      triggerShatterEffect();
      setTimeout(() => gameOver('timeout'), 2000);
      currentState = 'gameover';
    }
  } else if (idleTime >= warningLimit2) {
    document.body.className = 'warning-level-2';
    audio.playHeartbeat();
  } else if (idleTime >= warningLimit1) {
    document.body.className = 'warning-level-1';
    audio.playHeartbeat();
  } else {
    document.body.className = '';
  }
}

function resetTimer() {
  lastTypeTime = Date.now();
  document.body.className = '';
}

function updateHUD() {
  const progressRatio = Math.min(100, (currentWords / targetWords) * 100);
  bossHpBar.style.width = `${100 - progressRatio}%`;
  progressText.innerText = `${currentWords} / ${targetWords} 자`;
}

function updateTensionBar() {
  tensionBar.style.width = `${tension}%`;
  if (tension >= 100) {
    // 피버 타임
    tensionBar.style.boxShadow = '0 0 20px #3b82f6';
  } else {
    tensionBar.style.boxShadow = 'none';
  }
}

function handleTyping() {
  if (currentState !== 'playing') return;
  resetTimer();
  audio.playTypingSound();

  const text = textEditor.innerText;
  const newWords = getWordCount(text);

  if (newWords > currentWords) {
    engine.buildStructure();
    const caret = getCaretCoordinates();
    engine.addSpark(caret.x, caret.y);
  }

  currentWords = newWords;

  tension = Math.min(100, tension + 5);
  updateTensionBar();
  updateHUD();

  if (currentWords >= targetWords) {
    gameClear(text);
  }
}

window.addEventListener('blur', () => {
  if (currentState === 'playing') {
    triggerShatterEffect();
    setTimeout(() => gameOver('focus_lost'), 2000);
    currentState = 'gameover';
  }
});

function triggerShatterEffect() {
  if (timerInterval) clearInterval(timerInterval);
  document.body.className = '';
  audio.playDeathSound();

  const text = textEditor.innerText;
  savedText = text; // For surviving text check
  const rect = textEditor.getBoundingClientRect();

  // Create shattering characters
  const chars = text.split('').slice(-200); // Only shatter last 200 to prevent lag
  textEditor.innerText = '';
  textEditor.style.visibility = 'hidden';

  chars.forEach(char => {
    if (char.trim() === '') return;
    const span = document.createElement('span');
    span.innerText = char;
    span.className = 'shatter-char';
    span.style.left = `${rect.left + Math.random() * rect.width}px`;
    span.style.top = `${rect.top + Math.random() * rect.height}px`;
    span.style.fontSize = '1.25rem';
    span.style.color = '#ef4444';
    document.body.appendChild(span);

    // Animate
    const vx = (Math.random() - 0.5) * 500;
    const rot = (Math.random() - 0.5) * 720;

    span.animate([
      { transform: `translate(0px, 0px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${vx}px, ${window.innerHeight + 100}px) rotate(${rot}deg)`, opacity: 0 }
    ], {
      duration: 1500 + Math.random() * 1000,
      easing: 'cubic-bezier(.17,.84,.44,1)',
      fill: 'forwards'
    });

    setTimeout(() => span.remove(), 2500);
  });
}

function gameOver(reason: 'timeout' | 'focus_lost') {
  textEditor.style.visibility = 'visible';
  engine.reset();

  const currentText = savedText;
  const surviving = currentText.length > 10 ? currentText.substring(currentText.length - 10) : currentText;

  savedText = '';
  survivingText.innerText = `"...${surviving}"`;

  resultTitle.innerText = "게임 오버";
  if (reason === 'timeout') {
    resultDesc.innerText = "마감 몬스터에게 집어삼켜졌습니다. (입력 시간 초과)";
  } else {
    resultDesc.innerText = "용사가 전장을 이탈하여 세계가 멸망했습니다. (창 이탈 감지)";
  }

  document.body.classList.remove('success-state');
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
  survivingText.innerText = "[원고가 무사히 마감되었습니다]";

  resultTitle.innerText = "임무 완수!";
  resultDesc.innerText = "마감 몬스터를 성공적으로 물리쳤습니다.";

  document.body.classList.add('success-state');
  switchScreen(screenResult);

  btnCopy.style.display = 'block';
  btnDownload.style.display = 'block';
}

// Event Listeners
questForm.addEventListener('submit', startGame);
textEditor.addEventListener('input', handleTyping);
btnRetry.addEventListener('click', () => {
  switchScreen(screenQuest);
  currentState = 'menu';
});

btnCopy.addEventListener('click', () => {
  navigator.clipboard.writeText(savedText).then(() => {
    alert('복사되었습니다!');
  });
});

btnDownload.addEventListener('click', () => {
  const blob = new Blob([savedText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deadline_hero_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});
