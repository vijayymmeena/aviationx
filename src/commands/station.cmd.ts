import type { CommandInteraction } from "discord.js";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  Message,
} from "discord.js";
import type { SimpleCommandMessage } from "discordx";
import {
  Discord,
  SimpleCommand,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
} from "discordx";

import { ErrorMessages, supportRow } from "../utils/static.js";
import { getICAO, searchICAO } from "../utils/stations.js";

@Discord()
export class Example {
  @SimpleCommand({
    description: "Obtain station information for a given CIAO code",
    name: "station",
  })
  simpleMetar(
    @SimpleCommandOption({ name: "icao", type: SimpleCommandOptionType.String })
    icao: string | undefined,
    command: SimpleCommandMessage,
  ): void {
    !icao
      ? void command.sendUsageSyntax()
      : void this.handler(command.message, icao);
  }

  @Slash({
    description: "Obtain station information for a given CIAO code",
    name: "station",
  })
  station(
    @SlashOption({
      autocomplete: searchICAO,
      description: "Enter ICAO code",
      name: "station",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    icao: string,
    interaction: CommandInteraction,
  ): void {
    void this.handler(interaction, icao);
  }

  async handler(
    interaction: CommandInteraction | Message,
    icao: string,
  ): Promise<void> {
    const isMessage = interaction instanceof Message;
    if (!isMessage) {
      await interaction.deferReply();
    }

    const station = getICAO(icao);
    if (!station) {
      !isMessage
        ? await interaction.followUp({
            components: [supportRow],
            content: ErrorMessages.InvalidICAOMessage,
          })
        : await interaction.reply({
            components: [supportRow],
            content: ErrorMessages.InvalidICAOMessage,
          });
      return;
    }

    const embed = new EmbedBuilder();
    embed.setTitle(`${station.site}, ${station.country} (${station.icaoId})`);

    // wmo_id
    if (station.wmoId) {
      embed.addFields({ name: "WMO Id", value: `${station.wmoId}` });
    }

    // Location
    embed.addFields({
      name: "Location",
      value:
        `[Google Map](http://maps.google.com/maps?q=${station.lat},${station.lon})` +
        ` (${station.lat.toFixed(2)}, ${station.lon.toFixed(2)})`,
    });

    // State
    if (station.state) {
      embed.addFields({ name: "State", value: `${station.state}` });
    }

    // Country
    embed.addFields({ name: "Country", value: `${station.country}` });

    // Type
    embed.addFields({
      name: "Elevation",
      value: `${station.elev} meters MSL`,
    });

    // Source
    embed.addFields({
      name: "Source",
      value: "[Aviation Weather](https://aviationweather.gov)",
    });

    // send
    !isMessage
      ? await interaction.followUp({ embeds: [embed] })
      : await interaction.reply({ embeds: [embed] });
  }
}
