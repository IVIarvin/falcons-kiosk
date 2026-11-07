# Édition des répliques dans l’administration

Demande explicite : le responsable doit pouvoir éditer les répliques depuis l’administration de l’application.

## Résultat

Dans Administration → Réglages → Le répertoire de Piller : modifier le texte, le thème et l’activation de chaque réplique, écouter un aperçu et enregistrer. Les changements sont persistants, réservés aux responsables et utilisés pour les prochains achats. Le texte prononcé et affiché sur un achat déjà confirmé reste celui de cet achat.

## Choix techniques

Conserver la banque actuelle comme valeurs initiales et enregistrer les modifications dans PostgreSQL. Migration additive, numéro de révision pour détecter les éditions concurrentes, audit et sauvegarde des modifications. Figer le texte de la réplique sur chaque nouvelle consommation ; les anciennes confirmations gardent leur texte initial via la banque historique. Si aucune réplique active ne convient au panier, l’achat reste possible sans commentaire.

## Exécution

- [x] Tests de persistance, accès responsable, validation, concurrence, achat/reprise et sauvegarde.
- [x] Migration, service de gestion, sélection et texte figé sur les confirmations.
- [x] Formulaire intégré au répertoire admin, aperçu et gestion des erreurs.
- [x] Tests TypeScript, Vitest et navigateur pour éditer, recharger et retrouver une modification.

La demande ne modifie pas automatiquement le texte de la banque : les propositions courtes du chat restent à juger. Préserver les corrections CSS en cours dans le checkout partagé.

## Vérifications et coordination

- Migration propre à cette demande : `003_piller_quotes.sql`. La migration `004_financial_recovery.sql` appartient aux corrections globales de l’autre chat.
- 18 tests ciblés (piller-admin, piller, community, product-details, migration) passent, ainsi que `pnpm typecheck`.
- Revue indépendante ciblée réalisée : un défaut de soumission implicite des contrôles vocaux a été reproduit en navigateur et corrigé avec `type="button"`. Le parcours `piller-editor.spec.ts` vérifie aussi que l’écoute et la sourdine n’enregistrent pas le brouillon, puis édition, rechargement et restauration de la valeur de démonstration.
- Le dernier lancement navigateur a atteint le quota normal du compte démo. Aucun affaiblissement de la protection ni ouverture concurrente de PGlite. Le chat principal réinitialise uniquement le compteur de démonstration avant la suite combinée.
- Source propre à l’éditeur stable. Les fichiers application.ts et backup.ts conservent les deux ensembles d’ajouts ; ne pas écraser les corrections globales. Styles de l’éditeur isolés dans `src/features/piller/editor.module.css`.
- Validation navigateur finale confirmée dans la sortie de la suite combinée du chat principal : `piller-editor.spec.ts` passe (4,2 s). Le test couvre les deux contrôles vocaux sans sauvegarde, la modification texte/thème/activation, le rechargement et la restauration de la valeur initiale. Captures desktop 1440 px et mobile 390 px inspectées : formulaire lisible, sans débordement. Aucun nouveau défaut de la revue ciblée ne reste ouvert. Source libérée pour build et commit combinés.
