import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sceneDirectory = resolve("src/features/keyboard/scene");

function hasRuntimeDependency(statement: ts.ImportDeclaration | ts.ExportDeclaration) {
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    if (!clause) return true;
    if (clause.isTypeOnly) return false;
    if (clause.name) return true;
    if (!clause.namedBindings || ts.isNamespaceImport(clause.namedBindings)) return true;
    return clause.namedBindings.elements.some((binding) => !binding.isTypeOnly);
  }

  if (statement.isTypeOnly) return false;
  if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) return true;
  return statement.exportClause.elements.some((binding) => !binding.isTypeOnly);
}

describe("keyboard scene module graph", () => {
  it("has no runtime import cycles", () => {
    const files = readdirSync(sceneDirectory).filter((file) => /\.tsx?$/.test(file)).sort();
    const modules = new Map(files.map((file) => {
      const path = resolve(sceneDirectory, file);
      return [path.slice(0, -extname(path).length), file] as const;
    }));
    const graph = new Map<string, string[]>();

    for (const file of files) {
      const path = resolve(sceneDirectory, file);
      const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
      const dependencies: string[] = [];

      for (const statement of source.statements) {
        if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement))
          || !statement.moduleSpecifier
          || !ts.isStringLiteral(statement.moduleSpecifier)
          || !statement.moduleSpecifier.text.startsWith(".")) continue;
        if (!hasRuntimeDependency(statement)) continue;

        const target = modules.get(resolve(dirname(path), statement.moduleSpecifier.text));
        if (target) dependencies.push(target);
      }
      graph.set(file, dependencies);
    }

    const visited = new Set<string>();
    const active = new Set<string>();
    const stack: string[] = [];
    const cycles: string[][] = [];
    const visit = (file: string) => {
      visited.add(file);
      active.add(file);
      stack.push(file);
      for (const dependency of graph.get(file) ?? []) {
        if (active.has(dependency)) {
          cycles.push([...stack.slice(stack.indexOf(dependency)), dependency]);
        } else if (!visited.has(dependency)) {
          visit(dependency);
        }
      }
      stack.pop();
      active.delete(file);
    };

    for (const file of files) if (!visited.has(file)) visit(file);

    expect(cycles, cycles.map((cycle) => cycle.join(" -> ")).join("\n")).toEqual([]);
  });
});
