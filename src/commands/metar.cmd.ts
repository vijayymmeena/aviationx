import { Pagination, PaginationType } from "@discordx/pagination";
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
import { numSpoke } from "../utils/num2word.js";
import { ErrorMessages, supportRow } from "../utils/static.js";

@Discord()
export class Example {
  @SimpleCommand({
    aliases: ["m"],
    description: "Obtain metar information for a given CIAO code",
    name: "metar",
  })
  simpleMetar(
    @SimpleCommandOption({ name: "icao", type: SimpleCommandOptionType.String })
    icao: string | undefined,
    @SimpleCommandOption({
      description: "Obtain all aircraft reports collected in the last hour",
      name: "hour-before",
      type: SimpleCommandOptionType.Number,
    })
    hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    !icao
      ? command.sendUsageSyntax()
      : this.handler(command.message, icao, hourBefore);
  }

  @Slash({
    description: "Obtain metar information for a given CIAO code",
    name: "metar",
  })
  metar(
    @SlashOption({
      autocomplete: searchICAO,
      description: "Enter ICAO code",
      name: "station",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    icao: string,
    @SlashOption({
      description: "Obtain all aircraft reports collected in the last hour",
      maxValue: 72,
      minValue: 1,
      name: "hour-before",
      required: false,
      type: ApplicationCommandOptionType.Number,
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
      !isMessage
        ? interaction.followUp({ components: [supportRow], content: msg })
        : interaction.reply({ components: [supportRow], content: msg });
      return;
    }

    const allPages = response.map((metarData) => {
      // prepare embed
      const embed = new EmbedBuilder();
      embed.setTitle(
        `${station.site}, ${station.country} (${station.station_id})`
      );

      // raw text
      embed.addFields({ name: "Raw Text", value: metarData.raw_text });
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
      embed.addFields({ name: "Spoken", value: spoken.join(" ") });

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

        embed.addFields({ name: "Cloud", value: cloudInfo });
      }

      // Wind
      if (metarData.wind_dir_degrees) {
        embed.addFields({
          name: "Wind",
          value:
            `${metarData.wind_dir_degrees}° ${metarData.wind_speed_kt}kt` +
            (metarData.wind_gust_kt
              ? ` (gust ${metarData.wind_gust_kt}kt)`
              : ""),
        });
      }

      // Altimeter
      embed.addFields({
        name: "Altimeter",
        /* cspell: disable-next-line */
        value:
          `${(metarData.altim_in_hg * 33.863886666667).toFixed(2)} hPa` +
          /* cspell: disable-next-line */
          ` (${metarData.altim_in_hg.toFixed(2)} inHg)`,
      });

      // Temperature
      embed.addFields({
        name: "Temperature",
        value: `${metarData.temp_c}°C (${(
          (metarData.temp_c * 9) / 5 +
          32
        ).toFixed(
          2
          /* cspell: disable-next-line */
        )}°F) - Dewpoint: ${
          /* cspell: disable-next-line */
          metarData.dewpoint_c
        }°C (${
          /* cspell: disable-next-line */
          ((metarData.dewpoint_c * 9) / 5 + 32).toFixed(2)
        }°F)`,
      });

      // Flight Rule
      if (metarData.flight_category) {
        embed.addFields({
          name: "Flight Rule",
          value: metarData.flight_category,
        });
      }

      // Visibility
      if (metarData.visibility_statute_mi) {
        embed.addFields({
          name: "Visibility",
          value: `${metarData.visibility_statute_mi.toFixed(2)} sm (${(
            metarData.visibility_statute_mi * 1.609344
          ).toFixed(2)} km)`,
        });
      }

      // Location
      embed.addFields({
        name: "Location",
        value:
          `[Google Map](http://maps.google.com/maps?q=${metarData.latitude},${metarData.longitude})` +
          ` (${metarData.latitude.toFixed(2)}, ${metarData.longitude.toFixed(
            2
          )})`,
      });

      // Type
      embed.addFields({
        name: "Elevation",
        value: `${metarData.elevation_m} meters MSL`,
      });

      // Source
      embed.addFields({
        name: "Source",
        value: `[Aviation Weather](${aw.URI.AW({
          datasource: "METARS",
          endTime: metarData.observation_time,
          startTime: metarData.observation_time,
          stationString: station.station_id,
        })})`,
      });

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
