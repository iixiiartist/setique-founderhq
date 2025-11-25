// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';

const createEditor = (doc: Y.Doc) =>
    new Editor({
        extensions: [
            StarterKit.configure({
                history: false,
            } as Partial<any>),
            Collaboration.configure({ document: doc }),
        ],
        content: '',
    });

const bridgeDocs = (docA: Y.Doc, docB: Y.Doc) => {
    const relayAToB = (update: Uint8Array) => {
        Y.applyUpdate(docB, update);
    };
    const relayBToA = (update: Uint8Array) => {
        Y.applyUpdate(docA, update);
    };

    docA.on('update', relayAToB);
    docB.on('update', relayBToA);

    return () => {
        docA.off('update', relayAToB);
        docB.off('update', relayBToA);
    };
};

describe('collaboration dual editor', () => {
    const activeEditors = new Set<Editor>();
    const activeDocs = new Set<Y.Doc>();

    afterEach(() => {
        activeEditors.forEach((editor) => editor.destroy());
        activeDocs.forEach((doc) => doc.destroy());
        activeEditors.clear();
        activeDocs.clear();
    });

    it('merges concurrent edits after a simulated disconnect + resync', () => {
        const docA = new Y.Doc();
        const docB = new Y.Doc();
        activeDocs.add(docA);
        activeDocs.add(docB);

        const disconnect = bridgeDocs(docA, docB);

        const editorA = createEditor(docA);
        const editorB = createEditor(docB);
        activeEditors.add(editorA);
        activeEditors.add(editorB);

        editorA.commands.setContent('<p>Shared launch brief</p>');
        expect(editorB.getText().includes('Shared launch brief')).toBe(true);

        // Simulate network drop.
        disconnect();

        editorA.commands.insertContent('<p>Offline edits from A</p>');
        editorB.commands.insertContent('<p>Offline edits from B</p>');

        // Re-sync by exchanging state snapshots, then reconnect bridge.
        const updateFromA = Y.encodeStateAsUpdate(docA);
        const updateFromB = Y.encodeStateAsUpdate(docB);
        Y.applyUpdate(docB, updateFromA);
        Y.applyUpdate(docA, updateFromB);
        bridgeDocs(docA, docB);

        const textA = editorA.getText();
        const textB = editorB.getText();

        expect(textA).toContain('Offline edits from A');
        expect(textA).toContain('Offline edits from B');
        expect(textB).toBe(textA);
    });
});
