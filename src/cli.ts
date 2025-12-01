#!/usr/bin/env node
import { program } from "commander";
import { extractCommand } from "./commands/extract.ts";
import { generateCommand } from "./commands/generate.ts";
import { manageCommand } from "./commands/manage.ts";

program
  .name("vezer-parser")
  .description("CLI tool to generate Vezér playlists")
  .version("1.0.0");

program
  .command("extract")
  .description("Extract Vezér-native compositions from a .vzr file")
  .argument("<input>", "Input .vzr file")
  .option("-o, --output-dir <dir>", "Output directory", "./compositions")
  .action(async (input: string, options: { outputDir: string }) => {
    try {
      await extractCommand(input, options.outputDir);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("generate")
  .description("Generate a new .vzr playlist (interactive)")
  .option("-o, --output <file>", "Output .vzr file")
  .action(async (options: { output?: string }) => {
    try {
      await generateCommand(options.output || "");
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("manage")
  .description("Manage track library")
  .action(async () => {
    try {
      await manageCommand();
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
