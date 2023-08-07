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

import { ErrorMessages } from "../utils/static.js";

@Discord()
export class Example {
  @SimpleCommand({
    description: "Obtain recent aircraft weather reports",
    name: "airep",
  })
  simpleAirep(
    @SimpleCommandOption({
      description: "Obtain all aircraft reports collected in the last hour",
      name: "hour-before",
      type: SimpleCommandOptionType.Number,
    })
    hourBefore: number,
    command: SimpleCommandMessage,
  ): void {
    this.handler(command.message, hourBefore);
  }

  @Slash({
    description: "Obtain recent aircraft weather reports",
    name: "airep",
  })
  airep(
    @SlashOption({
      description: "Obtain all aircraft reports collected in the last hour",
      maxValue: 72,
      minValue: 1,
      name: "hour-before",
      required: false,
      type: ApplicationCommandOptionType.Number,
    })
    hourBefore: number,
    interaction: CommandInteraction,
  ): void {
    this.handler(interaction, hourBefore);
  }

  async handler(
    interaction: Message | CommandInteraction,
    hourBefore: number,
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

    // fetch metar info
    const response = await aw.AW({
      datasource: "AIRCRAFTREPORTS",
      hoursBeforeNow: hourBefore,
    });

    // if no info found
    if (!response.length) {
      !isMessage
        ? interaction.followUp(ErrorMessages.DataNotFound)
        : interaction.reply(ErrorMessages.DataNotFound);
      return;
    }

    const allPages = response.map((report) => {
      // prepare embed
      const embed = new EmbedBuilder();
      embed.setTitle(`Report from ${report.aircraft_ref}`);

      // raw text
      embed.addFields({
        name: "Raw Text",
        value: report.raw_text ?? "Unavailable",
      });

      // Observation Time
      embed.addFields({
        name: "Observation Time",
        value: `${new Date(report.observation_time).toUTCString()}`,
      });

      // Receipt Time
      embed.addFields({
        name: "Receipt Time",
        value: `${new Date(report.receipt_time).toUTCString()}`,
      });

      // Wind
      if (report.wind_dir_degrees) {
        embed.addFields({
          name: "Wind",
          value:
            `${report.wind_dir_degrees}° ${report.wind_speed_kt}kt` +
            (report.vert_gust_kt ? ` (gust ${report.vert_gust_kt}kt)` : ""),
        });
      }

      // Altimeter
      if (report.altitude_ft_msl) {
        embed.addFields({
          name: "Altimeter",
          value: `${report.altitude_ft_msl} ft MSL`,
        });
      }

      // Temperature
      if (report.temp_c) {
        embed.addFields({
          name: "Temperature",
          value: `${report.temp_c}°C (${((report.temp_c * 9) / 5 + 32).toFixed(
            2,
          )}°F)`,
        });
      }

      // Visibility
      if (report.visibility_statute_mi) {
        embed.addFields({
          name: "Visibility",
          value: `${report.visibility_statute_mi.toFixed(2)} sm (${(
            report.visibility_statute_mi * 1.609344
          ).toFixed(2)} km)`,
        });
      }

      // Location
      embed.addFields({
        name: "Location",
        value:
          `[Google Map](http://maps.google.com/maps?q=${report.latitude},${report.longitude})` +
          ` (${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)})`,
      });

      // Source
      embed.addFields({
        name: "Source",
        value: `[Aviation Weather](${aw.URI.AW({
          datasource: "AIRCRAFTREPORTS",
          endTime: report.observation_time,
          startTime: report.observation_time,
        })})`,
      });

      // Timestamp
      embed.setTimestamp(new Date(report.observation_time));

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
        new Pagination(
          interaction,
          allPages.map((embed) => ({ embeds: [embed] })),
          {
            enableExit: true,
            type: PaginationType.Button,
          },
        ).send();
      } else {
        // all pages text with observation time
        const menuOptions = response.map(
          (report) =>
            `Page {page} - ${new Date(report.observation_time).toUTCString()}`,
        );

        new Pagination(
          interaction,
          allPages.map((embed) => ({ embeds: [embed] })),
          {
            enableExit: true,
            labels: {
              end: `End - ${allPages.length}`,
            },
            pageText: menuOptions,
            type: PaginationType.SelectMenu,
          },
        ).send();
      }
    }
  }
}
