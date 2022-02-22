import { MessageActionRow, MessageButton } from "discord.js";

export enum ErrorMessages {
  DataNotFound = "> Data not available for search query",
  InvalidICAOMessage = "> Looks like an invalid ICAO code. If the bot does not display information for valid ICAO codes, raise an issue on github.",
}

const githubButton = new MessageButton({
  label: "🚀 GitHub",
  style: "LINK",
  url: "https://github.com/oceanroleplay/aviationx",
});

const discordButton = new MessageButton({
  label: "🍻 Support Server",
  style: "LINK",
  url: "https://discord.gg/xkP9paz5X3",
});

const addToServerButton = new MessageButton({
  label: "🤖 Add to server",
  style: "LINK",
  url: "https://discord.com/api/oauth2/authorize?client_id=883415517417840710&permissions=0&scope=bot%20applications.commands",
});

export const supportRow = new MessageActionRow().addComponents(
  githubButton,
  discordButton,
  addToServerButton
);
