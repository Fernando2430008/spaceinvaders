export function mappedKey(key) {
  return ({ w: "ArrowUp", a: "ArrowLeft", s: "ArrowDown", d: "ArrowRight",
    W: "ArrowUp", A: "ArrowLeft", S: "ArrowDown", D: "ArrowRight", Enter: " " })[key] || key;
}

export function gamepadKeys(pad, deadzone = .28) {
  const keys = new Set();
  const pressed = i => !!pad.buttons[i]?.pressed || pad.buttons[i]?.value > .55;
  const buttons = { 0: " ", 1: "Escape", 2: "r", 3: "m", 8: "Menu", 9: "Menu",
    12: "ArrowUp", 13: "ArrowDown", 14: "ArrowLeft", 15: "ArrowRight" };
  for (const [i, key] of Object.entries(buttons)) if (pressed(Number(i))) keys.add(key);
  if (pad.axes[0] < -deadzone) keys.add("ArrowLeft");
  if (pad.axes[0] > deadzone) keys.add("ArrowRight");
  if (pad.axes[1] < -deadzone) keys.add("ArrowUp");
  if (pad.axes[1] > deadzone) keys.add("ArrowDown");
  return keys;
}

export class InputManager {
  constructor({ onPress, onRelease, onText, isGaming, onGamepads }) {
    Object.assign(this, { onPress, onRelease, onText, isGaming, onGamepads });
    this.sources = new Map(); this.physical = new Map(); this.keys = new Set();
    this.abort = new AbortController();
    const opts = { signal: this.abort.signal };
    document.addEventListener("keydown", e => this.keyDown(e), opts);
    document.addEventListener("keyup", e => {
      this.physical.delete(e.code);
      this.update("keyboard", new Set(this.physical.values()));
    }, opts);
    window.addEventListener("blur", () => { this.suspended = true; this.clear(); }, opts);
    window.addEventListener("focus", () => { this.suspended = false; }, opts);
    document.addEventListener("visibilitychange", () => this.clear(), opts);
    window.addEventListener("gamepadconnected", () => this.pollPads(), opts);
    window.addEventListener("gamepaddisconnected", () => this.pollPads(), opts);
    this.tick = () => { this.pollPads(); this.frame = requestAnimationFrame(this.tick); };
    this.frame = requestAnimationFrame(this.tick);
  }
  update(source, held) {
    this.sources.set(source, held);
    const merged = new Set([...this.sources.values()].flatMap(keys => [...keys]));
    for (const key of this.keys) if (!merged.has(key)) this.onRelease(key);
    const old = this.keys;
    this.keys = merged;
    for (const key of merged) if (!old.has(key)) this.onPress(key);
  }
  keyDown(e) {
    if (e.isComposing || e.ctrlKey || e.altKey || e.metaKey ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable) return;
    const gaming = this.isGaming();
    if (!gaming && ["BUTTON", "SUMMARY", "A"].includes(e.target.tagName) && [" ", "Enter"].includes(e.key)) return;
    if (!gaming && e.key.length === 1 && e.key !== " ") {
      if (!e.repeat) this.onText(e.key);
      e.preventDefault(); return;
    }
    const key = gaming ? mappedKey(e.key) : e.key;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter", "Escape", "r", "m", "1", "2", "3", "F2"].includes(key)) return;
    e.preventDefault();
    this.physical.set(e.code, key);
    this.update("keyboard", new Set(this.physical.values()));
  }
  pollPads() {
    let pads = [];
    try { pads = [...(navigator.getGamepads?.() || [])].filter(p => p?.connected); } catch { /* API unavailable. */ }
    const signature = pads.map(p => `${p.index}:${p.id}:${p.mapping}`).join("|");
    if (signature !== this.signature) {
      this.signature = signature;
      this.onGamepads(pads);
    }
    const live = new Set(pads.map(p => `pad:${p.index}`));
    for (const source of this.sources.keys()) {
      if (source.startsWith("pad:") && !live.has(source)) {
        this.update(source, new Set()); this.sources.delete(source);
      }
    }
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    for (const pad of pads) this.update(`pad:${pad.index}`,
      document.hidden || this.suspended || editing ? new Set() : gamepadKeys(pad));
  }
  clear() {
    for (const key of this.keys) this.onRelease(key);
    this.sources.clear(); this.keys.clear(); this.physical.clear();
  }
  destroy() {
    this.abort.abort(); cancelAnimationFrame(this.frame); this.clear();
  }
}
