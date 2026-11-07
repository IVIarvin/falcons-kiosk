import type { ProductDetails } from '@/features/catalog/details';

export const topicLabels = {
  general: 'Générales',
  sugary: 'Sucre',
  'sugar-free': 'Sans sucre',
  energy: 'Énergisants',
  coffee: 'Café',
  alcohol: 'Alcool',
  water: 'Eau',
  snack: 'Snacks',
  bulk: 'Gros paniers',
} as const;
export type QuoteTopic = keyof typeof topicLabels;
export type Quote = {
  id: string;
  text: string;
  topic: QuoteTopic;
  archived?: boolean;
  enabled?: boolean;
};
const legacyQuotes: Quote[] = [
  'Encore toi ? Le frigo n’est pas ton paquetage personnel, espèce de rapace.',
  'Achat confirmé. Ta discipline, elle, est toujours portée disparue.',
  'T’as reconnu le chemin du kiosque. Pour le reste, j’ai des doutes.',
  'Une vraie mission de reconnaissance : repérer les snacks et les faire disparaître.',
  'Bravo, champion. L’ennemi peut attendre, ta canette beaucoup moins.',
  'T’es pas un Falcon, t’es un distributeur automatique à l’envers.',
  'À ce rythme, on va te nommer responsable des opérations sur le frigo.',
  'Le camouflage, c’est pour le terrain. Ton passage au kiosque, tout le monde l’a vu.',
  'Encore un ravitaillement ? Ta logistique a plus d’activité que ta section.',
  'Belle initiative, guignol. Dommage qu’elle concerne encore le kiosque.',
  'J’ai demandé des éclaireurs, pas des prospecteurs de chips.',
  'Le panier est validé. Pour ton jugement, on attendra les renforts.',
  'T’as sécurisé la dernière canette. La nation te remercie, abruti.',
  'Même ton ombre en a marre de te suivre jusqu’au frigo.',
  'Rapport de mission : zéro discrétion, un achat, aucune surprise.',
  'Tu connais mieux ces prix que les consignes, petit malin.',
  'Ravitaillement autorisé. Parade de victoire refusée.',
  'Bravo, soldat. Le kiosque tient debout grâce à tes brillantes décisions.',
  'Encore une manœuvre parfaitement exécutée entre toi et le rayon snacks.',
  'Tu peux rompre. Et lâcher ce regard amoureux au frigo.',
].map((text, i) => ({ id: `piller-${i + 1}`, text, topic: 'general', archived: true }));

