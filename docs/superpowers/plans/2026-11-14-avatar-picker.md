# Sélecteur d’avatar et classements

Lot explicitement validé : six propositions comparables, aperçu conservé pendant les nouveaux tirages, utilisation/annulation stables, état d’enregistrement et erreur avec sélection conservée. Même avatar enregistré dans Contributeurs et Buveurs, grade/nom/rang/montant lisibles sur mobile. Identité RAVIT inchangée, SVG existants, action avatar et persistance existantes ; aucune nouvelle migration ni API externe.

- [x] Tests RED : choix, nouveau tirage sans perdre l’aperçu, annulation, erreur puis reprise, cohérence profil/header/classements et persistance.
- [x] Composant sélecteur dans Dialog existant, six boutons accessibles, aperçu distinct du profil enregistré, actions stables et doubles envois bloqués.
- [x] AvatarSeed dans le seul agrégat social déjà autorisé ; avatar discret à côté du nom dans les classements, sans changer les scores.
- [x] Vérification des tests/types/build, revue et contrôles mobile/ordinateur dans les limites des outils disponibles. Publication seulement après validations appropriées, sans achat ni changement d’avatar fictif en production.

Publication vérifiée : commit `a7fed07ae893be74db6ba18366e625593e707223`, Vercel `dpl_5iGiQZWqNUcTkjkaAFod4hG7uNDu`, READY production. 148 tests, trois parcours navigateur, TypeScript et build réussis ; revue Sol6.1 medium sans blocage. Contrôle connecté en production : six choix, aperçu conservé au tirage, annulation sans changement de l’avatar, portraits des trois agrégats sociaux cohérents avec les avatars enregistrés. Écrans320/390/1440 sans débordement ni erreur JavaScript ; zéro écritureAPI et aucun avatar réel changé pendant le contrôle. Session technique supprimée.
