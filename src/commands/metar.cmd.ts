import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Client as AwClient } from "aviationweather";
import { numSpoke } from "./utils/num2word";
import { sendPaginatedEmbeds } from "@discordx/utilities";

@Discord()
export class buttonExample {
  @Slash("metar", {
    description: "Obtain metar information for a given CIAO id",
  })
  async metar(
    @SlashOption("station", { description: "Enter ICAO code", required: true })
    icao: string,
    @SlashOption("hourbefore", { description: "Hours between 1 to 72" })
    hourBefore: number,
    interaction: CommandInteraction
  ): Promise<void> {
    await interaction.deferReply();

    // fix hour
    if (!hourBefore || hourBefore < 1 || hourBefore > 72) {
      hourBefore = 1;
    }

    const aw = new AwClient();
    const searchStation = await aw.AW({
      datasource: "STATIONS",
      stationString: icao,
    });

    // fetch station info
    const station = searchStation[0];
    if (!station) {
      interaction.followUp(
        "Looks like invalid ICAO code, Please raise an issue on github if the bot does not display information for valid ICAO codes\n\nhttps://github.com/oceanroleplay/aviationx"
      );
      return;
    }

    // fetch metar info
    const response = await aw.AW({
      datasource: "METARS",
      stationString: station.station_id,
      hoursBeforeNow: hourBefore,
    });

    // if no info found
    if (!response.length) {
      interaction.followUp(
        `Data not available for ${station.site} (${station.station_id})`
      );
      return;
    }

    // response.forEach(console.log);
    const allPages = response.map((metarData) => {
      // prepare embed
      const embed = new MessageEmbed();
      embed.setTitle(`${station.site} (${station.station_id})`);

      // raw text
      embed.addField("Raw Text", metarData.raw_text);
      const spoken: string[] = [];
      if (metarData.wind_dir_degrees) {
        spoken.push(
          `Winds ${numSpoke(metarData.wind_dir_degrees)} at ${
            metarData.wind_speed_kt
          }kt.`
        );
      }
      if (metarData.visibility_statute_mi) {
        spoken.push(
          `Visibility ${numSpoke(
            Number((metarData.visibility_statute_mi * 1.609344).toFixed(2))
          )} kilometers.`
        );
      }

      if (metarData.altim_in_hg) {
        spoken.push(
          `Altimeter ${numSpoke(
            Number((metarData.altim_in_hg * 33.863886666667).toFixed(2))
          )} hPa.`
        );
      }

      if (metarData.temp_c) {
        spoken.push(
          `Temperature ${numSpoke(metarData.temp_c)} degree celsius.`
        );
      }

      if (metarData.dewpoint_c) {
        spoken.push(`Dewpoint ${numSpoke(metarData.temp_c)} degree celsius.`);
      }
      embed.addField("Spoken", spoken.join(" "));

      // Cloud
      if (metarData.sky_condition.length) {
        const cloudInfo = metarData.sky_condition
          .map((info) => {
            return (
              `${aw.getSkyCondition(info.sky_cover).description} (${
                info.sky_cover
              })` +
              (info.cloud_base_ft_agl
                ? ` at ${info?.cloud_base_ft_agl} ft`
                : "")
            );
          })
          .join("\n");
        embed.addField("Cloud", cloudInfo);
      }

      // Wind
      embed.addField(
        "Wind",
        `${metarData.wind_dir_degrees}° ${metarData.wind_speed_kt}kt` +
          (metarData.wind_gust_kt ? ` (gust ${metarData.wind_gust_kt}kt)` : "")
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
        `${metarData.temp_c}°C (${((metarData.temp_c * 9) / 5 + 32).toFixed(
          2
        )}°F) - Dewpoint: ${metarData.dewpoint_c}°C (${(
          (metarData.dewpoint_c * 9) / 5 +
          32
        ).toFixed(2)}°F)`
      );

      // Flight Rule
      if (metarData.flight_category) {
        embed.addField("Flight Rule", metarData.flight_category);
      }

      // Visibility
      if (metarData.visibility_statute_mi) {
        embed.addField(
          "Visibility",
          `${metarData.visibility_statute_mi.toFixed(2)} sm (${(
            metarData.visibility_statute_mi * 1.609344
          ).toFixed(2)} km)`
        );
      }

      // Location
      embed.addField(
        "Location",
        `[Google Map](http://maps.google.com/maps?q=${metarData.latitude},${metarData.longitude})` +
          ` (${metarData.latitude.toFixed(2)}, ${metarData.longitude.toFixed(
            2
          )})`
      );

      // Type
      embed.addField("Elevation", `${metarData.elevation_m} meters MSL`);

      // Source
      embed.addField(
        "Source",
        `[Aviation Weather](${aw.URI.AW({
          datasource: "METARS",
          stationString: station.station_id,
          startTime: metarData.observation_time,
          endTime: metarData.observation_time,
        })})`
      );

      // Timestamp
      embed.setTimestamp(new Date(metarData.observation_time));

      // Footer advise
      embed.setFooter(
        "This data should only be used for planning purposes | Observation Time"
      );

      return embed;
    });

    if (allPages.length === 1) {
      interaction.followUp({ embeds: allPages });
      return;
    } else {
      if (allPages.length < 6) {
        sendPaginatedEmbeds(interaction, allPages, { type: "BUTTON" });
      } else {
        // all pages text with observation time
        const menuoptions = response.map(
          (metarData) => `Page {page} - ${metarData.observation_time}`
        );
        sendPaginatedEmbeds(interaction, allPages, {
          type: "SELECT_MENU",
          pageText: menuoptions,
        });
      }
    }
  }
}
