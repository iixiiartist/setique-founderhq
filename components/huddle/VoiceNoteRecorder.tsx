// components/huddle/VoiceNoteRecorder.tsx
// Voice note recorder with Whisper transcription

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, Send, X, FileAudio } from 'lucide-react';
import { transcribe, isValidAudioFormat, estimateTranscriptionTime } from '../../services/audioService';

interface VoiceNoteRecorderProps {
  onTranscription: (text: string) => void;
  onAudioReady?: (audioBlob: Blob, transcription: string) => void;
  disabled?: boolean;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'ready';

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onTranscription,
  onAudioReady,
  disabled = false,
  className = '',
}) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscription('');
      setAudioBlob(null);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm format (best browser support)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Create blob from chunks
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Start transcription
        await processTranscription(blob);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setState('recording');
      setDuration(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Recording error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError('Failed to start recording: ' + err.message);
      }
      setState('idle');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  }, []);

  // Process transcription with Whisper
  const processTranscription = async (blob: Blob) => {
    try {
      console.log(`[VoiceNote] Transcribing ${(blob.size / 1024).toFixed(1)}KB audio`);
      
      // Create a File object from the blob
      const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' });
      
      const result = await transcribe(file, {
        language: 'en', // Can be made dynamic
        responseFormat: 'verbose_json',
      });

      console.log(`[VoiceNote] Transcription completed in ${result.latencyMs}ms`);
      setTranscription(result.text);
      setState('ready');
      
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError('Transcription failed: ' + err.message);
      setState('idle');
    }
  };

  // Send the transcription
  const handleSend = useCallback(() => {
    if (transcription.trim()) {
      onTranscription(transcription);
      
      if (onAudioReady && audioBlob) {
        onAudioReady(audioBlob, transcription);
      }
      
      // Reset state
      setTranscription('');
      setAudioBlob(null);
      setDuration(0);
      setState('idle');
    }
  }, [transcription, audioBlob, onTranscription, onAudioReady]);

  // Cancel and reset
  const handleCancel = useCallback(() => {
    if (state === 'recording') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
    
    setTranscription('');
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setState('idle');
  }, [state]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Error display */}
      {error && (
        <div className="text-red-500 text-xs mr-2 max-w-[200px] truncate" title={error}>
          {error}
        </div>
      )}

      {/* Idle state - show mic button */}
      {state === 'idle' && (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Record voice note"
        >
          <Mic className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      )}

      {/* Recording state */}
      {state === 'recording' && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 
          px-3 py-1.5 rounded-full animate-pulse">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600 dark:text-red-400 font-medium">
            {formatDuration(duration)}
          </span>
          <button
            onClick={stopRecording}
            className="p-1 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            title="Stop recording"
          >
            <Square className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Processing state */}
      {state === 'processing' && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 
          px-3 py-1.5 rounded-full">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-600 dark:text-blue-400">
            Transcribing...
          </span>
        </div>
      )}

      {/* Ready state - show transcription preview and send */}
      {state === 'ready' && transcription && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 
          px-3 py-1.5 rounded-lg max-w-[400px]">
          <FileAudio className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1" 
            title={transcription}>
            {transcription.slice(0, 50)}{transcription.length > 50 ? '...' : ''}
          </span>
          <button
            onClick={handleSend}
            className="p-1 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            title="Send transcription"
          >
            <Send className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4 text-green-600" />
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceNoteRecorder;
