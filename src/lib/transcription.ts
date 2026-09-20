import { supabase } from './supabase';

const transcriptionFunction = import.meta.env.VITE_SUPABASE_TRANSCRIPTION_FUNCTION?.trim();

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!transcriptionFunction) {
    throw new Error('Voice transcription is not configured yet. Your recording is still available, or you can type the description manually.');
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, `sakshya-recording.${audioBlob.type.includes('mp4') ? 'm4a' : 'webm'}`);

  let response: Awaited<ReturnType<typeof supabase.functions.invoke<{ transcript?: unknown; text?: unknown }>>>;
  try {
    response = await Promise.race([
      supabase.functions.invoke<{ transcript?: unknown; text?: unknown }>(transcriptionFunction, { body: formData }),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Transcription timed out. Your recording has not been deleted.')), 60_000);
      }),
    ]);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Transcription failed. Your recording has not been deleted.');
  }

  const { data, error } = response;

  if (error) {
    throw new Error(error.message || 'Transcription failed. Your recording has not been deleted.');
  }

  const transcript = typeof data?.transcript === 'string'
    ? data.transcript
    : typeof data?.text === 'string'
      ? data.text
      : '';

  if (!transcript.trim()) {
    throw new Error('Transcription returned no text. You can retry or type the description manually.');
  }

  return transcript.trim();
}