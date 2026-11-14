# RAVIT — corrections de la critique UI/UX

> Exécution native dans le dossier actuel, autorisée par « fais tout ces modifications ». Compétences : writing-plans et executing-plans ; validation finale avec verification-before-completion.

**But :** appliquer les quatre priorités et les retouches secondaires du rapport Impeccable du 14 novembre, sans changer le thème ni les règles financières.

**Architecture :** composants React existants et CSS local/global. Aucun nouveau service, aucune migration, aucune dépendance. Le panier reste validable directement ; son détail est facultatif et modifiable. Les informations personnelles des patchs remontent sans déplacer les règles de facturation.

**Spécification approuvée :** `.impeccable/critique/2026-11-14T20-17-03Z__src-features-checkout-view-tsx.md`.

## Tâches

- [x] Comptes admin : mise en page mobile identité puis montant/action ; accès clair au téléphone et copie ; rappel TWINT près du tableau ; retirer Piller de cet écran.
- [x] Kiosque : détail du panier dépliable (noms, quantités, sous-totaux), visuel absent compact, catégories de largeur naturelle sur mobile.
- [x] Patchs : résumé de réservation personnelle et total estimé/définitif près du titre ; conserver Artwork/Print et les formulaires existants.
- [x] Profil et ardoise : installation près du titre, coordonnées avant succès, champs Grade/Nom empilés sur mobile ; Détail tactile 44 px et aide TWINT explicite.
- [x] Navigation : remplacer Plus par Réglages ; liens internes avec flèche horizontale ; lien financier tactile 44 px.
- [x] Vérifier : 148 tests Vitest, build avec TypeScript, trois parcours navigateur avec base mémoire uniquement, 27 captures 320/390/1440. Une passe groupée puis confirmation après corrections.

## Points à vérifier

Noms longs et montants élevés à 320 px ; panier dont les produits sont masqués par recherche ; modification/vidage du panier et débit unique ; images présentes/absentes ; patch réservé puis commandé ; navigation clavier et absence de débordement. Ne pas confondre le total enregistré d’une réservation avec une quantité en cours de modification. Garder les comptes à zéro visibles par défaut et les avoirs accessibles.

## Vérification réalisée

- `pnpm test` : 148 tests dans 42 fichiers, tous réussis.
- `pnpm build` : compilation et TypeScript réussis. Build exécuté hors sandbox : la création de jonction Windows pour sharp est refusée dans la sandbox.
- `playwright test tests/e2e/critique-follow-up.spec.ts tests/e2e/avatar-picker.spec.ts` : 3 scénarios réussis ; nouvelle confirmation du premier après les dernières corrections CSS : 1 scénario réussi.
- Panier : le membre ajoute eau et bière, recherche Twix (qui masque ses choix), ouvre le panier, modifie l’eau et confirme. Une seule requête checkout ; solde mémoire CHF 7.50.
- Patchs : deux images de fixture visibles, résumé personnel avant galerie, état réservé puis commande réelle en mémoire à prix définitif. Aucun achat/règlement/média créé en production.
- Captures conservées localement dans `.impeccable/review/critique-follow-up/`, mesures dans `checks.json`. Aucun débordement aux trois largeurs, aucune erreur navigateur.
- Une revue statique indépendante Sol 6.1 medium ne relève aucun problème actionnable.
- Les petites corrections finales portent sur la priorité CSS des catégories, l’alignement du résumé de panier et l’espacement des succès du profil.
