import QRCode from 'qrcode';
import { assert } from '@/lib/errors';
import { appName } from '@/lib/brand';
import { brand, createPrintDocument, drawText, footer, pageSize, palette } from './layout';

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
  const { pdf, fonts } = await createPrintDocument(`${appName} - Accès au kiosque`);
  const page = pdf.addPage([pageSize.width, pageSize.height]);
  page.drawRectangle({ x: 0, y: 602, width: pageSize.width, height: 240, color: palette.dark });
  brand(page, fonts);
  drawText(page, fonts.display, 'Le kiosque,', 40, 722, 45, palette.white);
  drawText(page, fonts.display, 'dans ta poche.', 40, 675, 45, palette.white);
  drawText(page, fonts.body, 'Scanne pour ouvrir.', 40, 643, 14, palette.accent);
  const qr = await QRCode.toBuffer(url.href, {
    type: 'png',
    width: 1400,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  const image = await pdf.embedPng(qr);
  page.drawRectangle({
    x: 107.64,
    y: 236,
    width: 380,
    height: 380,
    color: palette.white,
    borderColor: palette.line,
    borderWidth: 0.7,
  });
  page.drawImage(image, { x: 119.64, y: 248, width: 356, height: 356 });
  const quote = '« Suralimenté et sous-entraîné. »';
  drawText(
    page,
    fonts.display,
    quote,
    (pageSize.width - fonts.display.widthOfTextAtSize(quote, 24)) / 2,
    169,
    24,
  );
  const author = 'Adj. Piller';
  drawText(
    page,
    fonts.body,
    author,
    (pageSize.width - fonts.body.widthOfTextAtSize(author, 13)) / 2,
    140,
    13,
    palette.muted,
  );
  footer(page, fonts);
  return pdf.save();
}
