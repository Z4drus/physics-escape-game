# Sources des assets

Tout ce qui n'est pas dessiné en code dans le musée vient d'une des sources
ci-dessous. Les fichiers sont servis depuis `public/` après conversion en WebP
(images, 1024 px) ou après optimisation pour le temps réel (modèles GLB, voir
plus bas).

## Textures PBR (Poly Haven, CC0)

| Asset               | Usage                                                                      | Source                                      | Licence | Auteur                                        |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------- | ------- | --------------------------------------------- |
| herringbone_parquet | Parquet à chevrons de la galerie et du cabinet (`public/textures/parquet`) | https://polyhaven.com/a/herringbone_parquet | CC0     | Sergej Majboroda, Jenelle van Heerden         |
| beige_wall_001      | Enduit des murs (`public/textures/plaster`)                                | https://polyhaven.com/a/beige_wall_001      | CC0     | Dimitrios Savva, Rico Cilliers                |
| dark_wood           | Soubassements et boiseries (`public/textures/wood`)                        | https://polyhaven.com/a/dark_wood           | CC0     | Dimitrios Savva, Rico Cilliers, Dario Barresi |
| marble_01           | Sol de la salle de l'hologramme (`public/textures/marble`)                 | https://polyhaven.com/a/marble_01           | CC0     | Rob Tuytel                                    |

Chaque dossier contient `diffuse.webp`, `normal.webp` (normale OpenGL) et
`rough.webp`, qui est la carte ARM de Poly Haven (occlusion en rouge, rugosité
en vert, métal en bleu) : three.js lit la rugosité dans le canal vert.

## Modèles 3D

| Asset                                               | Usage                                                             | Source                                                                        | Licence            | Auteur                                           |
| --------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ | ------------------------------------------------ |
| Galvanomètre à tangente Western Electric, vers 1870 | Vitrine de l'angle nord-ouest (`public/models/galvanometer.glb`)  | https://3d-api.si.edu/voyager/3d_package:b8360103-172b-4ab2-a6ac-ab7ee9786876 | CC0                | Smithsonian, National Museum of American History |
| Bobine d'induction de Page (brevet 76654)           | Vitrine de l'angle nord-est (`public/models/induction-coil.glb`)  | https://3d-api.si.edu/voyager/3d_package:40cf5b52-0b21-4063-95fc-aa07998eb4dd | CC0                | Smithsonian, National Museum of American History |
| Buste d'Archimède                                   | Piédestal central (`public/models/bust-archimede.glb`)            | Généré avec Magnific (image Seedream 5 Pro, puis image→3D Tripo v3.1)         | Création du projet | Magnific, projet « Physics Escape Museum »       |
| Buste d'Einstein                                    | Hologramme de la salle finale (`public/models/bust-einstein.glb`) | Généré avec Magnific (image Nano Banana 2 Lite, puis Tripo v3.1)              | Création du projet | Magnific                                         |
| Sphère armillaire                                   | Vitrine centrale (`public/models/armillary.glb`)                  | Généré avec Magnific (Seedream 5 Pro, puis Tripo v3.1)                        | Création du projet | Magnific                                         |
| Lunette astronomique                                | Piédestal bas près des fenêtres (`public/models/telescope.glb`)   | Généré avec Magnific (Seedream 5 Pro, puis Tripo v3.1)                        | Création du projet | Magnific                                         |

Les licences Smithsonian se lisent sur le miroir Open Access
(`smithsonian-open-access.s3-us-west-2.amazonaws.com/metadata/edan/nmah/`), où
l'entrée `3d_voyager` de chaque objet est marquée CC0.

Les modèles sont allégés avec glTF Transform avant d'être servis : textures
ramenées à 1024 px, géométrie compressée en Meshopt, dont le décodeur est
embarqué par three.js (aucun téléchargement externe, contrairement à Draco).
Les deux instruments Smithsonian, numérisés à 150 000 triangles, sont
simplifiés à 18 000 (`weld`, puis `simplify --ratio 0.12 --error 0.002`). Le
buste d'Einstein, rendu par le shader de l'hologramme, perd sa texture, qui ne
servait pas.

## Images générées (Magnific, projet « Physics Escape Museum »)

| Asset                                           | Usage                                              | Modèle             |
| ----------------------------------------------- | -------------------------------------------------- | ------------------ |
| `public/images/paintings/archimede.webp`        | Portrait de la galerie, énigme du code             | Seedream 5 Pro     |
| `public/images/paintings/galilee.webp`          | Portrait de la galerie, énigme du code             | Seedream 5 Pro     |
| `public/images/paintings/newton.webp`           | Portrait de la galerie, énigme du code             | Seedream 5 Pro     |
| `public/images/paintings/curie.webp`            | Portrait de la galerie, énigme du code             | Seedream 5 Pro     |
| `public/images/decor/paris-panorama-west.webp`  | Panorama des baies ouest, repris en miroir à l'est | Nano Banana Pro    |
| `public/images/decor/paris-panorama-south.webp` | Panorama des baies sud                             | Nano Banana Pro    |
| `public/images/decor/paris-rooftops.webp`       | Rangée de toits détourée, en avant des panoramas   | Nano Banana Pro    |
| `public/images/decor/chalkboard.webp`           | Tableau noir du cabinet                            | GPT 2              |
| `public/images/decor/poster.webp`               | Affiche Art déco de l'exposition                   | Recraft V4.1       |
| `public/images/decor/parchment.webp`            | Fond des fiches, des cartes du récit et du carnet  | Nano Banana 2 Lite |
| `public/images/decor/einstein-hologram.webp`    | Portrait du dialogue final                         | Nano Banana 2 Lite |

## Polices (Google Fonts, licence OFL 1.1)

| Police     | Usage                                              |
| ---------- | -------------------------------------------------- |
| Fraunces   | Titres, cartels, enseignes (axes opsz, SOFT, WONK) |
| Geist      | Corps de texte                                     |
| Geist Mono | Chiffres, unités, valeurs mesurées                 |

## Pistes non retenues

Vérifiées mais non utilisées, au cas où le musée s'agrandit : Kenney Furniture
Kit et Graveyard Kit (CC0, https://kenney.nl/assets), modèles Quaternius et
CreativeTrio sur poly.pizza (CC0), packs audio Kenney (CC0), HDRI
`museum_of_ethnography` (Poly Haven, CC0), textures ambientCG Metal034,
Paper006, PaintedPlaster003 (CC0).
