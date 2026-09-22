# Le direct de l'atelier (prototype)

Le client qui a commandé un objet fait sur mesure reçoit un lien, et à ce lien il regarde son objet
en train d'être fabriqué. Le brief produit complet est dans [`docs/brief.md`](docs/brief.md).

Ce dépôt contient **le prototype**, pas la V1. Il ne sert qu'à répondre à une question :
**est-ce qu'un client regarde vraiment ?** Donc pas de vidéo : le téléphone de l'artisan envoie une photo
toutes les 2 secondes, et la page du client affiche la dernière reçue.

## Ce que fait le prototype

| Côté | Écran | Contenu |
| --- | --- | --- |
| Artisan | `/atelier` | Connexion par mot de passe, création d'une session (commande + client), tableau des signaux de décision |
| Artisan | `/atelier/{id}` | Page de capture sur le téléphone : Démarrer, Couper / Reprendre, Terminer, envoi du lien au client |
| Client | `/s/{lien}` | Aucun compte. En attente, en direct (dernière image), en pause, puis accéléré une fois la session fermée |

Côté capture :

- Caméra arrière en 720p, 10 i/s maximum, **sans micro**. Une image JPEG part toutes les 2 s.
- L'écran reste allumé (Wake Lock). Un mode **écran noir** économise la batterie, parce que verrouiller
  le téléphone interrompt la capture dans un navigateur.
- **Reprise automatique** : si le réseau coupe, la boucle continue sans rien demander. Si le système
  coupe la caméra ou si la page est rechargée, la caméra se relance toute seule.
- Alerte quand le téléphone n'est pas branché (Chrome Android).
- **Couper** : les images sont refusées par le serveur tant que la session est en pause. Le client voit
  « L'artisan a fait une pause ».
- Installable sur l'écran d'accueil (manifest web), pas d'application native.

Côté client : le lien contient 128 bits aléatoires et n'est pas indexé. Il reste valable après la fin :
il affiche alors l'accéléré, construit à partir d'une image archivée toutes les 10 s et lu à 15 i/s.

## La mesure

C'est la seule donnée qui compte. Chaque ouverture du lien crée une visite ; seul le temps passé
**onglet visible** est compté (envoi toutes les 10 s et à la fermeture). Les visites de l'artisan
(navigateur connecté à `/atelier`) ne sont pas comptées.

Le tableau de `/atelier` reprend les seuils du brief :

| Signal | Encourageant | Arrêt |
| --- | --- | --- |
| Clients qui ouvrent le lien | plus de 7 sur 10 | moins de 4 sur 10 |
| Durée moyenne de visionnage | plus de 2 min | moins de 20 s |
| Clients qui rouvrent le lien | au moins 3 sur 10 | aucun |
| Clients qui partagent le lien | au moins 1 sur 10 | aucun |

Hypothèses de calcul :

- Ne comptent que les sessions **démarrées**, c'est-à-dire dont le lien a réellement été envoyé.
- Le **client** est le premier navigateur à ouvrir le lien. Sa durée est la somme de ses visites.
- **Partage** : le bouton « Montrer à quelqu'un » est utilisé, ou un second navigateur ouvre le lien.
- Le verdict d'arrêt (rouge) ne s'affiche qu'à partir de 10 commandes filmées, comme prévu par le brief.
- « Artisans prêts à payer » se mesure en entretien, pas dans l'outil.

## Pile technique

Next.js 16 (App Router) sur Vercel, Supabase (Postgres et Storage). Aucun service vidéo tiers.
Tout l'accès aux données passe par les routes serveur avec la clé `service_role` ; RLS est activé
sans policy, donc la clé publique ne donne accès à rien.

```
app/
  atelier/            espace artisan (connexion, liste, signaux, capture)
  s/[slug]/           page de visionnage client
  api/sessions/[id]/  frame (réception des images), status (démarrer, couper, terminer)
  api/s/[slug]/       frame, state, timelapse, view (audience), share
lib/                  accès Supabase, auth artisan, calcul des signaux
supabase/migrations/  schéma : sessions, views, shares, bucket privé "frames"
```

## Lancer

```bash
npm install
cp .env.example .env.local   # renseigner Supabase et ATELIER_PASSWORD
npx supabase start           # ou appliquer supabase/migrations/0001_init.sql sur un projet Supabase
npm run dev
```

La caméra exige HTTPS sur téléphone : pour tester sur un vrai téléphone, déployer sur Vercel
(variables d'environnement identiques à `.env.example`) ou passer par un tunnel.

## Coûts et limites connus

- Stockage : une image de ~100 Ko toutes les 10 s, soit environ 36 Mo par heure de fabrication.
  L'image « en direct » écrase la précédente. Suffisant pour les dix commandes du test.
- Chaque spectateur interroge le serveur toutes les 2 s. Sans importance à l'échelle du test.
- Pas de purge automatique : la durée de conservation fait partie des questions ouvertes du brief.
- Le Raspberry Pi Zero W envisagé comme second poste peut utiliser la même route
  `POST /api/sessions/{id}/frame` (JPEG brut, cookie `atelier`).
