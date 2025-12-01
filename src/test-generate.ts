/**
 * Test script to generate a single-track playlist (Treetop) with merged intro
 */

import { config, isDawTrack } from "./lib/config.ts";
import { generateDawTrack } from "./lib/daw-track.ts";
import { buildVzrFile, writeXmlFile } from "./lib/xml.ts";
import chalk from "chalk";

async function main() {
  const trackName = "MS-Apotheosis";
  const trackConfig = config.tracks[trackName];

  if (!trackConfig) {
    console.error(chalk.red(`Track "${trackName}" not found in config`));
    process.exit(1);
  }

  console.log(chalk.blue(`Generating test playlist with: ${trackName}`));

  const compositions: string[] = [];

  // Generate merged intro + track composition
  if (isDawTrack(trackConfig)) {
    console.log(chalk.gray(`  Generating ${trackConfig.daw} track with 30s intro...`));
    const trackXml = generateDawTrack({
      trackName,
      trackConfig,
      config,
      introDuration: 30, // Short intro for testing
    });
    compositions.push(trackXml);
  }

  // Build and write (use TestTreetopOnly.vzr as template for appData - has proper OSC ports)
  const vzrContent = await buildVzrFile(compositions, "./TestTreetopOnly.vzr");
  const outputFile = "test-apotheosis.vzr";
  await writeXmlFile(outputFile, vzrContent);

  console.log(chalk.green(`\nSaved to: ${outputFile}`));
}

main().catch(console.error);
