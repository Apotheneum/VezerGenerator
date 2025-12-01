import { mkdir } from "fs/promises";
import { join, basename } from "path";
import chalk from "chalk";
import { extractCompositionsFromFile, writeXmlFile } from "../lib/xml.ts";

/**
 * Sanitize a filename by removing/replacing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim();
}

export async function extractCommand(
  inputFile: string,
  outputDir: string
): Promise<void> {
  console.log(chalk.blue(`Extracting compositions from: ${inputFile}`));

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Extract compositions
  const { compositions, appData } = await extractCompositionsFromFile(inputFile);

  console.log(chalk.green(`Found ${compositions.length} compositions`));

  // Write each composition to a separate file
  for (const comp of compositions) {
    const filename = sanitizeFilename(comp.name) + ".xml";
    const filePath = join(outputDir, filename);
    await writeXmlFile(filePath, comp.xml);
    console.log(chalk.gray(`  -> ${filename}`));
  }

  // Write appData if present
  if (appData) {
    const appDataPath = join(outputDir, "_appData.xml");
    await writeXmlFile(appDataPath, appData);
    console.log(chalk.gray(`  -> _appData.xml`));
  }

  console.log(chalk.green(`\nExtracted to: ${outputDir}`));
}
