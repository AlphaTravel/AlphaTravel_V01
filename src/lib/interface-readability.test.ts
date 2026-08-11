import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const statusBadge = readFileSync(resolve(process.cwd(), "src/components/status-badge.tsx"), "utf8");

describe("interface readability", () => {
  it("never uses an explicit font size below 12px", () => {
    const tooSmall = styles.match(/font-size:\s*(?:[0-9](?:\.[0-9]+)?|1[01](?:\.[0-9]+)?)px/g) ?? [];
    expect(tooSmall).toEqual([]);
  });

  it("keeps status labels at least 12px", () => {
    expect(statusBadge).toContain("text-[12px]");
    expect(statusBadge).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/);
  });
});
