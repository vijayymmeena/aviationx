import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Client as AwClient } from "aviationweather";
import { sendPaginatedEmbeds } from "@discordx/utilities";

@Discord()
export class buttonExample {
  @Slash("metar")
  async hello(
    @SlashOption("station", { description: "Enter ICAO code", required: true })
    icao: string,
    @SlashOption("hourbefore", { description: "Hours between 1 to 48" })
    hourBefore: number,
    interaction: CommandInteraction
  ): Promise<void> {
    // fix hour
    if (!hourBefore || hourBefore < 1 || hourBefore > 48) hourBefore = 1;

    const aw = new AwClient();
    const searchStation = await aw.AW({
      datasource: "STATIONS",
      stationString: icao,
    });

    // fetch station info
    const station = searchStation[0];
    if (!station) {
      return interaction.reply(
        "Looks like invalid ICAO code, Please raise an issue on github if the bot does not display information for valid ICAO codes\n\nhttps://github.com/oceanroleplay/aviationx"
      );
    }

    // fetch metar info
    const response = await aw.AW({
      datasource: "METARS",
      stationString: station.station_id,
      hoursBeforeNow: hourBefore,
    });

    // if no info found
    if (!response.length) {
      return interaction.reply(
        `Data not available for ${station.site} (${station.station_id})`
      );
    }

    // response.forEach(console.log);
    const allPages = response.map((metarData) => {
      // prepare embed
      const embed = new MessageEmbed();
      embed.setTitle(`${station.site} (${station.station_id})`);

      // raw text
      embed.addField("Raw Text", metarData.raw_text);

      // Cloud
      const cloudInfo = metarData.sky_condition.length
        ? metarData.sky_condition
            .map((info) => {
              return (
                `${info.sky_cover ?? "NaN"}` +
                (info.cloud_base_ft_agl
                  ? ` (${info?.cloud_base_ft_agl} ft)`
                  : "")
              );
            })
            .join("\n")
        : "Data not available";
      embed.addField("Cloud", cloudInfo);

      // Wind
      embed.addField(
        "Wind",
        `${metarData.wind_dir_degrees}° ${metarData.wind_speed_kt}kt`
      );

      // Altimeter
      embed.addField(
        "Altimeter",
        `${(metarData.altim_in_hg * 33.863886666667).toFixed(2)} hPa` +
          ` (${metarData.altim_in_hg.toFixed(2)} inHg)`
      );

      // Temperature
      embed.addField(
        "Temperature",
        `${metarData.temp_c}°C (Dewpoint: ${metarData.dewpoint_c}°C)`
      );

      // Flight Rule
      embed.addField(
        "Flight Rule",
        metarData.flight_category ?? "Data not available"
      );

      // Visibility
      embed.addField(
        "Visibility",
        metarData.visibility_statute_mi
          ? `${metarData.visibility_statute_mi.toFixed(2)} sm (${(
              metarData.visibility_statute_mi * 1.609344
            ).toFixed(2)} km)`
          : "Data not available"
      );

      // Location
      embed.addField(
        "Location",
        `[Google Map](http://maps.google.com/maps?q=${metarData.latitude},${metarData.longitude})` +
          ` (${metarData.latitude.toFixed(2)}, ${metarData.longitude.toFixed(
            2
          )})`
      );

      // Timestamp
      embed.setTimestamp(new Date(metarData.observation_time));

      // Footer advise
      embed.setFooter("This data should only be used for planning purposes");

      return embed;
    });

    if (allPages.length === 1) return interaction.reply({ embeds: allPages });
    else {
      sendPaginatedEmbeds(interaction, allPages);
    }
  }
}
