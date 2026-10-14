import type { KeyboardEvent } from 'react'
import type { Participant } from './chat.types'
import {
    formatLastSeen,
    getParticipantInitial,
    getParticipantName,
    getParticipantUserId,
} from './chat.utils'

type ChatSidebarProps = {
    currentUserId: string
    participants: Participant[]
    onlineUsers: Set<string>
    userAvatarUrls: Record<string, string>
    isOwner: boolean
    newParticipantPhone: string
    onPhoneChange: (phone: string) => void
    onAddParticipant: () => void
    onRemoveParticipant: (participant: Participant) => void
    onLeaveChat: () => void
    onParticipantClick: (userId: string) => void
}

export default function ChatSidebar({
    currentUserId,
    participants,
    onlineUsers,
    userAvatarUrls,
    isOwner,
    newParticipantPhone,
    onPhoneChange,
    onAddParticipant,
    onRemoveParticipant,
    onLeaveChat,
    onParticipantClick,
}: ChatSidebarProps) {
    const handlePhoneKeyDown = (
        event: KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === 'Enter') {
            onAddParticipant()
        }
    }

    return (
        <aside className="chat-sidebar">
            <div className="sidebar-section">
                <div className="sidebar-section-header">
                    <h3>Участники</h3>
                    <span>{participants.length}</span>
                </div>
                <div className="participants-list">
                    {participants.map(participant => {
                        const userId = getParticipantUserId(participant)
                        const isCurrent = userId === currentUserId
                        const avatarUrl = userAvatarUrls[userId]
                        const name = getParticipantName(participant)
                        const isOnline =
                            onlineUsers.has(userId) ||
                            participant.user?.is_online === true

                        return (
                            <div
                                key={participant.id}
                                className="participant"
                            >
                                <div
                                    className="participant-info"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                        onParticipantClick(userId)
                                    }
                                    onKeyDown={event => {
                                        if (event.key === 'Enter') {
                                            onParticipantClick(userId)
                                        }
                                    }}
                                >
                                    <div className="participant-avatar">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={name}
                                            />
                                        ) : (
                                            <span>
                                                {getParticipantInitial(
                                                    participant
                                                )}
                                            </span>
                                        )}
                                        {isOnline && (
                                            <span className="online-indicator" />
                                        )}
                                    </div>
                                    <div className="participant-details">
                                        <span className="participant-name">
                                            {name}
                                        </span>
                                        {isCurrent ? (
                                            <span className="participant-current">
                                                Вы
                                            </span>
                                        ) : isOnline ? (
                                            <span className="participant-status online">
                                                В сети
                                            </span>
                                        ) : (
                                            <span className="participant-status offline">
                                                {formatLastSeen(
                                                    participant.user
                                                        ?.last_seen_at
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isOwner && !isCurrent && userId && (
                                    <button
                                        type="button"
                                        className="participant-remove"
                                        onClick={event => {
                                            event.stopPropagation()
                                            onRemoveParticipant(participant)
                                        }}
                                    >
                                        Удалить
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {isOwner && (
                <div className="sidebar-section">
                    <h3>Добавить участника</h3>
                    <div className="participant-add">
                        <input
                            placeholder="Номер телефона"
                            value={newParticipantPhone}
                            onChange={event =>
                                onPhoneChange(event.target.value)
                            }
                            onKeyDown={handlePhoneKeyDown}
                        />
                        <button
                            type="button"
                            onClick={onAddParticipant}
                            disabled={!newParticipantPhone.trim()}
                        >
                            Добавить
                        </button>
                    </div>
                </div>
            )}

            <div className="sidebar-actions">
                <button
                    type="button"
                    className="leave-chat-button"
                    onClick={onLeaveChat}
                >
                    Покинуть группу
                </button>
            </div>
        </aside>
    )
}

