export const patchImageKinds = ['artwork', 'print'] as const;
export type PatchImageKind = (typeof patchImageKinds)[number];
export const patchImageLabels = { artwork: 'Artwork', print: 'Print' } as const;
export function patchImageUrl(campaignId: string, kind: PatchImageKind, version: string) {
  return `/api/patchs/${encodeURIComponent(campaignId)}/images/${kind}?v=${encodeURIComponent(version)}`;
}
