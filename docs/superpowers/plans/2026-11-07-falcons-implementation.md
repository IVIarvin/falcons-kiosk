# Falcons Kiosk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Construire l'application complète du kiosque Falcons avec comptes autonomes, ardoises, règlements manuels, suivi financier, succès, Piller écrit/parlé, PWA et documents imprimables.

**Architecture:** Application Next.js avec rendu serveur, composants interactifs ciblés et mutations authentifiées côté serveur. PostgreSQL conserve les comptes et un historique traçable ; une interface de base commune permet d'utiliser PGlite sur disque en développement et un PostgreSQL distant avec connexions mutualisées sur Vercel. Les calculs métier restent indépendants de React et sont testés avant leurs parcours d'interface.

**Tech Stack:** Next.js App Router, React, TypeScript strict, CSS natif avec tokens, PostgreSQL, pilote `pg`, `@electric-sql/pglite` en développement/tests, `zod`, `libphonenumber-js`, `pdf-lib`, `qrcode`, `lucide-react`, Vitest et tests de parcours navigateur. Versions stables compatibles sélectionnées au démarrage et figées dans le lockfile ; aucun service facturé par compte utilisateur.

**Spec:** `docs/superpowers/specs/2026-11-07-kiosque-prd.md` v0.5 ; direction approuvée `docs/superpowers/specs/2026-11-07-falcons-direction-ui-v3.md` ; `PRODUCT.md`.

## Global Constraints

- Une section, au moins 60 membres, français, CHF, Europe/Zurich. Validation cible : 100 comptes et 10 confirmations simultanées.
- Inscription autonome sans validation administrative, grade/nom/téléphone obligatoires ; aucun parcours invité distinct.
- TWINT reste externe : aucune demande, aucun encaissement ni aucune confirmation bancaire automatisés.
- Identité tactique v3 approuvée : #090D0B, #171E19, #303D33, #E6EDE7, #8FE781 ; v1 et v2 rejetées.
- Montants de vente, paiements et dettes en centimes entiers ; coût unitaire estimatif conservé en millionièmes de CHF.
- Une opération financière confirmée est traçable et corrigée par contre-opération, jamais effacée silencieusement.
- Aucun numéro, historique détaillé ni solde d'un autre membre accessible hors administration ; les classements ne partagent que les agrégats autorisés.
- Son Piller et installation PWA facultatifs ; réseau obligatoire pour confirmer une opération.
- Vercel pour l'hébergement. Aucune création de ressource externe, souscription ou mise en production effectuée par ce plan sans résultat local reviewable.
- Pas de faux backend de production : sur Vercel, l'absence de `DATABASE_URL` doit signaler une configuration manquante, jamais écrire dans un fichier éphémère.
- Décisions proposées pour démarrer : inscription par lien, majoration générale et dérogation manuelle, arrondi automatique à CHF 0.05, pas d'inventaire, saisie simple des autres dépenses. Ces choix restent modifiables avant réalisation des tâches concernées.

## Review Focus

1. Deux confirmations simultanées ou une reprise réseau ne doivent jamais doubler une consommation ou un règlement : transactions et clés d'idempotence, tâches 2 et 3.
2. Lundi, changement d'heure et correction d'une ancienne consommation doivent donner les bonnes semaines et les bons badges sans effacer la dette : tâche 5.
3. Un paiement partiel, un achat après demande de paiement ou une correction après règlement doivent laisser le bon solde ou avoir : tâche 4.
4. Des requêtes modifiées par un utilisateur ne doivent permettre ni attribution du rôle admin, ni consultation d'un autre compte, ni prix client falsifié : tâches 1 à 3.
5. Installation, déconnexion, absence de réseau et environnement serverless ne doivent exposer aucune donnée d'un ancien utilisateur ni annoncer une opération non enregistrée : tâches 1, 6 et 8.

## Structure et interfaces communes

