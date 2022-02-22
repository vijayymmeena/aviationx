import "reflect-metadata";
import "dotenv/config";
import { Intents, Interaction, Message } from "discord.js";
import { dirname, importx } from "@discordx/importer";
import { Client } from "discordx";

const client = new Client({
  botId: "aviationx",
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  simpleCommand: {
    prefix: "!",
  },
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

importx(dirname(import.meta.url) + "/{events,commands}/**/*.{ts,js}").then(
  () => {
    if (!process.env.BOT_TOKEN) {
      throw Error("BOT_TOKEN not found in your environment!");
    }

    client.login(process.env.BOT_TOKEN);
  }
);
