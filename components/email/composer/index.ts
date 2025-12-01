// EmailComposer Module Exports
// Refactored components for modular email composition

// Main component
export { EmailComposerRefactored } from './EmailComposerRefactored';
export type { EmailComposerProps } from './EmailComposerRefactored';

// Sub-components
export { EditorToolbar } from './EditorToolbar';
export { ToolbarButton, DropdownButton } from './ToolbarButtons';
export { AIActionMenu } from './AIActionMenu';
export {
    ComposerHeader,
    ComposerFields,
    ComposerFooter,
    GTMTemplateModal,
    ResearchResultsPanel,
    AttachmentsBar,
    AccountErrorBanner,
    AILimitBanner
} from './ComposerParts';

// Hook
export { useEmailComposer } from './hooks/useEmailComposer';
export type { EmailAttachment } from './hooks/useEmailComposer';

// Constants
export {
    FONT_SIZES,
    TEXT_COLORS,
    HIGHLIGHT_COLORS,
    FONT_FAMILIES,
    LINE_SPACING_OPTIONS,
    EMAIL_TEMPLATES,
    AI_ACTIONS
} from './constants';
export type { AIAction } from './constants';
