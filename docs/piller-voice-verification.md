# Vérification de la préparation vocale Piller

8 novembre 2026. Base applicative : `31e4535`. Préparation locale, export administrateur et lecteur d’actifs statiques ; aucune génération vocale réelle effectuée.

## Résultats

- Suite métier finale : **71/71**, 24 fichiers.
- Parcours Chrome finaux : **13/13**, dont export protégé, sélection d’un MP3 par texte exact, son coupé, arrêt pendant chargement, absence d’audio après modification du texte et absence d’appel ElevenLabs depuis le navigateur.
- TypeScript et build de production : verts.
- Simulations : trois essais sur 227 caractères, puis banque initiale de 60 répliques / 4 429 caractères. Zéro génération facturée.
- Captures 1440, 390 et 320 px : pas de débordement ; contrôle d’export dans le système existant. Revue Impeccable indépendante : `ship` à ce périmètre. Aucun changement de tokens, polices ou géométrie ; DESIGN.md et son sidecar conservés.

Le moteur Audio de ces tests est simulé : ils prouvent les URL, l’arrêt et les secours, pas le timbre d’une voix ni le décodage de vrais MP3 fournisseur. Les tests du cache exécutent le vrai service worker dans un environnement contrôlé avec des réponses HTTP partielles et des échecs de stockage.

## Revue de code et corrections

Revue indépendante de l’évolution : aucun défaut critique, trois importants et un mineur. Les trois importants ont été reproduits avant correction :

1. **Range/206 et cache indisponible** : les réponses partielles ne sont plus mises en cache ; un échec de cache facultatif ne bloque pas la réponse réseau. Régression `piller-worker-cache.test.ts` rouge puis verte.
2. **Interruption entre MP3 d’essai et index** : lots d’essais avec chemins immuables distincts ; un résultat incertain suspend la sélection et ne déclenche pas de nouvel appel implicite. Flux CLI extrait sans changement pour reproduire le défaut, puis corrigé ; `piller-preview-recovery.test.ts` rouge puis vert.
3. **Anciens textes après changement de voix** : accès historique explicitement versionné, sans présenter l’ancien enregistrement comme la nouvelle voix. Régressions du générateur et du lecteur rouges puis vertes.

Une seule passe de correction, puis suites entières vertes. Aucune seconde revue de code des mêmes corrections.

Mineur différé : une simple réutilisation de l’index d’essais ne vérifie pas encore que les fichiers MP3 locaux n’ont pas été déplacés ou supprimés manuellement. Les chemins doivent être contrôlés avant écoute ; aucune génération automatique ne tente de les réparer.

## Décisions et périmètre

1. Continuer dans le dossier et la branche actuels, choix natif conservé. Coût : pas d’isolation par worktree.
2. Livrer des fichiers statiques plutôt qu’un nouveau stockage ou une API vocale en production. Coût : toute nouvelle phrase enregistrée nécessite préparation et mise à jour du déploiement.
3. Préserver la voix du téléphone tant que le manifeste est inactif. Coût : la nouvelle voix grave n’est pas encore active.
4. Timbre, prononciation et préférence du demandeur laissés aux vrais essais à écouter. Coût : qualité masculine réelle non validée à ce stade.
5. Droits du compte, facturation et réussite des appels réels laissés à la connexion de la clé. Coût : contrats testés sans fournisseur réel ; autorisations et crédits encore à vérifier lors de la génération.
6. Comportement financier non réaudité dans cette évolution, inchangé et couvert par les régressions générales. Coût : cette revue est limitée à la fonctionnalité vocale.

## Travail restant

Le demandeur crée son compte ElevenLabs. Après configuration locale de `ELEVENLABS_API_KEY`, produire les trois vrais essais, lui faire choisir avant de préparer les 60 fichiers, écouter quelques résultats puis livrer les actifs. Aucun faux MP3 d’essai n’est livré à la place de la voix demandée ; `public/audio/piller/manifest.json` reste inactif.
