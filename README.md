# Falcons — kiosque de section

Application web mobile installable, en français et CHF. Direction tactique noire/verte validée ; inscription autonome, consommations sur ardoise et règlements TWINT confirmés manuellement par le responsable.

## Démarrer en local

Node.js 22 ou supérieur et pnpm 11.25.0. Node 24 a été utilisé pour la validation.

```sh
pnpm install
pnpm db:demo
pnpm dev --port 3010
```

Ouvrir [le kiosque local](http://127.0.0.1:3010).

`db:demo` crée uniquement des données fictives et refuse de modifier une base contenant déjà des comptes. La base locale persiste dans `.data/postgres`, ignoré par Git. Ne pas lancer deux processus d'administration de la même base PGlite pendant que le serveur local l'utilise.

Accès de démonstration :

| Rôle | Téléphone | Mot de passe |
|---|---|---|
| Responsable | 079 000 00 01 | `Falcons-demo-2026!` |
| Membre | 079 000 00 02 | `Falcons-demo-2026!` |

Ces accès sont réservés à la démonstration créée explicitement. Pour afficher sa bannière et ses indications de connexion en développement, définir `FALCONS_DEMO=1` avant de lancer le serveur. Le script refuse l'environnement Vercel et la production.

## Fonctions

- Comptes avec grade, nom et téléphone ; connexion par mot de passe, récupération avec code temporaire remis par le responsable.
- Catalogue, panier, prix vérifiés côté serveur, historique personnel et solde. Les reprises réseau réutilisent la même opération.
- Produits et coûts d'achat, majoration et dérogation manuelle, aperçu des prix avant publication explicite. Recherche de références Open Food Facts avec photo, format et caractéristiques corrigeables ; saisie libre en cas d'absence ou de panne.
- [Tickets de contrôle](docs/service-tickets.md) réservés aux admins depuis « Servir » sur chaque produit du kiosque ; saisie par personne, annulation et reprise réseau sans double comptage. Visiteurs avec leur seul nom, puis rattachement manuel à un compte inscrit en conservant l'historique. Contrôle des quantités par période en heure suisse, indépendant des ardoises et des classements.
- Ardoises administratives, paiements partiels, annulations motivées, avoirs et remboursements.
- Date réelle des règlements, reprise des achats et dépenses après réponse perdue, annulation traçable des dépenses erronées.
- Marge estimée, encaissements, dépenses et trésorerie distincts ; coûts inconnus visibles et complétables avec une trace.
- Classements boissons et contributions, semaines Europe/Zurich, ex æquo et succès historiques recalculés après correction.
- Adjudant Piller : 60 répliques actives selon le panier, texte et lecture vocale du même commentaire, son désactivable sur l'appareil. Les anciens identifiants restent lisibles dans les confirmations historiques.
- Répliques modifiables et désactivables depuis les réglages, avec aperçu vocal, audit et protection contre les modifications concurrentes ; le texte des achats confirmés reste figé.
- Préparation d'une voix masculine dédiée : export des textes, essais ElevenLabs, fichiers MP3 réutilisables et arrêt sûr de la lecture. La voix du téléphone reste active jusqu'à la préparation réelle des enregistrements. Voir [le guide voix](docs/piller-voice.md).
- PWA, guide iPhone/Android, écran hors connexion sans cache des données de compte.
- Catalogue PDF A4, affiche QR vers l'adresse de production, exports CSV et sauvegarde/restauration structurée.

## Vérifier

```sh
pnpm test
pnpm typecheck
pnpm build
```

Pour les parcours navigateur, lancer d'abord le serveur sur le port 3010 et installer la démonstration dans une base locale neuve :

```sh
pnpm test:e2e
```

La configuration utilise Chrome installé sur Windows s'il est disponible, sinon Chromium de Playwright (`pnpm exec playwright install chromium`). Les tests créent des comptes et opérations fictifs : utiliser la base locale de démonstration, jamais des comptes réels.

De nombreuses relances peuvent atteindre la limite de connexion normale du compte démo. Attendre sa fenêtre de 15 minutes, ou arrêter le serveur et lancer `pnpm exec tsx scripts/qa-reset-demo-login.ts` avec `FALCONS_DEMO=1`. Cet utilitaire refuse la production et les connexions distantes, vérifie le compte fictif et ne réinitialise que les compteurs de démonstration.

`pnpm qa:visual` produit des captures de contrôle dans `.impeccable/review`. Les images et PDF de ce dossier sont des fichiers de vérification ; l'affiche QR de test pointe volontairement vers un exemple et ne doit pas être utilisée au kiosque.

## Base et compte responsable réels

Copier `.env.example` vers `.env.local`, renseigner les variables serveur, puis :

```sh
pnpm db:migrate
pnpm admin:create
```

Les variables `BOOTSTRAP_PHONE`, `BOOTSTRAP_NAME`, `BOOTSTRAP_GRADE` et `BOOTSTRAP_PASSWORD` servent uniquement à créer le premier responsable. Le script ne transforme pas automatiquement un utilisateur existant en admin et n'affiche aucun secret. Retirer ces variables après création. Les futurs responsables sont désignés dans l'administration ; le dernier responsable actif est protégé.

## Mise en ligne

Voir [déploiement Vercel](docs/deployment.md) et [exploitation et sauvegardes](docs/operations.md). Sur Vercel, `DATABASE_URL` est obligatoire et aucun stockage de comptes dans le système de fichiers éphémère n'est utilisé. L'application n'est pas publiée par le démarrage local.

## Choix et limites explicites

TWINT reste extérieur à l'application. Le téléphone est validé syntaxiquement, sans SMS ni vérification de sa propriété. Les marges sont estimées à partir des coûts renseignés, sans inventaire comptable. La synthèse vocale utilise les voix françaises disponibles sur l'appareil ; si elle est indisponible ou bloquée, le texte reste affiché et le bouton Écouter permet de réessayer. L'installation sur les téléphones physiques est à confirmer pendant le pilote.

## Structure

`src/features/` regroupe les services et écrans métier. `src/lib/db/` fournit les adaptateurs PostgreSQL/PGlite ; `db/migrations/` conserve le schéma. Les mutations passent par les services contrôlés côté serveur. Les montants facturés sont des centimes entiers ; les coûts unitaires sont conservés en millionièmes de CHF. Les calculs historiques ne sont pas reconstruits depuis les prix actuels.

Le [PRD](docs/superpowers/specs/2026-11-07-kiosque-prd.md), le [plan](docs/superpowers/plans/2026-11-07-falcons-implementation.md) et la [direction validée](docs/superpowers/specs/2026-11-07-falcons-direction-ui-v3.md) conservent les décisions. Les visuels de produits de démonstration et le faucon filaire ont été générés avec ImageGen ; leurs prompts sont dans `docs/design/assets/` et embarqués dans les PNG.

La recherche de références utilise [Open Food Facts](https://world.openfoodfacts.org/). Les photos importées conservent leur attribution et leur lien de licence dans l'interface. L'admin vérifie le format et les caractéristiques sur l'emballage ; une donnée absente reste inconnue. La police des PDF et sa licence sont dans `public/fonts/`.
