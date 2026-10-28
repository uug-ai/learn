import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { sha256, validateEpisodeId } from "./episode.mjs";

const defaultRoot = dirname(fileURLToPath(import.meta.url));

export async function createEpisode(page, { id, root = defaultRoot } = {}) {
  if (typeof page !== "string") throw new Error("Provide a documentation path, for example docs/hub/roles.");
  const route = page.replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/.test(route)) {
    throw new Error("Use a page path such as docs/hub/roles, without a URL, extension, or parent traversal.");
  }
  id ??= route.split("/").at(-1);
  validateEpisodeId(id);
  const base = resolve(root, "../app/content", route);
  const candidates = [join(base, "index.md"), join(base, "_index.md"), `${base}.md`].filter(existsSync);
  if (candidates.length !== 1) {
    throw new Error(`Expected one Markdown source for "${route}", found ${candidates.length}.`);
  }
  const source = await readFile(candidates[0]);
  const episode = JSON.parse(await readFile(join(root, "episode-template.json"), "utf8"));
  Object.assign(episode, {
    id,
    title: `${id.charAt(0).toUpperCase()}${id.slice(1).replaceAll("-", " ")}, explained`,
    sourceUrl: `https://learn.uug.ai/${route}/`,
    sourcePath: relative(root, candidates[0]).split(sep).join("/"),
    sourceSha256: sha256(source),
  });
  const directory = join(root, "episodes");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${id}.json`);
  await writeFile(path, JSON.stringify(episode, null, 2) + "\n", { flag: "wx" });
  return path;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({
      options: { id: { type: "string" } },
      allowPositionals: true,
    });
    if (positionals.length !== 1) throw new Error("Usage: node new.mjs <docs/page/path> [--id episode-id]");
    const path = await createEpisode(positionals[0], { id: values.id });
    console.log(`Created draft: ${path}`);
    console.log("Replace every {{...}} prompt with source-backed dialogue and real source anchors.");
    console.log("Review the title, description, source URL, and script; set reviewedOn and draft: false before generating.");
  } catch (error) {
    console.error(`Episode creation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
