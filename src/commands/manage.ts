import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { config, isDawTrack, isVezerTrack } from "../lib/config.ts";

const COMPOSITIONS_DIR = "./compositions";

interface CompositionFile {
  name: string;
  path: string;
  size: number;
}

async function listCompositions(): Promise<CompositionFile[]> {
  try {
    const files = await readdir(COMPOSITIONS_DIR);
    const xmlFiles = files.filter((f) => f.endsWith(".xml") && !f.startsWith("_"));

    const compositions: CompositionFile[] = [];
    for (const file of xmlFiles) {
      const filePath = join(COMPOSITIONS_DIR, file);
      const stats = await stat(filePath);
      compositions.push({
        name: file.replace(".xml", ""),
        path: filePath,
        size: stats.size,
      });
    }

    return compositions.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function manageCommand(): Promise<void> {
  while (true) {
    console.log(chalk.blue("\n=== Track Library Manager ===\n"));

    // Show config tracks
    console.log(chalk.cyan("Configured tracks:"));
    const trackNames = Object.keys(config.tracks);
    if (trackNames.length === 0) {
      console.log(chalk.gray("  No tracks in config"));
    } else {
      for (const name of trackNames) {
        const track = config.tracks[name];
        if (isDawTrack(track)) {
          console.log(chalk.gray(`  [${track.daw}] ${name} (${track.duration}s)`));
        } else if (isVezerTrack(track)) {
          console.log(chalk.gray(`  [vezer] ${name} -> ${track.composition}`));
        }
      }
    }

    // Show composition files
    console.log(chalk.cyan("\nComposition files:"));
    const compositions = await listCompositions();
    if (compositions.length === 0) {
      console.log(chalk.gray("  No composition files found"));
    } else {
      for (const comp of compositions) {
        // Check if this composition is referenced in config
        const isReferenced = Object.values(config.tracks).some(
          (t) => isVezerTrack(t) && t.composition.includes(comp.name)
        );
        const refMarker = isReferenced ? chalk.green("✓") : chalk.yellow("○");
        console.log(chalk.gray(`  ${refMarker} ${comp.name} (${formatSize(comp.size)})`));
      }
    }

    console.log(chalk.gray("\n  ✓ = referenced in config, ○ = not referenced\n"));

    // Menu
    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Delete composition files", value: "delete" },
          { name: "Refresh list", value: "refresh" },
          { name: "Exit", value: "exit" },
        ],
      },
    ]);

    if (action === "exit") {
      break;
    }

    if (action === "refresh") {
      continue;
    }

    if (action === "delete") {
      if (compositions.length === 0) {
        console.log(chalk.yellow("No composition files to delete."));
        continue;
      }

      const { toDelete } = await inquirer.prompt<{ toDelete: string[] }>([
        {
          type: "checkbox",
          name: "toDelete",
          message: "Select compositions to delete:",
          choices: compositions.map((c) => ({
            name: `${c.name} (${formatSize(c.size)})`,
            value: c.path,
          })),
        },
      ]);

      if (toDelete.length === 0) {
        console.log(chalk.yellow("No files selected."));
        continue;
      }

      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: "confirm",
          name: "confirm",
          message: `Delete ${toDelete.length} file(s)?`,
          default: false,
        },
      ]);

      if (confirm) {
        for (const filePath of toDelete) {
          await unlink(filePath);
          console.log(chalk.red(`  Deleted: ${filePath}`));
        }
        console.log(chalk.green(`\nDeleted ${toDelete.length} file(s).`));
      }
    }
  }

  console.log(chalk.blue("\nGoodbye!"));
}
