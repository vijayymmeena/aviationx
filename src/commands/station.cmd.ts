import { Client as AwClient } from "aviationweather";
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

import { searchICAO } from "../utils/common.js";
import { ErrorMessages, supportRow } from "../utils/static.js";

@Discord()
export class Example {
  @SimpleCommand({
    description: "Obtain station information for a given CIAO code",
    name: "station",
  })
  simpleMetar(
    @SimpleCommandOption({ name: "icao", type: SimpleCommandOptionType.String })
    icao: string | undefined,
    command: SimpleCommandMessage
  ): void {
    !icao ? command.sendUsageSyntax() : this.handler(command.message, icao);
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
    interaction: CommandInteraction
  ): void {
    this.handler(interaction, icao);
  }

  async handler(
    interaction: CommandInteraction | Message,
    icao: string
  ): Promise<void> {
    const isMessage = interaction instanceof Message;
    if (!isMessage) {
      await interaction.deferReply();
    }

    const aw = new AwClient();
    const stations = await aw.AW({
      datasource: "STATIONS",
      stationString: icao,
    });
    const station = stations[0];
    if (!station) {
      !isMessage
        ? interaction.followUp({
            components: [supportRow],
            content: ErrorMessages.InvalidICAOMessage,
          })
        : interaction.reply({
            components: [supportRow],
            content: ErrorMessages.InvalidICAOMessage,
          });
      return;
    }

    const embed = new EmbedBuilder();
    embed.setTitle(
      `${station.site}, ${station.country} (${station.station_id})`
    );

    // wmo_id
    if (station.wmo_id) {
      embed.addFields({ name: "WMO Id", value: `${station.wmo_id}` });
    }

    // Location
    embed.addFields({
      name: "Location",
      value:
        `[Google Map](http://maps.google.com/maps?q=${station.latitude},${station.longitude})` +
        ` (${station.latitude.toFixed(2)}, ${station.longitude.toFixed(2)})`,
    });

    // State
    if (station.state) {
      embed.addFields({ name: "State", value: `${station.state}` });
    }

    // Country
    embed.addFields({ name: "Country", value: `${station.country}` });

    // Type
    embed.addFields({ name: "Site type", value: `${station.site_type}` });

    // Type
    embed.addFields({
      name: "Elevation",
      value: `${station.elevation_m} meters MSL`,
    });

    // Source
    embed.addFields({
      name: "Source",
      value: `[Aviation Weather](${aw.URI.AW({
        datasource: "STATIONS",
        stationString: station.station_id,
      })})`,
    });

    // send
    !isMessage
      ? interaction.followUp({ embeds: [embed] })
      : interaction.reply({ embeds: [embed] });
  }
}
