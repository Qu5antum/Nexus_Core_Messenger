import { useEffect, useRef, useState } from 'react'

type UseVoiceRecordingOptions = {
    setSelectedFile: (file: File | null) => void
    setError: (error: string | null) => void
}

export function useVoiceRecording({
    setSelectedFile,
    setError,
}: UseVoiceRecordingOptions) {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordingChunksRef = useRef<Blob[]>([])
    const recordingTimerRef = useRef<number | null>(null)

    const startRecording = async () => {
        try {
            setError(null)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            const recorder = new MediaRecorder(stream)
            recordingChunksRef.current = []

            recorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    recordingChunksRef.current.push(event.data)
                }
            }

            recorder.onstop = () => {
                const audioBlob = new Blob(recordingChunksRef.current, {
                    type: recorder.mimeType || 'audio/webm',
                })
                const extension = audioBlob.type.includes('ogg')
                    ? 'ogg'
                    : 'webm'
                const audioFile = new File(
                    [audioBlob],
                    `voice-${Date.now()}.${extension}`,
                    { type: audioBlob.type }
                )
                setSelectedFile(audioFile)
                stream.getTracks().forEach(track => track.stop())
                setIsRecording(false)
                setRecordingTime(0)
                mediaRecorderRef.current = null
            }

            recorder.start()
            mediaRecorderRef.current = recorder
            setIsRecording(true)
            setRecordingTime(0)
            recordingTimerRef.current = window.setInterval(
                () => setRecordingTime(previous => previous + 1),
                1000
            )
        } catch (cause) {
            console.error(cause)
            setError('Не удалось получить доступ к микрофону')
        }
    }

    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
        ) {
            mediaRecorderRef.current.stop()
        }
        if (recordingTimerRef.current !== null) {
            window.clearInterval(recordingTimerRef.current)
            recordingTimerRef.current = null
        }
    }

    useEffect(
        () => () => {
            if (recordingTimerRef.current !== null) {
                window.clearInterval(recordingTimerRef.current)
            }
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== 'inactive'
            ) {
                mediaRecorderRef.current.stop()
            }
        },
        []
    )

    return {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
    }
}

