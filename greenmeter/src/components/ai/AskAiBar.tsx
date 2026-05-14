'use client';

import { useState } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useAskAi, type AskAiResponse } from '@/hooks/useAskAi';

interface AskAiBarProps {
  sampleQueries: string[];
  context?: 'analytics' | 'industry';
  placeholder?: string;
}

export function AskAiBar({ sampleQueries, context, placeholder }: AskAiBarProps) {
  const { askAiEnabled } = useFeatureFlags();
  const { mutate, isPending, data, error, reset } = useAskAi();
  const [question, setQuestion] = useState('');

  // Don't render if AI is not available
  if (!askAiEnabled) return null;

  const handleSubmit = (q?: string) => {
    const text = q ?? question;
    if (!text.trim() || text.trim().length < 5) return;
    reset();
    mutate({ question: text.trim(), context });
  };

  const response: AskAiResponse | undefined = data?.data;
  const errorMessage = error
    ? (error as Error & { code?: string }).code === 'RATE_LIMITED'
      ? 'Too many AI requests. Please wait a moment and try again.'
      : error.message
    : null;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Input bar */}
      <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, background: 'var(--t700)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M13 8A5 5 0 113 8a5 5 0 0110 0zM8 5v3l2 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--tx1)' }}
            placeholder={placeholder ?? 'Ask anything about your ESG data...'}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            disabled={isPending}
          />
          <button
            className="btn-primary"
            style={{ padding: '5px 12px', fontSize: 11 }}
            onClick={() => handleSubmit()}
            disabled={isPending || question.trim().length < 5}
          >
            {isPending ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {sampleQueries.map(q => (
            <span
              key={q}
              style={{
                fontSize: 10,
                padding: '3px 9px',
                background: 'var(--bg)',
                border: '.5px solid var(--bdr)',
                borderRadius: 20,
                cursor: isPending ? 'not-allowed' : 'pointer',
                color: 'var(--tx2)',
                transition: 'all .12s',
                opacity: isPending ? 0.5 : 1,
              }}
              onClick={() => {
                if (!isPending) {
                  setQuestion(q);
                  handleSubmit(q);
                }
              }}
              onMouseEnter={e => {
                if (!isPending) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--t50)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--t700)';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg)';
                (e.currentTarget as HTMLElement).style.color = 'var(--tx2)';
              }}
            >
              {q}
            </span>
          ))}
        </div>
      </div>

      {/* Response panel */}
      {(response || errorMessage || isPending) && (
        <div style={{
          background: 'var(--surf)',
          border: '.5px solid var(--bdr)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '12px 14px',
        }}>
          {isPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <div style={{
                width: 14,
                height: 14,
                border: '2px solid var(--t200)',
                borderTopColor: 'var(--t700)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Analysing your data...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {errorMessage && (
            <div style={{
              padding: '8px 10px',
              background: 'var(--redbg)',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--red)',
              lineHeight: 1.5,
            }}>
              {errorMessage}
            </div>
          )}

          {response && !isPending && (
            <div>
              <div style={{
                fontSize: 12,
                color: 'var(--tx1)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {response.answer}
              </div>

              {response.dataSources.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                  <span style={{ fontSize: 9, color: 'var(--tx3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Sources:</span>
                  {response.dataSources.map(src => (
                    <span
                      key={src}
                      style={{
                        fontSize: 9,
                        padding: '1px 6px',
                        background: 'var(--t50)',
                        color: 'var(--t700)',
                        borderRadius: 4,
                        border: '.5px solid var(--t200)',
                        fontWeight: 500,
                      }}
                    >
                      {src}
                    </span>
                  ))}
                </div>
              )}

              <div style={{
                marginTop: 8,
                padding: '6px 10px',
                background: 'var(--bg)',
                borderRadius: 5,
                fontSize: 9,
                color: 'var(--tx3)',
                lineHeight: 1.5,
              }}>
                {response.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
