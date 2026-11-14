'use client';
import { useState, type FormEvent } from 'react';
import { LogOut, Download, Shield, Smartphone, Compass, CircleCheck, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/context';
import { Field, PageTitle, Busy, Dialog } from '@/components/ui';
import { api, clearPrivateState } from '@/lib/client';
import { ScoutAvatar } from '@/components/scout-avatar';
import { profileMilestones } from './milestones';
import styles from './milestones.module.css';
import { AvatarPicker } from './avatar-picker';
import { appName } from '@/lib/brand';
export function ProfileView() {
  const { state, run, busy, notice } = useApp();
  const router = useRouter();
  const [install, setInstall] = useState(false);
  const savedAvatar = state.user.avatar_seed ?? state.user.id;
  const [choosingAvatar, setChoosingAvatar] = useState(false);
  async function profile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await run('profile', Object.fromEntries(new FormData(e.currentTarget)));
      notice('Profil enregistré.');
    } catch {}
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await run('password', Object.fromEntries(new FormData(e.currentTarget)), false);
      clearPrivateState();
      router.push('/connexion');
      window.location.assign('/connexion');
    } catch {}
  }
  return (
    <>
      <PageTitle title="Mon profil" subtitle={`${state.user.grade} ${state.user.name}`} />
      <section className={styles.identity} aria-label="Ton avatar enregistré">
        <ScoutAvatar seed={savedAvatar} size={88} />
        <div>
          <p>Mon avatar</p>
          <div className={styles.avatarActions}>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setChoosingAvatar(true)}
            >
              <Pencil size={16} aria-hidden="true" /> Changer mon avatar
            </button>
          </div>
        </div>
      </section>
      {choosingAvatar && (
        <AvatarPicker
          savedSeed={savedAvatar}
          onClose={() => setChoosingAvatar(false)}
          onSave={async (seed) => {
            await run('avatar', { seed });
            notice('Avatar enregistré.');
          }}
        />
      )}
      <section className={styles.badges} aria-label="Tes nouveaux succès">
        {profileMilestones(state.ledger.entries).map((b) => (
          <article key={b.id} className={styles.badge} data-earned={b.earned}>
            {b.id === 'regular' ? (
              <Compass size={24} aria-hidden="true" />
            ) : (
              <CircleCheck size={24} aria-hidden="true" />
            )}
            <h3>{b.label}</h3>
            <strong>{b.earned ? 'Débloqué' : `${b.progress} / ${b.target}`}</strong>
            <p>{b.detail}</p>
          </article>
        ))}
      </section>
      <div className="profile-layout">
        <section className="form-panel">
          <h2>Mes coordonnées</h2>
          <form onSubmit={profile}>
            <div className="form-grid">
              <Field label="Grade">
                <input name="grade" defaultValue={state.user.grade} required maxLength={30} />
              </Field>
              <Field label="Nom">
                <input
                  name="name"
                  defaultValue={state.user.name}
                  required
                  minLength={2}
                  maxLength={90}
                />
              </Field>
            </div>
            <Field label="Téléphone">
              <input
                name="phone"
                type="tel"
                defaultValue={state.user.phone}
                required
                maxLength={35}
              />
            </Field>
            <button className="button primary" disabled={busy}>
              {busy ? <Busy /> : 'Enregistrer'}
            </button>
          </form>
        </section>
        <section className="form-panel">
          <h2>
            <Shield size={19} /> Mon accès
          </h2>
          <form onSubmit={password}>
            <Field label="Mot de passe actuel">
              <input type="password" name="current" autoComplete="current-password" required />
            </Field>
            <Field
              label="Nouveau mot de passe"
              hint="Au moins 10 caractères. Tu devras te reconnecter."
            >
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </Field>
            <button className="button secondary" disabled={busy}>
              Changer mon mot de passe
            </button>
          </form>
        </section>
      </div>
      <div className="profile-actions">
        <button className="button secondary" onClick={() => setInstall(true)}>
          <Download size={18} /> Installer {appName}
        </button>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await api('logout');
              clearPrivateState();
              window.location.assign('/connexion');
            } catch {
              notice('Déconnexion impossible. Vérifie ta connexion et réessaie.');
            }
          }}
        >
          <LogOut size={18} /> Me déconnecter
        </button>
      </div>
      {install && (
        <Dialog title={`Installer ${appName}`} onClose={() => setInstall(false)}>
          <div className="install-instructions">
            <Smartphone size={34} />
            <h3>Sur iPhone</h3>
            <p>
              Ouvre le kiosque dans Safari, touche Partager, puis « Sur l’écran d’accueil ». Active
              « Ouvrir comme app web » si l’option est proposée.
            </p>
            <h3>Sur Android</h3>
            <p>
              Dans Chrome, ouvre le menu ⋮ puis « Ajouter à l’écran d’accueil » ou « Installer
              l’application ».
            </p>
            <p className="muted">
              Tu peux aussi continuer dans ton navigateur. Une connexion reste nécessaire pour
              enregistrer les achats.
            </p>
          </div>
          <button className="button primary full" onClick={() => setInstall(false)}>
            Compris
          </button>
        </Dialog>
      )}
    </>
  );
}
