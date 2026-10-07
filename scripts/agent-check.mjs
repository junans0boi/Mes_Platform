import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repositoryRoot = resolve(scriptDirectory, "..");

const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "docs/agents/PROJECT_RULES.md",
  "docs/agents/WORKFLOW.md",
  "docs/agents/DEFINITION_OF_DONE.md",
  ".github/ISSUE_TEMPLATE/feature.md",
  ".github/ISSUE_TEMPLATE/architecture.md",
  ".github/ISSUE_TEMPLATE/bug.md",
  ".github/pull_request_template.md",
  "scripts/agent-init.mjs",
  "contracts/openapi.yaml",
  "contracts/realtime-events.md",
];

const failures = [];

for (const relativePath of requiredFiles) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  try {
    await access(absolutePath);
  } catch {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

const readText = async (relativePath) =>
  readFile(resolve(repositoryRoot, relativePath), "utf8");

if (failures.length === 0) {
  const agents = await readText("AGENTS.md");
  const claude = await readText("CLAUDE.md");
  const rules = await readText("docs/agents/PROJECT_RULES.md");

  if (!agents.includes("docs/agents/PROJECT_RULES.md")) {
    failures.push("AGENTS.md does not point to the shared project rules.");
  }
  if (!claude.includes("docs/agents/PROJECT_RULES.md")) {
    failures.push("CLAUDE.md does not point to the shared project rules.");
  }
  if (!rules.includes("Mes_Platform")) {
    failures.push("The shared project rules do not identify the repository.");
  }
}

if (failures.length > 0) {
  console.error("Agent repository check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Agent repository check passed.");
  console.log(`Repository: ${repositoryRoot}`);
  console.log("Entrypoints: AGENTS.md, CLAUDE.md");
}
