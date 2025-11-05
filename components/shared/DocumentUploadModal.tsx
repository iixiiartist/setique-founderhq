import React, { useState, useEffect, useRef } from 'react';
import { AppActions, AnyCrmItem, Contact, TabType } from '../../types';
import { NAV_ITEMS, Tab } from '../../constants';
import Modal from './Modal';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result?.toString().split(',')[1] || '';
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
    actions: AppActions;
    companies: AnyCrmItem[];
    contacts: (Contact & { companyName: string })[];
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ isOpen, onClose, file, actions, companies, contacts }) => {
    const [fileName, setFileName] = useState('');
    const [selectedModule, setSelectedModule] = useState<TabType>(Tab.Documents);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [selectedContactId, setSelectedContactId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (file) {
            setFileName(file.name);
            // Reset fields on new file
            setSelectedModule(Tab.Documents);
            setSelectedCompanyId('');
            setSelectedContactId('');
        }
    }, [file]);

    useEffect(() => {
        // Reset contact if company changes
        setSelectedContactId('');
    }, [selectedCompanyId]);

    const handleUpload = async () => {
        if (!file || !fileName.trim()) return;
        setIsUploading(true);
        try {
            const content = await blobToBase64(file);
            await actions.uploadDocument(
                fileName,
                file.type,
                content,
                selectedModule,
                selectedCompanyId || undefined,
                selectedContactId || undefined
            );
            onClose();
        } catch (error) {
            console.error("Upload failed", error);
            // The action creator handles the toast notification
        } finally {
            setIsUploading(false);
        }
    };
    
    const filteredContacts = selectedCompanyId ? contacts.filter(c => c.crmItemId === selectedCompanyId) : [];
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Upload Document" triggerRef={triggerRef}>
            {file && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="file-name" className="block font-mono text-sm font-semibold text-black mb-1">
                            File Name
                        </label>
                        <input
                            id="file-name"
                            type="text"
                            value={fileName || ''}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="file-module" className="block font-mono text-sm font-semibold text-black mb-1">
                                Assign to Module
                            </label>
                            <select
                                id="file-module"
                                value={selectedModule || ''}
                                onChange={(e) => setSelectedModule(e.target.value as TabType)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 h-full"
                            >
                                {NAV_ITEMS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="file-company" className="block font-mono text-sm font-semibold text-black mb-1">
                                Link to Company (Optional)
                            </label>
                            <select
                                id="file-company"
                                value={selectedCompanyId || ''}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 h-full"
                            >
                                <option value="">None</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="file-contact" className="block font-mono text-sm font-semibold text-black mb-1">
                            Link to Contact (Optional)
                        </label>
                        <select
                            id="file-contact"
                            value={selectedContactId || ''}
                            onChange={(e) => setSelectedContactId(e.target.value)}
                            className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 h-full"
                            disabled={!selectedCompanyId || filteredContacts.length === 0}
                        >
                            <option value="">None</option>
                            {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button 
                            onClick={handleUpload} 
                            disabled={isUploading}
                            className="w-full font-mono font-semibold bg-black text-white py-2 px-4 rounded-none border-2 border-black shadow-neo-btn disabled:opacity-50"
                        >
                            {isUploading ? 'Uploading...' : 'Upload File'}
                        </button>
                        <button 
                            onClick={onClose} 
                            className="w-full font-mono font-semibold bg-gray-200 text-black py-2 px-4 rounded-none border-2 border-black shadow-neo-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default DocumentUploadModal;
