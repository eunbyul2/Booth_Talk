# CSS Hyper-Experimental Showpieces

- Created: 2025-11-06T22:56:29+09:00
- Author: Codex

## 1. Iridescent Hologram Atlas
- **Core idea**: Layer a `conic-gradient` base with animated `background-blend-mode: screen` and `mix-blend-mode: difference` masks to create a shifting holographic map that reacts to cursor proximity via `:has(.pin:hover)`.
- **Key CSS moves**:
  ```css
  .atlas {
    --hue: 180;
    background:
      conic-gradient(from calc(var(--hue) * 1deg),
        rgba(255, 255, 255, 0.1),
        rgba(255, 255, 255, 0.7));
    filter: drop-shadow(0 0 2rem rgba(120, 255, 255, 0.6));
    animation: hue-spin 14s ease-in-out infinite alternate;
    perspective: 1200px;
  }
  .atlas:has(.pin:hover) {
    --hue: 320;
    transition: 600ms cubic-bezier(.35, 0, .25, 1);
  }
  ```
- **Implementation playbook**: Combine CSS `paint()` Houdini background for generative hex topography, attach CSS Scroll-Driven Animation (`animation-timeline: scroll()`) to slowly rotate the atlas in 3D, and use `mask-image` with custom gradients to reveal glowing city nodes.

## 2. ChronoMorph Scroll Opera
- **Core idea**: Turn an entire story sequence into a vertical stage using `@scroll-timeline` and `view-timeline` to sync costume changes, 3D transforms, and variable fonts to the user's scroll velocity.
- **Key CSS moves**:
  ```css
  @scroll-timeline hero-timeline {
    source: auto;
    scroll-offsets: 0%, 100%;
  }
  .scene {
    animation:
      wardrobe-change 1 both,
      hue-shift 1 both;
    animation-timeline: hero-timeline;
    animation-range: entry 0% exit 100%;
  }
  ```
- **Implementation playbook**: Use `ch`-based sizing with `container-type: inline-size` to make the typography responsive, and swap entire backgrounds with layered `::before`/`::after` elements that animate independently via `animation-range`. Throw in variable font axes (`font-variation-settings`) to morph the lettering as the story crescendos.

## 3. Liquid Crystal UI Shell
- **Core idea**: Mimic a living interface glass that ripples as the user hovers or focuses using `backdrop-filter`, `clip-path: path()`, and CSS custom properties driven by `@property` and pseudo-element displacement maps.
- **Key CSS moves**:
  ```css
  @property --ripple {
    syntax: "<number>";
    inherits: false;
    initial-value: 0;
  }
  .pane {
    background: linear-gradient(135deg, rgba(80,180,255,.25), rgba(255,120,220,.25));
    backdrop-filter: blur(calc(30px * (1 + var(--ripple))));
    transition: --ripple 900ms cubic-bezier(.19, 1, .22, 1);
  }
  .pane:focus-within,
  .pane:hover {
    --ripple: 1;
  }
  ```
- **Implementation playbook**: Stack three translucent panes with slight `transform: translateZ()` offsets, tie `:has(.knob:active)` to intensify refraction, and add seamless morphing `clip-path` animations for breathing edges. Use `mask-composite` to carve glyph cutouts that flicker in parallax.

## 4. Escherian Infinite Gallery
- **Core idea**: Fabricate a dissolving M.C. Escher staircase effect purely with CSS 3D transforms, `perspective`, and `animation` loops that scroll seamlessly, giving the illusion of infinite ascension.
- **Key CSS moves**:
  ```css
  .gallery {
    display: grid;
    grid-template-columns: repeat(4, minmax(18vmin, 1fr));
    transform-style: preserve-3d;
    animation: ascend 18s linear infinite;
  }
  @keyframes ascend {
    to {
      transform: translateY(-100%) rotateX(360deg);
    }
  }
  ```
- **Implementation playbook**: Chain multiple `.gallery` tracks with alternating `mix-blend-mode` to achieve surreal overlays, leverage CSS counters for step numbering, and slot in `position: sticky` captions that stay perfectly upright as the world rotates beneath them.

## 5. Sonic Bloom Reactive Fields
- **Core idea**: Visualize imagined audio on pure CSS by binding range inputs to CSS variables (`input[type=range] + label::before`) and using `conic-gradient` petals that expand with `:has(:checked)` toggles to fake amplitude spikes.
- **Key CSS moves**:
  ```css
  .bloom:has(input:checked) {
    --spread: 120deg;
    filter: drop-shadow(0 0 1.8rem rgba(255, 200, 110, 0.75));
  }
  .bloom::before {
    background: conic-gradient(from 90deg, var(--accent) 0 var(--spread), transparent var(--spread));
    animation: pulse 1.2s ease-in-out infinite alternate;
  }
  ```
- **Implementation playbook**: Chain multiple `input` toggles synced with CSS `counter()` values to fake beat progressions, use `mask-image: radial-gradient(circle, #000 60%, transparent 61%)` for petal silhouettes, and combine with `blend-mode: lighten` on a dark backdrop to mimic neon audio spectrum bursts.

## 6. Quantum Portal Navigation
- **Core idea**: Transform navigation links into portals that reveal entire page sections through CSS-driven wormholes using `perspective`, `mask-image`, `radial-gradient`, and `:target` activated keyframes.
- **Key CSS moves**:
  ```css
  .portal {
    --depth: 0;
    mask-image: radial-gradient(circle at center, transparent calc(35% - var(--depth)), black calc(40% + var(--depth)));
    transition: --depth 800ms cubic-bezier(.6, 0, .2, 1);
  }
  .portal:target {
    --depth: 22%;
    transform: rotateX(35deg) scale(1.1);
  }
  ```
- **Implementation playbook**: Pair each `.portal` section with `position: fixed` background nebulae that tilt via `transform-origin` shifts, use CSS Grid `subgrid` to align content layers, and trigger `:target` resets with `scroll-margin` anchors so the page feels like stepping through a multi-dimensional menu.

---

### Practical Integration Notes for Claude Code CLI
- Start each experiment inside an isolated `section` and wire up CSS Modules or scoped `<style>` tags to keep the Houdini properties self-contained.
- Use progressive enhancement: wrap scroll-timeline elements in `@supports (animation-timeline: scroll())` blocks and create fallback `prefers-reduced-motion` variants that fade between states instead of animating.
- Maintain a CSS custom property registry (`:root { --accent-1: ... }`) so the CLI snippets can share palettes without leaking into each other.
- Treat every concept as a plug-and-play component—ideal for a "Mini-visWork" gallery where each idea can ship as its own branch or preview environment.
