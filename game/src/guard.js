// Guard behaviour: a small state machine with a memory.
//
//   patrol     — walk the waypoints, pausing to look around at each one
//   suspicious — something flickered at the edge of sight, or a noise rang
//                out: walk over and look (a yellow "?" overhead)
//   alert      — the thief is plainly seen: chase them (a red "!" overhead)
//   search     — the thief slipped away: sweep the last known spot, then
//                give up and go back to the patrol
//
// A guard that never quite fills its detection meter still remembers: a
// near miss leaves it suspicious, and it walks over to check.
import { DETECTION, SEARCH_SECONDS, SPEED, TILE } from './config.js';
import { blocksMove, visibilityOf } from './vision.js';

const PAUSE_AT_WAYPOINT = 1.4; // seconds a guard stands and scans

export class Guard {
  constructor(route, facing) {
    const [sx, sy] = route[0];
    this.x = (sx + 0.5) * TILE;
    this.y = (sy + 0.5) * TILE;
    this.route = route.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    this.waypoint = 1 % this.route.length;
    this.facing = facing;
    this.state = 'patrol';
    this.pause = 0;
    this.scanDir = 1;
    this.meter = 0; // this guard's own detection meter, 0..100
    this.lastKnown = null; // {x, y} where the thief was last seen or heard
    this.searchTime = 0;
    this.searchTarget = null;
    this.stepPhase = Math.random() * Math.PI * 2;
    this.moving = false;
  }

  // The guard heard a noise at (x, y): go and look, unless already chasing.
  hear(x, y) {
    if (this.state === 'alert') return;
    this.lastKnown = { x, y };
    if (this.state === 'patrol' || this.state === 'search') {
      this.state = 'suspicious';
      this.meter = Math.max(this.meter, DETECTION.suspiciousAt);
    }
  }

  // Move toward a point, sliding along walls; returns true on arrival.
  moveToward(grid, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = Math.min(speed * dt, dist);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    this.moving = true;
    this.stepPhase += (step / 26) * Math.PI;
    // Axis-separated movement so a guard slides along a wall instead of
    // sticking to it.
    if (!blocksMove(grid, Math.floor(nx / TILE), Math.floor(this.y / TILE))) this.x = nx;
    if (!blocksMove(grid, Math.floor(this.x / TILE), Math.floor(ny / TILE))) this.y = ny;
    this.face(Math.atan2(dy, dx), dt, 6);
    return dist - step < 4;
  }

  face(target, dt, rate) {
    let diff = target - this.facing;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const maxTurn = rate * dt;
    this.facing += Math.max(-maxTurn, Math.min(maxTurn, diff));
  }

  update(grid, player, dt, onCaught) {
    const seen = visibilityOf(grid, this.x, this.y, this.facing, player);
    if (seen > 0) {
      const close = Math.hypot(player.x - this.x, player.y - this.y) < VISION_NEAR;
      let rate = close ? DETECTION.fillNear : DETECTION.fillFar;
      rate *= seen;
      if (player.running) rate *= DETECTION.fillRunning;
      if (player.crouched) rate *= DETECTION.fillCrouched;
      const tx = Math.floor(player.x / TILE);
      const ty = Math.floor(player.y / TILE);
      if (grid[ty] && grid[ty][tx] === 'S') rate *= DETECTION.fillShadow;
      this.meter = Math.min(100, this.meter + rate * dt);
      this.lastKnown = { x: player.x, y: player.y };
    } else {
      this.meter = Math.max(0, this.meter - DETECTION.drain * dt);
    }

    if (this.meter >= DETECTION.alertAt && this.state !== 'alert') {
      this.state = 'alert';
      this.searchTime = 0;
    }

    this.moving = false;
    if (this.state === 'patrol') this.updatePatrol(grid, dt);
    else if (this.state === 'suspicious') this.updateSuspicious(grid, dt);
    else if (this.state === 'alert') this.updateAlert(grid, player, dt, seen, onCaught);
    else if (this.state === 'search') this.updateSearch(grid, dt);

    // A near miss leaves the guard uneasy: it goes to look.
    if (this.state === 'patrol' && this.meter >= DETECTION.suspiciousAt && this.lastKnown) {
      this.state = 'suspicious';
    }
  }

  updatePatrol(grid, dt) {
    if (this.pause > 0) {
      this.pause -= dt;
      // Scan left and right while standing at the waypoint.
      this.facing += Math.sin(performance.now() / 450 + this.stepPhase) * 0.9 * dt * this.scanDir;
      return;
    }
    const target = this.route[this.waypoint];
    if (this.moveToward(grid, target.x, target.y, SPEED.guardPatrol, dt)) {
      this.waypoint = (this.waypoint + 1) % this.route.length;
      this.pause = PAUSE_AT_WAYPOINT;
      this.scanDir *= -1;
    }
  }

  updateSuspicious(grid, dt) {
    if (!this.lastKnown) {
      this.state = 'patrol';
      return;
    }
    if (this.moveToward(grid, this.lastKnown.x, this.lastKnown.y, SPEED.guardInvestigate, dt)) {
      // Arrived and found nothing: look around, then resume the patrol.
      this.pause = 1.2;
      this.state = 'patrol';
      this.meter = Math.max(0, this.meter - 30);
      // Resume from the nearest waypoint so the guard does not cut the map.
      let best = 0;
      let bestDist = Infinity;
      this.route.forEach((point, i) => {
        const d = Math.hypot(point.x - this.x, point.y - this.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      this.waypoint = best;
    }
  }

  updateAlert(grid, player, dt, seen, onCaught) {
    if (seen > 0) {
      this.lastKnown = { x: player.x, y: player.y };
      this.searchTime = 0;
      if (this.moveToward(grid, player.x, player.y, SPEED.guardChase, dt)) {
        // Caught: close enough to grab.
        if (Math.hypot(player.x - this.x, player.y - this.y) < 26) onCaught();
      }
    } else {
      // Lost sight: run to the last known spot, then sweep the area.
      this.searchTime += dt;
      if (this.lastKnown && !this.moveToward(grid, this.lastKnown.x, this.lastKnown.y, SPEED.guardChase, dt)) {
        // still running there
      } else {
        this.state = 'search';
        this.searchTime = 0;
        this.searchTarget = this.pickSearchTarget(grid);
      }
      if (this.searchTime > 2.5) {
        this.state = 'search';
        this.searchTime = 0;
        this.searchTarget = this.pickSearchTarget(grid);
      }
    }
    // Catch check also applies while the guard closes in.
    if (Math.hypot(player.x - this.x, player.y - this.y) < 24) onCaught();
  }

  updateSearch(grid, dt) {
    this.searchTime += dt;
    if (this.searchTime > SEARCH_SECONDS) {
      this.state = 'patrol';
      this.meter = 0;
      this.lastKnown = null;
      return;
    }
    if (!this.searchTarget || this.moveToward(grid, this.searchTarget.x, this.searchTarget.y, SPEED.guardInvestigate, dt)) {
      this.searchTarget = this.pickSearchTarget(grid);
      this.pause = 0.5;
    }
  }

  pickSearchTarget(grid) {
    const base = this.lastKnown ?? { x: this.x, y: this.y };
    for (let tries = 0; tries < 12; tries += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 130;
      const x = base.x + Math.cos(angle) * radius;
      const y = base.y + Math.sin(angle) * radius;
      if (!blocksMove(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return { x, y };
    }
    return { x: base.x, y: base.y };
  }
}

const VISION_NEAR = 90;
