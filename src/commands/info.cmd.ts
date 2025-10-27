import { randomInt } from "node:crypto";
import type { Client, CommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { Discord, Slash } from "discordx";

import { supportRow } from "../utils/static.js";

@Discord()
export class Command {
  totalMembers(client: Client<boolean>): number {
    let retNum = 0;
    for (const [, guild] of client.guilds.cache) {
      retNum += guild.memberCount;
    }
    return retNum;
  }

  @Slash({ description: "Information about bot" })
  async info(interaction: CommandInteraction): Promise<void> {
    if (!interaction.client.user || !interaction.guild) {
      return;
    }

    const embed = new EmbedBuilder();
    embed.setTitle("Information");
    embed.setAuthor({
      iconURL: interaction.client.user.displayAvatarURL(),
      name: interaction.client.user.username,
      url: "https://github.com/vijayymmeena/aviationx",
    });

    embed.setColor(randomInt(50000));
    embed.setTimestamp();
    embed.addFields({
      name: "Guild Name",
      value: interaction.guild.name,
    });

    embed.addFields({
      inline: true,
      name: "Guild Id",
      value: interaction.guild.id,
    });

    embed.addFields({
      inline: true,
      name: "Guild Members",
      value: `${interaction.guild.memberCount}`,
    });

    embed.addFields({
      inline: true,
      name: "Developer",
      value: "[Vijay Meena](https://github.com/vijayymmeena)",
    });

    embed.addFields({
      inline: true,
      name: "Total Servers",
      value: `${interaction.client.guilds.cache.size}`,
    });

    embed.addFields({
      inline: true,
      name: "Total Members",
      value: `${this.totalMembers(interaction.client)}`,
    });

    // embed.addFields({ inline: true, name: "\u200f", value: "\u200f" });

    embed.addFields({
      inline: true,
      name: "Framework",
      value:
        "[discordx](https://www.npmjs.com/package/discordx), [aviationweather](https://www.npmjs.com/package/aviationweather)",
    });

    await interaction.reply({ components: [supportRow], embeds: [embed] });
  }
}
