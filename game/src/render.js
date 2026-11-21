// Drawing: one canvas, one painter, no images. The floor is laid first,
// then cover, then vision cones, then the actors, then a night overlay
// with light punched out around the thief and the lamps — so at a glance
// the player reads what is lit (dangerous) and what is dark (safe).
import { PALETTE, TILE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon } from './vision.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.light.width = VIEW_W;
    this.light.height = VIEW_H;
    this.time = 0;
  }

  draw(state) {
    const ctx = this.ctx;
    this.time += 1 / 60;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(state);
    this.drawCover(state);
    this.drawRelics(state);
    this.drawExit(state);
    this.drawCones(state);
    this.drawGuards(state);
    this.drawPlayer(state);
    this.drawNoiseRings(state);
    this.drawNight(state);
    this.drawAim(state);
  }

  drawFloor(state) {
    const ctx = this.ctx;
    const { grid, lamps } = state.level;
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        const tile = grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (tile === '#') {
          ctx.fillStyle = PALETTE.wallFace;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(px, py, TILE, 8);
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(px, py + TILE - 4, TILE, 4);
        } else if (tile === 'S') {
          ctx.fillStyle = PALETTE.shadow;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = PALETTE.floorEdge;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        }
      }
    }
    // Lamp pools of warm light on the floor.
    for (const [lx, ly] of lamps) {
      const cx = (lx + 0.5) * TILE;
      const cy = (ly + 0.5) * TILE;
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 95);
      glow.addColorStop(0, 'rgba(255, 200, 110, 0.28)');
      glow.addColorStop(1, 'rgba(255, 200, 110, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6a2a';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 7, cy - 7, 14, 14);
    }
  }

  drawCover(state) {
    const ctx = this.ctx;
    const { grid } = state.level;
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        const tile = grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (tile === 'B') {
          // A bush: three overlapping leaf blobs, readable at a glance.
          ctx.fillStyle = PALETTE.bush;
          for (const [ox, oy, r] of [[12, 24, 12], [26, 20, 13], [20, 12, 11]]) {
            ctx.beginPath();
            ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = PALETTE.bushLight;
          ctx.beginPath();
          ctx.arc(px + 15, py + 16, 5, 0, Math.PI * 2);
          ctx.arc(px + 27, py + 25, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'C') {
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + TILE - 4, py + TILE - 4);
          ctx.moveTo(px + TILE - 4, py + 4);
          ctx.lineTo(px + 4, py + TILE - 4);
          ctx.stroke();
        }
      }
    }
  }

  drawRelics(state) {
    const ctx = this.ctx;
    for (const relic of state.relics) {
      if (relic.taken) continue;
      const bob = Math.sin(this.time * 2.4 + relic.x) * 3;
      const x = relic.x;
      const y = relic.y + bob;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 26);
      glow.addColorStop(0, 'rgba(255, 215, 94, 0.5)');
      glow.addColorStop(1, 'rgba(255, 215, 94, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      // A small gem: a diamond with a bright facet.
      ctx.fillStyle = PALETTE.relic;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawExit(state) {
    const ctx = this.ctx;
    const exit = state.exit;
    const open = state.relics.every((r) => r.taken);
    const cx = exit.x;
    const cy = exit.y;
    ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(cx - 16, cy - 16, 32, 32);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = open ? '#c9f7cf' : '#8fa3b5';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 16, cy - 16, 32, 32);
    // A doorway arch and an arrow pointing out.
    ctx.fillStyle = '#10131c';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 10);
    ctx.lineTo(cx - 8, cy - 2);
    ctx.arc(cx, cy - 2, 8, Math.PI, 0);
    ctx.lineTo(cx + 8, cy + 10);
    ctx.closePath();
    ctx.fill();
    if (open) {
      const pulse = 0.6 + Math.sin(this.time * 3) * 0.4;
      ctx.fillStyle = `rgba(126, 231, 135, ${0.25 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 30 + pulse * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d2b12';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', cx, cy + 30);
    } else {
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const left = state.relics.filter((r) => !r.taken).length;
      ctx.fillText(`LOCKED · ${left} LEFT`, cx, cy + 30);
    }
  }

  drawCones(state) {
    const ctx = this.ctx;
    for (const guard of state.guards) {
      const poly = conePolygon(state.level.grid, guard.x, guard.y, guard.facing);
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fillStyle =
        guard.state === 'alert'
          ? PALETTE.coneAlert
          : guard.state === 'suspicious' || guard.state === 'search'
            ? PALETTE.coneSuspicious
            : PALETTE.coneCalm;
      ctx.fill();
      ctx.strokeStyle = PALETTE.coneEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawGuards(state) {
    const ctx = this.ctx;
    for (const guard of state.guards) {
      const bob = guard.moving ? Math.sin(guard.stepPhase) * 2 : 0;
      // Body: a red-uniformed watchman, bright against the dark floor.
      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + 2 + bob, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      // Lantern dot showing which way the guard faces.
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(
        guard.x + Math.cos(guard.facing) * 12,
        guard.y + Math.sin(guard.facing) * 12 + bob,
        3.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Helmet brim.
      ctx.strokeStyle = '#5d1f1f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 2 + bob, 8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      // State marker overhead: "?" when suspicious, "!" when chasing.
      // Drawn high with a dark outline so it reads at a glance.
      const mark = guard.state === 'alert' ? '!' : guard.state === 'suspicious' || guard.state === 'search' ? '?' : null;
      if (mark) {
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(6, 8, 16, 0.9)';
        ctx.strokeText(mark, guard.x, guard.y - 30 + bob);
        ctx.fillStyle = mark === '!' ? '#ff5040' : '#ffcf5e';
        ctx.fillText(mark, guard.x, guard.y - 30 + bob);
      }
      // Detection meter arc above a guard that is onto something.
      if (guard.meter > 2 && guard.state !== 'alert') {
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y - 16, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = guard.meter > 60 ? '#ff9a3c' : '#ffd75e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y - 16, 14, -Math.PI / 2, -Math.PI / 2 + (guard.meter / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawPlayer(state) {
    const ctx = this.ctx;
    const p = state.player;
    const bob = p.moving ? Math.sin(p.stepPhase) * 2 : Math.sin(this.time * 2) * 1;
    ctx.save();
    ctx.globalAlpha = p.hidden ? 0.55 : 1;
    // Cloak: a dark hood with a pale face, facing the direction of travel.
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(p.facing);
    ctx.fillStyle = PALETTE.playerCloak;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(2, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(5, -3, 1.8, 0, Math.PI * 2);
    ctx.arc(5, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Crouch ring: a quiet circle under a crouching thief.
    if (p.crouched) {
      ctx.strokeStyle = 'rgba(232, 228, 216, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawNoiseRings(state) {
    const ctx = this.ctx;
    for (const ring of state.noiseRings) {
      const age = (performance.now() - ring.born) / 1000;
      const progress = age / 0.9;
      if (progress >= 1) continue;
      ctx.strokeStyle = `rgba(255, 220, 130, ${(1 - progress) * 0.7})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius * (0.25 + progress * 0.75), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Night falls over the whole hall; light is punched out around the thief
  // and the lamps, so lit ground reads as danger and dark ground as safety.
  drawNight(state) {
    const lctx = this.light.getContext('2d');
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, VIEW_W, VIEW_H);
    lctx.fillStyle = 'rgba(6, 8, 16, 0.42)';
    lctx.fillRect(0, 0, VIEW_W, VIEW_H);
    lctx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, r) => {
      const g = lctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath();
      lctx.arc(x, y, r, 0, Math.PI * 2);
      lctx.fill();
    };
    punch(state.player.x, state.player.y, 130);
    for (const [lx, ly] of state.level.lamps) punch((lx + 0.5) * TILE, (ly + 0.5) * TILE, 105);
    for (const guard of state.guards) punch(guard.x, guard.y, 60);
    this.ctx.drawImage(this.light, 0, 0);
  }

  // The mouse aim: a faint pebble target where a click would throw.
  drawAim(state) {
    if (!state.aim || state.phase !== 'play') return;
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.aim.x, state.aim.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(state.aim.x - 14, state.aim.y);
    ctx.lineTo(state.aim.x - 6, state.aim.y);
    ctx.moveTo(state.aim.x + 6, state.aim.y);
    ctx.lineTo(state.aim.x + 14, state.aim.y);
    ctx.moveTo(state.aim.x, state.aim.y - 14);
    ctx.lineTo(state.aim.x, state.aim.y - 6);
    ctx.moveTo(state.aim.x, state.aim.y + 6);
    ctx.lineTo(state.aim.x, state.aim.y + 14);
    ctx.stroke();
  }
}
