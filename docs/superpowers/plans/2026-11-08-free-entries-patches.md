# Articles libres et patchs — implementation plan

> **For agentic workers:** Use superpowers:executing-plans. Native execution in the current workspace; one final independent review, GPT‑6.1 Sol medium.

**Goal:** Enregistrer un article oublié et réserver des patchs sans bloquer le membre, puis déployer.

**Architecture:** Consommations et ardoises existantes, origine explicite et lignes sans produit catalogue. Réservations séparées, converties en consommations seulement lors de la confirmation admin de commande fournisseur.

**Tech Stack:** Next.js/React/TypeScript, PostgreSQL/PGlite, CSS Modules, Vitest et Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-free-entries-patches.md`.

## Contraintes et interfaces

- Préserver le lot catalogue/PDF de l’autre chat ; attendre son commit avant intégration commune.
- Aucun appel voix payant, aucune intégration TWINT, aucun faux achat de production.
- Services nouveaux : `recordFreeEntry`, `createPatchCampaign`, `reservePatch`, `confirmPatchOrder`, `cancelPatchCampaign`, `getPatchBoard`.
- Actions : `freeCheckout`, `createPatchCampaign`, `reservePatch`, `confirmPatchOrder`, `cancelPatchCampaign` ; reprises financières via `durableAction` existant.
- La réservation ne débite rien ; la confirmation admin débite le prix annoncé × quantité courante une seule fois.

## Tâches

1. [ ] Backend et données : tests intégration RED puis services/migration006, origine historique, coûts inconnus par LEFT JOIN, sauvegarde/restauration. Vérifier quantité absolue, date Suisse, annulation et absence de double débit/reprise.
2. [ ] Entrée libre : dialogue isolé au kiosque, total explicite, panier conservé, reprise réseau et commentaire existant ; test navigateur sans achat réel.
3. [ ] Patchs : pages membre/admin, création et réservations, confirmation du total courant, navigation mobile/desktop ; tests navigateur et contrôle 320/390/1440.
4. [ ] Tests complets, TypeScript/build, revue indépendante et une passe corrective ; commit. Sauvegarde/migration production, déploiement Vercel du commit exact et vérification de la livraison.

## Review Focus

- Deux confirmations/reprises concurrentes ne créent aucune double dette.
- Une ancienne requête de réservation rejouée après modification ne rétablit pas l’ancienne quantité.
- Le total changé pendant le dialogue est refusé sans débit partiel.
- Coûts libres inconnus, sauvegardes anciennes et corrections admin restent cohérents.
- Après commande, retrait personnel interdit ; erreur réseau récupérable et données d’autres membres protégées.
