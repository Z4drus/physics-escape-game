# Physics Escape : le Cabinet de Physique

Escape game 3D à la première personne dans un musée de physique parisien, en
fin de journée. Six questions de physique donnent six sceaux ; autour d'elles,
des mécaniques d'escape game (fouille, cadenas à code, coffre, tableau
électrique, lampe UV, carnet) relient trois espaces jusqu'à l'hologramme
d'Albert Einstein, qui salue le joueur et l'inscrit au classement.

Le scénario, la chaîne de progression et la direction artistique sont décrits
dans `docs/game-design.md`, l'architecture du code dans
`docs/architecture.md`, l'origine de chaque asset dans `sources.md`.

Stack : **Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
three.js via React Three Fiber · postprocessing · Zustand · Motion**.

## Démarrer

```bash
pnpm install
pnpm dev
```

Scripts : `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `format`.

## Commandes en jeu

| Touche                | Action                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| ZQSD / WASD / flèches | Se déplacer                                                                   |
| Souris                | Regarder                                                                      |
| Maj                   | Courir                                                                        |
| E                     | Interagir avec l'objet visé (analyser, inspecter, fouiller, ouvrir, éclairer) |
| Tab                   | Ouvrir ou fermer le carnet (sceaux, indices, objets)                          |
| M                     | Couper ou rétablir le son                                                     |
| 1 / 2 / 3             | Répondre à une question                                                       |
| Échap                 | Fermer une fenêtre, sinon libérer la souris (pause)                           |

La visée combine distance au sol et écart angulaire en trois dimensions : on
regarde vers le haut pour viser un tableau, vers le bas pour fouiller un
bureau.

### Schéma d'une question

Chaque question affiche un schéma 3D animé, agrandissable en plein écran.

| Commande       | Action                                   |
| -------------- | ---------------------------------------- |
| Glisser        | Faire pivoter le schéma                  |
| Molette, + / - | Zoomer (de 65 % à 320 %)                 |
| L              | Afficher ou masquer les légendes         |
| R              | Recadrer la vue                          |
| Échap          | Réduire le schéma, puis quitter le poste |

## Les trois espaces

| Espace                  | Contenu                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Galerie des instruments | Quatre postes, quatre portraits qui cachent le code, buste, vitrines, bureau du surveillant, tableau électrique |
| Cabinet du conservateur | Deux postes, bureau, coffre, bibliothèque, tableau noir, message à l'encre invisible                            |
| Salle de l'hologramme   | Estrade de projection, dialogue avec Einstein, score et classement local                                        |

## Contenu pédagogique

Six thèmes, un poste chacun, trois questions par thème tirées au hasard à
l'ouverture du poste (difficultés 1, 2 et 3) :

| Thème       | Poste                    | Exemples de notions                              |
| ----------- | ------------------------ | ------------------------------------------------ |
| Forces      | Table de Newton          | poids, force de soutien, frottements, Archimède  |
| MRU / MRUA  | Rail de Galilée          | v = d/t, chute libre, distance de freinage       |
| Électricité | Banc d'Ampère            | loi d'Ohm, parallèle, P = U·I, kWh               |
| Énergie     | Piste de Joule           | Ec, Epp, conservation, puissance                 |
| Pression    | Presse de Pascal         | p = F/S, p = ρ·g·h, presse hydraulique           |
| Chaleur     | Calorimètre de Lavoisier | Q = m·c·ΔT, équilibre thermique, chaleur latente |

Les distracteurs sont des erreurs classiques calculées, jamais des valeurs
absurdes. Deux énigmes d'escape game sont elles aussi de la physique : la
combinaison du coffre est une énergie potentielle à calculer, et le tableau
électrique se réarme par puissance croissante avec des W et des kW mélangés.

## Design system

Le versant sombre du système source, réchauffé aux tons d'un musée : encre
parchemin sur fond noyer, surfaces de verre, filets 1 px à 8–14 %, dégradé
nuit → noyer → laiton, éclairage par l'intérieur plutôt que par des ombres.

- **Tokens** : `src/app/globals.css` (couleurs, rayons, easing, durées) et
  utilitaires `glass`, `scrim`, `parchment`, `hairline-fade`, `tap-target`.
- **Typographie** : Fraunces (titres, cartels, enseignes), Geist (corps),
  Geist Mono (chiffres).
- **Mouvement** : un seul easing `cubic-bezier(0.32, 0.72, 0, 1)`, deux durées
  (200 et 450 ms), stagger 75 ms, voir `src/lib/motion.ts`.
- **Fenêtres** : `src/components/ui/ModalShell.tsx` (voile, carte de verre à
  rayons concentriques, piège à focus, Échap) et `Dial.tsx` (molette à chiffre).
- **3D** : `src/features/game/components/scene/materials.ts` transpose la même
  palette en matériaux three.js ; un matériau ne pouvant pas lire une variable
  CSS, ce fichier doit rester aligné avec `globals.css`.

## Structure

```
src/
  app/                        Route unique : layout, page, error, not-found
  components/ui/              Primitives partagées : Button, Eyebrow, ModalShell, Dial
  hooks/                      useFocusTrap, useLeaderboard
  features/game/
    components/
      GameScreen.tsx          Compose la scène, le HUD, le carnet et les fenêtres
      GameCanvas.tsx          <Canvas> R3F, éclairage, post-traitement, PointerLockControls
      scene/                  World (coque), Doors, Lights, Effects, Player, StationProp
        decor/                Tableaux, vitrines, bureaux, coffre, tableau électrique, hologramme…
        rooms/                Composition du décor par espace
        props/                Les six modèles animés des postes
      diagrams/               Schémas 3D des questions (scenes/, primitives/)
      ui/                     HUD, carnet, notifications, overlays et fenêtres
    data/
      world.ts                Pièces, murs, portes, fenêtres, obstacles, joueur
      stations.ts             Les six postes et leurs sceaux
      interactables.ts        Tout ce que la touche E peut viser
      clues.ts                Fiches d'inspection, cartes du récit, répliques d'Einstein
      colliders.ts            Boîtes de collision dérivées du monde et des portes
      puzzles/<thème>.ts      Questions, réponses, corrections, schémas
    logic/                    Tirages des énigmes, objectif courant, formatage
    hooks/                    Clavier, interaction, Pointer Lock, son
    state/useGameStore.ts     Machine d'état de la partie (Zustand)
    debug.ts                  Poignée window.__physicsEscape (développement seulement)
  lib/                        Logique pure : collisions, classement, audio, motion, cn()
  types/game.ts               Modèle de domaine
