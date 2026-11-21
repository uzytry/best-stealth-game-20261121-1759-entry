// The three halls of the Grey Lantern manor. Each level is a grid of tiles
// plus the guards' patrol routes, written as tile coordinates.
//
// Tile legend:
//   '#' wall (blocks movement and sight)   '.' bare floor
//   'B' bush (hide here while crouched)    'C' crate (blocks movement and sight)
//   'S' shadow (dark floor: harder to spot) 'L' lamp (a pool of warm light)
//   'P' the thief's entrance               'R' a relic to steal
//   'E' the exit gate (opens once every relic is taken)
//
// Rows are normalised to 32 columns when a level loads, so a short row is
// padded with wall rather than breaking the grid.
import { COLS, ROWS } from './config.js';

function normaliseGrid(rows) {
  const out = [];
  for (let y = 0; y < ROWS; y += 1) {
    const row = (rows[y] ?? '').padEnd(COLS, '#').slice(0, COLS);
    out.push(row.split(''));
  }
  return out;
}

export const LEVELS = [
  {
    name: 'I — The Moonlit Hall',
    brief: 'Three relics glint in the hall. Slip past the patrols, take them all, and reach the east gate unseen.',
    grid: normaliseGrid([
      '################################',
      '#P....B........#.......R.......#',
      '#......B.......#................#',
      '#......B...C...#....C...........#',
      '#.........C....#................#',
      '#..######......#.....######.....#',
      '#..#....#..B...#..B..#....#.....#',
      '#..#.R..#..B...#..B..#....#.G..#',
      '#..#....#......#.....#....#.....#',
      '#..######..C...#.....######.....#',
      '#.........C....#..........C.....#',
      '#....B.........#....B...........#',
      '#....B...G.....#........G.......#',
      '#.........C....#....C...........#',
      '#..C...........#.........B......#',
      '#.....R........#.....B....B.....#',
      '#....................#.......E.#',
      '################################',
    ]),
    guards: [
      { patrol: [[27, 7], [27, 13], [20, 13], [20, 7]], facing: Math.PI },
      { patrol: [[9, 12], [9, 6], [15, 6], [15, 12]], facing: -Math.PI / 2 },
      { patrol: [[23, 12], [29, 12], [29, 16], [23, 16]], facing: Math.PI / 2 },
    ],
    lamps: [[5, 2], [16, 2], [26, 3], [8, 15], [22, 15]],
  },
  {
    name: 'II — The Gallery of Whispers',
    brief: 'The gallery is longer, the patrols overlap, and the shadows are thinner. Patience opens every route.',
    grid: normaliseGrid([
      '################################',
      '#P...S......#....R.....#....B...#',
      '#....S..B...#..........#....B...#',
      '#....S..B...#....C.....#........#',
      '#..........C#..........#...G....#',
      '#..#######..#..#####...#........#',
      '#..#.....#..#..#...#...######...#',
      '#..#.R...#..B..#...#..B....#....#',
      '#..#.....#..B..#...#..B....#.G..#',
      '#..#######..#..#####...#........#',
      '#.......C...#..........#....C...#',
      '#...B.......#....B.....######...#',
      '#...B...G...#....B..........#...#',
      '#......C....#..........#....#...#',
      '#..S........#....S.....#..B.#...#',
      '#..S...R....#....S..C..#..B.#.E.#',
      '#..............................#',
      '################################',
    ]),
    guards: [
      { patrol: [[27, 4], [27, 8], [22, 8], [22, 4]], facing: Math.PI },
      { patrol: [[8, 12], [8, 7], [14, 7], [14, 12]], facing: 0 },
      { patrol: [[28, 8], [28, 13], [24, 13], [24, 8]], facing: -Math.PI / 2 },
      { patrol: [[17, 2], [17, 6], [12, 6], [12, 2]], facing: Math.PI / 2 },
    ],
    lamps: [[4, 1], [20, 2], [28, 2], [6, 14], [16, 14], [28, 15]],
  },
  {
    name: 'III — The Vault Beneath',
    brief: 'The vault guard walks a tight loop and the relics sit in the open. One clean run, thief — no second chances.',
    grid: normaliseGrid([
      '################################',
      '#P....B...#......R.....#....B...#',
      '#.....B...#............#....B..G#',
      '#.....B...#....C.......#........#',
      '#....C....#............#.C......#',
      '#..######.#..########..#.######.#',
      '#..#....#.#..#......#..#.#....#.#',
      '#..#.R..#.#..#.R....#..#.#.R..#.#',
      '#..#....#.#..#......#..#.#....#.#',
      '#..######.#..########..#.######.#',
      '#....C....#.....B......#....C...#',
      '#....B....#.....B..G...#....B...#',
      '#....B..G.#............#........#',
      '#.........######..######........#',
      '#..S......#......#......#...B...#',
      '#..S..C...#..C...#..C...#...B.E.#',
      '#................................#',
      '################################',
    ]),
    guards: [
      { patrol: [[30, 2], [30, 6], [25, 6], [25, 2]], facing: Math.PI },
      { patrol: [[9, 12], [9, 8], [15, 8], [15, 12]], facing: 0 },
      { patrol: [[20, 11], [20, 15], [14, 15], [14, 11]], facing: -Math.PI / 2 },
      { patrol: [[27, 4], [27, 10], [22, 10], [22, 4]], facing: Math.PI / 2 },
      { patrol: [[5, 5], [5, 13], [10, 13], [10, 5]], facing: Math.PI },
    ],
    lamps: [[6, 1], [16, 2], [26, 1], [4, 14], [16, 15], [28, 14]],
  },
];

// Count the relics a grid holds, so the exit knows when it may open.
export function countRelics(grid) {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell === 'R') n += 1;
  return n;
}

// Find the thief's entrance tile ('P'); defaults to the top-left floor.
export function findStart(grid) {
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (grid[y][x] === 'P') return { x, y };
    }
  }
  return { x: 1, y: 1 };
}
