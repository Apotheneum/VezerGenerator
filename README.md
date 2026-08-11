# Vezér Playlist Generator

A TypeScript CLI that generates Vezér (`.vzr`) playlists for the Apotheneum art
installation — orchestrating DAW playback, Chromatik/LX lighting, audio, and the OSC
messaging that ties them together.

## Why this exists

Apotheneum shows used to be assembled by hand in the Vezér GUI. Every playlist position
held its own copy of a composition, so putting one track in five positions meant making
the same edit five times — the same project paths, the same OSC commands, the same fades,
the same timing. Miss one and you get dead air or a DAW that never quits, in the middle of
a run, with an audience in the room. Worse, the rig's hard-won quirks (Bitwig's transport
not reliably resetting to zero) lived in the operator's memory rather than anywhere a
second person could find them.

This tool makes `src/config.ts` the single declaration of the track library. A track is
described **once**, as one of two typed variants:

- `type: "daw"` — plays from a DAW, with `daw: "ableton" | "bitwig"`
- `type: "vezer"` — a Vezér-native piece backed by extracted automation XML

From that declaration plus a playlist order, the generator supplies the right OSC dialect,
the DAW transport sequence, the project-open timing, the master-fader curve, the
waiting-room audio, and the intro structure. **Placing a track in five positions now means
selecting it five times, not rebuilding it five times.** Change a track's duration or
project path in one place and every position it appears in is correct.

The scope differs by variant, and the distinction matters: DAW tracks are generated
completely from configuration. Vezér-native tracks keep their stored automation XML — the
generator supplies the waiting-room intro around them and assembles the playlist, but does
not author their timelines.

A useful side effect: because a playlist is fully derived from config plus a few answers,
it is **disposable**. When something is wrong you regenerate rather than repair.

## How tracks are modeled

Two type variants, but three execution modes — `daw` splits by which DAW it drives.

| | Ableton DAW | Bitwig DAW | Vezér-native |
|---|---|---|---|
| **Declaration** | `type: "daw"`, `daw: "ableton"` | `type: "daw"`, `daw: "bitwig"` | `type: "vezer"` |
| **Main timeline** | Generated from config | Generated from config | Loaded from stored XML |
| **Playlist entries per selection** | One: intro + piece merged | One: intro + piece merged | Two: generated intro, then stored piece |
| **Project source** | `project` (`.als`) | `project` (`.bwproject`) | `composition` (XML) |
| **Transport** | `/start`, `/stop` | `/play <1>`, `/play <0>`, plus a defensive reset burst | Owned by the stored XML |
| **Duration** | `duration` (piece only; intro is added on top) | `duration` (piece only; intro is added on top) | Stored in the XML — the generator never knows it |
| **Track LX project** | Opened by the generator from `lxProject` | Opened by the generator from `lxProject` | Opened by the XML; config `lxProject` is **ignored** |
| **DAW preflight** | None | Stop/restart burst 10s after open | None |

Every generated intro — for all three modes — does the same four things: quits both DAWs
for a clean start, opens the waiting-room LX project, plays a waiting-room audio clip, and
fades the master in at the start and out at the end.

## Quick Start

```bash
pnpm install

# Generate a playlist interactively
npx tsx src/cli.ts generate -o my-playlist.vzr
```

You get a numbered track list; enter an order like `1,2,1,3` (repeats are fine and cost
nothing), set the intro duration, and the `.vzr` is written.

## Adding a track

**A DAW piece** — add a declaration to `tracks` in `src/config.ts`. Nothing else; there is
no XML to produce.

```typescript
"My-Piece": {
  type: "daw",
  daw: "bitwig",
  project: "Bitwig/Projects/Apotheneum/MyPiece.bwproject",
  lxProject: "Apotheneum/me/MyPiece.lxp",
  duration: 1200,          // seconds of the piece itself
  openProjectAhead: 30,    // optional; overrides defaultOpenProjectAhead
},
```

**A Vezér-native piece** — author it in Vezér, save a `.vzr`, then pull the composition
out and reference the extracted file:

```bash
npx tsx src/cli.ts extract ./MyShow.vzr --output-dir ./compositions
```

```typescript
"My-Generative": {
  type: "vezer",
  composition: "./compositions/My-Generative.xml",
  lxProject: "…",   // currently required by the type, but never read — see below
},
```

