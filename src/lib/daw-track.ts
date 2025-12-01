/**
 * Generate DAW track compositions (Ableton/Bitwig) with integrated intro
 */

import {
  buildComposition,
  type Track,
  type FlagKeyframe,
  type ValueKeyframe,
} from "./composition-builder.ts";
import { selectWaitingRoomAudio, type Config, type DawTrackConfig } from "./config.ts";

interface DawTrackOptions {
  trackName: string;
  trackConfig: DawTrackConfig;
  config: Config;
  introDuration?: number; // override default intro duration (seconds)
}

/**
 * Generate a DAW track composition with integrated intro
 *
 * Timeline:
 * - 0: Open waiting room LX, start waiting room audio, fade in master
 * - introEnd - openProjectAhead: Open DAW project
 * - introEnd - 10s: DAW loaded, reset and stop
 * - introEnd - 5s: Fade out intro
 * - introEnd: Intro ends
 * - introEnd + 1s: Open track's LX project
 * - introEnd + 4s: LX loaded, press play on DAW
 * - end - 5s: Fade out master
 * - end: Stop DAW, quit DAW
 */
export function generateDawTrack(options: DawTrackOptions): string {
  const { trackName, trackConfig, config, introDuration } = options;
  const fps = config.fps;

  const introSeconds = introDuration ?? config.defaultIntroDuration;
  const introFrames = introSeconds * fps;
  const trackFrames = trackConfig.duration * fps;
  const totalFrames = introFrames + trackFrames;

  // Timing
  const openProjectAhead = trackConfig.openProjectAhead ?? config.defaultOpenProjectAhead;
  const openDawTime = Math.max(0, introFrames - openProjectAhead * fps);
  const dawLoadedTime = openDawTime + fps * 10; // 10 seconds for DAW to load
  const fadeOutStart = introFrames - fps * 5; // Fade out 5 seconds before intro ends
  const openLxTime = introFrames + fps * 1; // Open LX 1 second after intro ends
  const dawPlayTime = openLxTime + fps * 3; // Start DAW 3 seconds after LX opens

  const tracks: Track[] = [];

  // Chromatik control track - handles LX project opens and DAW quit/open
  const chromatikKeyframes: FlagKeyframe[] = [
    // Quit both DAWs at start to ensure clean state
    { time: 0, address: "/apotheneum/quitLive" },
    { time: 1, address: "/apotheneum/quitBitwig" },
    // Open waiting room LX at start
    { time: 2, address: `/apotheneum/openProject <"${config.waitingRoomLxProject}">` },
    // Open track's LX project AFTER intro ends
    { time: openLxTime, address: `/apotheneum/openProject <"${trackConfig.lxProject}">` },
  ];

  // DAW-specific project open and transport
  if (trackConfig.daw === "ableton") {
    // Ableton project open/quit - separate track
    tracks.push({
      type: "oscflag",
      name: "Ableton Project",
      port: "Chromatik",
      keyframes: [
        { time: openDawTime, address: `/apotheneum/openLiveProject <"${trackConfig.project}">` },
        { time: totalFrames - fps, address: "/apotheneum/quitLive" },
      ],
    });

    // Ableton transport
    tracks.push({
      type: "oscflag",
      name: "Ableton Transport",
      port: "Ableton Out",
      keyframes: [
        { time: dawPlayTime, address: "/start" }, // Start after LX loads
        { time: totalFrames - fps, address: "/stop" }, // Stop at end
      ],
    });
  } else if (trackConfig.daw === "bitwig") {
    // Bitwig project open/quit - separate track
    tracks.push({
      type: "oscflag",
      name: "Bitwig Project",
      port: "Chromatik",
      keyframes: [
        { time: openDawTime, address: `/apotheneum/openBitwigProject <"${trackConfig.project}">` },
        { time: totalFrames - fps, address: "/apotheneum/quitBitwig" },
      ],
    });

    // Bitwig transport
    tracks.push({
      type: "oscflag",
      name: "Bitwig Transport",
      port: "Bitwig",
      keyframes: [
        // After DAW loads, reset and ensure stopped
        { time: dawLoadedTime, address: "/play <0>" },
        { time: dawLoadedTime + 1, address: "/play <0>" },
        { time: dawLoadedTime + 2, address: "/play <0>" },
        { time: dawLoadedTime + fps, address: "/restart" }, // 1 second gap before restart
        { time: dawLoadedTime + fps + 3, address: "/play <0>" },
        { time: dawLoadedTime + fps + 6, address: "/play <0>" },
        { time: dawLoadedTime + fps + 9, address: "/play <0>" },
        { time: dawLoadedTime + fps + 12, address: "/play <0>" },
        // Start playback after LX loads
        { time: dawPlayTime, address: "/play <1>" },
        // Stop at end
        { time: totalFrames - fps, address: "/play <0>" },
      ],
    });
  }

  // Sort chromatik keyframes by time
  chromatikKeyframes.sort((a, b) => a.time - b.time);

  tracks.push({
    type: "oscflag",
    name: "Chromatik",
    port: "Chromatik",
    keyframes: chromatikKeyframes,
  });

  // Master fader: fade in during intro start, fade out at intro end, then full during track, fade out at end
  const fadeInDuration = 5 * fps;
  const fadeOutDuration = 5 * fps;
  const masterKeyframes: ValueKeyframe[] = [
    // Fade in at start of intro
    { time: 0, value: 0, interpolation: "none" },
    { time: fadeInDuration, value: 100, interpolation: "linear" },
    // Fade out at end of intro
    { time: fadeOutStart, value: 100, interpolation: "linear" },
    { time: introFrames, value: 0, interpolation: "linear" },
    // Back to full when DAW starts
    { time: dawPlayTime, value: 100, interpolation: "none" },
    // Fade out at end of track
    { time: totalFrames - fadeOutDuration, value: 100, interpolation: "linear" },
    { time: totalFrames, value: 0, interpolation: "linear" },
  ];

  tracks.push({
    type: "oscvalue",
    name: "Master",
    port: "Chromatik",
    address: "/lx/mixer/master/fader",
    minValue: 0,
    maxValue: 100,
    keyframes: masterKeyframes,
  });

  // Waiting room audio during intro - select based on intro duration
  const waitingRoomAudio = selectWaitingRoomAudio(config, introSeconds);
  tracks.push({
    type: "audiofile",
    name: "Waiting Room Audio",
    soundURL: waitingRoomAudio,
  });

  return buildComposition({
    name: trackName,
    fps,
    duration: totalFrames,
    tracks,
  });
}
