import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ShapeNodeView from './ShapeNodeView';
import type { StructuredBlock } from '../../types';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';

export type ShapeAlignment = 'left' | 'center' | 'right';

export interface ShapeNodeAttributes {
    blockId: string | null;
    shapeType: ShapeType;
    width: number;
    height: number;
    x: number;
    y: number;
    zIndex: number;
    rotation: number;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    alignment: ShapeAlignment;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ShapeNodeOptions {
    onMetadataChange?: (block: StructuredBlock) => void;
    onBlockRemoved?: (blockId: string) => void;
    subscribeToBlockMetadata?: (blockId: string, listener: (metadata?: StructuredBlock) => void) => () => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        shape: {
            insertShape: (attributes: Partial<ShapeNodeAttributes>) => ReturnType;
            updateShape: (attributes: Partial<ShapeNodeAttributes>) => ReturnType;
        };
    }
}

const ShapeNode = Node.create<ShapeNodeOptions>({
    name: 'shape',
    group: 'block',
    atom: true,
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
            shapeType: {
                default: 'rectangle',
            },
            width: {
                default: 200,
            },
            height: {
                default: 150,
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
            fillColor: {
                default: '#3b82f6',
            },
            strokeColor: {
                default: '#1e40af',
            },
            strokeWidth: {
                default: 2,
            },
            opacity: {
                default: 1,
            },
            alignment: {
                default: 'center',
                parseHTML: element => element.getAttribute('data-alignment') || 'center',
                renderHTML: attributes => {
                    return {
                        'data-alignment': attributes.alignment || 'center',
                    };
                },
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
                tag: 'div[data-block-type="shape"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 
            'data-block-type': 'shape',
            'data-alignment': HTMLAttributes.alignment || 'center',
        }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ShapeNodeView);
    },

    addCommands() {
        return {
            insertShape:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: attributes,
                    });
                },
            updateShape:
                (attributes) =>
                ({ commands }) => {
                    return commands.updateAttributes(this.name, attributes);
                },
        };
    },
});

export default ShapeNode;
