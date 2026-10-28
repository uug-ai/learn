import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const playerScript = readFileSync(new URL("../app/assets/js/podcast.js", import.meta.url), "utf8");

export const SAMPLE_RATE = 24_000;
export const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const DTYPE = "q8";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string.`);
  }
}

export function validateEpisodeId(id) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error("id must start with a lowercase letter or digit and contain only lowercase letters, digits, and hyphens.");
  }
}

export function parseGenerateArgs(args) {
  const { values, positionals } = parseArgs({
    args, options: { sample: { type: "boolean", default: false } }, allowPositionals: true,
  });
  if (positionals.length > 1) throw new Error("Usage: node generate.mjs [episode-id] [--sample]");
  const id = positionals[0] ?? "organisations";
  validateEpisodeId(id);
  return { id, sample: values.sample };
}

export function validateEpisode(episode) {
  if (episode.format !== "learn-dialogue-v1") throw new Error("format must be learn-dialogue-v1.");
  if (episode.draft !== false) {
    throw new Error("This episode is a draft. Complete the source-backed dialogue and review before setting draft: false.");
  }
  if (/\{\{[A-Z_]+\}\}/.test(JSON.stringify(episode))) {
    throw new Error("Replace all {{...}} editorial placeholders before generating.");
  }
  for (const field of ["id", "title", "description", "sourcePath", "sourceUrl", "reviewedOn"]) {
    requireText(episode[field], field);
  }
  validateEpisodeId(episode.id);
  if (!/^https:\/\//.test(episode.sourceUrl) || !/^[a-f0-9]{64}$/.test(episode.sourceSha256)) {
    throw new Error("A HTTPS source URL and SHA-256 source checksum are required.");
  }
  if (!episode.speakers || Object.keys(episode.speakers).sort().join(",") !== "guide,host") {
    throw new Error("The dialogue format requires exactly two speakers: host and guide.");
  }
  for (const [id, speaker] of Object.entries(episode.speakers)) {
    requireText(speaker.name, `speakers.${id}.name`);
    requireText(speaker.voice, `speakers.${id}.voice`);
    if (!Number.isFinite(speaker.speed) || speaker.speed < 0.5 || speaker.speed > 2) {
      throw new Error(`speakers.${id}.speed must be between 0.5 and 2.`);
    }
  }
  if (!Array.isArray(episode.chapters) || !episode.chapters.length) {
    throw new Error("At least one chapter is required.");
  }
  for (const chapter of episode.chapters) {
    requireText(chapter.title, "chapter.title");
    requireText(chapter.sourceAnchor, "chapter.sourceAnchor");
    if (!Array.isArray(chapter.turns) || !chapter.turns.length) {
      throw new Error(`Chapter "${chapter.title}" needs at least one turn.`);
    }
    for (const turn of chapter.turns) {
      if (!Object.hasOwn(episode.speakers, turn.speaker)) {
        throw new Error(`Unknown speaker: ${turn.speaker}`);
      }
      requireText(turn.text, "turn.text");
    }
    if (!chapter.turns.some((turn) => turn.speaker === "host") || !chapter.turns.some((turn) => turn.speaker === "guide")) {
      throw new Error(`Chapter "${chapter.title}" must include both host and guide to remain conversational.`);
    }
  }
}

export function assertSourceMatches(episode, source) {
  if (sha256(source) !== episode.sourceSha256) {
    throw new Error("The source guide changed. Review the script against the guide, then update sourceSha256.");
  }
}

export function turnCacheKey(turn, speaker) {
  return sha256(JSON.stringify({ text: turn.text, ...speaker, model: MODEL, dtype: DTYPE }));
}

export function assertAudio(samples) {
  if (!samples.length || !samples.every(Number.isFinite) || !samples.some((value) => Math.abs(value) > 0.001)) {
    throw new Error("Generated audio is empty, silent, or contains invalid samples.");
  }
}

export async function* synthesizeSpeech(tts, splitter, text, options) {
  splitter.push(text);
  splitter.close();
  yield* tts.stream(splitter, options);
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function timestamp(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function renderTranscript(episode) {
  return [
    episode.title,
    `Source: ${episode.sourceUrl}`,
    `Script reviewed against source: ${episode.reviewedOn}`,
    "Local pilot. Synthetic voices. Adapted explanation, not a verbatim reading.",
    ...episode.chapters.flatMap((chapter) => [
      `\n## ${chapter.title}`,
      ...chapter.turns.map((turn) => `\n${episode.speakers[turn.speaker].name}: ${turn.text}`),
    ]),
    "",
  ].join("\n");
}

