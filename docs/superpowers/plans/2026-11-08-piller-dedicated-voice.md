# Piller Dedicated Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Préparer et intégrer une voix masculine grave ElevenLabs sous forme de MP3 réutilisables, sans appel payant pendant les achats.

**Architecture:** Préparation locale avec clé secrète et journal de génération ; actifs statiques adressés par contenu et manifeste vérifié côté navigateur. Export administrateur de la banque actuelle. Voix existante préservée avant activation, aucune autre voix de secours après activation dédiée.

**Tech Stack:** TypeScript, Node fetch/crypto/fs, Zod, React, API ElevenLabs, Vitest, Playwright. Aucune dépendance ni base supplémentaire.

**Spec:** `docs/superpowers/specs/2026-11-08-piller-dedicated-voice.md`.

## Global Constraints

- Pas d’API ElevenLabs dans le navigateur, une route d’achat ou la production.
- Clé locale uniquement ; simulation par défaut ; génération explicite et plafond de caractères.
- Texte exact et voix déterminent l’actif ; un nouveau texte ne peut lire l’ancien audio.
- Garder les anciens actifs pour les achats historiques ; éviter les régénérations et reprises payantes automatiques.
- Préserver la direction tactique et les contrôles accessibles actuels.
- Exécution native dans le dossier actuel selon le choix persistant du demandeur ; pas de nouvelle publication dans ce plan.

## Review Focus

1. Une génération partiellement réussie puis relancée doit conserver les MP3 existants sans nouveaux frais pour eux.
2. Un changement de texte, d’identité vocale ou de modèle ne doit pas produire une association texte/audio erronée.
3. Un muet ou démontage pendant la résolution du manifeste doit empêcher le démarrage tardif d’un son.
4. Une erreur ElevenLabs ou réseau ne doit divulguer aucune clé ni être répétée automatiquement.
5. Le service worker ne doit pas figer un ancien manifeste ou mettre en cache des données de compte avec les MP3.

## Task 1 — Préparation locale et actifs adressés par contenu

**Files:** `scripts/voice.ts`, `src/features/piller/voice-build.ts`, `voice-manifest.ts`, `public/audio/piller/manifest.json`, `.env.example`, `package.json`, `tests/domain/piller-audio-build.test.ts`.

**Interfaces:** `buildVoiceBank`, calcul SHA-256, manifeste version1 ; commandes `voice:preview`, `voice:select`, `voice:build`. Préparer trois fichiers d’essai sous `.data/piller-voice/` avec identifiants sans clé.

- [x] Écrire puis exécuter les tests de cache, plafond, erreur incertaine, contrats HTTP et reprise ; constater les échecs.
- [x] Implémenter fournisseur, sauvegarde atomique, cache et simulation ; manifeste inactif initial.
- [x] Exécuter les tests ciblés et enregistrer le lot.

## Task 2 — Lecture et export des répliques

**Files:** `src/features/piller/audio-player.ts`, `panel.tsx`, `src/app/api/admin/documents/[kind]/route.ts`, `public/sw.js`, tests d’export et `tests/e2e/piller-audio.spec.ts`.

**Interfaces:** résolution du manifeste avec empreinte exacte du texte ; lecteur annulable ; export JSON de répliques `id/text/enabled`, sans données de membres.

- [x] Ajouter les tests de correspondance, export, MP3/muet/arrêt/absence d’enregistrement ; observer les échecs.
- [x] Intégrer lecture existante et dédiée, sans dégrader les transactions ; exporter depuis le répertoire admin.
- [x] Exécuter les tests ciblés puis enregistrer le lot.

## Task 3 — Vérification, essais réels et guide

**Files:** `docs/piller-voice.md`, README, preuves sous `.impeccable/review/piller-voice/`.

- [x] Vérifier tests, TypeScript et build, puis revue indépendante des changements.
- [x] Documenter compte/clé locale, simulation, essais, sélection, export/génération, régénération après édition et redéploiement des seuls actifs préparés.
- [ ] Quand la clé existe, produire les trois vrais essais et les présenter ; attendre le choix de voix avant la banque complète.
- [x] Ne pas annoncer la voix grave active avant génération et vérification des vrais fichiers.
