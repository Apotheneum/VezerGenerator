export interface DawTrackConfig {
  type: "daw";
  daw: "ableton" | "bitwig";
  project: string;
  lxProject: string;
  duration: number; // seconds
  openProjectAhead?: number; // seconds before playback to open DAW project (overrides default)
}

export interface VezerTrackConfig {
  type: "vezer";
  composition: string;
}

export type TrackConfig = DawTrackConfig | VezerTrackConfig;

export interface OscOutput {
  address: string;
  port: number;
  label: string;
}

export interface OscInput {
  port: number;
  label: string;
}

export interface OscPorts {
  outputs: OscOutput[];
  inputs: OscInput[];
}

export interface AudioDevice {
  name: string;
  uuid: string;
}

export interface WaitingRoomAudio {
  duration: number; // seconds
  path: string;
}

export interface Config {
  fps: number;
  defaultIntroDuration: number; // seconds
  defaultOpenProjectAhead: number; // seconds before playback to open DAW project
  waitingRoomAudios: WaitingRoomAudio[]; // sorted by duration, pick closest match
  waitingRoomLxProject: string;
  oscPorts: OscPorts;
  audioDevice: AudioDevice;
  tracks: Record<string, TrackConfig>;
}

/**
 * Select the best waiting room audio for a given intro duration
 */
export function selectWaitingRoomAudio(config: Config, introDuration: number): string {
  const audios = config.waitingRoomAudios;
  if (audios.length === 0) {
    throw new Error("No waiting room audios configured");
  }

  // Find the audio that best matches the intro duration (closest without going over, or shortest if all are longer)
  const sorted = [...audios].sort((a, b) => a.duration - b.duration);

  // Find largest audio that fits within intro duration
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].duration <= introDuration) {
      return sorted[i].path;
    }
  }

  // All audios are longer than intro, return the shortest
  return sorted[0].path;
}

export function isDawTrack(track: TrackConfig): track is DawTrackConfig {
  return track.type === "daw";
}

export function isVezerTrack(track: TrackConfig): track is VezerTrackConfig {
  return track.type === "vezer";
}

// Re-export config from the config file
export { default as config } from "../config.ts";
