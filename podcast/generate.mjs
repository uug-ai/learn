import { existsSync } from "node:fs";
import { mkdir, mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  assertAudio, assertSourceMatches, DTYPE, MODEL, parseGenerateArgs, renderPreview, renderTranscript,
  SAMPLE_RATE, sha256, synthesizeSpeech, turnCacheKey, validateEpisode,
} from "./episode.mjs";

const root = dirname(fileURLToPath(import.meta.url));

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stderr}`);
  return result.stdout;
}

async function main() {
  const { id, sample } = parseGenerateArgs(process.argv.slice(2));
  const episode = JSON.parse(await readFile(join(root, "episodes", `${id}.json`), "utf8"));
  validateEpisode(episode);
  if (episode.id !== id) throw new Error(`Episode id "${episode.id}" does not match the selected filename "${id}.json".`);
  const source = await readFile(resolve(root, episode.sourcePath));
  assertSourceMatches(episode, source);
  run("ffmpeg", ["-version"]);
  run("ffprobe", ["-version"]);
  if (sample) {
    episode.chapters = [{ ...episode.chapters[0], turns: episode.chapters[0].turns.slice(0, 2) }];
  }

  const output = join(root, "output", `${episode.id}${sample ? "-sample" : ""}`);
  const cache = join(root, ".cache/audio");
  await mkdir(output, { recursive: true });
  await mkdir(cache, { recursive: true });
  const work = await mkdtemp(join(tmpdir(), "learn-podcast-"));
  let tts;
  try {
    const { KokoroTTS, TextSplitterStream, env } = await import("kokoro-js");
    env.cacheDir = join(root, ".cache/models");
    console.log(`Loading ${MODEL} (${DTYPE}, local CPU). First run downloads public model files.`);
    tts = await KokoroTTS.from_pretrained(MODEL, { dtype: DTYPE, device: "cpu" });
    for (const speaker of Object.values(episode.speakers)) {
      if (!Object.hasOwn(tts.voices, speaker.voice)) throw new Error(`Unknown Kokoro voice: ${speaker.voice}`);
    }

    const rawPath = join(work, "episode.f32");
    const raw = await open(rawPath, "w");
    const chapters = [];
    let sampleCount = 0;
    try {
      for (const chapter of episode.chapters) {
        chapters.push({ title: chapter.title, start: sampleCount / SAMPLE_RATE });
        console.log(`Chapter: ${chapter.title}`);
        for (const [index, turn] of chapter.turns.entries()) {
          const speaker = episode.speakers[turn.speaker];
          const cachePath = join(cache, `${turnCacheKey(turn, speaker)}.f32`);
          let pcm;
          if (existsSync(cachePath)) {
            pcm = await readFile(cachePath);
          } else {
            const chunks = [];
            for await (const { audio } of synthesizeSpeech(tts, new TextSplitterStream(), turn.text, {
              voice: speaker.voice, speed: speaker.speed,
            })) {
              if (audio.sampling_rate !== SAMPLE_RATE) throw new Error(`Unexpected sample rate: ${audio.sampling_rate}`);
              assertAudio(audio.audio);
              chunks.push(Buffer.from(Buffer.from(audio.audio.buffer, audio.audio.byteOffset, audio.audio.byteLength)));
            }
            pcm = Buffer.concat(chunks);
            if (!pcm.length) throw new Error("The speech generator returned no audio.");
            await writeFile(cachePath, pcm);
          }
          if (pcm.length % 4 !== 0) throw new Error(`Invalid audio cache: ${cachePath}`);
          const aligned = Uint8Array.from(pcm);
          assertAudio(new Float32Array(aligned.buffer));
          await raw.writeFile(pcm);
          sampleCount += pcm.length / 4;
          const pause = Math.round(SAMPLE_RATE * (index === chapter.turns.length - 1 ? 0.65 : 0.28));
          await raw.writeFile(Buffer.alloc(pause * 4));
          sampleCount += pause;
          console.log(`  ${speaker.name}: ${turn.text.split(/\s+/).length} words complete`);
        }
      }
    } finally {
      await raw.close();
    }

    const mp3Path = join(work, "episode.mp3");
    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", "1",
      "-i", rawPath, "-af", "loudnorm=I=-19:TP=-1.5:LRA=11", "-ar", String(SAMPLE_RATE),
      "-codec:a", "libmp3lame", "-b:a", "96k",
      "-metadata", `title=${episode.title}`, "-metadata", "artist=UUG.AI Learn",
      "-metadata", `comment=Local pilot. Synthetic voices. Source: ${episode.sourceUrl}`,
      mp3Path,
    ]);
    const probe = JSON.parse(run("ffprobe", [
      "-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels",
      "-of", "json", mp3Path,
    ]));
    const duration = Number(probe.format.duration);
    if (!Number.isFinite(duration) || Math.abs(duration - sampleCount / SAMPLE_RATE) > 1) {
      throw new Error("Encoded MP3 duration does not match the generated speech.");
    }
    const mp3 = await readFile(mp3Path);
    await writeFile(join(output, "episode.mp3"), mp3);
    await writeFile(join(output, "transcript.txt"), renderTranscript(episode));
    await writeFile(join(output, "index.html"), renderPreview(episode, chapters, duration, sample));
    await writeFile(join(output, "manifest.json"), JSON.stringify({
      id: episode.id, format: episode.format, title: episode.title,
      sourceUrl: episode.sourceUrl, sourceSha256: sha256(source),
      scriptSha256: sha256(JSON.stringify(episode)), reviewedOn: episode.reviewedOn,
      generatedAt: new Date().toISOString(), model: MODEL, dtype: DTYPE, speakers: episode.speakers,
      sample, duration, chapters, audio: { ...probe.streams[0], bytes: mp3.length, sha256: sha256(mp3) },
    }, null, 2) + "\n");
    console.log(`Ready: ${output}/index.html (${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s)`);
  } finally {
    if (tts) await tts.model.dispose();
    await rm(work, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(`Podcast generation failed: ${error.message}`);
  process.exitCode = 1;
}
