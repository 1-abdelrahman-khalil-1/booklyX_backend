import * as deepl from "deepl-node";
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
};

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function generateKeyFromText(text) {
  return text
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase()
    .substring(0, 50);
}

function printUsage() {
  log(`
Usage:
  npm run translate:deepl -- --text "back"
  npm run translate:deepl -- --input ./message.txt
  npm run translate:deepl -- --text "الرجوع" --output ./translated.txt

Output format:
  <arabic text> and <english text>
  Key will be automatically added to en.js, ar.js, and keys.js

Options:
  --text, -t      Text to translate
  --input, -i     Path to input text file
  --output, -o    Path to write translated text (optional)
  --help, -h      Show this help

Environment:
  DEEPL_API_KEY   Your DeepL API key (required)
`);
}

function parseArgs(argv) {
  const args = {
    text: undefined,
    input: undefined,
    output: undefined,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--text" || token === "-t") {
      args.text = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--input" || token === "-i") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--output" || token === "-o") {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

async function resolveInputText({ text, input }) {
  if (typeof text === "string" && text.trim().length > 0) {
    return text;
  }

  if (typeof input === "string" && input.trim().length > 0) {
    const inputPath = path.resolve(process.cwd(), input);
    return fs.readFile(inputPath, "utf8");
  }

  throw new Error("Provide either --text or --input");
}

async function addKeyToFile(filePath, key, value, isKey = false) {
  const content = await fs.readFile(filePath, "utf8");
  const keyPattern = new RegExp(`^\\s*${key}\\s*:`, "m");

  if (keyPattern.test(content)) {
    return false;
  }

  const lines = content.split("\n");

  let insertIndex = -1;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].includes("}") && !lines[i].includes("//")) {
      insertIndex = i;
      break;
    }
  }

  if (insertIndex === -1) {
    throw new Error(`Could not find insertion point in ${filePath}`);
  }

  const indent = "  ";
  const entryLine = isKey
    ? `${indent}${key}: "${key}",`
    : `${indent}${key}: "${value}",`;

  lines.splice(insertIndex, 0, entryLine);

  const updatedContent = lines.join("\n");
  await fs.writeFile(filePath, updatedContent, "utf8");

  return true;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPL_API_KEY in environment");
  }

  const sourceText = (await resolveInputText(args)).trim();
  if (!sourceText) {
    throw new Error("Input text is empty");
  }

  const translator = new deepl.Translator(apiKey);

  const [arResult, enResult] = await Promise.all([
    translator.translateText(sourceText, null, "ar"),
    translator.translateText(sourceText, null, "en-US"),
  ]);

  const arabicText = arResult.text;
  const englishText = enResult.text;
  const output = `${arabicText} and ${englishText}`;

  const generatedKey = generateKeyFromText(sourceText);

  const keysFilePath = path.resolve(
    process.cwd(),
    "src/lib/i18n/keys.js",
  );
  const enFilePath = path.resolve(
    process.cwd(),
    "src/lib/i18n/locales/en.js",
  );
  const arFilePath = path.resolve(
    process.cwd(),
    "src/lib/i18n/locales/ar.js",
  );

  const keyAddedInKeys = await addKeyToFile(
    keysFilePath,
    generatedKey,
    null,
    true,
  );
  const keyAddedInEn = await addKeyToFile(enFilePath, generatedKey, englishText);
  const keyAddedInAr = await addKeyToFile(arFilePath, generatedKey, arabicText);

  if (args.output) {
    const outputPath = path.resolve(process.cwd(), args.output);
    await fs.writeFile(outputPath, `${output}\n`, "utf8");
    log(`Translated text written to ${outputPath}`);
  } else {
    log(output);
  }

  if (keyAddedInKeys || keyAddedInEn || keyAddedInAr) {
    log(
      `\n${colors.bright}${colors.green}✓ Key added to i18n files:${colors.reset}`,
    );
  } else {
    log(
      `\n${colors.bright}${colors.yellow}! Key already exists, no changes made:${colors.reset}`,
    );
  }

  log(`${colors.bright}${colors.cyan}${generatedKey}${colors.reset}`);
}

run().catch((error) => {
  log(`${colors.bright}${colors.yellow}Error: ${error.message}${colors.reset}`);
  printUsage();
  process.exit(1);
});
