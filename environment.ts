import dotenv from 'dotenv';
import {
  copyFileSync, existsSync
} from 'fs-extra';
import path from 'path';
const envfile = path.resolve('.env');
const envexamplefile = path.resolve('.env-example');
if (!existsSync(envfile))
  copyFileSync(envexamplefile, envfile);

const file = dotenv.config({ 'path': envfile });

/**
 * Export constants from the dotenv file
 */
export const env = file && file.parsed || {};
