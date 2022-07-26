import {
  CacheType, Interaction, InteractionType
} from 'discord.js';

const InteractionEvents: Record<string, {
  promise: Promise<Interaction|null>
  resolve?: (data: Interaction)=>any
}> = {};
module.exports = {
  'AwaitCallbackEvent': async (CustomId:string, timeout = 120) => {
    if (!InteractionEvents[CustomId])
      InteractionEvents[CustomId] = {
        'promise': new Promise((resolve)=>{
          setTimeout(() => {
            InteractionEvents[CustomId].resolve = (data)=>{
              delete InteractionEvents[CustomId];
              resolve(data);
            };
          }, 0);
          setTimeout(() => {
            if (InteractionEvents[CustomId]) {
              delete InteractionEvents[CustomId];
              resolve(null);
            }
          }, timeout * 1000);
        })
      };
    return await InteractionEvents[CustomId].promise;
  },
  'once': false,
  'execute': (client: any, interaction: Interaction<CacheType>) => {
    // if (interaction.type !== InteractionType.ApplicationCommand)
    //   return;
    if (interaction.isChatInputCommand())
      try {
        return client.commands
          .get(interaction.commandName)
          ?.execute(interaction);
      } catch (err) {
        console.error(err);
      }
    else if (interaction.isButton() && InteractionEvents[interaction.customId]) {
      const resolve = InteractionEvents[interaction.customId].resolve;
      if (resolve)
        resolve(interaction);
    }
  },
};
