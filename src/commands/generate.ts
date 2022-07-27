import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  EmbedField,
  Message,
  TextChannel,
} from 'discord.js';
import Emojis from '../classes/emoji';
import { ICommand } from '../ICommand';
import * as path from 'path';
import * as fs from 'fs-extra';
import axios from 'axios';
import * as _gm from 'gm';
import * as lib from '../themeapi';

const gm = _gm.subClass({ 'imageMagick': true });

const FileLimit = 8000000;

const { AwaitCallbackEvent } = require('../events/interactionCreate');

const WorkDir = path.resolve(process.cwd(), 'work');
const DownloadDir = path.join(WorkDir, 'dl');
const WindowDir = path.join(WorkDir, 'ui', 'win');
const TopbarDir = path.join(WorkDir, 'ui', 'top');
const OutputDir = path.join(WorkDir, 'out');
const OutPreviewDir = path.join(OutputDir, 'preview');
fs.ensureDirSync(DownloadDir);
fs.ensureDirSync(TopbarDir);
fs.ensureDirSync(WindowDir);
fs.ensureDirSync(OutputDir);
fs.ensureDirSync(OutPreviewDir);

let imagesChannel: TextChannel;

class TimedOutException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimedOutException';
  }
}
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
class InputValidationError extends ValidationError {
  constructor(message: any) {
    super(message);
    this.name = 'InputValidationError';
  }
}

const MakeId = ()=>(Math.random().toString(16) + Math.random().toString(16)
  .replace(/\./g, '')).toLowerCase();

const replaceSensitive = (message:string)=>{
  process.env.SENSITIVE.split(',').forEach(v=>
    message = message.replace(new RegExp(v, 'gi'), ''));
  return message;
};

