import type { RefObject } from 'react'
import type {
    Message,
    MessageAttachment,
    Participant,
} from './chat.types'
import { isMessageEdited, isMessageRead } from './chat.utils'

type ChatMessagesProps = {
    currentUserId: string
    currentUsername: string
    messages: Message[]
    searchResults: Message[]
    mode: 'list' | 'search'
    isSearching: boolean
    isGroupChat: boolean
    loading: boolean
    participants: Participant[]
    messagesEndRef: RefObject<HTMLDivElement | null>
    attachmentUrls: Record<string, string>
    editingMessageId: string | null
    editingText: string
    editingLoading: boolean
    deletingMessageId: string | null
    onEditingTextChange: (text: string) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onStartEdit: (message: Message) => void
    onDeleteMessage: (id: string) => void
}

export default function ChatMessages({
    currentUserId,
    currentUsername,
    messages,
    searchResults,
    mode,
    isSearching,
    isGroupChat,
    loading,
    participants,
    messagesEndRef,
    attachmentUrls,
    editingMessageId,
    editingText,
    editingLoading,
    deletingMessageId,
    onEditingTextChange,
    onSaveEdit,
    onCancelEdit,
    onStartEdit,
    onDeleteMessage,
}: ChatMessagesProps) {
    const renderAttachment = (attachment: MessageAttachment) => {
        const url = attachmentUrls[attachment.id]
        if (!url) {
            return (
                <div key={attachment.id} className="message-attachment">
                    Загрузка файла...
                </div>
            )
        }

        if (attachment.mime_type.startsWith('image/')) {
            return (
                <div key={attachment.id} className="message-attachment">
                    <img
                        src={url}
                        alt={attachment.file_name}
                        className="chat-image"
                    />
                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>
                </div>
            )
        }
        if (attachment.mime_type.startsWith('video/')) {
            return (
                <div key={attachment.id} className="message-attachment">
                    <video
                        controls
                        preload="metadata"
                        className="chat-video"
                    >
                        <source src={url} type={attachment.mime_type} />
                    </video>
                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>
                </div>
            )
        }
        if (attachment.mime_type.startsWith('audio/')) {
            return (
                <div key={attachment.id} className="message-attachment">
                    <audio
                        controls
                        preload="metadata"
                        className="chat-audio"
                    >
                        <source src={url} type={attachment.mime_type} />
                    </audio>
                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>
                </div>
            )
        }

        return (
            <div
                key={attachment.id}
                className="message-attachment file-attachment"
            >
                <a href={url} download={attachment.file_name}>
                    Скачать: {attachment.file_name}
                </a>
            </div>
        )
    }

    const renderMessage = (message: Message) => {
        const isMine = message.sender_id === currentUserId
        const senderName = isMine
            ? currentUsername || 'Вы'
            : message.sender?.username ||
              message.sender?.phone_number ||
              message.sender_id
        const isEditing = editingMessageId === message.id
        const isDeleting = deletingMessageId === message.id
        const edited = isMessageEdited(message)
        const read =
            isMine && isMessageRead(message, currentUserId, participants)

        return (
            <div
                key={message.id}
                className={`message-item ${isMine ? 'mine' : ''}`}
            >
                <div className="message-author">{senderName}</div>
                {isEditing ? (
                    <div className="message-edit">
                        <input
                            value={editingText}
                            onChange={event =>
                                onEditingTextChange(event.target.value)
                            }
                            onKeyDown={event => {
                                if (
                                    event.key === 'Enter' &&
                                    !event.shiftKey
                                ) {
                                    event.preventDefault()
                                    onSaveEdit()
                                }
                            }}
                            autoFocus
                        />
                        <div className="message-edit-actions">
                            <button
                                type="button"
                                onClick={onSaveEdit}
                                disabled={editingLoading}
                            >
                                {editingLoading
                                    ? 'Сохранение...'
                                    : 'Сохранить'}
                            </button>
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                disabled={editingLoading}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {message.text && (
                            <div className="message-bubble">
                                {message.text}
                                {edited && (
                                    <span className="edited-label">
                                        изменено
                                    </span>
                                )}
                            </div>
                        )}
                        {message.attachments?.map(renderAttachment)}
                        {isMine && (
                            <div className="message-meta">
                                <span
                                    className={
                                        read
                                            ? 'message-read'
                                            : 'message-unread'
                                    }
                                >
                                    {read
                                        ? `✓✓ ${
                                              isGroupChat
                                                  ? 'Прочитано всеми'
                                                  : 'Прочитано'
                                          }`
                                        : '✓ Отправлено'}
                                </span>
                            </div>
                        )}
                        {isMine && (
                            <div className="message-actions">
                                {message.text && (
                                    <button
                                        type="button"
                                        onClick={() => onStartEdit(message)}
                                    >
                                        Изменить
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        onDeleteMessage(message.id)
                                    }
                                    disabled={isDeleting}
                                >
                                    {isDeleting
                                        ? 'Удаление...'
                                        : 'Удалить'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        )
    }

    if (mode === 'search') {
        if (!isSearching) {
            return null
        }
        return (
                <div className="search-results">
                    <div className="search-results-header">
                        <h3>Результаты поиска</h3>
                        <span>{searchResults.length}</span>
                    </div>
                    {searchResults.length === 0 ? (
                        <div className="search-empty">
                            Ничего не найдено
                        </div>
                    ) : (
                        searchResults.map(renderMessage)
                    )}
                </div>
        )
    }

    return (
            <div className="message-list">
                {loading && messages.length === 0 ? (
                    <div className="chat-loading">Загрузка...</div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        Сообщений пока нет
                    </div>
                ) : (
                    messages.map(renderMessage)
                )}
                <div ref={messagesEndRef} />
            </div>
    )
}
