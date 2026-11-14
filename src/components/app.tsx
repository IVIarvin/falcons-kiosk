'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  Database,
  ChartNoAxesCombined,
  ArrowLeft,
  RefreshCw,
  WifiOff,
  X,
  Shield,
} from 'lucide-react';
import type { Snapshot } from '@/lib/application';
import { api, ApiError, authEvent } from '@/lib/client';
import { AppContext } from './context';
import { Logo } from './ui';
import { ScoutAvatar } from './scout-avatar';
import { NavigationHint, trackInputModality } from './motion';
import { AuthForm } from '@/features/auth/form';
const memberLinks = [
  { href: '/', label: 'Kiosque', Icon: ShoppingCart },
  { href: '/ardoise', label: 'Ardoise', Icon: ReceiptText },
  { href: '/patchs', label: 'Patchs', Icon: Shield },
  { href: '/falcons', label: 'Falcons', Icon: Users },
  { href: '/profil', label: 'Profil', Icon: UserRound },
];
const adminLinks = [
  { href: '/admin', label: 'Ardoises', Icon: LayoutGrid },
  { href: '/admin/service', label: 'Service', Icon: ClipboardList },
  { href: '/admin/produits', label: 'Produits', Icon: Package },
  { href: '/admin/achats', label: 'Achats', Icon: ClipboardList },
  { href: '/admin/finance', label: 'Finances', Icon: ChartNoAxesCombined },
  { href: '/admin/patchs', label: 'Patchs', Icon: Shield },
  { href: '/admin/section', label: 'Membres', Icon: Users },
  { href: '/admin/documents', label: 'Documents', Icon: FileText },
  { href: '/admin/donnees', label: 'Données', Icon: Database },
  { href: '/admin/reglages', label: 'Réglages', Icon: Settings },
];
const adminMobilePaths = [
  '/admin',
  '/admin/produits',
  '/admin/achats',
  '/admin/section',
  '/admin/reglages',
];
export function App({ demo = false, children }: { demo?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<Snapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [online, setOnline] = useState(true);
  const generation = useRef(0);
  const reading = useRef(false);
  const validatedAt = useRef(0);
  useEffect(trackInputModality, []);
  const authRoute = ['/connexion', '/inscription', '/recuperation'].includes(pathname);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    reading.current = true;
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
      validatedAt.current = Date.now();
      setFailure('');
    } catch (e) {
      if (current === generation.current)
        setFailure(e instanceof Error ? e.message : 'Connexion indisponible.');
    } finally {
      if (current === generation.current) {
        reading.current = false;
        setLoaded(true);
      }
    }
  }, []);
  useEffect(() => {
    if (!reading.current && Date.now() - validatedAt.current >= 15000) void refresh();
  }, [refresh, pathname]);
  useEffect(() => {
    const sync = () => {
      ++generation.current;
      setState(null);
      setLoaded(false);
      setBusy(false);
      setFailure('');
      setToast('');
      validatedAt.current = 0;
      void refresh();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === authEvent) sync();
    };
    const visible = () => {
      if (document.visibilityState === 'visible' && !reading.current) void refresh();
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
  const mobileLinks = admin
    ? adminLinks.filter((link) => adminMobilePaths.includes(link.href))
    : memberLinks;
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
              <Link
                key={href}
                href={href}
                className={pathname === href ? 'active' : ''}
                aria-current={pathname === href ? 'page' : undefined}
              >
                <Icon size={20} />
                {label}
                <NavigationHint />
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
              <span>
                <ScoutAvatar seed={state.user.avatar_seed ?? state.user.id} size={36} />
              </span>
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
                <NavigationHint />
              </Link>
            )}
            <Link className="mobile-avatar" href="/profil" aria-label="Mon profil">
              <ScoutAvatar seed={state.user.avatar_seed ?? state.user.id} size={44} />
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
          {children}
        </main>
        <nav
          className={`mobile-nav ${admin ? 'admin-mobile-nav' : ''}`}
          aria-label="Navigation mobile"
          style={{ gridTemplateColumns: `repeat(${mobileLinks.length}, minmax(0, 1fr))` }}
        >
          {mobileLinks.map(({ href, label, Icon }) => {
            const currentPage = pathname === href;
            const currentGroup =
              href === '/admin/reglages' &&
              pathname.startsWith('/admin/') &&
              !adminMobilePaths.includes(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={currentPage || currentGroup ? 'active' : ''}
                aria-current={currentPage ? 'page' : currentGroup ? 'location' : undefined}
              >
                <Icon size={23} />
                <span>{href === '/admin/reglages' ? 'Plus' : label}</span>
                <NavigationHint />
              </Link>
            );
          })}
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
