import { Editor, JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createCollaborationEditor = (doc: Y.Doc) =>
  new Editor({
    extensions: [
      StarterKit.configure({
        history: false,
      } as Partial<any>),
      Collaboration.configure({ document: doc }),
    ],
    content: '',
  });

export interface EditorSession {
  editor: Editor;
  doc: Y.Doc;
  destroy: () => void;
}

export class InMemoryDocStore {
  contentJson: JSONContent | null = null;
  contentPlain = '';
  snapshot: Uint8Array | null = null;

  blocksMetadata: Record<string, unknown> | null = null;

  saveFromEditor(
    session: EditorSession,
    options?: { includeDb?: boolean; metadata?: Record<string, unknown> | null },
  ) {
    const includeDb = options?.includeDb ?? true;

    if (includeDb) {
      this.contentJson = session.editor.getJSON();
      this.contentPlain = session.editor.getText();
      if (options?.metadata !== undefined) {
        this.blocksMetadata = options.metadata ? clone(options.metadata) : null;
      }
    }

    this.snapshot = Y.encodeStateAsUpdate(session.doc);
  }

  createReloadedSession(): EditorSession {
    const doc = new Y.Doc();
    if (this.snapshot) {
      Y.applyUpdate(doc, this.snapshot);
    }

    const editor = createCollaborationEditor(doc);
    if (editor.isEmpty && this.contentJson) {
      editor.commands.setContent(this.contentJson);
    }

    return {
      editor,
      doc,
      destroy: () => {
        editor.destroy();
        doc.destroy();
      },
    };
  }

  reset() {
    this.contentJson = null;
    this.contentPlain = '';
    this.snapshot = null;
    this.blocksMetadata = null;
  }
}

export const createSession = (registry?: Set<EditorSession>): EditorSession => {
  const doc = new Y.Doc();
  const editor = createCollaborationEditor(doc);
  const session: EditorSession = {
    editor,
    doc,
    destroy: () => {
      editor.destroy();
      doc.destroy();
      registry?.delete(session);
    },
  };

  registry?.add(session);
  return session;
};

export const destroySessions = (registry: Set<EditorSession>): void => {
  registry.forEach((session) => session.destroy());
  registry.clear();
};