const SupportedImages = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/gif',
  'image/webp'
];
const Command: ICommand = {
  'data': {
    'name': 'generate',
    'description': 'Creates an interactive image generator prompt',
    'type': ApplicationCommandType.ChatInput,
    'options': [{
      'name': 'file',
      'description': 'The image to use - Optimal Resolution: 1854x1090',
      'type': ApplicationCommandOptionType.Attachment,
      'required': true,
    },],
  },
  'execute': async (interaction) => {
    await interaction.reply({
      'embeds': [(new EmbedBuilder).setTitle('Please Wait...')
        .setDescription(`${Emojis.loading} Preparing...`)],
    });
    const file = interaction.options.getAttachment('file');
    type Step = {
      Completed: boolean;
      Failed?: boolean;
      Name: string;
      Description?: string;
    }
    const Steps:Step[] = [
      {
        'Completed': false,
        'Name': 'Prepare',
        'Description': 'some basic bot internals, such as this list'
      },
      {
        'Completed': false,
        'Name': 'Customise',
        'Description': 'the theme\'s settings to your liking'
      },
      {
        'Completed': false,
        'Name': 'Download',
        'Description': 'the uploaded image'
      },
      {
        'Completed': false,
        'Name': 'Parse & Resize',
        'Description': 'the main window\'s background'
      },
      {
        'Completed': false,
        'Name': 'Crop & Blur',
        'Description': 'the topbar\'s background'
      },
      {
        'Completed': false,
        'Name': 'Upload',
        'Description': 'the resulting images'
      },
      {
        'Completed': false,
        'Name': 'Upload',
        'Description': 'the final theme file'
      },
      {
        'Completed': false,
        'Name': 'Generate',
        'Description': 'a preview of what the theme looks like'
      },
      {
        'Completed': false,
        'Name': 'Cleanup',
        'Description': 'the files on the server'
      },
    ];
    let lastEmbed: EmbedBuilder = (new EmbedBuilder).setTitle('-');
    let ActionRow: ActionRowBuilder;
    const GetStepEmbedField:()=>EmbedField = ()=>{
      let Progress = '';
      let isCurrent = true;
      Steps.forEach(v=>{
        Progress += `**${v.Completed ? Emojis.success : v.Failed ? Emojis.error : isCurrent ? Emojis.loading : Emojis.dot} ${v.Name}** ${v.Description ?? ''}\n`;
        if (isCurrent && !v.Completed)
          isCurrent = false;
      });
      return {
        'inline': false,
        'name': 'Progress',
        'value': Progress
      };
    };
    const GetMessageContentsForUpdate = (embed?: EmbedBuilder)=>{
      lastEmbed = embed ?? lastEmbed;
      embed = lastEmbed;
      const IRow = ActionRow ? { 'components': [ActionRow] } : {};
      const _embed = { ...embed.data };
      _embed.fields = [GetStepEmbedField()];
      for (const k in embed.data.fields) {
        const element = embed.data.fields[k];
        _embed.fields.push(element);
      }
      return {
        'embeds': [_embed],
        ...IRow
      };
    };
    const SetEmbed = async (embed?: EmbedBuilder)=>{
      // @ts-ignore
      await interaction.editReply(GetMessageContentsForUpdate(embed));
    };
    const NextStep = async ()=>{
      Steps.find(v=>v.Completed === false).Completed = true;
      await SetEmbed(lastEmbed);
    };
    const FailStep = async ()=>{
      Steps.find(v=>v.Completed === false).Failed = true;
      await SetEmbed(lastEmbed);
    };
    let Failed = false;
    let DlPath: string;
    const RunStep = async (StepCb: ()=>any)=>{
      if (Failed)
        return;
      await SetEmbed();
      try {
        await StepCb();
        await NextStep();
      } catch (error) {
        lastEmbed.addFields([{
          'name': 'Error',
          'value': `An error ocurred while processing a step:
${replaceSensitive(`${error}`.split(process.cwd()).join('<CWD>'))}`
        }]);
        Failed = true;
        await FailStep();
        if (DlPath && fs.existsSync(DlPath))
          fs.rmSync(DlPath);
      }
    };
    lastEmbed.setTitle('Fluxus Theme Generator').setTimestamp(Date.now())
      .setFooter({ 'text': 'By Yielding#3961' });
    // Step: Prepare
    await RunStep(async ()=>{ // mainly input check from here
      if (!SupportedImages.includes(file.contentType))
        throw new InputValidationError(`Image Content Type is not supported.
List of supported image types are:
 - ${SupportedImages.map(v=>{
    const split = v.split('/');
    return `${split.shift()}/**${split.join('/')}**`;
  }).join('\n - ')}`);
      if (!imagesChannel)
      // @ts-ignore
        imagesChannel = await interaction.client.channels.fetch('1001555842820231168', {
          'force': true,
          'allowUnknownGuild': true,
          'cache': true
        });
      if (file.size > FileLimit)
        throw new InputValidationError('File too big!\nPlease limit file sizes to 8MB');
    });
    const EmbedId = MakeId();
    let UseOverlay = false;
    // Step: Configure
    await RunStep(async ()=>{
      lastEmbed.setColor('#7aaae7').addFields(
        {
          'name': 'Customize', 'value': `You have 2 minutes (ends <t:${Math.floor(Date.now() / 1000) + 60 * 2}:R>) to customize the theme using the below settings.`
        }
      )
        .setImage(file.url);
      ActionRow = new ActionRowBuilder;
      const ContinueId = EmbedId + MakeId();
      const RenderButtons = async ()=>{
        const ToggleOverlayId = EmbedId + MakeId();
        ActionRow
          .setComponents(
            (new ButtonBuilder)
              .setCustomId(ToggleOverlayId)
              .setLabel('Transparent Overlay')
              .setStyle(UseOverlay ? ButtonStyle.Success : ButtonStyle.Danger),
            (new ButtonBuilder)
              .setCustomId(ContinueId)
              .setLabel('Create Theme')
              .setStyle(ButtonStyle.Primary)
              .setEmoji(Emojis.success),
          );
        AwaitCallbackEvent(ToggleOverlayId, 120).then(async(v:ButtonInteraction)=>{
          if (v) {
            UseOverlay = !UseOverlay;
            // @ts-ignore
            await v.update(GetMessageContentsForUpdate());
            await RenderButtons();
            // await v.deferReply();
            // await v.deleteReply();
          }
        });
        await SetEmbed();
      };
      await RenderButtons();
      const ContinueEvent: ButtonInteraction | null = await AwaitCallbackEvent(ContinueId, 120);
      if (ContinueEvent) {
        // await ContinueEvent.reply({
        //   'embeds': [(new EmbedBuilder).setTitle('Processing Theme')
        //     .setDescription('Please wait while we create your theme.')],
        //   'ephemeral': true
        // });
        // @ts-ignore
        await ContinueEvent.update(GetMessageContentsForUpdate());
        lastEmbed.setFields([]).setImage('https://cdn.discordapp.com/attachments/959617195682443376/1001533615525605386/1x1_40a0b6ff.png');
        ActionRow.setComponents(
          (new ButtonBuilder)
            .setCustomId('uselessbuttonlol')
            .setLabel('Please Wait')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );
        lastEmbed.setColor('#3a970f');
        return;
      }
      else {
        lastEmbed.setColor('#97435a').setFields([])
          .setImage('https://cdn.discordapp.com/attachments/959617195682443376/1001533615525605386/1x1_40a0b6ff.png');
        ActionRow.setComponents(
          (new ButtonBuilder)
            .setCustomId('uselessbuttonlol')
            .setLabel('Timed out.')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );
        throw new TimedOutException('Did not finish customizing in time');
      }
    });
    // Step: Download
    let FileName: string;
    let extension: string;
    await RunStep(async ()=>{
      extension = file.contentType?.replace(/\\/gi, '/').split('/')
        .pop();
      FileName = `${file.id}.${extension}`;
      DlPath = path.join(DownloadDir, FileName);
      const writer = fs.createWriteStream(DlPath);

      const response = await axios({
        'url': file.proxyURL,
        'method': 'GET',
        'responseType': 'stream'
      });
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    });
    // Step: Parse & Resize
    let WindowState: _gm.State;
    let WindowPath: string;
    let Settings: lib.Settings;
    await RunStep(async ()=>{
      Settings = { 'overlay': UseOverlay };
      WindowPath = path.join(WindowDir, FileName);
      WindowState = await lib.ImageToWindow(DlPath, Settings);
      const Write = ()=>new Promise((resolve, reject)=>{
        WindowState.write(WindowPath, (err)=>{
          if (err)
            reject(err);
          else
            resolve(void 0);
        });
      });
      await Write();
      if (fs.statSync(WindowPath).size >= FileLimit){
        if (extension === 'gif')
          throw new ValidationError('Output Size too big!');
        WindowPath = path.join(WindowDir, FileName.replace(extension, 'png'));
        await Write();
      }
    });
    // Step: Crop & Blur
    let TopbarState: _gm.State;
    let TopbarPath: string;
    await RunStep(async ()=>{
      TopbarPath = path.join(TopbarDir, FileName);
      TopbarState = lib.WindowToTopbar(WindowState, Settings);
      const Write = ()=>new Promise((resolve, reject)=>{
        TopbarState.write(TopbarPath, (err)=>{
          if (err)
            reject(err);
          else
            resolve(void 0);
        });
      });
      await Write();
      if (fs.statSync(TopbarPath).size >= FileLimit){
        if (extension === 'gif')
          throw new ValidationError('Output Size too big!');
        TopbarPath = path.join(TopbarDir, FileName.replace(extension, 'png'));
        await Write();
      }
    });
    // Step: Upload
    let Images: {
      Topbar: string;
      Window: string;
    };
    let ImageEmbed: Message<boolean>;
    await RunStep(async ()=>{
      ImageEmbed = await imagesChannel.send({
        'embeds': [(new EmbedBuilder).setTitle('Image Files')
          .setDescription(`File: ${file.url} (Proxy: <${file.proxyURL}>)`)],
        'files': [
          {
            'name': `window.${extension}`, 'attachment': WindowPath
          }, {
            'name': `topbar.${extension}`, 'attachment': TopbarPath
          }
        ]
      });
      Images = {
        'Window': ImageEmbed.attachments.find(v=>v.name === `window.${extension}`).url,
        'Topbar': ImageEmbed.attachments.find(v=>v.name === `topbar.${extension}`).url,
      };
      ActionRow.setComponents(
        (new ButtonBuilder)
          .setURL(Images.Window)
          .setDisabled(false)
          .setStyle(ButtonStyle.Link)
          .setLabel('Window Image'),
        (new ButtonBuilder)
          .setURL(Images.Topbar)
          .setDisabled(false)
          .setStyle(ButtonStyle.Link)
          .setLabel('Titlebar Image')
      );
    });
    // Step: Upload Theme File
    await RunStep(async ()=>{
      const ThemeFile = path.resolve(OutputDir, `${FileName}.flux`);
      const Theme = {
        '': 'Made Using Fluxus Theme Maker by Yielding#3961',
        'main_grid': Images.Window,
        'top_bar': Images.Topbar,
        'border_background': '#00000000',
        'tab_background': `#00000000`, // `${await lib.TopbarToAccentColour(Topbar)}77`,
        '​': 'https://cord.breadhub.cc/'
      };
      fs.writeFileSync(ThemeFile, JSON.stringify(Theme));
      const FluxusThemeMsg = await imagesChannel.send({
        'files': [{
          'name': 'theme.flux',
          'attachment': ThemeFile
        }],
        'embeds': [(new EmbedBuilder).setTitle('Theme File')
          .setDescription(`[Image Files URL](${ImageEmbed.url})`)]
      });
      ActionRow.components.unshift(
        (new ButtonBuilder)
          .setURL(FluxusThemeMsg.attachments.first().url)
          .setDisabled(false)
          .setStyle(ButtonStyle.Link)
          .setLabel('theme.flux')
      );
      fs.rmSync(ThemeFile);
    });
    // Step: Generate Preview
    await RunStep(async ()=>{
      const OutFile = path.join(OutPreviewDir, FileName);
      await new Promise((resolve, reject)=>{
        gm(lib.X, lib.Y, 'transparent')
          .setFormat('png')
          .gravity('center')
          .draw(`image over 0,0 0,0 "${WindowPath}"`)
          .gravity('top')
          .draw(`image over 0,0 0,0 "${TopbarPath}"`)
          .gravity('center')
          .draw(`image over 0,0 0,0 "${lib.Overlays.Fluxus}"`)
          // eslint-disable-next-line no-extra-parens
          .write(OutFile, (err)=>(err ? reject(err) : resolve(void 0)));
      });
      if (fs.existsSync(OutFile)){
        lastEmbed.setImage((await imagesChannel.send({
          'files': [{
            'name': `preview.${FileName}`,
            'attachment': OutFile,
          }],
          'embeds': [(new EmbedBuilder).setTitle('Preview File')
            .setDescription(`[Image Files URL](${ImageEmbed.url})`)]
        })).attachments.first().url).addFields({
          'name': 'Preview',
          'value': 'Preview of the theme (may not be exact):'
        });
        fs.rmSync(OutFile);
      }
    });
    // Step: Cleanup
    await RunStep(async ()=>{
      fs.rmSync(TopbarPath);
      fs.rmSync(WindowPath);
      fs.rmSync(DlPath);
    });
  },
};

module.exports = Command;
