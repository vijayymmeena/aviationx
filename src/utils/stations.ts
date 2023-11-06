import { stations } from "aviationweather";
import type { AutocompleteInteraction } from "discord.js";
import Fuse from "fuse.js";

const fuse = new Fuse(stations, {
  keys: [
    { name: "icaoId", weight: 2 },
    { name: "site", weight: 1 },
  ],
});

export function searchICAO(command: AutocompleteInteraction): void {
  const text = String(command.options.getFocused());
  const results = fuse.search(text);

  const list = results.slice(0, 24);

  command
    .respond(
      list.map(({ item }) => ({
        name: `${item.site} (${item.icaoId})`,
        value: item.icaoId,
      }))
    )
    .catch(() => null);
}

export function getICAO(code: string): (typeof stations)[number] | undefined {
  return stations.find((t) => t.icaoId.toLowerCase() === code.toLowerCase());
}
