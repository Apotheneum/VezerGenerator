/**
 * Generate intro compositions for tracks
 */

import {
  buildComposition,
  type Track,
  type FlagKeyframe,
  type ValueKeyframe,
} from "./composition-builder.ts";
import { selectWaitingRoomAudio, type Config, type TrackConfig, type DawTrackConfig } from "./config.ts";

interface IntroOptions {
  trackName: string;
  trackConfig: TrackConfig;
  config: Config;
  introDuration?: number; // override default duration (seconds)
}

/**
 * Generate an intro composition for a track
 */
export function generateIntro(options: IntroOptions): string {
  const { trackName, trackConfig, config, introDuration } = options;
  const fps = config.fps;
  const duration = introDuration ?? config.defaultIntroDuration;
  const durationFrames = duration * fps;

  // Build OSC flag keyframes for Chromatik
  const chromatikKeyframes: FlagKeyframe[] = [
    // Open waiting room LX project at start
    {
      time: 0,
      address: `/apotheneum/openProject <"${config.waitingRoomLxProject}">`,
    },
    // Open track's LX project near the end (5 seconds before)
    {
      time: durationFrames - 5 * fps,
      address: `/apotheneum/openProject <"${trackConfig.lxProject}">`,
    },
  ];

  // Build tracks array
  const tracks: Track[] = [
    // Chromatik control
    {
      type: "oscflag",
      name: "Chromatik",
      port: "Chromatik",
      keyframes: chromatikKeyframes,
    },
  ];

  // If DAW track, add DAW open command
  if (trackConfig.type === "daw") {
    const dawConfig = trackConfig as DawTrackConfig;
    const openTime = durationFrames - 60 * fps; // 60 seconds before end

    if (dawConfig.daw === "ableton") {
      tracks.push({
        type: "oscflag",
        name: "Ableton Project",
        port: "Chromatik",
        keyframes: [
          {
            time: Math.max(0, openTime),
            address: `/apotheneum/openLiveProject <"${dawConfig.project}">`,
          },
        ],
      });
    } else if (dawConfig.daw === "bitwig") {
      tracks.push({
        type: "oscflag",
        name: "Bitwig Project",
        port: "Chromatik",
        keyframes: [
          {
            time: Math.max(0, openTime),
            address: `/apotheneum/openBitwigProject <"${dawConfig.project}">`,
          },
        ],
      });
    }
  }

  // Master fader: fade in at start, fade out at end
  const fadeInDuration = 5 * fps; // 5 seconds
  const fadeOutDuration = 5 * fps;
  const masterKeyframes: ValueKeyframe[] = [
    { time: 0, value: 0, interpolation: "none" },
    { time: fadeInDuration, value: 100, interpolation: "linear" },
    { time: durationFrames - fadeOutDuration, value: 100, interpolation: "linear" },
    { time: durationFrames, value: 0, interpolation: "linear" },
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

  // Waiting room audio - select based on intro duration
  const waitingRoomAudio = selectWaitingRoomAudio(config, duration);
  tracks.push({
    type: "audiofile",
    name: "Waiting Room Audio",
    soundURL: waitingRoomAudio,
  });

  return buildComposition({
    name: `Intro-${trackName}`,
    fps,
    duration: durationFrames,
    tracks,
  });
}
