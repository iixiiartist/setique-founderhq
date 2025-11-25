import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import TextBoxNodeView from './TextBoxNodeView';
import type { StructuredBlock } from '../../types';

export interface TextBoxNodeAttributes {
    blockId: string | null;
    width: number;
    height: number;
    x: number;
    y: number;
    zIndex: number;
    rotation: number;
    placeholder: string;
    theme: string;
    createdAt?: string | null;
}

export interface TextBoxNodeOptions {
    onMetadataChange?: (block: StructuredBlock) => void;
    onBlockRemoved?: (blockId: string) => void;
    subscribeToBlockMetadata?: (blockId: string, listener: (metadata?: StructuredBlock) => void) => () => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textBox: {
            insertTextBox: (attributes: Partial<TextBoxNodeAttributes>) => ReturnType;
            updateTextBox: (attributes: Partial<TextBoxNodeAttributes>) => ReturnType;
        };
    }
}

const TextBoxNode = Node.create<TextBoxNodeOptions>({
    name: 'textBox',
    group: 'block',
    content: 'block+',
    draggable: true,
    isolating: true,

    addOptions() {
        return {
            onMetadataChange: undefined,
            onBlockRemoved: undefined,
            subscribeToBlockMetadata: undefined,
        };
    },

    addAttributes() {
        return {
            blockId: {
                default: null,
            },
            width: {
                default: 360,
            },
            height: {
                default: 180,
            },
            x: {
                default: 0,
            },
            y: {
                default: 0,
            },
            zIndex: {
                default: 0,
            },
            rotation: {
                default: 0,
            },
            placeholder: {
                default: 'Type your notes',
            },
            theme: {
                default: 'default',
            },
            createdAt: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'section[data-block-type="textbox"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['section', mergeAttributes(HTMLAttributes, { 'data-block-type': 'textbox' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(TextBoxNodeView);
    },

    addCommands() {
        return {
            insertTextBox:
                attributes =>
                ({ commands }) =>
                    commands.insertContent({
                        type: this.name,
                        attrs: {
                            blockId: attributes.blockId ?? null,
                            width: attributes.width ?? 360,
                            height: attributes.height ?? 180,
                            x: attributes.x ?? 0,
                            y: attributes.y ?? 0,
                            zIndex: attributes.zIndex ?? 0,
                            rotation: attributes.rotation ?? 0,
                            placeholder: attributes.placeholder ?? 'Type your notes',
                            theme: attributes.theme ?? 'default',
                            createdAt: attributes.createdAt ?? new Date().toISOString(),
                        },
                        content: [
                            {
                                type: 'paragraph',
                            },
                        ],
                    }),
            updateTextBox:
                attributes =>
                ({ commands }) =>
                    commands.updateAttributes(this.name, attributes),
        };
    },
});

export default TextBoxNode;
