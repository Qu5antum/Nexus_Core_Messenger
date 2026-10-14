import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
    deleteMessage,
    editMessage,
    searchMessages,
    sendMessage,
} from '../../api/messages'
import type { Message } from './chat.types'
import { errorMessage } from './chat.utils'

type UseChatMessagesOptions = {
    chatId: string
    currentUserId: string
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    setError: (error: string | null) => void
    selectedFile: File | null
    setSelectedFile: (file: File | null) => void
    scrollToBottom: () => void
}

export function useChatMessages({
    chatId,
    currentUserId,
    setMessages,
    setError,
    selectedFile,
    setSelectedFile,
    scrollToBottom,
}: UseChatMessagesOptions) {
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState<
        string | null
    >(null)
    const [editingText, setEditingText] = useState('')
    const [editingLoading, setEditingLoading] = useState(false)
    const [deletingMessageId, setDeletingMessageId] = useState<
        string | null
    >(null)
    const [searchText, setSearchText] = useState('')
    const [searchResults, setSearchResults] = useState<Message[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [isSearching, setIsSearching] = useState(false)

    const handleSend = async () => {
        if (!chatId || (!text.trim() && !selectedFile)) {
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
                fileToSend || undefined
            )
            setMessages(previous => {
                if (previous.some(message => message.id === data.id)) {
                    return previous
                }
                return [...previous, data]
            })
            window.setTimeout(scrollToBottom, 50)
        } catch (cause) {
            console.error(cause)
            setError(errorMessage(cause))
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void handleSend()
        }
    }

    const handleStartEdit = (message: Message) => {
        if (message.sender_id !== currentUserId || !message.text) {
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
            setError('Сообщение не может быть пустым')
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
            setMessages(previous =>
                previous.map(message =>
                    message.id === editingMessageId
                        ? updatedMessage
                        : message
                )
            )
            setSearchResults(previous =>
                previous.map(message =>
                    message.id === editingMessageId
                        ? updatedMessage
                        : message
                )
            )
            handleCancelEdit()
        } catch (cause) {
            console.error(cause)
            setError(errorMessage(cause))
        } finally {
            setEditingLoading(false)
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        if (
            !chatId ||
            !window.confirm('Удалить это сообщение?')
        ) {
            return
        }
        try {
            setDeletingMessageId(messageId)
            setError(null)
            await deleteMessage(chatId, messageId)
            setMessages(previous =>
                previous.filter(message => message.id !== messageId)
            )
            setSearchResults(previous =>
                previous.filter(message => message.id !== messageId)
            )
        } catch (cause) {
            console.error(cause)
            setError(errorMessage(cause))
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
            setSearchResults(await searchMessages(chatId, query))
        } catch (cause) {
            console.error(cause)
            setError(errorMessage(cause))
        } finally {
            setSearchLoading(false)
        }
    }

    const handleSearchKeyDown = (
        event: KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            void handleSearch()
        }
    }

    const handleClearSearch = () => {
        setSearchText('')
        setSearchResults([])
        setIsSearching(false)
    }

    return {
        text,
        setText,
        sending,
        editingMessageId,
        editingText,
        setEditingText,
        editingLoading,
        deletingMessageId,
        searchText,
        setSearchText,
        searchResults,
        searchLoading,
        isSearching,
        setIsSearching,
        handleSend,
        handleKeyDown,
        handleStartEdit,
        handleCancelEdit,
        handleSaveEdit,
        handleDeleteMessage,
        handleSearch,
        handleSearchKeyDown,
        handleClearSearch,
    }
}
