# Tickets de service — validé le 11 novembre 2026

Le membre déclare librement ses consommations. Un admin peut noter séparément ce qu'il sert, pour repérer des quantités à vérifier sans doubler la facturation.

## Approche retenue

Tickets de contrôle indépendants. L'alternative consistant à facturer les services admin imposerait de dédoublonner les achats autonomes et n'est pas retenue. Le demandeur a validé les tickets indépendants, puis précisé que l'accès doit être réservé aux comptes admin et se trouver directement sur les produits de l'écran principal du kiosque. Il autorise le push après vérification.

## Parcours

- Action « Servir » sur chaque carte produit, uniquement pour l'admin. L'ajout au panier personnel reste distinct.
- Ouvre la sélection du membre : un appui enregistre une unité immédiatement. Le produit reste sélectionné pour enchaîner, recherche par nom/grade et personnes récemment servies.
- Confirmation locale et annulation rapide ; les reprises réseau retrouvent la même opération, y compris après fermeture du sélecteur.
- Contrôle admin accessible depuis le kiosque et l'administration : période inclusive en dates Europe/Zurich, aujourd'hui par défaut, maximum 93 jours. Compte par membre et produit, historique des 100 derniers tickets sur la période et annulations motivées.
- Seuls les couples membre/produit ayant un ticket actif apparaissent dans le contrôle. Déclarations inférieures aux services : « À vérifier ». Égales : « Quantités cohérentes ». Supérieures : « Libre-service possible ». Le comptage ne prouve pas le rapprochement individuel et une déclaration peut arriver plus tard.

## Intégrité et limites

Tickets numériques, sans impression. Aucun impact automatique sur l'ardoise, les règlements, la marge ou les classements. Les déclarations comparées sont les achats catalogue nets des retraits/annulations ; articles libres et patchs exclus. Les produits sont identifiés par ID, les libellés de ticket sont figés. Tout admin actif peut annuler un ticket avec motif ; pas d'effacement de l'historique. Authentification et contrôle admin côté serveur pour lecture/création/annulation. Sauvegarde/restauration et reset intègrent la nouvelle table ; anciennes sauvegardes compatibles.

Choix d'implémentation : réutiliser les composants et la direction sombre/verte du projet, sans nouvelle dépendance. Vérifications sur base fictive locale uniquement ; aucune migration distante lancée sans configuration de déploiement existante.

## Visiteurs — précision du demandeur

Si la personne ne figure pas dans les membres, créer depuis le sélecteur une fiche visiteur avec son seul nom, sans téléphone, mot de passe ni accès à l'application. Lui attribuer les tickets normalement. Conserver cette fiche jusqu'à son éventuel rattachement manuel à un compte inscrit, choisi et confirmé par un admin. Le rattachement conserve les tickets, leurs auteurs/dates et le nom initial ; il permet leur recoupement sur le compte, sans créer de dette. Ne jamais fusionner automatiquement sur le nom ni fusionner deux comptes authentifiés.
