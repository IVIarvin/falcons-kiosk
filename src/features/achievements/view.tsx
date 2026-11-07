'use client';
import { useState } from 'react';
import { Trophy, GlassWater, Mountain, PackageCheck } from 'lucide-react';
import { useApp } from '@/components/context';
import { Empty, PageTitle } from '@/components/ui';
import { formatCHF } from '@/lib/money';
export function CrewView() {
  const { state } = useApp();
  const [mode, setMode] = useState<'contributors' | 'drinks' | 'allTime'>('contributors');
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
      <div className="category-tabs">
        <button
          className={mode === 'contributors' ? 'selected' : ''}
          onClick={() => setMode('contributors')}
        >
          Contributeurs
        </button>
        <button className={mode === 'drinks' ? 'selected' : ''} onClick={() => setMode('drinks')}>
          Buveurs
        </button>
        <button className={mode === 'allTime' ? 'selected' : ''} onClick={() => setMode('allTime')}>
          Depuis le début
        </button>
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
