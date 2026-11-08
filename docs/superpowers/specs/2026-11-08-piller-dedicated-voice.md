# Voix dédiée de l’Adjudant Piller

Direction approuvée : le demandeur a choisi une voix masculine grave dédiée, générée une fois puis réutilisée, après comparaison avec la voix gratuite du téléphone. Il doit d’abord créer son compte ElevenLabs ; aucune clé n’est disponible au démarrage.

## Résultat

Une voix originale d’homme mûr, basse et légèrement rocailleuse, française, débit posé, ton sec d’adjudant bougon. Trois essais sont produits par Voice Design, puis le demandeur choisit avant de produire la banque complète. Aucun clonage ni imitation d’une personne fournie.

Les MP3 sont des actifs statiques sous `public/audio/piller/`, inclus dans le déploiement. Leur manifeste associe le texte exact à son enregistrement et à la version de voix. Un achat ou une écoute ne peut appeler ElevenLabs. Aucun stockage distant supplémentaire ni migration de base nécessaire.

La clé API reste uniquement sur la machine de préparation dans `.env.local`, jamais dans le navigateur, les MP3, le manifeste, les journaux ou le dépôt. La production n’en a pas besoin.

## Génération et modifications

Un outil local prépare les essais et crée la voix retenue, puis génère seulement les textes absents du cache. Une simulation compte les caractères avant toute dépense. La génération réelle est explicite, bornée en caractères et sans relance réseau automatique. Un résultat réseau incertain reste marqué et nécessite une décision explicite avant une nouvelle tentative.

L’administrateur exporte la banque enregistrée, sans coordonnées ni historique des membres, pour la préparation des fichiers. Le texte lu est strictement celui affiché : une modification ne peut rejouer l’ancien audio sous le nouveau texte. Les anciens enregistrements sont conservés pour les anciens achats. Une voix dédiée activée ne retombe pas silencieusement sur une voix féminine ou différente du téléphone si un fichier manque.

Tant qu’aucune voix dédiée n’est préparée, le manifeste désactivé conserve le fonctionnement vocal actuel. Texte, son coupé, écoute explicite, arrêt à la fermeture et secours en cas de blocage de lecture restent disponibles.

## Validation

Tests des contrats ElevenLabs sans clé réelle, des budgets/reprises, de la correspondance texte/audio, de l’export réservé au responsable et de la lecture navigateur (muet, arrêt, erreur, absence de fichier). Les essais masculins réels et le choix de timbre restent dépendants de la connexion du compte, jamais annoncés comme réalisés sans fichiers audibles.