// IDs are persisted on receipts: append new entries; never reorder existing entries.
const bank: Record<QuoteTopic, string[]> = {
  general: [
    'T’as le ravitaillement d’un régiment et le rendement d’une chaise pliante.',
    'Ferme ta gueule et ferme le frigo. Pour une fois, deux ordres à ta portée.',
    'Même au garde-à-vous, t’as l’air d’être en pause, branleur.',
    'Le seul objectif que t’as jamais pris d’assaut, c’est ce putain de kiosque.',
    'Si la connerie pesait dans le paquetage, t’aurais une dispense de marche à vie.',
    'T’es la preuve qu’on peut porter du camouflage et rester une erreur parfaitement visible.',
    'J’ai demandé un compte rendu. Pas le menu de tes putains de vacances.',
    'Ta plus belle manœuvre, c’est d’éviter l’effort sans renverser ta canette.',
    'Le frigo ferme mieux sa gueule et garde mieux son sang-froid que toi.',
    'T’as un talent rare : rendre une pause moins méritée rien qu’en y participant.',
    'On t’a donné un grade, pas une excuse pour glander avec du galon.',
    'Rompez, feignasse. Et essaie de ne pas te perdre sur les trois mètres du retour.',
  ],
  sugary: [
    'Suralimenté et sous-entraîné. Au moins, t’es constant, bordel.',
    'Encore du sucre ? T’es une recrue ou une putain de confiserie ?',
    'Du carburant de compétition pour un troufion qui cale au premier escalier.',
    'Tu ravitailles un moteur que t’as jamais eu le courage de démarrer.',
    'T’as prévu de brûler ça comment ? En réfléchissant ? On est foutus.',
    'Avec tout ce sucre, on pourrait alimenter la section. On a choisi d’entretenir un glandeur.',
  ],
  'sugar-free': [
    'Zéro sucre. Zéro effort. Tu soignes la cohérence, petit branleur.',
    'Sans sucre. La discipline aussi est en option, chez toi ?',
    'T’as retiré le sucre. Il reste à retirer ta putain de flemme.',
    'Zéro sucre, c’est écrit dessus. Zéro mérite, ça se voit à côté.',
    'Allégé en sucre, chargé en excuses. Le régime habituel de la section.',
    'Tu choisis le sans-sucre avec le sérieux que t’as jamais mis dans une consigne.',
  ],
  energy: [
    'Deux cents chevaux dans la canette. Un demi-âne derrière.',
    'T’as acheté de l’énergie. Essaie d’en faire autre chose qu’un putain de rot.',
    'Une boisson énergisante pour rester assis avec plus de conviction. Beau projet, branleur.',
    'Tu peux secouer la canette. Ça remplacera pas les couilles qu’il faut pour se mettre au travail.',
    'Le seul truc explosif dans ton programme, c’est le marketing sur la canette.',
    'Si cette canette te donnait de la volonté, on en commanderait une putain de citerne.',
  ],
  coffee: [
    'Café noir, sans sucre. Voilà ma commande. Toi, on t’a toujours pas commandé d’avis.',
    'Un café pour ouvrir les yeux. Pour te sortir les doigts du cul, faudra autre chose.',
    'Même le marc a plus de tenue que toi au rassemblement.',
    'Ton café est serré. Ta discipline prend toute la putain de place disponible.',
    'Tu peux le prendre double. Deux fois rien, ça fait toujours un branleur.',
    'Réveille-toi, bordel. Le café fait sa part. Ça serait bien que tu commences la tienne.',
  ],
  alcohol: [
    'T’as encore rien fait et tu t’occupes déjà du pot de départ. Sacré branleur.',
    'Tu te crois vétéran ? Ta seule campagne, c’est contre le stock du frigo.',
    'Tu tiens mieux ton verre que tes engagements. La barre est au ras du sol.',
    'Le degré est sur l’étiquette. Le niveau, malheureusement, c’est toi.',
    'À défaut de tenir la position, tu tiens le comptoir. Chacun son putain de front.',
    'On cherchait un pilier pour la section. On a récupéré un pilier de bistrot.',
  ],
  water: [
    'De l’eau. Enfin une décision qui dépasse ton niveau habituel, abruti.',
    'De la flotte. La gourde était donc pas la seule chose vide dans ton paquetage.',
    'Même sans bulles, cette flotte a plus de ressort que toi.',
    'De l’eau plate pour une carrière qui l’est tout autant. Belle harmonie, bordel.',
    'Hydrate-toi. Tes excuses deviennent tellement sèches qu’elles prennent feu.',
    'Tu prends de l’eau. On progresse. Le prochain miracle, ce sera de te voir marcher.',
  ],
  snack: [
    'Le seul craquement qu’on entend chez toi, c’est le paquet. Pas les articulations au travail.',
    'Mâchoire opérationnelle. Le reste est toujours en putain de maintenance.',
    'T’as mis plus de détermination à ouvrir ce paquet qu’à finir ta dernière mission.',
    'J’ai demandé des éclaireurs. Pas des putains d’aspirateurs à miettes.',
    'Ration de combat ? Avec toi, c’est surtout le paquet qui se fait embusquer.',
    'Encore un snack. Tu prépares une marche ou l’hibernation, espèce de sac à provisions ?',
  ],
  bulk: [
    'C’est un panier ou le ravitaillement de ton putain de bataillon imaginaire ?',
    'T’as pris de quoi tenir un siège. Faudrait déjà tenir debout sans te plaindre.',
    'Toute cette logistique pour un seul branleur. La Suisse voit grand.',
    'Autant de provisions et toujours pas une seule réserve de bon sens.',
    'T’as vidé le kiosque avec une efficacité qu’on attend encore sur le terrain.',
    'Sacré chargement. Dommage que le courage se vende pas par packs de six.',
  ],
};
export const quotes: Quote[] = [
  ...legacyQuotes,
  ...Object.entries(bank).flatMap(([topic, texts]) =>
    texts.map((text, i) => ({
      id: `piller-v2-${topic}-${i + 1}`,
      text,
      topic: topic as QuoteTopic,
    })),
  ),
];
type QuoteLine = {
  product: { is_beverage: boolean; details?: Partial<ProductDetails> };
  quantity: number;
};
export function selectQuote(previousId?: string | null, lines?: readonly QuoteLine[]): Quote;
export function selectQuote(
  previousId: string | null | undefined,
  lines: readonly QuoteLine[],
  pool: readonly Quote[],
): Quote | undefined;
export function selectQuote(
  previousId?: string | null,
  lines: readonly QuoteLine[] = [],
  pool: readonly Quote[] = quotes,
) {
  const topics = new Set<QuoteTopic>();
  for (const { product } of lines) {
    const d = product.details;
    if (d?.alcohol === 'present') topics.add('alcohol');
    else if (product.is_beverage && d?.kind === 'energy') topics.add('energy');
    else if (product.is_beverage && d?.kind === 'coffee') topics.add('coffee');
    else if (d?.kind === 'snack') topics.add('snack');
    else if (product.is_beverage && d?.kind === 'water') topics.add('water');
    else if (d?.sugar === 'present') topics.add('sugary');
    else if (product.is_beverage && d?.sugar === 'none') topics.add('sugar-free');
  }
  if (lines.reduce((sum, l) => sum + l.quantity, 0) >= 4) topics.add('bulk');
  const eligible = pool.filter(
    (q) => !q.archived && q.enabled !== false && (q.topic === 'general' || topics.has(q.topic)),
  );
  const fresh = eligible.filter((q) => q.id !== previousId);
  const available = fresh.length ? fresh : eligible;
  const contextual = available.filter((q) => topics.has(q.topic));
  const general = available.filter((q) => q.topic === 'general');
  const choices =
    contextual.length && (!general.length || Math.random() < 0.8) ? contextual : general;
  return choices[Math.floor(Math.random() * choices.length)];
}
