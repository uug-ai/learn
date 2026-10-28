import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  assertAudio, assertSourceMatches, renderPreview, renderTranscript, sha256,
  synthesizeSpeech, timestamp, turnCacheKey, validateEpisode,
} from "./episode.mjs";

const episode = JSON.parse(await readFile(new URL("./episodes/organisations.json", import.meta.url), "utf8"));
const source = await readFile(new URL(episode.sourcePath, import.meta.url));

test("the reviewed episode matches the current source guide", () => {
  validateEpisode(episode);
  assertSourceMatches(episode, source);
  assert.equal(episode.chapters.length, 6);
});

test("every completed episode has a matching filename and reviewed source", async (t) => {
  const directory = new URL("./episodes/", import.meta.url);
  for (const filename of await readdir(directory)) {
    if (!filename.endsWith(".json")) continue;
    const candidate = JSON.parse(await readFile(new URL(filename, directory), "utf8"));
    if (candidate.draft === true) {
      t.diagnostic(`Not ready for generation: ${filename}`);
      continue;
    }
    validateEpisode(candidate);
    assert.equal(filename, `${candidate.id}.json`);
    assertSourceMatches(candidate, await readFile(new URL(candidate.sourcePath, import.meta.url)));
  }
});

test("the published overview stays short, source-linked, and high-level", async () => {
  const overview = JSON.parse(await readFile(new URL("./episodes/organisations-v2.json", import.meta.url), "utf8"));
  const spoken = overview.chapters.flatMap((chapter) => chapter.turns).map((turn) => turn.text).join(" ");
  const words = spoken.split(/\s+/).length;
  assert.equal(overview.chapters.length, 4);
  assert.ok(words >= 450 && words <= 550, `Expected 450-550 spoken words, got ${words}`);
  assert.doesNotMatch(spoken, /sourceSha256|canonical-only|JWT|token|BSON|local pilot|listening review/i);
  assert.match(spoken, /without requiring a data migration/);
  assert.match(spoken, /Selection isn't permission/);
  assert.match(spoken, /shouldn't treat that design as a live access-management feature/);
  const guide = (await readFile(new URL(overview.sourcePath, import.meta.url))).toString();
  for (const chapter of overview.chapters) {
    const heading = chapter.sourceAnchor.replaceAll("-", " ");
    assert.ok(guide.toLowerCase().includes(`## ${heading}`), `Missing source heading: ${chapter.sourceAnchor}`);
  }
});

test("the organisations article and episode scripts omit the legacy product name", async () => {
  assert.doesNotMatch(source.toString(), /Kerberos Hub/i);
  for (const id of ["organisations", "organisations-v2"]) {
    const script = await readFile(new URL(`./episodes/${id}.json`, import.meta.url), "utf8");
    assert.doesNotMatch(script, /Kerberos Hub/i);
  }
});

test("source changes require an explicit script review", () => {
  assert.throws(() => assertSourceMatches(episode, Buffer.from("changed guide")), /source guide changed/);
});

test("rejects unknown speakers, empty speech, unsafe ids, and invalid speeds", () => {
  const invalidSpeaker = structuredClone(episode);
  invalidSpeaker.chapters[0].turns[0].speaker = "unknown";
  assert.throws(() => validateEpisode(invalidSpeaker), /Unknown speaker/);
  const empty = structuredClone(episode);
  empty.chapters[0].turns[0].text = " ";
  assert.throws(() => validateEpisode(empty), /non-empty/);
  assert.throws(() => validateEpisode({ ...episode, id: "../escape" }), /id must/);
  const speed = structuredClone(episode);
  speed.speakers.host.speed = null;
  assert.throws(() => validateEpisode(speed), /speed must/);
});

test("ready episodes require a reviewed two-host exchange in every chapter", () => {
  assert.throws(() => validateEpisode({ ...episode, draft: true }), /episode is a draft/);
  assert.throws(() => validateEpisode({ ...episode, format: "monologue" }), /format must/);
  const monologue = structuredClone(episode);
  monologue.chapters[0].turns = monologue.chapters[0].turns.filter((turn) => turn.speaker === "guide");
  assert.throws(() => validateEpisode(monologue), /both host and guide/);
  const incomplete = structuredClone(episode);
  incomplete.chapters[0].sourceAnchor = "{{SOURCE_ANCHOR}}";
  assert.throws(() => validateEpisode(incomplete), /editorial placeholders/);
});

test("cache keys change when the text, voice, or speed changes", () => {
  const turn = episode.chapters[0].turns[0];
  const speaker = episode.speakers.host;
  const key = turnCacheKey(turn, speaker);
  assert.equal(key, turnCacheKey(turn, speaker));
  assert.notEqual(key, turnCacheKey({ ...turn, text: "Different speech." }, speaker));
  assert.notEqual(key, turnCacheKey(turn, { ...speaker, voice: "af_bella" }));
  assert.notEqual(key, turnCacheKey(turn, { ...speaker, speed: 1.1 }));
});

test("rejects empty, silent, and non-finite speech", () => {
  for (const samples of [[], [0, 0], [NaN, 0.1], [Infinity, 0.1]]) {
    assert.throws(() => assertAudio(new Float32Array(samples)), /empty, silent/);
  }
  assertAudio(new Float32Array([0, 0.1, -0.2]));
});

test("closes the sentence stream so generation cannot wait forever", async () => {
  const { TextSplitterStream } = await import("kokoro-js");
  const speech = [];
  const tts = {
    async *stream(splitter, options) {
      assert.equal(options.voice, "af_heart");
      for await (const text of splitter) yield text;
    },
  };
  for await (const text of synthesizeSpeech(tts, new TextSplitterStream(), "First sentence. Last sentence.", {
    voice: "af_heart", speed: 1,
  })) speech.push(text);
  assert.equal(speech.join(" "), "First sentence. Last sentence.");
});

test("preview includes accessible playback, downloads, chapters, and escaped text", () => {
  const input = { ...episode, title: '<script>alert("x")</script>' };
  const html = renderPreview(input, [{ title: "Test <chapter>", start: 61.2 }], 120.5, false);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes(input.title));
  assert.ok(html.includes('controls preload="metadata"'));
  assert.ok(!html.includes("autoplay"));
  assert.ok(html.includes('data-start="61.2"'));
  assert.ok(html.includes("Test &lt;chapter&gt;"));
  assert.ok(html.includes('href="transcript.txt" download'));
  assert.ok(html.includes('href="episode.mp3" download'));
  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('aria-label="Skip back 15 seconds"'));
  assert.ok(html.includes('aria-label="Skip forward 15 seconds"'));
  assert.ok(html.includes('<label for="speed">Playback speed</label>'));
  assert.ok(html.includes('href="#transcript-chapter-0"'));
  assert.ok(html.includes('id="transcript-chapter-0"'));
  assert.ok(html.includes("button.setAttribute('aria-current', 'true')"));
  assert.ok(html.includes("Source section"));
  assert.equal(timestamp(61.2), "1:01");
});

