# BMO arcade adaptation

This fork preserves the upstream MIT game engine and adds a self-contained `bmo/` edition for the BMO companion.

Run `python -m http.server 8080` in this repository and open `http://localhost:8080/bmo/`.
No build step, external services, original audio or API keys are required.

- Keyboard: arrows / WASD to move, Space / Enter to launch or fire, R to restart.
- Standard Gamepad API: stick / D-pad to move, A to launch or fire, X to restart.
- Pointer / touch: drag to steer, hold to fire.
- Standalone: Escape / B or M / Y toggles pause. Within BMO these return to the face or menu.
- Green monochrome palette, procedural sounds, bounded delta-time frame loop, reusable input merging and release handling.
- iframe integration emits `bmoArcade` ready/hud/menu/close/restart messages and accepts input/options from the same-origin parent only.
- The host owns timing and cleanup; unloading a game cancels frames, releases keys and closes audio.

The original collision, scoring and level progression are reused. The invaders edition also fixes state transitions, canvas access and shooting that depended on a global `game`, and spaces waves to match the playfield.

Original MIT copyright notices are preserved in LICENSE and bmo/LICENSE. Upstream sound files are not included in the bmo edition; its effects are synthesized with Web Audio.
BMO / Adventure Time belong to their respective owners. This is an unofficial academic adaptation.
