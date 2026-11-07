# Vérifications de la livraison locale Falcons

Date : 7 novembre 2026. Environnement : Node 24, Windows, Chrome installé, PGlite isolé pour les tests et persistant pour la démonstration. Aucun service de production connecté.

## Preuves

- Suite métier consolidée : 41 tests, 16 fichiers, tous verts. Comptes, droits, prix serveur, clés d'idempotence, paiements partiels, avoirs/remboursements, corrections, arrondis, changements d'heure, succès historiques et recherche de produits.
- 100 comptes et 10 confirmations simultanées ; export JSON puis restauration dans une base neuve, avec comparaison des comptes et soldes.
- Parcours Chrome : 7/7 verts, dont inscription → achat → ardoise → règlement responsable → PDF, réponse réseau perdue après confirmation serveur sans doublon, publication distincte des prix, désactivation de produit, enrichissement et saisie libre, banque Piller et PWA hors connexion.
- Captures groupées bureau 1440 px, mobile 390 px et 320 px, confirmation avec Piller. Aucun débordement horizontal mobile ni erreur JavaScript observée.
- Catalogue et affiche de test rendus en PNG, inspectés visuellement ; QR décodé depuis le rendu. L'adresse example.org de vérification ne constitue pas l'affiche du kiosque réel.
- Détecteur Impeccable exécuté une fois sur `src` : aucune alerte. Provenance des cinq PNG générés embarquée ; licence Noto Sans incluse.
- Audit des dépendances de production : aucune vulnérabilité connue signalée au contrôle.

TypeScript, build final et revues indépendantes : résultats à compléter après exécution.

## Décisions d'exécution

1. Travail dans le dossier actuel sur `codex/falcons`, conformément au choix explicite du demandeur. Coût si mauvais choix : pas d'isolation par worktree ; aucun code préexistant n'était présent au démarrage.
2. Les outils de suivi livrés avec Superpowers nécessitent Bash, absent du runtime Windows. Le journal et les preuves sont tenus par PowerShell. Coût : pas de briefs générés automatiquement par ces outils.
3. Git ne possède pas d'identité d'auteur configurée : identité Codex utilisée uniquement par commande, sans modifier le profil utilisateur. Coût : commits attribués à l'agent.
4. Premier commit applicatif regroupé avant revue globale, pour conserver les interfaces communes et les ajouts autorisés du chat « Améliorer répliques et produits » dans le même dossier. Coût : historique moins fin pour isoler ultérieurement une régression.

## Limites de cette validation

Les tests de base utilisent PostgreSQL embarqué ; une connexion PostgreSQL distante et le comportement Vercel doivent être contrôlés sur le déploiement réel. L'installation physique sur iOS/Android et la voix audible des systèmes n'ont pas été vérifiées. Le texte reste disponible si la synthèse vocale échoue. La sauvegarde/restauration locale est exercée, mais aucune sauvegarde quotidienne externe n'a été activée. L'affiche définitive exige l'adresse HTTPS du kiosque.
