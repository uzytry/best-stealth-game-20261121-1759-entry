// Keyboard and mouse input, kept apart from the game rules: the game asks
// this module what the player is doing, never the DOM directly.
//
//   WASD / arrows — move        Shift — run (loud)
//   C or Ctrl — crouch (quiet, hard to spot)   Space — throw a pebble where the mouse points
//   Click — throw a pebble at that spot        P / Esc — pause
//   Enter — start / restart                    M — mute
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, inside: false };
    this.clicked = null; // {x, y} in canvas pixels, consumed by the game
    this.pressed = new Set(); // keys pressed since the last poll
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
      this.mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.clicked = {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      };
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  // True once for a key pressed since the last frame; the game clears these.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = null;
  }

  // Normalised movement vector from the held keys.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  get running() {
    return this.down('ShiftLeft') || this.down('ShiftRight');
  }

  get crouching() {
    return this.down('KeyC') || this.down('ControlLeft') || this.down('ControlRight');
  }
}
