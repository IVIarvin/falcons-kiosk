# PRD — Kiosque Falcons

Version : 0.5 — direction tactique v3 et plan d'implémentation approuvés le 7 novembre 2026  
Date : 7 novembre 2026  
Public initial : une section d'au moins 60 personnes  
Devise : CHF ; fuseau : Europe/Zurich

## 1. Intention

Remplacer la feuille à croix du kiosque par une application web utilisable sur téléphone. Chacun enregistre les produits qu'il prend dans le frigo ou au kiosque. Le responsable retrouve les consommations, les montants dus et les numéros permettant de demander les règlements par TWINT.

Le fonctionnement repose sur la confiance. Il doit être assez rapide pour être utilisé à chaque consommation et assez simple pour qu'une personne de passage puisse s'inscrire et acheter sans intervention du responsable.

L'application tient les comptes ; les demandes et transferts TWINT se font en dehors de l'application. Le responsable confirme ensuite les encaissements dans l'application.

Le kiosque doit aussi refléter l'identité des Falcons : une famille d'éclaireurs. Des succès et classements donnent une dimension collective à l'application. Elle peut s'ajouter à l'écran d'accueil du téléphone comme PWA. Le responsable dispose d'une liste imprimable des produits et d'une affiche PDF avec le QR code d'accès.

## 2. Décisions et statut du cadrage

### Confirmé par le demandeur

- Développer notre propre solution, adaptée à au moins 60 personnes, sans abonnement logiciel facturé par compte.
- Un responsable avec un rôle administrateur gère les produits et les règlements.
- Chaque utilisateur possède un compte avec grade, nom et numéro de téléphone.
- L'inscription est autonome, sans validation administrative.
- Les visiteurs créent le même type de compte que les habitués ; aucun parcours invité distinct n'est nécessaire.
- Les utilisateurs enregistrent eux-mêmes leurs consommations.
- Le responsable réclame les montants, notamment le vendredi soir, par contact direct ou demande TWINT, puis indique les paiements reçus dans l'application.
- Aucune intégration TWINT n'est nécessaire pour la première version.
- Le responsable renseigne ses achats et leurs coûts pour suivre l'argent dégagé par le kiosque.
- Un calcul des prix à partir d'un pourcentage de majoration est souhaité. Le choix entre prix manuel et calcul automatique reste à préciser.
- Des succès et classements, dont le plus grand buveur de la semaine et les meilleurs contributeurs.
- Le classement des contributeurs repose sur le montant des achats de chacun, conformément au choix explicite du demandeur ; il ne mesure pas la marge générée ni les paiements reçus.
- Une identité visuelle militaire personnalisée pour les Falcons, les éclaireurs et leur esprit de famille.
- La possibilité d'installer l'application comme PWA sur son téléphone.
- Une liste imprimable des produits proposés au kiosque, accessible à l'administrateur.
- Un PDF contenant le QR code pour accéder à l'application ou au site.
- Hébergement sur Vercel, confirmé par le demandeur.
- Validation de la direction UI/UX à partir d'une moodboard et d'un ou deux écrans avant de développer l'application.
- Paramètre « Activer Adjudant Piller » : après chaque achat confirmé, un commentaire issu d'une liste de répliques est affiché à lire et prononcé à voix haute en parallèle. Le personnage insulte et juge l'acheteur dans le ton humoristique souhaité par la section.

### Choix proposés dans cette version, à confirmer

Ces points sont des recommandations de cadrage, pas des décisions déjà prises par le demandeur :

- Une application web mobile installable en PWA, accessible par QR code et utilisable sans installation.
- Une seule section et un seul kiosque dans la première version.
- Numéro de téléphone et mot de passe pour se connecter ; session conservée sur le téléphone personnel. Aucun SMS payant requis à l'inscription.
- Inscription accessible via le lien du kiosque, sans code de section supplémentaire pour commencer.
- Un pourcentage de majoration général, avec possibilité de fixer un prix manuel par produit.
- Prix automatiques arrondis au multiple de CHF 0.05 le plus proche ; en cas d'égalité, arrondi supérieur.
- Paiements partiels possibles et dettes reportées d'une semaine à l'autre.
- Historique de ses propres consommations et règlements visible par chaque utilisateur ; vue complète et téléphones réservés aux administrateurs. Les classements partagent uniquement les noms, grades et agrégats explicitement définis dans la section 6.5.
- Suivi simple des achats et de la marge brute estimée à partir des coûts renseignés. L'inventaire détaillé est proposé pour une version ultérieure.
- Connexion Internet requise pour confirmer une opération.

## 3. Objectifs et réussite

| Objectif | Critère proposé pour le pilote |
|---|---|
| Remplacer les croix sans ralentir l'utilisateur | Un utilisateur déjà connecté enregistre un achat courant en moins de 15 secondes lors d'un essai sur téléphone. |
| Rendre les passages autonomes | Une personne crée son compte et enregistre sa première consommation sans validation administrative. |
| Simplifier le vendredi | Le responsable retrouve chaque débiteur, son téléphone, son détail et son solde dans une même vue de règlement. |
| Rendre les comptes compréhensibles | Chaque solde peut être expliqué par les consommations, corrections et paiements correspondants. |
| Mesurer l'activité | Les achats, ventes enregistrées, encaissements et marges sont distingués. |
| Tenir la taille de la section | Aucune limite produit à 60 comptes ; cible initiale de validation : 100 comptes et 10 enregistrements simultanés. |
| Renforcer l'identité Falcons | Les mêmes couleurs, emblème et ton se retrouvent dans l'application, l'icône et les supports imprimés. |
| Retrouver rapidement le kiosque | Installation sur un iPhone et un Android de référence, puis réouverture depuis l'écran d'accueil. |
| Faciliter l'affichage au kiosque | Le responsable télécharge une liste à jour et une affiche QR imprimables au format A4. |

