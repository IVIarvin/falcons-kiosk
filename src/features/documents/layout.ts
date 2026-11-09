import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { appName, appWordmark, sectionName } from '@/lib/brand';

export const pageSize = { width: 595.28, height: 841.89 };
export const palette = {
  dark: rgb(9 / 255, 13 / 255, 11 / 255),
  accent: rgb(143 / 255, 231 / 255, 129 / 255),
  ink: rgb(0.07, 0.12, 0.08),
  muted: rgb(0.35, 0.41, 0.36),
  line: rgb(0.83, 0.87, 0.84),
  wash: rgb(0.94, 0.97, 0.94),
  green: rgb(0.19, 0.37, 0.2),
  white: rgb(1, 1, 1),
};
export type PrintFonts = { body: PDFFont; strong: PDFFont; display: PDFFont };
const bytes = new Map<string, Promise<Buffer>>();
export async function createPrintDocument(title: string) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const embed = async (name: string) => {
    if (!bytes.has(name)) bytes.set(name, readFile(path.join(process.cwd(), 'public/fonts', name)));
    return pdf.embedFont(await bytes.get(name)!, { subset: true });
  };
  const [body, strong, display] = await Promise.all([
    embed('Barlow-Regular.ttf'),
    embed('Barlow-SemiBold.ttf'),
    embed('Rajdhani-SemiBold.ttf'),
  ]);
  pdf.setTitle(title);
  pdf.setAuthor(sectionName);
  pdf.setCreator(appName);
  return { pdf, fonts: { body, strong, display } };
}
export function drawText(
  page: PDFPage,
  font: PDFFont,
  value: string,
  x: number,
  y: number,
  size = 12,
  color = palette.ink,
) {
  page.drawText(value, { font, x, y, size, color });
}
export function rightText(
  page: PDFPage,
  font: PDFFont,
  value: string,
  right: number,
  y: number,
  size = 12,
  color = palette.ink,
) {
  drawText(page, font, value, right - font.widthOfTextAtSize(value, size), y, size, color);
}
export function wrap(value: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of value.replace(/\s+/g, ' ').trim().split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const char of word) {
      if (line && font.widthOfTextAtSize(line + char, size) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}
export function brand(page: PDFPage, fonts: PrintFonts) {
  page.drawSvgPath('M5 9h54L45 23H25L12 34l12-2-9 25 25-29H29l9-7H19z', {
    x: 38,
    y: 807,
    scale: 0.58,
    color: palette.accent,
  });
  drawText(page, fonts.display, appWordmark, 86, 780, 32, palette.white);
  rightText(page, fonts.strong, 'KIOSQUE DES FALCONS', 555, 788, 10, palette.accent);
}
export function footer(page: PDFPage, fonts: PrintFonts, pageNumber?: number) {
  page.drawLine({
    start: { x: 40, y: 50 },
    end: { x: 555, y: 50 },
    thickness: 0.6,
    color: palette.line,
  });
  const date = new Date().toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' });
  drawText(page, fonts.body, `${appWordmark} / ${date}`, 40, 31, 9, palette.muted);
  if (pageNumber) rightText(page, fonts.body, String(pageNumber), 555, 31, 10, palette.muted);
}
