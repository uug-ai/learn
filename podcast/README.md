# Reusable documentation podcasts

Use one conversational episode format and one interactive player for any Learn
documentation page. The first example is an adaptation of the
[organisations and projects guide](https://learn.uug.ai/docs/hub/organisations/).
Generation and review stay local. Approved episodes can be exported into Learn's
static assets and enabled individually on documentation pages. The organisations
guide is configured to use the second episode; other pages are unchanged.
Nothing under `output/`, `.cache/`, or `node_modules/` is part of the site.

## Generate and listen

Prerequisites: Node.js 20+, npm, and FFmpeg with `ffprobe` and `libmp3lame`.

```bash
cd learn/podcast
npm ci
npm test
npm run sample                       # Organisations: first two turns
npm run generate                     # Organisations: complete episode
npm run generate -- organisations    # Explicit episode selection
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
the personality guidance below with three brief light moments and one spoken
amused reaction; the original episode remains available for comparison.

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
the default voices and six-part dialogue structure. It does **not** invent or
automatically summarize documentation. New files are marked `draft: true` and
contain `{{...}}` editorial prompts. They cannot generate audio until completed.

## Conversational template

Keep the same format, not the same sentences, across pages:

| Chapter | Host's job | Guide's job |
| --- | --- | --- |
| Opening question | Ask why this topic matters; introduce one clearly fictional scenario. | Explain the core idea and connect it to the scenario. |
| Mental model | Ask how easily confused concepts differ; test the answer with a follow-up. | Make the distinctions concrete without reading tables or diagrams aloud. |
| Practical walkthrough | Ask what to do first and what changes afterward. | Explain documented steps, prerequisites, and expected results. |
| Misconception | Voice a plausible mistake and ask about an edge case. | Correct it, preserving compatibility, ownership, security, and rollout caveats. |
| Troubleshooting | Describe a documented failure and ask where exact details live. | Give source-backed checks, not speculative fixes. |
| Takeaway | Ask what to remember, then close with the source guide. | Recap the mental model and one safe next action. |

Use the `host` as the curious listener and the `guide` as the explainer. Every
chapter must contain both voices; validation rejects monologues. Keep exchanges
natural: use follow-up questions, challenges, and concrete examples rather than
alternating unrelated paragraphs. Aim for roughly 20-60 words per turn and a
6-10 minute episode, adjusting to the page instead of padding thin material.
Chapters may be renamed, added, merged, or removed; the six-part outline is an
editorial starting point, not a requirement to invent troubleshooting content.

Use plain spoken language for identifiers and abbreviations. Label illustrative
examples as fictional. Never add unsupported capabilities, imply future design
is already enforced, or turn a limitation into a promised feature. Give the
listener exact configuration through source links, rather than dictating code.
Always disclose the synthetic voices and that this is an adapted review copy.

### Personality, humour, and delivery

The template's `editorialStyle` block is guidance for the scriptwriter, not
spoken text or an emotion parameter sent to the speech engine. Keep a little
personality consistent across pages without forcing identical banter:

- **A few light moments:** roughly two or three short, relevant jokes or playful
  analogies in a 6-10 minute episode is enough. Zero is fine for a serious topic.
  Do not add a joke to every chapter or insert a separate comedy segment.
- **Natural reactions:** an occasional "Oh, that makes sense", "Wait, so...", or
  "Fair point" can make a follow-up feel spontaneous. Avoid starting every
  answer with "Exactly" or "Absolutely", and cut reactions that add no value.
- **A light chuckle, sparingly:** a spoken "Ha, fair point" can suggest amusement
  once or twice, when the exchange earns it. Do not scatter laughter throughout
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
The episode preserves the guide's important rollout limitations:

- Membership is not permission; canonical role assignments are not the current
  live permission source.
- Workspace selection does not grant access or transfer resources.
- Background results retain source ownership, regardless of later switching.
- Stable legacy ownership resolves to the default organisation/project at
  runtime; a backfill is not required.
- Interface flags, storage modes, and authorization rollout are distinct.
- An organisation domain field does not configure login-domain behavior.

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
ID) to the article's YAML front matter. The player currently integrates with
the shared documentation layout. Review the script against the source, update
its source checksum if the front matter changed, and regenerate before export:

```bash
npm run generate -- organisations-v2
npm run publish -- organisations-v2
```

Publication checks the reviewed source and script, complete-episode manifest,
MP3 checksum, exact transcript, and chapter timings before copying:

- The MP3 and transcript to `app/static/podcasts/<episode-id>/`.
- Public title, duration, chapter timing, and transcript data to
  `app/data/podcasts/<episode-id>.json`.

The shared Hugo documentation layout renders a headphone **Listen** button at
the article's top right only when `podcast` is configured. It opens a collapsible
player with native audio controls, speed selection, 15-second skips, chapters,
downloads, and the full transcript. Opening the panel does not fetch or autoplay
the MP3. Closing it pauses playback and returns keyboard focus; Escape also
closes it. Direct MP3/transcript links remain available without JavaScript.
The local preview and article player share `app/assets/js/podcast.js`.

Missing publication data or asset files fail the Hugo build rather than
producing a broken button. Pages without podcast metadata load no podcast CSS,
JavaScript, or audio. Commit the public assets/data with the page and templates;
the normal Hugo/Docker release deploys them. The export command prepares site
files; it does not push a branch, create a release, or deploy the live website.
No TTS dependencies, models, or generation step are required to serve or build
the site. This does not yet provide continuous playback between page navigations.

The organisation article body is unchanged by publication; its source hash was
updated only to account for the new podcast front matter.

## Validate the integration

```bash
cd learn/podcast
npm test
cd ../app
hugo --minify
cd ../playwright
npm run podcast
```

The browser suite starts a local Hugo server and covers the top-right button,
lazy loading, chapter playback, speed/skip controls, closing during a pending
load, errors, downloads, mobile/dark mode, pages without podcasts, and the
no-JavaScript fallback. Set `LEARN_BASE_URL` to test an existing Learn server.
