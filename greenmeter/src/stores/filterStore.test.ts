import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from './filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useFilterStore.setState({
      activePeriod: null,
      selectedStandard: null,
      selectedDepartment: null,
    });
  });

  it('has correct initial state', () => {
    const state = useFilterStore.getState();
    expect(state.activePeriod).toBeNull();
    expect(state.selectedStandard).toBeNull();
    expect(state.selectedDepartment).toBeNull();
  });

  it('setActivePeriod updates activePeriod', () => {
    useFilterStore.getState().setActivePeriod('2024-Q1');
    expect(useFilterStore.getState().activePeriod).toBe('2024-Q1');
  });

  it('setActivePeriod accepts null', () => {
    useFilterStore.getState().setActivePeriod('2024-Q1');
    useFilterStore.getState().setActivePeriod(null);
    expect(useFilterStore.getState().activePeriod).toBeNull();
  });

  it('setSelectedStandard updates selectedStandard', () => {
    useFilterStore.getState().setSelectedStandard('BRSR');
    expect(useFilterStore.getState().selectedStandard).toBe('BRSR');
  });

  it('setSelectedStandard accepts all valid standards', () => {
    const standards = ['BRSR', 'ESRS', 'GRI', 'IFRS_S2'] as const;
    for (const std of standards) {
      useFilterStore.getState().setSelectedStandard(std);
      expect(useFilterStore.getState().selectedStandard).toBe(std);
    }
  });

  it('setSelectedDepartment updates selectedDepartment', () => {
    useFilterStore.getState().setSelectedDepartment('Engineering');
    expect(useFilterStore.getState().selectedDepartment).toBe('Engineering');
  });

  it('resetFilters clears all filters', () => {
    useFilterStore.getState().setActivePeriod('2024-Q1');
    useFilterStore.getState().setSelectedStandard('ESRS');
    useFilterStore.getState().setSelectedDepartment('HR');

    useFilterStore.getState().resetFilters();

    const state = useFilterStore.getState();
    expect(state.activePeriod).toBeNull();
    expect(state.selectedStandard).toBeNull();
    expect(state.selectedDepartment).toBeNull();
  });

  it('setting one filter does not affect others', () => {
    useFilterStore.getState().setActivePeriod('2024-Q1');
    useFilterStore.getState().setSelectedStandard('GRI');
    useFilterStore.getState().setSelectedDepartment('Finance');

    useFilterStore.getState().setActivePeriod('2024-Q2');

    const state = useFilterStore.getState();
    expect(state.activePeriod).toBe('2024-Q2');
    expect(state.selectedStandard).toBe('GRI');
    expect(state.selectedDepartment).toBe('Finance');
  });
});
