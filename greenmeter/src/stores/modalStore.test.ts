import { describe, it, expect, beforeEach } from 'vitest';
import { useModalStore } from './modalStore';

describe('modalStore', () => {
  beforeEach(() => {
    useModalStore.setState({ activeModal: null, modalProps: {} });
  });

  it('has correct initial state', () => {
    const state = useModalStore.getState();
    expect(state.activeModal).toBeNull();
    expect(state.modalProps).toEqual({});
  });

  it('openModal sets activeModal', () => {
    useModalStore.getState().openModal('confirm-delete');
    expect(useModalStore.getState().activeModal).toBe('confirm-delete');
  });

  it('openModal sets modalProps', () => {
    useModalStore.getState().openModal('edit-kpi', { kpiId: 'k1', name: 'Scope 1' });
    const state = useModalStore.getState();
    expect(state.activeModal).toBe('edit-kpi');
    expect(state.modalProps).toEqual({ kpiId: 'k1', name: 'Scope 1' });
  });

  it('openModal defaults props to empty object', () => {
    useModalStore.getState().openModal('settings');
    expect(useModalStore.getState().modalProps).toEqual({});
  });

  it('closeModal clears activeModal and props', () => {
    useModalStore.getState().openModal('edit-kpi', { kpiId: 'k1' });
    useModalStore.getState().closeModal();

    const state = useModalStore.getState();
    expect(state.activeModal).toBeNull();
    expect(state.modalProps).toEqual({});
  });

  it('opening a new modal replaces previous modal', () => {
    useModalStore.getState().openModal('modal-a', { foo: 1 });
    useModalStore.getState().openModal('modal-b', { bar: 2 });

    const state = useModalStore.getState();
    expect(state.activeModal).toBe('modal-b');
    expect(state.modalProps).toEqual({ bar: 2 });
  });
});
