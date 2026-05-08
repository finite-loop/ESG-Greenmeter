import { describe, it, expect, beforeEach } from 'vitest';
import { useSidebarStore } from './sidebarStore';

describe('sidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false });
  });

  it('has correct initial state', () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('toggleCollapsed flips state from false to true', () => {
    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('toggleCollapsed flips state from true to false', () => {
    useSidebarStore.setState({ collapsed: true });
    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('double toggle returns to original state', () => {
    useSidebarStore.getState().toggleCollapsed();
    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('setCollapsed sets specific value', () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().collapsed).toBe(true);

    useSidebarStore.getState().setCollapsed(false);
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });
});
