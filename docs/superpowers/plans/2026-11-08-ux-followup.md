# Falcons — suite des améliorations UX

> **For agentic workers:** Use superpowers:executing-plans. Exécution native dans le dossier actuel déjà choisie ; une revue finale indépendante GPT‑6.1 Sol en réflexion moyenne.

**Goal:** Retrouver rapidement les produits, voir son résultat personnel avant la liste, et conserver son repère au clavier.

**Architecture:** Réutiliser les produits et agrégats déjà chargés. Filtrage local sans API supplémentaire ; aucun calcul financier modifié. Les commandes de classement existantes restent identiques.

**Tech Stack:** React, TypeScript, CSS global existant, Playwright/Chrome.

**Spec:** `docs/design/2026-11-08-ui-ux-critique.md` et demande « fais des propositions et continue pour améliorer ».

## Contraintes

- Identité tactique v3 et adaptations mobiles du commit 628ec2c conservées.
- Voix en pause ; aucune génération, clé ni opération financière.
- Recherche tolérante aux accents/casse ; filtres combinables par catégorie et état. Produits actifs par défaut, archives toujours accessibles.
- Position liée au classement et à la période affichés ; pas de nouvelles données publiques ni d’incitation à consommer davantage.
- Focus rendu au déclencheur s’il existe encore ; pas de navigation surprise après fermeture.
- Aucun déploiement ni publication ; préserver les changements des autres chats.

## Tâches

1. [x] Catalogue (`src/features/admin/view.tsx`, `globals.css`) : recherche, catégorie, actifs/désactivés/tous, compteur et résultat vide récupérable. Test `ux-improvements.spec.ts` : accents, combinaison vide, réinitialisation et archives.
2. [x] Falcons (`src/features/achievements/view.tsx`, `globals.css`) : position/score et accès à sa ligne avant le classement ; dernières distinctions résumées et collection dépliable. Même test : dernière distinction datée, position visible et absence dans le classement boissons.
3. [x] Repères (`src/components/ui.tsx`, `app.tsx`, `globals.css`) : restaurer le focus, aria-current des liens, Plus actif pour Finances/Documents, cibles de 44px. Test Escape/fermeture et navigation directe/proxy.
4. [x] Vérifier les deux scénarios existants et les deux nouveaux, TypeScript, inspection groupée 320/390/1440 avec confirmation maximum une fois ; revue indépendante du diff ; documenter et enregistrer le commit.

## Review Focus

- Filtres combinés sans résultats : toujours pouvoir afficher à nouveau des produits.
- Nom accentué ou utilisateur non classé : aucun résultat inventé, aucune erreur.
- Distinctions historiques nombreuses : dernière distinction réelle, liste secondaire dépliable.
- Déclencheur démonté ou dialogues imbriqués : ne pas focaliser un élément absent.
- Finances/Documents sur mobile : repère Plus sans prétendre que Réglages est la page courante.

## Résultats

- Deux scénarios nouveaux observés RED sur absence du champ recherche et de la zone personnelle, puis GREEN. Contrôle final : 4/4 Chrome, TypeScript réussi.
- 18 captures finales, aucune erreur JavaScript ni débordement du document. Inspection groupée puis une confirmation ; filtres empilés jusqu’à 480px après texte de sélection coupé au premier passage.
- Revue finale indépendante Sol6.1 medium : 0 Critical/Important, aucune remarque mineure supplémentaire.
- Les nouveaux tests/modules catalogue et impression de l’autre chat ont été laissés à leur propriétaire ; aucune écriture de données métier ni intervention voix.
