/**
 * gen-pdf.mjs - prints the generated handbook to a PDF through Chrome, so the PDF is the
 * real page (layout, colours, icons) rather than a re-typeset copy.
 *
 *   node tools/handbook/gen-handbook.mjs /tmp/handbook.html
 *   PW_CORE=/path/to/node_modules/playwright-core node tools/handbook/gen-pdf.mjs /tmp/handbook.html City-Siege-Handbook.pdf
 *
 * playwright-core is NOT a project dependency; point PW_CORE at any install of it, and have
 * Google Chrome installed. The print rules below matter: the handbook's building cards and
 * 13-column matrices are wider than A4, so cards go full width and the wide tables scale down.
 */
import fs from 'fs';
import path from 'path';

const PW = process.env.PW_CORE;
if (!PW) { console.error('Set PW_CORE to a playwright-core install directory.'); process.exit(2); }
const SRC = process.argv[2];
const OUT = process.argv[3] || 'City-Siege-Handbook.pdf';
if (!SRC || !fs.existsSync(SRC)) { console.error('Usage: gen-pdf.mjs <handbook.html> [out.pdf]'); process.exit(2); }
const { chromium } = await import(path.join(PW, 'index.mjs'));

const PRINT_CSS = `
@page { size: A4; margin: 12mm 10mm 14mm; }
@media print {
  nav.toc { display: none !important; }                        /* a sticky sidebar is meaningless on paper */
  .wrap { display: block !important; max-width: none !important; padding: 0 !important; }
  body { padding-inline: 0 !important; }
  h1 { font-size: 32px; }
  h2 { break-before: page; break-after: avoid; margin-top: 0; padding-top: 0; }
  h2#rules { break-before: avoid; }
  h3, .thhead { break-after: avoid; }
  .rule, .fx, .bcard, .tbl, .note, .steps li { break-inside: avoid; }
  .formulas, .rules { grid-template-columns: 1fr 1fr !important; gap: 8px; }
  .cards { grid-template-columns: 1fr !important; gap: 8px; }  /* full width: the 12-level strips must fit */
  .bcard { font-size: 11px; padding: 10px; gap: 7px; }
  .bcard h3 { font-size: 14px; }
  .bicon { width: 32px; height: 32px; font-size: 19px; }
  .mech, .helps { font-size: 10.6px; }
  .facts { font-size: 10.2px; grid-template-columns: repeat(4, minmax(0,1fr)); }
  .tbl { overflow: visible !important; border-radius: 6px; }   /* print the whole table, not a scroll window */
  table { width: 100%; font-size: 9px; }
  th, td { padding: 3px 5px; }
  .strip { font-size: 8.2px; }
  .strip th, .strip td { padding: 2px 3px; }
  .matrix { font-size: 7.6px; }                                 /* 13 columns has to fit A4 */
  .matrix th, .matrix td { padding: 2px 3px; }
  #ladder ~ .tbl table { font-size: 8px; }
  #ladder ~ .tbl td:nth-child(3) { max-width: 190px; }          /* let the blueprint chips wrap */
  .chip { font-size: 8px; padding: 0 5px; }
  a { color: inherit; text-decoration: none; }
  footer { break-before: avoid; }
}`;

// gen-handbook.mjs writes a body fragment (the artifact host supplies the skeleton), so wrap it.
const page_html = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>:root{color-scheme:light} body{margin:0;font:14px system-ui,sans-serif;background:#fff} img{max-width:100%}</style>
</head><body>${fs.readFileSync(SRC, 'utf8')}<style>${PRINT_CSS}</style></body></html>`;
const tmp = SRC.replace(/\.html$/, '') + '.print.html';
fs.writeFileSync(tmp, page_html);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext()).newPage();
await page.goto('file://' + path.resolve(tmp), { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print', colorScheme: 'light' });
await page.waitForTimeout(1200);                                 // let the web fonts land
await page.pdf({
  path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="width:100%;font:8px system-ui;color:#777;padding:0 11mm;display:flex;justify-content:space-between">
     <span>City Siege Handbook</span><span class="pageNumber"></span></div>`,
});
await browser.close();
fs.unlinkSync(tmp);
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
