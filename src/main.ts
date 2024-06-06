import { dirname, importx } from "@discordx/importer";
import type { Interaction, Message } from "discord.js";
import { IntentsBitField, Partials } from "discord.js";
import { Client } from "discordx";

export const bot = new Client({
  // To only use global commands (use @Guild for specific guild command), comment this line
  // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.MessageContent,
  ],

  // Partials
  partials: [
    Partials.GuildMember,
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],

  // Debug logs are disabled in silent mode
  silent: false,

  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: "!",
  },
});

bot.once("ready", () => {
  // Synchronize applications commands with Discord
  void bot.initApplicationCommands();

  // set bot activity
  if (bot.user) {
    bot.user.setActivity("aviation weather | /metar");
  }

  console.log("Bot started");
});

bot.on("interactionCreate", (interaction: Interaction) => {
  if (
    interaction.isButton() &&
    interaction.customId.startsWith("discordx@pagination")
  ) {
    return;
  }

  bot.executeInteraction(interaction);
});

bot.on("messageCreate", (message: Message) => {
  void bot.executeCommand(message);
});

async function run() {
  // Import commands/events
  await importx(dirname(import.meta.url) + "/{events,commands}/**/*.{ts,js}");

  // Let's start the bot
  if (!process.env.BOT_TOKEN) {
    throw Error("Could not find BOT_TOKEN in your environment");
  }

  // Log in with your bot token
  await bot.login(process.env.BOT_TOKEN);
}

void run();
