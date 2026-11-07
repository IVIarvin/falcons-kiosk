# Catalogue et Piller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ajouter la recherche produit avec images et caractéristiques, et contextualiser une banque de répliques assassines.

**Architecture:** Adaptateur serveur Open Food Facts derrière les actions authentifiées existantes. Métadonnées JSONB et sélecteur de répliques local ; formulaires dans le style existant.

**Tech Stack:** Next.js, React, TypeScript, Zod, PostgreSQL/PGlite, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-11-07-catalogue-piller-design.md

## Global Constraints

- Aucun appel externe pendant un achat ; saisie libre disponible après erreur.
- Valeurs inconnues explicites, contrôle administrateur, caractéristiques indépendantes.
- Conserver les identifiants historiques et la réplique des confirmations rejouées.
- Aucune nouvelle dépendance ; garder la direction tactique.

## Review Focus

- Référence sans photo ou champs nutritionnels : aperçu de secours et caractéristiques inconnues.
- Bière sans alcool et soda Zero : pas de fausse classification.
- Recherche lente ou répétée : délai borné, cache, limitation, saisie libre.
- Modification manuelle après import : valeurs et prix saisis préservés.
- Migration et ancien export : données existantes préservées.

### Task 1: Métadonnées, recherche et persistance

**Files:** src/features/catalog/details.ts, lookup.ts, service.ts ; src/lib/types.ts, application.ts, db/index.ts, backup.ts ; db/migrations/002_product_details.sql ; tests/domain/product-lookup.test.ts ; tests/integration/product-details.test.ts.

**Interfaces:** ProductDetails, ProductSuggestion, normalizeProduct(raw), searchProducts(db, actor, input, fetcher?), lookupProduct(db, actor, input, fetcher?).

- [x] Écrire et exécuter les tests des champs inconnus, des variantes, des images, de l'accès admin, des erreurs et du cache ; constater les échecs.
- [x] Ajouter la migration, les types, l'adaptateur, les actions et la compatibilité sauvegarde.
- [x] Exécuter les tests ciblés puis vérifier une réponse publique réelle si le réseau le permet.

### Task 2: Banque de répliques et panier

**Files:** src/features/piller/quotes.ts ; src/features/checkout/service.ts ; tests/domain/piller.test.ts ; tests/integration/product-details.test.ts.

**Interfaces:** quotes avec id/text/topic ; selectQuote(previousId?, lines?) retourne une réplique active, compatible avec le panier.

- [x] Écrire et exécuter les tests de contexte, non-répétition, héritage et reprise de confirmation.
- [x] Ajouter la banque et brancher les caractéristiques du panier validé.
- [x] Exécuter les tests ciblés.

### Task 3: Formulaire et consultation de la banque

**Files:** src/features/catalog/editor.tsx, image.tsx ; src/features/admin/view.tsx ; src/features/piller/panel.tsx ; src/features/checkout/view.tsx ; src/app/globals.css ; tests/e2e/product-enrichment.spec.ts.

- [x] Écrire le parcours Playwright recherche, choix, correction, prix préservé et panne avec saisie libre ; constater l'échec.
- [x] Intégrer recherche explicite, résultats illustrés, préremplissage, attributs modifiables, provenance et aperçu de secours.
- [x] Intégrer consultation des répliques par thème et écoute.
- [x] Exécuter Vitest, TypeScript, build et parcours navigateur ; inspecter desktop et mobile en un lot.

## Execution notes

Travail dans le checkout existant `codex/falcons` : l'application entière est encore non suivie, un nouveau worktree ne contiendrait pas le code à modifier. Préserver ces fichiers et ne pas les embarquer dans un commit global. L'accord « oui excellent on fait ça » autorise l'exécution de la direction présentée ; pas de nouvelle validation intermédiaire.

## Validation et transmission

Le 7 novembre 2026 : 41 tests Vitest (16 fichiers), TypeScript et les 3 parcours `product-enrichment.spec.ts` passent. `qa-catalogue-piller.ts` exerce de vraies recherches Open Food Facts aux formats 1440 et 390 px : aucun débordement ni erreur JavaScript. Captures sous `.impeccable/review/catalogue-piller/`.

Revue ciblée indépendante effectuée ; deux cas corrigés avec tests reproduisant le défaut : pourcentage résiduel et étiquetage sans alcool contradictoires donnent alcool inconnu, code-barres absent en HTTP404 donne référence introuvable.

La validation globale, le build et le commit de l’application entière restent à la charge du chat de développement principal, qui coordonne le même checkout et le serveur démo. Aucun commit global ni déploiement dans ce chat. Les autres corrections en cours ont été préservées ; aucun changement à Field.

Limites à reporter dans la documentation produit : 60 nouvelles répliques actives et 20 identifiants historiques conservés ; 10 thèmes ; tirage contextuel 80 % quand le panier le permet, général sinon ; pas de répétition immédiate. Recherche sur clic, 8 suggestions maximum, cache 24 h, 8 secondes de délai, appels espacés de 6,5 s en recherche et de 4,5 s pour la fiche produit. Aucun appel externe à l’achat. Photos distantes attribuées, remplacement HTTPS/local possible, pictogramme de secours. Les anciens produits restent à classifier manuellement.

Reprise après demande du propriétaire : les captures ont révélé un débordement vertical des photos dans les cadres utilisant une grille implicite. Reproduction par `product-image-layout.spec.ts` (photo débordant jusqu’à 281 px pour un cadre se terminant à 113 px), puis correction des trois conteneurs en flex avec dimensions contraintes. Le test passe aux largeurs 1440 et 390 px. `qa-catalogue-piller.ts` mesure désormais aussi ce débordement vertical. Aucun changement à Field ; les modifications de la reprise se limitent à ces cadres CSS et à leurs contrôles. Serveur global arrêté pour sa validation ; aucun nouveau serveur concurrent lancé.
