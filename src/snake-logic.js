const GRID_SIZE = 20;
const INITIAL_DIRECTION = "right";
const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTIONS = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function createInitialSnake() {
  return [
    { x: 2, y: 10 },
    { x: 1, y: 10 },
    { x: 0, y: 10 },
  ];
}

function cloneSegment(segment) {
  return { x: segment.x, y: segment.y };
}

function isSameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function listOpenCells(snake, gridSize = GRID_SIZE) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const cells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}

export function createFoodPosition(snake, gridSize = GRID_SIZE, random = Math.random) {
  const openCells = listOpenCells(snake, gridSize);
  if (openCells.length === 0) {
    return null;
  }

  const index = Math.floor(random() * openCells.length);
  return openCells[index];
}

export function createInitialState(random = Math.random) {
  const snake = createInitialSnake();
  return {
    gridSize: GRID_SIZE,
    snake,
    direction: INITIAL_DIRECTION,
    pendingDirection: INITIAL_DIRECTION,
    food: createFoodPosition(snake, GRID_SIZE, random),
    score: 0,
    status: "idle",
  };
}

export function queueDirection(state, nextDirection) {
  if (!DIRECTION_VECTORS[nextDirection]) {
    return state;
  }

  const blockedDirection = OPPOSITE_DIRECTIONS[state.direction];
  if (nextDirection === blockedDirection && state.snake.length > 1) {
    return state;
  }

  return {
    ...state,
    pendingDirection: nextDirection,
  };
}

export function stepGame(state, random = Math.random) {
  if (state.status !== "running") {
    return state;
  }

  const direction = state.pendingDirection;
  const vector = DIRECTION_VECTORS[direction];
  const nextHead = {
    x: state.snake[0].x + vector.x,
    y: state.snake[0].y + vector.y,
  };

  const hitsWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.gridSize ||
    nextHead.y >= state.gridSize;

  if (hitsWall) {
    return {
      ...state,
      direction,
      status: "gameover",
    };
  }

  const ateFood = isSameCell(nextHead, state.food);
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitsSelf = bodyToCheck.some((segment) => isSameCell(segment, nextHead));

  if (hitsSelf) {
    return {
      ...state,
      direction,
      status: "gameover",
    };
  }

  const nextSnake = [nextHead, ...state.snake.map(cloneSegment)];
  if (!ateFood) {
    nextSnake.pop();
  }

  const nextScore = ateFood ? state.score + 1 : state.score;
  const nextFood = ateFood ? createFoodPosition(nextSnake, state.gridSize, random) : state.food;
  const status = nextFood ? "running" : "won";

  return {
    ...state,
    snake: nextSnake,
    direction,
    pendingDirection: direction,
    food: nextFood,
    score: nextScore,
    status,
  };
}

export function setStatus(state, status) {
  return {
    ...state,
    status,
  };
}

export const gameConfig = {
  gridSize: GRID_SIZE,
};
