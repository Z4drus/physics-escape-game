# Architecture

Physics Escape est un escape game 3D à la première personne : Next.js 16 en App
Router, React 19, three.js via React Three Fiber, Zustand pour l'état.

Le code est fonctionnel : il n'y a pratiquement pas de `class`. Le diagramme de
classe ci-dessous décrit donc le **modèle de domaine** (les types et interfaces
de `src/types/game.ts`, l'état du store, les catalogues de données) et les
relations entre modules, et non une hiérarchie objet.

---

## 1. Modèle de domaine

```mermaid
classDiagram
    class RoomId {
        <<enumeration>>
        gallery
        cabinet
        hologram
    }

    class GameStatus {
        <<enumeration>>
        idle
        intro
        playing
        paused
        modal
        locking
        finale
        won
    }

    class Modal {
        <<union>>
        puzzle(stationId)
        inspect(objectId)
        codeLock
        safe
        fuseBox
    }

    class Station {
        +id : string
        +topic : PhysicsTopic
        +kind : StationKind
        +label : string
        +roomId : RoomId
        +position : Vec3
        +rotationY : number
        +footprint : number[]
        +reward : Seal
        +gate : power ou energy-case, optionnel
    }

    class Seal {
        +id : string
        +label : string
        +color : string
    }

    class Interactable {
        +id : string
        +kind : InteractableKind
        +roomId : RoomId
        +label : string
        +verb : string
        +position : Vec3
        +radius : number
    }

    class InteractableKind {
        <<enumeration>>
        station
        inspect
        pickup
        cabinet-door
        final-door
        safe
        fuse-box
        uv-wall
    }

    class InspectContent {
        +id : string
        +title : string
        +caption : string
        +image : string
        +body : string
        +codeIndex : 0 à 3, optionnel
    }

    class Puzzle {
        +id : string
        +topic : PhysicsTopic
        +scenario : string
        +question : string
        +answers : PuzzleAnswer[]
        +correctAnswerId : string
        +explanation : string
        +formula : string
        +diagram : DiagramSpec
        +difficulty : 1, 2 ou 3
    }

    class World {
        <<module>>
        +ROOMS : RoomSpec par RoomId
        +WALLS : WallSpec[] avec ouvertures
        +WINDOWS : WindowSpec[]
        +OBSTACLES : boîtes de décor
        +PLAYER, PLAYER_SPAWN, HOLOGRAM_DAIS
        +roomAt(x, z) RoomId
    }

    class Colliders {
        <<module>>
        +buildColliders(openDoors) Box2[]
    }

    class GameState {
        +status : GameStatus
        +modal : Modal ou null
        +focusedId, currentRoomId
        +solvedStationIds, seals
        +assignedPuzzleIds, answerOrders
        +inventory : InventoryItemId[]
        +discoveredClueIds : string[]
        +cabinetUnlocked, safeOpen, powerRestored, uvRevealed, energyCaseUnlocked
        +codeDigits, safeRiddle, breakers, armedBreakerIds
        +attempts, errors, startedAt, finishedAt
        +toasts, carnetOpen, hologramStep
    }

    class GameActions {
        +startIntro() nextIntroStep()
        +beginSession() pause()
        +setFocused() setCurrentRoom()
        +interact(id)
        +selectAnswer() retryPuzzle() closeModal()
        +submitCode() submitSafe() armBreaker()
        +enterFinale() advanceHologram() finish()
        +notify() dismissToast() toggleCarnet() reset()
    }

    Station "1" *-- "1" Seal : reward
    Interactable "1" --> "1" InteractableKind : kind
    Interactable "1" --> "1" RoomId : roomId
    Station ..> Interactable : dérive une entrée station
    InspectContent ..> Interactable : même identifiant pour kind inspect
    Puzzle ..> Station : tirée par topic
    World "1" o-- "3" RoomId : ROOMS
    Colliders ..> World : murs, obstacles
    Colliders ..> Station : footprint
    Colliders ..> Interactable : FURNITURE_COLLIDERS
    GameState "1" --> "1" GameStatus : status
    GameState "1" --> "0..1" Modal : modal
    GameState "1" o-- "0..6" Seal : seals
    GameActions ..> GameState : set et get
    GameActions ..> Interactable : interact aiguille par kind
```

### Invariants qui ne se lisent pas dans le graphe

- **Six postes, six sceaux, trois espaces.** Quatre postes dans la galerie,
  deux dans le cabinet. `TOTAL_SEALS = STATIONS.length` et la porte finale
  s'ouvre quand `seals.length >= TOTAL_SEALS`.
- **Deux postes sont conditionnés** par `Station.gate` : `power` (le banc
  d'Ampère attend `powerRestored`), `energy-case` (la piste de Joule attend la
  clé de la vitrine, qui la déverrouille au premier passage).
- **Les secrets de la partie** (`codeDigits`, `safeRiddle`, `breakers`) sont
  tirés dans `startIntro`, après un geste utilisateur : ils ne sont donc
  jamais rendus côté serveur et ne peuvent pas diverger à l'hydratation.
- **`codeDigits` est ordonné chronologiquement** (Archimède, Galilée, Newton,
  Curie) ; `InspectContent.codeIndex` désigne le rang du savant, et le carnet
  affiche les chiffres dans l'ordre de découverte, pas dans l'ordre du code.
- **Une seule fenêtre à la fois.** `status === "modal"` implique
  `modal !== null`, et `closeModal` remet les deux à zéro ensemble.
- **La question est tirée à l'ouverture du poste** et mémorisée dans
  `assignedPuzzleIds` ; l'ordre des propositions dans `answerOrders`.
- **`errors` compte toutes les fautes** : mauvaise réponse, code faux,
  combinaison fausse, disjoncteur mal réarmé. `attempts` ne compte que les
  réponses aux postes et sert à la précision de l'écran de fin.
- **`footprint` et les boîtes de collision sont en repère monde**, jamais
  tournées par `rotationY`.
- **Un objet n'est visé que s'il a encore quelque chose à offrir** :
  `isInteractableAvailable` écarte un poste résolu, une porte ouverte, un
  coffre vide, un tableau électrique déjà réarmé, et n'expose le mur UV qu'au
  porteur de la lampe.

---

## 2. Machine d'état de la partie

```mermaid
stateDiagram-v2
    [*] --> idle

    idle --> intro : startIntro, bouton Commencer, tirage des secrets
    intro --> intro : nextIntroStep
    intro --> playing : beginSession, sur onLock après Entrer dans la galerie
    playing --> paused : pause, sur onUnlock non provoqué par le jeu
    paused --> playing : beginSession, sur onLock après Reprendre
    playing --> modal : interact, touche E sur un objet visé
    modal --> modal : selectAnswer, retryPuzzle, submitCode, submitSafe, armBreaker
    modal --> locking : closeModal
    locking --> playing : beginSession, sur onLock repris dans le même geste
    locking --> paused : pause, requestLock refusé par le navigateur
    playing --> finale : enterFinale, le joueur monte sur l'estrade
    finale --> finale : advanceHologram
    finale --> won : finish, bouton Voir le classement
    won --> idle : reset, bouton Rejouer

    playing --> playing : setFocused, setCurrentRoom, toggleCarnet
```

Gardes vérifiées dans `useGameStore.ts` :

- `beginSession` n'agit que depuis `intro`, `paused` ou `locking`, et fixe
  `startedAt` au premier passage.
- `interact` exige `playing`, un objet connu et disponible, puis aiguille selon
  `kind` : un poste ouvre sa question (ou refuse avec une notification si sa
  condition n'est pas remplie), un objet ouvre sa fiche et note l'indice, le
  bureau donne la lampe UV, la porte ouvre le cadenas, le coffre et le tableau
  électrique ouvrent leur fenêtre (le tableau exige le fusible), le mur UV
  révèle et ouvre le message.
- `submitCode`, `submitSafe` et `armBreaker` comptent une erreur en cas
  d'échec ; `armBreaker` remet aussi les disjoncteurs à zéro.
- `enterFinale` n'agit que depuis `playing` et fixe `finishedAt`.
- `reset` repart de l'état initial ; les secrets sont retirés au prochain
  `startIntro`.

---

## 3. Architecture des composants

```mermaid
flowchart TD
    subgraph L1["Route, rendu serveur"]
        layout["app/layout.tsx, polices et metadata"]
        page["app/page.tsx"]
    end

    subgraph L2["Interface DOM"]
        screen["GameScreen.tsx"]
        hud["ui/Hud, SealTracker"]
        aim["ui/Crosshair, InteractionPrompt, Toasts, Carnet"]
        overlays["ui/TitleOverlay, IntroOverlay, PauseOverlay, VictoryOverlay"]
        dialogs["ui/PuzzleDialog, InspectDialog, CodeLockDialog, SafeDialog, FuseBoxDialog, HologramDialog"]
        shell["components/ui/ModalShell, Dial, Button"]
    end

    subgraph L3["Scène 3D"]
        canvas["GameCanvas.tsx"]
        world["scene/World, coque"]
        doors["scene/Doors"]
        lights["scene/Lights, Effects"]
        rooms["scene/rooms, décor par espace"]
        decor["scene/decor, tableaux, vitrines, meubles, hologramme"]
        stations["scene/StationProp et props/"]
        player["scene/Player, useFrame"]
    end

    subgraph L4["Hooks"]
        hlock["usePointerLock"]
        hkeys["useGameHotkeys"]
        haudio["useGameAudio"]
        hmove["useMovementKeys"]
    end

    subgraph L5["État et données"]
        store["state/useGameStore"]
        data["data/world, stations, interactables, clues, colliders, puzzles"]
        logic["logic/escape, objective, renderQuality"]
        lib["lib/collision, leaderboard, audio, motion"]
    end

    layout --> page
    page --> screen
    screen -->|"next/dynamic, ssr false"| canvas
    screen --> hud
    screen --> aim
    screen --> overlays
    screen --> dialogs
    dialogs --> shell
    screen --> hlock
    screen --> hkeys
    screen --> haudio

    canvas --> world
    canvas --> doors
    canvas --> lights
    canvas --> rooms
    rooms --> decor
    canvas --> stations
    canvas --> player
    canvas --> logic
    player --> hmove

    screen --> store
    canvas --> store
    rooms --> store
    stations --> store
    hkeys --> store
    haudio --> store
    player -.->|"getState dans useFrame"| store

    store --> data
    store --> logic
    player --> data
    world --> data
    screen --> logic
    haudio --> lib
    store --> lib
```

Points de lecture :

- La salle et le schéma d'une question sont deux `<Canvas>` distincts. Dès
  qu'un écran recouvre la salle (titre, introduction, pause, fenêtre,
  victoire), `GameCanvas` passe en `frameloop="demand"`.
- Le cabinet et la salle de l'hologramme sortent du rendu et de la passe
  d'ombre tant que leur porte est close. `<Preload all />` compile pourtant
  leurs shaders et envoie leurs textures dès le chargement : l'ouverture d'une
  porte ne provoque pas d'à-coup.
- `PerformanceMonitor` mesure la cadence réelle et, via
  `logic/renderQuality`, abaisse la densité de pixels puis l'anticrénelage du
  post-traitement sur les machines modestes.
- `Player` ne s'abonne pas au store : il le lit par `getState()` dans
  `useFrame`, calcule la pièce courante, l'objet visé (distance au sol et angle
  en trois dimensions) et le déclenchement de la finale sur l'estrade.
