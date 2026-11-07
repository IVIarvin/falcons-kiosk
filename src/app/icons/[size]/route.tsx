import { ImageResponse } from 'next/og';
export async function GET(_req: Request, context: { params: Promise<{ size: string }> }) {
  const param = await context.params;
  const size = param.size === '192' ? 192 : 512;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#090D0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 64 64">
        <path d="M5 9h54L45 23H25L12 34l12-2-9 25 25-29H29l9-7H19z" fill="#8FE781" />
      </svg>
    </div>,
    { width: size, height: size, headers: { 'Cache-Control': 'public,max-age=86400' } },
  );
}
