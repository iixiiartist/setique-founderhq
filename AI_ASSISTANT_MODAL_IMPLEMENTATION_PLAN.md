# AI Assistant Modal UI/UX Implementation Plan

## 🎯 Objective
Transform embedded AI assistants into minimizable, floating modals that follow scroll and provide better UX without breaking current functionality.

## 📊 Research: Best Practices

### Industry Standards Analysis

**1. Intercom/Drift Pattern (Recommended)**
- Floating Action Button (FAB) in bottom-right corner
- Expands into full modal on click
- Minimizes back to FAB
- Shows notification badge for new messages
- Fixed positioning (follows scroll)
- **Pros**: Familiar, non-intrusive, mobile-friendly
- **Cons**: Single assistant at a time

**2. Facebook Messenger Pattern**
- Minimized chat heads in bottom-right
- Multiple chats can be minimized
- Click to expand to full window
- **Pros**: Supports multiple conversations
- **Cons**: Can be cluttered, complex to implement

**3. Slack Sidebar Pattern**
- Persistent panel on right side
- Collapsible to icon
- Always visible
- **Pros**: Fast access, context persistent
- **Cons**: Takes screen real estate, not mobile-friendly

**4. Help Scout Pattern**
- Beacon button bottom-right
- Expands to options menu
- Full modal for chat
- **Pros**: Clean, contextual help
- **Cons**: Extra click to reach chat

### Recommendation: **Hybrid Intercom + Context-Aware Pattern**

## 🏗️ Architecture Design

### Component Structure

```
FloatingAIAssistant (NEW - Container)
├── FloatingButton (minimized state)
│   ├── AI Icon
│   ├── Notification Badge
│   └── Tooltip
├── AssistantModal (expanded state)
│   ├── Header
│   │   ├── Context Selector (tab-based)
│   │   ├── Minimize Button
│   │   └── Close Button
│   ├── ModuleAssistant (reused)
│   └── ResizeHandle (optional)
└── AssistantContext (state management)
```

### State Management

```typescript
interface AssistantState {
    isOpen: boolean;
    isMinimized: boolean;
    selectedContext: TabType;
    position: { bottom: number; right: number };
    size: { width: number; height: number };
    hasUnread: boolean;
    conversationHistory: Map<TabType, Content[]>;
}
```

## 📝 Implementation Plan

### Phase 1: Foundation (No Breaking Changes)

**1.1 Create FloatingAIAssistant Component**
- File: `components/assistant/FloatingAIAssistant.tsx`
- Features:
  - Fixed positioning (bottom-right by default)
  - Toggle between minimized/expanded states
  - Smooth CSS transitions
  - Z-index management
  - Click outside to minimize (optional)

**1.2 Create useAssistantState Hook**
- File: `hooks/useAssistantState.ts`
- Features:
  - Manage open/minimized state
  - Persist state to localStorage
  - Track conversation history per context
  - Notification badge logic

**1.3 Update ModuleAssistant**
- Make it modal-friendly (remove border/padding assumptions)
- Add compact mode for floating view
- Preserve all existing functionality
- Add onNewMessage callback for notifications

### Phase 2: Integration (Gradual Migration)

**2.1 Add Floating Assistant to DashboardApp**
- Place `<FloatingAIAssistant>` at root level
- Pass workspace context and actions
- Auto-select context based on active tab
- Keyboard shortcut: `Ctrl+/` or `Alt+A` to toggle

**2.2 Context-Aware System Prompts**
- Map tab to assistant configuration:
  ```typescript
  const assistantConfigs = {
    [Tab.Platform]: { title: 'Platform AI', systemPrompt: platformPrompt },
    [Tab.CRM]: { title: 'CRM AI', systemPrompt: crmPrompt },
    [Tab.Marketing]: { title: 'Marketing AI', systemPrompt: marketingPrompt },
    [Tab.Financials]: { title: 'Financial AI', systemPrompt: financialPrompt }
  };
  ```

