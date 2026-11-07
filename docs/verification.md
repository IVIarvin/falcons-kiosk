# Vérifications de la livraison locale Falcons

Date : 7 novembre 2026. Environnement : Node 24, Windows, Chrome installé, PGlite isolé pour les tests et persistant pour la démonstration. Aucun service de production connecté.

## Preuves

- Suite métier finale : 55 tests, 19 fichiers, tous verts. Comptes, droits, prix serveur, clés d'idempotence, paiements partiels, avoirs/remboursements, corrections, arrondis, changements d'heure, succès historiques, recherche de produits et édition des répliques.
- 100 comptes et 10 confirmations simultanées ; export JSON puis restauration dans une base neuve, avec comparaison des comptes et soldes.
- Parcours Chrome finaux : 12/12 verts, dont inscription → achat → ardoise → règlement responsable → PDF, réponse perdue puis session expirée et reconnexion sans doublon, reprise de réapprovisionnement/dépense, annulation de dépense, date réelle du paiement, confidentialité entre onglets, publication des prix, désactivation de produit, enrichissement/saisie libre, édition de Piller, cibles tactiles et PWA hors connexion.
- Captures groupées bureau 1440 px, mobile 390 px et 320 px, confirmation avec Piller. Aucun débordement horizontal mobile ni erreur JavaScript observée.
- Catalogue et affiche de test rendus en PNG, inspectés visuellement ; QR décodé depuis le rendu. L'adresse example.org de vérification ne constitue pas l'affiche du kiosque réel.
- Détecteur Impeccable exécuté une fois sur `src` : aucune alerte. Provenance des cinq PNG générés embarquée ; licence Noto Sans incluse.
- Audit des dépendances de production : aucune vulnérabilité connue signalée au contrôle.

TypeScript et build de production finaux verts après les corrections. Le frontmatter YAML de DESIGN.md est analysé par Prettier et le sidecar JSON est valide (schemaVersion 2). Le focus initial du dialogue produit, l'accès clavier au champ et sa fermeture par Échap ont été exercés dans Chrome. Le retour arrière de focus passe par le dialogue natif lui-même, sans sortir dans l'interface derrière lui.

## Revues et corrections

Revue globale indépendante sur le commit `225e225` : aucun défaut critique, six défauts importants. Les six corrections ont chacune un test observé rouge puis vert :

1. Conservation des clés d'opérations incertaines après 401/403 et reprise après reconnexion : `client-recovery.test.ts` et parcours `full-flow.spec.ts` avec réponse perdue puis expiration.
2. Invalidation des données privées entre onglets et au retour de visibilité ; remontage des vues lors d'un changement de compte : `session-privacy.spec.ts`.
3. Clés persistées, empreintes de requête, verrous et contraintes uniques pour réapprovisionnements/dépenses ; contrôles de reprise dans les formulaires : `financial-recovery.test.ts` et `financial-recovery.spec.ts`.
4. Date de réception/remboursement choisie dans le formulaire et conservée dans la requête durable : `full-flow.spec.ts`.
5. Auteur de l'annulation d'un paiement dans l'audit transactionnel : `financial-recovery.test.ts`.
6. Annulation motivée et attribuée d'une dépense, historique et sauvegarde conservés, exclusion du calcul actif : même test d'intégration et parcours de correction.

Suite complète après cette passe : 55/55 et 12/12. Aucun défaut mineur différé par le reviewer global. Pas de seconde revue globale des mêmes corrections.

Revue visuelle Impeccable : direction tactique respectée ; une correction demandée pour les cibles tactiles. Test navigateur rouge puis vert à 320 px, captures reprises, verdict `ship` portant sur cette correction. Documentation extraite dans `DESIGN.md` et `.impeccable/design.json` ; les nouveaux formulaires réutilisent le système existant, vérifié ensuite par le documenter. L'éditeur de répliques ajouté après la revue globale possède sa revue ciblée dans le chat coordonné ; elle a relevé et fait corriger la soumission involontaire par les boutons vocaux.

## Décisions d'exécution

1. Travail dans le dossier actuel sur `codex/falcons`, conformément au choix explicite du demandeur. Coût si mauvais choix : pas d'isolation par worktree ; aucun code préexistant n'était présent au démarrage.
2. Les outils de suivi livrés avec Superpowers nécessitent Bash, absent du runtime Windows. Le journal et les preuves sont tenus par PowerShell. Coût : pas de briefs générés automatiquement par ces outils.
3. Git ne possède pas d'identité d'auteur configurée : identité Codex utilisée uniquement par commande, sans modifier le profil utilisateur. Coût : commits attribués à l'agent.
4. Premier commit applicatif regroupé avant revue globale, pour conserver les interfaces communes et les ajouts autorisés du chat « Améliorer répliques et produits » dans le même dossier. Coût : historique moins fin pour isoler ultérieurement une régression.
5. Déploiement Vercel, PostgreSQL distant et planification des sauvegardes laissés à la connexion des services réels, conformément au périmètre local approuvé. Coût : comportement en production et restauration distante pas encore vérifiés.
6. Installation physique iOS/Android et voix système audibles reportées au pilote sur téléphones. Coût : compatibilité réelle de ces appareils encore à vérifier ; texte et guide restent disponibles.
7. Qualité visuelle traitée par la revue Impeccable distincte. Coût : son verdict couvre les captures et sa correction demandée ; il ne certifie pas chaque état de tous les formulaires.

## Limites de cette validation

Les tests de base utilisent PostgreSQL embarqué ; une connexion PostgreSQL distante et le comportement Vercel doivent être contrôlés sur le déploiement réel. L'installation physique sur iOS/Android et la voix audible des systèmes n'ont pas été vérifiées. Le texte reste disponible si la synthèse vocale échoue. La sauvegarde/restauration locale est exercée, mais aucune sauvegarde quotidienne externe n'a été activée. L'affiche définitive exige l'adresse HTTPS du kiosque.
