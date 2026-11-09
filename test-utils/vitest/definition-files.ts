import { existsSync, readdirSync } from "node:fs";

/**
 * Checks for folders that hold one definition per file, named after it: kinds of notification in
 * `notifications/` (`defineNotification`) and Redis models in `redis/models/` (`defineRedisModel`).
 */

const pascalCase = (kebab: string) => kebab.replace(/(^|-)([a-z0-9])/g, (_, __, char: string) => char.toUpperCase());

/** The `.ts` files in a definition folder, or none while the folder holds no definitions. */
export function definitionFiles(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".ts") && !file.includes(".test.")) : [];
}

/**
 * What breaks the layout in a file named `file` with this source: a kebab-case `.ts` name, `import
 * "server-only"` first, and exactly one `export const <Name><suffix> = define(...)("<file name>", …)`.
 */
export function definitionFileViolations(
  file: string,
  source: string,
  { define, exportSuffix = "" }: { define: string; exportSuffix?: string },
): string[] {
  const name = file.replace(/\.ts$/, "");
  const found: string[] = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*\.ts$/.test(file)) found.push("the file name must be kebab-case .ts");
  if (!/^import "server-only";/.test(source.trimStart())) found.push('the file must start with import "server-only"');
  const definitions = [...source.matchAll(new RegExp(`export const (\\w+) = ${define}(?:<[^>]*>)?\\(\\s*"([^"]*)"`, "g"))];
  const calls = source.match(new RegExp(`${define}[(<]`, "g")) ?? [];
  const exportName = pascalCase(name) + exportSuffix;
  if (calls.length !== 1 || definitions.length !== 1) {
    found.push(`the file must export exactly one definition as \`export const ${exportName} = ${define}("${name}", …)\``);
  } else {
    const [, exported, definedName] = definitions[0];
    if (definedName !== name) found.push(`the name must match the file name: "${name}"`);
    if (exported !== exportName) found.push(`the export must be named ${exportName}`);
  }
  return found;
}
