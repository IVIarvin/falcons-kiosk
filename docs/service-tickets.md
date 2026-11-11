# Tickets de service

## Noter ce qui est servi

Avec un compte admin, ouvrir le kiosque et utiliser **Servir** sur une carte produit. L'ajout au panier personnel reste indépendant. Un appui sur une personne enregistre une unité de ce produit ; le sélecteur reste ouvert pour enchaîner. Rechercher un nom ou un grade, ou utiliser les personnes récemment servies affichées en premier.

La confirmation permet d'annuler rapidement le dernier ticket. Un enregistrement dont la réponse réseau est perdue reste récupérable depuis le kiosque, même après fermeture du sélecteur. Utiliser **Retrouver le ticket** avant de recommencer.

## Personne pas encore inscrite

Dans le sélecteur, ouvrir **Créer un visiteur**, saisir son nom et créer sa fiche. Sélectionner ensuite son nom pour noter ce qui lui est servi. Cette fiche ne donne aucun accès à l'application et ne nécessite ni numéro de téléphone ni mot de passe.

Depuis **Contrôle du service**, choisir **Rattacher** sur le visiteur après son inscription. Sélectionner son compte et confirmer après vérification de son identité. Les homonymes ne sont jamais fusionnés automatiquement. L'ancien nom, les auteurs et dates des tickets restent conservés ; tous les tickets de ce visiteur sont alors regroupés avec ceux du compte pour le contrôle. Le rattachement ne facture rien et ne fusionne pas deux comptes connectés.

## Recouper

**Contrôle du service** est accessible aux admins depuis le kiosque et l'administration. La période utilise des dates inclusives en heure suisse, aujourd'hui par défaut, jusqu'à 93 jours.

Le contrôle affiche uniquement les personnes et produits ayant au moins un ticket actif sur la période. Les déclarations correspondent aux achats catalogue du membre, nets des retraits et annulations. Articles libres et patchs sont exclus.

- Moins déclaré que servi : quantité à vérifier, qui peut être déclarée plus tard.
- Quantités égales : cohérentes à l'échelle de la période, sans preuve d'un rapprochement ticket par ticket.
- Plus déclaré que servi : compatible avec du libre-service.

Les 100 derniers tickets de la période affichent l'auteur, la date et les annulations. Tout admin peut annuler un ticket avec un motif. Les tickets ne modifient jamais automatiquement l'ardoise, la marge, les paiements ou les classements.

## Livraison et vérifications

Exécuter `pnpm db:migrate` sur la base cible avant la mise en service ; le build n'exécute aucune migration distante. La migration 009 est additive. Les sauvegardes/restaurations et la réinitialisation administrative incluent les visiteurs et tickets ; les anciennes sauvegardes restent compatibles.

Vérifications réalisées : tests unitaires et intégration PGlite, rendu des commandes du kiosque selon le rôle, scénario HTTP authentifié de création/reprise/rattachement/contrôle/annulation avec contrôle des ardoises, typecheck et build de production. Une revue indépendante a identifié une course de nettoyage de confirmation réseau : une réponse ancienne ne doit pas effacer une opération plus récente. Le correctif est couvert par deux régressions avec réponses différées.

Les tests Playwright sont ajoutés dans `tests/e2e/service-tickets.spec.ts`, mais leur exécution est bloquée dans cet environnement par l'interdiction des sockets Unix nécessaires au démarrage de Chromium. Le contrôle visuel et le parcours tactile restent à confirmer sur le déploiement. Limite mineure : si un sélecteur est fermé pendant l'enregistrement, une bannière de reprise peut rester affichée jusqu'au prochain rendu ou appui ; la reprise conserve la même clé et ne crée pas de doublon.