**2.3 Maintain Backward Compatibility**
- Keep embedded ModuleAssistants in tabs initially
- Add feature flag to toggle floating mode
- Allow users to choose preference (settings)

### Phase 3: Enhanced Features

**3.1 Multi-Context Support**
- Tab switcher inside modal to change assistant
- Preserve conversation history per context
- Visual indicator of active context

**3.2 Notification System**
- Badge count for unread AI responses
- Visual pulse animation on new message
- Sound notification (optional, user preference)

**3.3 Draggable & Resizable (Optional)**
- Allow users to reposition modal
- Remember position per user
- Resize handles on edges
- Min/max size constraints

**3.4 Mobile Optimization**
- Full-screen modal on mobile
- Bottom sheet style on tablets
- Touch-friendly controls
- Swipe down to minimize

## 🎨 UI/UX Specifications

### Visual Design

**Floating Button (Minimized)**
```css
- Size: 56px × 56px (FAB standard)
- Color: Primary brand color (blue-600)
- Icon: Sparkle/AI icon
- Shadow: shadow-neo-btn-lg
- Position: fixed, bottom-6, right-6
- Badge: Absolute top-right, bg-red-500
- Hover: Scale 1.05, shadow increase
- Animation: Pulse on new message
```

**Modal (Expanded)**
```css
- Size: 400px × 600px (desktop), full screen (mobile)
- Position: fixed, bottom-24, right-6
- Border: 3px solid black (neo-brutalist)
- Shadow: shadow-neo-xl
- Background: white
- Transition: transform 200ms ease-out
- Max-height: 80vh
- Z-index: 1000
```

**Header**
```css
- Height: 56px
- Border-bottom: 2px solid black
- Flex: space-between
- Background: gradient or solid
- Sticky: top 0
```

### Interactions

**Opening**
- Click FAB → Modal slides up from button
- Keyboard shortcut → Modal fades in
- First time: Show welcome tooltip

**Minimizing**
- Click minimize → Modal slides down to FAB
- ESC key → Same animation
- Click outside → Optional minimize

**Context Switching**
- Dropdown or tabs in header
- Preserves current message in input
- Loads conversation history for new context
- Smooth transition

**Scrolling**
- Modal stays fixed while page scrolls
- Chat content scrolls independently
- Auto-scroll to bottom on new message

## 💻 Code Implementation

### File Structure
```
components/
├── assistant/
│   ├── FloatingAIAssistant.tsx (new)
│   ├── AssistantModal.tsx (new)
│   ├── FloatingButton.tsx (new)
│   └── AssistantContextSwitcher.tsx (new)
hooks/
├── useAssistantState.ts (new)
└── useConversationHistory.ts (new)
contexts/
└── AssistantContext.tsx (new, optional)
```

### Key Code Snippets

**FloatingButton.tsx**
```tsx
interface FloatingButtonProps {
    onClick: () => void;
    hasUnread: boolean;
    unreadCount?: number;
}

const FloatingButton: React.FC<FloatingButtonProps> = ({ 
    onClick, 
    hasUnread, 
    unreadCount = 0 
}) => {
    return (
        <button
            onClick={onClick}
            className={`
                fixed bottom-6 right-6 z-50
                w-14 h-14 rounded-full
                bg-blue-600 text-white
                border-2 border-black
                shadow-neo-btn-lg
                hover:scale-105 hover:shadow-neo-xl
                transition-all duration-200
                ${hasUnread ? 'animate-pulse' : ''}
            `}
            aria-label="Open AI Assistant"
        >
            {/* Sparkle Icon */}
            <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8l-6.4 4.4 2.4-7.2-6-4.8h7.6z"/>
            </svg>
            
            {hasUnread && unreadCount > 0 && (
                <span className="
                    absolute -top-1 -right-1
                    w-6 h-6 rounded-full
                    bg-red-500 text-white text-xs font-bold
                    border-2 border-white
                    flex items-center justify-center
                ">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};
```

