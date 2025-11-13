import { Image } from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      /**
       * Set image with custom attributes
       */
      setResizableImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number | string;
        height?: number | string;
        alignment?: 'left' | 'center' | 'right';
      }) => ReturnType;
    };
  }
}

export interface ResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
  enableResize: boolean;
  defaultWidth?: number;
  defaultAlignment?: 'left' | 'center' | 'right';
}

/**
 * Extended Image extension with resizable and alignment capabilities
 */
export const ResizableImage = Image.extend<ResizableImageOptions>({
  name: 'resizableImage',

  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: false,
      enableResize: true,
      defaultWidth: undefined,
      defaultAlignment: 'center',
      HTMLAttributes: {
        class: 'resizable-image',
      },
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) {
            return {};
          }
          return { src: attributes.src };
        },
      },
      alt: {
        default: null,
        parseHTML: element => element.getAttribute('alt'),
        renderHTML: attributes => {
          if (!attributes.alt) {
            return {};
          }
          return { alt: attributes.alt };
        },
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.title) {
            return {};
          }
          return { title: attributes.title };
        },
      },
      width: {
        default: this.options.defaultWidth,
        parseHTML: element => {
          const width = element.style.width || element.getAttribute('width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px;`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.style.height || element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
            style: `${attributes.width ? `width: ${attributes.width}px; ` : ''}height: ${attributes.height}px;`,
          };
        },
      },
      alignment: {
        default: this.options.defaultAlignment,
        parseHTML: element => {
          const align = element.getAttribute('data-alignment');
          return align || 'center';
        },
        renderHTML: attributes => {
          return {
            'data-alignment': attributes.alignment || 'center',
            class: `align-${attributes.alignment || 'center'}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    
    // Add alignment class
    const alignment = attrs['data-alignment'] || 'center';
    const existingClasses = attrs.class || '';
    attrs.class = `${existingClasses} align-${alignment}`.trim();

    return ['img', attrs];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setResizableImage:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('div');
      container.className = 'resizable-image-container';
      container.setAttribute('data-alignment', node.attrs.alignment || 'center');

      // Create image wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'resizable-image-wrapper';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.maxWidth = '100%';

      // Create image element
      const img = document.createElement('img');
      img.src = node.attrs.src;
      if (node.attrs.alt) img.alt = node.attrs.alt;
      if (node.attrs.title) img.title = node.attrs.title;
      if (node.attrs.width) img.style.width = `${node.attrs.width}px`;
      if (node.attrs.height) img.style.height = `${node.attrs.height}px`;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';

      wrapper.appendChild(img);

      // Add resize handles if enabled
      if (this.options.enableResize) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.style.cssText = `
          position: absolute;
          right: 0;
          bottom: 0;
          width: 16px;
          height: 16px;
          background: #000;
          cursor: nwse-resize;
          border: 2px solid #fff;
          display: none;
        `;

        // Show handle on hover
        wrapper.addEventListener('mouseenter', () => {
          handle.style.display = 'block';
        });
        wrapper.addEventListener('mouseleave', () => {
          handle.style.display = 'none';
        });

        // Resize functionality
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          isResizing = true;
          startX = e.clientX;
          startWidth = img.offsetWidth;
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        });

        const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          
          const diff = e.clientX - startX;
          const newWidth = Math.max(100, startWidth + diff); // Min width 100px
          
          img.style.width = `${newWidth}px`;
        };

        const handleMouseUp = () => {
          if (!isResizing) return;
          
          isResizing = false;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);

          // Update node attributes
          const width = img.offsetWidth;
          if (typeof getPos === 'function') {
            editor.commands.updateAttributes(this.name, {
              width,
            });
          }
        };

        wrapper.appendChild(handle);
      }

      container.appendChild(wrapper);

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }

          // Update image attributes
          img.src = updatedNode.attrs.src;
          if (updatedNode.attrs.alt) img.alt = updatedNode.attrs.alt;
          if (updatedNode.attrs.title) img.title = updatedNode.attrs.title;
          if (updatedNode.attrs.width) img.style.width = `${updatedNode.attrs.width}px`;
          if (updatedNode.attrs.height) img.style.height = `${updatedNode.attrs.height}px`;
          
          container.setAttribute('data-alignment', updatedNode.attrs.alignment || 'center');

          return true;
        },
      };
    };
  },
});
