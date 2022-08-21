import axios from "axios";
import type { AutocompleteInteraction } from "discord.js";

export async function searchICAO(
  command: AutocompleteInteraction
): Promise<void> {
  const text = String(command.options.getFocused());
  const response = await axios
    .get<string[]>(
      `https://aircharterguide-api.tuvoli.com/api/v1/airport/all?searchText=${text}`
    )
    .then((res) => res.data)
    .catch(() => null);

  if (!response) {
    command.respond([]).catch(() => null);
    return;
  }

  const list = response.slice(0, 24);

  command
    .respond(
      list.map((item) => ({
        name: item,
        value: /^\[(.*?)\]/.exec(item)?.[1] ?? text,
      }))
    )
    .catch(() => null);
}
