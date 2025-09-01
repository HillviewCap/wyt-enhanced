import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import { AnalysisResult } from '../../services/ApiService';

const mockSetFilterSettings = jest.fn();
const mockAnalysisResults: AnalysisResult[] = [
  {
    deviceId: 'device-1',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    persistenceScore: 0.85,
    firstSeen: '2024-01-15T10:00:00Z',
    lastSeen: '2024-01-15T14:00:00Z',
    locationCount: 5,
    timeWindowHours: 4,
    analysisTimestamp: '2024-01-15T14:30:00Z',
    sightings: [],
  },
  {
    deviceId: 'device-2',
    macAddress: '11:22:33:44:55:66',
    persistenceScore: 0.45,
    firstSeen: '2024-01-15T09:00:00Z',
    lastSeen: '2024-01-15T09:30:00Z',
    locationCount: 2,
    timeWindowHours: 0.5,
    analysisTimestamp: '2024-01-15T14:30:00Z',
    sightings: [],
  },
  {
    deviceId: 'device-3',
    macAddress: '77:88:99:AA:BB:CC',
    persistenceScore: 0.15,
    firstSeen: '2024-01-15T08:00:00Z',
    lastSeen: '2024-01-15T08:15:00Z',
    locationCount: 1,
    timeWindowHours: 0.25,
    analysisTimestamp: '2024-01-15T14:30:00Z',
    sightings: [],
  },
];

jest.mock('../../stores/analysisStore', () => ({
  useAnalysisStore: jest.fn(),
}));

describe('FilterPanel', () => {
  beforeEach(() => {
    mockSetFilterSettings.mockClear();
  });

  it('should render filter panel with initial state', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      filterSettings: { minPersistenceScore: 0 },
      setFilterSettings: mockSetFilterSettings,
      analysisResults: mockAnalysisResults,
    });

    const { getByText, getByLabelText, container } = render(<FilterPanel />);
    
    expect(getByText('Filters')).toBeInTheDocument();
    expect(getByLabelText('Minimum Persistence Score')).toBeInTheDocument();
    const zeroPercentElements = container.querySelectorAll('span');
    const percentageDisplay = Array.from(zeroPercentElements).find(el => 
      el.textContent === '0%' && el.className.includes('font-semibold')
    );
    expect(percentageDisplay).toBeInTheDocument();
    expect(getByText('Showing 3 of 3 devices')).toBeInTheDocument();
  });

  it('should display threat level legend', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      filterSettings: { minPersistenceScore: 0 },
      setFilterSettings: mockSetFilterSettings,
      analysisResults: mockAnalysisResults,
    });

    const { getByText } = render(<FilterPanel />);
    
    expect(getByText('Threat Levels')).toBeInTheDocument();
    expect(getByText('Low (0-30%)')).toBeInTheDocument();
    expect(getByText('Medium (30-60%)')).toBeInTheDocument();
    expect(getByText('High (60-80%)')).toBeInTheDocument();
    expect(getByText('Critical (80-100%)')).toBeInTheDocument();
  });

  it('should update local state when slider changes', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      filterSettings: { minPersistenceScore: 0 },
      setFilterSettings: mockSetFilterSettings,
      analysisResults: mockAnalysisResults,
    });

    const { getByLabelText, getByText } = render(<FilterPanel />);
    const slider = getByLabelText('Minimum Persistence Score');
    
    fireEvent.change(slider, { target: { value: '0.5' } });
    
    expect(getByText('50%')).toBeInTheDocument();
    expect(getByText('Showing 1 of 3 devices')).toBeInTheDocument();
  });

  it('should call setFilterSettings when slider is released', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      filterSettings: { minPersistenceScore: 0 },
      setFilterSettings: mockSetFilterSettings,
      analysisResults: mockAnalysisResults,
    });

    const { getByLabelText } = render(<FilterPanel />);
    const slider = getByLabelText('Minimum Persistence Score');
    
    fireEvent.change(slider, { target: { value: '0.6' } });
    fireEvent.mouseUp(slider);
    
    expect(mockSetFilterSettings).toHaveBeenCalledWith({ minPersistenceScore: 0.6 });
  });

  it('should reset filter when reset button is clicked', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      filterSettings: { minPersistenceScore: 0.7 },
      setFilterSettings: mockSetFilterSettings,
      analysisResults: mockAnalysisResults,
    });

    const { getByText } = render(<FilterPanel />);
    const resetButton = getByText('Reset Filter');
    
    fireEvent.click(resetButton);
    
    expect(mockSetFilterSettings).toHaveBeenCalledWith({ minPersistenceScore: 0 });
  });

  it('should update filtered count correctly', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      filterSettings: { minPersistenceScore: 0.3 },
      setFilterSettings: mockSetFilterSettings,
      analysisResults: mockAnalysisResults,
    });

    const { getByLabelText, getByText } = render(<FilterPanel />);
    const slider = getByLabelText('Minimum Persistence Score');
    
    fireEvent.change(slider, { target: { value: '0.2' } });
    expect(getByText('Showing 2 of 3 devices')).toBeInTheDocument();
    
    fireEvent.change(slider, { target: { value: '0.8' } });
    expect(getByText('Showing 1 of 3 devices')).toBeInTheDocument();
    
    fireEvent.change(slider, { target: { value: '0.9' } });
    expect(getByText('Showing 0 of 3 devices')).toBeInTheDocument();
  });
});