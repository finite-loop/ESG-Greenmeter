import { create } from 'zustand';

export type Standard = 'BRSR' | 'ESRS' | 'GRI' | 'IFRS_S2';

interface FilterState {
  activePeriod: string | null;
  selectedStandard: Standard | null;
  selectedDepartment: string | null;
  setActivePeriod: (period: string | null) => void;
  setSelectedStandard: (std: Standard | null) => void;
  setSelectedDepartment: (dept: string | null) => void;
  resetFilters: () => void;
}

const initialState = {
  activePeriod: null,
  selectedStandard: null,
  selectedDepartment: null,
} as const;

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,
  setActivePeriod: (period) => set({ activePeriod: period }),
  setSelectedStandard: (std) => set({ selectedStandard: std }),
  setSelectedDepartment: (dept) => set({ selectedDepartment: dept }),
  resetFilters: () => set({ ...initialState }),
}));
