import { useEffect, useRef } from 'react'
import { buildWsUrl } from '../../api/client'
import type {
    Message,
    Participant,
    WebSocketPayload,
} from './chat.types'
import { getParticipantUserId } from './chat.utils'

type UseChatWebSocketOptions = {
    chatId: string
    token?: string | null
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    setOnlineUsers: React.Dispatch<React.SetStateAction<Set<string>>>
    setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>
    scrollToBottom: (smooth?: boolean) => void
}

export function useChatWebSocket({
    chatId,
    token,
    setMessages,
    setOnlineUsers,
    setParticipants,
    scrollToBottom,
}: UseChatWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null)
    const chatIdRef = useRef(chatId)
    const scrollToBottomRef = useRef(scrollToBottom)

    useEffect(() => {
        chatIdRef.current = chatId
    }, [chatId])

    useEffect(() => {
        scrollToBottomRef.current = scrollToBottom
    }, [scrollToBottom])

    useEffect(() => {
        const activeToken = token ?? localStorage.getItem('access_token')
        if (!activeToken) {
            return
        }

        let isCleanedUp = false
        const ws = new WebSocket(buildWsUrl(activeToken))
        wsRef.current = ws

        const applyOnlineStatus = (
            userId: string,
            isOnline: boolean,
            lastSeenAt?: string | null
        ) => {
            setOnlineUsers(previous => {
                const next = new Set(previous)
                if (isOnline) {
                    next.add(userId)
                } else {
                    next.delete(userId)
                }
                return next
            })

            setParticipants(previous =>
                previous.map(participant => {
                    if (getParticipantUserId(participant) !== userId) {
                        return participant
                    }

                    return {
                        ...participant,
                        user: {
                            ...(participant.user ?? { id: userId }),
                            is_online: isOnline,
                            ...(lastSeenAt !== undefined
                                ? { last_seen_at: lastSeenAt }
                                : {}),
                        },
                    }
                })
            )
        }

        ws.onopen = () => {
            console.log('WebSocket connected')
        }

        ws.onmessage = event => {
            if (typeof event.data !== 'string') {
                return
            }

            try {
                const payload = JSON.parse(
                    event.data
                ) as WebSocketPayload

                if (
                    payload.type === 'user.online' ||
                    payload.type === 'user.offline'
                ) {
                    const userId = String(payload.user_id || '')
                    if (!userId) {
                        return
                    }

                    const isOnline = payload.type === 'user.online'
                    applyOnlineStatus(
                        userId,
                        isOnline,
                        isOnline ? undefined : payload.last_seen_at ?? null
                    )
                    return
                }

                if (
                    payload.type === 'message_created' &&
                    String(payload.chat_id) === String(chatIdRef.current)
                ) {
                    const newMessage = payload.data
                    if (!newMessage?.id) {
                        return
                    }

                    setMessages(previous => {
                        if (
                            previous.some(
                                message => message.id === newMessage.id
                            )
                        ) {
                            return previous
                        }
                        return [...previous, newMessage]
                    })

                    window.setTimeout(() => {
                        scrollToBottomRef.current()
                    }, 50)
                }
            } catch (cause) {
                console.error('WS message parse error:', cause)
            }
        }

        ws.onerror = event => {
            console.error('WebSocket error:', event)
        }

        ws.onclose = () => {
            if (!isCleanedUp) {
                console.log('WebSocket disconnected')
            }
        }

        return () => {
            isCleanedUp = true
            if (
                ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING
            ) {
                ws.close()
            }
            if (wsRef.current === ws) {
                wsRef.current = null
            }
        }
    }, [token, setMessages, setOnlineUsers, setParticipants])

    return wsRef
}