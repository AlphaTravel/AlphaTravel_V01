import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : extname(path) === ".tsx" ? [path] : [];
  });
}

const files = [resolve(root, "src/app"), resolve(root, "src/components")].flatMap(filesBelow);

function openings(source: string, tag: string) {
  return [...source.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gs"))].map((match) => match[0]);
}

describe("interactive control wiring", () => {
  it("gives every button an explicit type", () => {
    const invalid = files.flatMap((file) => openings(readFileSync(file, "utf8"), "button")
      .filter((tag) => !tag.includes('type="submit"') && !tag.includes('type="button"'))
      .map((tag) => `${relative(root, file)}: ${tag.slice(0, 100)}`));
    expect(invalid).toEqual([]);
  });

  it("gives every form a server action or submit handler", () => {
    const invalid = files.flatMap((file) => openings(readFileSync(file, "utf8"), "form")
      .filter((tag) => !tag.includes("action=") && !tag.includes("onSubmit="))
      .map((tag) => `${relative(root, file)}: ${tag.slice(0, 100)}`));
    expect(invalid).toEqual([]);
  });

  it("uses POST as the safe fallback for every client-managed form", () => {
    const invalid = files.flatMap((file) => openings(readFileSync(file, "utf8"), "form")
      .filter((tag) => tag.includes("onSubmit=") && !tag.includes('method="post"'))
      .map((tag) => `${relative(root, file)}: ${tag.slice(0, 120)}`));
    expect(invalid).toEqual([]);
  });

  it("gives every Next link and anchor a destination", () => {
    const invalid = files.flatMap((file) => [
      ...openings(readFileSync(file, "utf8"), "Link"),
      ...openings(readFileSync(file, "utf8"), "a"),
    ].filter((tag) => !tag.includes("href=")).map((tag) => `${relative(root, file)}: ${tag.slice(0, 100)}`));
    expect(invalid).toEqual([]);
  });

  it("keeps a non-trivial audited interaction inventory", () => {
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(openings(source, "button").length).toBeGreaterThanOrEqual(40);
    expect(openings(source, "form").length).toBeGreaterThanOrEqual(25);
    expect(openings(source, "Link").length + openings(source, "a").length).toBeGreaterThanOrEqual(40);
  });
});
