/**
 * Audio Service - Speech-to-Text using Groq Whisper
 * 
 * Leverages Groq's ultra-fast audio model:
 * - Whisper Large V3 Turbo: Real-time transcription (250 tps)
 * 
 * Features:
 * - Audio transcription from file or blob
 * - Real-time streaming transcription (coming soon)
 * - Language detection
 * - Word-level timestamps
 */

import { supabase } from '../lib/supabase';

// Supported audio formats
export type AudioFormat = 'mp3' | 'mp4' | 'mpeg' | 'mpga' | 'webm' | 'wav' | 'ogg' | 'flac';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  model: string;
  latencyMs: number;
}

export interface TranscriptionOptions {
  language?: string; // ISO-639-1 code (e.g., 'en', 'es', 'fr')
  prompt?: string; // Context hint for better accuracy
  responseFormat?: 'json' | 'text' | 'verbose_json';
  timestampGranularity?: 'word' | 'segment';
}

/**
 * Transcribe audio file to text using Whisper
 */
export async function transcribe(
  audioFile: File | Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  
  // Validate file size (max 25MB for Whisper)
  const maxSize = 25 * 1024 * 1024;
  if (audioFile.size > maxSize) {
    throw new Error(`Audio file too large. Maximum size is 25MB, got ${(audioFile.size / 1024 / 1024).toFixed(1)}MB`);
  }

  // Create form data for multipart upload
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-large-v3-turbo');
  
  if (options.language) {
    formData.append('language', options.language);
  }
  if (options.prompt) {
    formData.append('prompt', options.prompt);
  }
  if (options.responseFormat) {
    formData.append('response_format', options.responseFormat);
  }
  if (options.timestampGranularity) {
    formData.append('timestamp_granularities', options.timestampGranularity);
  }

  // Call transcription edge function
  const { data, error } = await supabase.functions.invoke('audio-transcribe', {
    body: formData,
  });

  if (error) {
    throw new Error(`Transcription failed: ${error.message}`);
  }

  return {
    text: data.text || '',
    language: data.language,
    duration: data.duration,
    words: data.words,
    model: 'whisper-large-v3-turbo',
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Transcribe audio from URL
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  
  // Fetch the audio file
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const result = await transcribe(blob, options);
  
  // Adjust latency to include fetch time
  result.latencyMs = Date.now() - startTime;
  return result;
}

/**
 * Get supported audio formats for transcription
 */
export function getSupportedFormats(): AudioFormat[] {
  return ['mp3', 'mp4', 'mpeg', 'mpga', 'webm', 'wav', 'ogg', 'flac'];
}

/**
 * Validate audio file format
 */
export function isValidAudioFormat(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.split('/')[1];
  
  const validFormats = getSupportedFormats();
  return validFormats.includes(extension as AudioFormat) || 
         validFormats.includes(mimeType as AudioFormat);
}

/**
 * Estimate transcription time based on file size
 * Whisper processes roughly 30s of audio per second
 */
export function estimateTranscriptionTime(fileSizeBytes: number): number {
  // Average audio: ~1MB per 2 minutes of speech (64kbps)
  const estimatedMinutes = fileSizeBytes / (1024 * 1024) * 2;
  const estimatedSeconds = estimatedMinutes * 60;
  
  // Whisper v3 Turbo: ~30x realtime speed
  const processingTime = estimatedSeconds / 30;
  
  // Add overhead for network latency
  return Math.ceil(processingTime + 1);
}
