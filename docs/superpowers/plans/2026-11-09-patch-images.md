# Images Artwork et Print des patchs

> Exécution native dans le dossier actuel. Identité tactique conservée, revue finale Sol6.1 medium.

**Demande :** deux images distinctes par campagne, ajoutables par l’admin et visibles par tous les membres.

**Choix :** import PNG/JPEG/WebP (2 Mo maximum), validation et conversion WebP jusqu’à 1600px. Stockage persistant dans la base existante, séparé du snapshot de l’app ; aucune nouvelle souscription de stockage. Les deux aperçus restent visibles côte à côte et ouvrables en grand. Remplacement/retrait autorisés même après commande, sans modifier la facturation.

1. [x] Tests RED puis migration008/table patch_images, services et route authentifiée GET/POST/DELETE. Sauvegarde/restauration et whitelist Données/reset adaptées sans exposer les octets dans le viewer.
2. [x] Galerie membre et éditeur admin des deux emplacements ; tests navigateur branchés sur les vrais services avec base isolée et contrôle 320/390/1440.
3. [x] Tests complets, types, build et revue ; sauvegarde avant migration008, déploiement du commit exact, vérification publique et authentifiée sans image fictive ni opération financière en production.

Publication vérifiée : commit `aa0d2e4e01b083fb369b0c3ea48a5341de279480`, Vercel `dpl_GFaQUK9bZvSxwR9sJzWyNtUuz6sy`, état READY production sur https://falcons-kiosk.vercel.app. Migration008 additive après sauvegarde vérifiée, deux comptes admin conservés. Smoke : état connecté et métadonnées images 200, image anonyme401, image absente404, nouveau client présent et mobile320 sans débordement ni erreur JavaScript. Aucun achat, reset ou upload d’image fictive en production.
