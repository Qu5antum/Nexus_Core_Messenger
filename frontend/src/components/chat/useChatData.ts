import { useEffect, useState } from 'react'
import {
    addParticipant,
    getChat,
    getParticipants,
    leaveChat,
    markChatAsRead,
    removeParticipant,
} from '../../api/chats'
import { getMessages } from '../../api/messages'
import { getUserAvatar } from '../../api/users'
import type {
    ChatInfo,
    Message,
    Participant,
} from './chat.types'
import {
    errorMessage,
    getParticipantUserId,
} from './chat.utils'

type UseChatDataOptions = {
    chatId: string
    scrollToBottom: (smooth?: boolean) => void
    navigate: (path: string) => void
}

export function useChatData({
    chatId,
    scrollToBottom,
    navigate,
}: UseChatDataOptions) {
    const [messages, setMessages] = useState<Message[]>([])
    const [chat, setChat] = useState<ChatInfo | null>(null)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(
        new Set()
    )
    const [userAvatarUrls, setUserAvatarUrls] = useState<
        Record<string, string>
    >({})

    useEffect(() => {
        if (!chatId) {
            return
        }

        let cancelled = false
        const loadData = async () => {
            try {
                setLoading(true)
                setError(null)
                await markChatAsRead(chatId)
                if (cancelled) {
                    return
                }

                const [chatInfo, loadedMessages, loadedParticipants] =
                    await Promise.all([
                        getChat(chatId),
                        getMessages(chatId),
                        getParticipants(chatId),
                    ])

                if (cancelled) {
                    return
                }

                setChat(chatInfo)
                setMessages(loadedMessages)
                setParticipants(loadedParticipants)
                setOnlineUsers(
                    new Set(
                        loadedParticipants
                            .filter(
                                participant =>
                                    participant.user?.is_online === true
                            )
                            .map(getParticipantUserId)
                            .filter(Boolean)
                    )
                )

                window.setTimeout(() => {
                    if (!cancelled) {
                        scrollToBottom(false)
                    }
                }, 100)
            } catch (cause) {
                console.error(cause)
                if (!cancelled) {
                    setError(errorMessage(cause))
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadData()
        return () => {
            cancelled = true
        }
    }, [chatId, scrollToBottom])

    useEffect(() => {
        if (!chatId) {
            return
        }

        let cancelled = false
        const refreshParticipants = async () => {
            try {
                const loadedParticipants = await getParticipants(chatId)
                if (cancelled) {
                    return
                }

                setParticipants(loadedParticipants)
                setOnlineUsers(
                    new Set(
                        loadedParticipants
                            .filter(
                                participant =>
                                    participant.user?.is_online === true
                            )
                            .map(getParticipantUserId)
                            .filter(Boolean)
                    )
                )
            } catch (cause) {
                console.error('Participants refresh error:', cause)
            }
        }

        const intervalId = window.setInterval(
            () => void refreshParticipants(),
            5000
        )
        return () => {
            cancelled = true
            window.clearInterval(intervalId)
        }
    }, [chatId])

    useEffect(() => {
        if (participants.length === 0) {
            return
        }

        let cancelled = false
        const loadAvatars = async () => {
            const userIds = Array.from(
                new Set(
                    participants
                        .map(getParticipantUserId)
                        .filter(Boolean)
                )
            )
            const usersToLoad = userIds.filter(
                userId => !userAvatarUrls[userId]
            )
            if (usersToLoad.length === 0) {
                return
            }

            const results = await Promise.all(
                usersToLoad.map(async userId => {
                    try {
                        const url = await getUserAvatar(userId)
                        return typeof url === 'string'
                            ? { userId, url }
                            : null
                    } catch (cause) {
                        console.error(
                            `Avatar load error for user ${userId}:`,
                            cause
                        )
                        return null
                    }
                })
            )

            if (cancelled) {
                return
            }

            const loadedAvatars = results.filter(
                (
                    result
                ): result is { userId: string; url: string } =>
                    result !== null && Boolean(result.url)
            )
            if (loadedAvatars.length > 0) {
                setUserAvatarUrls(previous => ({
                    ...previous,
                    ...Object.fromEntries(
                        loadedAvatars.map(({ userId, url }) => [
                            userId,
                            url,
                        ])
                    ),
                }))
            }
        }

        void loadAvatars()
        return () => {
            cancelled = true
        }
    }, [participants, userAvatarUrls])

    useEffect(
        () => () => {
            Object.values(userAvatarUrls).forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url)
                }
            })
        },
        [userAvatarUrls]
    )

    const addChatParticipant = async (phone: string) => {
        if (!phone || !chatId) {
            return false
        }
        try {
            setError(null)
            await addParticipant(chatId, phone)
            const loadedParticipants = await getParticipants(chatId)
            setParticipants(loadedParticipants)
            setOnlineUsers(
                new Set(
                    loadedParticipants
                        .filter(
                            participant =>
                                participant.user?.is_online === true
                        )
                        .map(getParticipantUserId)
                        .filter(Boolean)
                )
            )
            return true
        } catch (cause) {
            console.error(cause)
            setError(errorMessage(cause))
            return false
        }
    }

    const removeChatParticipant = async (participant: Participant) => {
        const userId = getParticipantUserId(participant)
        if (!chatId || !userId) {
            return
        }
        try {
            setError(null)
            await removeParticipant(chatId, userId)
            setParticipants(previous =>
                previous.filter(
                    item => getParticipantUserId(item) !== userId
                )
            )
            setOnlineUsers(previous => {
                const next = new Set(previous)
                next.delete(userId)
                return next
            })
        } catch (cause) {
            console.error(cause)
            setError(errorMessage(cause))
        }
    }

    const leaveCurrentChat = async () => {
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
        } catch (cause) {
            console.error(cause)
            setError(errorMessage(cause))
        }
    }

    return {
        messages,
        setMessages,
        chat,
        participants,
        setParticipants,
        loading,
        error,
        setError,
        onlineUsers,
        setOnlineUsers,
        userAvatarUrls,
        addChatParticipant,
        removeChatParticipant,
        leaveCurrentChat,
    }
}
