import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repositoryRoot = resolve(scriptDirectory, "..");

const directories = [
  "docs/agents",
  "docs/reverse-engineering/frontend",
  "docs/specs/frontend",
  "docs/maps",
  "docs/decisions",
  "docs/tickets",
  ".github/ISSUE_TEMPLATE",
];

for (const relativePath of directories) {
  await mkdir(resolve(repositoryRoot, relativePath), { recursive: true });
}

console.log("Mes Platform agent workspace initialized.");
console.log("Read AGENTS.md or CLAUDE.md, then follow docs/agents/WORKFLOW.md.");
console.log("Run node scripts/agent-check.mjs to validate the repository bootstrap.");
