import { Pagination, PaginationType } from "@discordx/pagination";
import { Client as AwClient } from "aviationweather";
import type { CommandInteraction, MessageOptions } from "discord.js";
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
    description: "Obtain taf information for a given CIAO code",
    name: "taf",
  })
  simpleTaf(
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
    description: "Obtain taf information for a given CIAO code",
    name: "taf",
  })
  taf(
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
      datasource: "TAFS",
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

    const allPages = response.map((tafData) => {
      // prepare embed
      const embed = new EmbedBuilder();
      embed.setTitle(
        `${station.site}, ${station.country} (${station.station_id})`
      );

      // raw text
      embed.addFields({ name: "Raw Text", value: tafData.raw_text });

      // Issue Time
      embed.addFields({
        name: "Issue Time",
        value: `${new Date(tafData.issue_time).toUTCString()}`,
      });

      // Bulletin Time
      embed.addFields({
        name: "Bulletin Time",
        value: `${new Date(tafData.bulletin_time).toUTCString()}`,
      });

      // Valid From Time
      embed.addFields({
        name: "Valid From",
        value: `${new Date(tafData.valid_time_from).toUTCString()}`,
      });

      // Valid To Time
      embed.addFields({
        name: "Valid To",
        value: `${new Date(tafData.valid_time_to).toUTCString()}`,
      });

      // Remark
      if (tafData.remarks) {
        embed.addFields({ name: "Remark", value: tafData.remarks });
      }

      // Location
      embed.addFields({
        name: "Location",
        value:
          `[Google Map](http://maps.google.com/maps?q=${tafData.latitude},${tafData.longitude})` +
          ` (${tafData.latitude.toFixed(2)}, ${tafData.longitude.toFixed(2)})`,
      });

      // Type
      embed.addFields({
        name: "Elevation",
        value: `${tafData.elevation_m} meters MSL`,
      });

      // Source
      embed.addFields({
        name: "Source",
        value: `[Aviation Weather](${aw.URI.AW({
          datasource: "TAFS",
          endTime: tafData.issue_time,
          startTime: tafData.issue_time,
          stationString: station.station_id,
          timeType: "issue",
        })})`,
      });

      // Timestamp
      embed.setTimestamp(new Date(tafData.issue_time));

      // Footer advise
      embed.setFooter({
        text: "This data should only be used for planning purposes | Issue Time",
      });

      const forecasts = tafData.forecast.map((fr, i) => {
        const forecastEmbed = new EmbedBuilder();
        forecastEmbed.setTitle(
          `Forecast ${i + 1} - ${station.site} (${station.station_id})`
        );

        forecastEmbed.addFields({
          name: "From",
          /* cspell: disable-next-line */
          value: `${new Date(fr.fcst_time_from).toUTCString()}`,
        });
        forecastEmbed.addFields({
          name: "To",
          /* cspell: disable-next-line */
          value: `${new Date(fr.fcst_time_to).toUTCString()}`,
        });

        // Wind
        if (fr.wind_dir_degrees) {
          forecastEmbed.addFields({
            name: "Wind",
            value:
              `${fr.wind_dir_degrees}° ${fr.wind_speed_kt}kt` +
              (fr.wind_gust_kt ? ` (gust ${fr.wind_gust_kt}kt)` : ""),
          });
        }

        // Visibility
        if (fr.visibility_statute_mi) {
          forecastEmbed.addFields({
            name: "Visibility",
            value: `${fr.visibility_statute_mi.toFixed(2)} sm (${(
              fr.visibility_statute_mi * 1.609344
            ).toFixed(2)} km)`,
          });
        }

        // Cloud`
        if (fr.sky_condition?.length) {
          const cloudInfo = fr.sky_condition
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
          forecastEmbed.addFields({ name: "Cloud", value: cloudInfo });
        }

        if (fr.change_indicator) {
          forecastEmbed.addFields({
            name: "Change indicator",
            value: `${fr.change_indicator}`,
          });
        }

        if (fr.wx_string) {
          forecastEmbed.addFields({
            name: "Change indicator",
            value: `${fr.wx_string}`,
          });
        }

        return forecastEmbed;
      });

      const msg: Omit<MessageOptions, "flags"> = {
        embeds: [embed, ...forecasts],
      };

      return msg;
    });

    if (allPages.length === 1 && allPages[0]) {
      !isMessage
        ? interaction.followUp(allPages[0])
        : interaction.reply(allPages[0]);
      return;
    } else {
      if (allPages.length < 6) {
        new Pagination(interaction, allPages, {
          enableExit: true,
          type: PaginationType.Button,
        }).send();
      } else {
        // all pages text with observation time
        const menuOptions = response.map(
          (metarData) =>
            `Page {page} - ${new Date(metarData.issue_time).toUTCString()}`
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
