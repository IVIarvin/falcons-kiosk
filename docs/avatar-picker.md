# Choisir son avatar

Dans **Profil → Changer mon avatar**, six propositions sont visibles ensemble. Sélectionner une proposition affiche un aperçu ; **Autres propositions** renouvelle les six choix sans perdre cet aperçu. **Utiliser cet avatar** enregistre le choix, **Annuler** conserve l’avatar précédent.

Pendant l’enregistrement, les boutons et la fermeture sont bloqués pour éviter les doubles requêtes. En cas d’erreur, le message reste dans la fenêtre et l’aperçu est conservé pour réessayer. Le profil affiche toujours l’avatar enregistré.

Contributeurs, Buveurs et contributions depuis le début utilisent le même avatar enregistré. Le rang, le grade, le nom et les scores sont conservés. Sur mobile, le score se place sous le nom pour préserver la lecture des noms longs. Les portraits restent des SVG locaux ; aucune migration ni API externe n’est ajoutée.

Validation : tests RED puis GREEN pour l’agrégat social et le parcours navigateur. Deux parcours couvrent annulation, nouveau tirage, erreur503 puis reprise, verrouillage de l’enregistrement, persistance après rechargement et cohérence profil/header/classements ; un troisième vérifie le périmètre alcool du classement. Captures à 320/390/1440 inspectées, finition mobile confirmée. TypeScript et build production réussis, revue Sol6.1 medium sans point bloquant.
