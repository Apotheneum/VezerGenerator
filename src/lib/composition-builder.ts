/**
 * Programmatic builder for Vezér composition XML
 */

// Helper to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Keyframe for OSCFlag track
export interface FlagKeyframe {
  time: number; // frame number
  address: string; // OSC address with args
}

// Keyframe for OSCValue track
export interface ValueKeyframe {
  time: number;
  value: number;
  interpolation: "none" | "linear";
}

// OSCFlag track definition
export interface OSCFlagTrack {
  type: "oscflag";
  name: string;
  port: string;
  keyframes: FlagKeyframe[];
}

// OSCValue track definition
export interface OSCValueTrack {
  type: "oscvalue";
  name: string;
  port: string;
  address: string;
  minValue: number;
  maxValue: number;
  keyframes: ValueKeyframe[];
}

// AudioFile track definition
export interface AudioFileTrack {
  type: "audiofile";
  name: string;
  soundURL: string;
  startPosition?: number;
}

export type Track = OSCFlagTrack | OSCValueTrack | AudioFileTrack;

export interface CompositionOptions {
  name: string;
  fps: number;
  duration: number; // in frames
  tracks: Track[];
}

function buildMidiAssignment(state: boolean = false): string {
  return `<dict>
			<key>midiChannel</key>
			<integer>-1</integer>
			<key>midiControl</key>
			<integer>-1</integer>
			<key>state</key>
			<${state}/>
		</dict>`;
}

function buildOSCFlagTrack(track: OSCFlagTrack, pos: number): string {
  const keyframesXml = track.keyframes
    .map(
      (kf, i) => `<key>${i}</key>
					<dict>
						<key>flagAddress</key>
						<string>${escapeXml(track.keyframes[i].address)}</string>
						<key>interpolation</key>
						<string>No Interpolation</string>
						<key>time</key>
						<integer>${kf.time}</integer>
						<key>value</key>
						<real>50</real>
					</dict>`
    )
    .join("\n\t\t\t\t\t");

  return `<key>tr-${pos}</key>
			<dict>
				<key>cachedMuteState</key>
				<integer>0</integer>
				<key>enabledButton</key>
				${buildMidiAssignment(true)}
				<key>isCollapsed</key>
				<false/>
				<key>isLocked</key>
				<false/>
				<key>keyFrames</key>
				<dict>
					${keyframesXml}
				</dict>
				<key>oscPortName</key>
				<string>${escapeXml(track.port)}</string>
				<key>recordedSession</key>
				<false/>
				<key>sendsNormalisedValue</key>
				<false/>
				<key>trackName</key>
				<string>${escapeXml(track.name)}</string>
				<key>trackPos</key>
				<integer>${pos}</integer>
				<key>trackType</key>
				<string>OSCFlag</string>
			</dict>`;
}

function buildOSCValueTrack(track: OSCValueTrack, pos: number): string {
  const keyframesXml = track.keyframes
    .map(
      (kf, i) => `<key>${i}</key>
					<dict>
						<key>interpolation</key>
						<string>${kf.interpolation === "linear" ? "Linear Interpolation" : "No Interpolation"}</string>
						<key>time</key>
						<integer>${kf.time}</integer>
						<key>value</key>
						<real>${kf.value}</real>
					</dict>`
    )
    .join("\n\t\t\t\t\t");

  return `<key>tr-${pos}</key>
			<dict>
				<key>cachedMuteState</key>
				<integer>0</integer>
				<key>enabledButton</key>
				${buildMidiAssignment(true)}
				<key>isCollapsed</key>
				<false/>
				<key>isLocked</key>
				<false/>
				<key>isUsing5FractionDigits</key>
				<false/>
				<key>keyFrames</key>
				<dict>
					${keyframesXml}
				</dict>
				<key>oscPortName</key>
				<string>${escapeXml(track.port)}</string>
				<key>recordedSession</key>
				<false/>
				<key>sendsNormalisedValue</key>
				<false/>
				<key>trackMaxValue</key>
				<real>${track.maxValue}</real>
				<key>trackMinValue</key>
				<real>${track.minValue}</real>
				<key>trackName</key>
				<string>${escapeXml(track.name)}</string>
				<key>trackOSCAddress</key>
				<string>${escapeXml(track.address)}</string>
				<key>trackOSCType</key>
				<integer>0</integer>
				<key>trackPos</key>
				<integer>${pos}</integer>
				<key>trackType</key>
				<string>OSCValue</string>
			</dict>`;
}

