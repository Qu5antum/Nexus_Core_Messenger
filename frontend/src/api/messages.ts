import api from './client'

interface ForwardMessageRequest {
  chat_ids: string[]; 
}

export const getMessages = (chatId: string) =>
    api.get(`/api/chat/${chatId}/messages`).then((r) => r.data)

export const sendMessage = (
    chatId: string,
    text?: string,
    file?: File | null
) => {
    const formData = new FormData()

    if (text?.trim()) {
        formData.append(
            'message',
            text.trim()
        )
    }

    if (file) {
        formData.append(
            'file',
            file
        )
    }

    return api
        .post(
            `/api/chat/${chatId}/message/send`,
            formData
        )
        .then((r) => r.data)
}

export const editMessage = (
    chatId: string,
    messageId: string,
    text: string
) =>
    api
        .put(
            `/api/chat/${chatId}/message/${messageId}/update`,
            { text }
        )
        .then((r) => r.data)

export const deleteMessage = (
    chatId: string,
    messageId: string
) =>
    api
        .delete(
            `/api/chat/${chatId}/message/${messageId}/delete`
        )
        .then((r) => r.data)

export const searchMessages = (chatId: string, messageText: string) =>
    api.get(`/api/chat/${chatId}/message/search_message`, {
            params: { messageText },
        }).then((r) => r.data)

export const forwardMessage = (
    messageId: string,
    data: ForwardMessageRequest
) => 
    api.post(`/api/chat/message/${messageId}/forward_message`, data).then((r) => r.data)
