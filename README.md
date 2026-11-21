# The Grey Lantern

![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)
![rank](https://make.fun/badge/best-stealth-game-20261121-1759/uzytry/best-stealth-game-20261121-1759-entry/rank.svg)
![reward](https://make.fun/badge/best-stealth-game-20261121-1759/uzytry/best-stealth-game-20261121-1759-entry/reward.svg)

A top-down stealth game for the [make.fun best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759). You are a thief in a moonlit manor: steal every relic, reach the exit, and never be seen.

## How it plays

- **Three halls**, each a hand-built level with its own patrol routes: the Moonlit Hall, the Gallery of Whispers, and the Vault Beneath.
- **Guards with real vision cones** — cones bend around walls and crates, and a guard only sees what its cone reaches. Patrols pause and scan at each waypoint, so routes can be learned.
- **A detection system with room to recover**: being glimpsed fills a guard's meter; a near miss only makes them suspicious ("?") and they walk over to look. Break line of sight and the meter drains. A full meter means a chase ("!") — and a chase can still be escaped.
- **Cover you can read at a glance**: crouch in bushes to all but vanish, slip through shadowed floor where guards see less far, and use crates and walls to break sight lines.
- **Noise matters**: running rings out and draws guards; walking is silent. Throw a pebble (click, or Space) to lure a patrol away from a door.
- **Sound locates patrols**: footsteps are synthesised with WebAudio — a guard's steps pan left and right by where the guard stands, so ears warn before eyes do.
- **Rank**: finish all three halls and earn Ghost, Shadow or Burglar by how often you were spotted.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run (loud) |
| C | Crouch (quiet, hard to spot) |
| Click / Space | Throw a pebble at the mouse to distract |
| P / Esc | Pause |
| R | Restart the hall |
| M | Mute |
| Enter | Start / continue |

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. The game is static files under `game/` — no build step, no network request, no library.

## Layout

- `game/index.html` — the page; `game/src/` holds the game, one job per file:
  `config.js` (tuning), `levels.js` (the three halls), `input.js`, `vision.js`
  (sight lines and cones), `guard.js` (the patrol AI), `player.js`, `audio.js`
  (synthesised sound), `render.js`, `hud.js`, `shots.js` (screenshot staging),
  `main.js` (loop and state).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — four real renders of the game's own code.
- `vendor/makefun-game.ts` — the kit's library, unchanged.

## License

MIT — see [LICENSE](LICENSE).
