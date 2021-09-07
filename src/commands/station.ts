import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Client as AwClient } from "aviationweather";

@Discord()
export class buttonExample {
  @Slash("station", {
    description: "Obtain station information for a given CIAO id",
  })
  async hello(
    @SlashOption("station", { description: "Enter ICAO code", required: true })
    icao: string,
    interaction: CommandInteraction
  ): Promise<void> {
    const aw = new AwClient();
    const stations = await aw.AW({
      datasource: "STATIONS",
      stationString: icao,
    });
    const station = stations[0];
    if (!station) {
      interaction.reply(
        "Looks like invalid ICAO code, Please raise an issue on github if the bot does not display information for valid ICAO codes\n\nhttps://github.com/oceanroleplay/aviationx"
      );
      return;
    }

    const embed = new MessageEmbed();
    embed.setTitle(`${station.site} (${station.station_id})`);

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
    interaction.reply({ embeds: [embed] });
  }
}