## Commands

### `generate` — build a playlist

```bash
npx tsx src/cli.ts generate [--output playlist.vzr]
```

Prints the numbered track list, takes one comma-separated order (repeats allowed), asks
for the intro duration, and writes the `.vzr`. The generated file has queued-loop and
queued-advance enabled, so the show runs unattended and loops.

### `extract` — pull compositions out of a `.vzr`

```bash
npx tsx src/cli.ts extract <input.vzr> [--output-dir ./compositions]
```

Use this for Vezér-native pieces whose automation can't be generated.

### `manage` — inspect the library

```bash
npx tsx src/cli.ts manage
```

Lists configured tracks and the composition files in `./compositions/`, marking which
files are referenced by config (`✓`) and which are orphaned (`○`), and can delete
composition files. Note: it does **not** edit `src/config.ts` — track declarations are
added and removed by hand.

## Generated timelines

### DAW tracks

One composition covers both the waiting room and the piece. Total length is
`introDuration + duration`.

| Time | What happens |
|---|---|
| `0` | Quit both DAWs, open the waiting-room LX project, start waiting-room audio, fade master in over 5s |
| `introEnd − openProjectAhead` | Open the DAW project (default 20s; per-track override) |
| `+10s` after that | **Bitwig only** — defensive stop/restart burst. Ableton gets no preflight. |
| `introEnd − 5s` | Fade master out |
| `introEnd + 1s` | Open the track's `lxProject` |
| `introEnd + 4s` | Press play on the DAW, master back to full |
| `end − 5s` | Fade master out |
| `end − 1s` | Stop transport, quit the DAW |

Note that `openProjectAhead` counts backward from the **end of the intro**, not from
playback — playback starts 4 seconds later, so the DAW actually gets
`openProjectAhead + 4s` of loading time.

The two DAW dialects are not interchangeable:

- **Ableton** — `/start` / `/stop` on the `Ableton Out` port; `openLiveProject`,
  `quitLive`.
- **Bitwig** — `/play <1>` / `/play <0>` on the `Bitwig` port; `openBitwigProject`,
  `quitBitwig`. Bitwig's transport does not reliably reset to zero on a single command, so
  the generator emits a burst of `/play <0>` messages bracketing a `/restart` at specific
  frame offsets (`src/lib/daw-track.ts`). **This is deliberate — don't "simplify" it
  without testing on the real rig.**

### Vezér tracks, and what the XML owns

A Vezér selection produces two playlist entries: a generated intro, then the stored
composition inserted as-is.

The stored composition owns far more than its visuals — **it owns its own LX project,
audio, transport, duration, and automation.** The generated intro therefore only opens the
waiting room and deliberately does *not* switch to the track's lighting project, because
the composition does that itself on its own timeline. The two halves have agreed
responsibilities: the intro owns the waiting room, the composition owns everything from
its own first frame.

> ⚠️ **`lxProject` on a `vezer` track is currently required by the type but never read.**
> `src/lib/intro.ts` only emits the `openProject` keyframe when `type === "daw"`. This is
> schema debt, not intent — the field should be optional or removed. Until then, treat any
> `lxProject` on a Vezér track as decorative, and don't trust it to tell you which
> lighting project the piece loads. To find the truth, read it out of the XML:
>
> ```bash
> grep -o 'openProject &lt;[^<]*' compositions/MS-Generative.xml
> ```
>
> The values in config have already drifted from reality — at time of writing,
> `MS-Generative` declares `mcslee/Generative.lxp` while its XML opens
> `mcslee/Ouroboros.BRC.lxp`.

#### Worked example: `MS-Generative`

```typescript
"MS-Generative": {
  type: "vezer",
  composition: "./compositions/MS-Generative.xml",
  lxProject: "Apotheneum/mcslee/Generative.lxp",  // never read — see warning above
},
```

Selecting it produces two consecutive playlist entries:

1. **`Intro-MS-Generative`** — generated fresh on every run. Quits both DAWs, opens
   `WaitingRoom.BRC.lxp`, plays the waiting-room clip chosen for your intro length, fades
   the master in and back out. No DAW project is opened, because no DAW is involved.
2. **`MS-Generative`** — loaded from `compositions/MS-Generative.xml` and inserted into
   the playlist. Internally it opens `Apotheneum/mcslee/Ouroboros.BRC.lxp`, plays
   `Mark Slee - Ouroborus Mix 48k.wav`, and runs its own automation tracks. Its duration
   lives in the XML, so the generator neither knows nor needs it.

