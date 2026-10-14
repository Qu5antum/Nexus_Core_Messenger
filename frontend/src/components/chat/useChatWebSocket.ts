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
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    setOnlineUsers: React.Dispatch<React.SetStateAction<Set<string>>>
    setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>
    scrollToBottom: () => void
}

export function useChatWebSocket({
    chatId,
    setMessages,
    setOnlineUsers,
    setParticipants,
    scrollToBottom,
}: UseChatWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null)

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

        const updateParticipantOnlineStatus = (
            userId: string,
            isOnline: boolean,
            lastSeenAt?: string | null
        ) => {
            setParticipants(previous =>
                previous.map(participant => {
                    if (getParticipantUserId(participant) !== userId) {
                        return participant
                    }

                    return {
                        ...participant,
                        user: {
                            ...(participant.user || { id: userId }),
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
                    setOnlineUsers(previous => {
                        const next = new Set(previous)
                        if (isOnline) {
                            next.add(userId)
                        } else {
                            next.delete(userId)
                        }
                        return next
                    })
                    updateParticipantOnlineStatus(
                        userId,
                        isOnline,
                        isOnline ? undefined : payload.last_seen_at || null
                    )
                    return
                }

                if (
                    payload.type === 'message_created' &&
                    String(payload.chat_id) === String(chatId)
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
                    window.setTimeout(scrollToBottom, 50)
                }
            } catch (cause) {
                console.error('WS message parse error:', cause)
            }
        }

        ws.onerror = event => {
            console.error('WebSocket error:', event)
        }
        ws.onclose = () => {
            console.log('WebSocket disconnected')
        }

        return () => {
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
    }, [
        chatId,
        scrollToBottom,
        setMessages,
        setOnlineUsers,
        setParticipants,
    ])

    return wsRef
}
