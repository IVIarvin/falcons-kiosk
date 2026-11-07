import { App } from '@/components/app';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <App demo={process.env.FALCONS_DEMO === '1' && process.env.NODE_ENV !== 'production'} />;
}
