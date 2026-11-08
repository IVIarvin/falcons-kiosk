# Articles libres et réservations de patchs

## Décisions du propriétaire

- Article absent : le membre saisit nom, quantité et prix unitaire CHF ; le montant rejoint immédiatement son ardoise.
- Patchs : réservation d’abord, sans débit. L’admin confirme que la commande fournisseur a été passée ; cette confirmation ajoute les montants aux ardoises une seule fois.
- Déploiement explicitement demandé. La voix reste en pause. Identité tactique existante, exécution native et revue Sol6.1 medium conservées.

## Parcours

**Article libre.** Lien « Article manquant ? » au kiosque, également proposé après une recherche vide. Dialogue nom/famille/quantité/prix, total avant confirmation. La saisie reste distincte du panier catalogue, qui est conservé. Confirmation et reprise réseau idempotentes. Aucun faux produit ajouté au catalogue. L’historique distingue l’article libre ; correction personnelle dix minutes et correction admin identiques aux consommations habituelles. Coût inconnu signalé aux finances, renseignable par l’admin.

**Patchs membre.** Page Patchs, modèle/prix unitaire/date limite, quantité personnelle. Réserver remplace la quantité totale, ne l’incrémente pas. Modifier/annuler jusqu’au dernier jour inclus, heure Suisse, tant que la commande n’est pas confirmée. Aucun débit pendant cette phase. Les réservations d’autrui et téléphones restent privés.

**Patchs admin.** Créer un modèle avec nom, description facultative, estimation du prix et dernier jour de réservation. Objectif minimum de précommandes : CHF 100 par défaut, réglable par modèle. L’estimation et l’objectif restent ajustables avant commande pour tenir compte du devis dégressif selon la quantité. « Confirmer la commande passée » affiche le modèle et sa quantité, demande le prix unitaire définitif, puis facture les réservations positives dans une transaction si le minimum est atteint. Répéter/reprendre ne facture jamais deux fois. Si la quantité, l’estimation ou l’objectif changent pendant la confirmation, demander de revoir le récapitulatif. Une campagne non commandée peut être annulée sans débit.

Après commande, les membres ne modifient plus leur réservation ni ses lignes facturées pendant dix minutes : la commande fournisseur est engagée. L’admin conserve les corrections financières tracées existantes ; une facture annulée est signalée dans le suivi, sans effacer la commande ni modifier la quantité historiquement commandée. Aucun suivi de livraison/stock ou paiement fournisseur automatique.

## Données et garanties

- Migration additive 006 : origine des consommations (kiosk/free/patch), produit facultatif pour les lignes hors catalogue, campagnes/réservations et reçus idempotents des nouvelles actions.
- Montants en centimes entiers, quantités bornées ; aucun montant arbitraire envoyé comme total accepté sans recalcul serveur.
- Réservation et confirmation verrouillent la campagne ; confirmation verrouille les comptes dans un ordre stable. Le total de l’écran est revérifié avant débit.
- Les patchs commandés rejoignent les ventes et l’ardoise, jamais les paiements reçus. Le coût inconnu n’est pas présenté comme une marge certaine.
- Sauvegarde/restauration couvrent les nouvelles tables et restent compatibles avec les sauvegardes précédentes.
- Sauvegarde de production avant migration ; migration compatible avec l’ancienne app avant livraison de la nouvelle. Aucune modification des comptes réels pour des tests.

## Navigation

Patchs est une destination membre explicite. Administration : destination desktop et raccourci dans Plus mobile. Contrôles de 44px, contenu lisible à 320px, noms/montants conservés. Les erreurs et reprises restent près de l’action.

## Objectif et prix confirmés

Tous les membres voient le nombre de patchs, le nombre de réservations, leur total estimé et la progression vers l’objectif. Les noms des participants restent administratifs. L’admin saisit et ajuste une estimation unitaire selon la quantité ; aucune formule fournisseur n’est inventée. Il saisit le prix définitif avant de confirmer la commande passée. Ce prix définitif × quantité est le montant débité, avec vérification du minimum et du récapitulatif courant. Le prix définitif reste figé après commande.
