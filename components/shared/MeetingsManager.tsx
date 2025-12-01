import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDeleteConfirm } from '../../hooks';
import { z } from 'zod';
import { Meeting, CrmCollectionName, AppActions } from '../../types';
import Modal from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Form } from '../forms/Form';
import { FormField } from '../forms/FormField';
import { Button } from '../ui/Button';

const meetingFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    attendees: z.string().max(500).optional(),
    summary: z.string().min(1, 'Summary is required').max(5000),
});

type MeetingFormData = z.infer<typeof meetingFormSchema>;

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
    const deleteConfirm = useDeleteConfirm();

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

    const getDefaultValues = useCallback((): MeetingFormData => {
        if (editingMeeting) {
            return {
                title: editingMeeting.title,
                attendees: editingMeeting.attendees || '',
                summary: editingMeeting.summary,
                date: formatDateForInput(editingMeeting.timestamp),
                time: formatTimeForInput(editingMeeting.timestamp),
            };
        }
        const now = Date.now();
        return {
            title: '',
            attendees: '',
            summary: '',
            date: formatDateForInput(now),
            time: formatTimeForInput(now),
        };
    }, [editingMeeting]);

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

    const handleSave = useCallback((data: MeetingFormData) => {
        const meetingTimestamp = new Date(`${data.date}T${data.time}`).getTime();
        const meetingData = {
            title: data.title.trim(),
            attendees: data.attendees?.trim() || '',
            summary: data.summary.trim(),
            timestamp: meetingTimestamp
        };
        
        if (editingMeeting) {
            actions.updateMeeting(crmCollection, crmItemId, contactId, editingMeeting.id, meetingData);
        } else {
            actions.createMeeting(crmCollection, crmItemId, contactId, meetingData);
        }
        closeModal();
    }, [editingMeeting, actions, crmCollection, crmItemId, contactId, closeModal]);


    const handleDelete = (meetingId: string) => {
        deleteConfirm.requestConfirm(meetingId, 'meeting note', async () => {
            actions.deleteMeeting(crmCollection, crmItemId, contactId, meetingId);
        });
    };
    
    const sortedMeetings = meetings ? [...meetings].sort((a,b) => b.timestamp - a.timestamp) : [];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl">Meetings</h3>
                <button 
                    ref={modalTriggerRef} 
                    onClick={(e) => openModalForNew({ current: e.currentTarget })} 
                    className="bg-white rounded-xl border border-gray-200 text-slate-900 cursor-pointer text-sm py-2 px-4 font-semibold shadow-sm hover:shadow-md transition-all"
                >
                    + Add Meeting
                </button>
            </div>
            <ul className="max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {sortedMeetings.length > 0 ? sortedMeetings.map(meeting => (
                    <li key={meeting.id} className="p-2 rounded-xl border border-gray-200 bg-gray-50">
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
                <Form
                    key={editingMeeting?.id || 'new'}
                    schema={meetingFormSchema}
                    defaultValues={getDefaultValues()}
                    onSubmit={handleSave}
                >
                    {({ watch }) => {
                        const summary = watch('summary') || '';
                        
                        return (
                            <div className="space-y-4">
                                <FormField
                                    name="title"
                                    label="Title"
                                    type="text"
                                    placeholder="e.g., Q3 Check-in"
                                    required
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        name="date"
                                        label="Date"
                                        type="date"
                                        required
                                    />
                                    <FormField
                                        name="time"
                                        label="Time"
                                        type="time"
                                        required
                                    />
                                </div>
                                <FormField
                                    name="attendees"
                                    label="Attendees"
                                    type="text"
                                    placeholder="e.g., Jane Doe, John Smith"
                                />
                                <FormField
                                    name="summary"
                                    label="Summary"
                                    type="textarea"
                                    placeholder="Use Markdown for formatting..."
                                    required
                                    rows={6}
                                />
                                {editingMeeting && (
                                    <div>
                                        <h4 className="text-md font-semibold font-mono mb-2">Summary Preview</h4>
                                        <div className="bg-gray-50 border-2 border-dashed border-black p-4 max-h-48 overflow-y-auto custom-scrollbar">
                                            <ReactMarkdown className="markdown-content" remarkPlugins={[remarkGfm]}>
                                                {summary}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 mt-4">
                                    <Button type="submit" className="w-full">Save</Button>
                                    <Button type="button" variant="secondary" onClick={closeModal} className="w-full">Cancel</Button>
                                </div>
                            </div>
                        );
                    }}
                </Form>
            </Modal>

            {/* Delete confirmation dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isConfirming}
                onClose={deleteConfirm.cancel}
                onConfirm={deleteConfirm.confirm}
                title="Delete Meeting Note"
                message="Are you sure you want to delete this meeting note? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
};

export default MeetingsManager;
