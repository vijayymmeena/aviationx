import {
  Bot,
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  Slash,
  SlashOption,
} from "discordx";
import { CommandInteraction, Message, MessageEmbed } from "discord.js";
import { Client as AwClient } from "aviationweather";
import { ErrorMessages } from "./utils/static";

@Discord()
@Bot("aviationx")
export class buttonExample {
  @SimpleCommand("station", {
    description: "Obtain station information for a given CIAO code",
  })
  simpleMetar(
    @SimpleCommandOption("icao", { type: "STRING" }) icao: string | undefined,
    command: SimpleCommandMessage
  ): void {
    !icao ? command.sendUsageSyntax() : this.handler(command.message, icao);
  }

  @Slash("station", {
    description: "Obtain station information for a given CIAO code",
  })
  station(
    @SlashOption("station", { description: "Enter ICAO code", required: true })
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
        ? interaction.followUp(ErrorMessages.InvalidIcaoMsg)
        : interaction.reply(ErrorMessages.InvalidIcaoMsg);
      return;
    }

    const embed = new MessageEmbed();
    embed.setTitle(
      `${station.site}, ${station.country} (${station.station_id})`
    );

    // wmo_id
    if (station.wmo_id) {
      embed.addField("WMO Id", `${station.wmo_id}`);
    }

    // Location
    embed.addField(
      "Location",
      `[Google Map](http://maps.google.com/maps?q=${station.latitude},${station.longitude})` +
        ` (${station.latitude.toFixed(2)}, ${station.longitude.toFixed(2)})`
    );

    // State
    if (station.state) {
      embed.addField("State", `${station.state}`);
    }

    // Country
    embed.addField("Country", `${station.country}`);

    // Type
    embed.addField("Site type", `${station.site_type}`);

    // Type
    embed.addField("Elevation", `${station.elevation_m} meters MSL`);

    // Source
    embed.addField(
      "Source",
      `[Aviation Weather](${aw.URI.AW({
        datasource: "STATIONS",
        stationString: station.station_id,
      })})`
    );

    // send
    !isMessage
      ? interaction.followUp({ embeds: [embed] })
      : interaction.reply({ embeds: [embed] });
  }
}
