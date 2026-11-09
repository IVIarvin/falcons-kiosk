# Images des patchs

Dans **Administration → Patchs → Créer une précommande**, les champs **Image Artwork** et **Image Print** sont directement dans le formulaire, après la description. Ils sont facultatifs et affichent un aperçu du fichier choisi. Les images sont enregistrées en validant **Ouvrir les réservations**.

Une précommande existante propose **Ajouter Artwork / Print** ou **Modifier Artwork / Print**. Chaque emplacement peut être remplacé ou retiré, même après la commande. Les membres voient les deux images sur la page Patchs et peuvent les ouvrir en grand.

Si un import échoue après la création, la précommande reste créée et les images déjà enregistrées sont conservées. L’éditeur affiche l’erreur et permet de reprendre les images manquantes sans créer une deuxième précommande.

Formats acceptés : PNG, JPEG ou WebP statiques, 2 Mo maximum par fichier. Les images sont réorientées et optimisées en WebP, jusqu’à 1600 × 1600 pixels. Les proportions sont conservées.

Les images utilisent la base PostgreSQL existante, sans service de stockage supplémentaire. Elles sont incluses dans les sauvegardes JSON et la restauration. Une ancienne sauvegarde sans images reste compatible. Le tableau Données ne montre que leurs métadonnées. Une réinitialisation administrative supprime aussi les images.

La migration additive `008_patch_images.sql` doit précéder le déploiement de cette version. Elle ne modifie ni les réservations, ni les prix, ni les ardoises. Sauvegarder la base avec la version précédente avant cette migration.

Validation locale du 9 novembre 2026 : 110 tests Vitest, types TypeScript et build production réussis. Trois parcours Chrome réussis : article libre, réservation/commande et import/retrait des deux images. Captures contrôlées à 320, 390 et 1440 px, sans débordement horizontal. Revue indépendante Sol 6.1 medium : aucun point bloquant.

Correctif du formulaire : test RED reproduisant l’absence des champs, puis deux variantes Chrome réussies (import dès la création et échec partiel/reprise sans doublon), six tests d’intégration images/routes et types TypeScript réussis. Captures mobile et ordinateur inspectées ; revue Sol 6.1 medium sans point bloquant.
