'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCart,
  ReceiptText,
  Users,
  UserRound,
  LayoutGrid,
  Package,
  ClipboardList,
  FileText,
  Settings,
  ChartNoAxesCombined,
  ArrowLeft,
  RefreshCw,
  WifiOff,
  X,
} from 'lucide-react';
import type { Snapshot } from '@/lib/application';
import { api, ApiError, authEvent } from '@/lib/client';
import { AppContext } from './context';
import { Logo } from './ui';
import { AuthForm } from '@/features/auth/form';
import { KioskView } from '@/features/checkout/view';
import { ArdoiseView } from '@/features/ledger/view';
import { CrewView } from '@/features/achievements/view';
import { ProfileView } from '@/features/profile/view';
import { AdminView } from '@/features/admin/view';
const memberLinks = [
  { href: '/', label: 'Kiosque', Icon: ShoppingCart },
  { href: '/ardoise', label: 'Ardoise', Icon: ReceiptText },
  { href: '/falcons', label: 'Falcons', Icon: Users },
  { href: '/profil', label: 'Profil', Icon: UserRound },
];
const adminLinks = [
  { href: '/admin', label: 'Ardoises', Icon: LayoutGrid },
  { href: '/admin/produits', label: 'Produits', Icon: Package },
  { href: '/admin/achats', label: 'Achats', Icon: ClipboardList },
  { href: '/admin/finance', label: 'Finances', Icon: ChartNoAxesCombined },
  { href: '/admin/section', label: 'Membres', Icon: Users },
  { href: '/admin/documents', label: 'Documents', Icon: FileText },
  { href: '/admin/reglages', label: 'Réglages', Icon: Settings },
];
export function App({ demo = false }: { demo?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<Snapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [online, setOnline] = useState(true);
  const generation = useRef(0);
  const authRoute = ['/connexion', '/inscription', '/recuperation'].includes(pathname);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const response = await fetch('/api/state', { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json();
      if (current !== generation.current) return;
      if (response.status === 401) {
        setState(null);
        setFailure('');
        return;
      }
      if (!result.ok) throw new Error(result.message);
      setState(result.data);
      setFailure('');
    } catch (e) {
      if (current === generation.current)
        setFailure(e instanceof Error ? e.message : 'Connexion indisponible.');
    } finally {
      if (current === generation.current) setLoaded(true);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);
  useEffect(() => {
    const sync = () => {
      ++generation.current;
      setState(null);
      setLoaded(false);
      setBusy(false);
      setFailure('');
      setToast('');
      void refresh();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === authEvent) sync();
    };
    const visible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) sync();
    };
    window.addEventListener(authEvent, sync);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', visible);
    window.addEventListener('pageshow', restored);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener(authEvent, sync);
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', visible);
      window.removeEventListener('pageshow', restored);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  useEffect(() => {
    const yes = () => {
      setOnline(true);
      void refresh();
    };
    const no = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', yes);
    window.addEventListener('offline', no);
    return () => {
      window.removeEventListener('online', yes);
      window.removeEventListener('offline', no);
    };
  }, [refresh]);
  useEffect(() => {
    if (loaded && !state && !authRoute && !failure) router.replace('/connexion');
    if (loaded && state && authRoute) router.replace('/');
  }, [loaded, state, authRoute, failure, router]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  const run = useCallback(
    async <T,>(action: string, data?: unknown, reload = true): Promise<T> => {
      setBusy(true);
      try {
        const result = await api<T>(action, data);
        if (reload) await refresh();
        return result;
      } catch (e) {
        setToast((e as Error).message);
        if (e instanceof ApiError && e.status === 401) {
          setState(null);
          router.replace('/connexion');
        }
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [refresh, router],
  );
  if (authRoute)
    return (
      <AuthForm
        key={pathname}
        mode={
          pathname === '/inscription'
            ? 'register'
            : pathname === '/recuperation'
              ? 'reset'
              : 'login'
        }
        demo={demo}
        onSuccess={refresh}
      />
    );
  if (!state)
    return (
      <main className="boot-screen">
        <Logo />
        {failure ? (
          <>
            <h1>Le kiosque est indisponible.</h1>
            <p>{failure}</p>
            <button className="button primary" onClick={() => void refresh()}>
              <RefreshCw size={17} /> Réessayer
            </button>
          </>
        ) : (
          <p>
            <RefreshCw className="spin" size={20} /> Ouverture du kiosque…
          </p>
        )}
      </main>
    );
  const admin = pathname.startsWith('/admin') && state.user.role === 'admin';
  const links = admin ? adminLinks : memberLinks;
  return (
    <AppContext.Provider
      key={state.user.id}
      value={{ state, busy, refresh, run, notice: setToast }}
    >
      <div className={`app-shell ${admin ? 'admin-shell' : 'member-shell'}`}>
        <aside className="sidebar">
          <Link href={admin ? '/admin' : '/'} className="brand-link">
            <Logo />
          </Link>
          <span className="sidebar-caption">{admin ? 'Administration' : 'Kiosque de section'}</span>
          <nav aria-label={admin ? 'Administration' : 'Navigation principale'}>
            {links.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            {admin ? (
              <Link href="/">
                <ArrowLeft size={16} /> Retour au kiosque
              </Link>
            ) : (
              state.user.role === 'admin' && (
                <Link href="/admin">
                  <Settings size={16} /> Administration
                </Link>
              )
            )}
            <Link href="/profil" className="identity">
              <span>{state.user.name[0]}</span>
              <div>
                <strong>{state.user.name}</strong>
                <small>{state.user.grade}</small>
              </div>
            </Link>
          </div>
        </aside>
        <div className="mobile-header">
          <Link href="/">
            <Logo />
          </Link>
          <div className="mobile-header-actions">
            {state.user.role === 'admin' && (
              <Link
                className="mobile-admin-link"
                href={admin ? '/' : '/admin'}
                aria-label={admin ? 'Retour au kiosque' : 'Administration'}
              >
                {admin ? <ShoppingCart size={17} /> : <Settings size={17} />}
                {admin ? 'Kiosque' : 'Admin'}
              </Link>
            )}
            <Link className="mobile-avatar" href="/profil" aria-label="Mon profil">
              {state.user.name[0]}
            </Link>
          </div>
        </div>
        <main className={`workspace ${admin ? 'wide' : ''}`}>
          {demo && <div className="demo-banner">Démonstration locale · données fictives</div>}
          {!online && (
            <div className="offline-banner" role="status">
              <WifiOff size={18} /> Hors connexion. Les achats et règlements ne peuvent pas être
              confirmés.
            </div>
          )}
          {failure && (
            <div className="notice-box" role="alert">
              <p>{failure}</p>
              <button className="button secondary" onClick={() => void refresh()}>
                Actualiser
              </button>
            </div>
          )}
          {admin ? (
            <AdminView section={pathname.split('/')[2] ?? ''} />
          ) : pathname.startsWith('/admin') ? (
            <div className="empty">
              <h1>Accès réservé au responsable.</h1>
              <Link href="/" className="button secondary">
                Retour au kiosque
              </Link>
            </div>
          ) : pathname === '/ardoise' ? (
            <ArdoiseView />
          ) : pathname === '/falcons' ? (
            <CrewView />
          ) : pathname === '/profil' ? (
            <ProfileView />
          ) : (
            <KioskView />
          )}
        </main>
        <nav
          className={`mobile-nav ${admin ? 'admin-mobile-nav' : ''}`}
          aria-label="Navigation mobile"
        >
          {(admin
            ? adminLinks.filter(
                (link) => !['/admin/finance', '/admin/documents'].includes(link.href),
              )
            : memberLinks
          ).map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
              <Icon size={23} />
              <span>{href === '/admin/reglages' ? 'Plus' : label}</span>
            </Link>
          ))}
        </nav>
        {toast && (
          <div className="toast" role="status">
            <span>{toast}</span>
            <button
              className="icon-button"
              onClick={() => setToast('')}
              aria-label="Fermer la notification"
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
