// The thief: movement, stance, pebbles and pickups. The player never
// touches the DOM; main.js feeds it the input state each frame.
import { NOISE, SPEED, TILE } from './config.js';
import { blocksMove, isBush, isShadow } from './vision.js';

export class Player {
  constructor(startTile) {
    this.x = (startTile.x + 0.5) * TILE;
    this.y = (startTile.y + 0.5) * TILE;
    this.facing = 0; // radians; the thief looks where they walk
    this.crouched = false;
    this.running = false;
    this.moving = false;
    this.stepPhase = 0;
    this.stepTimer = 0; // time since the last noisy running step
    this.pebbles = NOISE.pebblesStart;
    this.relics = 0;
    this.hidden = false; // crouched inside a bush: nearly invisible
  }

  get tileX() {
    return Math.floor(this.x / TILE);
  }

  get tileY() {
    return Math.floor(this.y / TILE);
  }

  // Move one frame. Returns a noise event {x, y, radius} when a running
  // step rings out, so guards can hear it, else null.
  update(grid, input, dt) {
    const move = input.moveVector();
    this.crouched = input.crouching;
    this.running = input.running && !this.crouched;
    const speed = this.crouched ? SPEED.crouch : this.running ? SPEED.run : SPEED.walk;
    this.moving = move.x !== 0 || move.y !== 0;
    let noise = null;

    if (this.moving) {
      const nx = this.x + move.x * speed * dt;
      const ny = this.y + move.y * speed * dt;
      if (!blocksMove(grid, Math.floor(nx / TILE), Math.floor(this.y / TILE))) this.x = nx;
      if (!blocksMove(grid, Math.floor(this.x / TILE), Math.floor(ny / TILE))) this.y = ny;
      this.facing = Math.atan2(move.y, move.x);
      this.stepPhase += (speed * dt / 24) * Math.PI;
      if (this.running) {
        this.stepTimer += dt;
        if (this.stepTimer >= NOISE.runStepEvery) {
          this.stepTimer = 0;
          noise = { x: this.x, y: this.y, radius: NOISE.runStepRadius };
        }
      } else {
        this.stepTimer = 0;
      }
    }

    this.hidden = this.crouched && isBush(grid, this.tileX, this.tileY);
    return noise;
  }

  inShadow(grid) {
    return isShadow(grid, this.tileX, this.tileY);
  }

  // Throw a pebble at (x, y): it lands with a clatter guards investigate.
  // Returns the noise event, or null when no pebbles are left.
  throwPebble(x, y) {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    return { x, y, radius: NOISE.pebbleRadius };
  }
}
