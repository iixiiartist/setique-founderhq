import { expect, test } from '@playwright/test';
import { bootstrapEditorDom } from '../helpers/jsdomEnvironment';
import type { DomTeardown } from '../helpers/jsdomEnvironment';
import { InMemoryDocStore, createSession, destroySessions } from '../helpers/docEditorHarness';
import type { EditorSession } from '../helpers/docEditorHarness';

const initialize = () => {
  const store = new InMemoryDocStore();
  const activeSessions = new Set<EditorSession>();
  let teardown: DomTeardown | null = null;

  return {
    store,
    activeSessions,
    setupDom() {
      teardown = bootstrapEditorDom();
      store.reset();
    },
    cleanup() {
      destroySessions(activeSessions);
      teardown?.();
      teardown = null;
    },
  };
};

const harness = initialize();

test.describe('Doc persistence (Playwright)', () => {
  test.beforeEach(() => {
    harness.setupDom();
  });

  test.afterEach(() => {
    harness.cleanup();
  });

  test('persists manual saves across reloads', async () => {
    const session = createSession(harness.activeSessions);

    session.editor.commands.setContent('<p>Pitch deck ready</p>');
    harness.store.saveFromEditor(session);
    session.destroy();

    const reloaded = harness.store.createReloadedSession();

    expect(reloaded.editor.getText().trim()).toBe('Pitch deck ready');

    reloaded.destroy();
  });

  test('prefers Yjs snapshot when database snapshot is stale', async () => {
    const session = createSession(harness.activeSessions);

    session.editor.commands.setContent('<p>V1 brief</p>');
    harness.store.saveFromEditor(session);

    session.editor.commands.setContent('<p>Offline iteration</p>');
    harness.store.saveFromEditor(session, { includeDb: false });

    session.destroy();

    const reloaded = harness.store.createReloadedSession();

    expect(harness.store.contentPlain?.trim()).toBe('V1 brief');
    expect(reloaded.editor.getText().trim()).toBe('Offline iteration');

    reloaded.destroy();
  });

  test('blocks metadata stays tied to explicit database saves', async () => {
    const session = createSession(harness.activeSessions);
    const initialMetadata = {
      'block-1': {
        id: 'block-1',
        type: 'textbox',
        position: { x: 0, y: 0, zIndex: 0 },
        size: { width: 320, height: 200 },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    };

    harness.store.saveFromEditor(session, { metadata: initialMetadata });

    const offlineMetadata = {
      'block-1': {
        ...initialMetadata['block-1'],
        position: { x: 100, y: 40, zIndex: 1 },
        updatedAt: '2024-02-01T00:00:00.000Z',
      },
    };

    harness.store.saveFromEditor(session, { includeDb: false, metadata: offlineMetadata });

    session.destroy();

    expect(harness.store.blocksMetadata).toEqual(initialMetadata);
  });
});
