import { readFile } from "fs/promises";
import chalk from "chalk";
import inquirer from "inquirer";
import { config, isDawTrack, isVezerTrack, type TrackConfig } from "../lib/config.ts";
import { generateIntro } from "../lib/intro.ts";
import { generateDawTrack } from "../lib/daw-track.ts";
import { buildVzrFile, writeXmlFile } from "../lib/xml.ts";

interface TrackChoice {
  name: string;
  config: TrackConfig;
}

export async function generateCommand(
  outputFile: string
): Promise<void> {
  console.log(chalk.blue("Available tracks:\n"));

  // Build choices from config
  const trackNames = Object.keys(config.tracks);

  if (trackNames.length === 0) {
    console.log(chalk.red("No tracks defined in config!"));
    return;
  }

  const choices: TrackChoice[] = trackNames.map((name) => ({
    name,
    config: config.tracks[name],
  }));

  // Display track info
  choices.forEach((c) => {
    const type = c.config.type === "daw"
      ? chalk.cyan(`[${c.config.daw}]`)
      : chalk.magenta("[vezer]");
    console.log(`  ${type} ${c.name}`);
  });
  console.log();

  // Step 1: Select tracks
  const { selected } = await inquirer.prompt<{ selected: TrackChoice[] }>([
    {
      type: "checkbox",
      name: "selected",
      message: "Select tracks to include:",
      choices: choices.map((c) => ({
        name: `${c.name} (${c.config.type})`,
        value: c,
        checked: false,
      })),
      validate: (answer) => {
        if (answer.length === 0) {
          return "You must select at least one track.";
        }
        return true;
      },
    },
  ]);

  if (selected.length === 0) {
    console.log(chalk.yellow("No tracks selected. Exiting."));
    return;
  }

  // Step 2: Reorder tracks
  console.log(chalk.blue("\nCurrent order:"));
  selected.forEach((c, i) => console.log(chalk.gray(`  ${i + 1}. ${c.name}`)));

  const { reorder } = await inquirer.prompt<{ reorder: boolean }>([
    {
      type: "confirm",
      name: "reorder",
      message: "Would you like to reorder the tracks?",
      default: false,
    },
  ]);

  let orderedTracks = selected;

  if (reorder) {
    const { newOrder } = await inquirer.prompt<{ newOrder: string }>([
      {
        type: "input",
        name: "newOrder",
        message: "Enter the new order as comma-separated numbers (e.g., 3,1,2):",
        validate: (input) => {
          const nums = input.split(",").map((s: string) => parseInt(s.trim(), 10));
          if (nums.some(isNaN)) {
            return "Please enter valid numbers.";
          }
          if (nums.length !== selected.length) {
            return `Please enter exactly ${selected.length} numbers.`;
          }
          const sorted = [...nums].sort((a, b) => a - b);
          const expected = Array.from({ length: selected.length }, (_, i) => i + 1);
          if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
            return `Please use each number from 1 to ${selected.length} exactly once.`;
          }
          return true;
        },
      },
    ]);

    const indices = newOrder.split(",").map((s) => parseInt(s.trim(), 10) - 1);
    orderedTracks = indices.map((i) => selected[i]);

    console.log(chalk.blue("\nNew order:"));
    orderedTracks.forEach((c, i) => console.log(chalk.gray(`  ${i + 1}. ${c.name}`)));
  }

  // Step 3: Set intro duration
  const { introDuration } = await inquirer.prompt<{ introDuration: number }>([
    {
      type: "number",
      name: "introDuration",
      message: "Intro duration (seconds):",
      default: config.defaultIntroDuration,
    },
  ]);

  // Step 4: Get output filename if not provided
  let finalOutputFile = outputFile;
  if (!finalOutputFile) {
    const { filename } = await inquirer.prompt<{ filename: string }>([
      {
        type: "input",
        name: "filename",
        message: "Output filename:",
        default: "playlist.vzr",
      },
    ]);
    finalOutputFile = filename;
  }

  // Ensure .vzr extension
  if (!finalOutputFile.endsWith(".vzr")) {
    finalOutputFile += ".vzr";
  }

  // Step 5: Build playlist
  console.log(chalk.blue("\nBuilding playlist..."));

  const compositions: string[] = [];

  for (const track of orderedTracks) {
    if (isDawTrack(track.config)) {
      // DAW tracks: generate merged intro + track composition
      console.log(chalk.gray(`  Generating ${track.config.daw} track with intro: ${track.name}...`));
      const trackXml = generateDawTrack({
        trackName: track.name,
        trackConfig: track.config,
        config,
        introDuration,
      });
      compositions.push(trackXml);
    } else if (isVezerTrack(track.config)) {
      // Vezér tracks: separate intro + loaded composition
      console.log(chalk.gray(`  Generating intro for ${track.name}...`));
      const introXml = generateIntro({
        trackName: track.name,
        trackConfig: track.config,
        config,
        introDuration,
      });
      compositions.push(introXml);

      console.log(chalk.gray(`  Loading Vezér track: ${track.name}...`));
      const trackXml = await readFile(track.config.composition, "utf-8");
      compositions.push(trackXml);
    }
  }

  // Build and write the file (use TestTreetopOnly.vzr as template - has proper OSC ports)
  const vzrContent = await buildVzrFile(compositions, "./TestTreetopOnly.vzr");
  await writeXmlFile(finalOutputFile, vzrContent);

  console.log(chalk.green(`\nPlaylist saved to: ${finalOutputFile}`));
  console.log(chalk.gray(`Contains ${compositions.length} compositions`));
}
