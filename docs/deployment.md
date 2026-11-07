# Déploiement Falcons sur Vercel

Le code est préparé pour Vercel ; aucun projet distant, abonnement ni déploiement public n'a été créé pendant le développement local.

## Préparer les services

1. Créer ou sélectionner un projet Vercel à partir du dépôt, avec le preset Next.js et une version Node compatible avec `package.json`.
2. Relier une base PostgreSQL persistante, par exemple Neon ou Supabase, via Vercel Marketplace ou une connexion gérée par le propriétaire. Choisir une région de fonctions proche de la base.
3. Configurer `DATABASE_URL` côté serveur avec la connexion mutualisée fournie par le prestataire. La chaîne de connexion ne doit jamais utiliser le préfixe `NEXT_PUBLIC_` ni être copiée dans le dépôt.
4. Configurer éventuellement `PUBLIC_APP_URL` avec l'adresse HTTPS définitive du kiosque. À défaut, le générateur utilise `VERCEL_PROJECT_PRODUCTION_URL` quand Vercel le fournit. Il ne prend pas une URL de preview éphémère pour l'affiche.

Vercel documente les [intégrations de stockage PostgreSQL](https://vercel.com/docs/marketplace-storage) et les [variables système de production](https://vercel.com/docs/environment-variables/system-environment-variables). Les conditions et tarifs du fournisseur choisi restent à vérifier par le propriétaire ; l'application ne facture pas de comptes utilisateurs.

## Initialiser

Depuis une machine autorisée, charger les variables de la base cible dans `.env.local`, puis exécuter `pnpm db:migrate`. Utiliser `pnpm admin:create` avec les quatre variables `BOOTSTRAP_*` pour le premier responsable. Le script crée un nouveau compte ; il ne transforme pas un membre existant en responsable.

Créer ensuite les vrais produits et leurs prix. Ne pas exécuter `db:demo` sur la base distante. Les photographies du catalogue peuvent utiliser une URL HTTPS ou les exemples locaux ; remplacer les données fictives avant l'usage réel.

## Contrôler avant l'ouverture

Ouvrir le déploiement avec un compte membre puis un compte responsable. Vérifier inscription, connexion, achat, ardoise, paiement partiel et confirmation manuelle. Vérifier qu'un membre ne voit aucune coordonnée ni dette d'un autre compte. Télécharger les deux PDF et scanner l'affiche depuis un téléphone sur le réseau effectivement utilisé au kiosque.

Vérifier l'accès public au site lui-même : un éventuel verrou de preview Vercel ne doit pas empêcher un visiteur d'atteindre l'inscription autonome. Il ne remplace pas les comptes de l'application. L'inscription ne nécessite toujours aucune approbation administrative.

Tester l'ajout à l'écran d'accueil sur un iPhone et un Android réels, puis le retour hors connexion. Tester Piller en texte et en voix sur ces appareils ; le choix de voix dépend du système et du navigateur.

Configurer enfin les sauvegardes et leur rétention avant le pilote. Une sauvegarde quotidienne n'est pas activée par le simple déploiement du code : elle dépend du fournisseur ou du lancement planifié du script d'exploitation par le propriétaire.

## Déployer et revenir en arrière

La commande de build est `pnpm build`. La base ne doit pas être nécessaire à la compilation, mais elle est requise pour utiliser l'application en production. Aucun repli vers un fichier local n'est autorisé sur Vercel.

Après validation du déploiement, utiliser sa version de production comme référence pour le QR. Une modification du domaine nécessite une redirection conservée ou une réimpression. Conserver une sauvegarde avant toute migration ultérieure. Un retour de version applicative ne revient pas automatiquement sur les opérations financières de la base.
