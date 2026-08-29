// App-facing seed helpers: the defaults applied per user (e.g. on sign-up).
// The CLI/global seed entrypoint lives in `./seed.ts` and is run via `pnpm db:seed`.
export { defaultCommandsSeed } from './commands';
export { defaultUserSkinCollection } from './skins/collection';
export { defaultUserSkins } from './skins/skin';