- Le décor de chaque espace est un composant de `scene/rooms` qui s'abonne aux
  seuls booléens qui le concernent (courant, coffre, message UV).
- Les textes gravés en 3D (cartels, enseignes, message UV) sont des
  `CanvasTexture` produites par `useTextTexture`, avec les polices du site.
- `debug.ts` expose le store, la caméra et la scène sur `window` en
  développement, pour les parcours automatisés.

---

## 4. Flux d'une interaction

```mermaid
sequenceDiagram
    autonumber
    actor Joueur
    participant Player as Player dans useFrame
    participant Keys as useGameHotkeys
    participant Store as useGameStore
    participant Screen as GameScreen
    participant Lock as usePointerLock
    participant Dialog as Fenêtre ouverte

    Player->>Player: pièce courante, objet le mieux aligné et disponible
    Player->>Store: setFocused(id)
    Store-->>Screen: focusedId
    Screen->>Screen: réticule ouvert, invite verbe + libellé

    Joueur->>Keys: touche E
    Keys->>Store: interact(id)
    Store->>Store: aiguillage selon kind, gardes, tirages
    Store-->>Screen: status modal et modal.kind

    Screen->>Lock: releaseLock
    Screen->>Dialog: props issues du store

    Joueur->>Dialog: réponse, code, combinaison, disjoncteur
    Dialog->>Store: selectAnswer / submitCode / submitSafe / armBreaker
    Store-->>Dialog: résultat, erreurs, notifications

    Joueur->>Dialog: Échap ou bouton de fermeture
    Dialog->>Screen: onClose
    Screen->>Store: closeModal, status locking
    Screen->>Lock: requestLock dans le même geste
    alt verrouillage obtenu
        Lock-->>Screen: onLock
        Screen->>Store: beginSession, status playing
    else refusé
        Screen->>Store: pause
    end
```

