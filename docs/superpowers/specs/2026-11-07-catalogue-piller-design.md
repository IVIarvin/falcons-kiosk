# Catalogue enrichi et Adjudant Piller

Direction validée dans le chat le 7 novembre 2026 : recherche produit et saisie libre, caractéristiques corrigeables, répliques vraiment assassines.

## Approches

La saisie manuelle seule laisse toutes les images et caractéristiques au responsable. La dépendance exclusive à une base externe bloque les références absentes. La formule hybride retenue propose des références Open Food Facts, puis laisse le responsable choisir, vérifier et modifier avant enregistrement.

## Parcours et contraintes

- Recherche explicite par nom ou code-barres depuis le formulaire existant ; aucun appel à chaque frappe. Photo, nom, marque et format pour distinguer les variantes.
- Sélection d'une référence : récupération de la fiche complète et préremplissage du nom, format, catégorie, image et caractéristiques. Prix et coût restent administratifs.
- Saisie libre toujours possible, y compris en cas de panne de la base. Image HTTPS ou image locale existante, aperçu et remplacement possibles.
- Type, sucre, alcool et caféine distincts ; valeur inconnue explicite. Ne pas déduire une variante depuis son seul nom. Une bière sans alcool ne déclenche pas une pique sur l'alcool.
- Source et attribution Open Food Facts visibles avec les images importées. Données conservées dans notre catalogue ; aucun appel externe pendant un achat.
- Recherche réservée aux responsables, délais bornés, cache et limitation des appels externes. Pas de nouvelle dépendance.
- Banque éditoriale de répliques courtes et très cinglantes : adjudant bougon, langage cru, mépris théâtral des habitudes de ravitaillement. Sélection contextuelle à partir des caractéristiques vérifiées du panier, sinon répliques générales.
- Identifiants historiques conservés, pas de répétition immédiate, même réplique en cas de reprise de confirmation. Texte et voix utilisent la même banque. Consultation de la banque et essais dans l'administration.
- Garder les comptes, prix, ardoises et direction tactique actuels.

## Choix d'implémentation

Next.js et PostgreSQL existants. Caractéristiques et provenance en JSONB, migration additive réexécutable et sauvegardes compatibles avec les anciens exports. Search-a-licious pour la recherche textuelle et lecture Open Food Facts par code pour la fiche complète. Les limites externes sont appliquées côté serveur ; les erreurs proposent de poursuivre manuellement.
