import type { ChangeEvent, RefObject } from 'react'
import { formatFileSize, formatRecordingTime } from './chat.utils'

type ChatComposerProps = {
    text: string
    selectedFile: File | null
    sending: boolean
    error: string | null
    isRecording: boolean
    recordingTime: number
    imageInputRef: RefObject<HTMLInputElement | null>
    videoInputRef: RefObject<HTMLInputElement | null>
    fileInputRef: RefObject<HTMLInputElement | null>
    onTextChange: (value: string) => void
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
    onSend: () => void
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
    onRemoveSelectedFile: () => void
    onStartRecording: () => void
    onStopRecording: () => void
}

export default function ChatComposer({
    text,
    selectedFile,
    sending,
    error,
    isRecording,
    recordingTime,
    imageInputRef,
    videoInputRef,
    fileInputRef,
    onTextChange,
    onKeyDown,
    onSend,
    onFileChange,
    onRemoveSelectedFile,
    onStartRecording,
    onStopRecording,
}: ChatComposerProps) {
    return (
        <>
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onFileChange}
            />
            <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={onFileChange}
            />
            <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={onFileChange}
            />

            {selectedFile && (
                <div className="selected-file">
                    <div className="selected-file-info">
                        <span className="selected-file-name">
                            {selectedFile.name}
                        </span>
                        <span className="selected-file-size">
                            {formatFileSize(selectedFile.size)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onRemoveSelectedFile}
                        className="selected-file-remove"
                    >
                        ×
                    </button>
                </div>
            )}

            {isRecording && (
                <div className="recording-panel">
                    <span>
                        Запись: {formatRecordingTime(recordingTime)}
                    </span>
                    <button type="button" onClick={onStopRecording}>
                        Остановить
                    </button>
                </div>
            )}

            <div className="chat-input-row">
                <div className="attachment-buttons">
                    <button
                        type="button"
                        className="attachment-button"
                        onClick={() => imageInputRef.current?.click()}
                    >
                        Фото
                    </button>
                    <button
                        type="button"
                        className="attachment-button"
                        onClick={() => videoInputRef.current?.click()}
                    >
                        Видео
                    </button>
                    <button
                        type="button"
                        className="attachment-button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Файл
                    </button>
                    {!isRecording ? (
                        <button
                            type="button"
                            className="attachment-button"
                            onClick={onStartRecording}
                        >
                            Аудио
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="attachment-button"
                            onClick={onStopRecording}
                        >
                            Стоп
                        </button>
                    )}
                </div>

                <input
                    className="message-input"
                    placeholder="Напишите сообщение..."
                    value={text}
                    onChange={event => onTextChange(event.target.value)}
                    onKeyDown={onKeyDown}
                />
                <button
                    type="button"
                    className="send-button"
                    onClick={onSend}
                    disabled={sending || (!text.trim() && !selectedFile)}
                >
                    {sending ? '...' : 'Отправить'}
                </button>
            </div>
            {error && <div className="chat-error">{error}</div>}
        </>
    )
}
