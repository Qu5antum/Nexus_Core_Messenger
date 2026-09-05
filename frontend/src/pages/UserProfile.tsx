import {
    useEffect,
    useRef,
    useState,
} from 'react'
import type {
    ChangeEvent,
    FormEvent,
} from 'react'
import {
    useNavigate,
    useParams,
} from 'react-router-dom'
import {
    getCurrentUserProfile,
    updateProfile,
    getCurrentUserAvatar,
    getUserProfile,
    getUserAvatar,
} from '../api/users'
import {
    getUsersCommonChats,
    getChatAvatar,
} from '../api/chats'

type UserProfile = {
    id: string
    username: string
    phone_number: string
    description?: string | null
}

type CommonChatUser = {
    username?: string | null
    phone_number?: string | null
}

type CommonChatParticipant = {
    user?: CommonChatUser | null
}

type CommonChat = {
    id: string
    title: string
    chat_participants: CommonChatParticipant[]
}

export default function UserProfile() {
    const navigate = useNavigate()
    const { userId } = useParams()

    const currentUserId =
        localStorage.getItem('user_id') || ''

    const isOwnProfile =
        !userId || userId === currentUserId

    const profileUserId =
        userId || currentUserId

    const avatarUrlRef =
        useRef<string | null>(null)

    const previewUrlRef =
        useRef<string | null>(null)

    const chatAvatarUrlsRef =
        useRef<Record<string, string>>({})

    const [profile, setProfile] =
        useState<UserProfile | null>(null)

    const [username, setUsername] =
        useState('')

    const [phoneNumber, setPhoneNumber] =
        useState('')

    const [description, setDescription] =
        useState('')

    const [avatarUrl, setAvatarUrl] =
        useState<string | null>(null)

    const [selectedAvatar, setSelectedAvatar] =
        useState<File | null>(null)

    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null)

    const [commonChats, setCommonChats] =
        useState<CommonChat[]>([])

    const [chatAvatarUrls, setChatAvatarUrls] =
        useState<Record<string, string>>({})

    const [commonChatsLoading, setCommonChatsLoading] =
        useState(false)

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [error, setError] =
        useState<string | null>(null)

    const [success, setSuccess] =
        useState<string | null>(null)

    const replaceAvatarUrl = (
        newUrl: string | null
    ) => {
        if (
            avatarUrlRef.current &&
            avatarUrlRef.current !== newUrl &&
            avatarUrlRef.current.startsWith('blob:')
        ) {
            URL.revokeObjectURL(
                avatarUrlRef.current
            )
        }

        avatarUrlRef.current = newUrl
        setAvatarUrl(newUrl)
    }

    const replacePreviewUrl = (
        newUrl: string | null
    ) => {
        if (
            previewUrlRef.current &&
            previewUrlRef.current !== newUrl &&
            previewUrlRef.current.startsWith('blob:')
        ) {
            URL.revokeObjectURL(
                previewUrlRef.current
            )
        }

        previewUrlRef.current = newUrl
        setPreviewUrl(newUrl)
    }

    const loadAvatar = async (
        targetUserId: string,
        ownProfile: boolean
    ) => {
        try {
            const url = ownProfile
                ? await getCurrentUserAvatar()
                : await getUserAvatar(targetUserId)

            replaceAvatarUrl(url)
        } catch (err) {
            console.log(
                'Avatar is not available:',
                err
            )

            replaceAvatarUrl(null)
        }
    }

    const loadChatAvatars = async (
        chats: CommonChat[]
    ) => {
        if (chats.length === 0) {
            return
        }

        const results =
            await Promise.all(
                chats.map(async (chat) => {
                    try {
                        const url =
                            await getChatAvatar(
                                chat.id
                            )

                        return {
                            chatId: chat.id,
                            url,
                        }
                    } catch (err) {
                        console.log(
                            `Chat avatar is not available: ${chat.id}`,
                            err
                        )

                        return null
                    }
                })
            )

        const loadedAvatars =
            results.filter(
                (
                    result
                ): result is {
                    chatId: string
                    url: string
                } => result !== null
            )

        if (loadedAvatars.length === 0) {
            return
        }

        setChatAvatarUrls(
            (prev) => {
                const next = {
                    ...prev,
                }

                loadedAvatars.forEach(
                    ({
                        chatId,
                        url,
                    }) => {
                        next[chatId] = url
                        chatAvatarUrlsRef.current[
                            chatId
                        ] = url
                    }
                )

                return next
            }
        )
    }

    const loadCommonChats = async (
        targetUserId: string
    ) => {
        try {
            setCommonChatsLoading(true)

            const chats =
                await getUsersCommonChats(
                    targetUserId
                )

            setCommonChats(
                chats || []
            )

            await loadChatAvatars(
                chats || []
            )
        } catch (err) {
            console.error(
                'Common chats loading error:',
                err
            )

            setCommonChats([])
            setChatAvatarUrls({})
        } finally {
            setCommonChatsLoading(
                false
            )
        }
    }

    useEffect(() => {
        if (!profileUserId) {
            setError(
                'Не удалось определить пользователя'
            )

            setLoading(false)

            return
        }

        let cancelled = false

        const loadProfile = async () => {
            try {
                setLoading(true)
                setError(null)
                setSuccess(null)

                const user =
                    isOwnProfile
                        ? await getCurrentUserProfile()
                        : await getUserProfile(
                              profileUserId
                          )

                if (cancelled) {
                    return
                }

                setProfile(user)

                setUsername(
                    user.username || ''
                )

                setPhoneNumber(
                    user.phone_number || ''
                )

                setDescription(
                    user.description || ''
                )

                await loadAvatar(
                    profileUserId,
                    isOwnProfile
                )

                if (
                    cancelled
                ) {
                    return
                }

                if (!isOwnProfile) {
                    await loadCommonChats(
                        profileUserId
                    )
                } else {
                    setCommonChats([])
                    setChatAvatarUrls({})
                }
            } catch (err: any) {
                if (cancelled) {
                    return
                }

                console.error(
                    'Profile loading error:',
                    err
                )

                setError(
                    String(
                        err?.response
                            ?.data
                            ?.detail ||
                        err?.response
                            ?.data ||
                        err?.message ||
                        'Не удалось загрузить профиль'
                    )
                )
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        loadProfile()

        return () => {
            cancelled = true
        }
    }, [
        profileUserId,
        isOwnProfile,
    ])

    useEffect(() => {
        return () => {
            if (
                avatarUrlRef.current &&
                avatarUrlRef.current.startsWith(
                    'blob:'
                )
            ) {
                URL.revokeObjectURL(
                    avatarUrlRef.current
                )
            }

            if (
                previewUrlRef.current &&
                previewUrlRef.current.startsWith(
                    'blob:'
                )
            ) {
                URL.revokeObjectURL(
                    previewUrlRef.current
                )
            }

            Object.values(
                chatAvatarUrlsRef.current
            ).forEach((url) => {
                if (
                    url.startsWith(
                        'blob:'
                    )
                ) {
                    URL.revokeObjectURL(
                        url
                    )
                }
            })
        }
    }, [])

    useEffect(() => {
        if (
            userId &&
            userId === currentUserId
        ) {
            navigate(
                '/profile',
                {
                    replace: true,
                }
            )
        }
    }, [
        userId,
        currentUserId,
        navigate,
    ])

    const handleAvatarChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        if (!isOwnProfile) {
            return
        }

        const file =
            event.target.files?.[0]

        if (!file) {
            return
        }

        if (
            !file.type.startsWith(
                'image/'
            )
        ) {
            setError(
                'Можно выбрать только изображение'
            )

            return
        }

        const newPreviewUrl =
            URL.createObjectURL(
                file
            )

        replacePreviewUrl(
            newPreviewUrl
        )

        setSelectedAvatar(file)
        setError(null)
        setSuccess(null)

        event.target.value = ''
    }

    const handleSave = async (
        event: FormEvent
    ) => {
        event.preventDefault()

        if (!isOwnProfile) {
            return
        }

        try {
            setSaving(true)
            setError(null)
            setSuccess(null)

            const hasNewAvatar =
                selectedAvatar !== null

            const updatedUser =
                await updateProfile({
                    username:
                        username.trim(),

                    phoneNumber:
                        phoneNumber.trim(),

                    description:
                        description.trim(),

                    avatarFile:
                        selectedAvatar,
                })

            setProfile(
                updatedUser
            )

            setUsername(
                updatedUser.username ||
                    ''
            )

            setPhoneNumber(
                updatedUser.phone_number ||
                    ''
            )

            setDescription(
                updatedUser.description ||
                    ''
            )

            replacePreviewUrl(
                null
            )

            setSelectedAvatar(
                null
            )

            if (hasNewAvatar) {
                await loadAvatar(
                    currentUserId,
                    true
                )
            }

            localStorage.setItem(
                'username',
                updatedUser.username ||
                    ''
            )

            setSuccess(
                'Профиль успешно обновлён'
            )
        } catch (err: any) {
            console.error(
                'Profile update error:',
                err
            )

            setError(
                String(
                    err?.response
                        ?.data
                        ?.detail ||
                    err?.response
                        ?.data ||
                    err?.message ||
                    'Не удалось обновить профиль'
                )
            )
        } finally {
            setSaving(false)
        }
    }

    const handleBack = () => {
        if (isOwnProfile) {
            navigate('/')
            return
        }

        navigate(-1)
    }

    const handleCommonChatClick = (
        chatId: string
    ) => {
        navigate(
            `/chat/${chatId}`
        )
    }

    const displayedAvatar =
        previewUrl ||
        avatarUrl

    const avatarLetter =
        profile?.username
            ?.charAt(0)
            .toUpperCase() ||
        profile?.phone_number
            ?.charAt(0)
            .toUpperCase() ||
        '?'

    const getParticipantName = (
        participant: CommonChatParticipant
    ) => {
        return (
            participant.user
                ?.username ||
            participant.user
                ?.phone_number ||
            'Пользователь'
        )
    }

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-loading">
                    Загрузка профиля...
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="profile-page">
                <div className="profile-error">
                    <p>
                        {error ||
                            'Не удалось загрузить профиль'}
                    </p>

                    <button
                        type="button"
                        className="profile-back-button"
                        onClick={
                            handleBack
                        }
                    >
                        ← Назад
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="profile-page">
            <div className="profile-card">
                <div className="profile-header">
                    <button
                        type="button"
                        className="profile-back-button"
                        onClick={
                            handleBack
                        }
                    >
                        ← Назад
                    </button>

                    <div className="profile-header-content">
                        <h2>
                            {isOwnProfile
                                ? 'Мой профиль'
                                : 'Профиль пользователя'}
                        </h2>

                        <p>
                            {isOwnProfile
                                ? 'Управление информацией профиля'
                                : 'Информация о пользователе'}
                        </p>
                    </div>
                </div>

                <form
                    className="profile-form"
                    onSubmit={
                        handleSave
                    }
                >
                    <div className="profile-avatar-section">
                        <div className="profile-avatar-wrapper">
                            {displayedAvatar ? (
                                <img
                                    src={
                                        displayedAvatar
                                    }
                                    alt={
                                        profile.username ||
                                        'Аватар'
                                    }
                                    className="profile-avatar-image"
                                    onError={() => {
                                        replaceAvatarUrl(
                                            null
                                        )
                                    }}
                                />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    {
                                        avatarLetter
                                    }
                                </div>
                            )}
                        </div>

                        {isOwnProfile && (
                            <div className="profile-avatar-info">
                                <label
                                    htmlFor="avatar-input"
                                    className="avatar-upload-button"
                                >
                                    Изменить фото
                                </label>

                                <input
                                    id="avatar-input"
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg"
                                    onChange={
                                        handleAvatarChange
                                    }
                                    hidden
                                />

                                <span>
                                    PNG, JPG,
                                    JPEG
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>
                            Имя пользователя
                        </label>

                        <input
                            type="text"
                            value={
                                username
                            }
                            onChange={(e) =>
                                setUsername(
                                    e.target.value
                                )
                            }
                            placeholder="Введите имя пользователя"
                            disabled={
                                !isOwnProfile ||
                                saving
                            }
                        />
                    </div>

                    <div className="profile-field">
                        <label>
                            Номер телефона
                        </label>

                        <input
                            type="tel"
                            value={
                                phoneNumber
                            }
                            onChange={(e) =>
                                setPhoneNumber(
                                    e.target.value
                                )
                            }
                            placeholder="+7..."
                            disabled={
                                !isOwnProfile ||
                                saving
                            }
                        />
                    </div>

                    <div className="profile-field">
                        <label>
                            О себе
                        </label>

                        <textarea
                            value={
                                description
                            }
                            onChange={(e) =>
                                setDescription(
                                    e.target.value
                                )
                            }
                            placeholder="Расскажите немного о себе"
                            rows={5}
                            disabled={
                                !isOwnProfile ||
                                saving
                            }
                        />
                    </div>

                    {error && (
                        <div className="profile-error">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="profile-success">
                            {success}
                        </div>
                    )}

                    {isOwnProfile && (
                        <button
                            type="submit"
                            className="profile-save-button"
                            disabled={
                                saving
                            }
                        >
                            {saving
                                ? 'Сохранение...'
                                : 'Сохранить изменения'}
                        </button>
                    )}
                </form>

                {!isOwnProfile && (
                    <div className="common-chats">
                        <div className="common-chats-header">
                            <h3>
                                Общие группы
                            </h3>

                            <span>
                                {
                                    commonChats.length
                                }
                            </span>
                        </div>

                        {commonChatsLoading ? (
                            <div className="common-chats-loading">
                                Загрузка общих групп...
                            </div>
                        ) : commonChats.length ===
                          0 ? (
                            <div className="common-chats-empty">
                                У вас нет общих групп
                            </div>
                        ) : (
                            <div className="common-chats-list">
                                {commonChats.map(
                                    (
                                        chat
                                    ) => {
                                        const chatAvatar =
                                            chatAvatarUrls[
                                                chat.id
                                            ]

                                        const chatLetter =
                                            chat.title
                                                ?.charAt(
                                                    0
                                                )
                                                .toUpperCase() ||
                                            '?'

                                        return (
                                            <div
                                                key={
                                                    chat.id
                                                }
                                                className="common-chat"
                                                role="button"
                                                tabIndex={
                                                    0
                                                }
                                                onClick={() =>
                                                    handleCommonChatClick(
                                                        chat.id
                                                    )
                                                }
                                                onKeyDown={(
                                                    event
                                                ) => {
                                                    if (
                                                        event.key ===
                                                        'Enter'
                                                    ) {
                                                        handleCommonChatClick(
                                                            chat.id
                                                        )
                                                    }
                                                }}
                                            >
                                                <div className="common-chat-info">
                                                    <div className="common-chat-avatar">
                                                        {chatAvatar ? (
                                                            <img
                                                                src={
                                                                    chatAvatar
                                                                }
                                                                alt={
                                                                    chat.title
                                                                }
                                                            />
                                                        ) : (
                                                            chatLetter
                                                        )}
                                                    </div>

                                                    <div className="common-chat-details">
                                                        <h4>
                                                            {
                                                                chat.title
                                                            }
                                                        </h4>

                                                        <span>
                                                            {
                                                                chat.chat_participants
                                                                    ?.length
                                                            }{' '}
                                                            участников
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="common-chat-participants">
                                                    {chat.chat_participants?.map(
                                                        (
                                                            participant,
                                                            index
                                                        ) => (
                                                            <span
                                                                key={`${chat.id}-${index}`}
                                                                className="common-chat-participant"
                                                            >
                                                                {
                                                                    getParticipantName(
                                                                        participant
                                                                    )
                                                                }
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    }
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
