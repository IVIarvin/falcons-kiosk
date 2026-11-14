---
target: "Écrans principaux RAVIT : kiosque, ardoise, patchs, profil, classements et administration"
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\Ultron\\Documents\\ChatGPT\\kiosk armée\\src\\features\\checkout\\view.tsx"
target_fingerprint: "sha256:57b33c573deb220c36a965ab6d565c4feffd11307a1b93c6c361b1762cc211f8"
target_path: "C:\\Users\\Ultron\\Documents\\ChatGPT\\kiosk armée\\src\\features\\checkout\\view.tsx"
timestamp: 2026-11-14T20-17-03Z
slug: src-features-checkout-view-tsx
---
Method: dual-agent (A: /root/critique_design_a · B: /root/critique_detector_b)

**La direction visuelle est solide. Le prochain gain vient de la lisibilité et de la rapidité des parcours.** Je garderais le noir/vert, la typographie et l’identité Falcons. Revue seule : aucun changement de code ni déploiement.

**Évaluation heuristique : 28/40 — bonne base.** Ce score est une appréciation de conception, pas une mesure de satisfaction réelle.

| Critère | /4 | Constat |
|---|---:|---|
| Visibilité du statut | 3 | Achat, solde et réservations explicites |
| Correspondance avec le terrain | 4 | Ardoise et règlement externe compréhensibles |
| Contrôle et liberté | 3 | Annulation, retrait et reprise prévus |
| Cohérence | 3 | « Plus » mène à une page « Réglages » plus large que son nom |
| Prévention des erreurs | 3 | Panier peu vérifiable au dernier geste |
| Reconnaissance plutôt que mémorisation | 2 | Produits sélectionnés dispersés dans le catalogue |
| Efficacité | 3 | Recherche utile ; cartes sans photo trop hautes |
| Sobriété et hiérarchie | 2 | Place excessive donnée aux éléments secondaires |
| Récupération des erreurs | 3 | Corrections et reprises traçables |
| Aide contextuelle | 2 | Déroulement TWINT encore trop implicite côté membre |

**Ce qui fonctionne**

- L’identité tactique paraît propre à cette section : elle est cohérente et mérite d’être conservée.
- L’ardoise distingue clairement le montant dû, les paiements et les consommations. Les classements avec avatars restent lisibles.
- Les patchs expliquent l’objectif en pièces et l’absence de débit immédiat. Le sélecteur d’avatar sépare correctement aperçu et enregistrement.

**Les quatre priorités**

1. **[P1] Règlements : le tableau dégrade les noms sur petit téléphone.** À 320 px, certains noms se fragmentent sur environ sept lignes, parfois au milieu des mots. Cela ralentit la vérification du bon membre avant de confirmer un paiement. **Proposition :** identité sur toute la largeur, puis montant et action sur une seconde ligne ; garder le tableau sur ordinateur. Commande : `$impeccable adapt`.

2. **[P2] Kiosque : le panier affiche un montant, mais pas son contenu.** Une fois les produits hors écran ou masqués par une recherche, il faut se souvenir de ses choix avant de les ajouter à l’ardoise. **Proposition :** rendre la barre de panier dépliable avec noms, quantités et total, sans imposer une nouvelle confirmation à chaque achat. Commande : `$impeccable clarify`.

3. **[P2] Kiosque : les produits sans photo occupent trop d’espace.** La variante actuelle réserve un grand cadre à un petit pictogramme. Le catalogue devient long à parcourir pour peu d’information. **Proposition :** une carte plus compacte en l’absence de photo, avec nom, prix et ajout rapprochés. Ce constat vient d’un catalogue de test sans images ; il ne décrit pas la proportion de photos manquantes en production. Commande : `$impeccable distill`.

4. **[P2] Admin : Piller concurrence les règlements.** Son grand panneau occupe une colonne sur ordinateur et prolonge beaucoup la page mobile. Il s’agit d’une configuration occasionnelle, face à une tâche hebdomadaire. **Proposition :** garder la configuration dans les Réglages et placer près des paiements le rappel de confirmation après réception TWINT. Commande : `$impeccable distill`.

**Autres écrans et détails**

- **Patchs :** remonter « Ta réservation » et son total près du titre permettrait de retrouver immédiatement son engagement. La galerie avec Artwork/Print n’a pas été testée dans cette passe.
- **Profil :** les coordonnées arrivent après les succès ; le champ Nom est étroit sur mobile. Passer Grade et Nom sur deux lignes et rendre l’installation plus facile à trouver améliorerait les tâches pratiques.
- **Ardoise :** agrandir la zone tactile de « Détail », mesurée à environ 52 × 30 px, vers 44 px de haut. C’est une amélioration de confort, pas un constat automatique de non-conformité.
- **Navigation :** clarifier « Plus » et la page qu’il ouvre ; éviter les flèches évoquant une sortie pour des liens internes.
- **Catégories :** à 390 px, « Sucré » prend seul toute une deuxième ligne et semble artificiellement plus important.

**Charge cognitive et parcours**

Les cinq catégories et les six avatars ne constituent pas, à eux seuls, une surcharge. Le vrai effort est de mémoriser un panier dont les lignes sont dispersées. L’entrée dans le kiosque rassure par son solde visible ; la sélection ralentit lorsque les cartes manquent de contenu visuel ; la confirmation termine clairement le parcours. Les patchs offrent un bon enchaînement entre objectif collectif et engagement personnel.

Trois situations exposent les frictions : le responsable qui vérifie un nom sur petit téléphone, le membre pressé au frigo qui veut contrôler ses achats, et le nouveau membre qui ne sait pas encore comment régler son ardoise avec TWINT.

**Ce que confirme l’inspection technique**

Deux inspections indépendantes : 36 captures pour A et 15 vues pour B, aux largeurs 320, 390 et 1440 px, avec données fictives en mémoire. Aucun débordement horizontal ni erreur JavaScript sur les états inspectés. Cela ne garantit pas la qualité de tous les états : les noms peuvent rester illisibles sans provoquer de débordement.

Le détecteur relève 89 avertissements de styles : 68 tailles de texte, 20 couleurs et un rayon. Ils concernent principalement globals.css, puis admin-data/view.module.css, documents/access.ts, patches/image-view.module.css, patches/view.module.css et profile/avatar-picker.module.css. Les couleurs noir/blanc du QR et plusieurs variantes typographiques documentées sont intentionnelles. Le signal de padding du tableau est vraisemblablement un faux positif ; un passage ultérieur détecte aussi la couleur de son propre surlignage. Ces avertissements ne justifient pas une refonte du thème.

**Questions pour la suite**

1. Quelle priorité : **règlements mobile**, **parcours d’achat**, ou **les deux** ?
2. Quel périmètre : **les quatre priorités**, ou **ces priorités avec les petits ajustements profil/patchs/ardoise** ?
