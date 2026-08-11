# Agent notes

Instructions for AI coding agents (Claude Code, Codex, and anything else) working in this
repo. Tool-agnostic on purpose — `CLAUDE.md` is a pointer to this file, not a second copy.

**Read [README.md](README.md) first** for architecture, track semantics, and CLI usage.
This file covers only what an agent needs beyond that: the conventions, the traps, and the
things that look like bugs but aren't.

## What this repo is

A CLI that generates Vezér `.vzr` playlists for a physical art installation. The output
drives real hardware in front of a real audience. There is no staging environment and no
test suite — a bad generated playlist is discovered live. Prefer being conservative and
saying what you're unsure of over making a confident change to timing or OSC behavior.

## Conventions

- **Runtime is `tsx`** — no build step. Run things with `npx tsx src/cli.ts <command>`.
- **Imports carry `.ts` extensions** (`from "./lib/config.ts"`). That is deliberate and
  required by the ESM + `tsx` setup. Do not "fix" them to extensionless.
- **`src/config.ts` is the source of truth for the track library**, hand-edited. No
  command writes to it — `manage` only lists tracks and deletes composition *files*.
- **`compositions/*.xml` are extracted artifacts, not source.** They come out of Vezér via
  `extract`. Don't hand-edit them to change behavior; re-author in Vezér and re-extract.
  Reading them to answer a question is fine and often necessary.
- Package manager is **pnpm**.

## Traps

These have all bitten someone already.

- **The Bitwig `/play <0>` burst in `src/lib/daw-track.ts` is not redundant.** Bitwig's
  transport doesn't reliably reset to zero on a single command, so the generator sends a
  sequence of stops bracketing a `/restart` at specific frame offsets. It looks like
  copy-paste noise. It is a workaround for real hardware behavior. Do not collapse,
  deduplicate, or "clean up" that block without testing on the actual rig.
- **`./TestTreetopOnly.vzr` is load-bearing.** It is a 1.8 MB checked-in file that
  `generate` reads to source the playlist's `appData` block (OSC ports, audio device,
  transport buttons). It is not a leftover test fixture. Deleting or moving it no longer
  fails silently — `buildVzrFile()` throws an error naming the file and `generate` exits
  non-zero — but the file is still required for `generate` to work at all.
- **Timing constants are frame-based and interdependent.** `fps` is 30; durations in
  config are seconds and get multiplied. Changing one offset in `daw-track.ts` can
  reorder events relative to another. Read the whole timeline before touching one row.
- **Don't trust `lxProject` on a `vezer` track** — it's required by the type but never
  read, and the configured values have drifted from what the XML actually opens. Get the
  real value from the composition:
  `grep -o 'openProject &lt;[^<]*' compositions/<name>.xml`

## Known dead config

Flagged so you don't waste time tracing them, and don't "wire them up" without asking —
each is a decision, not an oversight to fix silently:

| Field | Status |
|---|---|
| `oscPorts`, `audioDevice` in `src/config.ts` | Unused. `buildAppData()` in `src/lib/xml.ts` would consume them, but nothing calls it while `generate` supplies a template path. |
| `lxProject` on `VezerTrackConfig` | Required by the type, never read. Schema debt. |

## Verifying claims

Nothing here is covered by tests, so verify against the artifacts directly rather than
reasoning from the config:

```bash
# What LX project / OSC commands does a stored composition actually send?
grep -o '/apotheneum/[^<"]*' compositions/<name>.xml | sort | uniq -c

# Generate a single track without the interactive prompts
npx tsx src/test-generate.ts DO-Treetop
```

When you state what a track does, say whether you read it from config or from the XML —
they disagree in known places.

## Documentation

`README.md` is the authoritative operational doc. If you change generator behavior, update
it in the same change — it previously drifted badly from the code (a duplicate manual in
`CLAUDE.md` grew contradictions), which is why there is now exactly one.

When you document something you haven't verified on the real rig, mark it as unverified
rather than stating it plainly.