Changing the lighting project for a Vezér track therefore means editing the XML — or
re-authoring in Vezér and re-running `extract` — not editing `src/config.ts`.

## Configuration

All track definitions live in `src/config.ts`. **Abbreviated below** — the real `Config`
also requires `oscPorts` and `audioDevice` (see `src/lib/config.ts` for the full type).

```typescript
const config: Config = {
  fps: 30,
  defaultIntroDuration: 120,   // seconds; the prompt default, applied to every track
  defaultOpenProjectAhead: 20, // seconds before the END of the intro to open the DAW
  waitingRoomLxProject: "path/to/WaitingRoom.lxp",
  waitingRoomAudios: [
    { duration: 30,  path: "/path/to/audio-30s.wav" },
    { duration: 120, path: "/path/to/audio-2m.wav" },
  ],
  // ... oscPorts, audioDevice ...
  tracks: { /* see "Adding a track" above */ },
};
```

**Waiting-room audio selection** picks the *longest* clip that is no longer than the intro;
if every clip is longer than the intro, it falls back to the shortest one
(`selectWaitingRoomAudio` in `src/lib/config.ts`). It does not trim or loop audio, so an
intro length far from any configured clip will leave silence.

**Intro duration is per-playlist, not per-track.** `generate` asks once and applies the
answer to every track in the run. Different intro lengths within one show aren't
expressible today.

## OSC reference

| Target | Command | Port |
|---|---|---|
| Chromatik | `/apotheneum/openProject <"path.lxp">` | `Chromatik` |
| Ableton | `/apotheneum/openLiveProject <"path.als">` | `Chromatik` |
| Ableton | `/start`, `/stop` | `Ableton Out` |
| Ableton | `/apotheneum/quitLive` | `Chromatik` |
| Bitwig | `/apotheneum/openBitwigProject <"path.bwproject">` | `Chromatik` |
| Bitwig | `/play <1>`, `/play <0>`, `/restart` | `Bitwig` |
| Bitwig | `/apotheneum/quitBitwig` | `Chromatik` |
| Master fader | `/lx/mixer/master/fader` (0–100) | `Chromatik` |

## Development

```
ApothVezerGenerator/
├── src/
│   ├── cli.ts                      # CLI entry point
│   ├── config.ts                   # Track configuration (edit this!)
│   ├── commands/
│   │   ├── extract.ts              # Extract compositions from .vzr
│   │   ├── manage.ts               # List tracks / delete composition files
│   │   └── generate.ts             # Build playlist
│   └── lib/
│       ├── config.ts               # Config types and helpers
│       ├── xml.ts                  # plist parsing / .vzr assembly
│       ├── intro.ts                # Generate intro compositions
│       ├── daw-track.ts            # Generate DAW track compositions
│       └── composition-builder.ts  # Low-level composition XML builder
├── compositions/                   # Stored Vezér-native track XMLs
└── TestTreetopOnly.vzr             # appData template — see below
```

### The `appData` template

`generate` does not synthesize the playlist's `appData` block (OSC port definitions, audio
device, transport button state). It **copies it out of `./TestTreetopOnly.vzr`**, hardcoded
at `src/commands/generate.ts`, then force-enables queued-loop and queued-advance. Keep that
file in the repo — if it goes missing or moves, generated playlists lose their OSC and
audio settings.

A consequence worth knowing: `oscPorts` and `audioDevice` in `src/config.ts` are currently
**not used**. `buildAppData()` in `src/lib/xml.ts` would build that block from them, but
nothing calls it while a template path is supplied. Editing those config values has no
effect on output today.

### Testing individual tracks

```bash
npx tsx src/test-generate.ts DO-Treetop
npx tsx src/test-generate.ts MS-Apotheosis
```

## Known issues

- `lxProject` is required on `vezer` tracks but never read, and the configured values have
  drifted from what the XML actually opens.
- `oscPorts` / `audioDevice` in config are dead — `appData` comes from the `.vzr` template.
- Intro duration is global per playlist; no per-track override.
- Track paths in `src/config.ts` are absolute and machine-specific
  (`/Users/apotheneum/...`); nothing validates that they exist before generating.