public/
  textures/                   PBR Poly Haven (parquet, enduit, bois, marbre)
  models/                     GLB : bustes, instruments, hologramme
  images/                     Portraits, décor, parchemin
  audio/                      Effets Kenney
```

## Ajouter une question

1. Ajouter une entrée dans `src/features/game/data/puzzles/<thème>.ts`
   (énoncé, trois réponses, `correctAnswerId`, correction, `formula`,
   `diagram.kind` + `params`, `difficulty`).
2. Créer la scène du schéma dans
   `src/features/game/components/diagrams/scenes/` et l'enregistrer dans
   `diagrams/registry.ts` sous la clé `diagram.kind`.

## Ajouter un objet à inspecter

1. Déclarer l'objet dans `src/features/game/data/interactables.ts` (position,
   verbe, pièce, rayon), et sa boîte de collision s'il est au sol.
2. Écrire sa fiche dans `src/features/game/data/clues.ts`.
3. Poser son modèle dans `components/scene/rooms/<Espace>Decor.tsx`.

## Choix techniques

- **Pas de moteur physique** : collisions par boîtes alignées sur les axes,
  résolues axe par axe (`src/lib/collision.ts`), dérivées des données du monde
  et de l'état des portes.
- **Le store n'est pas lu pendant la boucle de rendu** : `Player` lit l'état via
  `useGameStore.getState()` dans `useFrame`. Seuls les composants qui dépendent
  d'un booléen s'y abonnent.
- **Pointer Lock piloté par l'interface** : une fenêtre rend la souris, sa
  fermeture redemande le verrouillage dans le même geste, sans passer par la
  pause.
- **Secrets tirés au démarrage de la partie** : code du cadenas, énigme du
  coffre et disjoncteurs changent à chaque partie, côté client, après le clic
  « Commencer », sans divergence d'hydratation.
- **Textures clonées par surface** : un jeu PBR chargé une fois, décliné avec
  une répétition adaptée à chaque sol et chaque mur, réglé au clonage pour ne
  dépendre d'aucun rappel de chargement.
- **Textes 3D dessinés en canvas** : cartels, enseignes et message UV sont des
  `CanvasTexture` rendues avec les polices du site, sans police three.js.
- **`three` épinglé en 0.182.0** : à partir de 0.183, `THREE.Clock` est
  déprécié alors que React Three Fiber l'instancie encore.
