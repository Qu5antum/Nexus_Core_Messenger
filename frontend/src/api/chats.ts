import api from './client'

export type ChatUpdate = {
    title?: string
    description?: string
    owner_id?: string
    file?: File | null
}

type CreateGroupChatData = {
    title?: string
    description?: string
    file?: File | null
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
    user?: ParticipantUser | null
}

export const createGroupChat = (
    data: CreateGroupChatData
) => {
    const formData = new FormData()

    if (data.title) {
        formData.append(
            'title',
            data.title
        )
    }

    if (data.description) {
        formData.append(
            'description',
            data.description
        )
    }

    if (data.file) {
        formData.append(
            'file',
            data.file
        )
    }

    return api
        .post(
            '/api/chat/group_chat/create',
            formData
        )
        .then(
            (r) => r.data
        )
}

export const updateChat = (
    chatId: string,
    data: ChatUpdate
) => {
    const formData = new FormData()

    if (data.title !== undefined) {
        formData.append(
            'title',
            data.title
        )
    }

    if (data.description !== undefined) {
        formData.append(
            'description',
            data.description
        )
    }

    if (data.owner_id !== undefined) {
        formData.append(
            'owner_id',
            data.owner_id
        )
    }

    if (data.file) {
        formData.append(
            'file',
            data.file
        )
    }

    return api
        .put(
            `/api/chat/${chatId}/chat_update`,
            formData
        )
        .then(
            (r) => r.data
        )
}

export const getChatAvatar = async (
    chatId: string
): Promise<string> => {
    const response = await api.get(
        `/api/chat/${chatId}/avatar`,
        {
            responseType: 'blob',
        }
    )

    return URL.createObjectURL(
        response.data
    )
}

export const getChats = () => api.get('/api/chat/all').then(r => r.data)

export const createPrivateChat = (phone_number: string) =>
    api.post('/api/chat/private_chat/create', null, { params: { phone_number } }).then(r => r.data)

export const getChat = (chatId: string) => api.get(`/api/chat/${chatId}`).then(r => r.data)

export const deleteChat = (chatId: string) => 
    api.delete(`/api/chat/${chatId}/delete`).then((r) => r.data)

export const addParticipant = (chatId: string, phoneNumber: string) =>
    api.post(`/api/chat/${chatId}/add_participant`, null, { params: { phone_number: phoneNumber } }).then(r => r.data)

export const getParticipants = async (
    chatId: string
): Promise<Participant[]> => {
    const response = await api.get<Participant[]>(
        `/api/chat/${chatId}/participants`
    )

    return response.data
}

export const removeParticipant = (chatId: string, userId: string) =>
    api.delete(`/api/chat/${chatId}/participant/${userId}/remove_participant`).then(r => r.data)

export const leaveChat = (chatId: string) =>
    api.delete(`/api/chat/${chatId}/leave`).then(r => r.data)

export const getUsersCommonChats = (userId: string) =>
    api.get(`/api/user/${userId}/chat/all`).then(r => r.data)

export const markChatAsRead = (chatId: string) =>
    api.put(`/api/chat/${chatId}/read`).then(r => r.data)

export const getUnreadMessagesCount = (chatId: string) =>
    api.get(`/api/chat/${chatId}/unread_messages`).then(r => r.data)