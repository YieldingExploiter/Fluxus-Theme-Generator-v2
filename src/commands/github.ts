import {
  ApplicationCommandType, EmbedBuilder
} from 'discord.js';
import { ICommand } from '../ICommand';

const Command: ICommand = {
  'data': {
    'name': 'github',
    'description': 'Provides a link to the github of this bot',
    'type': ApplicationCommandType.ChatInput,
    'options': [],
  },
  'execute': (interaction) => {
    interaction.reply({
      'ephemeral': true,
      'embeds': [(new EmbedBuilder).setTitle('Fluxus Theme Generator')
        .setDescription('https://github.com/YieldingExploiter/Fluxus-Theme-Generator-v2\nCopyright (c) 2022 YieldingExploiter (<@898971210531078164> - Yielding#3961).\nLicensed under the MIT License.')]
    });
  }
};
module.exports = Command;
