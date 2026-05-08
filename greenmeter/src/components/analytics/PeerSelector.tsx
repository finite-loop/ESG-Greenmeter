'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePeers } from '@/hooks/usePeers';

interface PeerSelectorProps {
  selectedPeerIds: string[];
  onSelectionChange: (peerIds: string[]) => void;
  sector?: string;
}

/**
 * Multi-select dropdown for choosing peers for comparison.
 * Fetches active peer organisations and allows toggling selection.
 */
export default function PeerSelector({
  selectedPeerIds,
  onSelectionChange,
  sector,
}: PeerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = usePeers({
    active: true,
    sector,
    pageSize: 100,
  });

  const peers = data?.data ?? [];

  const filtered = search
    ? peers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : peers;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focus index when filtered list changes
  useEffect(() => {
    setFocusIndex(-1);
  }, [search, open]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[focusIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIndex]);

  function togglePeer(peerId: string) {
    if (selectedPeerIds.includes(peerId)) {
      onSelectionChange(selectedPeerIds.filter((id) => id !== peerId));
    } else {
      onSelectionChange([...selectedPeerIds, peerId]);
    }
  }

  function selectAll() {
    onSelectionChange(filtered.map((p) => p.peerId));
  }

  function clearAll() {
    onSelectionChange([]);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusIndex((prev) => Math.min(prev + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusIndex >= 0 && focusIndex < filtered.length) {
            togglePeer(filtered[focusIndex].peerId);
          }
          break;
      }
    },
    [open, filtered, focusIndex, selectedPeerIds]
  );

  const selectedCount = selectedPeerIds.length;
  const selectedNames = peers
    .filter((p) => selectedPeerIds.includes(p.peerId))
    .map((p) => p.name);

  const buttonLabel =
    selectedCount === 0
      ? 'Select peers...'
      : selectedCount <= 2
        ? selectedNames.join(', ')
        : `${selectedCount} peers selected`;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="sel"
        style={{
          fontSize: 11,
          padding: '4px 8px',
          minWidth: 200,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {buttonLabel}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          tabIndex={0}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            width: 280,
            maxHeight: 300,
            background: 'var(--surf)',
            border: '.5px solid var(--bdr)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '.5px solid var(--bdr)' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search peers..."
              aria-label="Search peers"
              style={{
                width: '100%',
                border: '.5px solid var(--bdr)',
                borderRadius: 5,
                padding: '4px 8px',
                fontSize: 11,
                outline: 'none',
                background: 'var(--bg)',
                color: 'var(--tx1)',
              }}
            />
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6, padding: '6px 10px', borderBottom: '.5px solid var(--bdr)' }}>
            <button
              type="button"
              onClick={selectAll}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: 'var(--t50)',
                color: 'var(--t700)',
                border: '.5px solid var(--t200)',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: 'var(--bg)',
                color: 'var(--tx2)',
                border: '.5px solid var(--bdr)',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>

          {/* List */}
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
            {isLoading && (
              <div style={{ padding: '12px 10px', fontSize: 11, color: 'var(--tx3)', textAlign: 'center' }}>
                Loading peers...
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div style={{ padding: '12px 10px', fontSize: 11, color: 'var(--tx3)', textAlign: 'center' }}>
                No peers found
              </div>
            )}

            {filtered.map((peer, index) => {
              const isSelected = selectedPeerIds.includes(peer.peerId);
              const isFocused = index === focusIndex;
              return (
                <div
                  key={peer.peerId}
                  onClick={() => togglePeer(peer.peerId)}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: 'var(--tx1)',
                    background: isFocused ? 'var(--bg)' : isSelected ? 'var(--t50)' : 'transparent',
                    outline: isFocused ? '2px solid var(--t500)' : 'none',
                    outlineOffset: -2,
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isFocused) (e.currentTarget as HTMLElement).style.background = 'var(--bg)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isSelected ? 'var(--t50)' : 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `.5px solid ${isSelected ? 'var(--t700)' : 'var(--bdr)'}`,
                      background: isSelected ? 'var(--t700)' : 'var(--surf)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {peer.name}
                  </div>
                  {peer.sector && (
                    <span style={{ fontSize: 9, color: 'var(--tx3)', flexShrink: 0 }}>
                      {peer.sector}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
