import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("interface organization", () => {
  it("separates trip organization into four focused sections", () => {
    const manager = read("src/components/trip-logistics-manager.tsx");
    for (const section of ["participants", "rooms", "transport", "schedule"]) {
      expect(manager).toContain(`activeSection === "${section}"`);
      expect(manager).toContain(`key: "${section}"`);
    }
    expect(manager.match(/<form\b/g)).toHaveLength(8);
  });

  it("retires the duplicate operations page and keeps alerts on the trip flow", () => {
    const operations = read("src/app/(app)/operazioni/page.tsx");
    const dashboard = read("src/app/(app)/dashboard/page.tsx");
    expect(operations).toContain('redirect("/viaggi")');
    expect(dashboard).not.toContain('href: "/operazioni"');
  });

  it("uses explicit labels for the pilgrim organization data", () => {
    const table = read("src/components/pilgrim-table.tsx");
    expect(table).toContain("<th>Camera e posto</th>");
    expect(table).not.toContain("<th>Organizzazione</th>");
  });
});
