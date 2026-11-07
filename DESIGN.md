---
name: Kiosque Falcons
description: Interface tactique contemporaine et mature pour la famille Falcons.
colors:
  bg: "#090d0b"
  panel: "#171e19"
  panel-raised: "#1d2720"
  line: "#303d33"
  text: "#e6ede7"
  muted: "#a2afa4"
  accent: "#8fe781"
  accent-ink: "#101a10"
  danger: "#f2a79b"
  accent-hover: "#adf49f"
  accent-wash: "#8fe7810a"
  input-bg: "#0d140f"
  input-line: "#415046"
  placeholder: "#89988d"
  status-line: "#496147"
typography:
  display:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.015em"
  headline:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "15px"
    fontWeight: 500
  category:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  status:
    fontFamily: "Barlow, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  price:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "28px"
    fontWeight: 600
  small:
    fontFamily: "Barlow, sans-serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  panel: "5px"
  control-small: "4px"
  status: "3px"
  dialog: "8px"
  switch: "20px"
  circle: "50%"
spacing:
  4: "4px"
  8: "8px"
  10: "10px"
  12: "12px"
  14: "14px"
  16: "16px"
  18: "18px"
  20: "20px"
  22: "22px"
  24: "24px"
  28: "28px"
  32: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.panel}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "11px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.accent-wash}"
  input:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "10px 12px"
  category:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.category}"
    rounded: "{rounded.panel}"
    padding: "10px 16px"
  category-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
  status:
    textColor: "{colors.muted}"
    typography: "{typography.status}"
    rounded: "{rounded.status}"
    padding: "3px 7px"
  status-positive:
    textColor: "{colors.accent}"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "28px"
  navigation-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.panel}"
    padding: "10px 12px"
  add-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control-small}"
    height: "44px"
    width: "44px"
---

# Design System: Kiosque Falcons

## Overview

**Creative North Star: "Interface tactique contemporaine"**

Falcons associe un noir teinté de vert, des panneaux anthracite et un vert lumineux à une typographie technique. Le résultat est mature, précis et sobre : une identité de section et de famille lisible dans la marque F/faucon, les montants alignés et les panneaux structurés.

Les détails topographiques et filaires restent mesurés. Les photos de produits conservent leur silhouette réelle ; les symboles et les contrôles servent la lecture. Les directions vintage forêt/olive/laiton et enfantine cobalt/pistache, stickers ou avatar cartoon ont été rejetées. Le faucon proposé est une identité d'application, sans statut d'emblème officiel.

**Key Characteristics:**

- Noir vert et anthracite, contrastés par un seul accent vert lumineux.
- Titres Rajdhani techniques et texte Barlow lisible.
- Panneaux bordés, angles courts et montants tabulaires.
- Densité maîtrisée, contrôles HTML et adaptation au téléphone.
- Relief tonal et mouvement bref, avec réduction des mouvements respectée.

## Colors

La palette combine une base forestière presque noire et un accent vert clair réservé à l'action, à la sélection et aux repères utiles.

### Primary

- **Vert Falcons** (`accent`) : actions principales, navigation sélectionnée, icônes utiles, focus et états positifs.
- **Encre du vert** (`accent-ink`) : texte sombre sur les fonds d'accent.
- **Vert éclairci** (`accent-hover`) : survol des boutons principaux.
- **Voile vert** (`accent-wash`) : survol des boutons secondaires, avec bordure d'accent.

### Secondary

- **Alerte saumon** (`danger`) : erreurs et messages critiques, accompagnés d'un texte explicite.

### Neutral

- **Noir vert** (`bg`) : fond général et espace de respiration.
- **Anthracite de panneau** (`panel`) et **anthracite relevé** (`panel-raised`) : surfaces et survol de résultats.
- **Séparateur vert gris** (`line`) : frontières et divisions à un pixel.
- **Blanc végétal** (`text`) : texte principal ; **gris sauge** (`muted`) : informations secondaires.
- **Fond de champ** (`input-bg`), **bord de champ** (`input-line`) et **gris d'indication** (`placeholder`) : contrôles de saisie.
- **Bord positif** (`status-line`) : statuts positifs sans remplissage d'accent.

Les valeurs normatives sont celles du frontmatter ; les dégradés spécialisés sont conservés dans le code et les exemples du sidecar.

## Typography

**Display Font:** Rajdhani, avec sans-serif en secours.
**Body Font:** Barlow, avec sans-serif en secours.

**Character:** Rajdhani apporte la structure technique sans effet de stencil ni imitation militaire ancienne. Barlow assure la lecture des phrases, champs et tableaux. Les poids chargés sont 500/600/700 pour Rajdhani et 400/500/600 pour Barlow.

### Hierarchy

