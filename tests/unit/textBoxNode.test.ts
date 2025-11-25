/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextBoxNode from '../../lib/tiptap/TextBoxNode';

describe('TextBoxNode extension', () => {
    it('inserts a text box node and emits metadata updates', () => {
        const editor = new Editor({
            extensions: [
                StarterKit,
                TextBoxNode,
            ],
        });

        expect(editor.commands.insertTextBox({ blockId: 'block-test', width: 320, height: 180 })).toBe(true);

        const json = editor.getJSON();
        const textBoxNode = json.content?.find((node) => node.type === 'textBox');

        expect(textBoxNode).toBeDefined();
        expect(textBoxNode?.attrs?.blockId).toBe('block-test');
        expect(textBoxNode?.attrs?.width).toBe(320);
        expect(textBoxNode?.content?.[0]?.type).toBe('paragraph');
    });
});
