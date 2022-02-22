import { Pagination, PaginationType } from "@discordx/pagination";
import { Client as AwClient } from "aviationweather";
import type { CommandInteraction } from "discord.js";
import { Message, MessageEmbed } from "discord.js";
import type { SimpleCommandMessage } from "discordx";
import {
  Bot,
  Discord,
  SimpleCommand,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
} from "discordx";

import { searchICAO } from "./utils/common.js";
import { numSpoke } from "./utils/num2word.js";
import { ErrorMessages, supportRow } from "./utils/static.js";

@Discord()
@Bot("aviationx")
export class buttonExample {
  @SimpleCommand("metar", {
    description: "Obtain metar information for a given CIAO code",
  })
  simpleMetar(
    @SimpleCommandOption("icao", { type: SimpleCommandOptionType.String })
    icao: string | undefined,
    @SimpleCommandOption("hour-before") hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    !icao
      ? command.sendUsageSyntax()
      : this.handler(command.message, icao, hourBefore);
  }

  @Slash("metar", {
    description: "Obtain metar information for a given CIAO code",
  })
  metar(
    @SlashOption("station", {
      autocomplete: searchICAO,
      description: "Enter ICAO code",
      type: "STRING",
    })
    icao: string,
    @SlashOption("hour-before", {
      description: "Hours between 1 to 72",
      required: false,
      type: "NUMBER",
    })
    hourBefore: number,
    interaction: CommandInteraction
  ): void {
    this.handler(interaction, icao, hourBefore);
  }

  async handler(
    interaction: CommandInteraction | Message,
    icao: string,
    hourBefore: number
  ): Promise<void> {
    const isMessage = interaction instanceof Message;
    if (!isMessage) {
      await interaction.deferReply();
    }

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

    // fetch metar info
    const response = await aw.AW({
      datasource: "METARS",
      hoursBeforeNow: hourBefore,
      stationString: station.station_id,
    });

    // if no info found
    if (!response.length) {
      const msg = `Data not available for ${station.site}, ${station.country} (${station.station_id})`;
      !isMessage ? interaction.followUp(msg) : interaction.reply(msg);
      return;
    }

    const allPages = response.map((metarData) => {
      // prepare embed
      const embed = new MessageEmbed();
      embed.setTitle(
        `${station.site}, ${station.country} (${station.station_id})`
      );

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
      /* cspell: disable-next-line */
      if (metarData.altim_in_hg) {
        spoken.push(
          `Altimeter ${numSpoke(
            /* cspell: disable-next-line */
            Number((metarData.altim_in_hg * 33.863886666667).toFixed(2))
          )} hPa.`
        );
      }

      if (metarData.temp_c) {
        spoken.push(
          `Temperature ${numSpoke(metarData.temp_c)} degree celsius.`
        );
      }

      /* cspell: disable-next-line */
      if (metarData.dewpoint_c) {
        /* cspell: disable-next-line */
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
      if (metarData.wind_dir_degrees) {
        embed.addField(
          "Wind",
          `${metarData.wind_dir_degrees}° ${metarData.wind_speed_kt}kt` +
            (metarData.wind_gust_kt
              ? ` (gust ${metarData.wind_gust_kt}kt)`
              : "")
        );
      }

      // Altimeter
      embed.addField(
        "Altimeter",
        /* cspell: disable-next-line */
        `${(metarData.altim_in_hg * 33.863886666667).toFixed(2)} hPa` +
          /* cspell: disable-next-line */
          ` (${metarData.altim_in_hg.toFixed(2)} inHg)`
      );

      // Temperature
      embed.addField(
        "Temperature",
        `${metarData.temp_c}°C (${((metarData.temp_c * 9) / 5 + 32).toFixed(
          2
          /* cspell: disable-next-line */
        )}°F) - Dewpoint: ${
          /* cspell: disable-next-line */
          metarData.dewpoint_c
        }°C (${
          /* cspell: disable-next-line */
          ((metarData.dewpoint_c * 9) / 5 + 32).toFixed(2)
        }°F)`
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
          endTime: metarData.observation_time,
          startTime: metarData.observation_time,
          stationString: station.station_id,
        })})`
      );

      // Timestamp
      embed.setTimestamp(new Date(metarData.observation_time));

      // Footer advise
      embed.setFooter({
        text: "This data should only be used for planning purposes | Observation Time",
      });

      return embed;
    });

    if (allPages.length === 1) {
      !isMessage
        ? interaction.followUp({ embeds: allPages })
        : interaction.reply({ embeds: allPages });
      return;
    } else {
      if (allPages.length < 6) {
        new Pagination(interaction, allPages, {
          enableExit: true,
          type: PaginationType.Button,
        }).send();
      } else {
        // all pages text with observation time .
        const menuOptions = response.map(
          (metarData) =>
            `Page {page} - ${new Date(
              metarData.observation_time
            ).toUTCString()}`
        );
        new Pagination(interaction, allPages, {
          enableExit: true,
          labels: {
            end: `End - ${allPages.length}`,
          },
          pageText: menuOptions,
          type: PaginationType.SelectMenu,
        }).send();
      }
    }
  }
}
