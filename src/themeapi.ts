import * as _gm from 'gm';
import * as fs from 'fs';
import * as path from 'path';
const maskDir = path.resolve(process.cwd(), 'masks');
if (!fs.existsSync(maskDir))
  fs.mkdirSync(maskDir);
const gm = _gm.default;// _gm.subClass({ 'imageMagick': true });
export const X = 1854;
export const Y = 1090;
export type Settings = {
  overlay?:boolean
}
export const Overlays = {
  'Top': path.resolve(process.cwd(), 'overlays', 'top.png'),
  'Bottom': path.resolve(process.cwd(), 'overlays', 'bottom.png'),
  'Fluxus': path.resolve(process.cwd(), 'overlays', 'fluxus-preview.png')
};
export const ImageToWindow = async (ImagePath: string, Settings?: Settings)=>{
  let State = gm(ImagePath);
  const isGif = ImagePath.toLowerCase().endsWith('.gif');
  const TargetX = isGif ? X / 2 : X;
  const TargetY = isGif ? Y / 2 : Y;
  State = State.resize(TargetX, TargetY, '>').crop(TargetX, TargetY)
    .resize(TargetX, TargetY, '<')
    .gravity('center')
    .crop(TargetX, TargetY)
    .resize(TargetX, TargetY, '!');
  if (Settings?.overlay)
    State = State.gravity('NorthEast').draw(`image over 0,0 0,0 "${Overlays.Bottom}"`);
  return State;
};
export const WindowToTopbar = (ImageState: _gm.State, Settings?: Settings) => {
  let State = ImageState
    .gravity('top')
    .resize(X, Y, '!')
    .blur(0, 16)
    .crop(X, 82, 0, 0);
  if (Settings?.overlay)
    State = State.gravity('NorthEast').draw(`image over 0,0 0,0 "${Overlays.Top}"`);
  return State;
};
// export const TopbarToAccentColour = async (ImageState: _gm.State) => new Promise((resolve, reject)=>ImageState.resize(1, 1).setFormat('ppm')
//   .toBuffer((err, buffer) => {
//     if (err)
//       reject(err);
//     const r = buffer.readUint8(buffer.length - 3);
//     const g = buffer.readUint8(buffer.length - 2);
//     const b = buffer.readUint8(buffer.length - 1);
//     const toHexDigit = (int: number) => {
//       let digit =  int.toString(16);
//       if (digit.length === 1)
//         digit = `0${digit}`;
//     };
//     resolve(`#${toHexDigit(r)}${toHexDigit(g)}${toHexDigit(b)}`);
//   }));
// ImageToWindow('input.png').write('Window.png',()=>{})
// WindowToTopbar(ImageToWindow('input.png')).write('Topbar.png',()=>{})
