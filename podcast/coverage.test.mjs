import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { sha256, validateEpisode } from "./episode.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const app = resolve(root, "../app");
const content = join(app, "content");
const hub = join(content, "docs/hub");

async function sourcePages(directory) {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...await sourcePages(path));
    else if (entry.name.endsWith(".md")) {
      const source = await readFile(path, "utf8");
      const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      assert.ok(frontMatter, `Missing front matter: ${path}`);
      pages.push({
        path, source, metadata: frontMatter[1],
        body: source.slice(frontMatter[0].length).trim(),
      });
    }
  }
  return pages;
}

const pages = await sourcePages(content);
const eligible = pages.filter((page) => {
  if (/^draft:\s*true\s*$/m.test(page.metadata)) return false;
  const body = page.body.replace(/<!--[\s\S]*?-->/g, "").replace(/<br\s*\/?>/gi, "").trim();
  if (!body || /^To be written\.?$/i.test(body)) return false;
  const path = relative(content, page.path);
  if (path.startsWith("docs/")) return true;
  if (!path.endsWith("_index.md")) return true;
  return path === "support/_index.md" || (path.startsWith("guides/") && /^#{2,6} /m.test(body));
});

test("every published Learn article has its own reviewed podcast", async () => {
  assert.ok(eligible.length >= 104, `Unexpectedly incomplete Learn inventory: ${eligible.length}`);
  for (const section of ["docs", "guides", "tutorials", "knowledge-base", "blog", "release-notes", "support"]) {
    assert.ok(eligible.some((page) => relative(content, page.path).startsWith(`${section}/`)),
      `Missing article section: ${section}`);
  }
  const ids = new Set();
  for (const page of eligible) {
    const id = page.metadata.match(/^podcast:\s*([a-z0-9-]+)\s*$/m)?.[1];
    assert.ok(id, `Missing podcast: ${relative(content, page.path)}`);
    assert.ok(!ids.has(id), `Two articles share ${id}`);
    ids.add(id);
    const episode = JSON.parse(await readFile(join(root, "episodes", `${id}.json`), "utf8"));
    validateEpisode(episode);
    assert.equal(episode.id, id);
    assert.equal(resolve(root, episode.sourcePath), page.path);
    assert.equal(episode.sourceSha256, sha256(page.source), `${id}: review changed source before updating its checksum`);
    if (id !== "organisations-v2") {
      assert.equal(episode.speakers.host.voice, "af_heart");
      assert.equal(episode.speakers.guide.voice, "am_puck");
    }
  }
});

test("product overviews are included while drafts, placeholders and navigation pages remain without podcasts", () => {
  for (const product of ["agent", "factory", "vault", "hub"]) {
    assert.ok(eligible.some((page) => page.path === join(content, "docs", product, "_index.md")));
  }
  const excluded = pages.filter((page) => !eligible.includes(page));
  assert.ok(excluded.some((page) => page.path === join(hub, "workflows/anpr.md")));
  for (const path of ["_index.md", "tutorials/_index.md", "blog/_index.md",
    "release-notes/_index.md", "guides/code-style/go/rest/routing.md"]) {
    assert.ok(excluded.some((page) => page.path === join(content, path)), `Expected exclusion: ${path}`);
  }
  for (const page of excluded) assert.doesNotMatch(page.metadata, /^podcast:/m);
});

test("all enabled Learn podcasts publish matching metadata, audio and chapter times", async () => {
  for (const page of eligible) {
    const id = page.metadata.match(/^podcast:\s*([a-z0-9-]+)\s*$/m)?.[1];
    assert.ok(id, `Missing podcast: ${page.path}`);
    const episode = JSON.parse(await readFile(join(root, "episodes", `${id}.json`), "utf8"));
    const published = JSON.parse(await readFile(join(app, "data/podcasts", `${id}.json`), "utf8"));
    assert.deepEqual(Object.keys(published).sort(), [
      "id", "title", "description", "duration", "reviewedOn", "sourceUrl", "sourceSha256",
      "scriptSha256", "audioSha256", "audio", "chapters",
    ].sort(), `${id}: public metadata must not contain spoken turns or transcripts`);
    for (const field of ["id", "title", "description", "reviewedOn", "sourceUrl", "sourceSha256"]) {
      assert.equal(published[field], episode[field], `${id}: ${field}`);
    }
    assert.equal(published.scriptSha256, sha256(JSON.stringify(episode)), `${id}: stale script`);
    assert.equal(published.audio, `podcasts/${id}/episode.mp3`);
    assert.ok(Number.isFinite(published.duration) && published.duration > 0 && published.duration <= 300,
      `${id}: expected a real overview of at most five minutes`);
    assert.equal(published.chapters.length, episode.chapters.length);
    for (const [index, chapter] of published.chapters.entries()) {
      assert.deepEqual(Object.keys(chapter).sort(), ["sourceAnchor", "start", "title"]);
      assert.equal(chapter.title, episode.chapters[index].title);
      assert.equal(chapter.sourceAnchor, episode.chapters[index].sourceAnchor);
      assert.ok(Number.isFinite(chapter.start) && chapter.start >= 0 && chapter.start < published.duration);
      if (index === 0) assert.equal(chapter.start, 0);
      else assert.ok(chapter.start > published.chapters[index - 1].start);
    }
    const asset = join(app, "static", published.audio);
    const bytes = await readFile(asset);
    assert.ok(bytes.length > 1024, `${id}: empty audio`);
    assert.equal(sha256(bytes), published.audioSha256, `${id}: audio checksum mismatch`);
    const probe = JSON.parse(execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "json", asset,
    ], { encoding: "utf8" }));
    assert.ok(Math.abs(Number(probe.format.duration) - published.duration) < 0.1,
      `${id}: published duration differs from the MP3`);
    assert.deepEqual(await readdir(join(app, "static/podcasts", id)), ["episode.mp3"],
      `${id}: only audio belongs in public podcast assets`);
  }
});
