import {
    useEffect,
    useRef,
    useState,
} from 'react'
import type {
    ChangeEvent,
    KeyboardEvent,
} from 'react'
import {
    useNavigate,
    useParams,
} from 'react-router-dom'
import {
    buildWsUrl,
} from '../api/client'
import {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    searchMessages,
} from '../api/messages'
import {
    getAttachment,
} from '../api/attachments'
import {
    getParticipants,
    addParticipant,
    getChat,
    removeParticipant,
    leaveChat,
} from '../api/chats'
import {
    getUserAvatar,
} from '../api/users'

type MessageAttachment = {
    id: string
    message_id: string
    file_name: string
    file_key: string
    mime_type: string
    size: number
    duration?: number | null
}

type Message = {
    id: string
    chat_id: string
    sender_id: string
    text: string | null
    sent_at: string
    edited_at: string
    sender?: {
        id: string
        username?: string | null
        phone_number?: string | null
    } | null
    attachments: MessageAttachment[]
}

type Chat = {
    id: string
    title?: string
    is_group?: boolean
    owner_id?: string | null
}

type ParticipantUser = {
    id: string
    username?: string | null
    phone_number?: string | null
    avatar?: string | null
    last_seen_at?: string | null
    is_online?: boolean
}

type Participant = {
    id: string
    chat_id: string
    user_id: string
    joined_at: string
    user?: ParticipantUser | null
}

