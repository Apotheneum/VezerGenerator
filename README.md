# Vezér Playlist Generator

A TypeScript CLI tool to generate Vezér (.vzr) playlists for the Apotheneum art installation.

## Overview

This tool generates Vezér project files that orchestrate:
- DAW playback (Ableton Live, Bitwig Studio)
- Chromatik/LX lighting control
- Audio playback
- OSC messaging between applications

## Installation

```bash
pnpm install
```

## Quick Start

```bash
# Generate a playlist interactively
npx tsx src/cli.ts generate -o my-playlist.vzr
```

## Commands

### `generate` - Generate a playlist

```bash
npx tsx src/cli.ts generate [--output playlist.vzr]
```

Interactive playlist builder:
1. Displays numbered list of available tracks
2. Enter track numbers (comma-separated, can repeat same track)
3. Set intro duration
4. Outputs a complete .vzr file

Example input: `1,2,1,3` creates a playlist with track 1 twice.

### `extract` - Extract Vezér-native compositions

```bash
npx tsx src/cli.ts extract <input.vzr> [--output-dir ./compositions]
```

Extracts compositions from an existing .vzr file. Use this for Vezér-native tracks that have complex automation data.

### `manage` - Manage track library

```bash
npx tsx src/cli.ts manage
```

List and delete tracks from the config.

## Track Types

### DAW Tracks (`type: "daw"`)

Tracks that play from Ableton or Bitwig. These are **fully generated** from config with an integrated intro. The generator creates a Vezér composition that:
- Plays waiting room audio during intro
- Opens the DAW project ahead of time
- Sends transport commands (stop/restart/play)
- Opens the LX project
- Manages master fader
- Quits the DAW at the end

### Vezér Tracks (`type: "vezer"`)

Tracks with native Vezér automation (e.g., generative visuals). These have complex keyframe data that can't be generated, so they're stored as XML files in `./compositions/` and loaded at playlist generation time. A separate intro composition is generated before each Vezér track.

## Configuration

All track definitions live in `src/config.ts`:

```typescript
const config: Config = {
  fps: 30,
  defaultIntroDuration: 120, // seconds
  defaultOpenProjectAhead: 20, // open DAW this many seconds before play
  waitingRoomLxProject: "path/to/WaitingRoom.lxp",
  waitingRoomAudios: [
    { duration: 30, path: "/path/to/audio-30s.wav" },
    { duration: 120, path: "/path/to/audio-2m.wav" },
    // Audio is auto-selected based on intro duration
  ],

  tracks: {
    "Track-Name": {
      type: "daw",
      daw: "ableton", // or "bitwig"
      project: "path/to/project.als",
      lxProject: "path/to/project.lxp",
      duration: 1200, // seconds
    },
    "Another-Track": {
      type: "vezer",
      composition: "./compositions/track.xml",
      lxProject: "path/to/project.lxp",
    },
  },
};
```

## Playlist Structure

Generated playlists have different structures for DAW vs Vezér tracks:

**DAW tracks** (merged intro):
```
[DO-Treetop]     <- Single composition: intro + DAW playback
[MS-Apotheosis]  <- Single composition: intro + DAW playback
```

**Vezér tracks** (separate intro):
```
[Intro-Generative]  <- Generated intro with waiting room
[Generative]        <- Loaded from compositions/
```

## OSC Commands

### Chromatik
- Open project: `/apotheneum/openProject <"path.lxp">`

### Ableton Live
- Open project: `/apotheneum/openLiveProject <"path.als">`
- Start: `/start` (to "Ableton Out" port)
- Stop: `/stop` (to "Ableton Out" port)
- Quit: `/apotheneum/quitLive`

### Bitwig Studio
- Open project: `/apotheneum/openBitwigProject <"path.bwproject">`
- Play: `/play <1>` (to "Bitwig" port)
- Stop: `/play <0>` (to "Bitwig" port)
- Restart: `/restart` (to "Bitwig" port)
- Quit: `/apotheneum/quitBitwig`

## Project Structure

```
VezerParser/
├── src/
│   ├── cli.ts                # CLI entry point
│   ├── config.ts             # Track configuration (edit this!)
│   ├── commands/
│   │   ├── extract.ts        # Extract compositions from .vzr
│   │   ├── manage.ts         # List/delete tracks
│   │   └── generate.ts       # Build playlist
│   └── lib/
│       ├── config.ts         # Config types and helpers
│       ├── xml.ts            # XML parsing/building
│       ├── intro.ts          # Generate intro compositions
│       ├── daw-track.ts      # Generate DAW track compositions
│       └── composition-builder.ts  # Low-level composition XML builder
├── compositions/             # Stored Vezér-native track XMLs
├── package.json
└── tsconfig.json
```

## Testing Individual Tracks

```bash
# Test a specific track
npx tsx src/test-generate.ts DO-Treetop
npx tsx src/test-generate.ts MS-Apotheosis
```
