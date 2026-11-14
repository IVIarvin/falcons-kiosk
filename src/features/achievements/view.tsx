'use client';
import { useState } from 'react';
import { Trophy, GlassWater, Mountain, PackageCheck, ChevronDown } from 'lucide-react';
import { useApp } from '@/components/context';
import { Empty, PageTitle } from '@/components/ui';
import { formatCHF } from '@/lib/money';
export function CrewView() {
  const { state } = useApp();
  const [metric, setMetric] = useState<'contributors' | 'drinks'>('contributors');
  const [period, setPeriod] = useState<'week' | 'allTime'>('week');
  const mode = metric === 'drinks' ? 'drinks' : period === 'allTime' ? 'allTime' : 'contributors';
  const data = state.community;
  const ranks = data[mode];
  const yourRank = ranks.find((entry) => entry.id === state.user.id);
  const latestBadge = [...data.badges].sort((a, b) =>
    (b.period ?? '').localeCompare(a.period ?? ''),
  )[0];
  return (
    <>
      <PageTitle title="Famille Falcons" />
      <div className="crew-heading">
        <Trophy size={34} />
        <div>
          <h2>Le classement</h2>
          <p>
            {mode === 'allTime'
              ? 'Depuis l’ouverture du kiosque'
              : `Semaine du ${new Date(data.weekStart).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })} · provisoire`}
          </p>
        </div>
      </div>
      <div className="crew-controls">
        <div className="category-tabs crew-metrics" role="group" aria-label="Type de classement">
          <button
            className={metric === 'contributors' ? 'selected' : ''}
            aria-pressed={metric === 'contributors'}
            onClick={() => setMetric('contributors')}
          >
            Contributeurs
          </button>
          <button
            className={metric === 'drinks' ? 'selected' : ''}
            aria-pressed={metric === 'drinks'}
            onClick={() => setMetric('drinks')}
          >
            Buveurs
          </button>
        </div>
        {metric === 'contributors' && (
          <label className="crew-period">
            <span>Période des contributions</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
              <option value="week">Cette semaine</option>
              <option value="allTime">Depuis le début</option>
            </select>
          </label>
        )}
      </div>
      <p className="muted small">
        {mode === 'drinks'
          ? 'Par nombre de boissons alcoolisées, cette semaine.'
          : 'Par montant acheté, pas par paiement.'}
      </p>
      <section className="crew-personal" aria-label="Ta place dans la section">
        <div className="crew-position">
          <div>
            <h3>Ta position</h3>
            <p>
              <strong>
                {yourRank
                  ? `${yourRank.rank}${yourRank.rank === 1 ? 'er' : 'e'}`
                  : 'Pas encore classé'}
              </strong>
              {yourRank && (
                <span>
                  {mode === 'drinks'
                    ? `${yourRank.score} boisson${yourRank.score > 1 ? 's' : ''}`
                    : formatCHF(yourRank.score)}
                </span>
              )}
            </p>
          </div>
          {yourRank && (
            <a className="text-button" href="#mon-classement">
              Voir ma ligne
            </a>
          )}
        </div>
        <details className="crew-distinctions">
          <summary>
            <div>
              <strong>Mes distinctions</strong>
              <span>
                {latestBadge
                  ? `${data.badges.length} obtenue${data.badges.length > 1 ? 's' : ''} · Dernière : ${latestBadge.label}`
                  : 'Ta première distinction t’attend.'}
              </span>
            </div>
            <ChevronDown size={20} aria-hidden="true" />
          </summary>
          {!data.badges.length ? (
            <p className="muted small">
              Enregistre ta première consommation pour rejoindre le ravitaillement.
            </p>
          ) : (
            <div className="badges-grid">
              {data.badges.map((b, i) => (
                <article className="achievement" key={`${b.type}-${b.period}-${i}`}>
                  <div>
                    {b.type === 'drinks' ? (
                      <GlassWater size={30} />
                    ) : b.type === 'contributor' ? (
                      <Mountain size={30} />
                    ) : (
                      <PackageCheck size={30} />
                    )}
                  </div>
                  <h3>{b.label}</h3>
                  <span>
                    {b.period
                      ? `Semaine du ${new Date(b.period + 'T12:00:00Z').toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })}`
                      : 'Premier achat enregistré'}
                  </span>
                </article>
              ))}
            </div>
          )}
        </details>
      </section>
      {!ranks.length ? (
        <Empty title="La semaine commence.">
          Les premières consommations lanceront le classement.
        </Empty>
      ) : (
        <ol className="ranking-list">
          {ranks.map((r) => (
            <li
              key={r.id}
              className={r.id === state.user.id ? 'is-you' : ''}
              id={r.id === state.user.id ? 'mon-classement' : undefined}
              tabIndex={r.id === state.user.id ? -1 : undefined}
            >
              <strong className="rank-number">{String(r.rank).padStart(2, '0')}</strong>
              <div>
                <span>{r.grade}</span>
                <strong>
                  {r.name}
                  {r.id === state.user.id && <small>toi</small>}
                </strong>
              </div>
              <strong>
                {mode === 'drinks'
                  ? `${r.score} boisson${r.score > 1 ? 's' : ''}`
                  : formatCHF(r.score)}
              </strong>
              {r.rank === 1 && <Trophy className="accent" size={20} />}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
