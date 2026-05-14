'use client';

import { useMutation } from '@tanstack/react-query';

export interface AskAiResponse {
  answer: string;
  dataSources: string[];
  disclaimer: string;
}

interface AskAiRequest {
  question: string;
  context?: 'analytics' | 'industry';
}

interface AskAiApiResponse {
  data: AskAiResponse;
}

async function postAskAi(body: AskAiRequest): Promise<AskAiApiResponse> {
  const res = await fetch('/api/ask-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody?.error?.message ?? `Request failed with status ${res.status}`;
    const code = errorBody?.error?.code ?? '';
    const err = new Error(message);
    (err as Error & { code?: string }).code = code;
    throw err;
  }
  return res.json();
}

export function useAskAi() {
  return useMutation<AskAiApiResponse, Error & { code?: string }, AskAiRequest>({
    mutationFn: postAskAi,
  });
}
