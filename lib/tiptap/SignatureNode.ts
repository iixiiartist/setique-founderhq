import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SignatureNodeView from './SignatureNodeView';
import type { StructuredBlock } from '../../types';

export interface SignatureNodeAttributes {
    blockId: string | null;
    width: number;
    height: number;
    x: number;
    y: number;
    zIndex: number;
    rotation: number;
    strokeColor: string;
    strokeWidth: number;
    assetUrl?: string | null;
    assetPath?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface SignatureNodeOptions {
    workspaceId: string;
    docId?: string;
    onMetadataChange?: (block: StructuredBlock) => void;
    onBlockRemoved?: (blockId: string) => void;
    subscribeToBlockMetadata?: (blockId: string, listener: (metadata?: StructuredBlock) => void) => () => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        signature: {
            insertSignature: (attributes: Partial<SignatureNodeAttributes>) => ReturnType;
            updateSignature: (attributes: Partial<SignatureNodeAttributes>) => ReturnType;
        };
    }
}

const SignatureNode = Node.create<SignatureNodeOptions>({
    name: 'signature',
    group: 'block',
    atom: true,
    draggable: true,
    isolating: true,

    addOptions() {
        return {
            workspaceId: '',
            docId: undefined,
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
                default: 320,
            },
            height: {
                default: 160,
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
            strokeColor: {
                default: '#111827',
            },
            strokeWidth: {
                default: 3,
            },
            assetUrl: {
                default: null,
            },
            assetPath: {
                default: null,
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
                tag: 'section[data-block-type="signature"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['section', mergeAttributes(HTMLAttributes, { 'data-block-type': 'signature' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(SignatureNodeView);
    },

    addCommands() {
        return {
            insertSignature:
                (attributes) =>
                ({ commands }) => {
                    const now = new Date().toISOString();
                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            blockId: attributes.blockId ?? null,
                            width: attributes.width ?? 320,
                            height: attributes.height ?? 160,
                            x: attributes.x ?? 0,
                            y: attributes.y ?? 0,
                            zIndex: attributes.zIndex ?? 0,
                            rotation: attributes.rotation ?? 0,
                            strokeColor: attributes.strokeColor ?? '#111827',
                            strokeWidth: attributes.strokeWidth ?? 3,
                            assetUrl: attributes.assetUrl ?? null,
                            assetPath: attributes.assetPath ?? null,
                            createdAt: attributes.createdAt ?? now,
                            updatedAt: attributes.updatedAt ?? now,
                        },
                    });
                },
            updateSignature:
                (attributes) =>
                ({ commands }) =>
                    commands.updateAttributes(this.name, attributes),
        };
    },
});

export default SignatureNode;
