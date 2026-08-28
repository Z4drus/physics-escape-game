# Physics Escape

Escape game 3D à la première personne : on explore un laboratoire de physique,
on interagit avec cinq dispositifs, et chaque bonne réponse à une question de
physique délivre une clé. Les cinq clés déverrouillent la porte de sortie.

Stack : **Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
three.js via React Three Fiber · Zustand · Motion**.

## Démarrer

```bash
pnpm install
pnpm dev
```

Scripts : `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `format`.

## Commandes en jeu

| Touche                | Action                            |
| --------------------- | --------------------------------- |
| ZQSD / WASD / flèches | Se déplacer                       |
| Souris                | Regarder                          |
| Maj                   | Courir                            |
| E                     | Interagir avec le dispositif visé |
| 1 / 2 / 3             | Répondre à une question           |
| Échap                 | Libérer la souris (pause)         |

## Structure

```
src/
  app/                      Route unique : layout, page, error, not-found
  features/game/
    components/
      GameScreen.tsx        Compose la scène, le HUD et les modales
      GameCanvas.tsx        <Canvas> R3F + PointerLockControls
      scene/                Salle, porte, joueur, dispositifs 3D
      ui/                   HUD, réticule, dialogue d'énigme, overlays
    data/
      puzzles.ts            Énoncés, réponses, explications, clés
      room.ts               Dimensions, positions, collisions, joueur
    hooks/                  Clavier de déplacement, raccourci d'interaction
    state/useGameStore.ts   Machine d'état de la partie (Zustand)
  lib/                      Logique pure : collisions, textures, cn()
  types/game.ts             Types du domaine
```

## Ajouter une énigme

1. Ajouter une entrée dans `src/features/game/data/puzzles.ts`
   (question, trois réponses, `correctAnswerId`, explication, clé et couleur).
2. Ajouter le dispositif correspondant dans `INTERACTIVE_OBJECTS`
   (`src/features/game/data/room.ts`) : position, rotation, empreinte au sol
   — l'empreinte devient automatiquement un obstacle.
3. Si le `kind` est nouveau : créer le composant 3D dans
   `components/scene/props/` et le brancher dans `StationModel`
   (`components/scene/PuzzleStation.tsx`).

Le nombre de clés requises pour ouvrir la porte suit automatiquement le nombre
d'énigmes (`TOTAL_KEYS`).

## Choix techniques

- **Pas de moteur physique** : les collisions sont des boîtes alignées sur les
  axes résolues axe par axe (`src/lib/collision.ts`), suffisant pour un
  déplacement à la première personne dans une pièce fermée.
- **Le store n'est pas lu pendant le rendu de la boucle 3D** : `Player` lit
  l'état via `useGameStore.getState()` dans `useFrame`, ce qui évite tout
  re-render à 60 fps. Seuls les composants qui dépendent réellement d'un
  booléen (dispositif visé, énigme résolue) s'y abonnent.
- **Verrouillage du pointeur piloté par l'interface** : le lock automatique de
  drei sur n'importe quel clic est désactivé, seul le bouton de l'overlay
  déclenche `controls.lock()`.
