# Direction UI/UX Falcons — proposition à valider

Statut : REJETÉE par le demandeur le 7 novembre 2026 : trop ancienne, trop « legacy », pas assez moderne / millennial / Gen Z. Cette proposition est conservée uniquement comme historique ; elle ne fait pas autorité pour le développement. Aucun code applicatif commencé. Voir 2026-11-07-falcons-direction-ui-v2.md pour la nouvelle proposition.

## Brief

Une application web mobile pour enregistrer ce qu'on prend au kiosque, et une administration utilisable sur ordinateur pour régler les ardoises, gérer les produits et imprimer. Le téléphone est utilisé debout devant un frigo ; l'administration demande plus de densité pour comparer une soixantaine de comptes.

Le demandeur a fixé Vercel comme hébergement et souhaite une moodboard et un ou deux écrans avant le développement. Les visuels utilisent des membres, prix, produits et soldes fictifs explicitement présentés comme données de démonstration. Aucun écusson officiel n'a été fourni.

## Directions étudiées

Sept sources proches de la culture de la section ont été étudiées, chacune applicable au catalogue, aux ardoises et aux documents :

1. Foyer des Falcons : esprit de club de section, écussons et tables franches ; chaleureux, mais proche des applications de club habituelles.
2. Carnet de service : papier de registre, cases et confirmations estampillées ; très lisible pour la comptabilité, moins incarné pour les produits.
3. Carte de reconnaissance : légendes, relief et catégories comme repères ; reconnaissance immédiate des éclaireurs, mais un fond cartographique risque de distraire.
4. Caisse de ravitaillement : étiquettes de matériel, contraste forêt et surfaces claires, lignes de produits avec prix à droite ; le panier devient un bordereau de prélèvement clair.
5. Tableau de section : nom, grade et ardoise dans des rangées structurées ; solide en administration, plus austère au quotidien.
6. Album d'écussons : les succès comme collection visuelle ; fort pour la famille mais risque de donner la priorité aux classements plutôt qu'aux achats.
7. Signalétique de terrain : hiérarchie des panneaux, icônes directionnelles et gros chiffres utiles ; rapide, mais moins personnel.

La proposition présentée est « Caisse de ravitaillement », sous le nom visible « Ravitaillement Falcons ». Le tirage Impeccable de cette session a donné l'index 4, clé 5dc05312 ; ce mécanisme ne vaut pas approbation utilisateur.

## Références alternatives et arbitrages

L'appel Impeccable a également proposé six systèmes extérieurs. Ils ne sont pas retenus comme directions complètes car ils identifient moins clairement la famille d'éclaireurs et compliquent le geste d'achat. Leur discipline utile renforce la proposition :

- Tableau de gare à palettes : retenir la stabilité des colonnes et des totaux pendant une mise à jour.
- Notation de danse : retenir une hiérarchie de lecture claire, sans transformer les achats en symboles à apprendre.
- Site logiciel monochrome : retenir la preuve directe de chaque état, sans parcours marketing dans une application utilitaire.
- Carte d'embarquement : retenir le récapitulatif segmenté produit / quantité / total, sans identité de voyageur.
- Plan de métro : retenir la hiérarchie de catégories et le repérage constant, sans graphe à parcourir pour acheter.
- Catalogue vidéo : retenir l'identification rapide d'un produit, sans carrousels horizontaux ni informations cachées au survol.

## Proposition visuelle

Palette proposée : forêt #23372B, olive #899468, surface claire #F1F3EC, encre #1B261F et laiton #B68E4D pour les écussons. Sur téléphone, la surface de travail reste claire pour lire les prix sous les éclairages variables du foyer ; le bandeau forêt porte l'identité. L'écran admin reprend le même système avec une navigation plus dense.

Les titres ont un caractère condensé de marquage de ravitaillement, les textes courants une sans-serif simple et les montants des chiffres alignés. La fonte finale sera choisie pour son rendu réel et son hébergement dans le projet, pas déduite d'une image générée.

Le faucon et l'écusson proposés sont des créations de direction artistique, pas un insigne officiel de la section. Le camouflage reste une matière de moodboard, sans remplir les tables ou gêner les prix.

## Écran membre : acheter en quelques gestes

- Accès direct au catalogue « Ravitaillement », sans page marketing préalable.
- Identité Falcons en haut ; accès secondaire à son ardoise et à sa famille.
- Produits regroupés en boissons et snacks, nom et format visibles, prix aligné, boutons de quantité accessibles.
- Récapitulatif de la sélection et action « Ajouter à mon ardoise » au bas du parcours.
- Confirmation lisible : achat, montant et nouveau solde. Si Piller est actif, sa phrase apparaît et est lue ; elle reste secondaire à la confirmation et le son peut être coupé.
- Navigation proposée : Kiosque, Ardoise, Falcons, Profil. Les badges et classements sont dans Falcons.

## Écran admin : régler le vendredi

- Rubriques : Règlements, Produits, Achats, Documents, Réglages.
- Vue principale des débiteurs avec grade, nom, téléphone, montant et action de règlement ; recherche utile pour au moins 60 membres.
- Un paiement exige une confirmation de la personne et du montant. L'interface n'indique aucun paiement TWINT automatique.
- Raccourcis vers le catalogue imprimable et l'affiche QR, tous deux générés à partir des données configurées.
- Interrupteur « Activer Adjudant Piller » dans les réglages, accompagné de la règle « commentaire écrit + voix après l'achat ». Le réglage sonore propre au téléphone reste indépendant.

## États à conserver au développement

Catalogue vide ou indisponible, panier vide ou sélectionné, confirmation en cours, succès, erreur réseau sans fausse confirmation, prix modifié, inscription autonome, compte déjà existant, aucun classement, égalités, paiements partiels et correction après paiement. La voix n'est pas une condition de réussite d'un achat.

## Validation attendue

Valider ou corriger l'identité forêt/olive, le caractère de l'écusson, la densité du catalogue mobile et celle des règlements admin. La moodboard et les deux écrans ne sont pas une application fonctionnelle. Ils n'approuvent pas encore une technologie de base de données ni une mise en production.
