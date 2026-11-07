'use client';
import { useState } from 'react';
import { Package } from 'lucide-react';
import { productSourceUrl, type ProductDetails } from './details';

export function ProductImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return src && failed !== src ? (
    <img
      src={src}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
    />
  ) : (
    <span
      className="product-image-fallback"
      role="img"
      aria-label={src ? 'Image indisponible' : 'Aucune image'}
    >
      <Package size={32} />
    </span>
  );
}
export function ProductAttribution({ image, details }: { image: string; details: ProductDetails }) {
  const source = details.source;
  if (!image || !source || source.image !== image) return null;
  return (
    <small className="product-attribution">
      Photo :{' '}
      <a href={productSourceUrl(source.code)} target="_blank" rel="noreferrer">
        Open Food Facts
      </a>{' '}
      ·{' '}
      <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">
        CC BY-SA 3.0
      </a>
    </small>
  );
}
