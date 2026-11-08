# Articles libres et patchs — vérification

## Fonctionnement livré dans le code

- Article oublié : nom, famille facultative (Autre par défaut), quantité et prix CHF. Ajout immédiat à l’ardoise, sans création de faux produit, sans perdre le panier courant.
- Patchs : compteurs de patchs et de réservations visibles par tous, progression vers CHF 100 minimum par défaut, objectif réglable par modèle.
- L’admin ajuste l’estimation selon la quantité et le devis. Il saisit explicitement le prix définitif avant la confirmation de commande fournisseur. Ce prix est utilisé pour les ardoises et figé ensuite.
- Réservation sans dette ; modification/annulation jusqu’à la date limite Suisse. Confirmation atomique/idempotente et refus d’un récapitulatif obsolète ou d’un montant final inférieur à l’objectif.
- Participants nominatifs réservés à l’admin. Commandes déjà passées non retirables par les membres ; corrections financières administratives tracées et signalées sur la réservation.
- Coûts inconnus visibles dans les finances, sauvegardes complètes et anciennes sauvegardes compatibles.

## Résultats locaux

- Vitest : 104/104, 29 fichiers.
- TypeScript : réussi.
- Intégration ciblée : 21/21 (articles/patchs et compatibilité des anciennes sauvegardes).
- Chrome : 2/2 nouveaux parcours, transport navigateur intercepté vers les vrais services sur PGlite mémoire. Authentification/production non remplacées par ces tests ; aucune opération réelle dans les comptes de production.
- 17 captures : `.impeccable/review/free-entry-patches/`. Les scénarios de démonstration emploient volontairement une date future et un objectif réduit pour vérifier les seuils ; l’objectif initial 100 CHF est contrôlé explicitement.
- Revue indépendante du socle et de l’extension prix par GPT‑6.1 Sol en réflexion moyenne : 0 Critical/Important/Minor.

## Livraison

Production cible : `https://falcons-kiosk.vercel.app`, projet `falcons-kiosk`, équipe configurée dans `.vercel/project.json`.

Le socle précédent 00d2d07 est déjà publié. Les nouveaux modules sont coordonnés avec le lot Données/favoris de l’autre chat : sauvegarde avant migrations006/007, construction du commit commun, publication puis contrôle de l’état READY et de l’URL. Aucune remise à zéro de production n’est autorisée par cette livraison.
