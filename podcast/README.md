# Reusable documentation podcasts

Use one conversational episode format and one interactive player for any Learn
documentation page. The first example is an adaptation of the
[organisations and projects guide](https://learn.uug.ai/docs/hub/organisations/).
Generation and review stay local. Approved episodes can be exported into Learn's
static assets and enabled individually on articles. All 104 published,
substantive Learn articles now have their own overview. This includes the 36 Hub
guides and 68 additional articles across Agent, Factory, Vault, platform and CLI
documentation, completed engineering guides, tutorials, the CORS knowledge-base
article, blog posts, release notes, and support. The organisations guide keeps
its second episode. Drafts, empty pages, "To be written" placeholders, catalogues,
and navigation-only pages intentionally remain without podcasts.
Nothing under `output/`, `.cache/`, or `node_modules/` is part of the site.

## Episode coverage

The 35 additional scripts use `hub-<page-path>` IDs, with nested path segments
joined by hyphens and `hub-overview` for the landing page, and live under
`episodes/`. Each source page selects its own
episode through YAML front matter. The episodes are source-specific overviews,
not narrated copies of configuration tables or code.

New Hub episodes use `af_heart` for the host and `am_puck` for the male guide,
both at speed `0.98`. Warm questions and upbeat dialogue provide the delivery
direction; Kokoro does not guarantee an emotional style. Existing organisations
scripts and audio retain their voices. Short topics have fewer chapters rather
than padded dialogue.

Additional documentation episodes use their route after `docs/`, with path
segments joined by hyphens; for example, `agent-installation` and
`vault-api-signed-urls`. The documentation landing page uses `docs`. Articles
outside documentation keep the section prefix, such as
`tutorials-agent-connect-any-camera`, `guides-onboarding-dev-containers`, and
`release-notes-2026-10-23`. Each page selects its own episode through front
matter. Short guides have brief, focused episodes; release-note episodes are
selected historical highlights, not current configuration references or
exhaustive narrations.

The scripts have source review dates and the exported audio is checked
programmatically. Neither is a claim of human listening approval. Listen to the
generated episodes before a production release, especially product names,
abbreviations and speaker hand-offs.

## Generate and listen

Prerequisites: Node.js 20+, npm, and FFmpeg with `ffprobe` and `libmp3lame`.

```bash
cd learn/podcast
npm ci
npm test
npm run sample                       # Organisations: first two turns
npm run generate                     # Organisations: complete episode
npm run generate -- organisations    # Explicit episode selection
npm run generate -- hub-roles        # A page-specific Hub overview
npm run preview
```

Open <http://127.0.0.1:4175/organisations/> for the full episode or
<http://127.0.0.1:4175/organisations-sample/> for the voice sample.
The server binds to loopback only. Stop it with Ctrl+C.
You can also open the generated `output/organisations/index.html` directly.

For the second, more conversational organisations episode, use
`npm run sample -- organisations-v2` or `npm run generate -- organisations-v2`,
then open <http://127.0.0.1:4175/organisations-v2/>. Its script is
[`episodes/organisations-v2.json`](episodes/organisations-v2.json). It applies
the high-level overview guidance below: one warehouse/shop example, four short
chapters, and a four-to-five-minute target. The original, more detailed episode
remains available for comparison. Regenerate and republish after script changes.

Each output folder contains:

- `episode.mp3`: mono 24 kHz, 96 kbps MP3, with speech loudness normalization
  targeting -19 LUFS and a -1.5 dB true-peak ceiling.
- `index.html`: the shared local player with chapter seeking, current-chapter
  highlighting, 15-second skip controls, playback speeds from 0.75x to 2x,
  downloads, source links, and chapter-linked transcripts. Playback never starts
  automatically. Each episode has its own output directory.
- `transcript.txt`: the complete spoken script, including speaker names.
- `manifest.json`: actual duration, chapter times, voices, model information,
  and source/script/audio checksums.

Speech synthesis runs on the local CPU using
[`kokoro-js`](https://www.npmjs.com/package/kokoro-js) and the Apache-2.0
[`Kokoro-82M-v1.0-ONNX`](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)
model in 8-bit precision. The first run downloads public model and voice files.
The script and audio are not sent to a speech-generation service. There are no
API credentials, cloud accounts, cloned voices, or paid services.
Dependencies and models are downloaded from npm/Hugging Face; this is not an
air-gapped installation. Model files and completed speech turns are cached in
`.cache/`; changing a turn's text, voice, or speed invalidates its audio cache.
`output/`, `.cache/`, and `node_modules/` are ignored by Git.

## Create an episode for another page

```bash
npm run new -- docs/hub/roles
# Edit episodes/roles.json and complete the editorial review below.
npm test
npm run sample -- roles
npm run generate -- roles
npm run preview
```

The new episode will be available at <http://127.0.0.1:4175/roles/>.
Use the content route without a hostname or `.md` extension. The scaffold
supports Hugo leaf bundles (`index.md`), section pages (`_index.md`), and regular
Markdown pages. It reads the local source and records its path, URL, and checksum.
Confirm the source URL if the page overrides its default Hugo route.

The default episode ID is the last route segment. To avoid collisions, use
`npm run new -- docs/hub/roles --id hub-roles`. Existing episode files are never
overwritten. A missing page, ambiguous source, invalid ID, or path traversal is
an explicit error. The original no-argument generation commands still select
`organisations`.

The scaffold copies [`episode-template.json`](episode-template.json), preserving
the default voices and four-part overview structure. It does **not** invent or
automatically summarize documentation. New files are marked `draft: true` and
contain `{{...}}` editorial prompts. They cannot generate audio until completed.

## High-level overview template

The episode is an introduction to the topic, not an audio version of the manual.
Help a first-time listener understand why it matters, build a mental model, and
choose one next action. Keep the same format, not the same sentences, across pages:

| Chapter | Host's job | Guide's job |
| --- | --- | --- |
| Opening question | Ask why this topic matters; introduce one clearly fictional scenario. | Explain the core idea and connect it to the scenario. |
| Mental model | Ask how easily confused concepts differ; test the answer with a follow-up. | Make the distinctions concrete without reading tables or diagrams aloud. |
| Everyday example | Describe one ordinary action using the same scenario; ask what changes and what stays put. | Explain the outcome and one essential caveat as a practical consequence, not an implementation walkthrough. |
| Takeaway | Ask what to remember, then close with the source guide. | Recap the mental model and one safe next action. |

Use the `host` as the curious listener and the `guide` as the explainer. Every
chapter must contain both voices; validation rejects monologues. Keep exchanges
natural: use follow-up questions, challenges, and concrete examples rather than
alternating unrelated paragraphs. Aim for roughly 20-40 words per explanatory
turn, 500-550 spoken words overall, and four to five minutes of generated audio.
Measure the actual MP3 duration: word count is an editorial guide, not a
substitute for a duration check. Shorter is fine for a thin topic; never pad.
The four-part outline is a starting point, not a requirement to cover every
section of the page.

Use one clearly fictional scenario throughout. Leave exact setup steps,
identifiers, form limits, field precedence, token handling, feature-flag
hierarchies, migration mechanics, and troubleshooting checklists in the guide.
Keep essential safety, ownership, compatibility, and rollout caveats, but explain
what they mean for the listener. For example, say that switching workspaces
doesn't move recordings, not how their ownership fields are propagated.

Use plain spoken language for identifiers and abbreviations. Label illustrative
examples as fictional. Never add unsupported capabilities, imply future design
is already enforced, or turn a limitation into a promised feature. Give the
listener exact configuration through source links, rather than dictating code.
Disclose the AI-generated voices and adaptation in the player. Keep internal
pilot, generation, and listening-review instructions out of listener-facing
descriptions and dialogue. An `editorialStyle` change alone does not rewrite
speech: edit the turns, regenerate the audio, and publish the checked output.

### Personality, humour, and delivery

The template's `editorialStyle` block is guidance for the scriptwriter, not
spoken text or an emotion parameter sent to the speech engine. Keep a little
personality consistent across pages without forcing identical banter:

- **A little personality:** one or two short, relevant light moments or playful
  analogies are enough for a four-to-five-minute overview. Zero is fine.
  Do not add a joke to every chapter or insert a separate comedy segment.
- **Natural reactions:** an occasional "Oh, that makes sense", "Wait, so...", or
  "Fair point" can make a follow-up feel spontaneous. Avoid starting every
  answer with "Exactly" or "Absolutely", and cut reactions that add no value.
- **A light chuckle, sparingly:** a spoken "Ha, fair point" can suggest amusement
  once, when the exchange earns it. Do not scatter laughter throughout
  technical explanations or put it around warnings.
- **More expressive phrasing:** write genuine questions with question marks,
  contractions, clear contrasts, and a mixture of short and longer sentences.
  Put the important distinction in its own sentence. Let punctuation establish
  the rhythm instead of writing long, flat paragraphs.
- **Keep it kind and accurate:** prefer relatable situations or gentle
  self-deprecation. Never mock the listener, minimize security or data-loss
  risks, obscure rollout limitations, or invent behavior for a punchline.

For example, the organisations episode could make a brief playful comparison:

> **Host:** So it's a workspace selector, not a teleport for my cameras?
>
> **Guide:** Exactly. A different view, not a change of ownership.

Use that as a pattern, not a line to repeat on every page. Alternate a curious
question, a warm reply, and a precise explanation; leave room for the answer
instead of filling every pause.

Kokoro currently receives text, voice, and speaking speed. It does **not** expose
reliable laugh, emotion, or SSML controls in this workflow. Do not insert
`[laughs]`, `[excited]`, `<break>` tags, or assume stage directions will produce
an effect rather than being read aloud. A written "Ha" remains a speech
approximation, not verified natural laughter. Genuine expressive laughter
would need a separately evaluated voice engine or approved audio asset.
Listen to the sample and then the full episode to judge the result; these
writing techniques guide intonation but do not guarantee it.

For each chapter, replace `sourceAnchor` with a real heading anchor in the source.
Replace **all** `{{...}}` prompts, review the title and description, set
`reviewedOn` to the date of the source/script review, and only then set
`draft: false`. Validation requires `format: "learn-dialogue-v1"`, the two
speakers, real speech, and completed metadata. Voice names and speaking speed
remain configurable per episode.

## Editorial review

Edit the selected file under `episodes/`, then regenerate that episode by ID.
[`episodes/organisations.json`](episodes/organisations.json) is a completed example.
The script is deliberately adapted for listening rather than narrating tables,
code, and diagrams. The fictional warehouse/shop example is illustrative.
The published overview preserves the guide's essential practical caveats:

- Membership is not permission; canonical role assignments are not the current
  live permission source.
- Workspace selection does not grant access or transfer resources.
- Background results retain source ownership, regardless of later switching.
- Older recordings remain in their owner's default project without a required
  migration.
- Missing interface controls have documented enablement steps.

The original detailed episode also discusses storage modes, flag hierarchies,
and login-domain distinctions. Those details remain in the guide rather than
being mandatory coverage for an introductory episode.

`reviewedOn` means the script was checked against the source documentation, not
that a human has approved the audio. Generation fails if the guide's checksum
has changed. Review the script against the updated guide before updating
`sourceSha256` (obtain it with
`sha256sum ../app/content/docs/hub/organisations/index.md` for the first episode).
Check names such as Kerberos, abbreviations, pacing, host hand-offs, omissions,
and factual accuracy by listening before approving publication. Automated
checks establish file integrity and coverage, not perceptual voice quality.

## Publish an approved episode to Learn

After listening review, add `podcast: organisations-v2` (or the selected episode
ID) to the article's YAML front matter. The player integrates with the shared documentation layout, general single and
section article layouts, knowledge-base articles, blog posts, and individual
release notes. Catalogue layouts remain unchanged. The shared
`podcast/article-header.html` partial keeps the same control and conditional
styles across these layouts. Review the script against the source, update
its source checksum if the front matter changed, and regenerate before export:

```bash
npm run generate -- organisations-v2
npm run publish -- organisations-v2
```

Publication checks the reviewed source and script, complete-episode manifest,
MP3 checksum, exact transcript, and chapter timings before copying:

- The MP3 to `app/static/podcasts/<episode-id>/`.
- Public title, duration, and chapter timing data to
  `app/data/podcasts/<episode-id>.json`.

The transcript and spoken turns remain in the local authoring files, not in
the public assets or chapter data. Republishing also removes any previously
exported `transcript.txt` for that episode, including stale copies in Hugo's
default `app/public/` output. Use a clean destination when building elsewhere.

The shared Hugo documentation layout renders a headphone **Listen to the
overview** button with an estimated duration at the article's top right only
when `podcast` is configured. On small screens the action sits below the title
so the label and duration remain readable. It opens a compact, collapsible
player with native audio controls and initially collapsed chapters, without
extra skip buttons or a speed selector.
It has no transcript or download links and requests that supported browsers hide
the native download and playback-speed controls. Opening the panel does not fetch or autoplay
the MP3. Closing it pauses playback and returns keyboard focus; Escape also
closes it. After playback starts, the same native audio controls dock at the
bottom when the inline controls scroll above the viewport. The compact player
includes return and close actions, remains available when paused, and goes away
on completion or close. It does not create a second audio element.
Its left-hand title area shows the current article section below the episode
title and updates with playback and seeking. On small screens the section
replaces the episode title to keep the controls compact. Long titles are
truncated visually, with the full section name available on hover.

Chapter `sourceAnchor` values also link playback to headings in the article.
Once playback starts, one soft, continuous background highlights the current
heading and following content up to the next heading. It adds no badges,
underlines, repeated side rails or marks on earlier topics. The decoration is
positioned behind the content without wrapping or moving it, and follows image,
font and viewport resizing. Print output hides it.
These are topic-level references for an
adapted overview, not claims that every detail has been read aloud.
Pausing preserves the current highlight. Seeking (including backward) moves it;
completion and closing clear it. Reopening restores the highlight for the
current position without autoplay or scrolling.
Playback scrolls to the heading when the active topic changes. Selecting a
chapter also returns to its section, including when that chapter is already
active. Smooth scrolling respects reduced-motion preferences and keeps the
heading below the fixed navigation. Repeated time updates within the same
topic do not pull the reader back. Focus and document layout are unchanged.
Sections without a chapter mapping stay unmarked. Invalid mappings report a
warning without disabling playback. The local authoring preview has no article
body, so it retains chapter highlighting only.

Listening progress is stored only in this browser's local storage, under
`learn-podcast:<episode-id>`, with the audio checksum. It is restored only when
the listener starts playback; an explicit chapter selection takes precedence.
Replaced audio ignores old progress, and completed episodes clear their saved
position. Storage failures are reported without disabling playback. The audio
URL includes its checksum to avoid serving an older cached episode after
republishing. Native audio playback remains available without JavaScript;
progress saving and docking require JavaScript.
The local preview and article player share `app/assets/js/podcast.js`.
The local authoring preview retains transcripts, downloads, skip controls, and
speed selection for review.
Hiding download controls is not copy protection: browsers still need access to
the public audio URL to play it.

Missing publication data or asset files fail the Hugo build rather than
producing a broken button. Pages without podcast metadata load no podcast CSS,
JavaScript, or audio. Commit the public assets/data with the page and templates;
the normal Hugo/Docker release deploys them. The export command prepares site
files; it does not push a branch, create a release, or deploy the live website.
No TTS dependencies, models, or generation step are required to serve or build
the site. This does not yet provide continuous playback between page navigations.

The Hub article bodies are unchanged by this rollout; new front matter selects
each overview. Source checksums include that front matter, so add it before
pinning the reviewed checksum and generating the episode.

To regenerate all additional Hub episodes locally, sequentially:

```bash
for script in episodes/hub-*.json; do
  id="$(basename "$script" .json)"
  npm run generate -- "$id" && npm run publish -- "$id" || exit 1
done
```

Generation reuses cached speech turns but still verifies source checksums and
rebuilds the manifest. Do not refresh a checksum to bypass a changed guide:
review the dialogue first. Export prepares site assets; it does not deploy them.

## Validate the integration

```bash
cd learn/podcast
npm test
cd ../app
hugo --minify
cd ../playwright
npm run podcast
```

The browser suite starts a local Hugo server and covers the overview duration,
lazy loading, chapter playback, the absence of extra skip/speed controls,
closing during a pending load, errors, versioned progress, unavailable storage,
desktop/mobile docking, continuous active-section highlighting, seeking,
completion, automatic section following, reduced-motion scrolling, same-topic
reading-position stability, the absence of public transcripts and download links,
mobile/dark mode, pages without podcasts, and the no-JavaScript fallback.
The unit suite also inventories all Hub source pages and verifies coverage,
source/script/audio checksums, publication metadata, real MP3 duration through
`ffprobe`, chapter ordering, the new voices and absence of public transcripts.
The browser suite opens every new Hub overview, checks its real rendered heading
anchors, plays a chapter and verifies range requests for seekable audio. The
shared player regressions continue to cover the existing organisations episode.
Set `LEARN_BASE_URL` to test an existing Learn server.