- `src/app/` : connexion, inscription, kiosque, ardoise, Falcons, profil et routes admin ; composants serveur par défaut.
- `src/features/{auth,catalog,checkout,ledger,admin,achievements,piller,documents}/` : validation, services et composants liés au même métier.
- `src/lib/db/{index.ts,postgres.ts,pglite.ts}` et `db/migrations/001_initial.sql` : adaptateurs et migrations.
- `src/lib/money.ts` : `formatCHF(cents: number): string` et `priceFromCost(costMicros: number, markupBasisPoints: number, incrementCents?: number): number`.
- `src/lib/db/types.ts` : `Database.query<T>(sql: string, params?: unknown[]): Promise<T[]>`, `Database.transaction<T>(operation: (tx: Database) => Promise<T>): Promise<T>`.
- `src/features/auth/session.ts` : `requireUser(): Promise<SessionUser>`, `requireAdmin(): Promise<SessionUser>` ; `SessionUser = { id: string; name: string; grade: string; role: 'member' | 'admin' }`.
- Les mutations retournent `ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string }` ; les erreurs attendues sont traduites en français.
- `tests/{domain,integration,e2e}/` : calculs purs, services sur PostgreSQL embarqué et parcours réels. Pas de tests qui recopient la structure du CSS.
- `public/brand/`, `public/products/`, `public/fonts/` : actifs locaux avec provenance et polices nécessaires aux PDF.

## Task 1: Comptes, sessions et fondation persistante

**Files:** `package.json`, configurations Next/TypeScript/Vitest, `.gitignore`, `.env.example`, `db/migrations/001_initial.sql`, `src/lib/db/*`, `src/features/auth/*`, `src/app/{layout.tsx,connexion/page.tsx,inscription/page.tsx}`, `scripts/{migrate.ts,bootstrap-admin.ts}`, `tests/integration/auth.test.ts`.

**Interfaces:** Consomme le PRD et les tokens approuvés. Produit `Database`, `SessionUser`, `requireUser` et `requireAdmin` ; numéros normalisés en E.164.

- [x] Ajouter les tests d'inscription immédiate, doublon de téléphone normalisé, rejet d'une attribution de rôle envoyée par le client, mot de passe haché, session expirée/révoquée et garde administrateur ; les exécuter et constater les échecs attendus.
- [x] Installer les dépendances dans le projet et figer les versions. Le système possède Node 24 ; localiser le CLI npm fourni avec ce runtime si `npm` n'est pas dans PATH, sans remplacer le runtime système.
- [x] Créer les migrations : utilisateurs, sessions hachées, tentatives d'authentification, produits, achats, consommations/lignes, paiements/remboursements, corrections, dépenses et réglages. Contraintes uniques pour téléphone et clés d'idempotence.
- [x] Implémenter les adaptateurs PostgreSQL et PGlite. L'instance locale persiste sous `.data/` ignoré ; les tests utilisent leur base isolée. Interdire le repli local en environnement Vercel.
- [x] Implémenter téléphone/mot de passe, hachage scrypt salé, session aléatoire opaque dont seule l'empreinte est stockée, cookie HttpOnly/SameSite et Secure en production ; contrôler l'origine des mutations et limiter les tentatives en base.
- [x] Créer l'admin initial uniquement par script explicite, jamais par « premier inscrit ». Prévoir réinitialisation d'accès temporaire à usage unique et révocation des sessions ; empêcher le retrait du dernier admin.
- [x] Livrer inscription/connexion/profil et déconnexion fonctionnels dans la grammaire v3. Vérifier les tests, puis documenter et enregistrer ce lot selon le mode Git retenu.

## Task 2: Catalogue, coûts et prix

**Files:** `src/lib/money.ts`, `src/features/catalog/{schema.ts,service.ts,components/*}`, `src/app/admin/produits/page.tsx`, `src/app/admin/achats/page.tsx`, `tests/domain/money.test.ts`, `tests/integration/catalog.test.ts`.

**Interfaces:** Consomme `Database`, `requireAdmin`. Produit `getCatalog(): Promise<ProductView[]>`, `recordPurchase(input: PurchaseInput): Promise<ActionResult<PurchaseReceipt>>`, `previewAutomaticPrices(): Promise<PriceChange[]>` et publication explicite des tarifs.

