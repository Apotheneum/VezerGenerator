import type { Config } from "./lib/config.ts";

const config: Config = {
  fps: 30,
  defaultIntroDuration: 120,
  defaultOpenProjectAhead: 20, // open DAW project 20 seconds before playback
  waitingRoomAudios: [
    { duration: 30, path: "/Users/apotheneum/Apotheneum/Media/Apotheneum Waiting Room 30s.wav" },
    { duration: 120, path: "/Users/apotheneum/Apotheneum/Media/Apotheneum Waiting Room 2m.wav" },
    { duration: 300, path: "/Users/apotheneum/Apotheneum/Media/Apotheneum Waiting Room 5m.wav" },
    { duration: 600, path: "/Users/apotheneum/Apotheneum/Media/Apotheneum Waiting Room 10m.wav" },
  ],
  waitingRoomLxProject: "Apotheneum/mcslee/WaitingRoom.BRC.lxp",

  // OSC port configuration
  oscPorts: {
    outputs: [
      { address: "127.0.0.1", port: 3030, label: "Chromatik" },
      { address: "127.0.0.1", port: 6060, label: "Ableton Out" },
      { address: "127.0.0.1", port: 8323, label: "Bitwig" },
    ],
    inputs: [
      { port: 1234, label: "Apotheneum M4 Pro Vezér OSC 1" },
    ],
  },

  // Audio output device
  audioDevice: {
    name: "Loopback Apotheneum",
    uuid: "com.rogueamoeba.Loopback::07A7D880-C132-4581-8432-1BEC71144622",
  },

  tracks: {
    "DO-Treetop": {
      type: "daw",
      daw: "bitwig",
      project: "Bitwig/Projects/Apotheneum/TreetopTransmission.bwproject",
      lxProject: "Apotheneum/doved/Treetop Transmission.lxp",
      duration: 1200,
    },
    "MS-Apotheosis": {
      type: "daw",
      daw: "ableton",
      project: "Apotheneum/Apotheosis Project/Apotheosis.als",
      lxProject: "Apotheneum/mcslee/Apotheosis.BRC.lxp",
      duration: 2530,
    },
    "TS-Form": {
      type: "daw",
      daw: "ableton",
      project: "Apotheneum/Thesilveresa/FormLanguage_1-8 Project/FormLanguage_1-8.als",
      lxProject: "Apotheneum/thesilveresa/FormLanguage_Final.lxp",
      duration: 1790,
    },
    "JB-LulledFortitude": {
      type: "vezer",
      composition: "./compositions/JB-LulledFortitude.xml",
    },
    "MS-Generative": {
      type: "vezer",
      composition: "./compositions/MS-Generative.xml",
    },
  },
};

export default config;
