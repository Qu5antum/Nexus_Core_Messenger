import type { KeyboardEvent } from 'react'

type ChatHeaderProps = {
    title: string
    isGroupChat: boolean
    privateUserId: string
    privateUserOnline: boolean
    privateUserLastSeen: string | null
    participantCount: number
    searchText: string
    searchLoading: boolean
    isSearching: boolean
    onSearchTextChange: (value: string) => void
    onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
    onSearch: () => void
    onClearSearch: () => void
    formatLastSeen: (value?: string | null) => string
}

export default function ChatHeader({
    title,
    isGroupChat,
    privateUserId,
    privateUserOnline,
    privateUserLastSeen,
    participantCount,
    searchText,
    searchLoading,
    isSearching,
    onSearchTextChange,
    onSearchKeyDown,
    onSearch,
    onClearSearch,
    formatLastSeen,
}: ChatHeaderProps) {
    return (
        <div className="chat-header">
            <div className="chat-header-info">
                <h2>{title}</h2>

                {!isGroupChat && privateUserId && (
                    <div className="chat-presence">
                        {privateUserOnline ? (
                            <span className="chat-status online">
                                <span className="online-dot" />
                                В сети
                            </span>
                        ) : (
                            <span className="chat-status offline">
                                {formatLastSeen(privateUserLastSeen)}
                            </span>
                        )}
                    </div>
                )}

                {isGroupChat && (
                    <p className="chat-meta">
                        Участников: {participantCount}
                    </p>
                )}
            </div>

            <div className="chat-search">
                <input
                    placeholder="Поиск сообщений..."
                    value={searchText}
                    onChange={event =>
                        onSearchTextChange(event.target.value)
                    }
                    onKeyDown={onSearchKeyDown}
                />
                <button
                    type="button"
                    onClick={onSearch}
                    disabled={searchLoading}
                >
                    {searchLoading ? '...' : 'Найти'}
                </button>
                {isSearching && (
                    <button type="button" onClick={onClearSearch}>
                        Очистить
                    </button>
                )}
            </div>
        </div>
    )
}

