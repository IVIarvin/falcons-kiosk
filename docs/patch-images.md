# Images des patchs

Dans **Administration → Patchs → Images du patch**, importer séparément l’**Artwork** et le **Print**. Chaque emplacement peut être remplacé ou retiré, même après la commande. Les membres voient les deux images sur la page Patchs et peuvent les ouvrir en grand.

Formats acceptés : PNG, JPEG ou WebP statiques, 2 Mo maximum par fichier. Les images sont réorientées et optimisées en WebP, jusqu’à 1600 × 1600 pixels. Les proportions sont conservées.

Les images utilisent la base PostgreSQL existante, sans service de stockage supplémentaire. Elles sont incluses dans les sauvegardes JSON et la restauration. Une ancienne sauvegarde sans images reste compatible. Le tableau Données ne montre que leurs métadonnées. Une réinitialisation administrative supprime aussi les images.

La migration additive `008_patch_images.sql` doit précéder le déploiement de cette version. Elle ne modifie ni les réservations, ni les prix, ni les ardoises. Sauvegarder la base avec la version précédente avant cette migration.

Validation locale du 9 novembre 2026 : 110 tests Vitest, types TypeScript et build production réussis. Trois parcours Chrome réussis : article libre, réservation/commande et import/retrait des deux images. Captures contrôlées à 320, 390 et 1440 px, sans débordement horizontal. Revue indépendante Sol 6.1 medium : aucun point bloquant.
