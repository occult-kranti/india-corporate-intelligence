/**
 * CSV export, built in the page: a Blob and a temporary download link. No fetch, no
 * dependency, so it works from any static host.
 *
 * The cells are research text written by agents. A spreadsheet executes a cell that
 * begins with = + - @ (or a tab or carriage return) as a formula, so every such cell
 * is prefixed with an apostrophe. UTF-8 with a BOM, so spreadsheets read ₹ and names
 * in Indian scripts; RFC 4180 quoting.
 */

const FORMULA = /^[=+\-@\t\r]/;

function cell(v: string): string {
  // A newline inside a cell survives quoting, but a header line beginning "#" must
  // stay distinguishable from data for readers that split on lines, so flatten.
  let s = v.replace(/\r?\n/g, ' ');
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(comments: string[], columns: string[], rows: string[][]): string {
  const head = comments.map((c) => `# ${c.replace(/\r?\n/g, ' ')}`);
  const body = [columns, ...rows].map((r) => r.map(cell).join(','));
  return '﻿' + [...head, ...body].join('\n') + '\n';
}

export function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
