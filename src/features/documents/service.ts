import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { assert } from '@/lib/errors';
import { formatCHF } from '@/lib/money';
export type PrintableProduct = {
  name: string;
  unit: string;
  category: string;
  priceCents: number;
  available: boolean;
};
const width = 595.28,
  height = 841.89,
  ink = rgb(0.06, 0.1, 0.07),
  muted = rgb(0.35, 0.4, 0.36),
  green = rgb(0.25, 0.4, 0.24);
let fontBytes: Promise<Buffer> | undefined;
async function document() {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(
    await (fontBytes ??= readFile(path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'))),
    { subset: true },
  );
  pdf.setTitle('Falcons — Kiosque de section');
  return { pdf, font };
}
function text(
  page: PDFPage,
  font: PDFFont,
  value: string,
  x: number,
  y: number,
  size = 11,
  color = ink,
) {
  page.drawText(value, { font, x, y, size, color });
}
function wrap(value: string, font: PDFFont, size: number, max: number) {
  const lines: string[] = [];
  let line = '';
  for (const char of value) {
    if (font.widthOfTextAtSize(line + char, size) > max) {
      lines.push(line);
      line = '';
    }
    line += char;
  }
  if (line) lines.push(line);
  return lines;
}
export async function buildCatalogPdf(products: PrintableProduct[]): Promise<Uint8Array> {
  const { pdf, font } = await document();
  let page: PDFPage;
  let y = 0;
  let pageNumber = 0;
  const nextPage = () => {
    page = pdf.addPage([width, height]);
    pageNumber++;
    text(page, font, 'FALCONS / KIOSQUE DE SECTION', 40, 794, 20);
    text(page, font, 'Produits et prix', 40, 769, 14);
    text(
      page,
      font,
      `Édité le ${new Date().toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })}`,
      40,
      748,
      9,
      muted,
    );
    page.drawLine({
      start: { x: 40, y: 735 },
      end: { x: 555, y: 735 },
      color: green,
      thickness: 1.5,
    });
    text(page, font, 'PRODUIT / UNITÉ', 40, 715, 9);
    text(page, font, 'PRIX', 390, 715, 9);
    text(page, font, 'DISPONIBILITÉ', 455, 715, 9);
    text(
      page,
      font,
      'Enregistre tes produits dans l’application avant de les prendre.',
      40,
      39,
      8,
      muted,
    );
    text(page, font, String(pageNumber), 540, 39, 9, muted);
    y = 691;
  };
  nextPage();
  let category = '';
  for (const product of [...products].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  )) {
    const names = wrap(`${product.name} · ${product.unit}`, font, 11, 330);
    const rowHeight = Math.max(34, names.length * 15 + 15);
    if (y - rowHeight - (category !== product.category ? 25 : 0) < 70) {
      nextPage();
      category = '';
    }
    if (category !== product.category) {
      category = product.category;
      text(page!, font, category.toUpperCase(), 40, y, 11, green);
      y -= 25;
    }
    names.forEach((line, i) => text(page!, font, line, 40, y - i * 15));
    text(page!, font, formatCHF(product.priceCents), 390, y, 10);
    text(page!, font, product.available ? 'Disponible' : 'Indisponible', 455, y, 9, muted);
    y -= rowHeight;
    page!.drawLine({
      start: { x: 40, y: y + 10 },
      end: { x: 555, y: y + 10 },
      color: rgb(0.8, 0.82, 0.8),
      thickness: 0.4,
    });
  }
  if (!products.length) text(page!, font, 'Aucun produit actif pour le moment.', 40, y, 12);
  return pdf.save();
}
export async function buildAccessPdf(canonicalUrl: string): Promise<Uint8Array> {
  assert(canonicalUrl, 'Configure l’adresse publique du kiosque avant de générer le QR.');
  let url: URL;
  try {
    url = new URL(canonicalUrl);
  } catch {
    throw new Error('URL du kiosque invalide.');
  }
  assert(url.protocol === 'https:', 'L’adresse du kiosque doit utiliser HTTPS.');
  assert(
    !url.username && !url.password && !url.hash && !url.search,
    'Utilise une adresse publique sans identifiant ni paramètre.',
  );
  const { pdf, font } = await document();
  const page = pdf.addPage([width, height]);
  text(page, font, 'FALCONS', 40, 780, 38);
  text(page, font, 'LE KIOSQUE DE LA SECTION', 40, 747, 16, green);
  text(page, font, 'Scanne. Inscris-toi. Enregistre ce que tu prends.', 40, 703, 13);
  const qr = await QRCode.toBuffer(url.href, {
    type: 'png',
    width: 1100,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  const image = await pdf.embedPng(qr);
  page.drawImage(image, { x: 117.6, y: 285, width: 360, height: 360 });
  wrap(url.href, font, 12, 515).forEach((line, i) => text(page, font, line, 40, 249 - i * 18, 12));
  text(page, font, 'Ajoute aussi l’application à l’écran d’accueil de ton téléphone.', 40, 174, 11);
  text(
    page,
    font,
    'Ce code ouvre le kiosque. Les règlements TWINT restent séparés.',
    40,
    146,
    10,
    muted,
  );
  text(
    page,
    font,
    `Affiche générée le ${new Date().toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })}`,
    40,
    50,
    9,
    muted,
  );
  return pdf.save();
}
export function toCsv(headers: string[], rows: unknown[][]) {
  const escape = (value: unknown) => {
    let s = value == null ? '' : String(value);
    if (typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [headers, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
}
