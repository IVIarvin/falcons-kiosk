# Exploitation du kiosque

## Responsable et vendredi

Les membres s'inscrivent et consomment sans validation. Le responsable gère les produits, achats et tarifs. Pour le règlement, rechercher la personne dans Ardoises, copier son numéro et réclamer le montant en dehors de l'application. Cliquer sur Marquer reçu uniquement après réception effective ; le montant reste modifiable pour un paiement partiel.

Il n'y a pas de remise à zéro hebdomadaire. Une nouvelle consommation après une demande de paiement reste due. Une correction conserve l'opération d'origine et le motif. Si une consommation réglée est annulée, l'avoir peut être utilisé ou remboursé ; le remboursement se fait extérieurement avant d'être enregistré.

La date de réception se choisit à l'enregistrement : un règlement reçu vendredi mais saisi lundi doit garder la date du vendredi. Une dépense erronée s'annule avec un motif depuis le suivi financier ; son montant d'origine reste visible et elle est exclue des totaux actifs. Renseigner ensuite la dépense correcte si nécessaire.

Une opération signalée comme incertaine doit être retrouvée via son bouton de vérification, pas ressaisie avec une nouvelle identité. Les confirmations serveur et les clés conservées dans l'onglet empêchent les doublons. La validation bancaire reste manuelle.

## Prix et marge

Les achats se saisissent en unités vendables : deux packs de 24 canettes font 48 unités. Un réapprovisionnement met à jour le coût de référence des prochaines consommations. Les prix automatiques sont proposés, puis publiés explicitement ; les anciennes consommations ne changent pas de prix.

La marge brute estimée n'est pas un bénéfice net. Une dépense de stock diminue la trésorerie avant la vente ; une consommation peut rester impayée. Les coûts inconnus sont signalés et peuvent être complétés par le responsable avec une trace. L'application ne tient pas d'inventaire physique.

## Accès et changement de responsable

Créer le nouveau compte normalement, puis lui donner le rôle Responsable depuis Réglages → Gérer les membres. Vérifier son accès avant de retirer l'ancien. Les changements de rôle et de coordonnées administratifs sont tracés ; le dernier responsable actif ne peut pas être retiré.

Un mot de passe oublié se récupère au moyen d'un code à usage unique de 15 minutes remis après vérification directe par le responsable. Les anciens mots de passe ne sont jamais consultables. Une réinitialisation ou une modification des accès révoque les sessions du compte.

Transmettre séparément la propriété et les accès du dépôt, de Vercel, de PostgreSQL et des sauvegardes : donner le rôle responsable dans le kiosque ne transfère pas ces services.

## Sauvegarder

La sauvegarde est disponible dans Documents. Elle contient les données nécessaires à une restauration et des données personnelles, dont les empreintes de mots de passe ; les cookies et sessions actives ne sont pas exportés. Conserver les fichiers dans un emplacement privé, hors du dossier public du site et hors du dépôt.

Pour une sauvegarde depuis une machine autorisée avec les variables de la base :

```sh
pnpm db:backup /chemin/prive/backups
```

Sans argument, le script écrit sous `.data/backups`, ignoré par Git. Pour l'exploitation, configurer une sauvegarde quotidienne chez le fournisseur ou planifier cette commande sur une machine autorisée. Conserver une copie en dehors du service hébergeant la base, définir une durée de rétention et vérifier régulièrement la restauration. Cette planification n'a pas été activée automatiquement sur un compte externe.

## Restaurer

Utiliser une nouvelle base vide, jamais écraser la base en service. Configurer sa connexion dans `.env.local`, appliquer la migration et lancer :

```sh
pnpm db:restore /chemin/prive/falcons-sauvegarde.json
```

Le script refuse une base contenant déjà des comptes et restaure les données dans une transaction. Les sessions ne sont pas restaurées : les personnes se reconnectent. Vérifier le nombre de comptes, les dettes, les produits et les accès responsables, puis basculer la connexion de l'application après validation. La restauration sur base de test a été exercée pendant les vérifications, sans modifier une base réelle.

## Données et conservation

Le grade, le nom et le téléphone servent aux comptes et règlements. Les classements partagent noms, grades et agrégats d'achats ; seuls les responsables accèdent aux autres coordonnées et aux ardoises détaillées. La désactivation d'un compte conserve sa dette et son historique.

Le propriétaire doit définir avant l'ouverture la durée de conservation et la procédure de suppression/anonymisation après la fin du service et le règlement des dettes. Aucune suppression automatique d'historique financier ni de données réelles n'a été exécutée.
