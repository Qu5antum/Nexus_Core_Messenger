import { useState, useEffect } from 'react';
import { getChats } from '../../api/chats'; 

type Chat = {
    id: string
    title?: string | null
    avatar?: string
    description?: string | null
    owner_id?: string | null
    is_group?: boolean
    last_message?: string | null
    last_message_time?: string | null
    unread_count: number
}


type ForwardModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onForward: (selectedChatIds: string[]) => Promise<void>;
};

export default function ForwardModal({ isOpen, onClose, onForward }: ForwardModalProps) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getChats()
                .then((data) => setChats(data))
                .catch((err) => console.error("Не удалось загрузить чаты", err))
                .finally(() => setLoading(false));
        } else {
            setSelectedChatIds([]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleChat = (chatId: string) => {
        setSelectedChatIds(prev =>
            prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
        );
    };

    const handleConfirm = async () => {
        if (selectedChatIds.length === 0) return;
        try {
            setSubmitting(true);
            await onForward(selectedChatIds);
            onClose();
        } catch (error) {
            console.error("Ошибка при пересылке", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Переслать сообщение</h3>
                {loading ? (
                    <div>Загрузка чатов...</div>
                ) : (
                    <div className="chats-select-list">
                        {chats.map(chat => (
                            <label key={chat.id} className="chat-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={selectedChatIds.includes(chat.id)}
                                    onChange={() => toggleChat(chat.id)}
                                />
                                <span>{chat.title || 'Чат без названия'}</span>
                            </label>
                        ))}
                    </div>
                )}
                <div className="modal-actions">
                    <button type="button" onClick={onClose} disabled={submitting}>
                        Отмена
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirm} 
                        disabled={submitting || selectedChatIds.length === 0}
                    >
                        {submitting ? 'Пересылка...' : `Переслать (${selectedChatIds.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
}