- **Display** : titre principal en capitales, avec la taille fluide du frontmatter. Les titres de page passent à (36px) sous (1000px), puis à (37px) sous (760px). Les titres d'authentification restent en casse naturelle (34px), puis (32px) sur téléphone.
- **Headline** : titre de section ; les noms de produits ont une variante en capitales (24px), puis (21px) sous (760px) et (20px) sous (360px).
- **Title** : sous-titre de panneau et regroupement de contenu.
- **Body** : texte courant ; les paragraphes utilisent une interligne (1.55). Plusieurs textes d'aide sont limités à (65ch), les textes longs à (75ch).
- **Label** : libellé de champ explicite, sans capitalisation forcée. Les catégories utilisent la variante Rajdhani en capitales.
- **Price** : prix de produit ; chiffres tabulaires pour prix, soldes et colonnes numériques, avec alignement à droite dans les tableaux.
- **Small / Status** : aide et métadonnées discrètes ; les statuts restent des mots lisibles et bordés.

## Layout

La coque de bureau est une grille avec navigation latérale (190px), contenu flexible et largeur totale maximale (1800px). La navigation reste en place sur la hauteur visible. Le contenu courant est centré et limité à (960px), avec marges intérieures (40px 38px 64px). Les vues larges utilisent (40px 28px 50px). Les produits et formulaires utilisent deux colonnes égales ; la grille de produits conserve deux colonnes sur téléphone.

Les espacements récurrents du frontmatter sont des valeurs extraites, pas une progression mathématique imposée. Les panneaux utilisent couramment (18–28px) et les grilles (12–22px) d'écart. Les listes et tableaux gardent une lecture par lignes, des séparateurs fins et un défilement horizontal si nécessaire.

- À partir de (1600px), les vues larges gagnent des marges (45px 40px), une colonne annexe (315px) et un écart (30px).
- Sous (1250px), la colonne annexe passe à (250px), les tableaux se resserrent, la colonne téléphone disparaît et les indicateurs financiers passent de trois à deux colonnes.
- Sous (1000px), la grille administrative et le profil passent sur une colonne ; le panneau annexe s'organise provisoirement en deux colonnes internes.
- Sous (760px), la barre latérale laisse place à un en-tête et une navigation fixe basse : quatre entrées pour les membres, six pour l'administration. Le contenu est limité à (660px) et utilise (25px 16px), avec un dégagement bas de `calc(105px + env(safe-area-inset-bottom))`. Les panneaux annexes reviennent en colonne. Les succès deviennent une liste d'une colonne.
- Sous (360px), les marges latérales du contenu passent à (12px), les cartes produits à (11px), les pieds de carte s'empilent et les formulaires passent sur une colonne.

Les boutons standards, catégories et ajouts disposent d'au moins (44px) de hauteur. Sous (760px), les commandes de quantité et de voix ainsi que les boutons compacts des comptes sont relevés à (44px) ; les liens de navigation basse ont (50px) de hauteur minimum. Ces dimensions décrivent les corrections livrées, sans prétendre que chaque contrôle de l'application possède déjà une boîte de (44px) sur ses deux axes.

## Elevation & Depth

La profondeur repose d'abord sur les tons verts, les bordures et quelques dégradés discrets. Les cartes ordinaires restent sans ombre portée. Les ombres sont réservées aux éléments superposés et aux silhouettes des photos, sans ombre décalée dure.

### Shadow Vocabulary

- **Notification** (`0 10px 35px #0006`) : séparer une notification du contenu.
- **Barre flottante** (`0 12px 30px #0007`) : détacher une barre d'action persistante.
- **Dialogue** (`0 20px 90px #0008`) : établir le plan modal ; le fond est obscurci (`#000b`) et flouté (3px).
- **Photo de produit** (`drop-shadow(0 10px 13px #0004)`) : renforcer uniquement la silhouette détourée du produit.

## Shapes

Les angles courts (5px) sont la forme commune des boutons, champs, panneaux et cartes. Les petits contrôles de quantité et d'ajout utilisent (4px), les statuts (3px) et les dialogues (8px). Les avatars sont circulaires ; le commutateur utilise un rail arrondi (20px) et un curseur circulaire. Les bordures ordinaires font (1px). Ces exceptions fonctionnelles ne remplacent pas les panneaux sobres par des capsules.

## Components

### Buttons

Des commandes franches et compactes, avec texte explicite et icônes SVG utiles.

