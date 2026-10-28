import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createEpisode } from "./new.mjs";
import { parseGenerateArgs, sha256, validateEpisode } from "./episode.mjs";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "learn-podcast-template-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "podcast");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "episode-template.json"), await readFile(new URL("./episode-template.json", import.meta.url)));
  return { directory, root };
}

test("scaffolds independent page episodes with source metadata and reusable dialogue prompts", async (t) => {
  const { directory, root } = await fixture(t);
  const sources = [
    { page: "docs/hub/roles", path: "docs/hub/roles/index.md" },
    { page: "docs/hub/domains", path: "docs/hub/domains.md" },
    { page: "docs/hub/overview", path: "docs/hub/overview/_index.md" },
  ];
  for (const { page, path } of sources) {
    const sourcePath = join(directory, "app/content", path);
    await mkdir(join(sourcePath, ".."), { recursive: true });
    const source = `---\ntitle: "${page}"\n---\n\n## Overview\n\nSource-backed documentation.\n`;
    await writeFile(sourcePath, source);
    const created = await createEpisode(page, { root });
    const draft = JSON.parse(await readFile(created, "utf8"));
    assert.equal(draft.id, page.split("/").at(-1));
    assert.equal(draft.sourceSha256, sha256(source));
    assert.equal(draft.sourceUrl, `https://learn.uug.ai/${page}/`);
    assert.equal(draft.sourcePath, `../app/content/${path}`);
    assert.equal(draft.format, "learn-dialogue-v1");
    assert.equal(draft.draft, true);
    assert.equal(draft.chapters.length, 6);
    assert.deepEqual(Object.keys(draft.speakers), ["host", "guide"]);
    assert.match(draft.editorialStyle.humour, /two or three/);
    assert.match(draft.editorialStyle.laughter, /not a guarantee of genuine laughter/);
    assert.match(draft.editorialStyle.intonation, /question marks/);
    for (const chapter of draft.chapters) {
      assert.ok(chapter.turns.some((turn) => turn.speaker === "host"));
      assert.ok(chapter.turns.some((turn) => turn.speaker === "guide"));
    }
    assert.throws(() => validateEpisode(draft), /episode is a draft/);
    draft.draft = false;
    draft.reviewedOn = "2026-10-28";
    assert.throws(() => validateEpisode(draft), /editorial placeholders/);
    await assert.rejects(createEpisode(page, { root }), { code: "EEXIST" });
    assert.equal(JSON.parse(await readFile(created, "utf8")).draft, true);
  }
});

test("supports a custom episode id without changing the source page", async (t) => {
  const { directory, root } = await fixture(t);
  await mkdir(join(directory, "app/content/docs"), { recursive: true });
  await writeFile(join(directory, "app/content/docs/example.md"), "# Example\n");
  const created = await createEpisode("/docs/example/", { root, id: "example-introduction" });
  const draft = JSON.parse(await readFile(created, "utf8"));
  assert.equal(draft.id, "example-introduction");
  assert.equal(draft.sourceUrl, "https://learn.uug.ai/docs/example/");
});

test("rejects traversal, unsafe ids, missing pages, and ambiguous sources", async (t) => {
  const { directory, root } = await fixture(t);
  for (const page of ["../private", "docs/../../private", "https://learn.uug.ai/docs/hub/roles/", "docs/hub/roles.md"]) {
    await assert.rejects(createEpisode(page, { root }), /Use a page path/);
  }
  await assert.rejects(createEpisode("docs/example", { root, id: "../private" }), /id must/);
  await assert.rejects(createEpisode("docs/missing", { root }), /found 0/);
  await mkdir(join(directory, "app/content/docs/example"), { recursive: true });
  await writeFile(join(directory, "app/content/docs/example/index.md"), "# Example\n");
  await writeFile(join(directory, "app/content/docs/example.md"), "# Duplicate\n");
  await assert.rejects(createEpisode("docs/example", { root }), /found 2/);
});

test("generation selects any episode while preserving the original default and sample command", () => {
  assert.deepEqual(parseGenerateArgs([]), { id: "organisations", sample: false });
  assert.deepEqual(parseGenerateArgs(["--sample"]), { id: "organisations", sample: true });
  assert.deepEqual(parseGenerateArgs(["roles"]), { id: "roles", sample: false });
  assert.deepEqual(parseGenerateArgs(["domains", "--sample"]), { id: "domains", sample: true });
  assert.deepEqual(parseGenerateArgs(["--sample", "roles"]), { id: "roles", sample: true });
  assert.throws(() => parseGenerateArgs(["../private"]), /id must/);
  assert.throws(() => parseGenerateArgs(["roles", "domains"]), /Usage/);
  assert.throws(() => parseGenerateArgs(["--unknown"]), /Unknown option/);
});
