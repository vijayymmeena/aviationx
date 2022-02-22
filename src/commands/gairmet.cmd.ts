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

import { splitToBulks } from "./utils/chunk.js";
import { ErrorMessages } from "./utils/static.js";

@Discord()
@Bot("aviationx")
export class buttonExample {
  @SimpleCommand("gairmet", {
    description: "Obtain g-airsigmets weather reports",
  })
  simpleGairmet(
    @SimpleCommandOption("hour-before") hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    this.handler(command.message, hourBefore);
  }

  @Slash("gairmet", {
    description: "Obtain g-airsigmets weather reports",
  })
  gairmet(
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
      datasource: "GAIRMETS",
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
      embed.addField(
        "Receipt Time",
        new Date(report.receipt_time).toUTCString()
      );
      embed.addField("Issue Time", new Date(report.issue_time).toUTCString());
      embed.addField("Expire Time", new Date(report.expire_time).toUTCString());
      embed.addField("Valid Time", new Date(report.valid_time).toUTCString());

      if (report.altitude?.min_ft_msl) {
        embed.addField(
          "Minimum altitude",
          `${report.altitude.min_ft_msl} ft MSL`
        );
      }

      if (report.altitude?.max_ft_msl) {
        embed.addField(
          "Maximum altitude",
          `${report.altitude.max_ft_msl} ft MSL`
        );
      }

      // Source
      embed.addField(
        "Source",
        `[Aviation Weather](${aw.URI.AW({
          datasource: "GAIRMETS",
        })})`
      );

      if (report.area.point.length > 0) {
        const chunks = splitToBulks(report.area.point, 40);
        chunks.forEach((points) => {
          embed.addField(
            "Points",
            points
              .map((p, index) => `${index + 1}. ${p.latitude}, ${p.longitude}`)
              .join("\n")
          );
        });
      }

      // Timestamp
      embed.setTimestamp(new Date(report.issue_time));

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
            `Page {page} - ${new Date(report.issue_time).toUTCString()}`
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
