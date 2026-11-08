Method: dual-agent (A: /root/ui_critique_a · B: /root/ui_critique_b)

# Falcons — critique UI/UX et adaptation mobile

8 novembre 2026. Deux évaluations indépendantes, GPT‑6.1 Sol, réflexion moyenne. A a terminé avant la lecture des résultats du détecteur B par le coordinateur. Cible : `src/components/app.tsx` et ses écrans membres/admin. Revue initiale sur la version admin UX, puis correctifs demandés explicitement par le propriétaire pendant la revue. La voix est en pause.

## Verdict

L’identité tactique est cohérente, mature et propre à Falcons : noir teinté de vert, Rajdhani, panneaux sobres, contours et faucon mesurés. Elle doit être conservée. Le principal défaut initial était l’adaptation mobile de composants conçus pour davantage de largeur, plutôt que la direction graphique.

**Estimation heuristique initiale : 29/40, bonne base.** Ce score professionnel est une appréciation, pas une mesure utilisateur. Il n’a pas été recalculé artificiellement après les correctifs.

| Heuristique Nielsen | /4 | Observation initiale |
|---|---:|---|
| Visibilité de l’état | 3 | Solde, sélection, navigation et états de reprise explicites. |
| Langage métier | 4 | Ardoise, règlement reçu, coût par article et TWINT externe compréhensibles. |
| Contrôle et liberté | 3 | Quantités réversibles et Escape ; retour de focus des dialogues à améliorer. |
| Cohérence | 3 | Composants stables ; période et indicateur mélangés dans le classement. |
| Prévention des erreurs | 3 | Identité, montant et rappel TWINT avant confirmation ; pas de validation métier exécutée. |
| Reconnaissance | 3 | Bons libellés ; actions de tableaux mobiles hors champ. |
| Efficacité | 2 | Recherche membres présente ; recherche/filtre des produits absent. |
| Esthétique et simplicité | 3 | Identité aboutie ; densité et longueur de certaines vues. |
| Récupération des erreurs | 3 | Reprise explicite dans le code ; pannes et confirmations non exercées dans cette revue. |
| Aide contextuelle | 2 | Bonnes explications prix/TWINT ; récupération dépend du responsable déjà connu. |

## Points forts

- Le kiosque expose le solde, les produits, les quantités puis un engagement explicite « Ajouter à mon ardoise » : sélection et enregistrement sont bien distingués.
- Le dialogue de ravitaillement différencie nombre d’articles, total fournisseur et prix de vente, avec le coût unitaire au moment utile.
- Le règlement est nominatif et rappelle de vérifier l’argent reçu dans TWINT ; l’interface ne suggère pas une intégration de paiement automatique.

## Cinq priorités et leur état

1. **P1 — Actions administratives mobiles hors champ : corrigé.** Le tableau produits atteignait environ 776px dans une zone de 276px à 320px ; le bouton Modifier se trouvait autour de x737. Achats et dépenses avaient le même problème. Il s’agissait d’un défilement interne non annoncé, pas d’un débordement global. Les trois listes deviennent maintenant des fiches à libellés, avec montants et actions visibles dans la largeur du téléphone. Les tableaux restent disponibles sur ordinateur. Commande adaptée : Impeccable adapt.
2. **P2 — « Contributeurs » dépassait son bouton : corrigé.** Les trois commandes égales laissaient environ 90px par bouton à 320px. Les deux types de classement ont désormais leur propre ligne ; le texte tient sans diminuer sa police. Le test mesure le rectangle réel du texte, pas seulement la largeur du document. Commande : adapt.
3. **P2 — Indicateur et période mélangés : corrigé.** « Contributeurs », « Buveurs », « Depuis le début » mélangeaient deux axes. Le type et la période des contributions sont maintenant séparés. Les trois jeux de données existants sont conservés ; le classement boissons reste hebdomadaire. L’état sélectionné est annoncé par `aria-pressed`. Commande : clarify.
4. **P2 — Catalogue admin sans recherche ni filtre d’état : reste ouvert.** Les archives se mêlent aux produits actifs. Ajouter une recherche de nom et un accès explicite aux désactivés réduirait le temps de recherche. Les nombreux noms QA observés sont des données de démonstration ; ils ne sont pas un défaut de marque. Commande : distill/onboard.
5. **P2 — Retour de focus après dialogue : reste ouvert.** Dans la revue B, fermer l’aide d’installation ou l’éditeur ramenait le focus clavier sur BODY plutôt que sur le déclencheur. Conserver le déclencheur et lui rendre le focus après fermeture. La fermeture Escape et l’isolation modale fonctionnaient. Commande : harden.

