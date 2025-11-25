// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  InMemoryDocStore,
  createSession,
  destroySessions,
  EditorSession,
} from '../helpers/docEditorHarness';

describe('Doc editor smoke test', () => {
  const store = new InMemoryDocStore();
  const activeSessions = new Set<EditorSession>();

  beforeEach(() => {
    store.reset();
  });

  afterEach(() => {
    destroySessions(activeSessions);
  });

  it('persists explicit saves across reloads', () => {
    const session = createSession(activeSessions);

    session.editor.commands.setContent('<p>Pitch deck ready</p>');
    store.saveFromEditor(session);
    session.destroy();

    const reloaded = store.createReloadedSession();

    expect(reloaded.editor.getText().trim()).toBe('Pitch deck ready');

    reloaded.destroy();
  });

  it('prefers Yjs snapshots when database content is stale', () => {
    const session = createSession(activeSessions);

    session.editor.commands.setContent('<p>V1 brief</p>');
    store.saveFromEditor(session);

    session.editor.commands.setContent('<p>Offline iteration</p>');
    store.saveFromEditor(session, { includeDb: false });

    session.destroy();

    const reloaded = store.createReloadedSession();

    expect(store.contentPlain.trim()).toBe('V1 brief');
    expect(reloaded.editor.getText().trim()).toBe('Offline iteration');

    reloaded.destroy();
  });

  it('persists structured block metadata only when database save runs', () => {
    const session = createSession(activeSessions);
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

    store.saveFromEditor(session, { metadata: initialMetadata });

    const offlineMetadata = {
      'block-1': {
        ...initialMetadata['block-1'],
        position: { x: 100, y: 40, zIndex: 1 },
        updatedAt: '2024-02-01T00:00:00.000Z',
      },
    };

    store.saveFromEditor(session, { includeDb: false, metadata: offlineMetadata });

    session.destroy();

    expect(store.blocksMetadata).toEqual(initialMetadata);
  });
});
