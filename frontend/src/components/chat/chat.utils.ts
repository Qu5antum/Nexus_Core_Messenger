import type { Message, Participant } from './chat.types'

export const getParticipantUserId = (
    participant: Participant
) => participant.user?.id || participant.user_id

export const getParticipantName = (
    participant: Participant
) =>
    participant.user?.username ||
    participant.user?.phone_number ||
    participant.user_id

export const getParticipantInitial = (
    participant: Participant
) => {
    const name =
        participant.user?.username ||
        participant.user?.phone_number ||
        '?'

    return name.charAt(0).toUpperCase()
}

export const formatLastSeen = (
    lastSeenAt?: string | null
) => {
    if (!lastSeenAt) {
        return 'Не был в сети'
    }

    const date = new Date(lastSeenAt)
    if (Number.isNaN(date.getTime())) {
        return 'Не был в сети'
    }

    const diffMs = Date.now() - date.getTime()
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

export const formatFileSize = (bytes: number) => {
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

export const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(
        remainingSeconds
    ).padStart(2, '0')}`
}

export const isMessageEdited = (message: Message) => {
    if (!message.edited_at || !message.sent_at) {
        return false
    }

    const sentAt = new Date(message.sent_at).getTime()
    const editedAt = new Date(message.edited_at).getTime()
    return (
        !Number.isNaN(sentAt) &&
        !Number.isNaN(editedAt) &&
        editedAt !== sentAt
    )
}

export const isMessageRead = (
    message: Message,
    currentUserId: string,
    participants: Participant[]
) => {
    if (message.sender_id !== currentUserId) {
        return false
    }

    const messageTime = new Date(message.sent_at).getTime()
    if (Number.isNaN(messageTime)) {
        return false
    }

    const otherParticipants = participants.filter(
        participant => getParticipantUserId(participant) !== currentUserId
    )
    if (otherParticipants.length === 0) {
        return true
    }

    return otherParticipants.every(participant => {
        if (!participant.last_read_at) {
            return false
        }

        const lastReadTime = new Date(
            participant.last_read_at
        ).getTime()

        return (
            !Number.isNaN(lastReadTime) &&
            lastReadTime >= messageTime
        )
    })
}

export const errorMessage = (error: unknown) => {
    const responseError = error as {
        response?: { data?: { detail?: unknown } | unknown }
    }
    const responseData = responseError.response?.data
    if (
        responseData &&
        typeof responseData === 'object' &&
        'detail' in responseData
    ) {
        return String(responseData.detail)
    }

    return String(responseData || error)
}

