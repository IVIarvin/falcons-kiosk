# Mouvement discret du kiosque

**Demande :** animations propres, fluides, intégrées et mesurées, avec les skills d’Emil Kowalski (`emil-design-eng` et `animate`).

**Décision :** CSS natif, aucun ajout de dépendance. Conserver la courbe `--ease` existante et ajouter des durées communes de 120/180/220 ms.

- Moment principal : apparition d’une fenêtre avec un très léger rapprochement et fondu synchronisé du fond.
- Continuité : apparition discrète des notifications et fondu de la confirmation d’achat, sans déplacer les montants.
- Feedback : appui bref sur les boutons ; interaction clavier immédiate.
- Budget : pas d’animation de page, tableau, carte produit, défilement ou classement ; pas de rebond, boucle décorative ni animation de dimensions.
- Accessibilité : conserver un fondu bref en mouvement réduit, supprimer les déplacements ; aucun contenu caché si `@starting-style` est indisponible.
- Fermeture : les composants contrôlés gardent leur retrait immédiat et leur gestion native du focus ; aucun délai ajouté à la validation ou à l’annulation d’une opération.

**Vérification :** contrôles navigateur desktop/mobile, ouverture/fermeture répétée, clavier, préférence de mouvement réduit et transitions ne visant que transform/opacity. Compilation finale et publication du commit.

**Résultats :** Chrome confirme des transitions natives de 220 ms sur opacity/transform, zéro animation au clavier, un fondu réduit de 120 ms sans transform, fermeture répétée et Échap fonctionnels, aucun débordement mobile ni erreur JavaScript. Build réussi. Revue indépendante : aucun Important/Critical. Safari/Firefox non vérifiés sur appareil réel.
