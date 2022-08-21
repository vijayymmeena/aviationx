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
  Slash,
  SlashOption,
} from "discordx";

import { splitToBulks } from "../utils/chunk.js";
import { ErrorMessages } from "../utils/static.js";

@Discord()
export class Example {
  @SimpleCommand({
    description: "Obtain airsigmets weather reports",
    name: "airmet",
  })
  simpleAirmet(
    @SimpleCommandOption({ name: "hour-before" }) hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    this.handler(command.message, hourBefore);
  }

  @Slash({
    description: "Obtain airsigmets weather reports",
    name: "airmet",
  })
  airmet(
    @SlashOption({
      description: "Hours between 1 to 72",
      name: "hour-before",
      required: false,
      type: ApplicationCommandOptionType.Number,
    })
    hourBefore: number,
    interaction: CommandInteraction
  ): void {
    this.handler(interaction, hourBefore);
  }

  async handler(
    interaction: CommandInteraction | Message,
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
      datasource: "AIRSIGMETS",
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
      embed.addFields({ name: "Raw text", value: report.raw_text });
      embed.addFields({
        name: "From",
        value: new Date(report.valid_time_from).toUTCString(),
      });
      embed.addFields({
        name: "To",
        value: new Date(report.valid_time_to).toUTCString(),
      });

      if (report.altitude?.min_ft_msl) {
        embed.addFields({
          name: "Minimum altitude",
          value: `${report.altitude.min_ft_msl} ft MSL`,
        });
      }

      if (report.altitude?.max_ft_msl) {
        embed.addFields({
          name: "Maximum altitude",
          value: `${report.altitude.max_ft_msl} ft MSL`,
        });
      }

      // Source
      embed.addFields({
        name: "Source",
        value: `[Aviation Weather](${aw.URI.AW({
          datasource: "AIRSIGMETS",
          endTime: report.valid_time_to,
          startTime: report.valid_time_from,
        })})`,
      });

      if (report.area.point.length > 0) {
        const chunks = splitToBulks(report.area.point, 40);
        chunks.forEach((points) => {
          embed.addFields({
            name: "Points",
            value: points
              .map((p, index) => `${index + 1}. ${p.latitude}, ${p.longitude}`)
              .join("\n"),
          });
        });
      }

      // Timestamp
      embed.setTimestamp(new Date(report.valid_time_from));

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
            `Page {page} - ${new Date(report.valid_time_from).toUTCString()}`
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
