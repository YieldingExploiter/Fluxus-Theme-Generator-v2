import {
  ApplicationCommandType, EmbedBuilder
} from 'discord.js';
import { ICommand } from '../ICommand';

const Command: ICommand = {
  'data': {
    'name': 'privacy',
    'description': 'Provides some information about the privacy relating to the bot',
    'type': ApplicationCommandType.ChatInput,
    'options': [],
  },
  'execute': (interaction) => {
    interaction.reply({
      'ephemeral': true,
      'embeds': [(new EmbedBuilder).setTitle('Fluxus Theme Generator -> Privacy')
        .setDescription(`The Fluxus Theme Generator, along with the rest of Fluxus, and takes privacy very seriously, however we have some constraints in terms of how we process data that we can't really avoid, as outlined below.

If you want to see exactly how your data is collected, you can run </github:1025941816291373187> to get the source code for the bot & check for yourself.`)
        .addFields({
          'name': 'What data is stored long-term, and where?',
          'value': process.env.PRIVACY_WHAT_DATA_AND_WHERE ?? 'ok whoever owns this instance hasnt set this up properly'
        }, {
          'name': 'What data is stored temporarily/short-term, and for how long?',
          'value': `We store the uploaded file, aswell as all resized & cropped variants on our server until the bot is done processing your theme. They are deleted in the \`Cleanup\` stage of the conversion.
Once they reach the cleanup stage, they are permanently deleted from our servers.`
        })]
    });
  }
};
module.exports = Command;
