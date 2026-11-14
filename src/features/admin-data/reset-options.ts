export const defaultResetSelection = {
  operations: true,
  members: true,
  products: false,
  patches: false,
  settings: false,
};
export type ResetSelection = typeof defaultResetSelection;
export const resetChoices: { key: keyof ResetSelection; label: string; detail: string }[] = [
  {
    key: 'operations',
    label: 'Opérations et réservations',
    detail:
      'Consommations, tickets de service, visiteurs, règlements, achats, dépenses et réservations de patchs.',
  },
  {
    key: 'members',
    label: 'Comptes membres',
    detail: 'Tous les comptes admin sont conservés. Nécessite de nettoyer les opérations.',
  },
  {
    key: 'products',
    label: 'Produits',
    detail: 'Le catalogue. Nécessite de nettoyer les opérations.',
  },
  {
    key: 'patches',
    label: 'Patchs et images',
    detail: 'Les modèles de patchs, leurs images et leurs réservations.',
  },
  {
    key: 'settings',
    label: 'Réglages et répliques',
    detail: 'Retour aux réglages par défaut et suppression des répliques personnalisées.',
  },
];
