import type { Locale } from "@/i18n/config";
import enChaleur from "@/i18n/messages/en/chaleur.json";
import enCinematique from "@/i18n/messages/en/cinematique.json";
import enElectricite from "@/i18n/messages/en/electricite.json";
import enEnergie from "@/i18n/messages/en/energie.json";
import enForces from "@/i18n/messages/en/forces.json";
import enMuseum from "@/i18n/messages/en/museum.json";
import enPression from "@/i18n/messages/en/pression.json";
import enUi from "@/i18n/messages/en/ui.json";
import frChaleur from "@/i18n/messages/fr/chaleur.json";
import frCinematique from "@/i18n/messages/fr/cinematique.json";
import frElectricite from "@/i18n/messages/fr/electricite.json";
import frEnergie from "@/i18n/messages/fr/energie.json";
import frForces from "@/i18n/messages/fr/forces.json";
import frMuseum from "@/i18n/messages/fr/museum.json";
import frPression from "@/i18n/messages/fr/pression.json";
import frUi from "@/i18n/messages/fr/ui.json";

/*
 * Catalogue des messages, réservé au serveur : `i18n/request` n'en transmet au
 * client que la langue active. Un composant client n'importe d'ici que des
 * types, jamais une valeur, sous peine d'embarquer les deux langues.
 *
 * Chaque langue est découpée en fichiers indépendants (interface, musée, un
 * fichier par thème de physique) : les thèmes fusionnent leurs questions sous
 * `puzzles` et les légendes de leurs schémas sous `diagrams`.
 */

const FR = {
  ui: frUi,
  museum: frMuseum,
  puzzles: {
    ...frForces.puzzles,
    ...frCinematique.puzzles,
    ...frElectricite.puzzles,
    ...frEnergie.puzzles,
    ...frPression.puzzles,
    ...frChaleur.puzzles,
  },
  diagrams: {
    ...frForces.diagrams,
    ...frCinematique.diagrams,
    ...frElectricite.diagrams,
    ...frEnergie.diagrams,
    ...frPression.diagrams,
    ...frChaleur.diagrams,
  },
};

/** Forme des messages, calquée sur le français, langue source du jeu. */
export type Messages = typeof FR;

/**
 * Le typage en `Messages` fait échouer la compilation si une clé française
 * manque en anglais.
 */
const EN: Messages = {
  ui: enUi,
  museum: enMuseum,
  puzzles: {
    ...enForces.puzzles,
    ...enCinematique.puzzles,
    ...enElectricite.puzzles,
    ...enEnergie.puzzles,
    ...enPression.puzzles,
    ...enChaleur.puzzles,
  },
  diagrams: {
    ...enForces.diagrams,
    ...enCinematique.diagrams,
    ...enElectricite.diagrams,
    ...enEnergie.diagrams,
    ...enPression.diagrams,
    ...enChaleur.diagrams,
  },
};

export const MESSAGES: Readonly<Record<Locale, Messages>> = { fr: FR, en: EN };
