import {
  ApplicationCommandOptionType, ApplicationCommandType, CacheType, ChatInputCommandInteraction, CommandInteraction, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction
} from 'discord.js';

export type ICommand = {
  data: {
    name: string,
    description: string,
    type: ApplicationCommandType,
    options?: ({
      name:string,
      description:string,
      type: ApplicationCommandOptionType,
      required: boolean
    })[]
  };
  execute: (interaction: ChatInputCommandInteraction<CacheType>)=>any;
}
