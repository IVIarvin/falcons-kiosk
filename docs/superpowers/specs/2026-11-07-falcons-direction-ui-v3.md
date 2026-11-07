# Falcons — direction tactique contemporaine v3

Statut : VALIDÉE explicitement par le demandeur le 7 novembre 2026 : « c'est beaucoup mieux je valide ». La moodboard, le kiosque mobile et l'administration v3 constituent les références visuelles approuvées. Les directions v1 et v2 sont rejetées.

## Autorité visuelle

Les deux images du demandeur sont conservées dans docs/design/references : tactical-dashboard.png et tactical-community.png. Elles sont des références de style, pas des spécifications fonctionnelles ni des preuves d'une interface Falcons existante.

Le premier visuel établit des fonds noirs, des panneaux anthracite, des traits fins, une information structurée, des accents verts et une illustration technique filaire. Le second ajoute une identité militaire contemporaine, une typographie géométrique affirmée, des bordures précises et la notion de communauté.

Ces références explicites priment sur un nouveau tirage de concepts. La proposition adapte directement ce langage au catalogue, aux ardoises et à l'administration du kiosque.

## Langage proposé

- Fond noir vert #090D0B, panneaux #171E19 et lignes #303D33.
- Texte clair #E6EDE7, secondaire gris vert suffisamment contrasté et accent #8FE781.
- Typographie technique géométrique ; chiffres tabulaires pour les prix, une monospace uniquement pour les données qui le justifient.
- Géométrie sobre : panneaux à faible rayon, séparateurs fins, boutons verts francs et états de sélection visibles.
- Symbole original de faucon, graphique ou filaire, sans écusson brodé ni mascotte cartoon.
- Topographie uniquement dans les zones de marque ; pas de motif derrière les prix, de faux radar, de fausse télémétrie ou de carte opérationnelle.
- Succès présentés comme distinctions numériques sobres, cohérentes avec la section.

## Moodboard et deux écrans

### Moodboard

Identité FALCONS, palette noire/verte, specimens typographiques et de composants, symbole de faucon technique, détails topographiques et trois distinctions sobres. Elle ne présente aucun portrait comme un vrai membre ni aucun insigne comme officiel.

### Kiosque mobile

Catalogue accessible directement, prix et quantités lisibles, catégories boissons et snacks, produits photographiés, sélection et confirmation au premier plan. La vue proposée peut montrer la confirmation d'un panier et son commentaire Piller : texte lisible, lecture audio parallèle et commande de son. Le compte et les montants sont des données de démonstration.

### Administration

Une navigation compacte donne accès aux ardoises, produits, achats, documents et réglages. La table reste l'outil principal : grade, nom, téléphone et dette. Un panneau latéral présente le réglage et un exemple de commentaire Piller ; il ne représente pas un assistant IA génératif. Le catalogue PDF et l'affiche QR restent accessibles. Les dettes représentent tous les impayés, indépendamment de la semaine.

## Principes d'usage

L'esthétique reste subordonnée aux vrais gestes : choisir, confirmer, consulter son solde et constater un paiement reçu. Les libellés restent compréhensibles, les cibles tactiles confortables et le contraste vérifiable au développement. Le thème sombre doit aussi être testé sur un téléphone en éclairage fort.

Les images de référence ne justifient ni une page marketing avec soldats, ni de nouvelles fonctions opérationnelles. Vercel, le PRD métier, les inscriptions autonomes et les paiements TWINT externes restent le cadre.

## Validation reçue et traduction en interface

La direction noire/anthracite et verte, la géométrie technique et les deux compositions sont approuvées. Conserver leurs hiérarchies pendant la traduction en composants accessibles et adaptatifs. Les textes et boutons doivent rester du vrai HTML ; les données de démonstration des images ne deviennent pas des données de production. Les variations de logo entre les images seront unifiées autour du symbole F/faucon de la moodboard.

Les visuels sont des maquettes générées avec ImageGen, pas une application fonctionnelle. Fichiers approuvés : falcons-v3-moodboard.png, falcons-v3-mobile.png et falcons-v3-admin.png dans .impeccable/mocks/decision ; prompts conservés à côté.