function buildAudioFileTrack(track: AudioFileTrack, pos: number): string {
  return `<key>tr-${pos}</key>
			<dict>
				<key>audioDevices</key>
				<string>Project's Default</string>
				<key>audioDevicesUUID</key>
				<string>com.rogueamoeba.Loopback::07A7D880-C132-4581-8432-1BEC71144622</string>
				<key>audioVolume</key>
				<dict>
					<key>midiChannel</key>
					<integer>-1</integer>
					<key>midiControl</key>
					<integer>-1</integer>
					<key>volume</key>
					<real>1</real>
				</dict>
				<key>bandsButton</key>
				${buildMidiAssignment(false)}
				<key>channelMapping</key>
				<array>
					<integer>1</integer>
					<integer>2</integer>
					<integer>0</integer>
					<integer>0</integer>
					<integer>0</integer>
					<integer>0</integer>
				</array>
				<key>currentChannel</key>
				<integer>0</integer>
				<key>enabledButton</key>
				${buildMidiAssignment(true)}
				<key>highFilter</key>
				<real>4000</real>
				<key>isCollapsed</key>
				<false/>
				<key>isLocked</key>
				<false/>
				<key>lowFilter</key>
				<real>300</real>
				<key>selectedBand</key>
				<integer>0</integer>
				<key>soundURL</key>
				<string>${escapeXml(track.soundURL)}</string>
				<key>startPosition</key>
				<integer>${track.startPosition ?? 0}</integer>
				<key>trackName</key>
				<string>${escapeXml(track.name)}</string>
				<key>trackPos</key>
				<integer>${pos}</integer>
				<key>trackType</key>
				<string>AudioFile</string>
			</dict>`;
}

function buildTrack(track: Track, pos: number): string {
  switch (track.type) {
    case "oscflag":
      return buildOSCFlagTrack(track, pos);
    case "oscvalue":
      return buildOSCValueTrack(track, pos);
    case "audiofile":
      return buildAudioFileTrack(track, pos);
  }
}

/**
 * Build a complete Vezér composition XML
 */
export function buildComposition(options: CompositionOptions): string {
  const { name, fps, duration, tracks } = options;

  const tracksXml = tracks.map((track, i) => buildTrack(track, i)).join("\n\t\t");

  // Get the last OSC addresses for metadata
  const lastFlagTrack = tracks.find((t) => t.type === "oscflag") as OSCFlagTrack | undefined;
  const lastValueTrack = tracks.find((t) => t.type === "oscvalue") as OSCValueTrack | undefined;
  const lastFlagAddress = lastFlagTrack?.keyframes[0]?.address ?? "";
  const lastValueAddress = lastValueTrack?.address ?? "/lx/mixer/master/fader";

  return `<dict>
		<key>compFPS</key>
		<integer>${fps}</integer>
		<key>compName</key>
		<string>${escapeXml(name)}</string>
		<key>compSpeed</key>
		<string>120</string>
		<key>compSpeedAssigns</key>
		<dict>
			<key>midiChannel</key>
			<integer>-1</integer>
			<key>midiControl</key>
			<integer>-1</integer>
		</dict>
		<key>compState</key>
		<true/>
		<key>compStateButton</key>
		${buildMidiAssignment(true)}
		<key>compTime</key>
		<real>${duration}</real>
		<key>cueController</key>
		<dict>
			<key>cues</key>
			<dict/>
			<key>enableButton</key>
			${buildMidiAssignment(true)}
			<key>nextCueButton</key>
			${buildMidiAssignment(false)}
			<key>prevCueButton</key>
			${buildMidiAssignment(false)}
		</dict>
		<key>lastOSCFlagAddress</key>
		<string>${escapeXml(lastFlagAddress)}</string>
		<key>lastOSCTrackAddress</key>
		<string>${escapeXml(lastValueAddress)}</string>
		<key>loopButton</key>
		${buildMidiAssignment(false)}
		<key>midiSyncSourcePopup</key>
		<string>Normal Tempo</string>
		<key>mtcFormat</key>
		<integer>3</integer>
		<key>mtcOutDestination</key>
		<string>Vezér Midi Out 1</string>
		<key>mtcOutFPS</key>
		<string>11</string>
		<key>mtcOutStartTime</key>
		<real>0.0</real>
		<key>playButton</key>
		${buildMidiAssignment(false)}
		<key>recButton</key>
		${buildMidiAssignment(false)}
		<key>rewindButton</key>
		${buildMidiAssignment(true)}
		<key>smpteOffset</key>
		<real>0.0</real>
		<key>syncOutButton</key>
		${buildMidiAssignment(false)}
		<key>throttler</key>
		<dict>
			<key>inTime</key>
			<integer>0</integer>
			<key>outTime</key>
			<integer>${duration}</integer>
		</dict>
		<key>trackAddButton</key>
		${buildMidiAssignment(false)}
		<key>tracks</key>
		<dict>
			${tracksXml}
		</dict>
		<key>transmitsMMC</key>
		<false/>
		<key>transmitsMTC</key>
		<false/>
		<key>useCompIDWithMMC</key>
		<false/>
		<key>zoomInButton</key>
		${buildMidiAssignment(false)}
		<key>zoomOutButton</key>
		${buildMidiAssignment(false)}
	</dict>`;
}
