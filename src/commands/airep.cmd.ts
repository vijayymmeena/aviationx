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
  Slash,
  SlashOption,
} from "discordx";

import { ErrorMessages } from "./utils/static.js";

@Discord()
@Bot("aviationx")
export class buttonExample {
  @SimpleCommand("airep", {
    description: "Obtain recent aircraft weather reports",
  })
  simpleAirep(
    @SimpleCommandOption("hour-before") hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    this.handler(command.message, hourBefore);
  }

  @Slash("airep", {
    description: "Obtain recent aircraft weather reports",
  })
  airep(
    @SlashOption("hour-before", {
      description: "Hours between 1 to 72",
      required: false,
      type: "NUMBER",
    })
    hourBefore: number,
    interaction: CommandInteraction
  ): void {
    this.handler(interaction, hourBefore);
  }

  async handler(
    interaction: Message | CommandInteraction,
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
      if (report.wind_dir_degrees) {
        embed.addField(
          "Wind",
          `${report.wind_dir_degrees}° ${report.wind_speed_kt}kt` +
            (report.vert_gust_kt ? ` (gust ${report.vert_gust_kt}kt)` : "")
        );
      }

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
          endTime: report.observation_time,
          startTime: report.observation_time,
        })})`
      );

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
        new Pagination(interaction, allPages, {
          enableExit: true,
          type: PaginationType.Button,
        }).send();
      } else {
        // all pages text with observation time
        const menuOptions = response.map(
          (report) =>
            `Page {page} - ${new Date(report.observation_time).toUTCString()}`
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
