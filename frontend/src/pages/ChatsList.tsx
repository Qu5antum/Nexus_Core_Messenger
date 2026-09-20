import {
    useEffect,
    useRef,
    useState,
} from 'react'
import type {
    ChangeEvent,
} from 'react'
import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom'
import {
    getChats,
    getChatAvatar,
    createGroupChat,
    createPrivateChat,
    updateChat,
    deleteChat,
    getUnreadMessagesCount,
} from '../api/chats'

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

type ChatUpdate = {
    title?: string
    description?: string
    owner_id?: string
    file?: File | null
}

export default function ChatsList() {
    const [chats, setChats] = useState<Chat[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [title, setTitle] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [editingDescription, setEditingDescription] = useState('')
    const [editingFile, setEditingFile] = useState<File | null>(null)
    const [editingPreview, setEditingPreview] = useState<string | null>(null)
    const [editingLoading, setEditingLoading] = useState(false)
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null)

    const navigate = useNavigate()
    const { chatId } = useParams()

    const currentUserId = localStorage.getItem('user_id') || ''

    const avatarUrlsRef = useRef<Set<string>>(new Set())

    const revokeAvatarUrl = (url?: string | null) => {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url)
            avatarUrlsRef.current.delete(url)
        }
    }

    const getChatName = (chat: Chat) => {
        if (chat.title?.trim()) {
            return chat.title
        }
        return chat.is_group ? 'Группа' : 'Личный чат'
    }

    const loadChatAvatar = async (chat: Chat): Promise<Chat> => {
        try {
            const avatar = await getChatAvatar(chat.id)
            avatarUrlsRef.current.add(avatar)
            return {
                ...chat,
                avatar,
            }
        } catch {
            return {
                ...chat,
                avatar: undefined,
            }
        }
    }

    const loadChatData = async (chatList: Chat[]) => {
        const updatedChats = await Promise.all(
            chatList.map(async (chat) => {
                const chatWithAvatar = await loadChatAvatar(chat)
                try {
                    const unreadCount = await getUnreadMessagesCount(chat.id)
                    return {
                        ...chatWithAvatar,
                        unread_count: Number(unreadCount) || 0,
                    }
                } catch (e) {
                    console.error(
                        `Failed to get unread count for chat ${chat.id}:`,
                        e
                    )
                    return {
                        ...chatWithAvatar,
                        unread_count: 0,
                    }
                }
            })
        )
        setChats(updatedChats)
    }

    const load = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getChats()
            await loadChatData(
                data.map((chat: Omit<Chat, 'unread_count'>) => ({
                    ...chat,
                    unread_count: 0,
                }))
            )
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        return () => {
            avatarUrlsRef.current.forEach((url) => {
                URL.revokeObjectURL(url)
            })
            avatarUrlsRef.current.clear()
        }
    }, [])

    useEffect(() => {
        if (!chatId) {
            return
        }
        setChats((prev) =>
            prev.map((chat) =>
                String(chat.id) === String(chatId)
                    ? {
                        ...chat,
                        unread_count: 0,
                    }
                    : chat
            )
        )
    }, [chatId])

    const createGroup = async () => {
        const groupTitle = title.trim()
        if (!groupTitle) {
            setError('Введите название группы')
            return
        }
        try {
            setLoading(true)
            setError(null)
            const response = await createGroupChat({
                title: groupTitle,
            })
            setTitle('')
            const newChat = await loadChatAvatar(response)
            setChats((prev) => [
                {
                    ...newChat,
                    unread_count: 0,
                },
                ...prev,
            ])
            navigate(`/chat/${newChat.id}`)
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setLoading(false)
        }
    }

    const createPrivate = async () => {
        const userPhone = phone.trim()
        if (!userPhone) {
            setError('Введите номер телефона')
            return
        }
        try {
            setLoading(true)
            setError(null)
            const response = await createPrivateChat(userPhone)
            setPhone('')
            const newChat = await loadChatAvatar(response)
            setChats((prev) => [
                {
                    ...newChat,
                    unread_count: 0,
                },
                ...prev,
            ])
            navigate(`/chat/${newChat.id}`)
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setLoading(false)
        }
    }

    const handleStartEdit = (chat: Chat) => {
        if (!chat.is_group || chat.owner_id !== currentUserId) {
            return
        }
        setEditingChatId(chat.id)
        setEditingTitle(chat.title || '')
        setEditingDescription(chat.description || '')
        setEditingFile(null)
        setEditingPreview(chat.avatar || null)
        setError(null)
    }

    const handleCancelEdit = () => {
        if (
            editingPreview?.startsWith('blob:') &&
            editingPreview !==
                chats.find(
                    (chat) => chat.id === editingChatId
                )?.avatar
        ) {
            revokeAvatarUrl(editingPreview)
        }
        setEditingChatId(null)
        setEditingTitle('')
        setEditingDescription('')
        setEditingFile(null)
        setEditingPreview(null)
    }

    const handleFileChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0]
        if (!file) {
            return
        }
        if (!file.type.startsWith('image/')) {
            setError('Можно выбрать только изображение')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Размер изображения не должен превышать 5 МБ')
            return
        }
        const currentChat = chats.find(
            (chat) => chat.id === editingChatId
        )
        if (
            editingPreview?.startsWith('blob:') &&
            editingPreview !== currentChat?.avatar
        ) {
            URL.revokeObjectURL(editingPreview)
        }
        const preview = URL.createObjectURL(file)
        setEditingFile(file)
        setEditingPreview(preview)
        setError(null)
        e.target.value = ''
    }

    const handleSaveEdit = async () => {
        if (!editingChatId) {
            return
        }
        const chat = chats.find(
            (item) => item.id === editingChatId
        )
        if (!chat) {
            return
        }
        if (!chat.is_group || chat.owner_id !== currentUserId) {
            setError('Только владелец может изменить чат')
            return
        }
        const newTitle = editingTitle.trim()
        const newDescription = editingDescription.trim()
        if (!newTitle) {
            setError('Название группы не может быть пустым')
            return
        }
        const data: ChatUpdate = {
            title: newTitle,
            description: newDescription || undefined,
            file: editingFile,
        }
        try {
            setEditingLoading(true)
            setError(null)
            const updatedChat = await updateChat(
                editingChatId,
                data
            )
            let newAvatar = chat.avatar
            if (editingFile) {
                try {
                    const avatar = await getChatAvatar(
                        editingChatId
                    )
                    avatarUrlsRef.current.add(avatar)
                    newAvatar = avatar
                    revokeAvatarUrl(chat.avatar)
                } catch {
                    newAvatar = undefined
                }
            }
            if (
                editingPreview?.startsWith('blob:') &&
                editingPreview !== chat.avatar &&
                editingPreview !== newAvatar
            ) {
                URL.revokeObjectURL(editingPreview)
            }
            setChats((prev) =>
                prev.map((item) =>
                    item.id === editingChatId
                        ? {
                            ...item,
                            ...updatedChat,
                            avatar: newAvatar,
                        }
                        : item
                )
            )
            setEditingChatId(null)
            setEditingTitle('')
            setEditingDescription('')
            setEditingFile(null)
            setEditingPreview(null)
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setEditingLoading(false)
        }
    }

    const handleDelete = async (chat: Chat) => {
        if (!chat.is_group || chat.owner_id !== currentUserId) {
            setError('Только владелец может удалить чат')
            return
        }
        const confirmed = window.confirm(
            `Удалить группу "${getChatName(chat)}"?\n\nВсе сообщения и данные группы будут удалены.`
        )
        if (!confirmed) {
            return
        }
        try {
            setDeletingChatId(chat.id)
            setError(null)
            await deleteChat(chat.id)
            revokeAvatarUrl(chat.avatar)
            setChats((prev) =>
                prev.filter((item) => item.id !== chat.id)
            )
            if (String(chat.id) === String(chatId)) {
                navigate('/')
            }
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setDeletingChatId(null)
        }
    }

    const filteredChats = chats.filter((chat) => {
        const name = getChatName(chat)
        return name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    })

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            <div className="sidebar-profile-button">
                <Link
                    to="/profile"
                    className="profile-link"
                >
                    <span className="profile-icon">👤</span>
                    <span>Мой профиль</span>
                </Link>
            </div>
            <div className="sidebar-search">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Поиск чатов..."
                        value={searchQuery}
                        onChange={(e) =>
                            setSearchQuery(e.target.value)
                        }
                    />
                </div>
            </div>
            <div
                style={{
                    padding: '10px 14px',
                    borderBottom:
                        '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                <div
                    className="search-input-wrapper"
                    style={{
                        gap: '6px',
                    }}
                >
                    <input
                        type="text"
                        placeholder="Название группы"
                        value={title}
                        onChange={(e) =>
                            setTitle(e.target.value)
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                createGroup()
                            }
                        }}
                        style={{
                            paddingLeft: '10px',
                        }}
                    />
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={createGroup}
                        disabled={
                            loading ||
                            !title.trim()
                        }
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                        }}
                    >
                        + Группа
                    </button>
                </div>
                <div
                    className="search-input-wrapper"
                    style={{
                        gap: '6px',
                    }}
                >
                    <input
                        type="text"
                        placeholder="Телефон пользователя"
                        value={phone}
                        onChange={(e) =>
                            setPhone(e.target.value)
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                createPrivate()
                            }
                        }}
                        style={{
                            paddingLeft: '10px',
                        }}
                    />
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={createPrivate}
                        disabled={
                            loading ||
                            !phone.trim()
                        }
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                        }}
                    >
                        + Чат
                    </button>
                </div>
                {error && (
                    <div
                        style={{
                            color: 'var(--danger)',
                            fontSize: '0.8rem',
                            marginTop: '4px',
                        }}
                    >
                        {error}
                    </div>
                )}
            </div>
            <div className="chats-list">
                {loading && chats.length === 0 ? (
                    <div
                        style={{
                            padding: '16px',
                            textAlign: 'center',
                            color: 'var(--muted)',
                            fontSize: '0.88rem',
                        }}
                    >
                        Загрузка чатов...
                    </div>
                ) : filteredChats.length === 0 ? (
                    <div
                        style={{
                            padding: '16px',
                            textAlign: 'center',
                            color: 'var(--muted)',
                            fontSize: '0.88rem',
                        }}
                    >
                        Чаты не найдены
                    </div>
                ) : (
                    filteredChats.map((chat) => {
                        const name = getChatName(chat)
                        const isActive =
                            String(chat.id) ===
                            String(chatId)
                        const isOwner =
                            chat.is_group &&
                            chat.owner_id === currentUserId
                        const isEditing =
                            editingChatId === chat.id
                        const isDeleting =
                            deletingChatId === chat.id

                        if (isEditing) {
                            return (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${
                                        isActive
                                            ? 'active'
                                            : ''
                                    }`}
                                    style={{
                                        cursor: 'default',
                                    }}
                                >
                                    <div
                                        className="chat-avatar"
                                        style={{
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {editingPreview ? (
                                            <img
                                                src={editingPreview}
                                                alt={name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    borderRadius: '50%',
                                                }}
                                            />
                                        ) : (
                                            name
                                                .charAt(0)
                                                .toUpperCase()
                                        )}
                                    </div>
                                    <div
                                        className="chat-details"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                        }}
                                    >
                                        <input
                                            value={editingTitle}
                                            onChange={(e) =>
                                                setEditingTitle(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Название"
                                            autoFocus
                                        />
                                        <input
                                            value={editingDescription}
                                            onChange={(e) =>
                                                setEditingDescription(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Описание"
                                        />
                                        <label
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            Фото группы
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={
                                                    handleFileChange
                                                }
                                            />
                                        </label>
                                        {editingFile && (
                                            <span
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--muted)',
                                                }}
                                            >
                                                {editingFile.name}
                                            </span>
                                        )}
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '6px',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={
                                                    handleSaveEdit
                                                }
                                                disabled={
                                                    editingLoading
                                                }
                                                className="btn-primary"
                                            >
                                                {editingLoading
                                                    ? 'Сохранение...'
                                                    : 'Сохранить'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={
                                                    handleCancelEdit
                                                }
                                                disabled={
                                                    editingLoading
                                                }
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div
                                key={chat.id}
                                className={`chat-item-wrapper ${
                                    isActive
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <Link
                                    to={`/chat/${chat.id}`}
                                    className={`chat-item ${
                                        isActive
                                            ? 'active'
                                            : ''
                                    }`}
                                >
                                    <div
                                        className="chat-avatar"
                                        style={{
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {chat.avatar ? (
                                            <img
                                                src={chat.avatar}
                                                alt={name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    borderRadius: '50%',
                                                }}
                                            />
                                        ) : (
                                            name
                                                .charAt(0)
                                                .toUpperCase()
                                        )}
                                    </div>
                                    <div className="chat-details">
                                        <div className="chat-top-row">
                                            <span className="chat-title">
                                                {name}
                                            </span>
                                            <span className="chat-time">
                                                {chat.last_message_time || ''}
                                            </span>
                                        </div>
                                        <div
                                            className="chat-last-message"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {chat.last_message ||
                                                    (
                                                        chat.is_group
                                                            ? 'Групповой чат'
                                                            : 'Личная переписка'
                                                    )}
                                            </span>
                                            {chat.unread_count > 0 && (
                                                <span
                                                    style={{
                                                        flexShrink: 0,
                                                        minWidth: '20px',
                                                        height: '20px',
                                                        padding: '0 6px',
                                                        borderRadius: '10px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: '#22c55e',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {chat.unread_count > 99
                                                        ? '99+'
                                                        : chat.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                                {isOwner && (
                                    <div
                                        className="chat-actions"
                                        onClick={(e) =>
                                            e.stopPropagation()
                                        }
                                    >
                                        <button
                                            type="button"
                                            title="Редактировать чат"
                                            onClick={() =>
                                                handleStartEdit(chat)
                                            }
                                        >
                                            ✎
                                        </button>
                                        <button
                                            type="button"
                                            title="Удалить чат"
                                            onClick={() =>
                                                handleDelete(chat)
                                            }
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? '...' : '×'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}