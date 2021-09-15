import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Client as AwClient } from "aviationweather";
import { sendPaginatedEmbeds } from "@discordx/utilities";

@Discord()
export class buttonExample {
  @Slash("airep", {
    description: "Obtain recent aircraft weather reports",
  })
  async airep(
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

    // fetch metar info
    const response = await aw.AW({
      datasource: "AIRCRAFTREPORTS",
      hoursBeforeNow: hourBefore,
    });

    // if no info found
    if (!response.length) {
      interaction.followUp("Data not available for search query");
      return;
    }

    // response.forEach(console.log);
    const allPages = response.map((report) => {
      // prepare embed
      const embed = new MessageEmbed();
      embed.setTitle(`Report from ${report.aircraft_ref}`);

      // raw text
      embed.addField("Raw Text", report.raw_text ?? "Unavailable");

      // Observation Time
      embed.addField(
        "Observation Time",
        `${new Date(report.observation_time).toUTCString()}`
      );

      // Receipt Time
      embed.addField(
        "Receipt Time",
        `${new Date(report.receipt_time).toUTCString()}`
      );

      // Wind
      embed.addField(
        "Wind",
        `${report.wind_dir_degrees}° ${report.wind_speed_kt}kt` +
          (report.vert_gust_kt ? ` (gust ${report.vert_gust_kt}kt)` : "")
      );

      // Altimeter
      if (report.altitude_ft_msl) {
        embed.addField("Altimeter", `${report.altitude_ft_msl} ft MSL`);
      }

      // Temperature
      if (report.temp_c) {
        embed.addField(
          "Temperature",
          `${report.temp_c}°C (${((report.temp_c * 9) / 5 + 32).toFixed(2)}°F)`
        );
      }

      // Visibility
      if (report.visibility_statute_mi) {
        embed.addField(
          "Visibility",
          `${report.visibility_statute_mi.toFixed(2)} sm (${(
            report.visibility_statute_mi * 1.609344
          ).toFixed(2)} km)`
        );
      }

      // Location
      embed.addField(
        "Location",
        `[Google Map](http://maps.google.com/maps?q=${report.latitude},${report.longitude})` +
          ` (${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)})`
      );

      // Source
      embed.addField(
        "Source",
        `[Aviation Weather](${aw.URI.AW({
          datasource: "AIRCRAFTREPORTS",
          startTime: report.observation_time,
          endTime: report.observation_time,
        })})`
      );

      // Timestamp
      embed.setTimestamp(new Date(report.observation_time));

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
          (report) =>
            `Page {page} - ${report.aircraft_ref} - ${new Date(
              report.observation_time
            ).toUTCString()}`
        );
        sendPaginatedEmbeds(interaction, allPages, {
          type: "SELECT_MENU",
          pageText: menuoptions,
        });
      }
    }
  }
}