test("the transcript contains every scripted turn exactly once", () => {
  const transcript = renderTranscript(episode);
  for (const chapter of episode.chapters) {
    for (const turn of chapter.turns) {
      assert.equal(transcript.split(turn.text).length - 1, 1);
    }
  }
  assert.ok(transcript.includes(episode.sourceUrl));
  assert.equal(sha256(source).length, 64);
});

test("editorial delivery guidance is not included in the spoken transcript or listener page", () => {
  const styled = { ...episode, editorialStyle: { humour: "PRIVATE_EDITORIAL_DIRECTION_NOT_SPOKEN" } };
  assert.ok(!renderTranscript(styled).includes(styled.editorialStyle.humour));
  assert.ok(!renderPreview(styled, [], 600, false).includes(styled.editorialStyle.humour));
});

test("shared controls run once per action regardless of chapter count", async () => {
  function element(dataset = {}) {
    return {
      dataset, listeners: new Map(), attributes: new Map(),
      addEventListener(type, callback) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(callback);
        this.listeners.set(type, listeners);
      },
      setAttribute(name, value) { this.attributes.set(name, value); },
      removeAttribute(name) { this.attributes.delete(name); },
    };
  }
  const chapters = [0, 60, 120].map((start) => element({ start: String(start) }));
  const audio = Object.assign(element(), {
    currentTime: 100, duration: 600, paused: true, playbackRate: 1, readyState: 1,
    async play() { this.paused = false; },
  });
  const speed = element();
  const back = element({ skip: "-15" });
  const forward = element({ skip: "15" });
  const links = chapters.map(() => element());
  const transcript = { open: false };
  const status = { textContent: "" };
  const root = element();
  root.querySelector = (selector) => ({
    audio, "[data-podcast-speed]": speed, "[data-podcast-transcript]": transcript,
    "[data-podcast-status]": status,
  })[selector];
  root.querySelectorAll = (selector) => ({
    "[data-start]": chapters, "[data-skip]": [back, forward], "[data-transcript]": links,
    "audio source": [],
  })[selector];
  const html = renderPreview(episode, chapters.map((chapter, index) => ({
    title: `Chapter ${index}`, start: Number(chapter.dataset.start),
  })), 600, false);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  runInNewContext(script, {
    document: {
      querySelectorAll: (selector) => ({
        "[data-podcast-player]": [root], "[data-podcast-toggle]": [],
      })[selector],
    },
  });
  for (const control of [speed, back, forward, ...links]) {
    assert.equal([...control.listeners.values()][0].length, 1);
  }
  forward.listeners.get("click")[0]();
  assert.equal(audio.currentTime, 115);
  back.listeners.get("click")[0]();
  assert.equal(audio.currentTime, 100);
  audio.currentTime = 5;
  back.listeners.get("click")[0]();
  assert.equal(audio.currentTime, 0);
  audio.currentTime = 595;
  forward.listeners.get("click")[0]();
  assert.equal(audio.currentTime, 600);
  speed.value = "1.5";
  speed.listeners.get("change")[0]();
  assert.equal(audio.playbackRate, 1.5);
  links[1].listeners.get("click")[0]();
  assert.equal(transcript.open, true);
  await chapters[2].listeners.get("click")[0]();
  assert.equal(audio.currentTime, 120);
  assert.equal(audio.paused, false);
  audio.listeners.get("timeupdate")[0]();
  assert.equal(chapters[2].attributes.get("aria-current"), "true");
  assert.equal(chapters[1].attributes.has("aria-current"), false);
});