- **Primary:** fond Vert Falcons, texte Encre du vert, remplissage (11px 18px), hauteur minimum (44px), poids (600).
- **Secondary:** fond transparent, texte principal et bordure de séparateur ; survol teinté de vert et bordure d'accent.
- **Compact:** variante Rajdhani en capitales (15px), minimum (38px) sur bureau ; boutons des comptes à (44px) sur téléphone.
- **Icon / text:** bouton icône transparent (40px) avec survol légèrement éclairci ; bouton texte souligné en vert. Les icônes seules portent un nom accessible.
- **States:** focus visible (2px) vert avec décalage (4px), pression déplacée de (1px) vers le bas, désactivation à (0.5) d'opacité et curseur indisponible.

Les transitions de fond, texte et bordure durent (0.2s) avec `cubic-bezier(0.16, 1, 0.3, 1)`. Le chargement tourne en (1.4s) linéaire. Sous `prefers-reduced-motion: reduce`, le défilement devient immédiat et les durées d'animation et de transition passent à (0.01ms) ; le déplacement vers une confirmation respecte aussi cette préférence.

### Chips

Les catégories sont de vrais boutons en groupe, en Rajdhani capitale, bordés et hauts d'au moins (44px). La sélection remplit le bouton de vert avec texte sombre ; `aria-pressed` transmet l'état. Les statuts sont des étiquettes compactes en Barlow, sans comportement de bouton, avec bordure verte et texte vert pour l'état positif.

### Cards / Containers

Les panneaux ont une bordure fine et les angles courts communs. Le panneau de solde utilise le fond de panneau et (28px) de remplissage. Les cartes produits utilisent un dégradé léger (`135deg, #17201966, #171e1940`), un remplissage (18px 20px) et une image contenue dans sa zone, sans recadrage. Les pieds alignent prix et commande, puis se réorganisent quand la largeur diminue. Les confirmations utilisent une bordure d'accent et un dégradé vert sombre.

### Inputs / Fields

Les champs natifs `input`, `select` et `textarea` utilisent le fond sombre dédié, une bordure de champ et les angles communs. La hauteur minimum est (46px), le remplissage (10px 12px) ; les zones de texte commencent à (90px) et restent redimensionnables verticalement. Les libellés sont associés via de vrais éléments `label`, avec aide sous le champ. Le focus suit le contour vert global ; le curseur de saisie est vert. Les erreurs sont écrites en saumon, et ne reposent pas sur une bordure seule.

Les cases à cocher restent natives, avec accent vert. Le commutateur est un `input` de type checkbox avec rôle switch, un rail (46px × 26px) et un curseur (18px), qui se déplace de (20px) à l'état coché. Ces dimensions visuelles ne constituent pas un minimum tactile universel.

### Navigation

Sur bureau, les liens latéraux sont des lignes d'au moins (48px), avec icône SVG, texte Barlow et remplissage (10px 12px). L'actif est rempli de vert avec texte sombre. Sur téléphone, les liens se placent en colonnes dans la barre basse ; Rajdhani en capitales (12px), ou (10px) dans la navigation administrative. L'actif devient vert et reçoit un trait inférieur (30px × 2px), conservant ainsi un repère de forme.

### Dialogues

Les superpositions utilisent un véritable élément `dialog` ouvert en mode modal et nommé par son titre. Leur largeur est `min(620px, calc(100% - 32px))`, leur hauteur est limitée à l'écran et leur contenu défile. Les angles et la profondeur sont ceux du rôle dialogue ; la fermeture reste un bouton HTML nommé.

### Marque et panneau filaire

La marque associe un F/faucon géométrique SVG et le nom Falcons en Rajdhani gras, avec un vert mesuré. Les contours topographiques se limitent aux fonds de navigation et d'authentification. Le panneau filaire emploie une illustration de faucon, un dégradé vert sombre et des divisions fines ; il apporte l'identité sans modifier la grammaire des contrôles.

## Do's and Don'ts

### Do:

- **Do** conserver le noir vert, l'anthracite et le vert Falcons comme vocabulaire principal.
- **Do** employer Rajdhani pour la structure et Barlow pour les textes et les champs.
- **Do** conserver les angles communs de (5px), les bordures fines et les chiffres tabulaires.
- **Do** garder les actions lisibles, les contrôles HTML natifs et un focus visible.
- **Do** préserver les cibles de (44px) des commandes tactiles corrigées et le dégagement de la navigation basse.
- **Do** respecter la réduction des mouvements et accompagner les statuts de texte ou de forme.

### Don't:

- **Don't** revenir aux écussons brodés, au vintage olive/laiton ou à une esthétique militaire ancienne.
- **Don't** remplacer la direction mature par des stickers, des avatars cartoon ou une typographie ronde enfantine.
- **Don't** transformer les panneaux en grandes capsules ou multiplier les ombres décoratives.
- **Don't** présenter le faucon proposé comme un emblème officiel fourni par la section.
- **Don't** hériter des surtitres décoratifs ou du signe « + » décoratif des états vides comme composants d'identité : ces détails présents dans le code ne sont pas canonisés.
