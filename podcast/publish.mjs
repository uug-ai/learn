import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertSourceMatches, renderTranscript, sha256, validateEpisode, validateEpisodeId } from "./episode.mjs";

const defaultRoot = dirname(fileURLToPath(import.meta.url));

export async function publishEpisode(id, { root = defaultRoot } = {}) {
  validateEpisodeId(id);
  const episode = JSON.parse(await readFile(join(root, "episodes", `${id}.json`), "utf8"));
  validateEpisode(episode);
  if (episode.id !== id) throw new Error("The episode id does not match its filename.");
  assertSourceMatches(episode, await readFile(resolve(root, episode.sourcePath)));
  const output = join(root, "output", id);
  const manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
  if (manifest.id !== id || manifest.sample !== false ||
      manifest.scriptSha256 !== sha256(JSON.stringify(episode)) ||
      manifest.sourceSha256 !== episode.sourceSha256) {
    throw new Error("The generated episode is a sample or is stale. Regenerate the full reviewed episode before publishing.");
  }
  const audio = await readFile(join(output, "episode.mp3"));
  const transcript = await readFile(join(output, "transcript.txt"), "utf8");
  if (sha256(audio) !== manifest.audio.sha256 || audio.length !== manifest.audio.bytes) {
    throw new Error("The MP3 does not match its generated manifest.");
  }
  if (transcript !== renderTranscript(episode)) throw new Error("The generated transcript does not match the reviewed script.");
  if (!Number.isFinite(manifest.duration) || manifest.duration <= 0 ||
      manifest.chapters.length !== episode.chapters.length ||
      manifest.chapters.some((chapter, index, chapters) =>
        chapter.title !== episode.chapters[index].title ||
        !Number.isFinite(chapter.start) || chapter.start < 0 || chapter.start >= manifest.duration ||
        (index === 0 ? chapter.start !== 0 : chapter.start <= chapters[index - 1].start))) {
    throw new Error("The generated chapter timings are invalid.");
  }
  const assetPath = `podcasts/${id}`;
  const assets = resolve(root, "../app/static", assetPath);
  const data = resolve(root, "../app/data/podcasts");
  await mkdir(assets, { recursive: true });
  await mkdir(data, { recursive: true });
  await copyFile(join(output, "episode.mp3"), join(assets, "episode.mp3"));
  await copyFile(join(output, "transcript.txt"), join(assets, "transcript.txt"));
  const published = {
    id, title: episode.title, description: episode.description, duration: manifest.duration,
    reviewedOn: episode.reviewedOn, sourceUrl: episode.sourceUrl,
    sourceSha256: episode.sourceSha256, scriptSha256: manifest.scriptSha256, audioSha256: manifest.audio.sha256,
    audio: `${assetPath}/episode.mp3`, transcript: `${assetPath}/transcript.txt`,
    chapters: episode.chapters.map((chapter, index) => ({
      title: chapter.title, start: manifest.chapters[index].start, sourceAnchor: chapter.sourceAnchor,
      turns: chapter.turns.map((turn) => ({ speaker: episode.speakers[turn.speaker].name, text: turn.text })),
    })),
  };
  await writeFile(join(data, `${id}.json`), JSON.stringify(published, null, 2) + "\n");
  return assets;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1) throw new Error("Usage: node publish.mjs <episode-id>");
    const assets = await publishEpisode(args[0]);
    console.log(`Published site assets: ${assets}`);
    console.log(`Enable the article control with front matter: podcast: ${args[0]}`);
  } catch (error) {
    console.error(`Podcast publication failed: ${error.message}`);
    process.exitCode = 1;
  }
}