**AssistantModal.tsx**
```tsx
interface AssistantModalProps {
    isOpen: boolean;
    onMinimize: () => void;
    currentTab: TabType;
    onContextChange: (tab: TabType) => void;
    // ... other props
}

const AssistantModal: React.FC<AssistantModalProps> = ({
    isOpen,
    onMinimize,
    currentTab,
    onContextChange,
    // ...
}) => {
    return (
        <div
            className={`
                fixed bottom-24 right-6 z-40
                w-[400px] h-[600px]
                bg-white border-3 border-black
                shadow-neo-xl
                transition-all duration-200 ease-out
                ${isOpen 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-full pointer-events-none'
                }
            `}
        >
            {/* Header */}
            <div className="
                h-14 px-4 border-b-2 border-black
                flex items-center justify-between
                bg-gradient-to-r from-blue-50 to-purple-50
            ">
                <AssistantContextSwitcher 
                    currentTab={currentTab}
                    onChange={onContextChange}
                />
                
                <div className="flex gap-2">
                    <button
                        onClick={onMinimize}
                        className="p-2 hover:bg-gray-100 border-2 border-black"
                        aria-label="Minimize"
                    >
                        <MinusIcon />
                    </button>
                </div>
            </div>
            
            {/* Content - ModuleAssistant */}
            <div className="h-[calc(100%-56px)] overflow-hidden">
                <ModuleAssistant
                    title={getAssistantConfig(currentTab).title}
                    systemPrompt={getAssistantConfig(currentTab).systemPrompt}
                    actions={actions}
                    currentTab={currentTab}
                    workspaceId={workspaceId}
                    onUpgradeNeeded={onUpgradeNeeded}
                    compact={true}
                />
            </div>
        </div>
    );
};
```

**useAssistantState.ts**
```typescript
interface AssistantState {
    isOpen: boolean;
    selectedContext: TabType;
    hasUnread: boolean;
    unreadCount: number;
}

export const useAssistantState = (currentTab: TabType) => {
    const [state, setState] = useState<AssistantState>(() => {
        // Load from localStorage
        const saved = localStorage.getItem('assistantState');
        return saved ? JSON.parse(saved) : {
            isOpen: false,
            selectedContext: currentTab,
            hasUnread: false,
            unreadCount: 0
        };
    });
    
    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('assistantState', JSON.stringify(state));
    }, [state]);
    
    const toggle = () => setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
    const minimize = () => setState(prev => ({ ...prev, isOpen: false }));
    const open = () => setState(prev => ({ ...prev, isOpen: true, hasUnread: false, unreadCount: 0 }));
    
    const setContext = (context: TabType) => 
        setState(prev => ({ ...prev, selectedContext: context }));
    
    const markUnread = () => 
        setState(prev => ({ 
            ...prev, 
            hasUnread: !prev.isOpen,
            unreadCount: prev.isOpen ? 0 : prev.unreadCount + 1
        }));
    
    return {
        ...state,
        toggle,
        minimize,
        open,
        setContext,
        markUnread
    };
};
```

## 🔄 Migration Strategy

### Step 1: Build Components (Week 1)
- ✅ Create FloatingButton component
- ✅ Create AssistantModal wrapper
- ✅ Create useAssistantState hook
- ✅ Test in isolation

### Step 2: Integrate into DashboardApp (Week 1-2)
- ✅ Add FloatingAIAssistant to app root
- ✅ Wire up to current tab context
- ✅ Add keyboard shortcut
- ✅ Test with one assistant (Platform)

### Step 3: Add All Contexts (Week 2)
- ✅ Configure all assistant contexts
- ✅ Implement context switcher
- ✅ Preserve conversation history
- ✅ Test switching between contexts

### Step 4: Polish & Optimize (Week 2-3)
- ✅ Add animations and transitions
- ✅ Mobile responsive design
- ✅ Accessibility (ARIA labels, keyboard nav)
- ✅ Performance optimization

