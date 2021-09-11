import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { Client as AwClient } from "aviationweather";
import { sendPaginatedEmbeds } from "@discordx/utilities";

@Discord()
export class buttonExample {
  @Slash("gairmet", {
    description: "Obtain g-airsigmets weather reports",
  })
  async gairmet(
    @SlashOption("hourbefore", { description: "Hours between 1 to 48" })
    hourBefore: number,
    interaction: CommandInteraction
  ): Promise<void> {
    await interaction.deferReply();

    // fix hour
    if (!hourBefore || hourBefore < 1 || hourBefore > 48) hourBefore = 1;

    const aw = new AwClient();

    // fetch metar info
    const response = await aw.AW({
      datasource: "GAIRMETS",
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
      embed.addField("Issue At", report.issue_time);
      embed.addField("Valid Till", report.valid_time);

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

      // Source
      embed.addField(
        "Points",
        report.area.point
          .map((p, index) => `${index + 1}. ${p.latitude}, ${p.longitude}`)
          .join("\n")
      );

      // Timestamp
      embed.setTimestamp(new Date(report.valid_time));

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
        // const menuoptions = response.map(() => "Page {page}");
        sendPaginatedEmbeds(interaction, allPages, {
          type: "SELECT_MENU",
          //  pageText: menuoptions,
        });
      }
    }
  }
}
