import { Pagination, PaginationType } from "@discordx/pagination";
import { Client as AwClient } from "aviationweather";
import type { CommandInteraction, MessageOptions } from "discord.js";
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
import { ErrorMessages, supportRow } from "./utils/static.js";

@Discord()
@Bot("aviationx")
export class buttonExample {
  @SimpleCommand("taf", {
    description: "Obtain taf information for a given CIAO code",
  })
  simpleTaf(
    @SimpleCommandOption("icao", { type: SimpleCommandOptionType.String })
    icao: string | undefined,
    @SimpleCommandOption("hour-before") hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    !icao
      ? command.sendUsageSyntax()
      : this.handler(command.message, icao, hourBefore);
  }

  @Slash("taf", {
    description: "Obtain taf information for a given CIAO code",
  })
  taf(
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
      datasource: "TAFS",
      hoursBeforeNow: hourBefore,
      stationString: station.station_id,
    });

    // if no info found
    if (!response.length) {
      const msg = `Data not available for ${station.site}, ${station.country} (${station.station_id})`;
      !isMessage ? interaction.followUp(msg) : interaction.reply(msg);
      return;
    }

    const allPages = response.map((tafData) => {
      // prepare embed
      const embed = new MessageEmbed();
      embed.setTitle(
        `${station.site}, ${station.country} (${station.station_id})`
      );

      // raw text
      embed.addField("Raw Text", tafData.raw_text);

      // Issue Time
      embed.addField(
        "Issue Time",
        `${new Date(tafData.issue_time).toUTCString()}`
      );

      // Bulletin Time
      embed.addField(
        "Bulletin Time",
        `${new Date(tafData.bulletin_time).toUTCString()}`
      );

      // Valid From Time
      embed.addField(
        "Valid From",
        `${new Date(tafData.valid_time_from).toUTCString()}`
      );

      // Valid To Time
      embed.addField(
        "Valid To",
        `${new Date(tafData.valid_time_to).toUTCString()}`
      );

      // Remark
      if (tafData.remarks) {
        embed.addField("Remark", tafData.remarks);
      }

      // Location
      embed.addField(
        "Location",
        `[Google Map](http://maps.google.com/maps?q=${tafData.latitude},${tafData.longitude})` +
          ` (${tafData.latitude.toFixed(2)}, ${tafData.longitude.toFixed(2)})`
      );

      // Type
      embed.addField("Elevation", `${tafData.elevation_m} meters MSL`);

      // Source
      embed.addField(
        "Source",
        `[Aviation Weather](${aw.URI.AW({
          datasource: "TAFS",
          endTime: tafData.issue_time,
          startTime: tafData.issue_time,
          stationString: station.station_id,
          timeType: "issue",
        })})`
      );

      // Timestamp
      embed.setTimestamp(new Date(tafData.issue_time));

      // Footer advise
      embed.setFooter({
        text: "This data should only be used for planning purposes | Issue Time",
      });

      const forecasts = tafData.forecast.map((fr, i) => {
        const forecastEmbed = new MessageEmbed();
        forecastEmbed.setTitle(
          `Forecast ${i + 1} - ${station.site} (${station.station_id})`
        );

        forecastEmbed.addField(
          "From",
          /* cspell: disable-next-line */
          `${new Date(fr.fcst_time_from).toUTCString()}`
        );
        forecastEmbed.addField(
          "To",
          /* cspell: disable-next-line */
          `${new Date(fr.fcst_time_to).toUTCString()}`
        );

        // Wind
        if (fr.wind_dir_degrees) {
          forecastEmbed.addField(
            "Wind",
            `${fr.wind_dir_degrees}° ${fr.wind_speed_kt}kt` +
              (fr.wind_gust_kt ? ` (gust ${fr.wind_gust_kt}kt)` : "")
          );
        }

        // Visibility
        if (fr.visibility_statute_mi) {
          forecastEmbed.addField(
            "Visibility",
            `${fr.visibility_statute_mi.toFixed(2)} sm (${(
              fr.visibility_statute_mi * 1.609344
            ).toFixed(2)} km)`
          );
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
          forecastEmbed.addField("Cloud", cloudInfo);
        }

        if (fr.change_indicator) {
          forecastEmbed.addField("Change indicator", `${fr.change_indicator}`);
        }

        if (fr.wx_string) {
          forecastEmbed.addField("Change indicator", `${fr.wx_string}`);
        }

        return forecastEmbed;
      });

      const msg: MessageOptions = {
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
