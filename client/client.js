/**
 * dsh-theme-shelter — browser half.
 *
 * A weather theme for the DSH Web GUI: a palette token-override layer plus a
 * canvas overlay that can rain, snow, or burn. A small translucent button at
 * the bottom-right corner opens the only UI this plugin owns.
 *
 * Bundle contract: a DSH client bundle only registers a lazy CJS factory here;
 * the body below runs when the plugin is materialized.
 */
window.__ModuleLoader__.load({
  id: "dsh-theme-shelter",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const PLUGIN = "dsh-theme-shelter";
    const VERSION = "0.2.1";
    const STORE_KEY = "dsh-theme-shelter/v2";
    const ROOT_ID = "dsh-weather-root";
    const STYLE_KEY = PLUGIN + "/weather.css";
    const FAB_ID = "dsh-weather-fab";
    const PANEL_ID = "dsh-weather-panel";

    /** Settings shape and defaults: rain at medium strength, no audio. */
    const DEFAULTS = Object.freeze({
      scene: "rain",
      intensity: 2,
      lightning: false,
      sound: false,
      night: false,
      palette: true,
    });

    const SCENES = ["rain", "snow", "fire", "none"];
    const DENSITY = [0, 0.55, 1, 1.75];

    /**
     * Token override layer: one `{ light, dark }` pair per alias token, folded
     * into the active theme by the theme service. Only tokens that carry the
     * weather mood are overridden; semantic state colors keep their meaning.
     */
    const TOKENS = {
      "--dsw-alias-bg-base": { light: "#eef3f8", dark: "#0c141d" },
      "--dsw-alias-bg-layer-1": { light: "#f9fbfd", dark: "#101a24" },
      "--dsw-alias-bg-layer-2": { light: "#f2f6fa", dark: "#14202c" },
      "--dsw-alias-bg-layer-3": { light: "#fbfdff", dark: "#182634" },
      "--dsw-alias-bg-overlay": { light: "#e7eef6", dark: "#16222f" },
      "--dsw-alias-bg-module-platform": { light: "#e8eef5", dark: "#12202c" },
      "--dsw-alias-bg-multi-select": { light: "#e8eef5", dark: "#12202c" },
      "--dsw-alias-bg-skeleton": { light: "#16324f0f", dark: "#ffffff0f" },
      "--dsw-specific-sidebar-fill": { light: "#e9f0f7", dark: "#0a1219" },
      "--dsw-specific-input-major": { light: "#fbfdff", dark: "#111c27" },
      "--dsw-specific-login-input": { light: "#f2f6fa", dark: "#14202c" },
      "--dsw-specific-selector": { light: "#e6edf5", dark: "#1b2a39" },
      "--dsw-specific-bubble": { light: "#dfeaf6", dark: "#16283a" },
      "--dsw-specific-bubble-highlight": { light: "#cfe1f2", dark: "#1d3549" },
      "--dsw-specific-tip": { light: "#eef4fa", dark: "#152230" },
      "--dsw-menu-surface-fill": { light: "#f8fbffb8", dark: "#172433a8" },
      "--dsw-alias-menu-group-header-fill": { light: "#f2f7fcf0", dark: "#16222ff0" },
      "--dsw-alias-label-primary": { light: "#14212e", dark: "#e6eef7" },
      "--dsw-alias-label-primary-bluish": { light: "#17364f", dark: "#cfe3f4" },
      "--dsw-alias-label-primary-dimmed": { light: "#0f1b26", dark: "#f2f7fc" },
      "--dsw-alias-label-secondary": { light: "#4a5a6b", dark: "#a6b8c9" },
      "--dsw-alias-label-tertiary": { light: "#66788b", dark: "#8195a8" },
      "--dsw-alias-label-caption": { light: "#8596a6", dark: "#6b8095" },
      "--dsw-alias-label-dimmed": { light: "#c3d0dc", dark: "#35485a" },
      "--dsw-alias-border-l1": { light: "#16324f0f", dark: "#ffffff0f" },
      "--dsw-alias-border-l2": { light: "#16324f1a", dark: "#ffffff1c" },
      "--dsw-alias-border-l3": { light: "#16324f24", dark: "#ffffff29" },
      "--dsw-alias-border-l4": { light: "#16324f2e", dark: "#ffffff3d" },
      "--dsw-alias-interactive-bg-hover": { light: "#1d4f7d14", dark: "#8fc4ea14" },
      "--dsw-alias-interactive-bg-active": { light: "#1d4f7d1f", dark: "#8fc4ea21" },
      "--dsw-alias-interactive-bg-hover-solid": { light: "#e6eef7", dark: "#1a2836" },
      "--dsw-alias-markdown-code-block": { light: "#eaf1f8", dark: "#0f1a24" },
      "--dsw-alias-markdown-code-block-banner": { light: "#e3ecf5", dark: "#132231" },
      "--dsw-alias-markdown-inline-code": { light: "#e5eef7", dark: "#14212e" },
      "--dsw-alias-markdown-tag": { light: "#dde8f2", dark: "#1a2b3a" },
      "--dsw-alias-markdown-citation": { light: "#e3edf7", dark: "#14222f" },
      "--dsw-alias-markdown-placeholder": { light: "#dbe5ef", dark: "#1a2836" },
      "--dsw-alias-scrollbar-bg-l1": { light: "#c3d2e0", dark: "#26374a" },
      "--dsw-alias-scrollbar-bg-l2": { light: "#c3d2e0", dark: "#26374a" },
      "--dsw-alias-scrollbar-hover-l1": { light: "#a9bccc", dark: "#354a60" },
      "--dsw-alias-scrollbar-hover-l2": { light: "#a9bccc", dark: "#354a60" },
      "--dsw-alias-settings-card-fill": { light: "#ffffff", dark: "#101a24" },
      "--dsw-alias-settings-card-stroke": { light: "#16324f24", dark: "#ffffff1f" },
      "--dsw-alias-illustration-background": { light: "#e4edf5", dark: "#0f1b26" },
      "--dsw-alias-illustration-surface": { light: "#f2f7fb", dark: "#16242f" },
      "--dsw-alias-illustration-backing": { light: "#cbd9e6", dark: "#20323f" },
      "--dsw-alias-illustration-detail": { light: "#b9cbdb", dark: "#375068" },
    };

    /**
     * Night mode forces the dark palette regardless of the user's appearance
     * preference, so both arms of every pair carry the dark value: whichever
     * scheme the theme service resolves, the night layer wins.
     */
    const NIGHT_TOKENS = Object.fromEntries(
      Object.entries(TOKENS).map(([name, value]) => [name, { light: value.dark, dark: value.dark }]),
    );

    const RAIN_RGB = { dark: [186, 222, 250], light: [46, 78, 110] };
    const SNOW_RGB = { dark: [226, 240, 253], light: [96, 124, 158] };
    const FIRE_RGB = [255, 168, 82];

    /**
     * Per-scene temperature on top of the rain palette: snow reads colder and
     * whiter, fire replaces the blue with an ember-warm neutral. Only tokens
     * that change the mood are listed; everything else inherits TOKENS.
     */
    const SCENE_TOKENS = {
      rain: {},
      snow: {
        "--dsw-alias-bg-base": { light: "#f4f8fc", dark: "#0b1118" },
        "--dsw-alias-bg-layer-1": { light: "#ffffff", dark: "#0f1720" },
        "--dsw-alias-bg-layer-2": { light: "#f7fbff", dark: "#131c26" },
        "--dsw-alias-bg-layer-3": { light: "#ffffff", dark: "#17212c" },
        "--dsw-specific-sidebar-fill": { light: "#edf4fa", dark: "#090f15" },
        "--dsw-specific-bubble": { light: "#e6f1fb", dark: "#13202e" },
        "--dsw-specific-bubble-highlight": { light: "#d7e8f7", dark: "#1a2b3c" },
        "--dsw-alias-label-primary": { light: "#16232e", dark: "#eaf3fb" },
        "--dsw-alias-label-secondary": { light: "#4c5f70", dark: "#aec3d5" },
      },
      fire: {
        "--dsw-alias-bg-base": { light: "#f6f0e9", dark: "#140f0c" },
        "--dsw-alias-bg-layer-1": { light: "#fcf8f4", dark: "#1a1310" },
        "--dsw-alias-bg-layer-2": { light: "#f6efe8", dark: "#221812" },
        "--dsw-alias-bg-layer-3": { light: "#fffaf5", dark: "#271b13" },
        "--dsw-alias-bg-overlay": { light: "#efe5db", dark: "#221812" },
        "--dsw-alias-bg-module-platform": { light: "#f1e8de", dark: "#1e1510" },
        "--dsw-specific-sidebar-fill": { light: "#f3eae1", dark: "#120d0a" },
        "--dsw-specific-input-major": { light: "#fffaf5", dark: "#1a1310" },
        "--dsw-specific-bubble": { light: "#f8e8d9", dark: "#2a1b12" },
        "--dsw-specific-bubble-highlight": { light: "#f2d9c4", dark: "#342216" },
        "--dsw-menu-surface-fill": { light: "#fdf7f1b8", dark: "#241a14a8" },
        "--dsw-alias-menu-group-header-fill": { light: "#f8efe6f0", dark: "#241a14f0" },
        "--dsw-alias-label-primary": { light: "#2b1d13", dark: "#f7ead9" },
        "--dsw-alias-label-primary-bluish": { light: "#4a2a18", dark: "#ffe0bd" },
        "--dsw-alias-label-secondary": { light: "#6b5443", dark: "#c9b39c" },
        "--dsw-alias-label-tertiary": { light: "#8a7059", dark: "#a8927b" },
        "--dsw-alias-label-caption": { light: "#a58c74", dark: "#8a7461" },
        "--dsw-alias-border-l1": { light: "#4a2c1a0f", dark: "#ffffff0f" },
        "--dsw-alias-border-l2": { light: "#4a2c1a1a", dark: "#ffffff1c" },
        "--dsw-alias-border-l3": { light: "#4a2c1a24", dark: "#ffffff29" },
        "--dsw-alias-border-l4": { light: "#4a2c1a2e", dark: "#ffffff3d" },
        "--dsw-alias-interactive-bg-hover": { light: "#8a4a1a12", dark: "#ffb87714" },
        "--dsw-alias-interactive-bg-active": { light: "#8a4a1a1f", dark: "#ffb87721" },
        "--dsw-alias-markdown-code-block": { light: "#f4e9de", dark: "#1d140f" },
        "--dsw-alias-markdown-code-block-banner": { light: "#efe2d5", dark: "#231811" },
        "--dsw-alias-markdown-inline-code": { light: "#f2e6da", dark: "#20160f" },
        "--dsw-alias-settings-card-fill": { light: "#fffaf5", dark: "#1a1310" },
        "--dsw-alias-settings-card-stroke": { light: "#4a2c1a24", dark: "#ffffff1f" },
        "--dsw-alias-scrollbar-bg-l1": { light: "#d6c2ae", dark: "#3a2b20" },
        "--dsw-alias-scrollbar-bg-l2": { light: "#d6c2ae", dark: "#3a2b20" },
        "--dsw-alias-scrollbar-hover-l1": { light: "#c4ab93", dark: "#4d3a2b" },
        "--dsw-alias-scrollbar-hover-l2": { light: "#c4ab93", dark: "#4d3a2b" },
      },
    };

    /** Copy one scene's pairs with the dark arm on both sides, for night mode. */
    function nightify(pairs) {
      const out = {};
      for (const [name, value] of Object.entries(pairs)) out[name] = { light: value.dark, dark: value.dark };
      return out;
    }

    const STYLE_TEXT = `
#${ROOT_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147480000;
  pointer-events: none;
  overflow: hidden;
  contain: layout style paint;
  opacity: 0;
  transition: opacity 900ms ease;
}
#${ROOT_ID}[data-ready="true"] { opacity: 1; }
#${ROOT_ID} > canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#${ROOT_ID} > .dshw-mist { position: absolute; inset: -12%; transition: opacity 600ms ease; }
#${ROOT_ID} > .dshw-night {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 800ms ease;
  background:
    radial-gradient(125% 85% at 78% -14%, rgba(150, 190, 235, 0.10), rgba(150, 190, 235, 0) 55%),
    linear-gradient(180deg, rgba(8, 18, 34, 0.18) 0%, rgba(5, 12, 24, 0.24) 100%);
}
#${ROOT_ID}[data-night="true"] > .dshw-night { opacity: 1; }
#${ROOT_ID} > .dshw-flash {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: radial-gradient(120% 85% at 50% -12%,
    rgba(230, 243, 255, 0.85), rgba(198, 224, 250, 0.28) 46%, rgba(255, 255, 255, 0) 76%);
}
#${ROOT_ID} > .dshw-flash[data-flashing="true"] { animation: dshw-flash 1100ms ease-out 1; }
@keyframes dshw-flash {
  0% { opacity: 0; }
  4% { opacity: 0.72; }
  9% { opacity: 0.16; }
  14% { opacity: 0.5; }
  27% { opacity: 0.08; }
  45% { opacity: 0; }
  100% { opacity: 0; }
}

#${FAB_ID} {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 2147480100;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary, #61666b);
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-3, #fff) 76%, transparent);
  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
  box-shadow: 0 2px 10px #00000018;
  backdrop-filter: blur(10px);
  opacity: 0.55;
  transition: opacity 160ms ease, transform 160ms ease, color 160ms ease;
}
#${FAB_ID}:hover, #${FAB_ID}:focus-visible, #${FAB_ID}[aria-expanded="true"] {
  opacity: 1;
  color: var(--dsw-alias-label-primary, #0f1115);
  transform: translateY(-1px);
}
#${FAB_ID} svg { width: 15px; height: 15px; display: block; }

#${PANEL_ID} {
  position: fixed;
  right: 14px;
  bottom: 50px;
  z-index: 2147480101;
  width: 232px;
  padding: 10px 12px 11px;
  border-radius: 14px;
  color: var(--dsw-alias-label-primary, #0f1115);
  background: var(--dsw-alias-bg-layer-3, #fff);
  border: 1px solid var(--dsw-alias-border-l2, #0000001a);
  box-shadow: 0 18px 44px #0000002e;
  font: 12px/1.5 -apple-system, "Segoe UI", "PingFang SC", sans-serif;
  display: none;
}
#${PANEL_ID}[data-open="true"] { display: block; }
/* Segmented surfaces are not the theme's own tokens: in dark the rain palette
   makes bg-layer-1 darker than the panel, so a "selected" pill drawn with it
   reads as a hole. These two values keep "tray darker, selected lighter" in
   both schemes, whoever owns the palette underneath. */
#${PANEL_ID} { --dshw-tray: #e8eef5; --dshw-pill: #ffffff; --dshw-pill-stroke: #0000001f; }
body[data-ds-dark-theme] #${PANEL_ID} {
  --dshw-tray: #0d1721;
  --dshw-pill: #24384c;
  --dshw-pill-stroke: #ffffff1f;
}
#${PANEL_ID} .dshw-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
#${PANEL_ID} .dshw-title { font-size: 12px; font-weight: 600; letter-spacing: .01em; }
#${PANEL_ID} .dshw-close {
  border: 0; background: transparent; color: var(--dsw-alias-label-tertiary, #66788b);
  font: inherit; font-size: 14px; line-height: 1; cursor: pointer; padding: 2px 4px; border-radius: 6px;
}
#${PANEL_ID} .dshw-close:hover { color: var(--dsw-alias-label-primary, #0f1115); background: var(--dsw-alias-interactive-bg-hover, #2631480f); }
#${PANEL_ID} .dshw-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 9px; }
#${PANEL_ID} .dshw-label { color: var(--dsw-alias-label-secondary, #4a5a6b); font-size: 11.5px; }
#${PANEL_ID} .dshw-seg {
  display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px;
  background: var(--dshw-tray);
}
#${PANEL_ID} .dshw-seg button {
  font: inherit; font-size: 11.5px; line-height: 1; padding: 4px 8px; border: 0; border-radius: 6px;
  background: transparent; color: var(--dsw-alias-label-secondary, #4a5a6b); cursor: pointer;
}
#${PANEL_ID} .dshw-seg button.is-on {
  background: var(--dshw-pill); color: var(--dsw-alias-label-primary, #0f1115);
  box-shadow: 0 0 0 0.5px var(--dshw-pill-stroke);
}
#${PANEL_ID} .dshw-seg button:disabled { opacity: .4; cursor: default; }
#${PANEL_ID} .dshw-toggles {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2px;
  margin-top: 9px; padding: 2px; border-radius: 8px;
  background: var(--dshw-tray);
}
#${PANEL_ID} .dshw-toggle {
  font: inherit; font-size: 11.5px; line-height: 1; padding: 6px 2px; border: 0; border-radius: 6px;
  background: transparent; color: var(--dsw-alias-label-secondary, #4a5a6b);
  cursor: pointer; text-align: center; min-width: 0;
}
#${PANEL_ID} .dshw-toggle[aria-pressed="true"] {
  background: var(--dshw-pill);
  color: var(--dsw-alias-label-primary, #0f1115);
  box-shadow: 0 0 0 0.5px var(--dshw-pill-stroke);
}
#${PANEL_ID} .dshw-toggle:disabled { opacity: .4; cursor: default; }
#${PANEL_ID} .dshw-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
#${PANEL_ID} .dshw-hint { color: var(--dsw-alias-label-tertiary, #66788b); font-size: 10.5px; }
#${PANEL_ID} .dshw-reset {
  font: inherit; font-size: 10.5px; line-height: 1; padding: 3px 0; border: 0; background: transparent;
  color: var(--dsw-alias-label-tertiary, #66788b); cursor: pointer; text-decoration: underline;
}
#${PANEL_ID} .dshw-reset:hover { color: var(--dsw-alias-label-primary, #0f1115); }

@media (prefers-reduced-motion: reduce) {
  #${ROOT_ID} { transition: none; }
  #${ROOT_ID} > .dshw-flash[data-flashing="true"] { animation: none; }
  #${FAB_ID} { transition: none; }
}
`;

    // ---------------------------------------------------------------- settings

    function sanitizeSettings(value) {
      const out = {};
      if (value === null || typeof value !== "object") return out;
      if (SCENES.includes(value.scene)) out.scene = value.scene;
      if (value.intensity === 1 || value.intensity === 2 || value.intensity === 3) out.intensity = value.intensity;
      if (typeof value.lightning === "boolean") out.lightning = value.lightning;
      if (typeof value.sound === "boolean") out.sound = value.sound;
      if (typeof value.night === "boolean") out.night = value.night;
      if (typeof value.palette === "boolean") out.palette = value.palette;
      return out;
    }

    function readSettings() {
      const settings = { ...DEFAULTS };
      try {
        /* The first key wins; the rest are the archives of earlier names, read
           once so a rename does not drop the user's scene and switches. */
        const raw = window.localStorage.getItem(STORE_KEY)
          || window.localStorage.getItem("dsh-theme-rain/v2")
          || window.localStorage.getItem("dsh-theme-shelter/v1")
          || window.localStorage.getItem("dsh-theme-rain/v1");
        if (raw) Object.assign(settings, sanitizeSettings(JSON.parse(raw)));
      } catch (error) {
        /* A blocked or full localStorage must not break the theme. */
      }
      return settings;
    }

    function writeSettings(settings) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(settings));
      } catch (error) {
        /* ignore */
      }
    }

    // ---------------------------------------------------------------- utilities

    function clamp(value, min, max) {
      return value < min ? min : value > max ? max : value;
    }

    function random(min, max) {
      return min + Math.random() * (max - min);
    }

    function rgba(rgb, alpha) {
      return "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", " + alpha.toFixed(3) + ")";
    }

    function prefersReducedMotion() {
      return typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // ------------------------------------------------------------------ sprites

    function sprite(size, paint) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      paint(canvas.getContext("2d"), size);
      return canvas;
    }

    /** Soft round glow used for snow, embers and sparks. */
    function glowSprite(rgb, hardness) {
      return sprite(64, (g, size) => {
        const c = size / 2;
        const gradient = g.createRadialGradient(c, c, 0, c, c, c);
        gradient.addColorStop(0, rgba(rgb, 1));
        gradient.addColorStop(hardness, rgba(rgb, 0.65));
        gradient.addColorStop(1, rgba(rgb, 0));
        g.fillStyle = gradient;
        g.beginPath();
        g.arc(c, c, c, 0, Math.PI * 2);
        g.fill();
      });
    }

    /** A water bead on glass: bright offset highlight, soft rim tinted per scheme. */
    function beadSprite(rim) {
      return sprite(64, (g, size) => {
        const c = size / 2;
        const edge = g.createRadialGradient(c, c, c * 0.58, c, c, c);
        edge.addColorStop(0, rgba(rim, 0));
        edge.addColorStop(0.82, rgba(rim, 0.17));
        edge.addColorStop(1, rgba(rim, 0));
        g.fillStyle = edge;
        g.beginPath();
        g.arc(c, c, c, 0, Math.PI * 2);
        g.fill();

        const body = g.createRadialGradient(c, c, 2, c, c, c);
        body.addColorStop(0, "rgba(255,255,255,0.30)");
        body.addColorStop(0.72, "rgba(222,238,250,0.18)");
        body.addColorStop(1, "rgba(222,238,250,0)");
        g.fillStyle = body;
        g.beginPath();
        g.arc(c, c, c, 0, Math.PI * 2);
        g.fill();

        const highlight = g.createRadialGradient(c * 0.68, c * 0.62, 1, c * 0.68, c * 0.62, c * 0.42);
        highlight.addColorStop(0, "rgba(255,255,255,0.95)");
        highlight.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = highlight;
        g.beginPath();
        g.arc(c * 0.68, c * 0.62, c * 0.42, 0, Math.PI * 2);
        g.fill();
      });
    }

    // -------------------------------------------------------------------- audio

    /**
     * Snow ambience, generated rather than recorded: real snowfall is nearly
     * silent, so a looped brown-noise bed through a slow-breathing lowpass
     * stands in at whisper level. No asset, works before any recording loads.
     */
    function createSnowWind() {
      /* whisper level: a fraction of the rain loudness */
      const GUST_HZ = 0.07;
      let ctx = null;
      let gain = null;
      let target = 0;

      function ensure() {
        if (ctx) return true;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (typeof AC !== "function") return false;
        try {
          ctx = new AC();
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          let last = 0;
          for (let i = 0; i < data.length; i += 1) {
            const white = Math.random() * 2 - 1;
            last = (last + 0.02 * white) / 1.02;
            data[i] = last * 3.5;
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 420;
          filter.Q.value = 0.7;
          /* the wind breathes over roughly fifteen seconds */
          const gust = ctx.createOscillator();
          gust.frequency.value = GUST_HZ;
          const gustDepth = ctx.createGain();
          gustDepth.gain.value = 160;
          gust.connect(gustDepth);
          gustDepth.connect(filter.frequency);
          gain = ctx.createGain();
          gain.gain.value = 0;
          source.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          source.start();
          gust.start();
          return true;
        } catch (error) {
          ctx = null;
          return false;
        }
      }

      function applyFade() {
        if (!ctx || !gain) return;
        gain.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
      }

      return {
        setTarget(value) {
          target = value;
          if (value > 0 && !ensure()) return;
          applyFade();
          if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
        },
        resume() {
          if (target <= 0 || !ensure()) return;
          if (ctx.state === "suspended") ctx.resume().catch(() => {});
          applyFade();
        },
        silence() {
          target = 0;
          applyFade();
        },
        get active() { return ctx !== null; },
        get running() { return ctx !== null && ctx.state === "running" && target > 0; },
      };
    }

    /**
     * Ambience: real recordings for rain and fire, plus the procedural snow
     * wind above. The host half serves the mp3 files on
     * `/dsh-theme-shelter/audio/<name>`; this half owns the <audio> elements,
     * their volumes, the one-shot thunder clap, and the snow wind graph.
     */
    function createAudio() {
      const BASE = "/dsh-theme-shelter/audio";
      const FILES = { rain: "rain.mp3", fire: "fire.mp3" };
      const THUNDER = "thunder.mp3";
      /* Per-intensity loudness. The mp3s are mastered hot, so these stay low. */
      const LOUDNESS = [0, 0.18, 0.3, 0.42];
      /* snow wind stays at a whisper: a fraction of the rain levels */
      const SNOW_LOUDNESS = [0, 0.04, 0.07, 0.11];

      let loop = null;
      let loopFile = "";
      let target = 0.3;
      let ramp = 0;
      let enabled = false;
      let thunderEl = null;
      let thunderTimer = 0;
      const snowWind = createSnowWind();

      function element(file, looped) {
        const el = new Audio(BASE + "/" + file);
        el.loop = looped;
        el.preload = "auto";
        el.volume = 0;
        return el;
      }

      function playSafe(el) {
        if (!el) return;
        const started = el.play();
        /* A blocked autoplay must not surface as an unhandled rejection. */
        if (started && typeof started.catch === "function") started.catch(() => {});
      }

      /** HTMLMediaElement.volume has no transition, so step it by hand. */
      function fadeTo(el, next) {
        if (!el) return;
        if (ramp) window.clearInterval(ramp);
        const from = el.volume;
        const steps = 10;
        let step = 0;
        ramp = window.setInterval(() => {
          step += 1;
          el.volume = clamp(from + (next - from) * (step / steps), 0, 1);
          if (step >= steps) {
            window.clearInterval(ramp);
            ramp = 0;
          }
        }, 50);
      }

      function stopLoop() {
        const old = loop;
        loop = null;
        loopFile = "";
        if (!old) return;
        fadeTo(old, 0);
        window.setTimeout(() => {
          old.pause();
          old.removeAttribute("src");
          old.load();
        }, 600);
      }

      return {
        /** Point the ambience at a scene; the element survives an intensity change. */
        play(scene, intensity) {
          enabled = true;
          if (scene === "snow") {
            /* real snowfall is near-silent: no loop, just the whisper of wind */
            stopLoop();
            snowWind.setTarget(SNOW_LOUDNESS[clamp(intensity, 0, 3)]);
            return;
          }
          snowWind.setTarget(0);
          const file = FILES[scene] || FILES.rain;
          if (!loop || loopFile !== file) {
            stopLoop();
            loop = element(file, true);
            loopFile = file;
          }
          /* mute() pauses after its fade, so re-enabling must start it again. */
          if (loop.paused) playSafe(loop);
          target = LOUDNESS[clamp(intensity, 0, 3)];
          fadeTo(loop, target);
        },
        /** One thunder clap, delayed so it reads as a distant rumble. */
        thunder() {
          if (!enabled) return;
          if (thunderTimer) window.clearTimeout(thunderTimer);
          thunderTimer = window.setTimeout(() => {
            thunderTimer = 0;
            if (!enabled) return;
            if (!thunderEl) thunderEl = element(THUNDER, false);
            thunderEl.currentTime = 0;
            thunderEl.volume = 0.75;
            playSafe(thunderEl);
          }, random(400, 2200));
        },
        mute() {
          enabled = false;
          if (thunderTimer) window.clearTimeout(thunderTimer);
          thunderTimer = 0;
          if (thunderEl) thunderEl.pause();
          snowWind.silence();
          if (!loop) return;
          fadeTo(loop, 0);
          /* Stop decoding once the fade lands, unless sound came back meanwhile. */
          window.setTimeout(() => {
            if (!enabled && loop) loop.pause();
          }, 700);
        },
        /** Called from a user gesture when sound was restored from settings. */
        resume() {
          if (!enabled) return;
          snowWind.resume();
          if (!loop) return;
          if (loop.paused) playSafe(loop);
          fadeTo(loop, target);
        },
        get ready() {
          return loop !== null || snowWind.active;
        },
        get state() {
          if (snowWind.running) return "running";
          if (!loop) return snowWind.active ? "suspended" : "none";
          return loop.paused ? "suspended" : "running";
        },
      };
    }

    // -------------------------------------------------------------------- scenes

    /**
     * 0 — rain, simulated in world units and then projected. Every drop
     * carries a diameter (mm) and a depth z (m): terminal velocity follows the
     * standard exponential fit (0.5 mm ≈ 2 m/s, 3 mm ≈ 8 m/s), wind is a
     * world-space air speed each drop relaxes toward (fine drops respond
     * faster than fat ones), and the screen motion, slant and motion-blur
     * length all derive from the one projected velocity vector, so the slant
     * no longer depends on depth. Splashes are powered by the world impact
     * speed and scaled by the same projection as everything else.
     */
    function createRainScene(sprites) {
      const drops = [];
      const beads = [];
      const rings = [];
      const splashes = [];
      const streakCache = new Map();
      let width = 0;
      let height = 0;

      /* projection: a drop z metres away renders 1/z as large and as slow */
      const PIXELS_PER_METRE = 2200;
      const SHUTTER = 0.65;              // shutter as a fraction of the frame
      const GRAVITY = 9.8;               // m/s², world frame
      const FLOOR_INSET = 9;             // sill line, px above the bottom edge
      const LEN_SIZES = [16, 32, 64, 128, 192];
      const WIDTH_SIZES = [0.7, 1.0, 1.4, 1.9, 2.6];

      function bucket(sizes, value) {
        for (const size of sizes) {
          if (size >= value) return size;
        }
        return sizes[sizes.length - 1];
      }

      /** Exponential fit to measured fall speeds (diameter mm → m/s). */
      function terminalVelocity(diameter) {
        return 9.65 - 10.3 * Math.exp(-0.6 * diameter);
      }

      /** World air speed in m/s: a breeze that breathes and can briefly lull. */
      function gust(clock) {
        return 0.55 + 0.35 * Math.sin(clock * 0.19) + 0.18 * Math.sin(clock * 0.57 + 1.7);
      }

      /** Small drops ride the wind quickly; fat drops keep their heading. */
      function responseTime(diameter) {
        return 0.12 + 0.14 * diameter;
      }

      /**
       * A streak is the drop's motion blur: thin and faint at the tail, widest
       * and brightest at the head. Baked once per width/length/scheme because
       * six strokes per drop per frame cost a third of the frame budget.
       */
      function streakSprite(streakWidth, length, rgb) {
        const key = streakWidth + "|" + length + "|" + rgb[0];
        const hit = streakCache.get(key);
        if (hit) return hit;

        const pad = 3;
        const headWidth = streakWidth * 1.15;
        const tailWidth = streakWidth * 0.32;
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(headWidth + pad * 2);
        canvas.height = length + pad * 2;
        const g = canvas.getContext("2d");
        const cx = canvas.width / 2;
        const top = pad;
        const bottom = pad + length;

        const fill = g.createLinearGradient(0, top, 0, bottom);
        fill.addColorStop(0, rgba(rgb, 0));
        fill.addColorStop(0.45, rgba(rgb, 0.45));
        fill.addColorStop(0.88, rgba(rgb, 0.95));
        fill.addColorStop(1, rgba(rgb, 0.6));
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(cx - tailWidth / 2, top);
        g.quadraticCurveTo(cx - headWidth / 2, bottom - length * 0.35, cx - headWidth / 2, bottom - headWidth / 2);
        g.arc(cx, bottom - headWidth / 2, headWidth / 2, Math.PI, 0);
        g.quadraticCurveTo(cx + headWidth / 2, bottom - length * 0.35, cx + tailWidth / 2, top);
        g.closePath();
        g.fill();

        const sprite = { canvas, width: canvas.width, height: canvas.height, length };
        streakCache.set(key, sprite);
        return sprite;
      }

      function makeDrop(scheme, fromTop) {
        /* Light glass needs a little more body than a dark one to read as water. */
        const boost = scheme === "light" ? 1.25 : 1;
        /* Depth is biased away from the camera: near drops are rare but large,
           the way a real volume of rain reads on a flat pane. */
        const z = 2.4 + Math.pow(Math.random(), 1.45) * 9.6;
        const diameter = 0.35 + Math.pow(Math.random(), 2.2) * 2.15;
        const k = PIXELS_PER_METRE / z;
        return {
          z,
          k,
          diameter,
          vt: terminalVelocity(diameter),
          vx: 0,                          // world horizontal speed, m/s
          tau: responseTime(diameter),
          angle: 0,
          x: random(-0.08, 1.08) * width,
          y: fromTop ? -random(20, 160) : random(0, height),
          width: clamp((diameter * 1.15 * k) / 900, 0.5, 2.4),
          alpha: Math.min(0.55, (0.16 + 0.45 / z) * boost),
        };
      }

      /** A droplet sitting on the glass: varied size, but pinned — it never runs. */
      function makeBead() {
        const big = Math.random() < 0.14;
        return {
          x: random(0, width),
          y: random(0, height * 0.96),
          r: big ? random(2.2, 3.2) : random(0.9, 2.1),
          alpha: random(0.25, 0.55),
        };
      }

      /**
       * A drop hits the sill. Ejection speed is a fraction of the world
       * impact speed (not the screen speed), everything is scaled by the same
       * depth projection as the drop itself, and close fat drops can throw
       * the Worthington jet that fires almost straight up.
       */
      function splash(x, z, k, impactSpeed, diameter) {
        if (splashes.length > 160) return;
        const floor = height - FLOOR_INSET;

        /* crown ring: a few mm of capillary wave, projected */
        rings.push({
          x,
          y: floor + 2,
          r: 1.5,
          target: clamp((0.006 + 0.006 * (impactSpeed / 9)) * k, 2.5, 26),
          life: 0.3,
          max: 0.3,
        });

        const eject = impactSpeed * 0.16;
        const count = 4 + Math.floor(Math.random() * 4 + diameter * 1.4);
        for (let index = 0; index < count; index += 1) {
          const spread = random(-1.35, 1.35);
          const speed = eject * random(0.3, 1.2);
          splashes.push({
            x: x + random(-8, 8) * (k / 900),
            y: floor,
            vx: Math.sin(spread) * speed * k,
            vy: -Math.cos(spread) * speed * random(0.75, 1.25) * k,
            g: GRAVITY * k,
            life: random(0.45, 0.85),
            phase: random(0, Math.PI * 2),
            r: clamp((0.9 + Math.random() * 1.7 * (0.6 + diameter * 0.15)) * (k / 1100), 0.6, 3.2),
          });
        }

        if (z < 3.2 && diameter > 1.6 && Math.random() < 0.6) {
          splashes.push({
            x: x + random(-1.5, 1.5),
            y: floor,
            vx: random(-22, 22) * (k / 900),
            vy: -eject * random(0.85, 1.15) * 0.95 * k,
            g: GRAVITY * k,
            life: random(0.55, 0.85),
            phase: random(0, Math.PI * 2),
            r: clamp((1.3 + Math.random() * 1.4) * (k / 1100), 0.8, 3.6),
          });
        }
      }

      return {
        reset(state) {
          width = state.w;
          height = state.h;
          drops.length = 0;
          beads.length = 0;
          rings.length = 0;
          splashes.length = 0;
          const budget = clamp(Math.round((width * height) / 6200 * DENSITY[state.intensity]), 24, 520);
          for (let index = 0; index < budget; index += 1) drops.push(makeDrop(state.scheme, false));
          const beadCount = clamp(Math.round((width * height) / 42000), 12, 60);
          for (let index = 0; index < beadCount; index += 1) beads.push(makeBead());
        },

        /** Grow or shrink the population in place: no full-particle reset. */
        retune(state) {
          width = state.w;
          height = state.h;
          const budget = clamp(Math.round((width * height) / 6200 * DENSITY[state.intensity]), 24, 520);
          while (drops.length > budget) drops.pop();
          while (drops.length < budget) drops.push(makeDrop(state.scheme, false));
          const beadCount = clamp(Math.round((width * height) / 42000), 12, 60);
          while (beads.length > beadCount) beads.pop();
          while (beads.length < beadCount) beads.push(makeBead());
        },

        step(state, dt) {
          width = state.w;
          height = state.h;
          const wind = gust(state.clock);
          const floor = height - FLOOR_INSET;

          for (let index = 0; index < drops.length; index += 1) {
            const drop = drops[index];
            /* world-frame wind response: the screen slant follows the world
               velocity, so it is identical at every depth */
            drop.vx += (wind - drop.vx) * (1 - Math.exp(-dt / drop.tau));
            drop.angle = Math.atan2(drop.vx, drop.vt);
            const vyScreen = drop.vt * drop.k;
            const vxScreen = drop.vx * drop.k;
            const prevY = drop.y;
            drop.y += vyScreen * dt;
            drop.x += vxScreen * dt;

            if (prevY <= floor && drop.y > floor) {
              /* continuous hit: interpolate the impact point across the step */
              const hit = (floor - prevY) / Math.max(1e-6, drop.y - prevY);
              const hitX = drop.x - vxScreen * dt * (1 - hit);
              if (drop.z < 5.5 && Math.random() < 0.6) {
                splash(hitX, drop.z, drop.k, drop.vt, drop.diameter);
              }
              drops[index] = makeDrop(state.scheme, true);
            } else if (drop.y - 40 > height || drop.x < -140 || drop.x > width + 140) {
              drops[index] = makeDrop(state.scheme, true);
            }
          }

          for (let index = rings.length - 1; index >= 0; index -= 1) {
            const ring = rings[index];
            ring.life -= dt;
            if (ring.life <= 0) {
              rings.splice(index, 1);
              continue;
            }
            ring.r += (ring.target - ring.r) * Math.min(1, dt * 6);
          }

          for (let index = splashes.length - 1; index >= 0; index -= 1) {
            const drop = splashes[index];
            drop.life -= dt;
            drop.vy += drop.g * dt;
            drop.x += drop.vx * dt;
            drop.y += drop.vy * dt;
            if (drop.life <= 0 || drop.y > height - 3) {
              splashes.splice(index, 1);
            }
          }
        },

        draw(g, state) {
          const rgb = RAIN_RGB[state.scheme] || RAIN_RGB.light;
          const beadSprite = state.scheme === "dark" ? sprites.beadDark : sprites.beadLight;
          /* motion blur spans where each drop actually travelled this frame */
          const blurDt = clamp(state.dt || 1 / 60, 1 / 240, 1 / 12);

          /* far to near, so a close streak covers the ones behind it */
          drops.sort((a, b) => b.z - a.z);
          for (const drop of drops) {
            const length = clamp(
              Math.hypot(drop.vx * drop.k, drop.vt * drop.k) * blurDt * SHUTTER,
              6,
              150,
            );
            const sprite = streakSprite(bucket(WIDTH_SIZES, drop.width), bucket(LEN_SIZES, length), rgb);
            const scaleY = length / sprite.length;
            g.save();
            g.globalAlpha = drop.alpha;
            g.translate(drop.x, drop.y);
            g.rotate(-drop.angle);
            g.drawImage(
              sprite.canvas,
              -sprite.width / 2,
              -sprite.height * scaleY,
              sprite.width,
              sprite.height * scaleY,
            );
            g.restore();

            /* a drop outside the focal plane: one wide faint pass stands in for
               a real depth-of-field blur */
            if (drop.z < 3.2) {
              g.strokeStyle = rgba(rgb, drop.alpha * 0.16);
              g.lineWidth = drop.width * 2.6;
              g.beginPath();
              g.moveTo(drop.x, drop.y);
              g.lineTo(drop.x - Math.sin(drop.angle) * length * 0.9, drop.y - Math.cos(drop.angle) * length * 0.9);
              g.stroke();
            }
          }

          /* Small droplets on the pane — texture only, no drifting and no trail. */
          for (const bead of beads) {
            const size = bead.r * 2.6;
            g.globalAlpha = bead.alpha;
            g.drawImage(beadSprite, bead.x - size / 2, bead.y - size / 2, size, size);
          }
          g.globalAlpha = 1;

          /* crown rings where the drops land */
          for (const ring of rings) {
            const fade = clamp(ring.life / ring.max, 0, 1);
            g.strokeStyle = rgba(rgb, 0.26 * fade);
            g.lineWidth = 0.9;
            g.beginPath();
            g.ellipse(ring.x, ring.y, ring.r, ring.r * 0.26, 0, 0, Math.PI * 2);
            g.stroke();
          }

          /* Splash droplets are oblate spheroids: the short axis lies along
             their own velocity, so the ellipse turns as the droplet arcs, and
             the flattening keeps oscillating. Small ones stay round. */
          for (const drop of splashes) {
            g.globalAlpha = clamp(drop.life * 2.6, 0, 1);
            const base = clamp(1 - drop.r * 0.11, 0.7, 0.97);
            const flatten = clamp(base * (1 + 0.12 * Math.sin(drop.life * 40 + drop.phase)), 0.66, 1);
            const heading = Math.atan2(drop.vy, drop.vx);
            g.fillStyle = rgba(rgb, 0.55);
            g.save();
            g.translate(drop.x, drop.y);
            g.rotate(heading);
            g.beginPath();
            g.ellipse(0, 0, drop.r * flatten, drop.r, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();

            /* the highlight stays in screen space: the light comes from above */
            g.fillStyle = "rgba(255, 255, 255, 0.6)";
            g.beginPath();
            g.arc(drop.x - drop.r * 0.28, drop.y - drop.r * 0.32, Math.max(0.4, drop.r * 0.45), 0, Math.PI * 2);
            g.fill();
          }
          g.globalAlpha = 1;
        },
      };
    }

    /**
     * 1 — snow, also world-first: each flake has a depth, a crystal type
     * (dendrite aggregate or graupel) with a type-appropriate fall speed, a
     * relaxed chase of a position-coherent wind field, and its own rotation.
     * Landings feed a mass-based accumulation bank that grows while it snows
     * instead of appearing fully formed, and glints are rate-limited by dt so
     * 60 Hz and 120 Hz twinkle identically — and follow their flake.
     */
    function createSnowScene(sprites) {
      const flakes = [];
      const glints = [];
      const bank = [];
      let width = 0;
      let height = 0;
      let glintBudget = 0;

      const PIXELS_PER_METRE = 1800;
      const MAX_BANK = 26;               // px, the ridge stops growing here
      const BANK_KERNEL = [0.18, 0.45, 1, 0.45, 0.18];

      /* World air speed (m/s): a slow drift that can briefly reverse. */
      function baseWind(clock) {
        return 0.8 + 0.55 * Math.sin(clock * 0.11) + 0.3 * Math.sin(clock * 0.047 + 2.1);
      }

      /* Position-coherent turbulence: neighbours sway together, each flake
         adding only a small personal wobble of its own. */
      function turbulence(x, y, clock) {
        return 0.28 * Math.sin(x * 0.004 + clock * 0.5)
          + 0.22 * Math.cos(y * 0.005 - clock * 0.37 + x * 0.001)
          + 0.16 * Math.sin((x + y) * 0.002 + clock * 0.83);
      }

      function windAt(x, y, clock) {
        return baseWind(clock) + turbulence(x, y, clock);
      }

      /** Fill a flake in place, so glints holding a reference stay live. */
      function seedFlake(target, scheme, fromTop) {
        const type = Math.random() < 0.68 ? 0 : 1;   // 0 dendrite, 1 graupel
        const size = type === 0 ? random(2.5, 7.5) : random(1.2, 3.5);  // mm
        const z = 2.2 + Math.pow(Math.random(), 1.4) * 4.3;
        const k = PIXELS_PER_METRE / z;
        target.type = type;
        target.size = size;
        target.z = z;
        target.k = k;
        target.vt = type === 0
          ? random(0.55, 1.0) * (1 + size / 30)
          : random(1.1, 1.7);
        target.vy = target.vt;
        target.vx = 0;
        target.tau = type === 0 ? 0.9 : 0.45;
        target.r = clamp((size * k) / 1000, 0.7, 11);
        target.x = random(0, width);
        target.y = fromTop ? -random(6, 40) : random(-20, height);
        target.phase = random(0, Math.PI * 2);
        target.rot = random(0, Math.PI * 2);
        target.rotSpeed = type === 0 ? random(-1.2, 1.2) : random(-0.4, 0.4);
        target.alpha = clamp((0.35 + 0.5 / z) * (scheme === "light" ? 0.9 : 1), 0.25, 0.95);
        /* sparkle needs directional light: night/dark scenes only */
        target.twinkle = scheme === "dark" && type === 0 && Math.random() < 0.22;
        return target;
      }

      function makeFlake(scheme, fromTop) {
        return seedFlake({}, scheme, fromTop);
      }

      function deposit(flake) {
        const column = Math.round(flake.x / 16);
        const mass = flake.type === 0 ? 0.55 : 0.4;
        for (let offset = -2; offset <= 2; offset += 1) {
          const index = column + offset;
          if (index < 0 || index >= bank.length) continue;
          const gain = mass * BANK_KERNEL[offset + 2] * 0.6;
          bank[index].h = Math.min(MAX_BANK, bank[index].h + gain);
        }
      }

      return {
        reset(state) {
          width = state.w;
          height = state.h;
          flakes.length = 0;
          glints.length = 0;
          bank.length = 0;
          glintBudget = 0;
          const budget = clamp(Math.round((width * height) / 11000 * DENSITY[state.intensity]), 30, 340);
          for (let index = 0; index < budget; index += 1) flakes.push(makeFlake(state.scheme, false));
          /* the bank starts empty: it exists only because snow has landed */
          const columns = Math.ceil(width / 16) + 1;
          for (let index = 0; index <= columns; index += 1) bank.push({ x: index * 16, h: 0 });
        },

        /** Adjust the population in place; accumulated snow is preserved. */
        retune(state) {
          width = state.w;
          height = state.h;
          const budget = clamp(Math.round((width * height) / 11000 * DENSITY[state.intensity]), 30, 340);
          while (flakes.length > budget) flakes.pop();
          while (flakes.length < budget) flakes.push(makeFlake(state.scheme, false));
          const columns = Math.ceil(width / 16) + 1;
          while (bank.length < columns) bank.push({ x: bank.length * 16, h: 0 });
          while (bank.length > columns) bank.pop();
        },

        step(state, dt) {
          width = state.w;
          height = state.h;
          const clock = state.clock;
          const floor = height - 4;

          for (let index = 0; index < flakes.length; index += 1) {
            const flake = flakes[index];
            const target = windAt(flake.x, flake.y, clock);
            flake.vx += (target - flake.vx) * (1 - Math.exp(-dt / flake.tau));
            flake.vy = flake.vt * (1 + 0.12 * Math.sin(clock * 0.6 + flake.phase));
            flake.rot += flake.rotSpeed * dt;
            const prevY = flake.y;
            flake.y += flake.vy * flake.k * dt;
            flake.x += flake.vx * flake.k * dt + Math.sin(clock * 0.9 + flake.phase) * 4 * dt;

            if (prevY <= floor && flake.y > floor) {
              deposit(flake);
              seedFlake(flake, state.scheme, true);
              continue;
            }
            if (flake.y - 30 > height) {
              seedFlake(flake, state.scheme, true);
              continue;
            }
            if (flake.x < -16) flake.x = width + 14;
            else if (flake.x > width + 16) flake.x = -14;
          }

          /* gentle slumping: spikes relax into a soft ridge */
          const relax = Math.min(1, dt * 1.5);
          for (let index = 1; index < bank.length - 1; index += 1) {
            const avg = (bank[index - 1].h + bank[index + 1].h) * 0.5;
            bank[index].h += (avg - bank[index].h) * relax;
          }

          for (let index = glints.length - 1; index >= 0; index -= 1) {
            glints[index].life -= dt;
            if (glints[index].life <= 0) glints.splice(index, 1);
          }
          /* dt-limited spawn: identical twinkle rate at any frame rate */
          glintBudget += dt * 2.2;
          while (glintBudget >= 1) {
            glintBudget -= 1;
            const candidates = flakes.filter((flake) => flake.twinkle);
            if (!candidates.length) break;
            const flake = candidates[Math.floor(Math.random() * candidates.length)];
            glints.push({ flake, r: random(3, 7), life: random(0.4, 1.0), max: 1.0 });
          }
        },

        draw(g, state) {
          const rgb = SNOW_RGB[state.scheme] || SNOW_RGB.light;
          const sprite = state.scheme === "dark" ? sprites.flakeLight : sprites.flakeDark;

          /* Accumulation bank: starts at zero, grows from landings, fades in
             with the ridge itself. */
          let ridge = 0;
          for (const point of bank) {
            if (point.h > ridge) ridge = point.h;
          }
          if (ridge > 0.5) {
            const fade = clamp(ridge / 6, 0, 1);
            const top = height - ridge - 6;
            const gradient = g.createLinearGradient(0, top, 0, height);
            gradient.addColorStop(0, rgba(rgb, 0));
            gradient.addColorStop(1, rgba(rgb, (state.scheme === "dark" ? 0.16 : 0.2) * fade));
            g.fillStyle = gradient;
            g.beginPath();
            g.moveTo(0, height);
            for (const point of bank) g.lineTo(point.x, height - point.h);
            g.lineTo(width, height);
            g.closePath();
            g.fill();
          }

          for (const flake of flakes) {
            const size = flake.r * (flake.type === 0 ? 2.6 : 2.0) + 1.5;
            g.save();
            g.translate(flake.x, flake.y);
            g.globalAlpha = flake.alpha;
            g.drawImage(sprite, -size / 2, -size / 2, size, size);
            /* only in-focus dendrites show their six-fold structure, rotated */
            if (flake.type === 0 && flake.r > 1.5) {
              g.rotate(flake.rot);
              g.globalAlpha = flake.alpha * 0.85;
              g.strokeStyle = rgba(rgb, 0.9);
              g.lineWidth = Math.max(0.5, flake.r * 0.16);
              g.beginPath();
              const arm = flake.r * 1.35;
              for (let spoke = 0; spoke < 3; spoke += 1) {
                const angle = (Math.PI / 3) * spoke;
                g.moveTo(-Math.cos(angle) * arm, -Math.sin(angle) * arm);
                g.lineTo(Math.cos(angle) * arm, Math.sin(angle) * arm);
              }
              g.stroke();
            }
            g.restore();
          }
          g.globalAlpha = 1;

          for (const glint of glints) {
            const t = clamp(glint.life / glint.max, 0, 1);
            const fade = Math.sin(Math.PI * t);
            const x = glint.flake.x;
            const y = glint.flake.y;
            const r = glint.r * (1.25 - 0.25 * t);
            g.strokeStyle = rgba(rgb, 0.75 * fade);
            g.lineWidth = 0.8;
            g.beginPath();
            g.moveTo(x - r, y);
            g.lineTo(x + r, y);
            g.moveTo(x, y - r);
            g.lineTo(x, y + r);
            g.stroke();
          }
        },
      };
    }

    /** 2 — fire: warm hearth glow, rising embers, sparks and slow smoke. */
    function createFireScene(sprites) {
      const embers = [];
      const sparks = [];
      const smoke = [];
      let width = 0;
      let height = 0;

      function makeEmber(state, seeded) {
        return {
          x: width * 0.5 + random(-0.32, 0.32) * width,
          y: seeded ? random(height * 0.15, height) : height + random(4, 40),
          vy: random(30, 90) * (0.6 + state.intensity * 0.2),
          vx: random(-16, 16),
          r: random(0.9, 2.6),
          phase: random(0, Math.PI * 2),
          life: random(2.2, 5.5),
          maxLife: 5.5,
          hot: Math.random() < 0.25,
        };
      }

      return {
        reset(state) {
          width = state.w;
          height = state.h;
          embers.length = 0;
          sparks.length = 0;
          smoke.length = 0;
          const budget = clamp(Math.round(state.intensity * 22), 10, 64);
          for (let index = 0; index < budget; index += 1) embers.push(makeEmber(state, true));
          for (let index = 0; index < 4; index += 1) {
            smoke.push({ x: width * 0.5 + random(-0.2, 0.2) * width, y: random(0.35, 1) * height, r: random(40, 110), rise: random(8, 22), alpha: random(0.02, 0.06) });
          }
        },

        step(state, dt) {
          width = state.w;
          height = state.h;
          for (let index = 0; index < embers.length; index += 1) {
            const ember = embers[index];
            ember.life -= dt;
            ember.y -= ember.vy * dt;
            ember.x += (ember.vx + Math.sin(state.clock * 2 + ember.phase) * 14) * dt;
            if (ember.life <= 0 || ember.y < -20) embers[index] = makeEmber(state, false);
          }

          if (sparks.length < 12 && Math.random() < dt * 3 * state.intensity) {
            sparks.push({
              x: width * 0.5 + random(-0.28, 0.28) * width,
              y: height - random(0, 30),
              vx: random(-60, 60),
              vy: random(-210, -90),
              life: random(0.4, 1.1),
              max: 1.1,
            });
          }
          for (let index = sparks.length - 1; index >= 0; index -= 1) {
            const spark = sparks[index];
            spark.life -= dt;
            if (spark.life <= 0) {
              sparks.splice(index, 1);
              continue;
            }
            spark.vy += 420 * dt;
            spark.x += spark.vx * dt;
            spark.y += spark.vy * dt;
          }

          for (const puff of smoke) {
            puff.y -= puff.rise * dt;
            puff.r += 12 * dt;
            if (puff.y + puff.r < 0) {
              puff.y = height + puff.r * 0.4;
              puff.r = random(40, 110);
              puff.x = width * 0.5 + random(-0.2, 0.2) * width;
            }
          }
        },

        draw(g, state) {
          const pulse = 0.82 + 0.12 * Math.sin(state.clock * 3.1) + 0.06 * Math.sin(state.clock * 7.7 + 1.3);
          const glow = g.createRadialGradient(width * 0.5, height + 40, 0, width * 0.5, height + 40, height * 0.78);
          glow.addColorStop(0, rgba(FIRE_RGB, 0.32 * pulse));
          glow.addColorStop(0.45, rgba(FIRE_RGB, 0.10 * pulse));
          glow.addColorStop(1, rgba(FIRE_RGB, 0));
          g.fillStyle = glow;
          g.fillRect(0, 0, width, height);

          g.globalCompositeOperation = "lighter";
          for (const ember of embers) {
            const life = clamp(ember.life / ember.maxLife, 0, 1);
            const flicker = 0.65 + 0.35 * Math.sin(state.clock * 9 + ember.phase);
            const size = ember.r * (ember.hot ? 9 : 7);
            g.globalAlpha = clamp(life * flicker, 0, 1) * 0.9;
            g.drawImage(ember.hot ? sprites.spark : sprites.ember, ember.x - size / 2, ember.y - size / 2, size, size);
          }
          for (const spark of sparks) {
            const fade = clamp(spark.life / spark.max, 0, 1);
            const size = 10 * fade + 3;
            g.globalAlpha = fade;
            g.drawImage(sprites.spark, spark.x - size / 2, spark.y - size / 2, size, size);
          }
          g.globalAlpha = 1;
          g.globalCompositeOperation = "source-over";

          for (const puff of smoke) {
            const gradient = g.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
            gradient.addColorStop(0, "rgba(120, 120, 128, " + puff.alpha.toFixed(3) + ")");
            gradient.addColorStop(1, "rgba(120, 120, 128, 0)");
            g.fillStyle = gradient;
            g.beginPath();
            g.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
            g.fill();
          }
        },
      };
    }

    // ------------------------------------------------------------------- engine

    function createWeatherEngine(doc, hooks) {
      const root = doc.createElement("div");
      root.id = ROOT_ID;
      root.setAttribute("aria-hidden", "true");

      const mist = doc.createElement("div");
      mist.className = "dshw-mist";
      const canvas = doc.createElement("canvas");
      const nightLayer = doc.createElement("div");
      nightLayer.className = "dshw-night";
      const flash = doc.createElement("div");
      flash.className = "dshw-flash";
      root.append(mist, canvas, nightLayer, flash);
      doc.body.appendChild(root);

      const g = canvas.getContext("2d", { alpha: true });
      const sprites = {
        beadLight: beadSprite([122, 152, 182]),
        beadDark: beadSprite([214, 234, 252]),
        flakeLight: glowSprite([236, 246, 255], 0.45),
        flakeDark: glowSprite([120, 150, 184], 0.45),
        ember: glowSprite([255, 160, 70], 0.35),
        spark: glowSprite([255, 238, 200], 0.3),
      };

      const state = {
        scene: "rain",
        intensity: 2,
        scheme: "light",
        night: false,
        w: 1,
        h: 1,
        dpr: 1,
        clock: 0,
      };

      const scenes = {
        rain: createRainScene(sprites),
        snow: createSnowScene(sprites),
        fire: createFireScene(sprites),
      };

      let current = null;
      let running = false;
      let frame = 0;
      let lastTime = 0;
      let flashTimer = 0;

      function paintMist() {
        let top;
        if (state.scene === "snow") {
          top = state.scheme === "dark" ? "rgba(150, 185, 220, 0.14)" : "rgba(226, 238, 250, 0.55)";
        } else if (state.scene === "fire") {
          top = state.scheme === "dark" ? "rgba(90, 70, 55, 0.12)" : "rgba(250, 226, 200, 0.30)";
        } else {
          top = state.scheme === "dark" ? "rgba(104, 152, 196, 0.14)" : "rgba(206, 228, 247, 0.35)";
        }
        root.style.setProperty("--dshw-mist-top", top);
        /* One soft glow from the top only: a bottom glow plus a mid-stop made a
           visible horizontal seam that read as standing water. */
        mist.style.background = "radial-gradient(150% 78% at 50% -20%, var(--dshw-mist-top), transparent 74%)";
      }

      function resize() {
        const width = Math.max(1, window.innerWidth || doc.documentElement.clientWidth || 1);
        const height = Math.max(1, window.innerHeight || doc.documentElement.clientHeight || 1);
        const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
        state.w = width;
        state.h = height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (current) current.reset(state);
      }

      function renderOnce() {
        if (!g || !current) return;
        g.clearRect(0, 0, state.w, state.h);
        current.draw(g, state);
      }

      function tick(now) {
        if (!running) return;
        const elapsed = lastTime === 0 ? 16 : Math.min(64, now - lastTime);
        lastTime = now;
        const dt = elapsed / 1000;
        state.dt = dt;
        state.clock += dt;
        if (current) {
          current.step(state, dt, state.clock);
          renderOnce();
        }
        frame = window.requestAnimationFrame(tick);
      }

      function start() {
        if (running || !current) return;
        if (prefersReducedMotion()) {
          renderOnce();
          return;
        }
        running = true;
        lastTime = 0;
        frame = window.requestAnimationFrame(tick);
        scheduleFlash();
      }

      function stop() {
        running = false;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        if (flashTimer) window.clearTimeout(flashTimer);
        flashTimer = 0;
        if (g) g.clearRect(0, 0, state.w, state.h);
      }

      function scheduleFlash() {
        if (flashTimer) window.clearTimeout(flashTimer);
        flashTimer = 0;
        if (!running || state.scene !== "rain" || !state.lightning || prefersReducedMotion()) return;
        flashTimer = window.setTimeout(() => {
          flashTimer = 0;
          if (!running || !state.lightning || state.scene !== "rain") return;
          flash.dataset.flashing = "true";
          hooks.thunder();
          window.setTimeout(() => {
            if (flash.dataset) delete flash.dataset.flashing;
          }, 1100);
          scheduleFlash();
        }, random(7000, 22000));
      }

      const onResize = () => {
        resize();
        if (!running) start();
      };
      window.addEventListener("resize", onResize);

      const onVisibility = () => {
        if (doc.hidden) {
          stop();
          return;
        }
        if (state.intensity > 0) start();
      };
      doc.addEventListener("visibilitychange", onVisibility);

      const motionQuery = typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
      const onMotionChange = () => {
        stop();
        start();
      };
      if (motionQuery && typeof motionQuery.addEventListener === "function") {
        motionQuery.addEventListener("change", onMotionChange);
      }

      resize();
      paintMist();

      return {
        setScene(scene) {
          const next = scene === "none" ? "none" : scene;
          const target = next === "none" ? null : scenes[next];
          /* Same scene again (a palette or night toggle calls this too): the
             particles are already rebuilt, so do not throw them away. */
          if (next === state.scene && target === current) return;
          state.scene = next;
          current = target;
          paintMist();
          if (!current) {
            stop();
            root.dataset.ready = "false";
            return;
          }
          current.reset(state);
          root.dataset.ready = "true";
        },
        setIntensity(intensity) {
          const next = clamp(intensity, 0, 3);
          const changed = next !== state.intensity;
          state.intensity = next;
          root.dataset.ready = next > 0 && current ? "true" : "false";
          if (!current) return;
          /* Unchanged intensity while the loop is already running: nothing to do. */
          if (!changed && running) return;
          /* Scenes that support retune grow or shrink in place; a full reset
             here used to throw every particle away on each intensity step. */
          if (typeof current.retune === "function") current.retune(state);
          else current.reset(state);
          stop();
          if (next > 0) start();
        },
        setScheme(scheme) {
          state.scheme = scheme;
          paintMist();
          if (!running) renderOnce();
        },
        setNight(on) {
          state.night = !!on;
          root.dataset.night = on ? "true" : "false";
          paintMist();
          scheduleFlash();
          if (!running) renderOnce();
        },
        setLightning(on) {
          state.lightning = !!on;
          scheduleFlash();
        },
        dispose() {
          stop();
          window.removeEventListener("resize", onResize);
          doc.removeEventListener("visibilitychange", onVisibility);
          if (motionQuery && typeof motionQuery.removeEventListener === "function") {
            motionQuery.removeEventListener("change", onMotionChange);
          }
          root.remove();
        },
      };
    }

    // --------------------------------------------------------------------- panel

    const ICONS = {
      rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 15.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17.4 8a3.8 3.8 0 0 1 .6 7.5"/><path d="M8 18.5 7 21M12 18.5 11 21M16 18.5 15 21"/></svg>',
      snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.4 5.3 12 7.4l2.6-2.1M9.4 18.7 12 16.6l2.6 2.1"/></svg>',
      fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3.5c.4 3 2.4 4.3 3.5 6.2 1 1.7.8 3.3-.2 4.3.6-1.9-.6-3.4-1.8-4.2.3 2.4-.9 3.6-2 4.6-1.1 1-1.6 2.1-1.2 3.4-1.4-.7-2.3-2-2.3-3.6 0-2.6 2-4 3-5.6.7-1.1 1-2.4 1-5.1Z"/><path d="M9.2 18.6c-1-1-1.4-2.3-1-3.6"/></svg>',
      none: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="7.5"/><path d="M7 17 17 7"/></svg>',
    };

    function createPanel(doc, controller) {
      const fab = doc.createElement("button");
      fab.id = FAB_ID;
      fab.type = "button";
      fab.setAttribute("aria-label", "檐下");
      fab.setAttribute("aria-expanded", "false");
      fab.innerHTML = ICONS.rain;

      const panel = doc.createElement("div");
      panel.id = PANEL_ID;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "檐下");
      panel.innerHTML = [
        '<div class="dshw-head"><span class="dshw-title">檐下</span>',
        '<button class="dshw-close" type="button" aria-label="关闭">×</button></div>',
        '<div class="dshw-row"><span class="dshw-label">场景</span>',
        '<span class="dshw-seg" data-group="scene"></span></div>',
        '<div class="dshw-row"><span class="dshw-label">强度</span>',
        '<span class="dshw-seg" data-group="intensity"></span></div>',
        '<div class="dshw-toggles">',
        '<button class="dshw-toggle" type="button" data-key="palette" aria-pressed="true">配色</button>',
        '<button class="dshw-toggle" type="button" data-key="lightning" aria-pressed="false">闪电</button>',
        '<button class="dshw-toggle" type="button" data-key="sound" aria-pressed="false">声音</button>',
        '<button class="dshw-toggle" type="button" data-key="night" aria-pressed="false">夜间</button>',
        "</div>",
        '<div class="dshw-foot"><span class="dshw-hint">v' + VERSION + '</span>',
        '<button class="dshw-reset" type="button">恢复默认</button></div>',
      ].join("");

      doc.body.append(fab, panel);

      const groups = {
        scene: panel.querySelector('[data-group="scene"]'),
        intensity: panel.querySelector('[data-group="intensity"]'),
      };
      const sceneLabels = { rain: "雨", snow: "雪", fire: "火", none: "关" };
      const intensityLabels = { 1: "轻", 2: "中", 3: "暴" };

      for (const key of SCENES) {
        const button = doc.createElement("button");
        button.type = "button";
        button.textContent = sceneLabels[key];
        button.dataset.value = key;
        button.addEventListener("click", () => controller.setScene(key));
        groups.scene.append(button);
      }
      for (const level of [1, 2, 3]) {
        const button = doc.createElement("button");
        button.type = "button";
        button.textContent = intensityLabels[level];
        button.dataset.value = String(level);
        button.addEventListener("click", () => controller.setIntensity(level));
        groups.intensity.append(button);
      }

      panel.querySelectorAll("[data-key]").forEach((button) => {
        button.addEventListener("click", () => controller.toggle(button.dataset.key));
      });
      panel.querySelector(".dshw-close").addEventListener("click", () => setOpen(false));
      panel.querySelector(".dshw-reset").addEventListener("click", () => controller.reset());

      let open = false;
      function setOpen(next) {
        open = next;
        panel.dataset.open = next ? "true" : "false";
        fab.setAttribute("aria-expanded", next ? "true" : "false");
      }
      fab.addEventListener("click", (event) => {
        event.stopPropagation();
        setOpen(!open);
      });
      const onDocumentClick = (event) => {
        if (!open) return;
        if (panel.contains(event.target) || fab.contains(event.target)) return;
        setOpen(false);
      };
      const onDocumentKey = (event) => {
        if (event.key === "Escape" && open) setOpen(false);
      };
      doc.addEventListener("click", onDocumentClick);
      doc.addEventListener("keydown", onDocumentKey);

      /** Fill indicator inside the panel: minutes worked, bar, and full state. */
      function render(settings) {
        fab.innerHTML = ICONS[settings.scene] || ICONS.rain;
        fab.title = "檐下 · " + (settings.scene === "none" ? "关" : sceneLabels[settings.scene])
          + " · v" + VERSION;
        groups.scene.querySelectorAll("button").forEach((button) => {
          button.classList.toggle("is-on", button.dataset.value === settings.scene);
        });
        groups.intensity.querySelectorAll("button").forEach((button) => {
          button.classList.toggle("is-on", Number(button.dataset.value) === settings.intensity);
          button.disabled = settings.scene === "none";
        });
        panel.querySelectorAll("[data-key]").forEach((button) => {
          const key = button.dataset.key;
          const on = key === "sound" || key === "lightning" || key === "night" || key === "palette"
            ? !!settings[key]
            : false;
          button.setAttribute("aria-pressed", on ? "true" : "false");
          if (key === "lightning" || key === "night") button.disabled = settings.scene === "none";
        });
      }

      return {
        render,
        dispose() {
          doc.removeEventListener("click", onDocumentClick);
          doc.removeEventListener("keydown", onDocumentKey);
          fab.remove();
          panel.remove();
        },
      };
    }

    // --------------------------------------------------------------------- apply

    function installStyle(doc) {
      const existing = doc.querySelector('style[data-plugin-css="' + STYLE_KEY + '"]');
      if (existing) return existing;
      const style = doc.createElement("style");
      style.dataset.plugin = PLUGIN;
      style.dataset.pluginCss = STYLE_KEY;
      style.textContent = STYLE_TEXT;
      doc.head.appendChild(style);
      return style;
    }

    /**
     * Mount the weather theme.
     * @param ctx the client cordis context; `ctx.theme` is required.
     */
    function apply(ctx) {
      if (typeof document === "undefined" || typeof window === "undefined") return;
      const doc = document;
      const settings = readSettings();
      const audio = createAudio();

      ctx.effect(() => {
        /* A reload can leave the previous mount behind (hot-swapped bundle, a
           duplicate entry, a crashed teardown). Stale roots would stack their
           veils, so every mount starts from a clean slate. */
        for (const id of [ROOT_ID, FAB_ID, PANEL_ID]) {
          for (const stale of doc.querySelectorAll("#" + id)) stale.remove();
        }
        const style = installStyle(doc);
        const engine = createWeatherEngine(doc, { thunder: () => audio.thunder() });
        const listeners = new Set();
        let paletteDispose = null;
        let paletteKey = null;
        let mounted = true;

        const readScheme = () => {
          try {
            return ctx.theme.getTheme().active.colorScheme;
          } catch (error) {
            return "light";
          }
        };

        /** The palette night mode forces is dark, so the overlay must follow it. */
        const effectiveScheme = () => (settings.night && settings.scene !== "none" ? "dark" : readScheme());

        /* ----- night mode: force the dark palette, then tint it stormy ----- */

        const assertDark = () => {
          if (!settings.night || settings.scene === "none") return;
          if (!doc.body.hasAttribute("data-ds-dark-theme")) doc.body.setAttribute("data-ds-dark-theme", "");
          doc.documentElement.style.colorScheme = "dark";
        };
        const nightObserver = new MutationObserver(() => assertDark());
        const startNightGuard = () => {
          nightObserver.observe(doc.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
        };
        const stopNightGuard = () => nightObserver.disconnect();

        const applyPalette = () => {
          /* Disabled: drop the layer once, then clear the memo so re-enabling
             always re-applies even if every token is unchanged. */
          if (settings.scene === "none" || !settings.palette) {
            if (paletteDispose) {
              paletteDispose();
              paletteDispose = null;
            }
            paletteKey = null;
            return;
          }
          const base = settings.night ? NIGHT_TOKENS : TOKENS;
          const extra = SCENE_TOKENS[settings.scene] || SCENE_TOKENS.rain;
          const layer = { ...base, ...(settings.night ? nightify(extra) : extra) };
          /* Pass both arms of every pair: overrideTokens composes them against
             the active theme's own color scheme, so following a light/dark
             switch needs no DOM observation. Flattening to the document
             attribute used to make this layer fight the theme presenter —
             which re-applies the preference attribute on every publish — and
             that feedback loop froze the renderer before boot could finish.
             The memo below also makes repeated calls a no-op. */
          const key = (settings.night ? "night" : "day") + "|" + settings.scene + "|" + JSON.stringify(layer);
          if (paletteKey === key) return;
          if (paletteDispose) {
            paletteDispose();
            paletteDispose = null;
          }
          paletteKey = key;
          paletteDispose = ctx.theme.overrideTokens(PLUGIN, layer);
        };

        const applyNight = () => {
          const on = settings.night && settings.scene !== "none";
          engine.setNight(on);
          if (on) {
            startNightGuard();
            assertDark();
          } else {
            stopNightGuard();
            const scheme = readScheme();
            if (scheme === "dark") doc.body.setAttribute("data-ds-dark-theme", "");
            else doc.body.removeAttribute("data-ds-dark-theme");
            doc.documentElement.style.colorScheme = scheme;
          }
          engine.setScheme(effectiveScheme());
        };

        const notify = () => {
          const snapshot = { ...settings };
          for (const listener of listeners) listener(snapshot);
        };

        /** Autoplay is refused until the page has seen a user gesture. */
        const hasActivation = () => {
          const activation = navigator.userActivation;
          return !activation || activation.hasBeenActive;
        };

        /* Audio restarts are expensive (the whole noise graph is rebuilt and
           ramped back in), so only replay when one of its inputs changed. */
        let audioKey = null;

        const applyAll = () => {
          /* applyNight owns the engine's scheme; calling setScheme here too only
             repainted the mist twice. */
          applyNight();
          applyPalette();
          /* setIntensity owns reset + start/stop, so setScene must not restart. */
          engine.setScene(settings.scene);
          engine.setIntensity(settings.scene === "none" ? 0 : settings.intensity);
          engine.setLightning(settings.lightning);
          const nextAudio = settings.sound && settings.scene !== "none"
            ? settings.scene + "|" + settings.intensity
            : "";
          if (nextAudio !== audioKey) {
            audioKey = nextAudio;
            if (nextAudio === "") audio.mute();
            else if (hasActivation()) audio.play(settings.scene, settings.intensity);
          }
          writeSettings(settings);
          notify();
        };

        const onThemeChange = () => {
          if (!mounted) return;
          engine.setScheme(effectiveScheme());
          assertDark();
          /* The token layer carries both arms and the theme service composes it
             against its own active scheme, so a scheme switch needs no re-apply
             here — and must not re-enter applyPalette while it is publishing. */
        };
        ctx.on("theme/change", onThemeChange);

        const controller = {
          version: VERSION,
          get settings() {
            return { ...settings };
          },
          /** True once the ambience <audio> element exists. */
          get audioReady() {
            return audio.ready;
          },
          /** "running" once the ambience element is actually playing. */
          get audioState() {
            return audio.state;
          },
          tokens: TOKENS,
          subscribe(listener) {
            listeners.add(listener);
            listener({ ...settings });
            return () => listeners.delete(listener);
          },
          setScene(scene) {
            if (!SCENES.includes(scene)) return;
            settings.scene = scene;
            applyAll();
          },
          setIntensity(intensity) {
            settings.intensity = clamp(Number(intensity) || 2, 1, 3);
            if (settings.scene === "none") settings.scene = "rain";
            applyAll();
          },
          setLightning(on) {
            settings.lightning = !!on;
            applyAll();
          },
          setSound(on) {
            settings.sound = !!on;
            applyAll();
          },
          setNight(on) {
            settings.night = !!on;
            applyAll();
          },
          /** Master switch for the rainy palette; the animation keeps running. */
          setPalette(on) {
            settings.palette = !!on;
            applyAll();
          },
          toggle(key) {
            if (key === "lightning") controller.setLightning(!settings.lightning);
            else if (key === "sound") controller.setSound(!settings.sound);
            else if (key === "night") controller.setNight(!settings.night);
            else if (key === "palette") controller.setPalette(!settings.palette);
          },
          reset() {
            Object.assign(settings, DEFAULTS);
            applyAll();
          },
        };

        const panel = createPanel(doc, controller);
        controller.subscribe((snapshot) => panel.render(snapshot));

        /* Sound restored from settings cannot auto-play: unlock on first gesture. */
        const unlock = () => {
          audio.resume();
          if (settings.sound) audio.play(settings.scene, settings.intensity);
          doc.removeEventListener("pointerdown", unlock, true);
          doc.removeEventListener("keydown", unlock, true);
        };
        doc.addEventListener("pointerdown", unlock, true);
        doc.addEventListener("keydown", unlock, true);

        applyAll();
        window.__dshWeather = controller;
        window.__dshRain = controller;

        return () => {
          mounted = false;
          stopNightGuard();
          /* Hand the palette back exactly as the appearance preference had it. */
          const scheme = readScheme();
          if (scheme === "dark") doc.body.setAttribute("data-ds-dark-theme", "");
          else doc.body.removeAttribute("data-ds-dark-theme");
          doc.documentElement.style.colorScheme = scheme;
          doc.removeEventListener("pointerdown", unlock, true);
          doc.removeEventListener("keydown", unlock, true);
          audio.mute();
          if (paletteDispose) paletteDispose();
          paletteDispose = null;
          panel.dispose();
          engine.dispose();
          if (style && style.parentNode) style.remove();
          try {
            delete window.__dshWeather;
            delete window.__dshRain;
          } catch (error) {
            window.__dshWeather = undefined;
            window.__dshRain = undefined;
          }
        };
      }, "dsh-theme-shelter: weather overlay, palette and panel");
    }

    exports.name = PLUGIN;
    exports.inject = ["theme"];
    exports.apply = apply;
    return module.exports;
  }
});
