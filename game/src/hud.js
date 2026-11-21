// Heads-up display and screens: the HUD bar, the title, pause, caught and
// victory screens, and the detection eye that shows the worst guard's meter.
// All text is drawn on the canvas so the screenshots carry it.
import { GAME_SUBTITLE, GAME_TITLE, PALETTE, VIEW_H, VIEW_W } from './config.js';

function panel(ctx, x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(10, 12, 20, ${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(232, 228, 216, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function centred(ctx, text, y, font, colour) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillStyle = colour;
  ctx.fillText(text, VIEW_W / 2, y);
}

export class Hud {
  draw(state) {
    const ctx = state.renderer.ctx;
    if (state.phase === 'title') this.drawTitle(state, ctx);
    else if (state.phase === 'play' || state.phase === 'paused' || state.phase === 'caught') {
      this.drawBar(state, ctx);
      if (state.phase === 'paused') this.drawPaused(ctx);
      if (state.phase === 'caught') this.drawCaught(ctx);
    } else if (state.phase === 'levelclear') this.drawLevelClear(state, ctx);
    else if (state.phase === 'win') this.drawWin(state, ctx);
    if (state.toast) this.drawToast(state, ctx);
  }

  drawBar(state, ctx) {
    const p = state.player;
    panel(ctx, 0, 0, VIEW_W, 46, 0.78);
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(state.level.name, 16, 29);

    // Relics: filled diamonds for taken, hollow for remaining.
    const total = state.relics.length;
    for (let i = 0; i < total; i += 1) {
      const x = VIEW_W / 2 - ((total - 1) * 18) / 2 + i * 18;
      const y = 23;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 6, y);
      ctx.closePath();
      if (state.relics[i].taken) {
        ctx.fillStyle = PALETTE.relic;
        ctx.fill();
      } else {
        ctx.strokeStyle = PALETTE.relic;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Pebbles left.
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`PEBBLES ${p.pebbles}`, VIEW_W - 190, 29);

    // Timer.
    const t = Math.floor(state.elapsed);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    ctx.fillText(`${mm}:${ss}`, VIEW_W - 110, 29);

    // Detection eye: the worst guard's meter, as an eye that opens.
    const worst = Math.max(0, ...state.guards.map((g) => g.meter));
    const ex = VIEW_W - 52;
    const ey = 23;
    ctx.fillStyle = worst >= 100 ? '#ff5040' : worst >= 34 ? '#ffcf5e' : 'rgba(232,228,216,0.35)';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 14, 5 + (worst / 100) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10131c';
    ctx.beginPath();
    ctx.arc(ex, ey, 2 + (worst / 100) * 3, 0, Math.PI * 2);
    ctx.fill();

    // Stance hint, bottom-left.
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.textDim;
    const stance = p.hidden ? 'HIDDEN in the bush' : p.crouched ? 'CROUCHED · quiet' : p.running ? 'RUNNING · loud!' : 'WALKING';
    ctx.fillText(stance, 16, VIEW_H - 14);
    ctx.textAlign = 'right';
    ctx.fillText('WASD move · Shift run · C crouch · Click throw pebble · P pause', VIEW_W - 16, VIEW_H - 14);
  }

  drawToast(state, ctx) {
    const age = (performance.now() - state.toast.born) / 1000;
    if (age > 2.6) return;
    const alpha = age < 2.1 ? 1 : 1 - (age - 2.1) / 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    centred(ctx, state.toast.text, 84, 'bold 19px sans-serif', '#ffd75e');
    ctx.restore();
  }

  drawTitle(state, ctx) {
    ctx.fillStyle = 'rgba(6, 8, 16, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centred(ctx, GAME_TITLE, 210, 'bold 64px Georgia, serif', PALETTE.text);
    centred(ctx, GAME_SUBTITLE, 250, 'italic 22px Georgia, serif', PALETTE.textDim);
    centred(ctx, 'Steal every relic. Reach the exit. Never be seen.', 310, '18px sans-serif', PALETTE.text);
    const lines = [
      'WASD / Arrows — move        Shift — run (loud, guards hear you)',
      'C — crouch (quiet, hard to spot)        Click / Space — throw a pebble to distract',
      'Hide crouched in bushes · shadows dull a guard’s sight · a half-full eye means RUN',
    ];
    lines.forEach((line, i) => centred(ctx, line, 360 + i * 30, '16px sans-serif', PALETTE.textDim));
    const blink = Math.sin(performance.now() / 350) > -0.2;
    if (blink) centred(ctx, '— press ENTER or CLICK to begin —', 500, 'bold 20px sans-serif', PALETTE.relic);
    centred(ctx, 'Three halls · 3 relics each · a clean run earns the Grey Lantern rank', 560, '14px sans-serif', PALETTE.textDim);
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(6, 8, 16, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centred(ctx, 'PAUSED', 330, 'bold 48px Georgia, serif', PALETTE.text);
    centred(ctx, 'P or Esc to resume · R to restart the hall · M to mute', 380, '18px sans-serif', PALETTE.textDim);
  }

  drawCaught(ctx) {
    ctx.fillStyle = 'rgba(80, 10, 10, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centred(ctx, 'SPOTTED!', 330, 'bold 56px Georgia, serif', '#ff6b5e');
    centred(ctx, 'The watchman has you. The hall resets…', 380, '18px sans-serif', PALETTE.text);
  }

  drawLevelClear(state, ctx) {
    ctx.fillStyle = 'rgba(6, 8, 16, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centred(ctx, 'HALL CLEARED', 300, 'bold 48px Georgia, serif', PALETTE.exit);
    const t = Math.floor(state.elapsed);
    centred(ctx, `${state.level.name} — ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} · spotted ${state.spotted} time${state.spotted === 1 ? '' : 's'}`, 350, '18px sans-serif', PALETTE.text);
    centred(ctx, 'press ENTER for the next hall', 420, 'bold 20px sans-serif', PALETTE.relic);
  }

  drawWin(state, ctx) {
    ctx.fillStyle = 'rgba(6, 8, 16, 0.65)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centred(ctx, 'THE GREY LANTERN IS YOURS', 260, 'bold 44px Georgia, serif', PALETTE.relic);
    const rank = state.totalSpotted === 0 ? 'GHOST — never once seen' : state.totalSpotted <= 2 ? 'SHADOW — a whisper in the dark' : 'BURGLAR — loud, but gone';
    centred(ctx, `Rank: ${rank}`, 320, 'bold 24px sans-serif', PALETTE.text);
    const t = Math.floor(state.totalTime);
    centred(ctx, `9 relics · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} · spotted ${state.totalSpotted} times`, 360, '18px sans-serif', PALETTE.textDim);
    centred(ctx, 'press ENTER to steal it all again', 440, 'bold 20px sans-serif', PALETTE.relic);
  }
}