export default function Chat() {
    const { chatId = '' } = useParams()
    const navigate = useNavigate()
    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [chat, setChat] = useState<Chat | null>(null)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [newParticipantPhone, setNewParticipantPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editingText, setEditingText] = useState('')
    const [editingLoading, setEditingLoading] = useState(false)
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
    const [searchText, setSearchText] = useState('')
    const [searchResults, setSearchResults] = useState<Message[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
    const [userAvatarUrls, setUserAvatarUrls] = useState<Record<string, string>>({})
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const wsRef = useRef<WebSocket | null>(null)
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const imageInputRef = useRef<HTMLInputElement | null>(null)
    const videoInputRef = useRef<HTMLInputElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordingChunksRef = useRef<Blob[]>([])
    const recordingTimerRef = useRef<number | null>(null)
    const currentUserId = localStorage.getItem('user_id') || ''
    const currentUsername = localStorage.getItem('username') || ''
    const isGroupChat = chat?.is_group === true
    const isOwner = isGroupChat && chat?.owner_id === currentUserId

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
        })
    }

    const formatFileSize = (bytes: number) => {
        if (!bytes) {
            return '0 Bytes'
        }
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const index = Math.min(
            Math.floor(Math.log(bytes) / Math.log(1024)),
            sizes.length - 1
        )
        return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${sizes[index]}`
    }

    const formatRecordingTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    }

    const formatLastSeen = (lastSeenAt?: string | null) => {
        if (!lastSeenAt) {
            return 'Не был в сети'
        }
        const date = new Date(lastSeenAt)
        if (Number.isNaN(date.getTime())) {
            return 'Не был в сети'
        }
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        if (diffMs < 0) {
            return 'Не был в сети'
        }
        const diffMinutes = Math.floor(diffMs / 1000 / 60)
        if (diffMinutes < 1) {
            return 'Был только что'
        }
        if (diffMinutes < 60) {
            return `Был ${diffMinutes} мин назад`
        }
        const diffHours = Math.floor(diffMinutes / 60)
        if (diffHours < 24) {
            return `Был ${diffHours} ч назад`
        }
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays === 1) {
            return 'Был вчера'
        }
        if (diffDays < 7) {
            return `Был ${diffDays} дн назад`
        }
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    }

    const isMessageEdited = (message: Message) => {
        if (!message.edited_at || !message.sent_at) {
            return false
        }
        const sentAt = new Date(message.sent_at).getTime()
        const editedAt = new Date(message.edited_at).getTime()
        if (Number.isNaN(sentAt) || Number.isNaN(editedAt)) {
            return false
        }
        return editedAt !== sentAt
    }

    const setUserOnline = (userId: string) => {
        setOnlineUsers((prev) => {
            const next = new Set(prev)
            next.add(userId)
            return next
        })
    }

    const setUserOffline = (userId: string) => {
        setOnlineUsers((prev) => {
            const next = new Set(prev)
            next.delete(userId)
            return next
        })
    }

    const updateParticipantOnlineStatus = (
        userId: string,
        isOnline: boolean,
        lastSeenAt?: string | null
    ) => {
        setParticipants((prev) =>
            prev.map((participant) => {
                const participantUserId =
                    participant.user?.id || participant.user_id
                if (participantUserId !== userId) {
                    return participant
                }
                return {
                    ...participant,
                    user: participant.user
                        ? {
                              ...participant.user,
                              is_online: isOnline,
                              ...(lastSeenAt !== undefined
                                  ? { last_seen_at: lastSeenAt }
                                  : {}),
                          }
                        : participant.user,
                }
            })
        )
    }

    useEffect(() => {
        if (!chatId) {
            return
        }
        const loadData = async () => {
            try {
                setLoading(true)
                setError(null)
                const chatInfo = await getChat(chatId)
                setChat(chatInfo)
                const msgs = await getMessages(chatId)
                setMessages(msgs)
                if (chatInfo.is_group) {
                    const parts = await getParticipants(chatId)
                    setParticipants(parts)
                    setOnlineUsers(
                        new Set(
                            parts
                                .filter(
                                    (participant) =>
                                        participant.user?.is_online === true
                                )
                                .map(
                                    (participant) =>
                                        participant.user?.id ||
                                        participant.user_id
                                )
                        )
                    )
                } else {
                    setParticipants([])
                    setOnlineUsers(new Set())
                }
                setTimeout(() => {
                    scrollToBottom(false)
                }, 100)
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
        loadData()
    }, [chatId])

    useEffect(() => {
        if (!chatId || messages.length === 0) {
            return
        }
        const loadAttachments = async () => {
            const allAttachments = messages.flatMap(
                (message) => message.attachments || []
            )
            const uniqueAttachments = Array.from(
                new Map(
                    allAttachments.map((attachment) => [
                        attachment.id,
                        attachment,
                    ])
                ).values()
            )
            const attachmentsToLoad = uniqueAttachments.filter(
                (attachment) => !attachmentUrls[attachment.id]
            )
            if (attachmentsToLoad.length === 0) {
                return
            }
            const results = await Promise.all(
                attachmentsToLoad.map(async (attachment) => {
                    try {
                        const url = await getAttachment(
                            chatId,
                            attachment.id
                        )
                        return {
                            id: attachment.id,
                            url,
                        }
                    } catch (e) {
                        console.error(
                            'Attachment load error:',
                            e
                        )
                        return null
                    }
                })
            )
            const loadedUrls = results.filter(
                (
                    result
                ): result is {
                    id: string
                    url: string
                } => result !== null
            )
            if (loadedUrls.length === 0) {
                return
            }
            setAttachmentUrls((prev) => {
                const next = { ...prev }
                loadedUrls.forEach(({ id, url }) => {
                    next[id] = url
                })
                return next
            })
        }
        loadAttachments()
    }, [messages, chatId, attachmentUrls])

    useEffect(() => {
        return () => {
            Object.values(attachmentUrls).forEach((url) => {
                URL.revokeObjectURL(url)
            })
        }
    }, [attachmentUrls])

    useEffect(() => {
        if (!isGroupChat || participants.length === 0) {
            return
        }
        const loadUserAvatars = async () => {
            const userIds = Array.from(
                new Set(
                    participants
                        .map(
                            (participant) =>
                                participant.user?.id ||
                                participant.user_id
                        )
                        .filter(Boolean)
                )
            )
            const usersToLoad = userIds.filter(
                (userId) => !userAvatarUrls[userId]
            )
            if (usersToLoad.length === 0) {
                return
            }
            const results = await Promise.all(
                usersToLoad.map(async (userId) => {
                    try {
                        const url = await getUserAvatar(userId)
                        return {
                            userId,
                            url,
                        }
                    } catch (e) {
                        console.error(
                            `Avatar load error for user ${userId}:`,
                            e
                        )
                        return null
                    }
                })
            )
            const loadedAvatars = results.filter(
                (
                    result
                ): result is {
                    userId: string
                    url: string
                } => result !== null
            )
            if (loadedAvatars.length === 0) {
                return
            }
            setUserAvatarUrls((prev) => {
                const next = { ...prev }
                loadedAvatars.forEach(({ userId, url }) => {
                    next[userId] = url
                })
                return next
            })
        }
        loadUserAvatars()
    }, [participants, isGroupChat, userAvatarUrls])

    useEffect(() => {
        return () => {
            Object.values(userAvatarUrls).forEach((url) => {
                URL.revokeObjectURL(url)
            })
        }
    }, [userAvatarUrls])

    useEffect(() => {
        if (!chatId) {
            return
        }
        const token = localStorage.getItem('access_token')
        if (!token) {
            return
        }
        const ws = new WebSocket(buildWsUrl(token))
        wsRef.current = ws

        ws.onopen = () => {
            console.log('WebSocket connected')
        }

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data)

                if (payload.type === 'user.online') {
                    const userId = String(payload.user_id)
                    setUserOnline(userId)
                    updateParticipantOnlineStatus(userId, true)
                    return
                }

                if (payload.type === 'user.offline') {
                    const userId = String(payload.user_id)
                    const lastSeenAt =
                        payload.last_seen_at || null
                    setUserOffline(userId)
                    updateParticipantOnlineStatus(
                        userId,
                        false,
                        lastSeenAt
                    )
                    return
                }

                if (
                    payload.type === 'message_created' &&
                    String(payload.chat_id) === String(chatId)
                ) {
                    const newMessage: Message = payload.data
                    setMessages((prev) => {
                        const exists = prev.some(
                            (message) =>
                                message.id === newMessage.id
                        )
                        if (exists) {
                            return prev
                        }
                        return [...prev, newMessage]
                    })
                    setTimeout(() => {
                        scrollToBottom()
                    }, 50)
                }
            } catch (e) {
                console.error(
                    'WS message parse error:',
                    e
                )
            }
        }

        ws.onerror = (event) => {
            console.error(
                'WebSocket error:',
                event
            )
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected')
        }

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [chatId])

    const handleSelectFile = (file: File | undefined) => {
        if (!file) {
            return
        }
        setSelectedFile(file)
        setError(null)
    }

    const handleImageChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        handleSelectFile(e.target.files?.[0])
        e.target.value = ''
    }

    const handleVideoChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        handleSelectFile(e.target.files?.[0])
        e.target.value = ''
    }

    const handleFileChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        handleSelectFile(e.target.files?.[0])
        e.target.value = ''
    }

    const handleRemoveSelectedFile = () => {
        setSelectedFile(null)
    }

    const handleSend = async () => {
        if (
            !chatId ||
            (!text.trim() && !selectedFile)
        ) {
            return
        }
        try {
            setSending(true)
            setError(null)
            const textToSend = text.trim()
            const fileToSend = selectedFile
            setText('')
            setSelectedFile(null)
            const data = await sendMessage(
                chatId,
                textToSend || undefined,
                fileToSend
            )
            setMessages((prev) => {
                const exists = prev.some(
                    (message) => message.id === data.id
                )
                if (exists) {
                    return prev
                }
                return [...prev, data]
            })
            setTimeout(() => {
                scrollToBottom()
            }, 50)
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
            setSending(false)
        }
    }

    const handleKeyDown = (
        e: KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const startRecording = async () => {
        try {
            setError(null)
            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                })
            const recorder = new MediaRecorder(stream)
            recordingChunksRef.current = []

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordingChunksRef.current.push(
                        event.data
                    )
                }
            }

            recorder.onstop = () => {
                const audioBlob = new Blob(
                    recordingChunksRef.current,
                    {
                        type:
                            recorder.mimeType ||
                            'audio/webm',
                    }
                )
                const extension = audioBlob.type.includes(
                    'ogg'
                )
                    ? 'ogg'
                    : 'webm'
                const audioFile = new File(
                    [audioBlob],
                    `voice-${Date.now()}.${extension}`,
                    {
                        type: audioBlob.type,
                    }
                )
                setSelectedFile(audioFile)
                stream.getTracks().forEach(
                    (track) => track.stop()
                )
                setIsRecording(false)
                setRecordingTime(0)
                mediaRecorderRef.current = null
            }

            recorder.start()
            mediaRecorderRef.current = recorder
            setIsRecording(true)
            setRecordingTime(0)

            recordingTimerRef.current =
                window.setInterval(() => {
                    setRecordingTime(
                        (prev) => prev + 1
                    )
                }, 1000)
        } catch (e) {
            console.error(e)
            setError(
                'Не удалось получить доступ к микрофону'
            )
        }
    }

    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
        ) {
            mediaRecorderRef.current.stop()
        }
        if (recordingTimerRef.current !== null) {
            window.clearInterval(
                recordingTimerRef.current
            )
            recordingTimerRef.current = null
        }
    }

    useEffect(() => {
        return () => {
            if (recordingTimerRef.current !== null) {
                window.clearInterval(
                    recordingTimerRef.current
                )
            }
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== 'inactive'
            ) {
                mediaRecorderRef.current.stop()
            }
        }
    }, [])

    const handleStartEdit = (message: Message) => {
        if (
            message.sender_id !== currentUserId ||
            !message.text
        ) {
            return
        }
        setEditingMessageId(message.id)
        setEditingText(message.text)
        setError(null)
    }

    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditingText('')
    }

    const handleSaveEdit = async () => {
        if (!chatId || !editingMessageId) {
            return
        }
        const newText = editingText.trim()
        if (!newText) {
            setError(
                'Сообщение не может быть пустым'
            )
            return
        }
        try {
            setEditingLoading(true)
            setError(null)
            const updatedMessage = await editMessage(
                chatId,
                editingMessageId,
                newText
            )
            setMessages((prev) =>
                prev.map(
                    (message) =>
                        message.id === editingMessageId
                            ? updatedMessage
                            : message
                )
            )
            setSearchResults((prev) =>
                prev.map(
                    (message) =>
                        message.id === editingMessageId
                            ? updatedMessage
                            : message
                )
            )
            handleCancelEdit()
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

    const handleDeleteMessage = async (
        messageId: string
    ) => {
        if (!chatId) {
            return
        }
        if (!window.confirm('Удалить это сообщение?')) {
            return
        }
        try {
            setDeletingMessageId(messageId)
            setError(null)
            await deleteMessage(chatId, messageId)
            setMessages((prev) =>
                prev.filter(
                    (message) =>
                        message.id !== messageId
                )
            )
            setSearchResults((prev) =>
                prev.filter(
                    (message) =>
                        message.id !== messageId
                )
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
            setDeletingMessageId(null)
        }
    }

    const handleSearch = async () => {
        const query = searchText.trim()
        if (!chatId || !query) {
            setSearchResults([])
            setIsSearching(false)
            return
        }
        try {
            setSearchLoading(true)
            setIsSearching(true)
            setError(null)
            const results = await searchMessages(
                chatId,
                query
            )
            setSearchResults(results)
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
            setSearchLoading(false)
        }
    }

    const handleSearchKeyDown = (
        e: KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
        }
    }

    const handleClearSearch = () => {
        setSearchText('')
        setSearchResults([])
        setIsSearching(false)
    }

    const handleAddParticipant = async () => {
        const phone = newParticipantPhone.trim()
        if (!phone || !chatId) {
            return
        }
        try {
            setError(null)
            await addParticipant(
                chatId,
                phone
            )
            const parts = await getParticipants(
                chatId
            )
            setParticipants(parts)
            setOnlineUsers(
                new Set(
                    parts
                        .filter(
                            (participant) =>
                                participant.user?.is_online === true
                        )
                        .map(
                            (participant) =>
                                participant.user?.id ||
                                participant.user_id
                        )
                )
            )
            setNewParticipantPhone('')
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        }
    }

    const handleRemoveParticipant = async (
        participant: Participant
    ) => {
        const userId =
            participant.user?.id ||
            participant.user_id
        if (!chatId || !userId) {
            return
        }
        try {
            setError(null)
            await removeParticipant(
                chatId,
                userId
            )
            setParticipants((prev) =>
                prev.filter(
                    (item) =>
                        (
                            item.user?.id ||
                            item.user_id
                        ) !== userId
                )
            )
            setOnlineUsers((prev) => {
                const next = new Set(prev)
                next.delete(userId)
                return next
            })
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        }
    }

    const handleLeaveChat = async () => {
        if (!chatId) {
            return
        }
        if (!window.confirm('Покинуть группу?')) {
            return
        }
        try {
            setError(null)
            await leaveChat(chatId)
            navigate('/')
        } catch (e: any) {
            console.error(e)
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        }
    }

    const handleParticipantClick = (
        userId: string
    ) => {
        if (userId === currentUserId) {
            navigate('/profile')
            return
        }
        navigate(`/profile/${userId}`)
    }

    const getParticipantName = (
        participant: Participant
    ) => {
        return (
            participant.user?.username ||
            participant.user?.phone_number ||
            participant.user_id
        )
    }

    const getParticipantInitial = (
        participant: Participant
    ) => {
        const name =
            participant.user?.username ||
            participant.user?.phone_number ||
            '?'
        return name.charAt(0).toUpperCase()
    }

    const renderAttachment = (
        attachment: MessageAttachment
    ) => {
        const url =
            attachmentUrls[attachment.id]
        if (!url) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
                    Загрузка файла...
                </div>
            )
        }

        if (
            attachment.mime_type.startsWith(
                'image/'
            )
        ) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
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

        if (
            attachment.mime_type.startsWith(
                'video/'
            )
        ) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
                    <video
                        controls
                        preload="metadata"
                        className="chat-video"
                    >
                        <source
                            src={url}
                            type={
                                attachment.mime_type
                            }
                        />
                    </video>
                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>
                </div>
            )
        }

        if (
            attachment.mime_type.startsWith(
                'audio/'
            )
        ) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
                    <audio
                        controls
                        preload="metadata"
                        className="chat-audio"
                    >
                        <source
                            src={url}
                            type={
                                attachment.mime_type
                            }
                        />
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
                <a
                    href={url}
                    download={
                        attachment.file_name
                    }
                >
                    Скачать:{' '}
                    {attachment.file_name}
                </a>
            </div>
        )
    }

    const renderMessage = (
        message: Message
    ) => {
        const isMine =
            message.sender_id === currentUserId
        const senderName = isMine
            ? currentUsername || 'Вы'
            : message.sender?.username ||
              message.sender?.phone_number ||
              message.sender_id
        const isEditing =
            editingMessageId === message.id
        const isDeleting =
            deletingMessageId === message.id
        const edited =
            isMessageEdited(message)

        return (
            <div
                key={message.id}
                className={`message-item ${
                    isMine ? 'mine' : ''
                }`}
            >
                <div className="message-author">
                    {senderName}
                </div>

                {isEditing ? (
                    <div className="message-edit">
                        <input
                            value={editingText}
                            onChange={(e) =>
                                setEditingText(
                                    e.target.value
                                )
                            }
                            onKeyDown={(e) => {
                                if (
                                    e.key === 'Enter' &&
                                    !e.shiftKey
                                ) {
                                    e.preventDefault()
                                    handleSaveEdit()
                                }
                            }}
                            autoFocus
                        />
                        <div className="message-edit-actions">
                            <button
                                type="button"
                                onClick={
                                    handleSaveEdit
                                }
                                disabled={
                                    editingLoading
                                }
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

                        {message.attachments?.map(
                            renderAttachment
                        )}

                        {isMine && (
                            <div className="message-actions">
                                {message.text && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleStartEdit(
                                                message
                                            )
                                        }
                                    >
                                        Изменить
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleDeleteMessage(
                                            message.id
                                        )
                                    }
                                    disabled={
                                        isDeleting
                                    }
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

    return (
        <div className="chat-page">
            <div className="chat-header">
                <div className="chat-header-info">
                    <h2>
                        {chat?.title || 'Чат'}
                    </h2>
                    {isGroupChat && (
                        <p className="chat-meta">
                            Участников:{' '}
                            {participants.length}
                        </p>
                    )}
                </div>

                <div className="chat-search">
                    <input
                        placeholder="Поиск сообщений..."
                        value={searchText}
                        onChange={(e) =>
                            setSearchText(
                                e.target.value
                            )
                        }
                        onKeyDown={
                            handleSearchKeyDown
                        }
                    />
                    <button
                        type="button"
                        onClick={
                            handleSearch
                        }
                        disabled={
                            searchLoading
                        }
                    >
                        {searchLoading
                            ? '...'
                            : 'Найти'}
                    </button>
                    {isSearching && (
                        <button
                            type="button"
                            onClick={
                                handleClearSearch
                            }
                        >
                            Очистить
                        </button>
                    )}
                </div>
            </div>

            {isSearching && (
                <div className="search-results">
                    <div className="search-results-header">
                        <h3>
                            Результаты поиска
                        </h3>
                        <span>
                            {
                                searchResults.length
                            }
                        </span>
                    </div>
                    {searchResults.length ===
                    0 ? (
                        <div className="search-empty">
                            Ничего не найдено
                        </div>
                    ) : (
                        searchResults.map(
                            renderMessage
                        )
                    )}
                </div>
            )}

            <div className="chat-grid">
                <section className="chat-window">
                    <div className="message-list">
                        {loading &&
                        messages.length ===
                            0 ? (
                            <div className="chat-loading">
                                Загрузка...
                            </div>
                        ) : messages.length ===
                          0 ? (
                            <div className="chat-empty">
                                Сообщений пока нет
                            </div>
                        ) : (
                            messages.map(
                                renderMessage
                            )
                        )}
                        <div
                            ref={
                                messagesEndRef
                            }
                        />
                    </div>

                    <input
                        ref={
                            imageInputRef
                        }
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={
                            handleImageChange
                        }
                    />
                    <input
                        ref={
                            videoInputRef
                        }
                        type="file"
                        accept="video/*"
                        hidden
                        onChange={
                            handleVideoChange
                        }
                    />
                    <input
                        ref={
                            fileInputRef
                        }
                        type="file"
                        hidden
                        onChange={
                            handleFileChange
                        }
                    />

                    {selectedFile && (
                        <div className="selected-file">
                            <div className="selected-file-info">
                                <span className="selected-file-name">
                                    {
                                        selectedFile.name
                                    }
                                </span>
                                <span className="selected-file-size">
                                    {formatFileSize(
                                        selectedFile.size
                                    )}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={
                                    handleRemoveSelectedFile
                                }
                                className="selected-file-remove"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {isRecording && (
                        <div className="recording-panel">
                            <span>
                                Запись:{' '}
                                {formatRecordingTime(
                                    recordingTime
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={
                                    stopRecording
                                }
                            >
                                Остановить
                            </button>
                        </div>
                    )}

                    <div className="chat-input-row">
                        <div className="attachment-buttons">
                            <button
                                type="button"
                                className="attachment-button"
                                onClick={() =>
                                    imageInputRef.current?.click()
                                }
                            >
                                Фото
                            </button>
                            <button
                                type="button"
                                className="attachment-button"
                                onClick={() =>
                                    videoInputRef.current?.click()
                                }
                            >
                                Видео
                            </button>
                            <button
                                type="button"
                                className="attachment-button"
                                onClick={() =>
                                    fileInputRef.current?.click()
                                }
                            >
                                Файл
                            </button>
                            {!isRecording ? (
                                <button
                                    type="button"
                                    className="attachment-button"
                                    onClick={
                                        startRecording
                                    }
                                >
                                    Аудио
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="attachment-button"
                                    onClick={
                                        stopRecording
                                    }
                                >
                                    Стоп
                                </button>
                            )}
                        </div>

                        <input
                            className="message-input"
                            placeholder="Напишите сообщение..."
                            value={text}
                            onChange={(e) =>
                                setText(
                                    e.target.value
                                )
                            }
                            onKeyDown={
                                handleKeyDown
                            }
                        />

                        <button
                            type="button"
                            className="send-button"
                            onClick={
                                handleSend
                            }
                            disabled={
                                sending ||
                                (
                                    !text.trim() &&
                                    !selectedFile
                                )
                            }
                        >
                            {sending
                                ? '...'
                                : 'Отправить'}
                        </button>
                    </div>

                    {error && (
                        <div className="chat-error">
                            {error}
                        </div>
                    )}
                </section>

                {isGroupChat && (
                    <aside className="chat-sidebar">
                        <div className="sidebar-section">
                            <div className="sidebar-section-header">
                                <h3>
                                    Участники
                                </h3>
                                <span>
                                    {
                                        participants.length
                                    }
                                </span>
                            </div>

                            <div className="participants-list">
                                {participants.map(
                                    (
                                        participant
                                    ) => {
                                        const userId =
                                            participant.user?.id ||
                                            participant.user_id
                                        const isCurrent =
                                            userId ===
                                            currentUserId
                                        const avatarUrl =
                                            userAvatarUrls[
                                                userId
                                            ]
                                        const name =
                                            getParticipantName(
                                                participant
                                            )
                                        const isOnline =
                                            onlineUsers.has(
                                                userId
                                            )

                                        return (
                                            <div
                                                key={
                                                    participant.id
                                                }
                                                className="participant"
                                            >
                                                <div
                                                    className="participant-info"
                                                    role="button"
                                                    tabIndex={
                                                        0
                                                    }
                                                    onClick={() =>
                                                        handleParticipantClick(
                                                            userId
                                                        )
                                                    }
                                                    onKeyDown={(
                                                        e
                                                    ) => {
                                                        if (
                                                            e.key ===
                                                            'Enter'
                                                        ) {
                                                            handleParticipantClick(
                                                                userId
                                                            )
                                                        }
                                                    }}
                                                >
                                                    <div className="participant-avatar">
                                                        {avatarUrl ? (
                                                            <img
                                                                src={
                                                                    avatarUrl
                                                                }
                                                                alt={
                                                                    name
                                                                }
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
                                                            {
                                                                name
                                                            }
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
                                                                    participant
                                                                        .user
                                                                        ?.last_seen_at
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {isOwner &&
                                                !isCurrent &&
                                                userId && (
                                                    <button
                                                        type="button"
                                                        className="participant-remove"
                                                        onClick={(
                                                            e
                                                        ) => {
                                                            e.stopPropagation()
                                                            handleRemoveParticipant(
                                                                participant
                                                            )
                                                        }}
                                                    >
                                                        Удалить
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    }
                                )}
                            </div>
                        </div>

                        {isOwner && (
                            <div className="sidebar-section">
                                <h3>
                                    Добавить участника
                                </h3>
                                <div className="participant-add">
                                    <input
                                        placeholder="Номер телефона"
                                        value={
                                            newParticipantPhone
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setNewParticipantPhone(
                                                e.target.value
                                            )
                                        }
                                        onKeyDown={(
                                            e
                                        ) => {
                                            if (
                                                e.key ===
                                                'Enter'
                                            ) {
                                                handleAddParticipant()
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={
                                            handleAddParticipant
                                        }
                                        disabled={
                                            !newParticipantPhone.trim()
                                        }
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
                                onClick={
                                    handleLeaveChat
                                }
                            >
                                Покинуть группу
                            </button>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    )
}
