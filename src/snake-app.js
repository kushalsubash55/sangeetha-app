import {
  createInitialState,
  gameConfig,
  queueDirection,
  setStatus,
  stepGame,
} from "./snake-logic.js";

const TICK_MS = 140;
const STORAGE_KEY = "snake-best-score";
const CELL_SIZE = 20;

const canvas = document.getElementById("game-board");
const context = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlay-message");
const scoreValue = document.getElementById("score");
const bestScoreValue = document.getElementById("best-score");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const restartButton = document.getElementById("restart-button");
const controlButtons = document.querySelectorAll("[data-direction]");

canvas.width = gameConfig.gridSize * CELL_SIZE;
canvas.height = gameConfig.gridSize * CELL_SIZE;

let state = createInitialState();
let bestScore = loadBestScore();
let tickHandle = null;

function loadBestScore() {
  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  return storedValue ? Number.parseInt(storedValue, 10) || 0 : 0;
}

function saveBestScore(score) {
  window.localStorage.setItem(STORAGE_KEY, String(score));
}

function syncBestScore() {
  if (state.score > bestScore) {
    bestScore = state.score;
    saveBestScore(bestScore);
  }
  bestScoreValue.textContent = String(bestScore);
}

function setOverlay(message, hidden) {
  overlayMessage.textContent = message;
  overlay.classList.toggle("hidden", hidden);
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (state.food) {
    drawCell(state.food.x, state.food.y, "#c04a2f", 0.2);
  }

  state.snake.forEach((segment, index) => {
    drawCell(segment.x, segment.y, index === 0 ? "#1f5c37" : "#2f7d4d", 0.16);
  });

  scoreValue.textContent = String(state.score);
  syncBestScore();
  updateOverlayForState();
}

function drawCell(x, y, fill, inset) {
  const px = x * CELL_SIZE;
  const py = y * CELL_SIZE;
  const padding = CELL_SIZE * inset;
  context.fillStyle = fill;
  context.fillRect(px + padding, py + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);
}

function updateOverlayForState() {
  switch (state.status) {
    case "idle":
      setOverlay("Press Start to play", false);
      pauseButton.textContent = "Pause";
      break;
    case "paused":
      setOverlay("Paused", false);
      pauseButton.textContent = "Resume";
      break;
    case "gameover":
      setOverlay("Game over. Press Restart or Enter to try again.", false);
      pauseButton.textContent = "Pause";
      break;
    case "won":
      setOverlay("You filled the board. Restart to play again.", false);
      pauseButton.textContent = "Pause";
      break;
    default:
      setOverlay("", true);
      pauseButton.textContent = "Pause";
      break;
  }
}

function stopLoop() {
  if (tickHandle !== null) {
    window.clearInterval(tickHandle);
    tickHandle = null;
  }
}

function startLoop() {
  stopLoop();
  tickHandle = window.setInterval(() => {
    state = stepGame(state);
    if (state.status !== "running") {
      stopLoop();
    }
    render();
  }, TICK_MS);
}

function startGame() {
  if (state.status === "running") {
    return;
  }

  if (state.status === "gameover" || state.status === "won") {
    state = createInitialState();
  }

  state = setStatus(state, "running");
  startLoop();
  render();
}

function togglePause() {
  if (state.status === "running") {
    state = setStatus(state, "paused");
    stopLoop();
    render();
    return;
  }

  if (state.status === "paused") {
    state = setStatus(state, "running");
    startLoop();
    render();
  }
}

function restartGame() {
  state = createInitialState();
  stopLoop();
  render();
}

function handleDirectionInput(direction) {
  state = queueDirection(state, direction);
  if (state.status === "idle") {
    startGame();
  } else {
    render();
  }
}

function mapKeyToDirection(key) {
  const normalized = key.toLowerCase();
  if (normalized === "arrowup" || normalized === "w") return "up";
  if (normalized === "arrowdown" || normalized === "s") return "down";
  if (normalized === "arrowleft" || normalized === "a") return "left";
  if (normalized === "arrowright" || normalized === "d") return "right";
  return null;
}

document.addEventListener("keydown", (event) => {
  const direction = mapKeyToDirection(event.key);
  if (direction) {
    event.preventDefault();
    handleDirectionInput(direction);
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.key === "Enter" && (state.status === "gameover" || state.status === "won")) {
    restartGame();
  }
});

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartGame);

controlButtons.forEach((button) => {
  const direction = button.getAttribute("data-direction");
  button.addEventListener("click", () => {
    handleDirectionInput(direction);
  });
});

render();
