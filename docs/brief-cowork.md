# Mise en ligne du prototype « Le direct de l'atelier »

Tu vas mettre en ligne une petite application web pour Charly, en utilisant son navigateur et ses comptes
Supabase, Vercel et GitHub. Le code est déjà écrit et testé. Il n'y a **aucun code à écrire ni à modifier** :
seulement de la configuration, puis un test.

## Contexte en deux lignes

Un artisan filme la fabrication d'une commande avec son téléphone (une photo toutes les 2 s). Le client
reçoit un lien et regarde. Le prototype sert à mesurer si les clients regardent vraiment.

- Dépôt GitHub : https://github.com/CharlyGEORGES/WorkshopLive
- Branche à mettre en ligne : `claude/modest-sagan-n5y755` (pas `main`)
- Pile : Next.js sur Vercel, Supabase (base Postgres et stockage de fichiers)

## Règles

- La clé `service_role` de Supabase est un secret : elle ne va **que** dans les variables d'environnement
  de Vercel. Ne la colle nulle part ailleurs, ne l'écris pas dans un message, un document ou un fichier.
- Si un compte n'existe pas, si une connexion est demandée ou si une étape coûte de l'argent, arrête-toi
  et demande à Charly.
- Ne modifie aucun fichier du dépôt, ne fusionne rien dans `main`.
- Si une étape ne ressemble pas à ce qui est décrit (interface changée, bouton introuvable), décris ce que
  tu vois et demande plutôt que d'improviser.

## Étape 1 : créer la base Supabase

1. Va sur https://supabase.com/dashboard et crée un nouveau projet :
   - Nom : `direct-atelier`
   - Région : Europe (Paris ou Francfort)
   - Plan gratuit
   - Génère un mot de passe de base de données et demande à Charly de le noter dans son gestionnaire
     de mots de passe (il ne servira pas à l'application).
2. Attends que le projet soit prêt (une à deux minutes).
3. Ouvre le fichier de schéma sur GitHub et copie **tout** son contenu (bouton « Copy raw file ») :
   https://github.com/CharlyGEORGES/WorkshopLive/blob/claude/modest-sagan-n5y755/supabase/migrations/0001_init.sql
4. Dans Supabase, ouvre **SQL Editor**, nouvelle requête, colle le contenu, clique **Run**.
   Résultat attendu : « Success. No rows returned ».
5. Vérifie :
   - **Table Editor** montre trois tables : `sessions`, `views`, `shares`.
   - **Storage** montre un bucket `frames` marqué privé (pas « Public »).
6. Dans **Project Settings > API** (ou **Data API** / **API Keys** selon l'interface), repère :
   - l'URL du projet, de la forme `https://xxxx.supabase.co`
   - la clé `service_role` (clé secrète, pas la clé `anon` ni la clé publishable)

   Garde cet onglet ouvert pour l'étape 2.

## Étape 2 : déployer sur Vercel

1. Va sur https://vercel.com/new et importe le dépôt `CharlyGEORGES/WorkshopLive`. Si Vercel ne voit pas
   le dépôt, demande à Charly d'autoriser l'accès GitHub de Vercel à ce dépôt.
2. Framework : Next.js (détecté automatiquement). Ne change pas les commandes de build.
3. Ajoute ces variables d'environnement avant de déployer :

   | Nom | Valeur |
   | --- | --- |
   | `SUPABASE_URL` | l'URL du projet Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | la clé `service_role` |
   | `ATELIER_PASSWORD` | un mot de passe choisi par Charly (demande-le lui) |

4. Lance le déploiement. Il peut échouer ou déployer `main`, qui ne contient pas l'application : c'est normal,
   l'étape suivante corrige ça.
5. Dans le projet Vercel, **Settings > Git > Production Branch** (parfois sous **Environments > Production**),
   remplace `main` par `claude/modest-sagan-n5y755` et enregistre.
6. Relance un déploiement de production de cette branche : **Deployments**, dernier déploiement de
   `claude/modest-sagan-n5y755`, menu « … », **Promote to Production** ou **Redeploy**.
7. Dans **Settings > Deployment Protection**, vérifie que la protection ne s'applique **pas** au domaine de
   production (réglage « Standard Protection » ou désactivé). Les clients doivent pouvoir ouvrir le lien sans
   compte Vercel.
8. Note l'adresse de production, de la forme `https://xxxx.vercel.app`.

## Étape 3 : vérifier que ça marche

Fais ces vérifications dans le navigateur de l'ordinateur. La webcam de l'ordinateur suffit.

1. Ouvre `https://xxxx.vercel.app/atelier`, entre le mot de passe `ATELIER_PASSWORD`.
2. Crée une session : Commande « Test », Client « Test ». Tu arrives sur la page de capture.
3. Clique **Démarrer** et autorise la caméra. Attends 10 s : le compteur doit indiquer plusieurs
   « images envoyées ».
4. Ouvre le lien client (« Voir comme le client ») **dans une fenêtre de navigation privée**. Les visites
   depuis la fenêtre connectée à `/atelier` ne sont volontairement pas comptées.
   Attendu : badge « EN DIRECT », image qui change toutes les 2 s environ.
5. Laisse la fenêtre privée ouverte 30 s, puis, côté atelier, clique **Couper** : le client affiche une pause.
   Clique **Reprendre**, attends 20 s, puis **Terminer la session** et confirme.
6. Côté client : « Fabrication terminée. Voici l'accéléré », et l'accéléré se lit.
7. Ferme la fenêtre privée, retourne sur `/atelier` et recharge : la session « Test » apparaît comme
   terminée, avec une durée de visionnage d'environ une minute.

Si une étape échoue, ouvre dans Vercel **Deployments > (dernier) > Logs**, relève le message d'erreur exact
et rapporte-le à Charly sans tenter de corriger le code.

## Ce que tu rends à Charly

Un message court avec :

- l'adresse de production (`https://xxxx.vercel.app`) et l'adresse de l'espace artisan (`…/atelier`)
- le nom du projet Supabase et sa région
- le résultat de chaque vérification de l'étape 3 (réussi ou échoué, avec l'erreur)
- ce qui reste à faire par Charly directement : tester sur son téléphone posé sur un trépied, branché,
  pendant 20 minutes (chauffe, batterie, mode écran noir, coupure réseau en mode avion)

Ne mets dans ce message ni la clé `service_role`, ni le mot de passe de l'atelier.
