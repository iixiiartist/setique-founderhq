import React from 'react';
import Modal from './Modal';
import { useKeyboardShortcutLabels } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const { shortcuts, mod } = useKeyboardShortcutLabels();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-6">
        {shortcuts.map((category, idx) => (
          <div key={idx}>
            <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
              {category.category}
            </h3>
            <div className="space-y-2">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex justify-between items-center py-2">
                  <span className="text-sm">{item.description}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, keyIdx) => (
                      <React.Fragment key={keyIdx}>
                        <kbd className="px-2 py-1 text-xs font-bold border-2 border-black bg-white shadow-neo-sm">
                          {key}
                        </kbd>
                        {keyIdx < item.keys.length - 1 && (
                          <span className="text-xs text-gray-500 mx-1">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-black">
          <p className="text-sm">
            <strong>Pro Tip:</strong> Press <kbd className="px-2 py-1 text-xs font-bold border-2 border-black bg-white shadow-neo-sm">?</kbd> anywhere to show this help.
          </p>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border-2 border-black">
          <h4 className="font-bold mb-2">Accessibility Features</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>All features work with keyboard only (no mouse needed)</li>
            <li>Focus indicators show where you are</li>
            <li>Screen reader compatible</li>
            <li>Skip to content link at top of page</li>
            <li>WCAG 2.1 AA compliant</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