export function renderPreview(episode, chapters, duration, sample) {
  const html = escapeHtml;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${html(episode.title)} | Learn podcast pilot</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #101725; color: #e7edf7; }
    body { max-width: 860px; margin: auto; padding: 48px 24px; line-height: 1.7; }
    h1 { font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.15; letter-spacing: -.04em; }
    h2 { margin-top: 2rem; line-height: 1.3; }
    a { color: #9dc7ff; } a:hover { color: white; }
    .eyebrow { color: #a7b7cc; text-transform: uppercase; letter-spacing: .15em; font-size: .8rem; }
    .player { background: #1b2639; border: 1px solid #35445c; border-radius: 20px; padding: 24px; margin: 28px 0; }
    audio { width: 100%; margin-top: 12px; }
    .links { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 12px; }
    .chapters { display: grid; gap: 8px; padding: 0; list-style: none; }
    button { font: inherit; text-align: left; width: 100%; padding: 12px 16px; border: 1px solid #35445c;
      border-radius: 10px; background: #1b2639; color: inherit; cursor: pointer; }
    button:hover, button[aria-current="true"] { background: #263650; }
    button[aria-current="true"] { border-color: #9dc7ff; }
    button:focus-visible, a:focus-visible, select:focus-visible { outline: 3px solid #9dc7ff; outline-offset: 3px; }
    .transport { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 16px; }
    .transport button { width: auto; } select { font: inherit; background: #1b2639; color: inherit; padding: 8px; border-radius: 6px; }
    .chapter-row { display: flex; align-items: center; gap: 12px; } .chapter-row button { flex: 1; width: auto; }
    .chapter-row a { font-size: .85rem; } section:target { outline: 1px solid #9dc7ff; outline-offset: 12px; }
    time { color: #9dc7ff; margin-right: 12px; font-variant-numeric: tabular-nums; }
    .note { color: #a7b7cc; font-size: .9rem; } details { margin-top: 32px; } summary { cursor: pointer; }
    .speaker { color: #9dc7ff; font-weight: 650; } .source { font-size: .85rem; }
  </style>
</head>
<body data-podcast-player>
  <p class="eyebrow">UUG.AI Learn / local podcast pilot${sample ? " / short sample" : ""}</p>
  <h1>${html(episode.title)}</h1>
  <p>${html(episode.description)}</p>
  <p class="note">Two synthetic hosts &middot; ${timestamp(duration)} &middot; English &middot; Script reviewed ${html(episode.reviewedOn)}</p>
  <div class="player">
    <strong>Listen to the ${sample ? "voice sample" : "episode"}</strong>
    <audio id="audio" controls preload="metadata" aria-label="${html(episode.title)}">
      <source src="episode.mp3" type="audio/mpeg">
      Your browser does not support audio playback. <a href="episode.mp3">Download the MP3</a>.
    </audio>
    <div class="transport">
      <button type="button" data-skip="-15" aria-label="Skip back 15 seconds">Back 15s</button>
      <button type="button" data-skip="15" aria-label="Skip forward 15 seconds">Forward 15s</button>
      <label for="speed">Playback speed</label>
      <select id="speed" data-podcast-speed>
        <option value="0.75">0.75x</option><option value="1" selected>1x</option>
        <option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
      </select>
    </div>
    <div class="links"><a href="episode.mp3" download>Download MP3</a><a href="transcript.txt" download>Download transcript</a>
      <a href="${html(episode.sourceUrl)}" target="_blank" rel="noopener noreferrer">Read the source guide</a></div>
  </div>
  <h2>Chapters</h2>
  <ol class="chapters">${chapters.map((chapter, index) => `
    <li class="chapter-row"><button type="button" data-start="${chapter.start}"><time>${timestamp(chapter.start)}</time>${html(chapter.title)}</button>
      <a href="#transcript-chapter-${index}" data-transcript aria-label="Read transcript: ${html(chapter.title)}">Transcript</a></li>`).join("")}
  </ol>
  <p id="playback-status" data-podcast-status role="status"></p>
  <details id="transcript" data-podcast-transcript>
    <summary>Read the full transcript</summary>
    ${episode.chapters.map((chapter, index) => `
      <section id="transcript-chapter-${index}"><h2>${html(chapter.title)}</h2>
      <a class="source" href="${html(episode.sourceUrl)}#${html(chapter.sourceAnchor)}">Source section</a>
      ${chapter.turns.map((turn) => `<p><span class="speaker">${html(episode.speakers[turn.speaker].name)}:</span> ${html(turn.text)}</p>`).join("\n")}
      </section>`).join("")}
  </details>
  <p class="note">Review copy only. Not added to the documentation site. This is an adapted explanation,
    not a replacement for the guide. Review pronunciation, pacing, and technical accuracy before publishing.</p>
  <script>
    ${playerScript}
  </script>
</body>
</html>
`;
}