- [x] Écrire et exécuter les tests rouges : 24 unités coûtent CHF 24, majoration 30 % => CHF 1.30 ; demi-arrondi à CHF 0.05 vers le haut ; coût inconnu distinct de zéro ; prix manuel prioritaire ; validation de quantités et montants négatifs.
- [x] Implémenter les calculs en entiers, coûts unitaires en millionièmes de CHF, majorations en points de base ; agréger les coûts avant arrondi de l'affichage.
- [x] Implémenter création/édition/désactivation des produits, catégorie et indicateur boisson, disponibilité, coût initial et achats par quantités vendables.
- [x] À un nouvel achat ou changement de majoration, montrer les prix proposés et attendre leur publication explicite. Corriger un achat avec trace sans réécrire les anciennes ventes.
- [x] Livrer les écrans admin et une source de données de démonstration activée uniquement explicitement ; ne jamais peupler une base de production par défaut.
- [x] Vérifier tests du lot, exactitude des coûts connus/inconnus et refus des mutations admin par un membre ; enregistrer le lot.

## Task 3: Catalogue mobile et panier transactionnel

**Files:** `src/features/checkout/{schema.ts,service.ts,components/*}`, `src/app/(kiosk)/{layout.tsx,page.tsx}`, `src/components/{app-shell.tsx,icons.tsx}`, `src/app/globals.css`, `tests/integration/checkout.test.ts`, `tests/e2e/checkout.spec.ts`.

**Interfaces:** Consomme catalogue et session. Produit `checkout(input: { idempotencyKey: string; lines: { productId: string; quantity: number; expectedPriceCents: number }[] }): Promise<ActionResult<CheckoutReceipt>>`. `CheckoutReceipt` contient identifiant, total, solde actualisé et réplique Piller éventuelle, déterminés côté serveur.

- [x] Écrire les tests rouges : 2 × CHF 2.50 => CHF 5 ; prix client falsifié rejeté ; tarif changé demandant reconfirmation ; produit indisponible ; double requête simultanée retournant un seul achat ; même clé avec un autre panier rejetée.
- [x] Implémenter la transaction d'achat à partir des prix serveur, avec prix/coûts/indicateur boisson figés et réponse d'idempotence réutilisable.
- [x] Produire les actifs de marque et produits nécessaires à partir des références approuvées ; conserver source/prompt et ne pas découper les textes ou contrôles en images.
- [x] Reproduire le catalogue mobile v3 : catégories, produits, quantité, panier, bouton de confirmation et navigation Kiosque/Ardoise/Falcons/Profil. La confirmation garde le montant et le nouveau solde prioritaires.
- [x] Réutiliser une même clé tant qu'un résultat réseau est incertain ; retrouver la confirmation au retour plutôt que recréer un achat. Afficher les états vide, indisponible, chargement et erreur.
- [x] Vérifier tests de service et parcours inscription → achat → solde, puis capture mobile à 390 px ; enregistrer le lot.

## Task 4: Ardoises, règlements et tableau financier

**Files:** `src/features/ledger/{service.ts,calculations.ts,components/*}`, `src/features/admin/{members.ts,settings.ts}`, `src/app/(kiosk)/ardoise/page.tsx`, `src/app/admin/{page.tsx,membres/page.tsx,reglages/page.tsx}`, `tests/integration/ledger.test.ts`.

**Interfaces:** Consomme achat et compte. Produit `getAccountLedger(userId: string): Promise<AccountLedger>`, `recordPayment(input: { memberId: string; cents: number; idempotencyKey: string; receivedAt: string }): Promise<ActionResult<PaymentReceipt>>`, corrections/annulations motivées et remboursements limités à l'avoir.

- [x] Écrire les tests rouges : dette CHF 23 moins paiement CHF 20 => CHF 3 ; aucune remise à zéro le vendredi ; achat postérieur à une demande conservé ; double règlement simultané bloqué ; paiement supérieur à la dette refusé.
- [x] Ajouter les cas : consommation CHF 5 payée puis correction CHF 2 => avoir CHF 2 ; nouvelle consommation utilisant l'avoir ; remboursement de l'avoir et refus d'un montant supérieur ; annulation d'un paiement rétablissant la dette.
- [x] Implémenter le journal et les mutations sous transaction avec verrou de compte, confirmation personne/montant et trace auteur/date/motif.
- [x] Livrer la vue admin v3 : recherche, grade/nom/téléphone, dettes totales, copie du montant/numéro et paiement manuel. Livrer historique personnel, modification de profil et administration des accès.
- [x] Livrer les agrégats de période : ventes, coût estimé couvert, marge estimée, achats, encaissements, remboursements, dépenses, trésorerie, dettes et avoirs. Tester l'exemple 24 canettes du PRD et les ventes sans coût.
- [x] Vérifier séparation des droits, masquage des coordonnées hors admin et tous les tests du lot ; enregistrer le lot.

