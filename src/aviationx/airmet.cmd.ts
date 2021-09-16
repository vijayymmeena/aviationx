import {
  Bot,
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  Slash,
  SlashOption,
} from "discordx";
import { CommandInteraction, Message, MessageEmbed } from "discord.js";
import { Client as AwClient } from "aviationweather";
import { ErrorMessages } from "./utils/static";
import { sendPaginatedEmbeds } from "@discordx/utilities";
import { splitToBulks } from "./utils/chunk";

@Discord()
@Bot("aviationx")
export class buttonExample {
  @SimpleCommand("airmet", { description: "Obtain airsigmets weather reports" })
  simpleAirmet(
    @SimpleCommandOption("hourbefore") hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    this.handler(command.message, hourBefore);
  }

  @Slash("airmet", {
    description: "Obtain airsigmets weather reports",
  })
  airmet(
    @SlashOption("hourbefore", { description: "Hours between 1 to 72" })
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

    // response.forEach(console.log);
    const allPages = response.map((report) => {
      // prepare embed
      const embed = new MessageEmbed();
      embed.addField("Raw text", report.raw_text);
      embed.addField("From", new Date(report.valid_time_from).toUTCString());
      embed.addField("To", new Date(report.valid_time_to).toUTCString());

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
          datasource: "AIRSIGMETS",
          startTime: report.valid_time_from,
          endTime: report.valid_time_to,
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
      embed.setTimestamp(new Date(report.valid_time_from));

      // Footer advise
      embed.setFooter(
        "This data should only be used for planning purposes | Observation Time"
      );

      return embed;
    });

    if (allPages.length === 1) {
      !isMessage
        ? interaction.followUp({ embeds: allPages })
        : interaction.reply({ embeds: allPages });
      return;
    } else {
      if (allPages.length < 6) {
        sendPaginatedEmbeds(interaction, allPages, { type: "BUTTON" });
      } else {
        // all pages text with observation time
        const menuoptions = response.map(
          (report) =>
            `Page {page} - ${new Date(report.valid_time_from).toUTCString()}`
        );
        sendPaginatedEmbeds(interaction, allPages, {
          type: "SELECT_MENU",
          pageText: menuoptions,
          endLabel: `End - ${allPages.length}`,
        });
      }
    }
  }
}
