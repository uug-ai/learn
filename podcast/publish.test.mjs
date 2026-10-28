import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { renderTranscript, sha256 } from "./episode.mjs";
import { publishEpisode } from "./publish.mjs";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "learn-podcast-publication-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "podcast");
  const episode = JSON.parse(await readFile(new URL("./episodes/organisations-v2.json", import.meta.url), "utf8"));
  episode.id = "publication-test";
  episode.sourcePath = "../app/content/example.md";
  const source = "# Example\n";
  episode.sourceSha256 = sha256(source);
  const output = join(root, "output", episode.id);
  await mkdir(join(root, "episodes"), { recursive: true });
  await mkdir(join(directory, "app/content"), { recursive: true });
  await mkdir(output, { recursive: true });
  const audio = Buffer.from("fixture audio bytes");
  const manifest = {
    id: episode.id, sample: false, duration: 600,
    sourceSha256: episode.sourceSha256, scriptSha256: sha256(JSON.stringify(episode)),
    audio: { sha256: sha256(audio), bytes: audio.length },
    chapters: episode.chapters.map((chapter, index) => ({ title: chapter.title, start: index * 60 })),
  };
  await writeFile(join(directory, "app/content/example.md"), source);
  await writeFile(join(output, "episode.mp3"), audio);
  await writeFile(join(output, "transcript.txt"), renderTranscript(episode));
  const save = async () => {
    await writeFile(join(root, "episodes", `${episode.id}.json`), JSON.stringify(episode));
    await writeFile(join(output, "manifest.json"), JSON.stringify(manifest));
  };
  await save();
  return { root, directory, episode, manifest, output, audio, save };
}

test("publishes only checked audio, transcript, and page-ready chapter data", async (t) => {
  const { root, directory, episode, audio } = await fixture(t);
  const assets = await publishEpisode(episode.id, { root });
  assert.equal(assets, join(directory, "app/static/podcasts", episode.id));
  assert.deepEqual(await readFile(join(assets, "episode.mp3")), audio);
  assert.equal(await readFile(join(assets, "transcript.txt"), "utf8"), renderTranscript(episode));
  const data = JSON.parse(await readFile(join(directory, "app/data/podcasts", `${episode.id}.json`), "utf8"));
  assert.equal(data.audio, `podcasts/${episode.id}/episode.mp3`);
  assert.equal(data.chapters.length, 6);
  assert.equal(data.chapters[0].turns[0].speaker, "Host");
  assert.equal(data.chapters[0].turns[0].text, episode.chapters[0].turns[0].text);
  assert.equal(data.editorialStyle, undefined);
  assert.equal(data.audioSha256, sha256(audio));
});

for (const [name, mutate, message] of [
  ["drafts", async (f) => { f.episode.draft = true; await f.save(); }, /episode is a draft/],
  ["samples", async (f) => { f.manifest.sample = true; await f.save(); }, /sample or is stale/],
  ["stale scripts", async (f) => { f.episode.description = "Changed"; await f.save(); }, /sample or is stale/],
  ["stale sources", async (f) => { await writeFile(join(f.directory, "app/content/example.md"), "Changed"); }, /source guide changed/],
  ["corrupt audio", async (f) => { await writeFile(join(f.output, "episode.mp3"), "Corrupt"); }, /MP3 does not match/],
  ["mismatched transcripts", async (f) => { await writeFile(join(f.output, "transcript.txt"), "Wrong script"); }, /transcript does not match/],
  ["invalid chapter timings", async (f) => { f.manifest.chapters[1].start = -1; await f.save(); }, /chapter timings are invalid/],
]) {
  test(`publication rejects ${name}`, async (t) => {
    const data = await fixture(t);
    await mutate(data);
    await assert.rejects(publishEpisode(data.episode.id, { root: data.root }), message);
    await assert.rejects(readFile(join(data.directory, "app/data/podcasts", `${data.episode.id}.json`)), { code: "ENOENT" });
  });
}
