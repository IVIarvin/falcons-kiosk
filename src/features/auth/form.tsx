'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/client';
import { Field, Logo, Busy } from '@/components/ui';
export function AuthForm({
  mode,
  demo,
  onSuccess,
}: {
  mode: 'login' | 'register' | 'reset';
  demo: boolean;
  onSuccess: () => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(mode, data);
      if (mode === 'reset') {
        router.push('/connexion');
        setError('Mot de passe changé. Tu peux maintenant te connecter.');
      } else {
        await onSuccess();
        router.push('/');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-scene">
      <div className="auth-brand">
        <Logo />
        <span>ÉCLAIREURS · FAMILLE FALCONS</span>
      </div>
      <section className="auth-panel">
        <ShieldCheck className="auth-symbol" size={32} />
        <h1>
          {mode === 'register'
            ? 'Rejoins la section.'
            : mode === 'reset'
              ? 'Récupère ton accès.'
              : 'Bienvenue au kiosque.'}
        </h1>
        <p>
          {mode === 'register'
            ? 'Ton compte, ton ardoise.'
            : mode === 'reset'
              ? 'Demande un code à un admin.'
              : 'Choisis. Valide. Sers-toi.'}
        </p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-grid">
              <Field label="Grade">
                <input name="grade" placeholder="Sdt, App, Cpl…" required maxLength={30} />
              </Field>
              <Field label="Nom">
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Ton nom"
                  required
                  minLength={2}
                  maxLength={90}
                />
              </Field>
            </div>
          )}
          {mode !== 'reset' ? (
            <Field label="Numéro de téléphone">
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="079 123 45 67"
                required
                maxLength={35}
              />
            </Field>
          ) : (
            <Field label="Code fourni par le responsable">
              <input name="token" autoComplete="off" required minLength={20} />
            </Field>
          )}
          <Field
            label={mode === 'login' ? 'Mot de passe' : 'Choisis un mot de passe'}
            hint={mode === 'login' ? undefined : 'Au moins 10 caractères.'}
          >
            <span className="password-field">
              <input
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'login' ? 1 : 10}
                maxLength={128}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? (
              <Busy />
            ) : mode === 'register' ? (
              'Créer mon compte'
            ) : mode === 'reset' ? (
              'Changer mon mot de passe'
            ) : (
              'Me connecter'
            )}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <span>De passage ou nouveau dans la section ?</span>
              <Link href="/inscription">Créer un compte</Link>
              <Link className="muted" href="/recuperation">
                Mot de passe oublié
              </Link>
            </>
          ) : (
            <Link href="/connexion">Retour à la connexion</Link>
          )}
        </div>
        {demo && (
          <div className="demo-note">
            <strong>Démonstration locale</strong>
            <span>
              Responsable : 079 000 00 01
              <br />
              Mot de passe : Falcons-demo-2026!
            </span>
          </div>
        )}
      </section>
      <footer className="auth-footer">
        Enregistre ce que tu prends. Règle ton ardoise auprès du responsable.
      </footer>
    </main>
  );
}
