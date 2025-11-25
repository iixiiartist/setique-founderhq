import { JSDOM } from 'jsdom';

export type DomTeardown = () => void;

const assignGlobal = (key: string, value: unknown) => {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
};

const restoreGlobal = (key: string, descriptor?: PropertyDescriptor) => {
  if (!descriptor) {
    delete (globalThis as Record<string, unknown>)[key];
    return;
  }

  Object.defineProperty(globalThis, key, descriptor);
};

/**
 * Bootstraps a jsdom instance so TipTap + Yjs can run in Playwright's Node runner.
 */
export const bootstrapEditorDom = (): DomTeardown => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });

  const { window } = dom;
  const originalGlobals: Record<string, PropertyDescriptor | undefined> = {};
  const propsToMirror = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'Node',
    'NodeList',
    'Selection',
    'Range',
    'getComputedStyle',
    'MutationObserver',
    'DOMParser',
    'requestAnimationFrame',
    'cancelAnimationFrame',
  ];

  propsToMirror.forEach((key) => {
    originalGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  });

  assignGlobal('window', window as unknown);
  assignGlobal('document', window.document);
  assignGlobal('navigator', window.navigator);
  assignGlobal('HTMLElement', window.HTMLElement);
  assignGlobal('Node', window.Node);
  assignGlobal('NodeList', window.NodeList);
  assignGlobal('Selection', window.Selection);
  assignGlobal('Range', window.Range);
  assignGlobal('getComputedStyle', window.getComputedStyle.bind(window));
  assignGlobal('MutationObserver', window.MutationObserver);
  assignGlobal('DOMParser', window.DOMParser);
  assignGlobal('requestAnimationFrame', window.requestAnimationFrame.bind(window));
  assignGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window));

  return () => {
    propsToMirror.forEach((key) => {
      restoreGlobal(key, originalGlobals[key]);
    });
    window.close();
  };
};
