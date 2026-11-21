/* BMO integration for the MIT-licensed upstream games. See config/game-sources.json. */
import { InputManager } from "./input-manager.js";
const canvas = document.getElementById("arcade-canvas");
const ctx = canvas.getContext("2d");
const kind = document.body.dataset.game;
const bg = "#66c5a8", ink = "#132a24";
let game, adapter, paused = false, frame, last = performance.now(), lastHUD = "";
let options = { sound: true, volume: .8 }, soundContext;
function post(type, extra = {}) {
  if (parent === window) {
    if (type === 'restart') location.reload();
    if (type === 'close' || type === 'menu') {
      paused = !paused;
      document.title = paused ? 'Pausa · BMO' : 'Arcade · BMO';
    }
    return;
  }
  parent.postMessage({ bmoArcade: type, ...extra }, location.origin);
}
function tone(name) {
  if (!options.sound || options.volume <= 0) return;
  try {
    soundContext ||= new AudioContext();
    soundContext.resume().catch(() => {});
    const osc = soundContext.createOscillator(), gain = soundContext.createGain();
    const now = soundContext.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(({ shoot: 740, brick: 580, paddle: 360, bang: 180, explosion: 100, levelup: 920 })[name] || 440, now);
    gain.gain.setValueAtTime(options.volume * .035, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .08);
    osc.connect(gain); gain.connect(soundContext.destination);
    osc.start(now); osc.stop(now + .09);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  } catch { /* The game remains playable without audio permission. */ }
}
function pixelShip(x, y, width = 30) {
  ctx.fillStyle = ink;
  ctx.fillRect(x - width / 2, y, width, 9);
  ctx.fillRect(x - 9, y - 8, 18, 8);
  ctx.fillRect(x - 3, y - 15, 6, 8);
}
function setupBreakout() {
  const { Game, Breakout } = window;
  // The shared host owns input, audio, resizing and the animation frame lifecycle.
  Game.loadSounds = () => {};
  Game.Runner.addEvents = () => {};
  Game.Runner.resize = () => {};
  Game.Runner.start = () => {};
  const store = {};
  Game.Runner.storage = () => store;
  Breakout.addEvents = () => {};
  Breakout.refreshDOM = () => {};
  Breakout.playSound = tone;
  Breakout.onbeforeabandon = () => true;
  Breakout.Score.draw = () => {}; // HUD is rendered at readable size by the parent.
  Breakout.Score.measure = function () {};
  Breakout.Paddle.render = function (c) {
    c.fillStyle = ink; c.fillRect(0, 0, this.w, this.h);
    c.fillStyle = bg; c.fillRect(this.w / 2 - 9, 3, 4, 3); c.fillRect(this.w / 2 + 5, 3, 4, 3);
  };
  Breakout.Levels.forEach((level, i) => {
    Object.keys(level.colors).forEach((key, n) => { level.colors[key] = [ink, "#245c4c", "#387a61"][(n + i) % 3]; });
  });
  Object.values(Breakout.Defaults.ball.labels).forEach(label => { label.fill = ink; label.stroke = bg; });
  game = Game.start("arcade-canvas", Breakout, {
    width: 800, height: 600, fps: 60, stats: false,
    color: { background: bg, foreground: ink, border: ink, wall: ink, ball: ink, paddle: ink, score: ink, highscore: ink },
  });
  game.play(); game.ball.launchNow();
  return {
    press(key) {
      if (key === "ArrowLeft") game.paddle.moveLeft();
      if (key === "ArrowRight") game.paddle.moveRight();
      if (key === " ") {
        if (!game.is("game")) game.play();
        game.ball.launchNow();
      }
    },
    release(key) {
      if (key === "ArrowLeft") game.paddle.stopMovingLeft();
      if (key === "ArrowRight") game.paddle.stopMovingRight();
    },
    pointer(x) { game.paddle.place(x - game.paddle.w / 2); },
    update(dt) { game.update(dt); },
    draw() { game.draw(ctx); },
    hud: () => ({ score: game.score.score || 0, lives: game.score.lives, level: game.level + 1, over: game.is("menu") }),
  };
}
function setupInvaders() {
  const { Game, PlayState, GameOverState, LevelIntroState } = window;
  game = new Game();
  Object.assign(game.config, { gameWidth: 700, gameHeight: 470, fps: 60, shipSpeed: 300,
    rocketVelocity: 540, rocketMaxFireRate: 5, invaderRanks: 4, invaderFiles: 9 });
  game.initialise(canvas);
  game.sounds = { playSound: tone, mute: false };
  const originalEnter = PlayState.prototype.enter;
  PlayState.prototype.enter = function (g) {
    originalEnter.call(this, g);
    this.ship.width = 38; this.ship.height = 26;
    this.ship.y = g.gameBounds.bottom - 15;
  };
  game.moveToState(new PlayState(game.config, 1));
  PlayState.prototype.draw = function (g, dt, c) {
    // Crisp original sprites over the upstream collision and wave logic.
    c.fillStyle = bg; c.fillRect(0, 0, canvas.width, canvas.height);
    pixelShip(this.ship.x, this.ship.y, 38);
    this.invaders.forEach((enemy, i) => {
      c.fillStyle = i % 2 ? "#245c4c" : ink;
      c.fillRect(enemy.x - 14, enemy.y - 10, 28, 20);
      c.fillStyle = bg;
      c.fillRect(enemy.x - 7, enemy.y - 4, 4, 5); c.fillRect(enemy.x + 3, enemy.y - 4, 4, 5);
      c.fillRect(enemy.x - 3, enemy.y + 5, 6, 5);
    });
    c.fillStyle = ink;
    this.rockets.forEach(rocket => c.fillRect(rocket.x - 2, rocket.y - 6, 4, 12));
    this.bombs.forEach(bomb => c.fillRect(bomb.x - 3, bomb.y - 3, 6, 8));
  };
  GameOverState.prototype.draw = function () {
    ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.font = "bold 30px monospace";
    ctx.fillText("FIN DE LA AVENTURA", 400, 270);
    ctx.font = "20px monospace"; ctx.fillText("Espacio / A", 400, 315);
  };
  LevelIntroState.prototype.draw = function () {
    ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.font = "bold 30px monospace";
    ctx.fillText("OLEADA " + game.level, 400, 290);
  };
  return {
    press: key => game.keyDown(({ ArrowLeft: 37, ArrowRight: 39, " ": 32 })[key] || 0),
    release: key => game.keyUp(({ ArrowLeft: 37, ArrowRight: 39, " ": 32 })[key] || 0),
    pointer(x) { const state = game.currentState(); if (state.ship) state.ship.x = Math.max(game.gameBounds.left + 20, Math.min(game.gameBounds.right - 20, x)); },
    update(dt) { const state = game.currentState(); state?.update?.(game, dt); },
    draw() { game.currentState()?.draw?.(game, 1 / 60, ctx); },
    hud: () => ({ score: game.score, lives: game.lives, level: game.level, over: game.currentState() instanceof GameOverState }),
  };
}
adapter = kind === "breakout" ? setupBreakout() : setupInvaders();
const input = new InputManager({
  isGaming: () => true, onText: () => {}, onGamepads: () => {},
  onPress(key) {
    if (key === "Escape") return post("close");
    if (key === "Menu" || key === "m") return post("menu");
    if (key === "r") return post("restart");
    adapter.press(key);
  },
  onRelease: key => adapter.release(key),
});
const parentHeld = new Set();
window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.source !== parent || !event.data?.bmoArcade) return;
  const data = event.data;
  if (data.bmoArcade === "input") {
    data.down ? parentHeld.add(data.key) : parentHeld.delete(data.key);
    input.update("parent", new Set(parentHeld));
  }
  if (data.bmoArcade === "options") options = data.options;
});
let touching = false;
canvas.addEventListener("pointerdown", event => {
  touching = true; canvas.setPointerCapture(event.pointerId); adapter.press(" ");
});
canvas.addEventListener("pointermove", event => {
  if (!touching) return;
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / 800, rect.height / 600);
  const offset = (rect.width - 800 * scale) / 2;
  adapter.pointer((event.clientX - rect.left - offset) / scale);
});
const releasePointer = () => { touching = false; adapter.release(" "); };
canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);
window.addEventListener("blur", () => { input.clear(); releasePointer(); });
function tick(now) {
  const dt = Math.min(.035, (now - last) / 1000); last = now;
  if (!document.hidden && !paused) {
    adapter.update(dt);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 600);
    adapter.draw();
    const hud = JSON.stringify(adapter.hud());
    if (hud !== lastHUD) { lastHUD = hud; post("hud", adapter.hud()); }
  }
  frame = requestAnimationFrame(tick);
}
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(frame); input.destroy(); game.runner?.stop(); game.stop?.(); soundContext?.close().catch(() => {});
});
frame = requestAnimationFrame(tick);
post("ready");
