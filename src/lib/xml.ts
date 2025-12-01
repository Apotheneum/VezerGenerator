import { readFile, writeFile } from "fs/promises";
import type { Config } from "./config.ts";

const PLIST_HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>`;

const PLIST_FOOTER = `</dict>
</plist>`;

export interface ExtractedComposition {
  name: string;
  xml: string;
}

/**
 * Extract the compName from a composition XML block
 */
function extractCompName(xml: string): string {
  const match = xml.match(/<key>compName<\/key>\s*<string>([^<]+)<\/string>/);
  return match ? match[1] : "Unknown";
}

/**
 * Find matching closing dict tag, handling nested dicts
 */
function findMatchingDictClose(content: string, startIndex: number): number {
  let depth = 1;
  let i = startIndex;

  while (i < content.length && depth > 0) {
    const nextOpen = content.indexOf("<dict>", i);
    const nextClose = content.indexOf("</dict>", i);

    if (nextClose === -1) {
      throw new Error("Malformed XML: no matching </dict>");
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 6;
    } else {
      depth--;
      if (depth === 0) {
        return nextClose + 7; // Include </dict>
      }
      i = nextClose + 7;
    }
  }

  throw new Error("Malformed XML: no matching </dict>");
}

/**
 * Extract all compositions from a .vzr file as raw XML blocks
 */
export async function extractCompositionsFromFile(
  filePath: string
): Promise<{ compositions: ExtractedComposition[]; appData: string | null }> {
  const content = await readFile(filePath, "utf-8");
  const compositions: ExtractedComposition[] = [];
  let appData: string | null = null;

  // Find all Comp-X entries
  const compKeyRegex = /<key>Comp-\d+<\/key>/g;
  let match;

  while ((match = compKeyRegex.exec(content)) !== null) {
    const keyEnd = match.index + match[0].length;

    // Find the <dict> that follows
    const dictStart = content.indexOf("<dict>", keyEnd);
    if (dictStart === -1) continue;

    // Find matching </dict>
    const dictEnd = findMatchingDictClose(content, dictStart + 6);
    const dictXml = content.slice(dictStart, dictEnd);

    const name = extractCompName(dictXml);
    compositions.push({ name, xml: dictXml });
  }

  // Extract appData
  const appDataKeyMatch = content.match(/<key>appData<\/key>/);
  if (appDataKeyMatch) {
    const keyEnd = appDataKeyMatch.index! + appDataKeyMatch[0].length;
    const dictStart = content.indexOf("<dict>", keyEnd);
    if (dictStart !== -1) {
      const dictEnd = findMatchingDictClose(content, dictStart + 6);
      appData = content.slice(dictStart, dictEnd);
    }
  }

  return { compositions, appData };
}

function buildMidiButton(state: boolean = false): string {
  return `<dict>
			<key>midiChannel</key>
			<integer>-1</integer>
			<key>midiControl</key>
			<integer>-1</integer>
			<key>state</key>
			<${state}/>
		</dict>`;
}

function buildOscOutputs(config: Config): string {
  return config.oscPorts.outputs
    .map(
      (out) => `<dict>
						<key>address</key>
						<string>${out.address}</string>
						<key>port</key>
						<integer>${out.port}</integer>
						<key>portLabel</key>
						<string>${out.label}</string>
					</dict>`
    )
    .join("\n\t\t\t\t\t");
}

function buildOscInputs(config: Config): string {
  return config.oscPorts.inputs
    .map(
      (inp) => `<dict>
						<key>port</key>
						<integer>${inp.port}</integer>
						<key>portLabel</key>
						<string>${inp.label}</string>
					</dict>`
    )
    .join("\n\t\t\t\t\t");
}

function buildAppData(config: Config): string {
  return `<dict>
		<key>audioManager</key>
		<dict>
			<key>defaultChannelMapping</key>
			<dict>
				<key>channelMapping</key>
				<array>
					<integer>1</integer>
					<integer>2</integer>
					<integer>3</integer>
					<integer>4</integer>
					<integer>5</integer>
					<integer>6</integer>
				</array>
				<key>playerChannelCount</key>
				<integer>6</integer>
			</dict>
			<key>selectedDefaultOutputDevice</key>
			<string>${config.audioDevice.name}</string>
			<key>selectedDefaultOutputDeviceUUID</key>
			<string>${config.audioDevice.uuid}</string>
		</dict>
		<key>preferences</key>
		<dict>
			<key>oscPorts</key>
			<dict>
				<key>feedback</key>
				<string>Disabled</string>
				<key>inputs</key>
				<array>
					${buildOscInputs(config)}
				</array>
				<key>outputs</key>
				<array>
					${buildOscOutputs(config)}
				</array>
			</dict>
		</dict>
		<key>queuedLoopButton</key>
		${buildMidiButton(false)}
		<key>queuedModeButton</key>
		${buildMidiButton(false)}
		<key>rewindAllButton</key>
		${buildMidiButton(true)}
		<key>selectedComposition</key>
		<integer>0</integer>
		<key>soloModeButton</key>
		${buildMidiButton(false)}
		<key>togglePlayAllButton</key>
		${buildMidiButton(false)}
		<key>triggerNextButton</key>
		${buildMidiButton(true)}
		<key>triggerPrevButton</key>
		${buildMidiButton(false)}
	</dict>`;
}

/**
 * Build a complete .vzr file from composition XML blocks
 * Uses a template file (like blank.vzr) for appData if provided
 */
export async function buildVzrFile(
  compositions: string[],
  templatePath?: string
): Promise<string> {
  let appDataXml: string;

  if (templatePath) {
    // Extract appData from template file using proper nested dict parsing
    const templateContent = await readFile(templatePath, "utf-8");
    const appDataKeyMatch = templateContent.match(/<key>appData<\/key>/);
    if (appDataKeyMatch) {
      const keyEnd = appDataKeyMatch.index! + appDataKeyMatch[0].length;
      const dictStart = templateContent.indexOf("<dict>", keyEnd);
      if (dictStart !== -1) {
        const dictEnd = findMatchingDictClose(templateContent, dictStart + 6);
        appDataXml = templateContent.slice(dictStart, dictEnd);
      } else {
        appDataXml = "<dict/>";
      }
    } else {
      appDataXml = "<dict/>";
    }
  } else {
    appDataXml = "<dict/>";
  }

  const parts: string[] = [PLIST_HEADER];

  // Add compositions with sequential numbering
  compositions.forEach((xml, index) => {
    parts.push(`\t<key>Comp-${index}</key>`);
    // Indent the composition XML
    const indentedXml = xml
      .split("\n")
      .map((line) => "\t" + line)
      .join("\n");
    parts.push(indentedXml);
  });

  // Add appData
  parts.push("\t<key>appData</key>");
  const indentedAppData = appDataXml
    .split("\n")
    .map((line) => "\t" + line)
    .join("\n");
  parts.push(indentedAppData);

  parts.push(PLIST_FOOTER);

  return parts.join("\n");
}

/**
 * Write XML content to a file
 */
export async function writeXmlFile(
  filePath: string,
  content: string
): Promise<void> {
  await writeFile(filePath, content, "utf-8");
}

/**
 * Read XML content from a file
 */
export async function readXmlFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}