---

## 5. Tableau des modules

| Dossier                                 | Rôle                                                              | Dépendances autorisées                                                     | Interdits                              |
| --------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| `src/app`                               | Route unique : `layout`, `page`, `error`, `not-found`.            | `features/game/components/GameScreen`                                      | Le store, les données, three.js        |
| `src/components/ui`                     | Primitives partagées : `Button`, `Eyebrow`, `ModalShell`, `Dial`. | `lib`, `hooks`                                                             | Le domaine, le store, three.js         |
| `src/hooks`                             | Hooks génériques : piège à focus, classement.                     | `lib`, React                                                               | Le domaine                             |
| `src/features/game/components`          | `GameScreen` compose, `GameCanvas` ouvre le `<Canvas>`.           | `state`, `data`, `logic`, `hooks`, sous-dossiers, `lib`                    | -                                      |
| `src/features/game/components/scene`    | Coque, portes, lumières, joueur, postes, décor.                   | `data`, `state`, `hooks`, `lib`, `types`, `debug`                          | `components/ui`, `components/diagrams` |
| `src/features/game/components/diagrams` | Schémas 3D des questions.                                         | `types`, `lib`, `hooks/useFocusTrap`                                       | Le store, `data`, `components/scene`   |
| `src/features/game/components/ui`       | HUD, carnet, notifications, overlays, fenêtres.                   | `components/ui`, `data`, `logic`, `hooks`, `lib`, `diagrams/DiagramViewer` | `components/scene`, three.js           |
| `src/features/game/data`                | Monde, postes, interactables, textes, collisions, questions.      | `types`, `lib/collision`                                                   | Les composants, le store, React        |
| `src/features/game/logic`               | Tirages des énigmes, objectif, formatage.                         | `types`, `lib/shuffle`, `data/stations`                                    | Les composants, le store               |
| `src/features/game/hooks`               | Clavier, interaction, Pointer Lock, son.                          | `state`, `lib`, React, drei (type)                                         | Les composants, `data`                 |
| `src/features/game/state`               | Store Zustand : état, actions, sélecteurs.                        | `data`, `logic`, `lib`, `types`                                            | Les composants, three.js, React        |
| `src/lib`                               | Logique pure : collisions, classement, audio, mouvement, `cn`.    | `clsx`, `tailwind-merge`, `types`                                          | Tout le domaine                        |
| `src/types`                             | Modèle de domaine partagé.                                        | Aucun import                                                               | Tout le reste                          |

### Écarts connus

- `DiagramKind` reste un alias de `string` et `DIAGRAM_SCENES` un `Record` à
  clés libres : rien à la compilation ne garantit qu'un `diagram.kind`
  corresponde à une scène enregistrée, d'où la garde « Schéma indisponible ».
- `pickPuzzle` exclut les questions déjà tirées tous thèmes confondus ; le
  résultat est correct puisque les identifiants sont uniques.
- Les positions du décor (`scene/rooms`) et celles des interactables
  (`data/interactables.ts`) sont déclarées à deux endroits : un objet déplacé
  doit l'être dans les deux.
