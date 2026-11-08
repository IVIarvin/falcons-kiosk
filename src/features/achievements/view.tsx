'use client';
import { useState } from 'react';
import { Trophy, GlassWater, Mountain, PackageCheck } from 'lucide-react';
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
  return (
    <>
      <PageTitle
        title="Famille Falcons"
        subtitle="Les succès de la section. Une famille, un kiosque."
      />
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
          ? 'Classement par unités de boissons, après corrections.'
          : 'Classement selon les achats enregistrés, indépendamment des paiements.'}
      </p>
      {!ranks.length ? (
        <Empty title="La semaine commence.">
          Les premières consommations lanceront le classement.
        </Empty>
      ) : (
        <ol className="ranking-list">
          {ranks.map((r) => (
            <li key={r.id} className={r.id === state.user.id ? 'is-you' : ''}>
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
      <h2 className="section-heading">Mes distinctions</h2>
      {!data.badges.length ? (
        <Empty title="Ta première distinction t’attend.">
          Enregistre ta première consommation pour rejoindre le ravitaillement.
        </Empty>
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
                  ? `Semaine du ${new Date(b.period + 'T12:00:00Z').toLocaleDateString('fr-CH')}`
                  : 'Premier achat enregistré'}
              </span>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
