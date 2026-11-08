'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '@/components/context';
import { Busy, Dialog, Field } from '@/components/ui';
import { api } from '@/lib/client';
import { centsFromInput, costMicrosFromInput, formatCHF } from '@/lib/money';
import type { Product } from '@/lib/types';
import {
  characteristicLabels,
  emptyDetails,
  productSourceUrl,
  type ProductDetails,
  type ProductSuggestion,
} from './details';
import { ProductAttribution, ProductImage } from './image';
import { categoryForProduct, productCategories } from './categories';

export function ProductEditor({
  product: p,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { run, busy, notice } = useApp();
  const [name, setName] = useState(p?.name ?? '');
  const [unit, setUnit] = useState(p?.unit ?? 'pièce');
  const [category, setCategory] = useState(
    p ? categoryForProduct(p.category, p.details.kind, p.is_beverage) : 'Autres boissons',
  );
  const [image, setImage] = useState(p?.image ?? '');
  const [price, setPrice] = useState(p ? (p.price_cents / 100).toFixed(2) : '');
  const [cost, setCost] = useState(p?.cost_micros == null ? '' : String(p.cost_micros / 1000000));
  const [priceMode, setPriceMode] = useState(p?.price_mode ?? 'manual');
  const [details, setDetails] = useState<ProductDetails>(p?.details ?? emptyDetails());
  const [results, setResults] = useState<ProductSuggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  async function search() {
    const id = ++request.current;
    setSearching(true);
    setError('');
    setMessage('');
    setResults(null);
    try {
      const found = await api<ProductSuggestion[]>('searchProducts', { query: name });
      if (request.current === id) {
        setResults(found);
        if (!found.length)
          setMessage('Aucune référence trouvée. Essaie un autre nom ou continue en saisie libre.');
      }
    } catch (e) {
      if (request.current === id) setError((e as Error).message);
    } finally {
      if (request.current === id) setSearching(false);
    }
  }
  async function choose(result: ProductSuggestion) {
    const id = ++request.current;
    setSelecting(true);
    setError('');
    try {
      const found = await api<ProductSuggestion>('lookupProduct', { code: result.code });
      if (request.current !== id) return;
      setName(found.name);
      setUnit(found.unit || 'pièce');
      setCategory(categoryForProduct(found.category, found.details.kind, found.is_beverage));
      setImage(found.image);
      setDetails(found.details);
      setResults(null);
      setMessage('Référence récupérée. Vérifie la variante, la catégorie et les caractéristiques.');
    } catch (e) {
      if (request.current === id) setError((e as Error).message);
    } finally {
      if (request.current === id) setSelecting(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = Object.fromEntries(new FormData(event.currentTarget));
    setError('');
    try {
      await run('product', {
        ...(p ? { id: p.id } : {}),
        name,
        unit,
        category,
        is_beverage: classification.beverage,
        image,
        details: { ...details, kind: classification.kind },
        price_cents: centsFromInput(price),
        price_mode: priceMode,
        cost_micros: cost ? costMicrosFromInput(cost) : null,
        active: f.active === 'on',
        available: true,
      });
      notice('Produit enregistré.');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function characteristic(key: 'sugar' | 'alcohol' | 'caffeine', value: string) {
    setDetails((old) => ({
      ...old,
      [key]: value,
      ...(key === 'sugar' ? { sugarsPer100: null } : {}),
      ...(key === 'alcohol' ? { alcoholPercent: null } : {}),
    }));
  }
  const locked = busy || selecting;
  const classification = productCategories.find((c) => c.label === category)!;
  const priceNumber = Number(price.replace(',', '.'));
  const costNumber = Number(cost.replace(',', '.'));
  const validDelta =
    price.trim() &&
    cost.trim() &&
    Number.isFinite(priceNumber) &&
    Number.isFinite(costNumber) &&
    priceNumber >= 0 &&
    costNumber >= 0;
  return (
    <Dialog
      title={p ? 'Modifier le produit' : 'Nouveau produit'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save}>
        <Field
          label="Nom"
          hint="Saisis un nom libre ou un code-barres pour rechercher une référence."
        >
          <input
            aria-label="Nom"
            name="name"
            value={name}
            onChange={(e) => {
              request.current++;
              setName(e.target.value);
              setResults(null);
              setSearching(false);
              setError('');
              setMessage('');
            }}
            disabled={locked}
            required
            minLength={2}
            maxLength={90}
          />
        </Field>
        <div className="product-lookup-actions">
          <button
            type="button"
            className="button secondary"
            disabled={locked || searching || name.trim().length < 2}
            onClick={() => void search()}
          >
            {searching ? (
              <Busy />
            ) : (
              <>
                <Search size={17} /> Rechercher une référence
              </>
            )}
          </button>
          <span>La saisie libre reste disponible.</span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="lookup-message" role="status">
            {message}
          </p>
        )}
        {results && results.length > 0 && (
          <section className="lookup-section" aria-label="Références trouvées">
            <p>Choisis le bon format et la bonne variante.</p>
            <ul className="lookup-results">
              {results.map((result) => (
                <li key={result.code}>
                  <button
                    type="button"
                    disabled={locked}
                    aria-label={`Choisir ${result.name} · ${result.unit || 'Format non renseigné'} · ${result.code}`}
                    onClick={() => void choose(result)}
                  >
                    <span className="lookup-image">
                      <ProductImage src={result.image} name={result.name} />
                    </span>
                    <span>
                      <strong>{result.name}</strong>
                      <small>
                        {result.brand} · {result.unit || 'Format non renseigné'}
                      </small>
                      <small>{result.code}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="lookup-source">
              Données et photos : Open Food Facts. Photos sous CC BY-SA 3.0.{' '}
              <a
                href="https://world.openfoodfacts.org/terms-of-use"
                target="_blank"
                rel="noreferrer"
              >
                Crédits et conditions
              </a>
            </p>
            <button
              type="button"
              className="text-button"
              disabled={locked}
              onClick={() => {
                setResults(null);
                setMessage('Continue avec les informations de ton produit.');
              }}
            >
              Continuer en saisie libre
            </button>
          </section>
        )}
        {selecting && (
          <p role="status">
            <Busy /> Récupération de la fiche…
          </p>
        )}
        {details.source && image && (
          <div className="product-preview">
            <span className="preview-image">
              <ProductImage src={image} name={name} />
            </span>
            <div>
              <strong>{name}</strong>
              <p>{unit || 'Format à préciser'}</p>
              <ProductAttribution image={image} details={details} />
            </div>
          </div>
        )}
        <fieldset disabled={locked} className="product-fields">
          <Field label="Catégorie">
            <select
              aria-label="Catégorie"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {productCategories.map((c) => (
                <option key={c.label}>{c.label}</option>
              ))}
            </select>
          </Field>
          <p className="muted product-classification">
            {classification.beverage ? 'Boisson' : 'Aliment ou autre article'} · type déterminé par
            la catégorie.
          </p>
          <section className="product-pricing" aria-label="Achat et vente">
            <h3>Achat et vente</h3>
            <p>Les montants ci-dessous concernent un seul article.</p>
            <div className="form-grid">
              <Field
                label="Prix d’achat par article (CHF)"
                hint="Ce que le kiosque paie. Les ravitaillements mettront ce montant à jour."
              >
                <input
                  name="cost"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required={priceMode === 'auto'}
                />
              </Field>
              <Field
                label="Prix de vente au kiosque (CHF)"
                hint="Ce que le membre paie pour cet article."
              >
                <input
                  name="price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="price-delta" role="status" aria-label="Écart par article">
              <span>Écart vente − achat</span>
              <strong className={validDelta && priceNumber < costNumber ? 'danger-text' : ''}>
                {validDelta
                  ? formatCHF(Math.round((priceNumber - costNumber) * 100))
                  : 'À renseigner'}
              </strong>
              <small>
                {validDelta
                  ? 'Marge brute estimée par article, avant les autres dépenses.'
                  : 'Renseigne les deux prix pour voir la marge par article.'}
              </small>
            </div>
            <Field label="Mode de prix">
              <select
                name="price_mode"
                value={priceMode}
                onChange={(e) => setPriceMode(e.target.value as 'manual' | 'auto')}
              >
                <option value="manual">Prix de vente fixe</option>
                <option value="auto">Proposer achat + majoration</option>
              </select>
            </Field>
            {priceMode === 'auto' && (
              <p className="muted">
                Les prochains prix seront proposés selon la majoration des réglages. Tu devras les
                confirmer avant publication.
              </p>
            )}
            <p className="muted">
              Pour comptabiliser un ravitaillement, utilise « Achats » : nombre d’articles et total
              payé.
            </p>
          </section>
          <section className="product-characteristics" aria-label="Caractéristiques du produit">
            <h3>Caractéristiques</h3>
            <p>Vérifie ces informations sur l’emballage. Piller s’en sert pour ses répliques.</p>
            <div className="form-grid">
              {(
                [
                  ['sugar', 'Contient du sucre'],
                  ['alcohol', 'Contient de l’alcool'],
                  ['caffeine', 'Contient de la caféine'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <select
                    value={details[key]}
                    onChange={(e) => characteristic(key, e.target.value)}
                  >
                    {Object.entries(characteristicLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            {(details.sugarsPer100 !== null || details.alcoholPercent !== null) && (
              <p className="lookup-source">
                Données importées :{' '}
                {details.sugarsPer100 !== null
                  ? `sucres ${details.sugarsPer100} g / 100 g ou 100 ml`
                  : ''}
                {details.sugarsPer100 !== null && details.alcoholPercent !== null ? ' · ' : ''}
                {details.alcoholPercent !== null ? `alcool ${details.alcoholPercent} %` : ''}.
              </p>
            )}
            {details.source && (
              <p className="lookup-source">
                Référence :{' '}
                <a href={productSourceUrl(details.source.code)} target="_blank" rel="noreferrer">
                  Open Food Facts · {details.source.code}
                </a>
                . Les champs restent modifiables.
              </p>
            )}
          </section>
          <Field
            label="Image du produit"
            hint="Adresse HTTPS ou image locale /products/… ; laisse vide pour utiliser le pictogramme."
          >
            <input
              aria-label="Image du produit"
              name="image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              maxLength={1000}
            />
          </Field>
          <div className="product-preview">
            <span className="preview-image">
              <ProductImage src={image} name={name || 'Aperçu du produit'} />
            </span>
            <div>
              <strong>{name || 'Aperçu du produit'}</strong>
              <p>
                {image
                  ? 'Vérifie la photo et la variante.'
                  : 'Ajoute une adresse d’image ou garde le pictogramme.'}
              </p>
              <ProductAttribution image={image} details={details} />
            </div>
          </div>
          <div className="checkboxes">
            <label>
              <input name="active" type="checkbox" defaultChecked={p?.active ?? true} /> Visible
              dans le catalogue
            </label>
          </div>
        </fieldset>
        <button className="button primary full" disabled={locked}>
          {busy ? <Busy /> : 'Enregistrer le produit'}
        </button>
      </form>
    </Dialog>
  );
}
