import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatComposer from './ChatComposer'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import ChatSidebar from './ChatSidebar'
import type { Participant } from './chat.types'
import {
    formatLastSeen,
    getParticipantUserId,
} from './chat.utils'
import { useChatAttachments } from './useChatAttachments'
import { useChatData } from './useChatData'
import { useChatMessages } from './useChatMessages'
import { useChatWebSocket } from './useChatWebSocket'
import { useVoiceRecording } from './useVoiceRecording'

export default function Chat() {
    const { chatId = '' } = useParams()
    const navigate = useNavigate()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [newParticipantPhone, setNewParticipantPhone] = useState('')

    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
        })
    }, [])

    const chatData = useChatData({
        chatId,
        scrollToBottom,
        navigate,
    })
    const attachments = useChatAttachments(chatId, chatData.messages)
    const messageActions = useChatMessages({
        chatId,
        currentUserId: localStorage.getItem('user_id') || '',
        setMessages: chatData.setMessages,
        setError: chatData.setError,
        selectedFile: attachments.selectedFile,
        setSelectedFile: attachments.setSelectedFile,
        scrollToBottom: () => scrollToBottom(),
    })
    const voiceRecording = useVoiceRecording({
        setSelectedFile: attachments.setSelectedFile,
        setError: chatData.setError,
    })

    useChatWebSocket({
        chatId,
        setMessages: chatData.setMessages,
        setOnlineUsers: chatData.setOnlineUsers,
        setParticipants: chatData.setParticipants,
        scrollToBottom: () => scrollToBottom(),
    })

    const currentUserId = localStorage.getItem('user_id') || ''
    const currentUsername = localStorage.getItem('username') || ''
    const isGroupChat = chatData.chat?.is_group === true
    const isOwner =
        isGroupChat && chatData.chat?.owner_id === currentUserId

    const privateParticipant = !isGroupChat
        ? chatData.participants.find(
              participant =>
                  getParticipantUserId(participant) !== currentUserId
          )
        : null
    const privateUser = privateParticipant?.user
    const privateUserId =
        privateUser?.id || privateParticipant?.user_id || ''
    const privateUserName =
        privateUser?.username ||
        privateUser?.phone_number ||
        'Пользователь'
    const privateUserOnline = privateUserId
        ? chatData.onlineUsers.has(privateUserId) ||
          privateUser?.is_online === true
        : false
    const privateUserLastSeen = privateUser?.last_seen_at || null

    const title = isGroupChat
        ? chatData.chat?.title || 'Группа'
        : privateUserName || chatData.chat?.title || 'Чат'

    const handleAddParticipant = async () => {
        const phone = newParticipantPhone.trim()
        if (!phone || !chatId) {
            return
        }
        if (await chatData.addChatParticipant(phone)) {
            setNewParticipantPhone('')
        }
    }

    const handleParticipantClick = (userId: string) => {
        if (userId === currentUserId) {
            navigate('/profile')
            return
        }
        navigate(`/profile/${userId}`)
    }

    const renderChatMessages = (mode: 'list' | 'search') => (
        <ChatMessages
            mode={mode}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            isGroupChat={isGroupChat}
            messages={chatData.messages}
            searchResults={messageActions.searchResults}
            isSearching={messageActions.isSearching}
            loading={chatData.loading}
            participants={chatData.participants}
            messagesEndRef={messagesEndRef}
            attachmentUrls={attachments.attachmentUrls}
            editingMessageId={messageActions.editingMessageId}
            editingText={messageActions.editingText}
            editingLoading={messageActions.editingLoading}
            deletingMessageId={messageActions.deletingMessageId}
            onEditingTextChange={messageActions.setEditingText}
            onSaveEdit={() => void messageActions.handleSaveEdit()}
            onCancelEdit={messageActions.handleCancelEdit}
            onStartEdit={messageActions.handleStartEdit}
            onDeleteMessage={id =>
                void messageActions.handleDeleteMessage(id)
            }
        />
    )

    return (
        <div className="chat-page">
            <ChatHeader
                title={title}
                isGroupChat={isGroupChat}
                privateUserId={privateUserId}
                privateUserOnline={privateUserOnline}
                privateUserLastSeen={privateUserLastSeen}
                participantCount={chatData.participants.length}
                searchText={messageActions.searchText}
                searchLoading={messageActions.searchLoading}
                isSearching={messageActions.isSearching}
                onSearchTextChange={messageActions.setSearchText}
                onSearchKeyDown={messageActions.handleSearchKeyDown}
                onSearch={() => void messageActions.handleSearch()}
                onClearSearch={messageActions.handleClearSearch}
                formatLastSeen={formatLastSeen}
            />

            {renderChatMessages('search')}

            <div className="chat-grid">
                <section className="chat-window">
                    {renderChatMessages('list')}
                    <ChatComposer
                        text={messageActions.text}
                        selectedFile={attachments.selectedFile}
                        sending={messageActions.sending}
                        error={chatData.error}
                        isRecording={voiceRecording.isRecording}
                        recordingTime={voiceRecording.recordingTime}
                        imageInputRef={attachments.imageInputRef}
                        videoInputRef={attachments.videoInputRef}
                        fileInputRef={attachments.fileInputRef}
                        onTextChange={messageActions.setText}
                        onKeyDown={messageActions.handleKeyDown}
                        onSend={() =>
                            void messageActions.handleSend()
                        }
                        onFileChange={event => {
                            if (event.target.files?.[0]) {
                                chatData.setError(null)
                            }
                            attachments.handleFileChange(event)
                        }}
                        onRemoveSelectedFile={
                            attachments.handleRemoveSelectedFile
                        }
                        onStartRecording={() =>
                            void voiceRecording.startRecording()
                        }
                        onStopRecording={voiceRecording.stopRecording}
                    />
                </section>

                {isGroupChat && (
                    <ChatSidebar
                        currentUserId={currentUserId}
                        participants={chatData.participants}
                        onlineUsers={chatData.onlineUsers}
                        userAvatarUrls={chatData.userAvatarUrls}
                        isOwner={isOwner}
                        newParticipantPhone={newParticipantPhone}
                        onPhoneChange={setNewParticipantPhone}
                        onAddParticipant={() =>
                            void handleAddParticipant()
                        }
                        onRemoveParticipant={(participant: Participant) =>
                            void chatData.removeChatParticipant(participant)
                        }
                        onLeaveChat={() =>
                            void chatData.leaveCurrentChat()
                        }
                        onParticipantClick={handleParticipantClick}
                    />
                )}
            </div>
        </div>
    )
}
