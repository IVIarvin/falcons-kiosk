# Navigation fluide et microanimations

> Exécution : superpowers:executing-plans ; les skills animate et emil-design-eng guident les choix de mouvement.

**Objectif :** focus de recherche autour du champ complet et de son icône ; supprimer les écrans noirs pendant la navigation ; apporter de petites animations utiles sur les interfaces membre et admin.

**Conception :** le shell et le provider de session vivent dans le layout racine Next, les pages ne remplacent que la vue dans le slot children. Le snapshot déjà chargé est réutilisé pendant quinze secondes entre onglets ; les actions, le retour de visibilité et la reconnexion actualisent les données en arrière-plan. Un événement d’authentification purge immédiatement les données affichées ; une réponse401 les retire également. Aucun compte n’est mis en cache durablement.

**Mouvement :** conserver les tokens existants (120/180/220ms et courbe ease-out). Passage de vue par légère variation d’opacité, titre par translation courte, sans sortie vers le noir. Feedback de navigation en attente dans le lien cliqué, sans décalage. Favori et panier par transitions interrompables. Pas d’animation de lettres, de lignes comptables ou de résultats de recherche. Clavier immédiat ; mouvement réduit sans translation.

**Fichiers :** layout.tsx, catchall/page.tsx, components/app.tsx (shell), screen.tsx (choix de vue), motion.tsx (transition de vue et retour d’attente), globals.css, checkout/favorites.module.css ; tests/e2e/fluid-navigation.spec.ts.

## Étapes
- [x] Tests RED : focus enveloppant ; conservation du même shell sous réponse lente ; réutilisation du snapshot et panier ; focus navigateur sans démontage ;401 et changement de compte sans fuite ; animations pointeur, clavier et mouvement réduit.
- [x] GREEN : monter App dans le layout et rendre Screen dans le slot de page ; dédupliquer les revalidations et préserver le contenu pendant la lecture réseau.
- [x] Ajouter les transitions courtes et le feedback d’attente ; corriger le focus de tous les champs de recherche.
- [x] Vérifier les parcours membre/admin, erreurs réseau, raccourcis et navigation arrière, mobile320/390 et desktop1440 ; contrôler les animations au ralenti.
- [x] Suite métier, parcours navigateur, typecheck/build, revue indépendante ; coordonner la publication après celle des images008.

## Points de revue
- Une transition interrompue ou une saisie ne rejoue pas une cascade et ne masque jamais le contenu utile.
- Les mutations rechargent toujours les données, même pendant une revalidation en vol.
- Déconnexion ou changement de compte purge immédiatement les données du compte précédent, y compris en multi-onglets.
- Les éléments sticky, les dialogues, le focus et le scroll restent fonctionnels pendant les animations.
- Le shell ne se démonte pas entre les vues, y compris sous réseau lent ; les erreurs restent lisibles sans effacer les données déjà chargées.

## Validation
- Noyau :3 tests RED observés avant correction du focus/démontage ; attente et transitions :2 RED observés avant implémentation.
- Revue indépendante sans défaut critique/important ; synchronisation réelle de la réponse tardive et clavier+mouvement réduit renforcés. Test clavier120ms→0ms RED/GREEN.
- Inspection ralentie : normalisation CSS180ms→0.18s détectée ; test de durée RED, conversion d’unité corrigée, durée effective180ms vérifiée.
- Vitest110/110, TypeScript/build réussis ;14 parcours de régression et9parcours finaux fluidité/images.7captures320/390/1440px sans débordement, erreur JS ni chevauchement du nom d’app.
- Correctif d’images intégré depuis5dca98e : Artwork et Print dans le formulaire de création. Publication du SHA commun coordonnée, sans migration ni suppression de données.

