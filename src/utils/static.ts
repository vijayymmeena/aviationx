import type { MessageActionRowComponentBuilder } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export enum ErrorMessages {
  DataNotFound = "> Data not available for search query",
  InvalidICAOMessage = "> Looks like an invalid ICAO code. If the bot does not display information for valid ICAO codes, raise an issue on github.",
}

const githubButton = new ButtonBuilder({
  label: "🚀 GitHub",
  style: ButtonStyle.Link,
  url: "https://github.com/oceanroleplay/aviationx",
});

const discordButton = new ButtonBuilder({
  label: "🍻 Support Server",
  style: ButtonStyle.Link,
  url: "https://discord.gg/xkP9paz5X3",
});

const addToServerButton = new ButtonBuilder({
  label: "🤖 Add to server",
  style: ButtonStyle.Link,
  url: "https://discord.com/api/oauth2/authorize?client_id=883415517417840710&permissions=0&scope=bot%20applications.commands",
});

export const supportRow =
  new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    githubButton,
    discordButton,
    addToServerButton
  );
