// Type definitions for Electron APIs exposed through preload
export {};

declare global {
  interface Window {
    electron?: {
      platform: NodeJS.Platform;
      appVersion: string;
      send: (channel: string, data: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      openExternal: (url: string) => void;
    };
    env?: {
      NODE_ENV: string;
      IS_ELECTRON: boolean;
    };
  }
}
