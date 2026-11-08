export { buildCatalogPdf, type PrintableProduct } from './catalogue';
export { buildAccessPdf } from './access';

export function toCsv(headers: string[], rows: unknown[][]) {
  const escape = (value: unknown) => {
    let s = value == null ? '' : String(value);
    if (typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [headers, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
}
