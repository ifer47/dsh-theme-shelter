/**
 * dsh-theme-shelter — host half.
 *
 * The browser half owns the palette and the canvas, but it cannot read files
 * from disk, so this half serves the three ambience recordings it ships in
 * `audio/` on a small read-only route. Everything else stays in the client.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const name = "theme-shelter";

/** The route needs the HTTP server; without one the theme still runs silently. */
export const inject = ["webServer"];

const ROUTE = "/dsh-theme-shelter/audio";
const AUDIO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "audio");
const FILES = new Set(["rain.mp3", "fire.mp3", "thunder.mp3"]);

/** Decoded bodies are a few MB each; keep them hot instead of re-reading per request. */
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
 * Answer one audio request. Media elements ask for ranges when they loop or
 * seek, so 206 support is what keeps replay from re-downloading the file.
 * @param request the Fetch request the server hands a `resource` route.
 * @param origin the server's own origin, used for a cheap same-origin check.
 * @returns the response for that request.
 */
async function serve(request, origin) {
  const requested = request.headers.get("origin");
  if (requested !== null && requested !== origin) {
    return new Response(null, { status: 403 });
  }
  const name = new URL(request.url).pathname.slice(ROUTE.length + 1);
  if (!FILES.has(name)) return new Response(null, { status: 404 });

  let bytes = cache.get(name);
  if (!bytes) {
    bytes = await readFile(path.join(AUDIO_DIR, name));
    cache.set(name, bytes);
  }

  const size = bytes.length;
  const headers = {
    "content-type": "audio/mpeg",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
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

/** Register the read-only audio route for as long as the plugin runs. */
export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({ kind: "prefix", path: ROUTE, resource: serve }),
    "dsh-theme-shelter: audio route",
  );
}
