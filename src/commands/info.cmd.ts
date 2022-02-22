import { randomInt } from "crypto";
import type { Client, CommandInteraction } from "discord.js";
import { MessageEmbed } from "discord.js";
import { Bot, Discord, Slash } from "discordx";

import { supportRow } from "./utils/static.js";

@Discord()
@Bot("aviationx")
export class Command {
  totalMembers(client: Client<boolean>): number {
    let retNum = 0;
    for (const [, guild] of client.guilds.cache) {
      retNum += guild.memberCount;
    }
    return retNum;
  }

  @Slash()
  info(interaction: CommandInteraction): void {
    if (!interaction.client.user || !interaction.guild) {
      return;
    }

    const embed = new MessageEmbed();
    embed.setTitle("Information");
    embed.setAuthor({
      iconURL: interaction.client.user.displayAvatarURL(),
      name: interaction.client.user.username,
      url: "https://github.com/oceanroleplay/aviationx",
    });
    embed.setColor(randomInt(50000));
    embed.setTimestamp();

    embed.addField("Guild Name", interaction.guild.name, true);
    embed.addField("Guild Members", `${interaction.guild.memberCount}`, true);
    embed.addField("Guild Id", interaction.guild.id, true);
    embed.addField(
      "Total Servers",
      `${interaction.client.guilds.cache.size}`,
      true
    );
    embed.addField(
      "Total Members",
      `${this.totalMembers(interaction.client)}`,
      true
    );
    embed.addField("\u200f", "\u200f", true);
    embed.addField("Developer", "Harry#5791", true);
    embed.addField(
      "Framework",
      "[discordx](https://www.npmjs.com/package/discordx)",
      true
    );
    embed.addField(
      "Library",
      "[aviationweather](https://www.npmjs.com/package/aviationweather)",
      true
    );

    interaction.reply({ components: [supportRow], embeds: [embed] });
  }
}
