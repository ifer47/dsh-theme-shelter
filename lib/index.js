/**
 * dsh-theme-shelter — host half.
 *
 * The browser half owns the palette and the canvas, but it cannot read files
 * from disk, so this half serves them on one small read-only route: the three
 * ambience recordings in `audio/`, the baked-in wallpapers in `wallpapers/`,
 * and whatever images the user drops into `~/.dsh/wallpapers`. The last group
 * is also listed, so the panel can offer those files next to the built-ins
 * without any configuration step. Everything else stays in the client.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const name = "theme-shelter";

/** The route needs the HTTP server; without one the theme still runs silently. */
export const inject = ["webServer"];

const ROUTE = "/dsh-theme-shelter";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = path.join(ROOT, "audio");
const WALLPAPER_DIR = path.join(ROOT, "wallpapers");
/** Dropped here, images show up in the panel with no configuration at all. */
const DSH_HOME = process.env.DSH_HOME && process.env.DSH_HOME.trim()
  ? path.resolve(process.env.DSH_HOME.trim())
  : path.join(os.homedir(), ".dsh");
const USER_WALLPAPER_DIR = path.join(DSH_HOME, "wallpapers");

const AUDIO_FILES = new Set(["rain.mp3", "fire.mp3", "thunder.mp3"]);
/**
 * Bundled wallpapers are slugs: `name.webp` and `name-thumb.webp` live in
 * `wallpapers/`. A name that matches the pattern but has no file is a 404, so
 * the route can grow a new wallpaper without a second hand-kept whitelist.
 */
const WALLPAPER_NAME = /^[a-z0-9][a-z0-9-]{0,60}\.webp$/;

const IMAGE_TYPES = new Map([
  [".webp", "image/webp"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".avif", "image/avif"],
  [".gif", "image/gif"],
]);

/** A listing never needs to offer more than this many files. */
const USER_WALLPAPER_LIMIT = 60;

/** Decoded bodies are a few MB at most; keep them hot instead of re-reading. */
const cache = new Map();

/**
 * Parse one `Range: bytes=...` header against the body size.
 * @param header the raw header value.
 * @param size body length in bytes.
 * @returns the inclusive byte window, or null when the header is absent or unusable.
 */
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;
  let start;
  let end;
  if (rawStart === "") {
    /* Suffix form: the last N bytes. */
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= size) return null;
  return { start, end };
}

/**
 * Write one body back, honouring a byte range. Media elements ask for ranges
 * when they loop or seek, and browsers may re-request a large image in pieces.
 * @param request the Fetch request the server hands a `resource` route.
 * @param bytes the whole file.
 * @param type the content type to declare.
 * @param cacheControl the caching policy for this body.
 * @returns the response for that request.
 */
function send(request, bytes, type, cacheControl) {
  const size = bytes.length;
  const headers = {
    "content-type": type,
    "accept-ranges": "bytes",
    "cache-control": cacheControl,
    /* user-supplied images must never be interpreted as anything but images */
    "x-content-type-options": "nosniff",
  };
  const range = parseRange(request.headers.get("range"), size);
  if (!range) {
    return new Response(bytes, { status: 200, headers: { ...headers, "content-length": String(size) } });
  }
  const chunk = bytes.subarray(range.start, range.end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      ...headers,
      "content-length": String(chunk.length),
      "content-range": `bytes ${range.start}-${range.end}/${size}`,
    },
  });
}

/**
 * Answer one audio request.
 * @param request the incoming request.
 * @param name the requested file name.
 * @returns the response for that request.
 */
async function serveAudio(request, name) {
  if (!AUDIO_FILES.has(name)) return new Response(null, { status: 404 });
  let bytes = cache.get(name);
  if (!bytes) {
    bytes = await readFile(path.join(AUDIO_DIR, name));
    cache.set(name, bytes);
  }
  /* Replayed on every scene change and seek, so it never needs revalidating. */
  return send(request, bytes, "audio/mpeg", "public, max-age=31536000, immutable");
}

/**
 * Answer one bundled wallpaper request.
 * @param request the incoming request.
 * @param name the requested file name.
 * @returns the response for that request.
 */
