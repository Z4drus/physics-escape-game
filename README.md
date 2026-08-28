# Physics Escape

Escape game 3D à la première personne : on explore un laboratoire de physique,
on analyse six postes de mesure, et chaque bonne réponse délivre une clé. Les
six clés déverrouillent la porte de sortie.

Chaque question ouvre un **schéma 3D animé** de la situation décrite, pensé
comme une aide à la compréhension et non comme une décoration.

Stack : **Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
three.js via React Three Fiber · Zustand · Motion**.

## Démarrer

```bash
pnpm install
pnpm dev
```

Scripts : `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `format`.

## Commandes en jeu

| Touche                | Action                    |
| --------------------- | ------------------------- |
| ZQSD / WASD / flèches | Se déplacer               |
| Souris                | Regarder                  |
| Maj                   | Courir                    |
| E                     | Analyser le poste visé    |
| 1 / 2 / 3             | Répondre à une question   |
| Échap                 | Libérer la souris (pause) |

Fermer un poste rend la main immédiatement : le jeu ne repasse par l'écran de
pause que si le joueur relâche lui-même le pointeur.

### Schéma d'une question

Chaque question affiche un schéma 3D animé, agrandissable en plein écran par le
bouton « Agrandir ». Le cadre grandit d'un seul mouvement, la scène restant la
même.

| Commande | Action |
| --- | --- |
| Glisser | Faire pivoter le schéma |
| Molette, + / - | Zoomer (de 65 % à 320 %) |
| L | Afficher ou masquer les légendes |
| R | Recadrer la vue |
| Échap | Réduire le schéma, puis quitter le poste |

Les légendes sont pilotées par un contexte React monté à l'intérieur du
`<Canvas>` : les 18 scènes n'ont rien à gérer, `DiagramLabel` s'efface seul.

## Contenu pédagogique

Six thèmes, un poste chacun, trois questions par thème tirées au hasard à
l'ouverture du poste (difficultés 1, 2 et 3) :

| Thème       | Poste                | Exemples de notions                              |
| ----------- | -------------------- | ------------------------------------------------ |
| Pression    | Banc de pression     | p = F/S, p = ρ·g·h, presse hydraulique           |
| Chaleur     | Calorimètre          | Q = m·c·ΔT, équilibre thermique, chaleur latente |
| Énergie     | Piste d'énergie      | Ec, Epp, conservation, puissance                 |
| Électricité | Banc d'électricité   | loi d'Ohm, parallèle, P = U·I, kWh               |
| Forces      | Table des forces     | poids, force de soutien, frottements, Archimède  |
| MRU / MRUA  | Rail à coussin d'air | v = d/t, chute libre, distance de freinage       |

Les distracteurs sont des erreurs classiques calculées (oubli d'un facteur,
unité non convertie, moyenne naïve), jamais des valeurs absurdes.

## Design system

L'interface reprend le versant sombre d'un système existant : encre bleu-nuit,
surfaces de verre, filets 1 px à 6–12 %, dégradé de marque nuit → pétrole →
cyan, et éclairage par l'intérieur (glows) plutôt que par des ombres portées.

- **Tokens** : `src/app/globals.css` (couleurs, rayons, easing, durées) et
  utilitaires `glass`, `scrim`, `hairline-fade`.
- **Mouvement** : un seul easing `cubic-bezier(0.32, 0.72, 0, 1)`, trois durées
  (200 / 450 / 800 ms), stagger 75 ms — voir `src/lib/motion.ts`.
- **Boutons** : `src/components/ui/Button.tsx` réunit les trois
  micro-interactions du système (fond qui se rétracte, libellé qui roule,
  flèche à relais).
- **Rayons** : imbrication concentrique stricte, `intérieur = extérieur −
padding`.
- **3D** : `src/features/game/components/scene/materials.ts` (salle et postes)
  et `components/diagrams/palette.ts` (schémas) transposent les mêmes teintes —
  un matériau three.js ne pouvant pas lire une variable CSS, ces deux fichiers
  doivent rester alignés avec `globals.css`.

## Structure

```
src/
  app/                        Route unique : layout, page, error, not-found
  components/ui/              Primitives du design system (Button, Panel…)
  features/game/
    components/
      GameScreen.tsx          Compose la scène, le HUD et les modales
      GameCanvas.tsx          <Canvas> R3F + PointerLockControls
      scene/                  Salle, porte, joueur, postes (props/)
      diagrams/               Schémas 3D des questions (scenes/, primitives/)
      ui/                     HUD, réticule, dialogue de poste, overlays
    data/
      puzzles/<thème>.ts      Questions, réponses, corrections, schémas
      stations.ts             Les six postes et leurs clés
      room.ts                 Dimensions, collisions, joueur
    hooks/                    Clavier, interaction, Pointer Lock
    state/useGameStore.ts     Machine d'état de la partie (Zustand)
  lib/                        Logique pure : collisions, motion, cn()
  types/game.ts               Types du domaine
public/textures/              Carrelage et panneaux muraux (WebP)
```

## Ajouter une question

1. Ajouter une entrée dans `src/features/game/data/puzzles/<thème>.ts`
   (énoncé, trois réponses, `correctAnswerId`, correction, `formula`,
   `diagram.kind` + `params`, `difficulty`).
2. Créer la scène du schéma dans
   `src/features/game/components/diagrams/scenes/` et l'enregistrer dans
   `diagrams/registry.ts` sous la clé `diagram.kind`.

Le nombre de clés requises suit automatiquement le nombre de postes
(`TOTAL_KEYS`).

## Choix techniques

- **Pas de moteur physique** : les collisions sont des boîtes alignées sur les
  axes résolues axe par axe (`src/lib/collision.ts`), suffisant pour un
  déplacement à la première personne dans une pièce fermée.
- **Le store n'est pas lu pendant la boucle de rendu** : `Player` lit l'état via
  `useGameStore.getState()` dans `useFrame`, ce qui évite tout re-render à
  60 fps. Seuls les composants qui dépendent réellement d'un booléen (poste visé,
  question résolue) s'y abonnent.
- **Pointer Lock piloté par l'interface** : le verrouillage automatique de drei
  sur n'importe quel clic est désactivé, et le délai de garde du navigateur
  n'est appliqué qu'aux sorties déclenchées par le joueur.
- **`three` est épinglé en 0.182.0** : à partir de 0.183, `THREE.Clock` est
  déprécié alors que React Three Fiber l'instancie encore, ce qui pollue la
  console à chaque démarrage. À lever dès que R3F migrera vers `THREE.Timer`.
- **Étiquettes des schémas en HTML** (`drei/Html`) plutôt qu'en texte 3D : la
  typographie reste nette, hérite du design system et n'exige aucun chargement
  de police côté three.js.
