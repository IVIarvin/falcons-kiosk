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

Livraison commune effectuée avec le lot Données/favoris de l’autre chat : commit `f036218f6e7464d799344fe7f43fd69cebbf2a18`, déploiement `dpl_Ei7WAJDzp8XsYnem8WufPwGj4jUN`. État READY, cible production et alias public confirmés via l’API Vercel. Sauvegarde avant migrations006/007, empreinte vérifiée et comptes/opérations existants conservés ; aucun reset de production.

Contrôle public indépendant dans Chrome : connexion et manifeste200, API état401 sans session, route Patchs renvoyée à la connexion ; les7scripts client servis contiennent les entrées libre et objectif/prix final. Aucun débordement, aucune erreur JavaScript ni mutation de production pendant ce contrôle. Preuve `.impeccable/review/release-006007/production-checks.json`.

Contrôle authentifié de livraison par l’autre chat : API état200, écran Données200/no-store, anonyme401 ; session technique temporaire supprimée après le contrôle. Preuve privée `.data/release-006007-production-smoke.json`. Les contrôles n’ont enregistré aucun achat, règlement ou reset réel.
