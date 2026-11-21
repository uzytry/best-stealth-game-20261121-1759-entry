// Sight lines and vision cones: the geometry every guard sees through.
// Walls and crates block sight; bushes and shadows only make the thief
// harder to notice. A cone is drawn by sampling rays, so it bends around
// corners exactly the way the guard's own sight does.
import { TILE, VISION } from './config.js';

export function tileAt(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return '#';
  return grid[ty][tx];
}

export function blocksSight(grid, tx, ty) {
  const tile = tileAt(grid, tx, ty);
  return tile === '#' || tile === 'C';
}

export function blocksMove(grid, tx, ty) {
  const tile = tileAt(grid, tx, ty);
  return tile === '#' || tile === 'C';
}

export function isBush(grid, tx, ty) {
  return tileAt(grid, tx, ty) === 'B';
}

export function isShadow(grid, tx, ty) {
  return tileAt(grid, tx, ty) === 'S';
}

// Walk a ray from (x0, y0) toward angle `a` up to `maxDist` pixels, stepping
// in small hops; returns the distance where a sight-blocking tile is hit.
export function raycast(grid, x0, y0, a, maxDist) {
  const step = 6;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  for (let d = step; d <= maxDist; d += step) {
    const tx = Math.floor((x0 + dx * d) / TILE);
    const ty = Math.floor((y0 + dy * d) / TILE);
    if (blocksSight(grid, tx, ty)) return d;
  }
  return maxDist;
}

// Is there a clear line of sight between two points in pixels?
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist < 1) return true;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  return raycast(grid, x0, y0, angle, dist) >= dist - 6;
}

// How well a guard at (gx, gy) facing `facing` can see the player:
// 0 = not in the cone at all, up to 1 = dead ahead and close.
// Bushes shrink the range; shadows shrink it a little less.
export function visibilityOf(grid, gx, gy, facing, player) {
  const dx = player.x - gx;
  const dy = player.y - gy;
  const dist = Math.hypot(dx, dy);
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  let range = VISION.range;
  if (isBush(grid, tx, ty) && player.crouched) range = VISION.bushRange;
  else if (isShadow(grid, tx, ty)) range = VISION.shadowRange;
  if (dist > range) return 0;

  let diff = Math.atan2(dy, dx) - facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > VISION.halfAngle) return 0;
  if (!hasLineOfSight(grid, gx, gy, player.x, player.y)) return 0;

  const angleFactor = 1 - Math.abs(diff) / VISION.halfAngle;
  const distFactor = 1 - (dist / range) * 0.55;
  return Math.max(0.12, angleFactor * 0.55 + distFactor * 0.45);
}

// The polygon of a guard's vision cone, clipped by walls, for drawing.
export function conePolygon(grid, gx, gy, facing, range = VISION.range) {
  const points = [{ x: gx, y: gy }];
  const steps = 26;
  for (let i = 0; i <= steps; i += 1) {
    const a = facing - VISION.halfAngle + (2 * VISION.halfAngle * i) / steps;
    const d = raycast(grid, gx, gy, a, range);
    points.push({ x: gx + Math.cos(a) * d, y: gy + Math.sin(a) * d });
  }
  return points;
}
