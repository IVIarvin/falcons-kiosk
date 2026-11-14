# Revue et corrections RAVIT

Exécution native dans le dossier actuel, sans reset de production. Identité RAVIT/Falcons conservée. Revue et travaux indépendants Sol 6.1 medium.

Demandes confirmées : classement buveurs limité aux boissons alcoolisées ; objectif des précommandes en quantité, 100 pièces par défaut, ajustable par l’admin. Suggestions et votes : proposition documentée uniquement, développement reporté à la demande de l’utilisateur.

1. Tests RED : achats alcool/sans alcool, articles libres, correction et classification historique stable ; seuil quantité indépendant du prix, défaut100 et garde contre confirmation obsolète.
2. Migration010 additive : instantané `is_alcoholic` des lignes, reprise des données explicitement classées, quantité minimale des campagnes. Services, sauvegarde/restauration et affichage adaptés ; prix estimé/définitif et débit à la commande conservés.
3. Corriger les deux anomalies d’authentification constatées, avec tests : inscription limitée avant création ; invalidation des codes de récupération au changement de mot de passe.
4. Réduire les lectures répétées du snapshot et regrouper les lignes d’ardoise en un passage, sans cache de données financières ; vérifier les résultats et le nombre de lectures.
5. Tests adaptés, types, compilation, contrôle mobile/ordinateur et revue finale. Sauvegarde avant migration, publication du commit exact et contrôles en lecture en production. Aucun achat, vote, reset ou campagne fictive en production.

Propositions UX à soumettre après corrections : panier consultable même sous filtre, lien vers l’ardoise après achat, séparation des précommandes actives et de l’historique, résumé personnel de réservation plus haut.

Les cinq étapes sont terminées. Validation et preuve de publication consignées dans `docs/review-2026-11-14.md`. Version commune publiée `a0aa11c246c23481a4277a7598c46fd6510a6c0e`, 145 tests et compilation réussis, contrôles connectés en production passés après migration010 et finalisation. Les suggestions/votes restent explicitement reportés.
