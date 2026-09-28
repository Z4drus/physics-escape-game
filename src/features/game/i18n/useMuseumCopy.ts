import { useTranslations, type Messages } from "next-intl";

import type {
  InspectContent,
  Interactable,
  InventoryItemId,
  PhysicsTopic,
  RoomId,
  SafeRiddle,
} from "@/types/game";

type Museum = Messages["museum"];
type StationKey = keyof Museum["stations"];
type SealKey = keyof Museum["seals"];
type ObjectKey = keyof Museum["objects"];
type BreakerKey = keyof Museum["breakers"];
type InspectKey = keyof Museum["inspect"];
/** Fiches dont les messages décrivent une image. */
type IllustratedKey = {
  [Key in InspectKey]: Museum["inspect"][Key] extends { imageAlt: string }
    ? Key
    : never;
}[InspectKey];

/** Textes d'une fiche d'inspection, dans la langue active. */
export interface InspectCopy {
  title: string;
  /** Cartel : dates, provenance. */
  caption: string;
  body: string;
  imageAlt: string;
}

/**
 * Noms et textes du musée (espaces, postes, objets, fiches, disjoncteurs),
 * lus sous `museum` dans la langue active.
 *
 * Les identifiants viennent des données, typés `string` : ils sont rattachés
 * ici, en un seul endroit, aux clés connues des messages.
 */
export function useMuseumCopy() {
  const t = useTranslations("museum");

  const station = (id: string) => t(`stations.${id as StationKey}`);

  return {
    room: (id: RoomId) => t(`rooms.${id}`),
    topic: (topic: PhysicsTopic) => t(`topics.${topic}`),
    station,
    seal: (id: string) => t(`seals.${id as SealKey}`),
    breaker: (id: string) => t(`breakers.${id as BreakerKey}`),
    /** Nom de l'objet visé : celui du poste, ou celui de l'objet du décor. */
    interactableName: (item: Interactable) =>
      item.kind === "station"
        ? station(item.id)
        : t(`objects.${item.id as ObjectKey}`),
    verb: (item: Interactable) => t(`verbs.${item.verb}`),
    item: (id: InventoryItemId) => ({
      name: t(`items.${id}.name`),
      description: t(`items.${id}.description`),
    }),
    /** Fiche d'inspection ; l'énigme du coffre complète le message du mur UV. */
    inspect: (content: InspectContent, riddle: SafeRiddle): InspectCopy => {
      const key = content.id as InspectKey;
      return {
        title: t(`inspect.${key}.title`),
        caption: t(`inspect.${key}.caption`),
        body: t(`inspect.${key}.body`, {
          mass: riddle.massKg,
          height: riddle.heightM,
        }),
        imageAlt: content.image
          ? t(`inspect.${key as IllustratedKey}.imageAlt`)
          : "",
      };
    },
  };
}
