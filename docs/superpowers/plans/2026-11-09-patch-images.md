# Images Artwork et Print des patchs

> Exécution native dans le dossier actuel. Identité tactique conservée, revue finale Sol6.1 medium.

**Demande :** deux images distinctes par campagne, ajoutables par l’admin et visibles par tous les membres.

**Choix :** import PNG/JPEG/WebP (2 Mo maximum), validation et conversion WebP jusqu’à 1600px. Stockage persistant dans la base existante, séparé du snapshot de l’app ; aucune nouvelle souscription de stockage. Les deux aperçus restent visibles côte à côte et ouvrables en grand. Remplacement/retrait autorisés même après commande, sans modifier la facturation.

1. [x] Tests RED puis migration008/table patch_images, services et route authentifiée GET/POST/DELETE. Sauvegarde/restauration et whitelist Données/reset adaptées sans exposer les octets dans le viewer.
2. [x] Galerie membre et éditeur admin des deux emplacements ; tests navigateur branchés sur les vrais services avec base isolée et contrôle 320/390/1440.
3. [ ] Tests complets, types, build et revue ; sauvegarde avant migration008, déploiement du commit exact, vérification publique et authentifiée sans image fictive ni opération financière en production.
