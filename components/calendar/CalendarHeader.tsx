import React from 'react';

export type ViewMode = 'month' | 'week' | 'day';
export type CalendarMode = 'personal' | 'team';

interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: ViewMode;
    calendarMode: CalendarMode;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: ViewMode) => void;
    onCalendarModeChange: (mode: CalendarMode) => void;
    onNewEvent: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    currentDate,
    viewMode,
    calendarMode,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    onCalendarModeChange,
    onNewEvent
}) => {
    const formatHeaderDate = () => {
        switch (viewMode) {
            case 'month':
                return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            case 'week':
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
            case 'day':
                return currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }
    };

    return (
        <div className="flex flex-col gap-3 sm:gap-4 mb-4">
            {/* Top row: Navigation and date */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button onClick={onPrev} className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-2.5 hover:bg-gray-100 border-r border-gray-200 transition-colors flex items-center justify-center" aria-label="Previous period">&larr;</button>
                        <button onClick={onToday} className="min-h-[44px] sm:min-h-0 px-3 py-2 font-medium text-sm hover:bg-gray-100 border-r border-gray-200 transition-colors">Today</button>
                        <button onClick={onNext} className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-2.5 hover:bg-gray-100 transition-colors flex items-center justify-center" aria-label="Next period">&rarr;</button>
                    </div>
                    <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{formatHeaderDate()}</h2>
                </div>
            </div>
            
            {/* Bottom row: Mode toggle, New Event, View selector */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <button
                        onClick={() => onCalendarModeChange('personal')}
                        className={`min-h-[44px] sm:min-h-0 py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors ${calendarMode === 'personal' ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Personal
                    </button>
                    <button
                        onClick={() => onCalendarModeChange('team')}
                        className={`min-h-[44px] sm:min-h-0 py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-medium border-l border-gray-200 transition-colors ${calendarMode === 'team' ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Team
                    </button>
                </div>
                <button
                    onClick={onNewEvent}
                    className="min-h-[44px] sm:min-h-0 py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm bg-black text-white rounded-lg shadow-sm hover:bg-gray-800 transition-colors"
                >
                    + New Event
                </button>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-sm ml-auto">
                    {(['month', 'week', 'day'] as ViewMode[]).map(view => (
                        <button
                            key={view}
                            onClick={() => onViewChange(view)}
                            className={`min-h-[44px] sm:min-h-0 py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium capitalize transition-colors ${viewMode === view ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} ${view !== 'month' ? 'border-l border-gray-200' : ''}`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