### Step 5: Feature Flag & Gradual Rollout (Week 3)
- ✅ Add feature flag in settings
- ✅ Allow users to toggle floating mode
- ✅ Keep embedded assistants as fallback
- ✅ Gather user feedback

### Step 6: Deprecate Embedded (Week 4+)
- ✅ Default to floating mode
- ✅ Remove embedded assistants from tabs
- ✅ Clean up unused code
- ✅ Update documentation

## ⚠️ Considerations & Risks

### Technical Challenges
1. **Z-index conflicts** - Modal needs to be above everything
2. **Portal rendering** - Use React Portal for clean DOM
3. **State synchronization** - Keep embedded and floating in sync during migration
4. **Mobile performance** - Full-screen modal may impact navigation
5. **Conversation history** - Need efficient storage/retrieval

### UX Challenges
1. **Discoverability** - Users need to find the FAB
2. **Context confusion** - Clear indication of which assistant is active
3. **Transition period** - Some users prefer embedded
4. **Screen real estate** - Modal may cover important content

### Solutions
1. **Onboarding tooltip** - Show FAB on first visit
2. **Visual cues** - Color-code by context, clear labels
3. **Feature flag** - Allow preference choice
4. **Smart positioning** - Avoid covering key UI elements
5. **Conversation pruning** - Limit history size, add clear option

## 📱 Mobile Considerations

### Small Screens (<768px)
- Full-screen modal (no floating)
- Bottom sheet style with drag handle
- Swipe down to dismiss
- Auto-minimize on navigation
- Simplified header (no context switcher)

### Medium Screens (768-1024px)
- Larger FAB (60px)
- Modal takes 50% width
- Side-by-side view option
- Touch-friendly controls

## ♿ Accessibility

### ARIA Labels
- FAB: "Open AI Assistant"
- Minimize: "Minimize AI Assistant"
- Context switcher: "Change assistant context"
- Badge: "X unread messages"

### Keyboard Navigation
- `Ctrl+/` or `Alt+A` - Toggle assistant
- `ESC` - Minimize
- `Tab` - Navigate within modal
- `Arrow keys` - Switch contexts

### Screen Readers
- Announce state changes
- Describe badge count
- Label all interactive elements
- Focus management on open/close

## 🎯 Success Metrics

### User Engagement
- % of users who open assistant (target: >60%)
- Average sessions per user (target: >3/week)
- Context switches per session (target: >1.5)
- Time spent in assistant (target: >2 min/session)

### Technical Performance
- Load time <100ms
- Smooth 60fps animations
- <5MB memory footprint
- Zero breaking changes during migration

### User Satisfaction
- User preference survey (floating vs embedded)
- Support tickets related to assistant
- Feature usage analytics
- NPS score for AI features

## 📋 Testing Checklist

### Functional Testing
- [ ] FAB appears in all tabs
- [ ] Click FAB opens modal
- [ ] Modal renders correctly
- [ ] Context switches properly
- [ ] Minimizes on button/ESC
- [ ] Persists state on refresh
- [ ] Keyboard shortcuts work
- [ ] Notifications show correctly

### Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Landscape orientation

### Browser Testing
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

### Accessibility Testing
- [ ] Screen reader compatibility
- [ ] Keyboard-only navigation
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators visible
- [ ] ARIA labels correct

## 🚀 Next Steps

1. **Review this plan** with team
2. **Prioritize features** (MVP vs. nice-to-have)
3. **Create design mockups** (Figma/Sketch)
4. **Set up feature flag** infrastructure
5. **Build Phase 1 components**
6. **User testing** with prototype
7. **Iterate based on feedback**
8. **Gradual rollout** with monitoring

## 📚 References

- [Material Design FAB Guidelines](https://material.io/components/buttons-floating-action-button)
- [Intercom Messenger Best Practices](https://www.intercom.com/help/en/articles/179-customize-the-intercom-messenger)
- [Accessibility: Modal Dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [React Portal Documentation](https://react.dev/reference/react-dom/createPortal)
- [CSS Fixed Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/position#fixed)
