/**
 * Test script to generate a single-track playlist
 */

import { readFile } from "fs/promises";
import { config, isDawTrack, isVezerTrack } from "./lib/config.ts";
import { generateDawTrack } from "./lib/daw-track.ts";
import { generateIntro } from "./lib/intro.ts";
import { buildVzrFile, writeXmlFile } from "./lib/xml.ts";
import chalk from "chalk";

async function main() {
  // Change this to test different tracks
  const trackName = process.argv[2] || "DO-Treetop";
  const trackConfig = config.tracks[trackName];

  if (!trackConfig) {
    console.error(chalk.red(`Track "${trackName}" not found in config`));
    console.log(chalk.gray("Available tracks:"));
    Object.keys(config.tracks).forEach((name) => console.log(chalk.gray(`  - ${name}`)));
    process.exit(1);
  }

  console.log(chalk.blue(`Generating test playlist with: ${trackName}`));

  const compositions: string[] = [];
  const introDuration = 30; // Short intro for testing

  if (isDawTrack(trackConfig)) {
    // DAW tracks: merged intro + track
    console.log(chalk.gray(`  Generating ${trackConfig.daw} track with ${introDuration}s intro...`));
    const trackXml = generateDawTrack({
      trackName,
      trackConfig,
      config,
      introDuration,
    });
    compositions.push(trackXml);
  } else if (isVezerTrack(trackConfig)) {
    // Vezér tracks: separate intro + loaded composition
    console.log(chalk.gray(`  Generating intro with ${introDuration}s...`));
    const introXml = generateIntro({
      trackName,
      trackConfig,
      config,
      introDuration,
    });
    compositions.push(introXml);

    console.log(chalk.gray(`  Loading Vezér track...`));
    const trackXml = await readFile(trackConfig.composition, "utf-8");
    compositions.push(trackXml);
  }

  // Build and write (use TestTreetopOnly.vzr as template for appData - has proper OSC ports)
  const vzrContent = await buildVzrFile(compositions, "./TestTreetopOnly.vzr");
  const outputFile = `test-${trackName.toLowerCase()}.vzr`;
  await writeXmlFile(outputFile, vzrContent);

  console.log(chalk.green(`\nSaved to: ${outputFile}`));
}

main().catch(console.error);
