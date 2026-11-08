import type { PDFPage } from 'pdf-lib';
import { formatCHF } from '@/lib/money';
import { productCategories, unclassifiedCategory } from '@/features/catalog/categories';
import {
  brand,
  createPrintDocument,
  drawText,
  footer,
  pageSize,
  palette,
  rightText,
  wrap,
} from './layout';

export type PrintableProduct = {
  name: string;
  unit: string;
  category: string;
  priceCents: number;
  available: boolean;
};
export async function buildCatalogPdf(products: PrintableProduct[]): Promise<Uint8Array> {
  const { pdf, fonts } = await createPrintDocument('Falcons - Catalogue du kiosque');
  let page: PDFPage;
  let y = 0;
  let category = '';
  let pageNumber = 0;
  const newPage = () => {
    page = pdf.addPage([pageSize.width, pageSize.height]);
    page.drawRectangle({ x: 0, y: 696, width: pageSize.width, height: 146, color: palette.dark });
    brand(page, fonts);
    drawText(page, fonts.display, 'Le catalogue', 40, 729, 34, palette.white);
    drawText(page, fonts.body, 'Prix par article', 40, 708, 11, palette.accent);
    drawText(page, fonts.strong, 'PRODUIT', 40, 672, 10, palette.muted);
    rightText(page, fonts.strong, 'PRIX CHF', 555, 672, 10, palette.muted);
    footer(page, fonts, ++pageNumber);
    y = 650;
    category = '';
  };
  newPage();
  const order = [...productCategories.map((c) => c.label), unclassifiedCategory] as string[];
  const sorted = products
    .map((p) => ({
      ...p,
      category: order.includes(p.category) ? p.category : unclassifiedCategory,
    }))
    .sort(
      (a, b) =>
        order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name, 'fr'),
    );
  for (const product of sorted) {
    const names = wrap(product.name, fonts.strong, 13, 350);
    const unit = product.unit && product.unit !== 'pièce' ? product.unit : '';
    const units = unit ? wrap(unit, fonts.body, 10, 350) : [];
    const rowHeight = Math.max(38, names.length * 17 + units.length * 13 + 14);
    if (y - rowHeight - (category === product.category ? 0 : 38) < 68) newPage();
    if (category !== product.category) {
      category = product.category;
      page!.drawRectangle({ x: 40, y: y - 25, width: 515, height: 27, color: palette.wash });
      drawText(page!, fonts.display, category.toUpperCase(), 51, y - 17, 17, palette.green);
      y -= 38;
    }
    names.forEach((line, i) => drawText(page!, fonts.strong, line, 40, y - 14 - i * 17, 13));
    units.forEach((line, i) =>
      drawText(page!, fonts.body, line, 40, y - 14 - names.length * 17 - i * 13, 10, palette.muted),
    );
    rightText(page!, fonts.display, formatCHF(product.priceCents), 555, y - 18, 21);
    y -= rowHeight;
    page!.drawLine({
      start: { x: 40, y: y + 4 },
      end: { x: 555, y: y + 4 },
      thickness: 0.45,
      color: palette.line,
    });
  }
  if (!sorted.length)
    drawText(page!, fonts.body, 'Le catalogue se prépare.', 40, 625, 14, palette.muted);
  return pdf.save();
}
