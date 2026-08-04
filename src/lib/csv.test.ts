import { describe, expect, it } from "vitest";
import { buildCsv, csvCell } from "./csv";

describe("CSV export safety", () => {
  it.each(["=cmd()", "+SUM(A1:A2)", "-1+2", "@IMPORTDATA(x)"])("neutralizes spreadsheet formulas: %s", (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });

  it("escapes quotes and removes embedded newlines", () => {
    expect(csvCell('Rossi "Mario"\nRoma')).toBe('"Rossi ""Mario"" Roma"');
  });

  it("uses a UTF-8 BOM and semicolon-delimited rows", () => {
    expect(buildCsv([["Nome", "Quota"], ["Mario", 10]])).toBe('\uFEFF"Nome";"Quota"\r\n"Mario";"10"');
  });
});
