'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './context';
import { RouteMotion } from './motion';
import { KioskView } from '@/features/checkout/view';
import { ArdoiseView } from '@/features/ledger/view';
import { CrewView } from '@/features/achievements/view';
import { ProfileView } from '@/features/profile/view';
import { AdminView } from '@/features/admin/view';
import { PatchMemberView } from '@/features/patches/view';

export function Screen() {
  const pathname = usePathname();
  return (
    <RouteMotion route={pathname}>
      <Content pathname={pathname} />
    </RouteMotion>
  );
}

function Content({ pathname }: { pathname: string }) {
  const { state } = useApp();
  if (pathname.startsWith('/admin')) {
    if (state.user.role === 'admin') return <AdminView section={pathname.split('/')[2] ?? ''} />;
    return (
      <div className="empty">
        <h1>Accès réservé au responsable.</h1>
        <Link href="/" className="button secondary">
          Retour au kiosque
        </Link>
      </div>
    );
  }
  if (pathname === '/ardoise') return <ArdoiseView />;
  if (pathname === '/patchs') return <PatchMemberView />;
  if (pathname === '/falcons') return <CrewView />;
  if (pathname === '/profil') return <ProfileView />;
  return <KioskView />;
}
