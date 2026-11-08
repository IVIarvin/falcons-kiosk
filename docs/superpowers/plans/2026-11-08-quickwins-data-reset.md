# Favoris, données et remise à zéro

**Décisions du propriétaire :** petits ajouts utiles sans alourdir ; accès facile aux données depuis l’admin ; reset qui conserve **tous les comptes admin et efface le reste**. Aucune exécution du reset de production demandée. Coordination entre les deux chats explicitement autorisée.

**Architecture :** deux petites commandes au kiosque (favoris par compte/appareil, vider le panier non confirmé). Écran Données en lecture seule, route dédiée pour éviter les blocs application/backup modifiés par l’autre chat. Migration007 pour les tickets de reset ;006 appartient aux articles libres/patchs.

## Fonctionnalités
- [x] Favoris : épingler/désépingler, filtre près de la recherche, panier inchangé, préférences séparées par compte.
- [x] Vider le panier : ne touche que le panier non confirmé ; commande désactivée pendant confirmation/reprise réseau.
- [x] Données : tables métier autorisées, compteurs, recherche/pagination, détail d’une ligne, sauvegarde privée et accès à la console Neon. Aucun mot de passe, hash ou jeton dans le navigateur de données.
- [x] Reset : préparer un aperçu et une sauvegarde téléchargeable ; confirmer avec mot de passe actuel et texte explicite. Garder tous les admins avec leurs identifiants ; effacer membres, catalogue, opérations, réservations/campagnes, caches et personnalisation des réglages/répliques.
- [x] Sauvegarde figée : refus si les données métier ont changé depuis sa préparation ; nouveau téléchargement requis.
- [x] Transaction et verrouillage de toutes les tables concernées ; ticket expirant et reprise idempotente ; révocation des sessions et reconnexion après reset.

## Exécution
1. [x] Tests RED→GREEN : consultation admin et secrets exclus, tables arbitraires refusées, recherche/pagination ; reset autorisations/mot de passe/confirmation, données changées, conservation exacte de tous les admins,006incluse, reprise sans effacer des données nouvelles.
2. [x] Implémenter modules et migration007 sans toucher aux blocs application/backup de l’autre chat.
3. [x] Intégrer navigation et commandes kiosque une fois ses points d’entrée stables ; tester favoris/vider et parcours reset en base isolée uniquement.
4. [x] Tests complets, TypeScript/build, contrôle desktop/mobile et revue indépendante.
5. [ ] Coordonner commits/migrations006+007 et publication ; aucune suppression de données réelles.

## Review Focus
- Une sauvegarde antérieure à une nouvelle dette ne peut pas autoriser l’effacement de cette dette.
- Un ancien ticket terminé rejoué ne supprime aucune donnée ajoutée ensuite.
- Les lignes de patchs, reçus idempotents et références FK ne bloquent pas le reset.
- Les identifiants et mots de passe des admins sont inchangés, leurs anciennes sessions sont invalidées.
- Le filtrage des favoris et la recherche ne modifient ni total ni contenu du panier.

## Validation avant publication
- Vitest :104/104 tests,29 fichiers ; parcours navigateur communs :7/7.
- TypeScript et build de production réussis ;6captures à320/390/1440px, aucun débordement ni erreur navigateur.
- Revue indépendante du reset/API/favoris : aucun défaut critique ou important. Le reset serveur reste testé sur PGlite isolé ; parcours destructif navigateur simulé.
- Sauvegarde privée avant006 préparée et hashée. Étape5 à finaliser pendant la publication ; aucun reset de production exécuté.