async function serveBuiltinWallpaper(request, name) {
  if (!WALLPAPER_NAME.test(name)) return new Response(null, { status: 404 });
  const file = path.resolve(WALLPAPER_DIR, name);
  if (!file.startsWith(path.resolve(WALLPAPER_DIR) + path.sep)) {
    return new Response(null, { status: 404 });
  }
  let bytes = cache.get("wallpaper:" + name);
  if (!bytes) {
    try {
      bytes = await readFile(file);
    } catch (error) {
      return new Response(null, { status: 404 });
    }
    cache.set("wallpaper:" + name, bytes);
  }
  const type = IMAGE_TYPES.get(path.extname(name).toLowerCase()) || "application/octet-stream";
  return send(request, bytes, type, "public, max-age=31536000, immutable");
}

/**
 * A name is servable from the user folder only when it is one plain segment
 * with an image extension. The listing below uses the same rule, so the panel
 * can never ask for something the listing would not have offered.
 * @param name a candidate file name.
 * @returns the lower-cased extension, or null when the name is not an image.
 */
function imageExtension(name) {
  if (!name || name.startsWith(".") || name.length > 180) return null;
  if (name !== path.basename(name) || /[\\/:*?"<>|\u0000-\u001f]/.test(name)) return null;
  const extension = path.extname(name).toLowerCase();
  return IMAGE_TYPES.has(extension) ? extension : null;
}

/**
 * Answer one user-folder wallpaper request.
 * @param request the incoming request.
 * @param name the requested file name.
 * @returns the response for that request.
 */
async function serveUserWallpaper(request, name) {
  const extension = imageExtension(name);
  if (!extension) return new Response(null, { status: 404 });
  const file = path.resolve(USER_WALLPAPER_DIR, name);
  if (!file.startsWith(path.resolve(USER_WALLPAPER_DIR) + path.sep)) {
    return new Response(null, { status: 404 });
  }
  let stats;
  try {
    stats = await stat(file);
  } catch (error) {
    return new Response(null, { status: 404 });
  }
  if (!stats.isFile()) return new Response(null, { status: 404 });
  const bytes = await readFile(file);
  /* No long cache: replacing the file in the folder should show up on reload. */
  return send(request, bytes, IMAGE_TYPES.get(extension), "no-cache");
}

/**
 * List the images in the user's wallpaper folder. A missing folder is simply
 * an empty list — the panel then offers the built-ins and the file picker.
 * @returns the listing as JSON.
 */
async function listUserWallpapers() {
  let names = [];
  try {
    const entries = await readdir(USER_WALLPAPER_DIR, { withFileTypes: true });
    names = entries
      .filter((entry) => entry.isFile() && imageExtension(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
      .slice(0, USER_WALLPAPER_LIMIT);
  } catch (error) {
    /* absent or unreadable: nothing to offer */
  }
  return new Response(JSON.stringify({ user: names }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * Answer one request on the plugin's route.
 * @param request the Fetch request the server hands a `resource` route.
 * @param origin the server's own origin, used for a cheap same-origin check.
 * @returns the response for that request.
 */
async function serve(request, origin) {
  const requested = request.headers.get("origin");
  if (requested !== null && requested !== origin) {
    return new Response(null, { status: 403 });
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname);
  } catch (error) {
    return new Response(null, { status: 400 });
  }
  if (!pathname.startsWith(ROUTE + "/")) return new Response(null, { status: 404 });
  const rest = pathname.slice(ROUTE.length + 1);

  if (rest.startsWith("audio/")) return serveAudio(request, rest.slice("audio/".length));
  if (rest === "wallpapers/list.json") return listUserWallpapers();
  if (rest.startsWith("wallpapers/u/")) {
    return serveUserWallpaper(request, rest.slice("wallpapers/u/".length));
  }
  if (rest.startsWith("wallpapers/")) return serveBuiltinWallpaper(request, rest.slice("wallpapers/".length));
  return new Response(null, { status: 404 });
}

/** Register the read-only media route for as long as the plugin runs. */
export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({ kind: "prefix", path: ROUTE, resource: serve }),
    "dsh-theme-shelter: media route",
  );
}
