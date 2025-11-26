import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import FrameNodeView from './FrameNodeView';
import type { StructuredBlock } from '../../types';

export interface FrameNodeAttributes {
    blockId: string | null;
    width: number;
    height: number;
    x: number;
    y: number;
    zIndex: number;
    rotation: number;
    label: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    padding: number;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface FrameNodeOptions {
    onMetadataChange?: (block: StructuredBlock) => void;
    onBlockRemoved?: (blockId: string) => void;
    subscribeToBlockMetadata?: (blockId: string, listener: (metadata?: StructuredBlock) => void) => () => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        frame: {
            insertFrame: (attributes: Partial<FrameNodeAttributes>) => ReturnType;
            updateFrame: (attributes: Partial<FrameNodeAttributes>) => ReturnType;
        };
    }
}

const FrameNode = Node.create<FrameNodeOptions>({
    name: 'frame',
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
                default: 400,
            },
            height: {
                default: 300,
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
            label: {
                default: 'Frame',
            },
            backgroundColor: {
                default: '#ffffff',
            },
            borderColor: {
                default: '#e5e7eb',
            },
            borderWidth: {
                default: 1,
            },
            borderRadius: {
                default: 8,
            },
            padding: {
                default: 16,
            },
            createdAt: {
                default: null,
            },
            updatedAt: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'section[data-block-type="frame"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['section', mergeAttributes(HTMLAttributes, { 'data-block-type': 'frame' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(FrameNodeView);
    },

    addCommands() {
        return {
            insertFrame:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: attributes,
                        content: [
                            {
                                type: 'paragraph',
                            },
                        ],
                    });
                },
            updateFrame:
                (attributes) =>
                ({ commands }) => {
                    return commands.updateAttributes(this.name, attributes);
                },
        };
    },
});

export default FrameNode;
