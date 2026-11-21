// Shared constants for The Grey Lantern: canvas size, tile grid, tuning for
// movement, vision, noise and detection. One place owns every magic number so
// the other modules read like rules instead of arithmetic.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

// Movement speeds in pixels per second.
export const SPEED = {
  crouch: 95,
  walk: 165,
  run: 265,
  guardPatrol: 78,
  guardInvestigate: 120,
  guardChase: 235,
};

// Guard vision: how far a guard sees and how wide the cone is (half-angle).
export const VISION = {
  range: 210,
  halfAngle: 0.62, // ~35 degrees each side
  // A crouched player in a bush is only spotted up close.
  bushRange: 70,
  shadowRange: 150,
};

// Detection meter 0..100. Fills while the player is visible, drains otherwise.
export const DETECTION = {
  fillNear: 95, // per second, player within a third of the cone range
  fillFar: 42, // per second, player at the cone's edge
  fillRunning: 1.6, // multiplier while the player runs
  fillCrouched: 0.45, // multiplier while the player crouches
  fillShadow: 0.55, // multiplier while the player stands in shadow
  drain: 26, // per second while unseen
  suspiciousAt: 34, // meter above this makes the guard investigate
  alertAt: 100,
};

// Noise: a running step or a thrown pebble rings out this far (pixels).
export const NOISE = {
  runStepRadius: 150,
  runStepEvery: 0.34, // seconds between noisy steps while running
  walkStepRadius: 0, // walking is silent
  pebbleRadius: 190,
  pebblesStart: 5,
};

// How long a guard keeps searching the last known spot before giving up.
export const SEARCH_SECONDS = 6;
// How long a caught player watches the "spotted" moment before the level restarts.
export const CAUGHT_PAUSE_SECONDS = 1.6;

// Palette: a moonlit manor at night. Warm lamps against cold blue dark.
export const PALETTE = {
  floorA: '#2b2f3a',
  floorB: '#272b34',
  floorEdge: '#343947',
  wall: '#171a24',
  wallTop: '#3d4356',
  wallFace: '#232838',
  bush: '#1d4a2c',
  bushLight: '#2a6b3e',
  crate: '#6b4a2a',
  crateEdge: '#8a6136',
  shadow: '#1a1d2b',
  lampGlow: 'rgba(255, 190, 90, 0.20)',
  coneCalm: 'rgba(255, 205, 90, 0.16)',
  coneEdge: 'rgba(255, 205, 90, 0.35)',
  coneSuspicious: 'rgba(255, 160, 60, 0.22)',
  coneAlert: 'rgba(255, 70, 60, 0.28)',
  player: '#e8e4d8',
  playerCloak: '#4a5568',
  guard: '#c94f4f',
  guardDark: '#7e2f2f',
  relic: '#ffd75e',
  exit: '#7ee787',
  exitLocked: '#5a6b7a',
  text: '#e8e4d8',
  textDim: '#9aa3b2',
};

export const GAME_TITLE = 'THE GREY LANTERN';
export const GAME_SUBTITLE = 'a moonlit burglary in three halls';
