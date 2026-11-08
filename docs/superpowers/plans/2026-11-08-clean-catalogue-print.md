# Nettoyage, recherche et documents Falcons

**Demande :** alléger l’admin et le kiosque, trouver rapidement les articles, réduire les catégories et harmoniser catalogue PDF/affiche QR avec l’app.

**Direction :** conserver l’identité tactique v3, les animations discrètes et les protections financières. Exécution native dans ce dossier autorisée. Préserver les changements du second chat (admin, classement, focus/navigation) jusqu’à leur commit.

## Tâche 1 — Trouver un article
- [x] Tests métier RED : quatre familles, reprise des anciennes catégories sans perdre le type, bière sans alcool, snacks sans déduction depuis le seul sucre, recherche tolérant accents/espaces/tirets.
- [x] Familles : Boissons sans alcool, Boissons alcoolisées, Snacks salés, Snacks sucrés. Les anciens produits ambigus restent « À classer » en administration, et trouvables dans Tout/recherche au kiosque.
- [x] Séparer famille de navigation et type précis utilisé par Piller. Importer salé/sucré depuis la taxonomie fournisseur, jamais depuis le seul taux de sucre.
- [x] Recherche instantanée au kiosque, filtres courts et retour facile à Tout ; panier conservé entre recherches et filtres.

## Tâche 2 — Nettoyer les écrans
- [x] Formulaire produit : nom/référence, famille, achat/vente/écart ; caractéristiques, photo et tarification automatique dans Options du produit.
- [x] Supprimer les sous-titres redondants ; raccourcir les aides et confirmations sans perdre leurs conséquences. Garder erreurs, montants et traces nécessaires.
- [x] Garder les crédits des photos accessibles, regroupés sous un seul volet au kiosque.
- [x] Reprendre les copies admin après le commit du second chat, sans écraser ses filtres ni son adaptation mobile.

## Tâche 3 — Documents
- [x] En-tête anthracite, accents verts, marque Falcons et polices Rajdhani/Barlow ; corps clair lisible à l’impression.
- [x] Catalogue : familles, produit/format/prix, sans disponibilité ni texte répété ; pagination et noms longs robustes.
- [x] Affiche d’accès : titre bref, QR noir sur blanc avec zone calme préservée, URL lisible et consigne courte.
- [x] Rendu PNG, inspection de pages représentatives, extraction du texte et décodage du QR réellement rendu.

## Livraison
- [x] Vitest, TypeScript, build, E2E recherche/filtres/panier/édition produit.
- [x] Une passe visuelle groupée desktop/mobile/PDF, puis une seule passe corrective.
- [x] Revue indépendante : migration logique des familles, caractéristiques et historique inchangés, recherche vide, pagination/QR.
Publication automatique sur Vercel après l’envoi du commit validé sur GitHub, dans le périmètre déjà autorisé.

## Validation finale
- Vitest :85/85 ; TypeScript et build verts. E2E ciblés :9 parcours passés (admin, recherche membre, import, droits, corrections et améliorations UX).
- Douze captures desktop/mobile320/390px :0erreurJavaScript,0débordement.
- PDF : catalogue exemple, catalogue61articles sur6pages, catalogue vide, affiche d’accès ; rendu Poppler inspecté, QR décodé vers https://falcons-kiosk.vercel.app/. Polices Barlow/Rajdhani présentes dans le manifeste de la fonction documents.
- Revue indépendante :0Important/Critical. Recherche compacte combinée « cocacola33cl » (avec espace entre nom et format) améliorée après reproduction RED ; test GREEN et suite complète verte.
- Décision : aucune classification salé/sucré basée sur le seul sucre. Les références legacy ambiguës restent À classer, accessibles dans Tout et la recherche. Leurs données historiques ne sont pas réécrites.
- Préservation : améliorations mobiles/focus du second chat intégrées dans l’ascendance628ec2c/206e08f ; voix inchangée.