## Task 5: Classements et succès

**Files:** `src/features/achievements/{periods.ts,service.ts,components/*}`, `src/app/(kiosk)/falcons/page.tsx`, `tests/domain/periods.test.ts`, `tests/integration/achievements.test.ts`.

**Interfaces:** Produit `weekBoundsZurich(date: Date): { start: Date; end: Date }`, `getRankings(period: 'week' | 'all'): Promise<Rankings>` et badges calculés depuis les consommations nettes.

- [x] Tester trois boissons et deux snacks => trois unités ; contribution calculée sur achats, jamais paiements ; ex æquo partageant le rang ; semaine vide sans vainqueur.
- [x] Tester bornes du lundi, semaines de changements d'heure et correction d'une ancienne vente recalculant anciens rangs/badges sans changer la semaine courante.
- [x] Implémenter les périodes explicites Europe/Zurich et les agrégats. Présenter semaine en cours provisoire, vainqueurs des semaines terminées et badges personnels historiques recalculables.
- [x] Livrer l'espace Falcons et les distinctions numériques sobres de la direction approuvée ; n'exposer que noms, grades, rangs et scores autorisés.
- [x] Vérifier tests et refus d'accès aux données personnelles détaillées par les classements ; enregistrer le lot.

## Task 6: Piller et installation PWA

**Files:** `src/features/piller/{quotes.ts,service.ts,voice.ts,components/*}`, `src/app/manifest.ts`, `public/{sw.js,icons/*}`, `src/components/install-guide.tsx`, `tests/domain/piller.test.ts`, `tests/e2e/pwa-piller.spec.ts`.

**Interfaces:** `selectQuote(previousId?: string): Quote` ; réplique associée à la consommation côté serveur, puis `speakQuote(text: string): Promise<VoiceResult>` côté client avec lecture relançable. Préférence sonore propre à l'appareil.

- [x] Tester mode désactivé, une réplique par panier confirmé, rotation sans répétition immédiate, même réplique pour la reprise du même achat et aucun déclenchement sur paiement/erreur/historique.
- [x] Intégrer les 20 répliques du PRD et le réglage administrateur exact « Activer Adjudant Piller ». Utiliser une synthèse vocale navigateur de personnage sans service IA par achat ; si aucune voix française n'est disponible, afficher le texte et une indication audio explicite.
- [x] Afficher la même phrase en texte et audio, avec muet, arrêt et « Écouter » de secours ; ne pas bloquer une transaction sur l'audio.
- [x] Ajouter manifeste, icônes et aide d'installation iPhone/Android ; cache limité aux actifs publics. Les pages authentifiées, API, mutations et soldes ne sont jamais servis depuis un cache hors ligne.
- [x] Tester confirmation impossible sans réseau, déconnexion sans affichage d'un ancien compte et mise à jour sans doublon ; vérifier texte Piller présent même sans synthèse sonore.
- [x] Vérifier le lot puis enregistrer.

## Task 7: Catalogue imprimable, affiche QR et exports

**Files:** `src/features/documents/{catalog-pdf.ts,qr-pdf.ts,csv.ts,fonts.ts}`, `src/app/admin/documents/page.tsx`, `src/app/api/admin/documents/*/route.ts`, `tests/integration/documents.test.ts`.

**Interfaces:** `buildCatalogPdf(products: PrintableProduct[]): Promise<Uint8Array>`, `buildAccessPdf(canonicalUrl: string): Promise<Uint8Array>`, exports CSV avec champs métier et protection contre l'interprétation de formules.