## Charge cognitive, personnes et parcours

Le parcours membre a une charge faible : produit, quantité, total et confirmation, sans information à retenir entre deux écrans. L’administration a une charge modérée, surtout avec les archives et les tableaux larges. Deux échecs partiels initiaux : actions peu visibles et mémoire nécessaire pendant le balayage horizontal. La nouvelle présentation mobile traite ces deux problèmes.

- **Membre distrait sur téléphone :** les boutons + et le panier bas aident ; noms longs et montants ont maintenant chacun leur place. Les distinctions personnelles restent après toute la liste et méritent d’être remontées ou résumées.
- **Nouveau membre :** inscription courte et autonome ; la récupération suppose de savoir joindre le responsable. Ne pas inventer de coordonnées de contact.
- **Responsable du vendredi :** recherche des dettes et confirmation nominative rassurantes ; le catalogue actif/archivé reste long à parcourir malgré les actions devenues visibles.

Le moment sensible est l’engagement sur l’ardoise puis la confirmation d’argent reçu. Les formulations et le contexte nominatif sont adaptés. Le bénéfice social personnel arrive tard dans le classement. Aucun ressenti de participant réel ni paiement réussi n’est déduit de captures seules.

## Observations secondaires

Les liens actifs n’exposent pas encore `aria-current` ; Finances/Documents n’ont pas de repère actif dans la navigation basse. Certains petits contrôles d’authentification méritent une cible tactile élargie. Les photos distantes vides/longues à charger demandent une validation sur catalogue réel, sans conclure à partir des références QA. Le badge Next de développement n’est pas un élément du produit.

L’adaptation a aussi augmenté les libellés de navigation admin à 12px, autorisé les noms longs à revenir à la ligne et conservé les sommes CHF ensemble. À 320px, les indicateurs financiers deviennent des lignes libellé/montant plutôt que des cases comprimées. Le dernier indicateur occupe la largeur disponible à 390px.

## Détecteur et limites

Le détecteur a retourné **73 avis de documentation du design system** : 57 tailles de police et 16 couleurs, dans `src/app/globals.css` et `src/features/documents/service.ts`. Aucun avis TSX. Les couleurs noir/blanc des PDF sont des faux positifs pour l’interface web ; les tailles responsive et tons des illustrations ne constituent pas chacun un défaut UX. Ne pas confondre 73 avis avec 73 problèmes à corriger.

Les 14 routes ont été parcourues sur ordinateur et téléphone, avec une couverture B à 320/390/1440px. A : 35 captures. B : 42 captures de routes/largeurs et dialogues d’installation, produit et achat. Échantillon de contrastes opaques sans ratio calculé inférieur à 4.5 ; ce n’est pas une certification AA. Pas de test physique iPhone/Android, lecteur d’écran, réseau lent ou validation des opérations métier.

Après adaptation : **2 scénarios Chrome réussis**, après échec initial reproduisant texte hors bouton et action hors écran ; largeurs 320/390/760/1440 pour le classement, 320/390 pour les listes admin. TypeScript réussi. Une inspection groupée puis une confirmation ciblée ; 15 captures finales, aucune erreur JavaScript ni débordement global. Aucun achat, règlement, changement de profil ou produit confirmé ; seuls les comptes fictifs ont été connectés. Les dépenses déjà annulées n’exposent volontairement pas d’action Annuler.

## Preuves

Racine : `.impeccable/review/ui-ux-2026-11-08/`.

- Avant : `a/mobile-falcons.png`, `a/mobile-admin-produits.png`, `a/mobile-admin-achats.png`.
- Rapports indépendants : `a/report.md`, `b/report.md` ; scan complet : `b/detector.json`.
- Après : `after/falcons-320.png`, `after/falcons-390.png`, `after/admin-produits-390.png`, `after/admin-achats-320.png`, `after/admin-finance-320.png`, `after/checks.json`.
- Régression : `tests/e2e/mobile-layout.spec.ts`.

## Questions pour la suite

1. Priorité suivante : recherche/archives du catalogue, ou position/distinctions personnelles plus visibles dans Falcons ?
2. Périmètre suivant : ces améliorations de parcours seulement, ou également le focus clavier et les repères de navigation ?
