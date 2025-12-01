# Vezér Playlist Generator

A TypeScript CLI tool to generate Vezér (.vzr) playlists for the Apotheneum art installation.

## Overview

This tool generates Vezér project files that orchestrate:
- DAW playback (Ableton Live, Bitwig Studio)
- Chromatik/LX lighting control
- Audio playback
- OSC messaging between applications

## Track Types

### DAW Tracks (`type: "daw"`)
Tracks that play from Ableton or Bitwig. These are **fully generated** from config - no stored XML needed. The generator creates a Vezér composition that:
- Opens the DAW project
- Opens the corresponding LX project
- Sends transport commands (start/stop)
- Manages master fader
- Quits the DAW at the end

### Vezér Tracks (`type: "vezer"`)
Tracks with native Vezér automation (e.g., generative visuals). These have complex keyframe data that can't be generated, so they're stored as XML files in `./compositions/` and loaded at playlist generation time.

## Configuration

All track definitions live in `src/config.ts` - a typed TypeScript file for IDE support:

```typescript
const config: Config = {
  fps: 30,
  defaultIntroDuration: 120, // seconds
  waitingRoomAudio: "/path/to/waiting-room.wav",
  waitingRoomLxProject: "Apotheneum/mcslee/WaitingRoom.BRC.lxp",

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

## Commands

### `extract` - Extract Vezér-native compositions
```bash
npx tsx src/cli.ts extract <input.vzr> [--output-dir ./compositions]
```
Extracts compositions from an existing .vzr file. Use this for Vezér-native tracks that have automation data.

### `manage` - Manage track library
```bash
npx tsx src/cli.ts manage
```
List and delete tracks from the config.

### `generate` - Generate a playlist
```bash
npx tsx src/cli.ts generate [--output playlist.vzr]
```
Interactive playlist builder:
1. Select tracks to include
2. Reorder tracks
3. Set intro duration
4. Outputs a complete .vzr file

## Playlist Structure

Generated playlists alternate between intro and main tracks:

```
[Intro-TrackA]  <- Generated: waiting room audio, opens DAW/LX
[TrackA]        <- Generated (DAW) or loaded (Vezér)
[Intro-TrackB]  <- Generated: waiting room audio, opens DAW/LX
[TrackB]        <- Generated (DAW) or loaded (Vezér)
...
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
│   ├── cli.ts              # CLI entry point
│   ├── config.ts           # Track configuration (edit this!)
│   ├── commands/
│   │   ├── extract.ts      # Extract compositions from .vzr
│   │   ├── manage.ts       # List/delete tracks
│   │   └── generate.ts     # Build playlist
│   └── lib/
│       ├── config.ts       # Config types and helpers
│       ├── xml.ts          # XML parsing/building
│       ├── intro.ts        # Generate intro compositions
│       └── daw-track.ts    # Generate DAW track compositions
├── compositions/           # Stored Vezér-native track XMLs
├── package.json
└── tsconfig.json
```

## Development

```bash
# Install dependencies
pnpm install

# Run commands
npx tsx src/cli.ts extract ./input.vzr
npx tsx src/cli.ts manage
npx tsx src/cli.ts generate -o playlist.vzr
```
