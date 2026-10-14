import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { getAttachment } from '../../api/attachments'
import type { Message } from './chat.types'

export function useChatAttachments(chatId: string, messages: Message[]) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [attachmentUrls, setAttachmentUrls] = useState<
        Record<string, string>
    >({})
    const imageInputRef = useRef<HTMLInputElement>(null)
    const videoInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!chatId || messages.length === 0) {
            return
        }

        let cancelled = false
        const loadAttachments = async () => {
            const uniqueAttachments = Array.from(
                new Map(
                    messages
                        .flatMap(message => message.attachments || [])
                        .map(attachment => [attachment.id, attachment])
                ).values()
            )
            const attachmentsToLoad = uniqueAttachments.filter(
                attachment => !attachmentUrls[attachment.id]
            )
            if (attachmentsToLoad.length === 0) {
                return
            }

            const results = await Promise.all(
                attachmentsToLoad.map(async attachment => {
                    try {
                        return {
                            id: attachment.id,
                            url: await getAttachment(chatId, attachment.id),
                        }
                    } catch (cause) {
                        console.error('Attachment load error:', cause)
                        return null
                    }
                })
            )

            if (cancelled) {
                return
            }

            const loadedUrls = results.filter(
                (result): result is { id: string; url: string } =>
                    result !== null && typeof result.url === 'string'
            )
            if (loadedUrls.length > 0) {
                setAttachmentUrls(previous => ({
                    ...previous,
                    ...Object.fromEntries(
                        loadedUrls.map(({ id, url }) => [id, url])
                    ),
                }))
            }
        }

        void loadAttachments()
        return () => {
            cancelled = true
        }
    }, [messages, chatId, attachmentUrls])

    useEffect(
        () => () => {
            Object.values(attachmentUrls).forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url)
                }
            })
        },
        [attachmentUrls]
    )

    const handleSelectFile = (file?: File) => {
        if (file) {
            setSelectedFile(file)
        }
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        handleSelectFile(event.target.files?.[0])
        event.target.value = ''
    }

    return {
        selectedFile,
        setSelectedFile,
        attachmentUrls,
        imageInputRef,
        videoInputRef,
        fileInputRef,
        handleFileChange,
        handleRemoveSelectedFile: () => setSelectedFile(null),
    }
}

