// src/hooks/useAIStream.ts
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StreamMessage {
    role: string;
    content: string;
}

export interface StreamParams {
    project_id: string;
    section_key: string;
    protocol: 'APA' | 'RIP' | 'RIP_FAZA_0' | 'WA';
    messages: StreamMessage[];
    project_context: Record<string, unknown>;
    onFirstChunk?: () => void;
}

interface SSEEvent {
    type: 'delta' | 'done' | 'error';
    text?: string;
    content?: string;
    message?: string;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const cleanStreamContent = (text: string) =>
    text
        .replace(/```(?:html)?\n?/gi, '')
        .replace(/```/g, '')
        .replace(/\[FIX-[0-9]{2}\]/g, '')
        .replace(/<\/??pre>/gi, '')
        .trim();

export function useAIStream() {
    const [content, setContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const cancel = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsStreaming(false);
    }, []);

    const reset = useCallback(() => {
        cancel();
        setContent('');
        setError(null);
    }, [cancel]);

    const streamSection = useCallback(async (params: StreamParams): Promise<string> => {
        cancel();
        setError(null);
        setIsStreaming(true);
        let fullContent = '';

        const backoffDelays = [1000, 2000, 4000];
        for (let attempt = 0; attempt < backoffDelays.length; attempt += 1) {
            let attemptContent = fullContent;
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = window.setTimeout(() => {
                if (!controller.signal.aborted) {
                    controller.abort();
                    console.warn(`[useAIStream] Timeout after 120s on attempt ${attempt + 1}`);
                }
            }, 120000);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Aktivna sesija nije pronađena. Molimo prijavite se ponovo.');

                console.log('DEBUG: useAIStream session found', {
                    hasSession: !!session,
                    hasAccessToken: !!session.access_token,
                    userId: session.user?.id,
                });

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const functionUrl = `${supabaseUrl}/functions/v1/ai-generate-section`;

                console.log('Pozivam Edge Funkciju sa protokolom:', params.protocol, 'url:', functionUrl);

                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    },
                    body: JSON.stringify({
                        project_id: params.project_id,
                        section_key: params.section_key,
                        protocol: params.protocol,
                        messages: params.messages,
                        project_context: params.project_context,
                    }),
                    signal: controller.signal,
                });

                console.log('DEBUG: ai-generate-section fetch response status', response.status, response.statusText);

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                    throw new Error(errData.error || 'Greška pri komunikaciji sa AI servisom.');
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('Stream nije dostupan.');

                const decoder = new TextDecoder();
                // use `attemptContent` declared in outer scope

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;

                        try {
                            const event = JSON.parse(line.slice(6)) as SSEEvent;
                            if (event.type === 'delta' && typeof event.text === 'string') {
                                if (attemptContent.length === 0 && params.onFirstChunk) {
                                    params.onFirstChunk();
                                }
                                const cleanedDelta = cleanStreamContent(event.text);
                                attemptContent += cleanedDelta;
                                setContent(attemptContent);
                            } else if (event.type === 'done') {
                                fullContent = cleanStreamContent(event.content ?? attemptContent);
                                setContent(fullContent);
                            } else if (event.type === 'error') {
                                throw new Error(event.message || 'AI stream error');
                            }
                        } catch {
                            // Ignore malformed chunk and continue streaming
                        }
                    }
                }

                const cleanedAttempt = cleanStreamContent(attemptContent);
                setContent(cleanedAttempt);
                setError(null);
                return cleanedAttempt;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                const isAbort = controller.signal.aborted;

                if (isAbort && message.includes('Abort')) {
                    if (attempt === backoffDelays.length - 1) {
                        setError('Streaming je prekinut. Sačuvani su dosadašnji podaci.');
                    }
                    return fullContent;
                }

                const shouldRetry = attempt < backoffDelays.length - 1 && (
                    message.includes('network') ||
                    message.includes('Failed to fetch') ||
                    message.includes('timeout') ||
                    message.includes('ECONNRESET') ||
                    message.includes('Abort')
                );

                fullContent = attemptContent;
                setContent(fullContent);
                setError(`Pokušaj ${attempt + 1} nije uspio: ${message}`);

                if (!shouldRetry) {
                    console.error('[useAIStream Error]:', err);
                    setIsStreaming(false);
                    abortControllerRef.current = null;
                    return fullContent;
                }

                await sleep(backoffDelays[attempt]);
            } finally {
                window.clearTimeout(timeoutId);
            }
        }

        setIsStreaming(false);
        abortControllerRef.current = null;
        return fullContent;
    }, [cancel]);

    return {
        content,
        isStreaming,
        error,
        streamSection,
        cancel,
        reset,
    };
}
