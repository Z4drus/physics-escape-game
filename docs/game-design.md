# Game design : Le Cabinet de Physique

Escape game 3D à la première personne dans un musée de physique parisien, en
fin de journée. Six questions de physique restent le cœur pédagogique ; autour
d'elles, des mécaniques d'escape game classiques (fouille, code, coffre,
fusibles, lampe UV, inventaire) donnent du mouvement et relient les pièces.

## Histoire

Le joueur est un adolescent passionné de physique. Le musée organise un escape
game dont les vainqueurs rencontrent Albert Einstein en hologramme. Le classement
récompense le temps le plus court et le moins d'erreurs. Ses amis ont décliné,
le surveillant ricane : « Seul ? Bonne chance. » Les portes se referment.

L'introduction tient en trois cartes courtes (annonce, file d'attente, portes
qui se ferment). La fin est un court dialogue avec l'hologramme, puis le score
et un classement local.

## Les trois espaces

| Espace                  | Dimensions | Rôle                                                                                                                                                                 |
| ----------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Galerie des instruments | 16 × 14 m  | Départ. Quatre postes, quatre tableaux, buste, bureau du surveillant, tableau électrique. Hautes fenêtres à l'ouest, porte finale au nord, porte du cabinet à l'est. |
| Cabinet du conservateur | 6 × 6 m    | Verrouillé par un cadenas à quatre chiffres. Deux postes, bureau, bibliothèque, coffre, message invisible sur le mur.                                                |
| Salle de l'hologramme   | 8 × 7 m    | Porte à six sceaux. Estrade circulaire, hologramme d'Einstein, fin de partie.                                                                                        |

## Chaîne de progression

1. **Galerie.** Deux postes accessibles d'emblée (forces, cinématique) donnent
   deux sceaux. Le banc d'électricité est hors tension, la vitrine d'énergie est
   fermée à clé.
2. **Le code.** Quatre tableaux (Archimède, Galilée, Newton, Curie) cachent
   chacun un chiffre au dos du cadre. La plaque près de la porte du cabinet
   indique l'ordre : du plus ancien au plus récent. Les dates figurent sur les
   cartels. Le code est tiré au hasard à chaque partie.
3. **La lampe UV** se trouve dans le tiroir du bureau du surveillant, près de
   l'entrée.
4. **Cabinet.** Deux postes (pression, chaleur) donnent deux sceaux. La lampe UV
   révèle sur le mur une énigme numérique : l'énergie potentielle, en joules,
   d'une masse posée à une certaine hauteur (valeurs tirées au hasard, g = 10).
   Le résultat est la combinaison à trois chiffres du coffre.
5. **Le coffre** contient le fusible principal et la clé de la vitrine
   d'énergie.
6. **Retour en galerie.** Le fusible remis, le tableau électrique demande de
   réarmer quatre disjoncteurs par puissance croissante (mélange de W et de kW).
   Le courant revient : les lustres s'allument, le banc d'électricité s'éveille.
   Deux derniers postes, deux derniers sceaux.
7. **Porte finale.** Six sceaux, la porte s'ouvre. L'hologramme s'active quand
   le joueur monte sur l'estrade. Dialogue, score, classement.

## Erreurs et score

Une erreur est une mauvaise réponse à un poste, un code faux, ou un disjoncteur
réarmé dans le mauvais ordre. Le chronomètre démarre à l'entrée dans la galerie
et s'arrête à l'activation de l'hologramme. Le classement local (localStorage)
trie par erreurs puis par temps.

## Interactions

| Touche      | Action                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| ZQSD / WASD | Se déplacer                                                                  |
| Maj         | Courir                                                                       |
| E           | Interagir avec l'objet visé (analyser, inspecter, prendre, ouvrir, éclairer) |
| Tab         | Ouvrir ou fermer le carnet (sceaux, indices, objets)                         |
| Échap       | Fermer une fenêtre, sinon pause                                              |

Le carnet remplace l'inventaire classique : il liste les sceaux, les chiffres
découverts avec le nom du savant, l'énigme du coffre une fois révélée et les
objets ramassés. Les objets s'utilisent automatiquement sur la bonne cible.

## Direction artistique

Musée français du début du XXe siècle : parquet, murs enduits crème à
soubassement de noyer, moulures, hautes fenêtres cintrées sur un crépuscule
parisien, laiton, vitrines vitrées, lustres. Lumière chaude à l'intérieur, bleue
dehors. Les postes gardent leurs mécanismes animés mais passent au bois sombre
et au laiton. L'hologramme est cyan, seule touche froide du jeu, réservée à la
finale et aux schémas.

Interface : mêmes rayons et mêmes surfaces de verre que le système d'origine,
palette réchauffée (parchemin, noyer, laiton, vert bouteille), titres en
Fraunces, corps en Geist, chiffres en Geist Mono.

## Assets

Les textures PBR viennent de Poly Haven (CC0), les portraits, instruments et
décors sont générés avec Magnific puis convertis en modèles 3D pour le buste et
les instruments. Les sources exactes sont listées dans `sources.md`.
