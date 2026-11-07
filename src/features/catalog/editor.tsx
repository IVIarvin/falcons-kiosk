'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '@/components/context';
import { Busy, Dialog, Field } from '@/components/ui';
import { api } from '@/lib/client';
import { centsFromInput, costMicrosFromInput } from '@/lib/money';
import type { Product } from '@/lib/types';
import {
  characteristicLabels,
  emptyDetails,
  kindLabels,
  productSourceUrl,
  type ProductDetails,
  type ProductSuggestion,
} from './details';
import { ProductAttribution, ProductImage } from './image';

export function ProductEditor({
  product: p,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { run, busy, notice } = useApp();
  const [name, setName] = useState(p?.name ?? '');
  const [unit, setUnit] = useState(p?.unit ?? '50 cl');
  const [category, setCategory] = useState(p?.category ?? 'Boissons');
  const [image, setImage] = useState(p?.image ?? '');
  const [beverage, setBeverage] = useState(p?.is_beverage ?? true);
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
      setUnit(found.unit || '');
      setCategory(found.category);
      setBeverage(found.is_beverage);
      setImage(found.image);
      setDetails(found.details);
      setResults(null);
      setMessage(
        'Référence récupérée. Vérifie le format vendu et les caractéristiques avant d’enregistrer.',
      );
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
        is_beverage: beverage,
        image,
        details,
        price_cents: centsFromInput(String(f.price)),
        price_mode: String(f.price_mode),
        cost_micros: f.cost ? costMicrosFromInput(String(f.cost)) : null,
        active: f.active === 'on',
        available: f.available === 'on',
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
          <div className="form-grid">
            <Field label="Unité de vente" hint="Vérifie qu’il s’agit d’une unité, pas d’un pack.">
              <input
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                maxLength={40}
              />
            </Field>
            <Field label="Catégorie">
              <input
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                maxLength={40}
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Prix de vente (CHF)">
              <input
                name="price"
                inputMode="decimal"
                defaultValue={p ? (p.price_cents / 100).toFixed(2) : ''}
                required
              />
            </Field>
            <Field label="Mode de prix">
              <select name="price_mode" defaultValue={p?.price_mode ?? 'manual'}>
                <option value="manual">Manuel</option>
                <option value="auto">Coût + majoration</option>
              </select>
            </Field>
          </div>
          <Field
            label="Coût unitaire de référence (CHF)"
            hint="Facultatif en prix manuel. Les prochains achats mettront à jour ce coût."
          >
            <input
              name="cost"
              inputMode="decimal"
              defaultValue={p?.cost_micros == null ? '' : (p.cost_micros / 1000000).toFixed(6)}
            />
          </Field>
          <section className="product-characteristics" aria-label="Caractéristiques du produit">
            <h3>Caractéristiques</h3>
            <p>Vérifie ces informations sur l’emballage. Piller s’en sert pour ses répliques.</p>
            <Field label="Type de produit">
              <select
                value={details.kind}
                onChange={(e) =>
                  setDetails((old) => ({ ...old, kind: e.target.value as ProductDetails['kind'] }))
                }
              >
                {Object.entries(kindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
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
              <input
                name="is_beverage"
                type="checkbox"
                checked={beverage}
                onChange={(e) => setBeverage(e.target.checked)}
              />{' '}
              C’est une boisson
            </label>
            <label>
              <input name="available" type="checkbox" defaultChecked={p?.available ?? true} />{' '}
              Disponible au kiosque
            </label>
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
