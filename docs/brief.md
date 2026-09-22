# Le direct de l'atelier, brief produit

22 sept. 2026 · Charly

## Le problème et la promesse

Quand un client commande un objet fabriqué sur mesure, il paie, puis il attend sans rien voir. Le direct de
l'atelier remplace cette attente par un spectacle : le flux vidéo de sa commande en train d'être fabriquée.

Ce n'est pas un configurateur, ce n'est pas du suivi de commande avec des étapes qui s'allument. C'est du
partage de vidéo, en direct ou en différé, de la main ou de la machine au travail.

Ce que l'artisan y gagne, dans l'ordre d'importance :

1. **Il justifie son prix.** Voir trois heures de tournage à la main rend un bol à 60 € évident.
2. **Il occupe le délai.** Le client qui regarde n'écrit pas pour demander où en est sa commande.
3. **Il produit du contenu sans effort.** Chaque commande filmée devient une vidéo réutilisable.

Ce que le client y gagne : la preuve que son objet est unique, et quelque chose à montrer autour de lui.

## Pour qui

L'impression 3D est le terrain de départ, mais c'est le plus mauvais cas d'usage du lot : une machine qui
bouge lentement derrière une vitre. Les métiers où l'on voit des mains valent bien mieux.

| Métier | Ce qu'on filme | Durée typique | Intérêt à regarder |
| --- | --- | --- | --- |
| Poterie, céramique | Les mains au tour | 20 à 40 min | Très fort |
| Pâtisserie sur mesure | Le montage et le décor | 1 à 3 h | Très fort |
| Broderie, couture | La machine et les finitions | 30 min à 2 h | Fort |
| Bijouterie | L'établi, le soudage | 1 à 4 h | Fort |
| Gravure laser | La tête qui trace le motif | 5 à 30 min | Moyen |
| Impression 3D | Le plateau, couche par couche | 2 à 20 h | Faible en direct, fort en accéléré |

Deux enseignements. D'abord, la durée de fabrication commande le format : sous une heure le direct a du sens,
au-delà c'est l'accéléré qui est regardé. Ensuite, le premier client cible n'est pas un imprimeur 3D, c'est
un potier ou un pâtissier.

Côté client final, la cible est celle qui commande un objet à forte charge affective : cadeau, mariage,
naissance, pièce à son nom. Personne ne regarde la fabrication d'une pièce technique de rechange.

## Le parcours

Commande reçue → l'artisan ouvre la session → lien envoyé au client → le client regarde pendant la capture
→ session fermée → vidéo gardée + accéléré.

Côté artisan, trois gestes, sans ordinateur : ouvrir l'application sur son téléphone, choisir la commande,
poser le téléphone sur un trépied et appuyer sur démarrer.

Côté client, aucune installation : un lien reçu par message, ouvert dans le navigateur, qui montre le direct
si la session est en cours ou l'accéléré si elle est terminée. Le lien reste valable après la livraison.

Point de friction : l'artisan qui oublie de lancer la session. Plus tard, démarrage automatique dès qu'une
impression démarre ou qu'une commande passe en fabrication.

## Le périmètre de la première version

La V1 transforme un téléphone posé sur un trépied en lien partageable.

Ce qu'elle fait :

- L'artisan crée une session depuis son téléphone, avec un nom de commande et un nom de client.
- Le téléphone diffuse, écran verrouillé si possible, sans surchauffer au bout de vingt minutes.
- Un lien public non devinable donne accès à la page de visionnage.
- À la fin, la vidéo est conservée et un accéléré est généré automatiquement.
- Le client peut télécharger l'accéléré.

Ce qu'elle ne fait pas, volontairement : pas de compte client, pas de son, pas de chat ni de notification,
pas d'application native, pas de facturation, pas de branchement sur les imprimantes 3D.

## L'architecture technique

| Option | Latence | Coût de diffusion | Complexité | Verdict |
| --- | --- | --- | --- | --- |
| WebRTC direct | Moins d'1 s | Serveur TURN à prévoir | Élevée | Surdimensionné |
| HLS via un service de streaming | 10 à 30 s | À la minute et au Go | Faible | Recommandé |
| Photos toutes les 2 s | 2 à 5 s | Négligeable | Très faible | Suffisant pour le prototype |

La latence n'a aucune importance : personne ne dialogue avec le potier.

V1 recommandée : capture web (getUserMedia, MediaRecorder), diffusion par un service tiers (Mux, Cloudflare
Stream), Next.js sur Vercel et Supabase, accéléré généré par le service ou par ffmpeg. Le piège : chauffe,
batterie, écran qui s'éteint. Alimentation branchée, 720p, reprise automatique.

## Le prototype à monter en premier

Objectif : savoir si un client regarde vraiment.

- Une page de capture qui prend une photo toutes les deux secondes et l'envoie au serveur.
- Une page de visionnage qui affiche la dernière image reçue et se rafraîchit toute seule.
- Un lien par session, non devinable, sans compte.
- Un compteur d'ouvertures et de durée de visionnage.

Test grandeur nature : trois commandes réelles d'Onlyfab, plus deux artisans d'autres métiers.
Un Raspberry Pi Zero W avec module caméra peut servir de second poste de capture, fixé sur la H2D.

## Les questions ouvertes

1. Qui paie, l'artisan ou le client ? (piste : supplément de 5 € sur la commande)
2. Est-ce que les artisans acceptent d'être filmés ?
3. Direct ou accéléré ?
4. Que se passe-t-il quand la fabrication rate ? Au minimum un bouton pour couper et repartir.
5. Quelle durée de conservation ? Trente jours puis un téléchargement proposé.
6. Le nom.

## Comment on saura que ça marche

Un seul chiffre décide : la durée moyenne de visionnage par client.

| Signal | Seuil d'encouragement | Signal d'arrêt |
| --- | --- | --- |
| Clients qui ouvrent le lien | Plus de 7 sur 10 | Moins de 4 sur 10 |
| Durée moyenne de visionnage | Plus de 2 min | Moins de 20 s |
| Clients qui rouvrent le lien | Au moins 3 sur 10 | Aucun |
| Clients qui partagent le lien | Au moins 1 sur 10 | Aucun |
| Artisans interrogés prêts à payer | 2 sur 5 | 0 sur 5 |

Si après dix commandes filmées la durée moyenne reste sous vingt secondes, l'idée est à abandonner.
