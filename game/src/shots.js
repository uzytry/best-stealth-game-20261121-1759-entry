// Screenshot staging: ?shot=<scene> puts the game into a fixed, readable
// moment so the screenshots are real renders of the game's own code, not
// mock-ups. Each scene sets window.__shotReady when the frame is settled,
// which the screenshot script waits for.
//
//   title   — the title screen over hall I
//   play    — mid-game: the thief crouched by a bush, cones sweeping
//   alert   — a guard mid-chase, red cone and "!" overhead
//   victory — the win screen after a clean run
import { TILE } from './config.js';

function placePlayer(game, tx, ty, facing = 0, crouched = false) {
  game.player.x = (tx + 0.5) * TILE;
  game.player.y = (ty + 0.5) * TILE;
  game.player.facing = facing;
  game.player.crouched = crouched;
  game.player.hidden = crouched;
}

function placeGuard(game, index, tx, ty, facing, state = 'patrol', meter = 0) {
  const guard = game.guards[index];
  if (!guard) return;
  guard.x = (tx + 0.5) * TILE;
  guard.y = (ty + 0.5) * TILE;
  guard.facing = facing;
  guard.state = state;
  guard.meter = meter;
  guard.pause = 999; // hold still for the camera
}

export function stageShot(game, scene) {
  game.phase = 'play';
  game.shotMode = true;
  game.toast = null; // no stale level brief over the title or win screens
  if (scene === 'title') {
    game.phase = 'title';
  } else if (scene === 'play') {
    // The thief crouched at the bush line, one guard's cone sweeping past.
    placePlayer(game, 6, 2, 0, true);
    placeGuard(game, 0, 24, 9, Math.PI * 0.75, 'patrol', 0);
    placeGuard(game, 1, 12, 8, -Math.PI / 2, 'patrol', 0);
    placeGuard(game, 2, 25, 14, Math.PI, 'suspicious', 48);
    game.toast = { text: 'Stay out of the cones — crouch in the bushes to hide', born: performance.now() - 1000 };
  } else if (scene === 'alert') {
    // A near miss turned into a chase: red cone, "!", detection eye full.
    placePlayer(game, 18, 10, Math.PI, false);
    placeGuard(game, 0, 21, 10, Math.PI, 'alert', 100);
    placeGuard(game, 1, 12, 8, 0, 'suspicious', 62);
    placeGuard(game, 2, 25, 14, -Math.PI / 2, 'patrol', 0);
    game.guards[0].lastKnown = { x: game.player.x, y: game.player.y };
    game.toast = { text: 'SPOTTED! Break line of sight to escape the chase', born: performance.now() - 1000 };
  } else if (scene === 'victory') {
    game.relics.forEach((r) => { r.taken = true; });
    game.player.relics = game.relics.length;
    game.totalSpotted = 0;
    game.totalTime = 214;
    game.phase = 'win';
  }
  // Let one frame render, then signal the screenshot script.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
