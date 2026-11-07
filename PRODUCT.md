# Kiosque Falcons

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Aucun code applicatif n'existe encore. Hébergement confirmé : Vercel. La moodboard et les deux écrans de la direction tactique v3 ont été validés explicitement par le demandeur. Proposition technique dans le plan : Next.js avec TypeScript, PostgreSQL en production et PostgreSQL embarqué pour le développement local. Ces choix techniques sont des recommandations, pas des contraintes formulées par le demandeur.

## Users

Une section d'au moins 60 membres, des visiteurs qui créent eux-mêmes un compte normal, et un responsable administrateur du kiosque. L'utilisateur enregistre rapidement les produits qu'il prend au kiosque ou dans le frigo depuis son téléphone.

## Product Purpose

Remplacer la feuille à croix et le calcul manuel des dettes par des consommations sur ardoise, avec règlement hebdomadaire externe et suivi des achats. Conserver la confiance et l'autonomie du fonctionnement actuel.

## Positioning

Un kiosque propre à la famille Falcons, sans frais logiciels proportionnels au nombre de comptes, avec une inscription autonome et des paiements TWINT confirmés manuellement par le responsable.

## Operating Context

La personne choisit des produits, confirme leur ajout à son ardoise puis les prend physiquement. Le vendredi notamment, le responsable retrouve les noms, grades, téléphones et montants dus pour demander les paiements dans TWINT en dehors de l'application. Il indique ensuite les règlements effectivement reçus. Le QR code affiché au kiosque donne accès au site. L'installation sur l'écran d'accueil est facultative.

## Capabilities and Constraints

- Compte avec grade, nom et téléphone ; inscription sans validation administrative.
- Catalogue et coûts d'achat gérés par l'administrateur ; majoration en pourcentage souhaitée, prix manuel proposé en complément.
- Consommations, historique personnel, solde, règlements traçables et dettes reportées.
- Pas d'intégration TWINT en V1.
- Succès hebdomadaires, classement des boissons et classement des contributeurs calculé sur le montant des achats, jamais sur leur marge ou la date de paiement.
- PWA pour téléphone ; connexion requise pour confirmer les opérations.
- Catalogue imprimable et PDF A4 d'accès par QR code, à générer depuis l'administration.
- Paramètre administrateur « Activer Adjudant Piller » : une réplique humoristique et insultante issue d'une liste préétablie s'affiche après chaque achat confirmé et est lue à voix haute en parallèle. Le texte reste visible si le son est coupé sur le téléphone.
- Français, CHF et fuseau Europe/Zurich.
- Les téléphones, dettes et achats détaillés d'autres membres sont réservés aux administrateurs ; les classements de section exposent les seuls agrégats sociaux prévus au PRD après connexion.
- L'inventaire détaillé reste hors V1 dans la proposition actuelle ; la marge est une estimation à partir des coûts renseignés.
- Restent à confirmer : code de section éventuel, arrondi des prix, autres dépenses, certains détails des succès. Les choix proposés sont identifiés dans le PRD.

## Brand Commitments

Falcons, éclaireurs, identité militaire et sentiment d'appartenance à une famille. Personnalisation demandée pour l'application, les badges, l'icône PWA et les documents. Aucun logo, écusson ou fichier de marque fourni à ce jour ; ne pas prétendre qu'un emblème proposé est officiel.

Direction précisée par les références visuelles explicites du demandeur : interface tactique contemporaine et mature, noire/anthracite avec accents verts, typographie technique, panneaux structurés et détails topographiques ou filaires mesurés. L'identité militaire et de famille Falcons reste centrale. La proposition vintage forêt/olive/laiton avec écussons brodés est rejetée comme trop ancienne. La seconde proposition cobalt/pistache, typographie ronde, stickers et avatar cartoon est également rejetée comme trop enfantine. « Moderne » signifie ici tableau de commande tactique sobre, pas application ludique pour adolescents. Les deux références visuelles fournies font autorité sur les interprétations précédentes.

La proposition tactique v3 a été approuvée le 7 novembre 2026. Référence : docs/superpowers/specs/2026-11-07-falcons-direction-ui-v3.md et les images falcons-v3-moodboard.png, falcons-v3-mobile.png et falcons-v3-admin.png dans .impeccable/mocks/decision.

## Evidence on Hand

PRD discuté et complété avec le demandeur : docs/superpowers/specs/2026-11-07-kiosque-prd.md, version 0.5. Le demandeur a demandé le début du développement le 7 novembre 2026, avec validation de la direction UI/UX avant de commencer, puis a rejeté les deux premières propositions visuelles. Références conservées dans docs/design/references/tactical-dashboard.png et docs/design/references/tactical-community.png : elles orientent le style, pas les fonctions du kiosque. Aucune donnée réelle sur les membres, aucun catalogue réel ni adresse de déploiement n'ont été fournis. Les exemples d'interface devront être identifiés comme démonstration.

## Product Principles

- Enregistrer un achat courant en quelques gestes.
- Inscription et usage autonomes, sans validation individuelle.
- Des soldes et règlements compréhensibles et traçables.
- Une famille Falcons visible, sans masquer les actions et montants essentiels.
- Protéger les informations de compte tout en partageant les classements convenus.

## Accessibility & Inclusion

Lisibilité sur téléphone, cibles tactiles confortables, actions essentielles explicites, statuts compréhensibles sans couleur seule et réduction des mouvements. Le support imprimé doit rester lisible en noir et blanc.
