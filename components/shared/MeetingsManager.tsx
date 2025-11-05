import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Meeting, CrmCollectionName, AppActions } from '../../types';
import Modal from './Modal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MeetingsManagerProps {
    meetings: Meeting[];
    contactId: string;
    crmItemId: string;
    crmCollection: CrmCollectionName;
    actions: Pick<AppActions, 'createMeeting' | 'updateMeeting' | 'deleteMeeting'>;
}

const MeetingsManager: React.FC<MeetingsManagerProps> = ({ meetings, contactId, crmItemId, crmCollection, actions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const modalTriggerRef = useRef<HTMLButtonElement>(null);

    const formatDateForInput = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0];
    };
    
    const formatTimeForInput = (timestamp: number) => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const initialFormState = { 
        title: '', 
        attendees: '', 
        summary: '', 
        date: formatDateForInput(Date.now()), 
        time: formatTimeForInput(Date.now()) 
    };

    const [form, setForm] = useState(initialFormState);

    useEffect(() => {
        if (isModalOpen) {
            if (editingMeeting) {
                setForm({
                    title: editingMeeting.title,
                    attendees: editingMeeting.attendees,
                    summary: editingMeeting.summary,
                    date: formatDateForInput(editingMeeting.timestamp),
                    time: formatTimeForInput(editingMeeting.timestamp),
                });
            } else {
                const now = Date.now();
                setForm({
                    title: '',
                    attendees: '',
                    summary: '',
                    date: formatDateForInput(now),
                    time: formatTimeForInput(now),
                });
            }
        }
    }, [isModalOpen, editingMeeting]);

    const openModalForNew = (triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingMeeting(null);
        setIsModalOpen(true);
        modalTriggerRef.current = triggerRef.current;
    };

    const openModalForEdit = (meeting: Meeting, triggerRef: React.RefObject<HTMLButtonElement>) => {
        setEditingMeeting(meeting);
        setIsModalOpen(true);
        modalTriggerRef.current = triggerRef.current;
    };

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingMeeting(null);
    }, []);

    const handleSave = useCallback(() => {
        if (form.title.trim() === '' || form.summary.trim() === '') return;

        const meetingTimestamp = new Date(`${form.date}T${form.time || '00:00'}`).getTime();
        const meetingData = {
            title: form.title,
            attendees: form.attendees,
            summary: form.summary,
            timestamp: meetingTimestamp
        };
        
        if (editingMeeting) {
            actions.updateMeeting(crmCollection, crmItemId, contactId, editingMeeting.id, meetingData);
        } else {
            actions.createMeeting(crmCollection, crmItemId, contactId, meetingData);
        }
        closeModal();
    }, [form, editingMeeting, actions, crmCollection, crmItemId, contactId, closeModal]);


    const handleDelete = (meetingId: string) => {
        if (window.confirm('Are you sure you want to delete this meeting note?')) {
            actions.deleteMeeting(crmCollection, crmItemId, contactId, meetingId);
        }
    };
    
    const sortedMeetings = meetings ? [...meetings].sort((a,b) => b.timestamp - a.timestamp) : [];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl">Meetings</h3>
                <button 
                    ref={modalTriggerRef} 
                    onClick={(e) => openModalForNew({ current: e.currentTarget })} 
                    className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-2 px-4 rounded-none font-semibold shadow-neo-btn-lg transition-all"
                >
                    + Add Meeting
                </button>
            </div>
            <ul className="max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {sortedMeetings.length > 0 ? sortedMeetings.map(meeting => (
                    <li key={meeting.id} className="p-2 border border-black bg-gray-50">
                        <p className="font-semibold">{meeting.title}</p>
                        <p className="text-sm text-gray-600">{new Date(meeting.timestamp).toLocaleString()}</p>
                        <div className="flex justify-end gap-2 mt-1">
                            <button 
                                onClick={(e) => openModalForEdit(meeting, { current: e.currentTarget })} 
                                className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                            >
                                View/Edit
                            </button>
                            <button 
                                onClick={() => handleDelete(meeting.id)} 
                                className="font-mono text-xs font-semibold text-red-600 hover:underline"
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                )) : (
                    <p className="text-gray-500 italic">No meetings logged.</p>
                )}
            </ul>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMeeting ? 'Edit Meeting Note' : 'Add Meeting Note'} triggerRef={modalTriggerRef}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="meeting-title" className="block font-mono text-sm font-semibold text-black mb-1">Title</label>
                        <input id="meeting-title" value={form.title || ''} onChange={e => setForm(p=>({...p, title: e.target.value}))} placeholder="e.g., Q3 Check-in" className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="meeting-date" className="block font-mono text-sm font-semibold text-black mb-1">Date</label>
                            <input id="meeting-date" type="date" value={form.date || ''} onChange={e => setForm(p=>({...p, date: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
                        </div>
                        <div>
                            <label htmlFor="meeting-time" className="block font-mono text-sm font-semibold text-black mb-1">Time</label>
                            <input id="meeting-time" type="time" value={form.time || ''} onChange={e => setForm(p=>({...p, time: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="meeting-attendees" className="block font-mono text-sm font-semibold text-black mb-1">Attendees</label>
                        <input id="meeting-attendees" value={form.attendees || ''} onChange={e => setForm(p=>({...p, attendees: e.target.value}))} placeholder="e.g., Jane Doe, John Smith" className="w-full bg-white border-2 border-black text-black p-2 rounded-none"/>
                    </div>
                    <div>
                        <label htmlFor="meeting-summary" className="block font-mono text-sm font-semibold text-black mb-1">Summary</label>
                        <textarea id="meeting-summary" value={form.summary || ''} onChange={e => setForm(p=>({...p, summary: e.target.value}))} className="w-full bg-white border-2 border-black text-black p-2 rounded-none min-h-[150px]" placeholder="Use Markdown for formatting..." />
                    </div>
                     {editingMeeting && (
                        <div>
                             <h4 className="text-md font-semibold font-mono mb-2">Summary Preview</h4>
                             <div className="bg-gray-50 border-2 border-dashed border-black p-4 max-h-48 overflow-y-auto custom-scrollbar">
                                <ReactMarkdown className="markdown-content" remarkPlugins={[remarkGfm]}>
                                    {form.summary}
                                </ReactMarkdown>
                             </div>
                        </div>
                    )}
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleSave} className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Save</button>
                        <button onClick={closeModal} className="w-full font-mono font-semibold bg-gray-200 text-black py-2 px-4 rounded-none border-2 border-black shadow-neo-btn">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MeetingsManager;
