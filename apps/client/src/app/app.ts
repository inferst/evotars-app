import { Connection } from '@/connection/connection';
import { Debug } from '@/debug/debug';
import { getGuid } from '@/utils/utils';
import { Evotars } from 'evotars';

const apiUrl = import.meta.env.VITE_API_URL;

export class App {
  private connection = new Connection();

  public async init(): Promise<void> {
    const guid = getGuid();

    const evotars = new Evotars(document.body, {
      font: '/static/fonts/Rubik-VariableFont_wght.ttf',
      sounds: { jump: { src: '/static/sounds/jump.mp3' } },
      assets: {
        poof: '/static/poof.json',
        rip1: '/static/rip1.png',
        rip2: '/static/rip2.png',
        skull: '/static/skull.png',
        weight: '/static/weight.png',
      },
      spriteLoaderFn: async (name: string) => {
        try {
          const data = await fetch(apiUrl + '/admin/sprite/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json;charset=utf-8',
            },
            body: JSON.stringify({
              sprite: name,
              guid: guid,
            }),
          });

          return await data.json();
        } catch (e) {
          console.error(e);
          return;
        }
      },
    });

    await evotars.run();

    if (import.meta.env.DEV) {
      new Debug(evotars);
    }

    this.connection.init();

    this.connection.onSettings((data) => {
      evotars.updateSettings({
        fallingEvotars: data.fallingEvotars,
        fallingRaiders: data.fallingRaiders,
        showAnonymousEvotars: data.showAnonymousEvotars,
        maxEvotars: data.maxEvotars,
      });
    });

    this.connection.onMessage((data) => evotars.processMessage(data));
    this.connection.onMessageDelete((data) =>
      evotars.processMessageDelete(data),
    );
    this.connection.onBan((data) => evotars.processBan(data));
    this.connection.onAction((data) => evotars.processAction(data));
    this.connection.onChatters((data) => evotars.processChatters(data));
    this.connection.onRaid((data) => evotars.processRaid(data));
  }
}

export const app = new App();
