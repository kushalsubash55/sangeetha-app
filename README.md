# Snake

Small dependency-free Snake game built with plain HTML, CSS, and JavaScript.

## Run locally

From the repo root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

- `index.html` - page shell and controls
- `styles.css` - minimal styling
- `src/snake-logic.js` - pure game rules and state transitions
- `src/snake-app.js` - rendering, input handling, and timer loop

## Manual verification

- Start the game and confirm the snake begins moving right on a 20x20 grid.
- Use arrow keys and `WASD` to steer, and confirm reversing directly into the snake is blocked.
- Eat food and confirm the score increments and the snake grows by one segment.
- Hit a wall or the snake body and confirm the game stops with a game-over message.
- Press `Space` to pause/resume.
- Use `Restart` or `Enter` after game over to reset the board and score.
