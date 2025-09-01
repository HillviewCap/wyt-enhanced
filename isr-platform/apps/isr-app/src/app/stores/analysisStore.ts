import { create } from 'zustand';
import { AnalysisResult } from '../services/ApiService';

export interface FilterSettings {
  minPersistenceScore: number;
}

export interface AnalysisState {
  analysisResults: AnalysisResult[];
  filteredResults: AnalysisResult[];
  filterSettings: FilterSettings;
  isLoading: boolean;
  error: string | null;
  selectedDeviceId: string | null;
  
  setAnalysisResults: (results: AnalysisResult[]) => void;
  setFilterSettings: (settings: Partial<FilterSettings>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedDevice: (deviceId: string | null) => void;
  applyFilters: () => void;
  reset: () => void;
}

const initialFilterSettings: FilterSettings = {
  minPersistenceScore: 0.0,
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analysisResults: [],
  filteredResults: [],
  filterSettings: initialFilterSettings,
  isLoading: false,
  error: null,
  selectedDeviceId: null,

  setAnalysisResults: (results) => {
    set({ 
      analysisResults: results,
      error: null 
    });
    get().applyFilters();
  },

  setFilterSettings: (settings) => {
    set((state) => ({
      filterSettings: { ...state.filterSettings, ...settings }
    }));
    get().applyFilters();
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  setSelectedDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  applyFilters: () => {
    const { analysisResults, filterSettings } = get();
    const filteredResults = analysisResults.filter(
      (result) => result.persistenceScore >= filterSettings.minPersistenceScore
    );
    set({ filteredResults });
  },

  reset: () => set({
    analysisResults: [],
    filteredResults: [],
    filterSettings: initialFilterSettings,
    isLoading: false,
    error: null,
    selectedDeviceId: null,
  }),
}));