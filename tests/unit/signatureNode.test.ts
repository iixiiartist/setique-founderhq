/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import SignatureNode from '../../lib/tiptap/SignatureNode';

describe('SignatureNode extension', () => {
    it('inserts a signature node with expected attributes', () => {
        const editor = new Editor({
            extensions: [StarterKit, SignatureNode.configure({ workspaceId: 'workspace-test' })],
        });

        const inserted = editor.commands.insertSignature({
            blockId: 'sig-123',
            width: 400,
            height: 260,
            strokeColor: '#0f172a',
            strokeWidth: 4,
        });

        expect(inserted).toBe(true);
        const json = editor.getJSON();
        const signatureNode = json.content?.find((node) => node.type === 'signature');

        expect(signatureNode).toBeDefined();
        expect(signatureNode?.attrs?.blockId).toBe('sig-123');
        expect(signatureNode?.attrs?.width).toBe(400);
        expect(signatureNode?.attrs?.strokeColor).toBe('#0f172a');
        expect(signatureNode?.attrs?.strokeWidth).toBe(4);
    });
});
