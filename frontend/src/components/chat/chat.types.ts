import type { ChangeEvent, RefObject } from 'react'

export type MessageAttachment = {
    id: string
    message_id: string
    file_name: string
    file_key: string
    mime_type: string
    size: number
    duration?: number | null
}

export type MessageSender = {
    id: string
    username?: string | null
    phone_number?: string | null
    avatar?: string | null
}

export type Message = {
    id: string
    chat_id: string
    sender_id: string
    text: string | null
    sent_at: string
    edited_at: string
    sender?: MessageSender | null
    attachments: MessageAttachment[]
}

export type ChatInfo = {
    id: string
    title?: string
    is_group?: boolean
    owner_id?: string | null
}

export type ParticipantUser = {
    id: string
    username?: string | null
    phone_number?: string | null
    avatar?: string | null
    last_seen_at?: string | null
    is_online?: boolean
}

export type Participant = {
    id: string
    chat_id: string
    user_id: string
    joined_at: string
    last_read_at?: string | null
    user?: ParticipantUser | null
}

export type WebSocketPayload = {
    type?: string
    user_id?: string
    chat_id?: string
    last_seen_at?: string | null
    data?: Message
}

export type ChatInputRefs = {
    imageInputRef: RefObject<HTMLInputElement | null>
    videoInputRef: RefObject<HTMLInputElement | null>
    fileInputRef: RefObject<HTMLInputElement | null>
}

export type FileChangeHandler = (
    event: ChangeEvent<HTMLInputElement>
) => void

