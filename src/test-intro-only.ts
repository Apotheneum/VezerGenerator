/**
 * Test script to generate a project with ONLY an intro track
 * This validates that our template-based appData extraction works
 */

import { config } from "./lib/config.ts";
import { generateIntro } from "./lib/intro.ts";
import { buildVzrFile, writeXmlFile } from "./lib/xml.ts";
import chalk from "chalk";

async function main() {
  const trackName = "DO-Treetop";
  const trackConfig = config.tracks[trackName];

  if (!trackConfig) {
    console.error(chalk.red(`Track "${trackName}" not found in config`));
    process.exit(1);
  }

  console.log(chalk.blue(`Generating intro-only test for: ${trackName}`));

  // Generate just the intro (no main track)
  console.log(chalk.gray("  Generating intro..."));
  const introXml = generateIntro({
    trackName,
    trackConfig,
    config,
    introDuration: 30, // Short intro for testing
  });

  const compositions = [introXml];

  // Build and write (use TestTreetopOnly.vzr as template for appData - has proper OSC ports)
  console.log(chalk.gray("  Building .vzr file with template appData..."));
  const vzrContent = await buildVzrFile(compositions, "./TestTreetopOnly.vzr");
  const outputFile = "test-intro-only.vzr";
  await writeXmlFile(outputFile, vzrContent);

  console.log(chalk.green(`\nSaved to: ${outputFile}`));
  console.log(chalk.gray("Try opening this in Vezér to verify it works."));
}

main().catch(console.error);
