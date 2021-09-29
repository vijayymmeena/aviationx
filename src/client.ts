import "reflect-metadata";
import { Intents, Interaction, Message } from "discord.js";
import { Client } from "discordx";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

const client = new Client({
  prefix: "!",
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  classes: [path.join(__dirname, "aviationx", "**/*.cmd.{ts,js}")],
  botGuilds: [process.env.AV_GUILD_ID ?? ""],
  silent: true,
});

client.on("ready", async () => {
  client.user?.setActivity("aviation weather");
  await client.initApplicationCommands({
    guild: { log: true },
    global: { log: true },
  });
  await client.initApplicationPermissions();
});

client.on("interactionCreate", (interaction: Interaction) => {
  if (interaction.isButton() || interaction.isSelectMenu()) {
    if (interaction.customId.startsWith("discordx@pagination@")) return;
  }
  client.executeInteraction(interaction);
});

client.on("messageCreate", (message: Message) => {
  client.executeCommand(message);
});

client.login(process.env.AV_BOT_TOKEN ?? ""); // provide your bot token
