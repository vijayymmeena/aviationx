import type { Resolver } from "@discordx/pagination";
import { Pagination } from "@discordx/pagination";
import type { MetarResponse, Station } from "aviationweather";
import { getMetar } from "aviationweather";
import dayjs from "dayjs";
import type {
  CommandInteraction,
  InteractionReplyOptions,
  MessagePayload,
  MessageReplyOptions,
} from "discord.js";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  Message,
} from "discord.js";
import type { SimpleCommandMessage } from "discordx";
import {
  Discord,
  SimpleCommand,
  SimpleCommandOption,
  SimpleCommandOptionType,
  Slash,
  SlashOption,
} from "discordx";

import { ErrorMessages, supportRow } from "../utils/static.js";
import { getICAO, searchICAO } from "../utils/stations.js";
import { convertVisibilityInput } from "../utils/visibility.js";
import { degreesToDirection, getSky } from "../utils/wind.js";

function GetMetarEmbed(station: Station, metar: MetarResponse) {
  console.log(metar, metar.clouds);

  // prepare embed
  const embed = new EmbedBuilder();

  // set title
  embed.setTitle(`${station.site}, ${station.country} (${station.icaoId})`);

  // raw text
  embed.addFields({ name: "Raw Text", value: metar.rawOb });

  // clouds
  if (metar.clouds.length > 0) {
    console.log(getSky(metar.clouds[0]?.cover ?? ""));
    const cloudInfo = metar.clouds
      .map((info) => {
        return (
          `${getSky(info.cover)} (${info.cover})` +
          (info.base ? ` at ${info.base} ft AGL` : "")
        );
      })
      .join("\n");

    embed.addFields({
      name: "Clouds",
      value: cloudInfo,
    });
  }

  // winds
  if (metar.wdir && metar.wspd) {
    embed.addFields({
      name: "Winds",
      value: `from the ${degreesToDirection(metar.wdir)} (${
        metar.wdir
      } degrees) at ${Math.round(metar.wspd * 1.15078)} MPH (${
        metar.wspd
      } knots)`,
    });
  }

  // Altimeter
  if (metar.altim) {
    embed.addFields({
      name: "Pressure (Altimeter)",
      /* cspell: disable-next-line */
      value:
        `${(metar.altim / 33.863886666667).toFixed(2)} inches Hg` +
        /* cspell: disable-next-line */
        ` (${metar.altim.toFixed(2)} mb) [Sea level pressure: ${
          metar.slp ?? "-"
        } mb]`,
    });
  }

  // Temperature
  if (metar.temp && metar.dewp) {
    embed.addFields({
      name: "Temperature",
      value: `${metar.temp}°C (${((metar.temp * 9) / 5 + 32).toFixed(
        2
        /* cspell: disable-next-line */
      )}°F) - Dewpoint: ${
        /* cspell: disable-next-line */
        metar.dewp
      }°C (${
        /* cspell: disable-next-line */
        ((metar.dewp * 9) / 5 + 32).toFixed(2)
      }°F)`,
    });
  }

  // Visibility
  if (metar.visib) {
    embed.addFields({
      name: "Visibility",
      value: `${convertVisibilityInput(String(metar.visib))}`,
    });
  }

  // Type
  embed.addFields({
    name: "Elevation",
    value: `${metar.elev} meters MSL`,
  });

  // Location
  embed.addFields({
    name: "Location",
    value:
      `[Google Map](http://maps.google.com/maps?q=${metar.lat},${metar.lon})` +
      ` (${metar.lat.toFixed(2)}, ${metar.lon.toFixed(2)})`,
  });

  // Source
  embed.addFields({
    name: "Source",
    value: "[Aviation Weather](https://aviationweather.gov)",
  });

  // Note
  embed.addFields({
    name: "Developer Note",
    value: "||Please open a GitHub issue for the corrections. Thank you.||",
  });

  // Timestamp
  embed.setTimestamp(dayjs.unix(metar.obsTime).toDate());

  // Footer advise
  embed.setFooter({
    text: "This data should only be used for planning purposes | Observation Time",
  });

  return embed;
}

@Discord()
export class Example {
  @SimpleCommand({
    aliases: ["m"],
    description: "Obtain metar information for a given CIAO code",
    name: "metar",
  })
  simpleMetar(
    @SimpleCommandOption({ name: "icao", type: SimpleCommandOptionType.String })
    icao: string | undefined,
    @SimpleCommandOption({
      description: "Obtain all aircraft reports collected in the last hour",
      name: "hour-before",
      type: SimpleCommandOptionType.Number,
    })
    hourBefore: number,
    command: SimpleCommandMessage
  ): void {
    !icao
      ? command.sendUsageSyntax()
      : this.handler(command.message, icao, hourBefore);
  }

  @Slash({
    description: "Obtain metar information for a given CIAO code",
    name: "metar",
  })
  metar(
    @SlashOption({
      autocomplete: searchICAO,
      description: "Enter ICAO code",
      name: "station",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    icao: string,
    @SlashOption({
      description: "Obtain all aircraft reports collected in the last hour",
      maxValue: 72,
      minValue: 1,
      name: "hour-before",
      required: false,
      type: ApplicationCommandOptionType.Number,
    })
    hourBefore: number,
    interaction: CommandInteraction
  ): void {
    this.handler(interaction, icao, hourBefore);
  }

  async handler(
    interaction: CommandInteraction | Message,
    icao: string,
    hourBefore: number
  ): Promise<void> {
    const isMessage = interaction instanceof Message;
    if (!isMessage) {
      await interaction.deferReply();
    }

    async function replyOrFollowUp(
      payload:
        | string
        | MessagePayload
        | Omit<MessageReplyOptions, "flags">
        | Omit<InteractionReplyOptions, "flags">
    ): Promise<void> {
      if (isMessage) {
        await interaction.reply(payload);
      } else {
        await interaction.followUp(payload);
      }
    }

    // fix hour
    if (!hourBefore || hourBefore < 1 || hourBefore > 72) {
      hourBefore = 1;
    }

    // fetch station info
    const station = getICAO(icao);
    if (!station) {
      await replyOrFollowUp({
        components: [supportRow],
        content: ErrorMessages.InvalidICAOMessage,
      });
      return;
    }

    const { data } = await getMetar({
      format: "json",
      hours: hourBefore,
      ids: station.icaoId,
    });

    // if no info found
    if (data.length === 0) {
      const msg = `Data not available for ${station.site}, ${station.country} (${station.icaoId})`;
      replyOrFollowUp({ components: [supportRow], content: msg });
      return;
    }

    // if one result, sent it
    if (data.length === 1) {
      const metar = data[0] as MetarResponse;
      replyOrFollowUp({ embeds: [GetMetarEmbed(station, metar)] });
      return;
    }

    // Pagination
    const getPage: Resolver = (page) => {
      const metar = data[page];
      if (!metar) {
        return {
          content: "Data not available",
        };
      }

      return { embeds: [GetMetarEmbed(station, metar)] };
    };

    const pagination = new Pagination(interaction, {
      maxLength: data.length,
      resolver: getPage,
    });
    await pagination.send();
  }
}