- [x] Tester contenu catalogue actif et tarifs au moment de l'export ; indisponibilités marquées ; coûts, marges et données personnelles absents ; longue liste paginée.
- [x] Implémenter PDF A4 avec police locale prenant en charge les noms français et internationaux, répétition des en-têtes, identité Falcons et date de génération.
- [x] Générer l'affiche depuis `PUBLIC_APP_URL` HTTPS configurée, sans aucun secret, avec QR noir/blanc à marge blanche et URL lisible. Refuser un lien fictif ou une URL absente ; distinguer clairement ce QR de TWINT.
- [x] Livrer exports administratifs comptes/achats/consommations/paiements et une exportation de sauvegarde structurée permettant un essai de restauration.
- [x] Rendre les deux PDF, vérifier visuellement A4/noir et blanc et décoder le QR généré ; vérifier autorisation admin des routes ; enregistrer le lot.

## Task 8: Validation complète et préparation Vercel

**Files:** `README.md`, `docs/deployment.md`, `docs/operations.md`, configuration build/tests, `tests/e2e/{auth.spec.ts,admin.spec.ts,full-flow.spec.ts}`, `DESIGN.md`, `.impeccable/design.json`.

**Interfaces:** Assemble les tâches précédentes ; fournit migrations, bootstrap, démarrage, build, variables d'environnement et procédures de sauvegarde/restauration exploitables.

- [x] Exécuter tous les tests métier et d'intégration ; valider 100 comptes et 10 confirmations concurrentes ; ajouter les parcours manquants de la matrice PRD.
- [x] Lancer vérification TypeScript, analyse statique, build de production et parcours navigateur. Ne pas réclamer de base externe pour compiler, mais afficher une erreur claire à l'usage si la configuration de production manque.
- [x] Inspecter mobile 390 px, mobile étroit 320 px et bureau 1440 px, clavier, contraste, erreurs et états vides ; capturer les vues et comparer avec les maquettes v3 approuvées en deux passes groupées maximum.
- [x] Suivre la revue finale et la documentation Impeccable : conserver les captures, appliquer les corrections matérielles de revue et décrire le système réellement construit dans `DESIGN.md` et `.impeccable/design.json`.
- [x] Faire la revue de développement finale Superpowers sur les droits, transactions et opérations financières ; corriger les défauts matériels et refaire seulement les vérifications concernées.
- [x] Documenter connexion PostgreSQL via Vercel, migrations, admin initial, URL canonique, rôle de responsable, sauvegarde quotidienne et essai réel de restauration. Aucun secret dans le dépôt, les logs ou le navigateur.
- [x] Présenter l'application locale et les résultats de vérification. Fournir les étapes de connexion au compte Vercel et à PostgreSQL qui nécessitent les accès du propriétaire ; ne pas prétendre avoir déployé sans URL et vérification effectives.

## Ordre et décisions avant exécution

Les tâches sont séquentielles ; les calculs, types et services précédents sont les dépendances des interfaces suivantes. Une exécution native dans le dossier actuel est recommandée : le dépôt ne contient aucun code applicatif ni commit existant à protéger, et les métiers partagent beaucoup d'interfaces. Un worktree isolé reste possible si le demandeur le souhaite, après un premier état Git enregistré.

Le plan doit être relu et le mode d'exécution choisi conformément au skill Superpowers demandé. La validation de la direction v3 est déjà acquise et ne doit pas être redemandée.

## Sources techniques consultées le 7 novembre 2026

- [Next.js — installation](https://nextjs.org/docs/pages/getting-started/installation) : minimum Node.js 20.9 ; runtime local observé : 24.22.1.
- [Next.js — App Router](https://nextjs.org/docs/app/getting-started).
- [Vercel — stockage Marketplace](https://vercel.com/docs/marketplace-storage) et [Postgres sur Vercel](https://vercel.com/docs/postgres) : bases PostgreSQL externes, notamment Neon ; ne pas utiliser l'ancien produit Vercel Postgres.

## Auto-relecture du plan

Les fonctionnalités du PRD sont couvertes par les tâches 1 à 8. Les cinq points de revue correspondent à des tests explicitement affectés. Les contrats `Database`, `SessionUser`, `ActionResult` et `CheckoutReceipt` sont partagés ; l'implémenteur complète leurs types concrets dans les tâches qui les produisent. Aucune intégration TWINT, approbation d'inscription ou fonction d'inventaire n'a été ajoutée. La création effective d'une base distante et la mise en production dépendent des accès du propriétaire, sans bloquer la construction et les vérifications locales.
