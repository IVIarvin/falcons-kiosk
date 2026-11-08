# Préparer la voix grave de Piller

La voix dédiée est préparée sur une machine de confiance puis livrée comme fichiers MP3 avec l'application. L'écoute et les achats n'appellent jamais ElevenLabs. La production Vercel n'a pas besoin de clé de synthèse vocale ni d'un stockage supplémentaire.

## Compte et clé locale

Créer le compte [ElevenLabs](https://elevenlabs.io/), puis une clé API dans l'espace développeur. La conserver uniquement dans `.env.local` :

```dotenv
ELEVENLABS_API_KEY=la_cle_du_compte
```

Ne pas la publier, la mettre dans une variable `NEXT_PUBLIC_`, la transmettre dans le chat ou la versionner. `.env.local` est ignoré par Git. Utiliser les fonctions voix nécessaires et une limite de dépense du compte si disponible. Les conditions du forfait choisi déterminent les droits d'utilisation des fichiers ; les essais privés précèdent leur diffusion dans l'application.

## Trois essais avant de choisir

La simulation ne consomme rien :

```sh
pnpm voice:preview
```

Après configuration de la clé, produire les vrais essais :

```sh
pnpm voice:preview --generate
```

Description de la voix : homme francophone de 50–60 ans, basse profonde et résonnante, légèrement rocailleuse, diction claire, débit posé, ton sec et sarcastique. Voix originale, sans référence à une personne réelle.

L'outil écrit jusqu'à trois MP3 sous `.data/piller-voice/` et affiche leurs chemins. Écouter les propositions avant de retenir un numéro. Aucun audio réel n'est fourni par une simulation ou les tests.

```sh
pnpm voice:select --sample 2
pnpm voice:select --sample 2 --generate
```

Le premier appel simule, le second crée la voix retenue dans le compte. La sélection est conservée localement, sans clé dans son fichier. Relancer le même choix ou les mêmes essais réutilise les résultats disponibles ; `--regenerate-previews` demande explicitement une nouvelle série.

## Préparer la banque actuelle

Dans Administration → Réglages → Le répertoire de Piller, utiliser **Exporter les répliques**. L'export comprend les textes enregistrés et leur activation ; aucune coordonnée de membre ni aucun achat n'y figure.

```sh
pnpm voice:build --input chemin/falcons-repliques.json
pnpm voice:build --input chemin/falcons-repliques.json --generate
```

La simulation compte uniquement les textes absents du cache. Le plafond par défaut est de 6 000 caractères. Si une banque plus longue est intentionnelle, fixer explicitement `--max-characters 10000`. Pour les textes initiaux du code seulement, remplacer `--input …` par `--defaults`.

Les fichiers vont sous `public/audio/piller/`, le journal de préparation sous `.data/piller-voice/generation/`. Un seul générateur peut écrire ce journal à la fois. Les MP3 valides déjà présents sont réutilisés, même après un arrêt partiel. Une erreur réseau n'est jamais retentée automatiquement.

Si le résultat d'un appel est incertain, vérifier l'historique du fournisseur avant de décider d'un nouvel essai avec `--retry-uncertain` : ce nouvel essai peut être facturé. Après un arrêt brutal du processus, vérifier qu'aucun générateur ne tourne avant de retirer son fichier `generation.lock` dans le journal local. Ne jamais lancer plusieurs préparations simultanées.

## Activer et mettre à jour

Vérifier quelques vrais enregistrements dans l'application, puis livrer le manifeste et les MP3 lors du prochain déploiement. Ces fichiers publics ne doivent contenir ni clé ni informations personnelles. Le coût de génération est séparé de l'hébergement et du transfert des fichiers.

Avant la première préparation, le manifeste contient `voice: null` et la voix existante du téléphone reste en service. Après activation, le lecteur utilise uniquement la voix dédiée. Un fichier manquant affiche un message ; le texte reste disponible et aucune voix différente ne le remplace silencieusement.

Quand l'admin modifie une phrase, exporter et préparer à nouveau la banque. Seuls les nouveaux textes sont générés. Les anciens fichiers restent disponibles pour les achats historiques. Changer de voix exige de préparer les textes avec cette nouvelle identité ; les fichiers de l'ancienne voix ne sont pas associés à la nouvelle.

Le manifeste est relu sur le réseau ; le service worker ne le conserve pas. Il peut conserver les MP3 publics identifiés par leur contenu, sans mettre en cache les routes de compte.

## État de la première intégration

Préparation, simulations, export et lecteur peuvent être vérifiés sans compte fournisseur. Les vrais essais, le choix de timbre et la production de la banque complète nécessitent la clé du propriétaire et l'écoute des fichiers. Tant que cette étape n'est pas réalisée, ne pas annoncer qu'une voix masculine grave est déjà active.

Références : [Voice Design](https://elevenlabs.io/docs/api-reference/text-to-voice/design), [création de la voix choisie](https://elevenlabs.io/docs/api-reference/text-to-voice/create), [synthèse MP3](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
