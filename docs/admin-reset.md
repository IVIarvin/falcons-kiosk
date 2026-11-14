# Nettoyage sélectif de RAVIT

Les opérations et les comptes membres sont cochés par défaut. Le catalogue, les modèles de patchs, leurs images, les réglages et les répliques sont conservés par défaut. Tous les comptes admin, même inactifs, restent conservés.

- **Opérations et réservations** : consommations, tickets de service, visiteurs, règlements, achats fournisseur, dépenses, corrections, réservations de patchs et reçus de reprise associés.
- **Comptes membres** : nécessite les opérations, pour ne pas conserver de dette sans compte.
- **Produits** : nécessite les opérations, pour ne pas conserver d’achat lié à un produit supprimé.
- **Patchs et images** : modèles, images et réservations. Si les opérations sont conservées, leurs dettes restent inchangées et les reçus d’articles libres restent protégés.
- **Réglages et répliques** : réinitialise les réglages et supprime les répliques personnalisées.

Quand les membres sont supprimés et les patchs conservés, les références aux anciens créateurs/importateurs non-admin sont rattachées à l’admin qui confirme. Les images et les états des campagnes sont conservés ; une ancienne commande n’est pas automatiquement rouverte.

Sauvegarde complète, mot de passe courant et confirmation restent obligatoires. Une donnée métier modifiée depuis la sauvegarde invalide la préparation. Les sessions sont révoquées après le nettoyage. Un ticket déjà terminé ne peut pas effacer des données ajoutées ensuite.

Aucune sélection implicite côté serveur : une ancienne version de l’app qui omet les cases reçoit une erreur, sans suppression.