Le succès est l'abandon de la feuille quotidienne et du calcul manuel des dettes. La confiance ne doit pas empêcher de retrouver l'origine d'une erreur.

## 4. Approches envisagées

### Solution existante

Des solutions de liste de consommations existent : [drinklist.app](https://drinklist.app/en/faq), [Club Coaster](https://club-coaster.app/) et [Honesty Bar](https://honesty.bar/). Elles ont été présentées puis écartées par le demandeur en raison de leur adéquation et de leur modèle payant. Une facturation à la personne n'est pas considérée acceptable pour ce projet. Toutes ces solutions ne facturent pas nécessairement par compte.

### Solution sur mesure retenue

Application propre avec comptes, catalogue, ardoises et règlements manuels. Le demandeur a choisi de développer lui-même plutôt que de retenir une des solutions présentées. Le support est une application web mobile installable en PWA ; l'hébergement Vercel est confirmé. Le framework et la base de données restent à choisir.

### Variante de paiement écartée de la V1

Une intégration TWINT pourrait automatiser la confirmation des paiements, au prix d'une intégration et de dépendances supplémentaires. Le choix confirmé est de conserver le paiement externe et une validation par le responsable.

### Variante de prix proposée

Un tarif uniquement manuel est simple mais oblige à recalculer les majorations. Un tarif uniquement automatique limite les ajustements commerciaux. La recommandation est de combiner une règle générale avec une dérogation manuelle par produit. Cette recommandation reste à confirmer.

## 5. Utilisateurs et droits

| Action | Utilisateur | Administrateur |
|---|---|---|
| Créer un compte sans approbation | Oui | Oui |
| Modifier son grade, son nom et son téléphone | Oui, pour soi | Oui, avec trace des modifications administratives |
| Consulter le catalogue et enregistrer une consommation | Oui, sur son compte | Oui, sur son propre compte |
| Consulter son historique et son solde | Oui | Oui |
| Consulter les dettes et téléphones des autres | Non | Oui |
| Créer, modifier ou désactiver des produits | Non | Oui |
| Enregistrer ou corriger des achats | Non | Oui |
| Enregistrer ou annuler un règlement | Non | Oui |
| Corriger une consommation confirmée | Demander une correction au responsable | Oui, avec motif et trace |
| Consulter les classements et succès de section | Oui, après connexion | Oui |
| Consulter ses badges et ceux des classements | Oui | Oui |
| Installer la PWA sur son téléphone | Oui | Oui |
| Exporter les comptes du kiosque | Non | Oui |
| Télécharger la liste des produits et l'affiche QR en PDF | Non | Oui |
| Activer Adjudant Piller pour le kiosque | Non | Oui |
| Couper le son de Piller sur son propre téléphone | Oui | Oui |
| Attribuer le rôle administrateur | Non | Oui, à un compte existant |

Un utilisateur ne peut pas acheter sur le compte d'un autre dans la V1. Le premier administrateur est désigné lors de la mise en service, jamais automatiquement parce qu'il est le premier inscrit. Les inscriptions suivantes reçoivent uniquement le rôle utilisateur. Le dernier administrateur actif ne peut pas retirer son propre accès administratif.

## 6. Parcours attendus

### 6.1 Inscription et connexion

1. La personne scanne le QR code du kiosque avec son téléphone et ouvre l'application.
2. Elle renseigne son grade, son nom, son téléphone et le moyen de connexion retenu.
3. Le compte devient immédiatement utilisable, sans validation du responsable.
4. Les visites suivantes conservent la connexion tant que la session reste valide.

Le téléphone est obligatoire, unique après normalisation au format international et visible uniquement par son propriétaire et les administrateurs. L'interface aide à saisir un numéro suisse, tout en acceptant les numéros internationaux. Une modification vers un numéro déjà utilisé est refusée. Un changement de téléphone ne crée pas un nouveau compte et ne modifie aucune dette.

Le grade est un champ texte obligatoire pour éviter de bloquer un visiteur sur une liste de grades incomplète. La formulation exacte du nom et une éventuelle liste de grades pourront être affinées sans changer le modèle de compte.

La proposition sans SMS vérifie le format du numéro, pas sa propriété ni sa présence sur TWINT. L'application ne prétend pas le contraire. La récupération d'accès passe, dans la V1 proposée, par un administrateur qui remet un accès temporaire après vérification directe auprès de la personne ; une modification du mot de passe est ensuite exigée. L'administrateur n'a jamais accès au mot de passe existant.

### 6.2 Enregistrer une consommation

1. L'utilisateur ouvre le catalogue des produits actifs, avec leurs prix en CHF.
2. Il sélectionne les produits et quantités.
3. Il voit le total et confirme l'ajout à son ardoise.
4. Une confirmation explicite apparaît après l'enregistrement ; le nouveau solde est visible.
5. Il prend les produits, selon le fonctionnement actuel du kiosque.

La V1 utilise une sélection de produits ; aucun scan de code-barres n'est requis. Les quantités sont des nombres entiers strictement positifs. Le prix affiché doit être le prix confirmé. S'il change entre l'ouverture du catalogue et la confirmation, l'utilisateur doit accepter le nouveau total.

Un double appui ou une reprise après erreur réseau ne doit pas compter deux fois une même confirmation. En cas de résultat incertain, l'application retrouve l'opération avant de permettre de la renvoyer. Sans enregistrement confirmé, elle ne présente pas la consommation comme réussie.

Une erreur signalée après confirmation est corrigée par l'administrateur avec un motif. La correction conserve l'opération initiale et met à jour le solde et les ventes concernés.

### 6.3 Régler son ardoise

1. Le responsable ouvre les comptes présentant un montant dû.
2. Il consulte le nom, le grade, le téléphone, le montant et le détail de la personne.
3. Il contacte la personne ou crée lui-même une demande dans TWINT, en dehors de l'application. Le téléphone et le montant sont faciles à copier.
4. Après réception effective de l'argent, il enregistre le montant reçu, la date et le moyen de paiement.
5. Le paiement diminue la dette et apparaît dans l'historique de la personne.

Un raccourci peut proposer de régler tout le solde affiché, mais la confirmation montre toujours la personne et le montant exacts. Une simple demande TWINT ne constitue pas un paiement reçu.

Les paiements partiels sont proposés pour la V1. Un paiement supérieur à la dette actuelle est refusé ; les avances volontaires sont hors périmètre. Une erreur de règlement est annulée avec motif, sans suppression de la trace originale.

Une correction d'achat déjà réglé peut exceptionnellement créer un avoir. Cet avoir diminue les consommations suivantes. Si la personne ne revient pas, le responsable rembourse en dehors de l'application et enregistre ce remboursement pour solder l'avoir ; il ne supprime pas le paiement initial. Exemple : CHF 5 payés puis CHF 2 de consommation annulés créent un avoir de CHF 2, utilisable ou remboursable. Un remboursement supérieur à l'avoir est refusé. L'avoir est une dette du kiosque envers la personne et reste distinct des montants à recevoir des autres membres.

Il n'y a pas de remise à zéro automatique le vendredi. Les dettes non payées restent dues. Le responsable peut consulter l'activité d'une semaine, mais les nouvelles consommations ne sont jamais effacées par le paiement d'un ancien montant.

Exemple : une demande de CHF 20 est envoyée ; la personne consomme ensuite CHF 3 ; à réception des CHF 20, son solde restant est CHF 3.

Un visiteur peut utiliser exactement ce parcours et payer immédiatement après son achat. Il possède un compte normal, même s'il ne revient pas.

### 6.4 Gérer les produits et les achats

Le responsable crée un produit avec nom, unité de vente, disponibilité, mode de prix et éventuellement catégorie et photo. Il peut le désactiver sans supprimer l'historique.

Pour chaque achat ou réapprovisionnement, il renseigne la date, le produit, le nombre d'unités vendables et le coût total payé. Une saisie par paquet peut aider, mais la quantité finale doit être exprimée dans l'unité vendue : par exemple, 2 packs de 24 canettes correspondent à 48 unités.

Les coûts indiqués sont les coûts réellement supportés par le kiosque. La V1 ne décompose pas la TVA. Une consigne récupérable, si elle existe, est exclue du coût produit par le responsable ; sa gestion séparée reste hors périmètre.

Pour des produits déjà présents au lancement, le responsable peut renseigner un coût unitaire de référence sans inventer une dépense pendant la période. La saisie des achats sert au calcul des prix et au suivi financier ; elle ne devient pas une condition bloquant la consommation. Un produit actif reste sélectionnable jusqu'à ce que le responsable le marque indisponible.

### 6.5 Succès et classements Falcons

Les succès et classements sont demandés ; les noms et règles détaillés ci-dessous sont des propositions pour une V1 simple.

| Élément | Règle proposée | Présentation |
|---|---|---|
| Plus grand buveur de la semaine — « Faucon assoiffé » | Nombre d'unités de boissons enregistrées par personne pendant la semaine, après corrections. | Classement hebdomadaire et badge pour la première place. |
| Meilleurs contributeurs — « Piliers du nid » | Somme en CHF des consommations enregistrées par personne, après corrections. | Classement de la semaine et classement depuis le lancement. |
| Contributeur de la semaine | Première place au classement hebdomadaire des contributeurs. | Badge hebdomadaire sur le profil. |
| Premier ravitaillement | Première consommation confirmée d'un membre, tous produits confondus. | Badge personnel d'accueil dans la famille Falcons. |

Le responsable indique pour chaque produit s'il s'agit d'une boisson. Une unité de boisson compte pour une unité, quel que soit son volume ; les snacks n'entrent pas dans le classement des buveurs. Il ne s'agit pas d'un classement réservé aux boissons alcoolisées. Le caractère « boisson » est conservé avec la consommation afin qu'une modification de catégorie ne réécrive pas les semaines précédentes.

La semaine va du lundi à 00 h 00 au lundi suivant à 00 h 00, borne de fin exclue, dans le fuseau Europe/Zurich. L'heure de confirmation de la consommation fait foi, pas la date du règlement. Cette semaine sociale n'impose aucune clôture financière le vendredi.

Exemple : CHF 12 consommés le jeudi et payés le lundi suivant comptent pour CHF 12 de contribution dans la semaine du jeudi. Le paiement du lundi ne rapporte aucun point supplémentaire. Le classement affiche explicitement « achats enregistrés », pour que contribution ne soit pas confondue avec argent déjà encaissé.

Les tableaux indiquent nom, grade, rang et score correspondant : unités pour les boissons, CHF pour les contributeurs. Ils sont visibles uniquement après connexion et ne montrent ni téléphone, ni solde dû, ni détails individuels des achats. Le cumul de contribution peut néanmoins révéler le montant total des achats d'une personne ; cette visibilité fait partie du fonctionnement social proposé.

Les ex æquo partagent le même rang et, le cas échéant, le badge de vainqueur. Aucun vainqueur n'est désigné si aucun achat éligible n'a été enregistré. La semaine en cours est indiquée comme provisoire ; les badges hebdomadaires sont attribués lorsque la semaine se termine et restent visibles sur le profil avec leur période. Une consommation corrigée recalcule la semaine concernée et les badges associés ; une opération annulée n'accorde aucun succès. Aucune attribution ne dépend d'une approbation administrative.

Les badges sont symboliques et n'accordent ni rabais, ni crédit, ni privilège administratif. Une galerie simple présente les badges obtenus et leurs règles ; un système de quêtes, de points configurables ou de récompenses financières n'est pas prévu en V1.

### 6.6 Installer l'application sur son téléphone

1. La personne ouvre le site depuis le QR code ou son lien habituel.
2. Une action « Installer sur mon téléphone » explique le parcours adapté à son appareil.
3. Lorsque le navigateur le permet, elle lance la demande d'installation ; sinon, elle suit un guide court pour ajouter l'application à l'écran d'accueil.
4. L'icône Falcons ouvre ensuite l'application dans une fenêtre dédiée sur les appareils compatibles, avec les mêmes données et droits que le site.

L'installation reste facultative et ne demande aucune publication dans un magasin d'applications. Le parcours de référence est documenté pour Safari sur iPhone et Chrome sur Android ; il ne suppose pas qu'une invite automatique existe dans tous les navigateurs. Si la session de la PWA n'est pas partagée avec celle du navigateur, une reconnexion normale suffit, sans création d'un nouveau compte.

La PWA possède un nom court, une icône Falcons adaptée aux téléphones, un lancement vers le kiosque et des couleurs cohérentes avec le thème. L'installation ne signifie pas que les achats fonctionnent hors ligne : une absence de réseau affiche un état explicite et empêche de confirmer une consommation ou un paiement. Une mise à jour de la PWA ne doit ni doubler une opération, ni effacer un panier en cours sans avertissement, ni afficher d'anciennes données de compte comme actuelles.

Références de compatibilité consultées le 7 novembre 2026 : [Apple — Transformer un site web en app sur iPhone](https://support.apple.com/fr-ma/guide/iphone/iphea86e5236/ios), [Google — Utiliser des applications Web sur Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=fr).

### 6.7 Liste imprimable des produits du kiosque

Depuis l'administration, le responsable choisit « Imprimer la liste des produits » pour obtenir un aperçu imprimable et un PDF A4. La liste reprend les noms des produits actifs, leur unité de vente, leur prix actuel en CHF et leur catégorie si elle est renseignée. Les produits temporairement indisponibles portent une mention explicite ; les produits désactivés sont exclus.

Le document porte le nom du kiosque Falcons, l'identité visuelle de la section, sa date de génération et un rappel du fonctionnement : enregistrer sa consommation dans l'application avant de prendre ses produits. Il ne contient ni coûts d'achat, ni marges, ni données personnelles. Il reste lisible en noir et blanc, avec une pagination et des en-têtes répétés si nécessaire.

La liste est une photographie du catalogue au moment de l'export ; une modification de prix nécessite une nouvelle impression. Il s'agit d'une liste des produits proposés, pas d'un inventaire chiffré ni d'une nouvelle feuille de croix. Aucune quantité de stock supposée ne doit apparaître alors que la V1 ne suit pas l'inventaire.

### 6.8 Affiche PDF avec QR code d'accès

Le responsable dispose d'une action distincte « Télécharger l'affiche QR ». Elle génère un PDF A4 portant l'identité Falcons, un grand QR code contrasté, l'adresse web lisible et une consigne courte : « Scanne, rejoins les Falcons et enregistre ce que tu prends ». Un rappel indique qu'on peut ajouter l'application à l'écran d'accueil.

Le QR code encode l'URL HTTPS publique et stable du kiosque. Il ouvre l'accueil ou l'inscription pour une personne non connectée, et le kiosque pour une personne déjà connectée. Il ne contient ni identifiant personnel, ni mot de passe, ni session administrative, et n'accorde aucun droit à lui seul. Si un code de section est retenu plus tard, l'inscription continue à le demander après le scan.

Ce QR code donne accès au site ; ce n'est pas un QR code de paiement TWINT. Le PDF n'est générable avec une destination réelle qu'une fois l'adresse de déploiement configurée ; aucun lien fictif ne doit être fourni comme affiche utilisable. Le document conserve une marge blanche autour du QR code et reste scannable après impression en noir et blanc. Un changement de domaine impose de conserver une redirection ou de réimprimer les affiches.

### 6.9 Identité Falcons : militaire, éclaireurs et famille

La personnalisation de la V1 est un thème Falcons cohérent, pas un éditeur de thèmes. Le demandeur a rejeté la première direction vintage forêt/olive/laiton et écussons brodés comme trop ancienne, puis la seconde direction cobalt/pistache et stickers comme trop enfantine. Ses deux références explicites fixent une interface tactique contemporaine et mature : noir/anthracite, accents verts, typographie technique, panneaux structurés et détails cartographiques ou filaires discrets. L'identité Falcons et la famille d'éclaireurs restent centrales. Les références gouvernent le langage visuel, sans ajouter de radar, d'opérations militaires, de marketplace ou de fonctions d'IA au kiosque. Les maquettes adaptées restent soumises à validation. Aucun emblème officiel n'a été fourni.

Le ton exprime la camaraderie et l'appartenance à une famille d'éclaireurs. Des noms comme « Le Nid » pour l'accueil et « Ravitaillement » pour le catalogue peuvent être proposés, mais les actions essentielles restent explicites : « Ajouter à mon ardoise », « Mon solde », « Paiement reçu ». Les rangs des classements et badges ne se confondent pas avec le grade militaire déclaré dans le profil.

Le thème couvre l'application mobile, l'administration, l'icône PWA, les badges, la liste imprimable et l'affiche QR. Les textures et motifs ne doivent pas réduire la lisibilité des prix ou des erreurs ; les statuts ne reposent pas uniquement sur la couleur. Les animations de succès restent brèves, facultatives et compatibles avec la réduction des mouvements.

### 6.10 Adjudant Piller : commentaire écrit et voix

Dans l'administration, un interrupteur nommé exactement « Activer Adjudant Piller » active ou désactive le personnage pour le kiosque. Le réglage est conservé ; sa valeur initiale proposée est désactivé. Il ne change ni le montant d'une consommation ni son enregistrement.

Quand le mode est actif, chaque achat confirmé produit une seule réplique : le même texte apparaît à l'écran et est prononcé en parallèle avec une voix synthétique de personnage. L'utilisateur peut couper le son localement sans perdre le commentaire écrit. Si la lecture sonore ne peut pas démarrer, le commentaire s'affiche quand même et un bouton « Écouter » permet de le lancer. La confirmation d'achat, le montant et l'accès au kiosque restent disponibles sans attendre la fin de la réplique.

Le déclencheur est la confirmation d'un panier complet, pas chaque unité ni chaque ligne. Un panier de trois produits donne une réplique. Un double appui, un rafraîchissement ou la reprise d'une requête ne doit pas créer plusieurs répliques pour le même achat. Une erreur, une annulation, un ancien achat consulté ou un paiement enregistré ne déclenche pas le personnage.

La réplique est choisie dans une liste préparée pour le projet, avec une rotation évitant de répéter immédiatement la même. Aucune génération de texte par IA à chaque achat n'est nécessaire. La phrase est choisie une seule fois pour l'événement ; le texte et l'audio correspondent exactement. La synthèse sonore et sa disponibilité ne doivent jamais bloquer la confirmation d'achat.

Les répliques ne nécessitent aucune information personnelle ni lecture du téléphone ou des dettes des autres. Elles sont visibles par l'acheteur sur sa confirmation. Les règles de sélection et les phrases ci-dessous sont une première proposition à ajuster avec la section.

#### Première liste de répliques proposée

1. « Encore toi ? Le frigo n'est pas ton paquetage personnel, espèce de rapace. »
2. « Achat confirmé. Ta discipline, elle, est toujours portée disparue. »
3. « T'as reconnu le chemin du kiosque. Pour le reste, j'ai des doutes. »
4. « Une vraie mission de reconnaissance : repérer les snacks et les faire disparaître. »
5. « Bravo, champion. L'ennemi peut attendre, ta canette beaucoup moins. »
6. « T'es pas un Falcon, t'es un distributeur automatique à l'envers. »
7. « À ce rythme, on va te nommer responsable des opérations sur le frigo. »
8. « Le camouflage, c'est pour le terrain. Ton passage au kiosque, tout le monde l'a vu. »
9. « Encore un ravitaillement ? Ta logistique a plus d'activité que ta section. »
10. « Belle initiative, guignol. Dommage qu'elle concerne encore le kiosque. »
11. « J'ai demandé des éclaireurs, pas des prospecteurs de chips. »
12. « Le panier est validé. Pour ton jugement, on attendra les renforts. »
13. « T'as sécurisé la dernière canette. La nation te remercie, abruti. »
14. « Même ton ombre en a marre de te suivre jusqu'au frigo. »
15. « Rapport de mission : zéro discrétion, un achat, aucune surprise. »
16. « Tu connais mieux ces prix que les consignes, petit malin. »
17. « Ravitaillement autorisé. Parade de victoire refusée. »
18. « Bravo, soldat. Le kiosque tient debout grâce à tes brillantes décisions. »
19. « Encore une manœuvre parfaitement exécutée entre toi et le rayon snacks. »
20. « Tu peux rompre. Et lâcher ce regard amoureux au frigo. »

## 7. Prix et calculs

### Prix de vente proposés

- Paramètre général de majoration, initialement à 0 % tant que le responsable ne l'a pas renseigné.
- Pour chaque produit : mode automatique ou prix manuel.
- En automatique : prix = coût de référence unitaire × (1 + majoration / 100), puis arrondi au multiple de CHF 0.05 le plus proche.
- En manuel : le responsable définit directement le prix en CHF, à deux décimales.
- Le coût de référence est le coût unitaire du dernier achat enregistré à la date de la consommation, ou celui renseigné au lancement en l'absence d'achat. Un achat antidaté n'altère pas les coûts des consommations déjà confirmées.
- Un produit sans coût de référence ne peut pas utiliser le mode automatique ; un prix manuel permet de le mettre en vente.
- À chaque nouvel achat ou modification de majoration, l'application propose les nouveaux prix automatiques et les applique seulement après confirmation du responsable.

Exemple : un pack de 24 canettes coûte CHF 24, soit CHF 1 par canette. Une majoration de 30 % propose un prix de CHF 1.30. La marge brute est alors CHF 0.30 par canette ; le taux de marge sur le chiffre d'affaires vaut environ 23.1 %. Une majoration de 30 % ne signifie donc pas une marge de 30 % sur le prix de vente.

Les consommations gardent définitivement le prix de vente et le coût de référence attribués au moment de leur enregistrement. Une modification de prix ne réévalue jamais les anciennes dettes.

### Précision du suivi de marge

La marge est estimée à partir du coût de référence figé de chaque consommation. Elle ne constitue pas une valorisation comptable exacte des lots lorsque plusieurs achats à des coûts différents coexistent. Un inventaire avec coût moyen pondéré pourrait être ajouté ultérieurement si cette précision devient nécessaire.

Une vente en prix manuel sans coût connu reste possible, mais sa marge est indiquée comme inconnue. Le tableau de bord affiche le nombre et le montant des ventes concernées et présente la marge uniquement sur les ventes dont le coût est renseigné. Un coût inconnu ne vaut jamais zéro. La complétion ultérieure de ce coût doit être une action administrative explicite et tracée.

Une erreur d'achat se corrige avec motif et historique ; elle met à jour les dépenses de la période concernée et le coût de référence pour les prochaines consommations, sans réécriture silencieuse des marges antérieures.

### Fiabilité des montants

Les prix, dettes et règlements sont exacts au centime ; pas d'erreur d'arrondi liée à des calculs binaires. Les coûts unitaires peuvent conserver une précision supérieure au centime pour les lots. Les coûts estimés sont agrégés avant arrondi des indicateurs affichés.

## 8. Tableau de bord du responsable

Le tableau de bord propose une période, avec la semaine courante par défaut, et distingue :

| Indicateur | Définition |
|---|---|
| Ventes enregistrées | Valeur des consommations confirmées, nette de leurs corrections. |
| Coût estimé des produits vendus | Coûts de référence attribués aux unités consommées pendant la période. |
| Marge brute estimée | Ventes dont le coût est connu moins leur coût de référence ; couverture du calcul affichée. |
| Achats | Montants dépensés pour les réapprovisionnements pendant la période. |
| Encaissements | Paiements réellement reçus et enregistrés pendant la période, nets des annulations ; remboursements présentés séparément. |
| Variation de trésorerie suivie | Encaissements moins remboursements, achats et autres dépenses saisies. |
| Montant restant à recevoir | Total des dettes actuelles à la date de consultation, toutes semaines confondues. |
| Avoirs à utiliser ou rembourser | Total des crédits exceptionnels créés par des corrections après règlement. |

Une saisie simple des autres dépenses, avec montant, date et motif, est proposée pour tenir compte d'un coût du kiosque non lié à un produit. Si elle est retenue, ces dépenses affectent la trésorerie suivie, pas la marge brute des ventes.

L'interface ne présente pas la marge brute estimée comme un bénéfice net. Acheter du stock consomme de la trésorerie avant que les produits soient vendus ; une vente à crédit produit une créance avant encaissement. Les indicateurs doivent rester compréhensibles dans ces deux situations. Le résultat exact après inventaire et pertes reste hors périmètre de cette première version.

Exemple : achat de 24 canettes à CHF 24 ; vente de 10 canettes à CHF 1.30 ; aucun règlement reçu. Ventes : CHF 13 ; coût estimé vendu : CHF 10 ; marge brute estimée : CHF 3 ; dette : CHF 13 ; variation de trésorerie suivie : −CHF 24. Les 14 canettes physiquement restantes expliquent pourquoi marge et trésorerie diffèrent ; la V1 ne tient pas d'inventaire de ces unités.

## 9. Données à conserver

| Élément | Données essentielles |
|---|---|
| Compte | Identifiant stable, grade, nom, téléphone normalisé, rôle, statut, dates. |
| Produit | Identifiant stable, nom, unité, catégorie, indicateur boisson, mode de prix, prix actif, disponibilité. |
| Achat | Produit, quantité, coût total, date, auteur. |
| Consommation | Personne, date, lignes produit/quantité, indicateur boisson au moment de l'achat, prix et coûts figés, identifiant empêchant les doublons. |
| Paiement ou remboursement | Personne, type, montant, date effective, moyen, administrateur ayant confirmé. |
| Ajustement | Opération concernée, quantité ou montant, motif, auteur, date. |
| Dépense complémentaire proposée | Montant, date, motif, auteur. |
| Succès | Type, personne, période éventuelle, règle d'éligibilité et état recalculable après correction. |
| Paramètres | Majoration générale, règle d'arrondi, fuseau, identité Falcons, URL publique canonique du kiosque. |
| Adjudant Piller | Activation globale, liste de répliques avec identifiants stables et préférence sonore locale ; réplique associée à la confirmation d'achat pour éviter les doublons. |

Un changement de nom de produit ou de personne ne casse pas les liens historiques. Un compte désactivé ne peut plus consommer ; sa dette et son historique restent accessibles au responsable. La durée de conservation et la procédure de suppression des données personnelles seront fixées avant mise en service.

## 10. Périmètre de la première version

### Nécessaire au besoin confirmé

- Inscription autonome, connexion, profil avec grade, nom et téléphone.
- Catalogue géré par l'administrateur et saisie des consommations.
- Solde et historique personnels.
- Liste administrative des dettes avec coordonnées.
- Enregistrement manuel et traçable des règlements reçus.
- Saisie des achats et coûts ; calcul des prix et suivi de la marge.
- Succès et classements Falcons : boissons de la semaine et contributions mesurées par les montants d'achats.
- Thème militaire Falcons, éclaireurs et famille, décliné sur les écrans et les documents.
- Installation facultative en PWA sur téléphone, avec aide adaptée à iPhone et Android.
- Liste des produits imprimable et téléchargeable en PDF A4 depuis l'administration.
- Affiche PDF A4 avec QR code d'accès et adresse lisible du kiosque.
- Mode « Activer Adjudant Piller » : réplique écrite et parlée après chaque panier confirmé, liste préétablie et son désactivable sur le téléphone.

### Compléments proposés pour une V1 exploitable

- Prix automatique avec dérogation manuelle.
- Paiements partiels, corrections et annulations tracées.
- Traitement des avoirs et remboursements exceptionnels après correction.
- Export CSV des comptes, consommations, achats et paiements.
- Sauvegarde et procédure de récupération.
- Autres dépenses du kiosque, si l'objectif de trésorerie le justifie.

### Hors périmètre

- Paiement ou demande TWINT automatique, consultation du compte TWINT ou validation bancaire.
- Compte invité, panier anonyme ou inscription soumise à approbation.
- Ouverture électronique du frigo, prévention physique des vols et matériel de caisse.
- Application native obligatoire, SMS payants et achats hors connexion.
- Multi-section, abonnements, récompenses financières de fidélité, promotions et comptabilité fiscale complète.
- Facturation automatique, notifications externes et envoi automatique de messages.
- Portefeuille prépayé et avances volontaires ; un avoir correctif reste possible.
- Inventaire détaillé, alertes automatiques de stock et valorisation comptable des lots.
- Génération d'une liste de courses et gestion des fournisseurs ; la V1 enregistre les achats effectués.
- Éditeur de thèmes, moteur de succès personnalisables et notifications de classement.
- Génération de répliques par IA en temps réel et clonage d'une voix réelle ; la V1 utilise une liste de phrases et une voix de personnage.

## 11. Exigences de qualité et d'exploitation

- Interface pensée d'abord pour le téléphone, avec boutons faciles à toucher et montants explicites.
- Français dans la V1 ; d'autres langues pourront être ajoutées ensuite.
- Contrôle des droits côté serveur. Le simple fait de posséder le QR code ne donne accès ni aux téléphones ni aux ardoises des autres. Seuls les agrégats sociaux prévus pour les classements sont partagés entre membres connectés.
- Déploiement HTTPS et ressources PWA cohérentes ; les caches et la déconnexion ne doivent pas exposer les données d'un autre utilisateur sur le même appareil.
- Export PDF lisible en A4, en couleur et en noir et blanc, sans contenu coupé ni QR code altéré par la décoration.
- Enregistrements cohérents même si plusieurs utilisateurs confirment simultanément ou si deux administrateurs valident un règlement. Deux validations du même solde ne créent pas un double encaissement.
- Sauvegarde quotidienne et export à la demande, avec restauration vérifiée avant le pilote. Objectif proposé : perte maximale de 24 heures d'activité en cas de sinistre ; ce compromis reste à confirmer.
- Aucun frais logiciel proportionnel au nombre de membres. Hébergement, domaine et maintenance peuvent avoir un coût : budget à choisir avant déploiement.
- L'application ne requiert aucune donnée opérationnelle militaire. Elle stocke uniquement les informations nécessaires au kiosque et à ses comptes.
- Hébergement, accès aux sauvegardes, durée de conservation et transfert du rôle de responsable documentés avant mise en service.

## 12. Critères d'acceptation

1. Une personne s'inscrit avec grade, nom et téléphone puis peut consommer immédiatement, sans action administrative.
2. Un numéro déjà utilisé ne produit pas un second compte ; la récupération d'accès ne nécessite pas de nouveau compte.
3. Un compte utilisateur ne peut ni devenir administrateur par inscription ni consulter les téléphones des autres.
4. Deux unités à CHF 2.50 créent une dette de CHF 5, visible dans l'historique personnel et dans la vue administrative.
5. Une double soumission du même achat ne crée qu'une consommation.
6. Un échec réseau ne produit jamais une fausse confirmation ; une reprise ne duplique pas l'opération.
7. Un changement de tarif laisse intact le prix d'une consommation antérieure.
8. Un achat de 24 unités pour CHF 24 avec 30 % de majoration propose CHF 1.30 par unité ; un prix manuel peut le remplacer si ce mode est confirmé.
9. Une modification du pourcentage ou du coût ne publie de nouveaux prix qu'après confirmation du responsable.
10. La réception de CHF 20 sur un solde de CHF 23 laisse CHF 3 à payer ; elle ne remet pas le compte à zéro.
11. Le vendredi ou le changement de semaine ne supprime aucune dette.
12. L'annulation d'un paiement rétablit la dette et garde une trace de l'erreur et de son auteur.
13. La correction d'une consommation rétablit les montants correspondants sans supprimer l'enregistrement d'origine ; après paiement, elle crée un avoir utilisable ou remboursable et traçable.
14. L'exemple de 24 canettes du tableau de bord produit les valeurs indiquées pour ventes, marge estimée, dette et trésorerie.
15. Une vente sans coût connu ne crée pas une marge artificielle ; l'absence de coût est signalée et n'empêche pas une consommation à prix manuel.
16. Désactiver un produit ou un ancien membre conserve les opérations et les montants dus.
17. Un export permet de retrouver les soldes, les opérations et les paiements ; une restauration conserve ces informations et les droits d'accès.
18. Le pilote permet au moins 60 comptes ; la validation de capacité proposée couvre 100 comptes et 10 confirmations simultanées.
19. Trois boissons et deux snacks donnent trois unités au classement des buveurs ; les cinq produits contribuent au montant des achats.
20. CHF 12 d'achats comptent dans la semaine de consommation, même s'ils sont réglés la semaine suivante ; un paiement ne double pas la contribution.
21. Deux membres à égalité occupent le même rang et partagent un badge de vainqueur ; une semaine vide n'attribue aucun vainqueur.
22. Le passage au lundi, y compris lors d'un changement d'heure, délimite correctement la semaine Europe/Zurich ; les ardoises restent intactes.
23. La correction d'une consommation recalcule le classement et les badges de la période concernée. Les anciens badges restent consultables tant que leurs conditions restent remplies.
24. Les classements exigent une connexion et ne révèlent ni téléphones, ni dettes, ni historique détaillé d'un autre membre.
25. Sur un iPhone avec Safari et un Android avec Chrome de référence, l'utilisateur peut ajouter la PWA à son écran d'accueil et l'ouvrir avec l'icône Falcons. Le site reste entièrement utilisable sans installation.
26. Une PWA sans réseau explique l'indisponibilité et ne confirme aucune consommation ou aucun paiement fictif. Une mise à jour ne duplique pas d'opération.
27. Le PDF de produits reproduit les prix actuels, les unités et les indisponibilités, sans coûts, marges ou données personnelles ; une liste longue reste lisible sur plusieurs pages A4.
28. L'affiche PDF générée encode l'URL réelle du kiosque ; après impression A4 en noir et blanc, elle est scannée avec succès sur iPhone et Android. L'URL lisible fonctionne aussi sans scan.
29. L'affiche et le catalogue imprimé partagent l'identité Falcons, conservent leur lisibilité et ne permettent aucun accès administratif.
30. Lorsque « Activer Adjudant Piller » est désactivé, aucun commentaire ni son n'est déclenché par un achat.
31. Lorsque le mode est actif, un panier confirmé produit une seule réplique écrite et la lecture du même texte ; le mode muet conserve le commentaire visible.
32. Une erreur, une nouvelle soumission de la même opération, une consultation d'historique ou un règlement ne déclenche pas de réplique supplémentaire.
33. Une lecture sonore bloquée propose « Écouter » sans empêcher l'achat ; un échec audio n'annule ni ne masque sa confirmation.

## 13. Points à confirmer avant de figer le PRD

Le besoin principal est défini. Les décisions suivantes peuvent modifier la simplicité d'usage ou le périmètre :

1. Accès : conserve-t-on l'inscription par simple lien du kiosque, avec téléphone et mot de passe, ou souhaite-t-on un code de section partagé pour limiter les inscriptions ? Aucune option ne nécessite d'approbation individuelle.
2. Prix : retient-on la combinaison proposée — majoration générale et prix manuel par produit — ainsi que l'arrondi automatique à CHF 0.05 ?
3. Précision financière : une marge brute estimée au coût de référence suffit-elle au départ, ou faut-il un inventaire et une valorisation plus précise dès la V1 ? La proposition actuelle conserve le suivi simple.
4. Autres dépenses : veut-on les saisir dès la V1 pour expliquer la trésorerie, ou commencer uniquement par les achats de produits ?

Les règles détaillées des succès sont proposées dans la section 6.5 ; le choix du montant des achats pour les contributions est confirmé. Le dessin de l'emblème, les couleurs exactes et les noms définitifs des badges seront fixés à la conception visuelle, sans bloquer la relecture fonctionnelle. La « liste imprimable des trucs du kiosque » est interprétée comme le catalogue avec prix ; un inventaire avec quantités constituerait une extension distincte.

Avant le déploiement, il faudra également décider qui détient les accès d'hébergement, qui reprend la gestion au changement de responsable, le budget acceptable et la durée de conservation des données. Ces points n'empêchent pas de relire les parcours métier.

## 14. Ce qui reste au concepteur technique

L'hébergement Vercel est confirmé. Choisir la pile technique compatible, la base de données, la stratégie de session, les détails de sauvegarde et de restauration, et la réalisation de la voix de personnage. La direction UI/UX sera soumise au demandeur sous forme d'une moodboard et d'un ou deux écrans avant de développer l'application. Ces choix doivent respecter les règles d'accès, de calcul, de conservation et de non-duplication définies ici.

Ce document est un PRD de cadrage. Il ne vaut ni approbation de tous les choix proposés ni démarrage du développement.
