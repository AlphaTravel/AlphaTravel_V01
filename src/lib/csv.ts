export function csvCell(value: string | number) {
  let rendered = String(value).replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(rendered)) rendered = `'${rendered}`;
  return `"${rendered.replace(/"/g, '""')}"`;
}

export function buildCsv(lines: Array<Array<string | number>>) {
  return `\uFEFF${lines.map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
}
