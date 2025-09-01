import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DeviceDetailPanel } from './DeviceDetailPanel';
import { AnalysisResult } from '../../services/ApiService';

const mockSetSelectedDevice = jest.fn();
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
    sightings: [
      {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: '2024-01-15T10:00:00Z',
        signalStrength: -65,
      },
      {
        latitude: 40.7130,
        longitude: -74.0062,
        timestamp: '2024-01-15T14:00:00Z',
        signalStrength: -70,
      },
    ],
  },
  {
    deviceId: 'device-2',
    macAddress: '11:22:33:44:55:66',
    persistenceScore: 0.25,
    firstSeen: '2024-01-15T09:00:00Z',
    lastSeen: '2024-01-15T09:30:00Z',
    locationCount: 2,
    timeWindowHours: 0.5,
    analysisTimestamp: '2024-01-15T14:30:00Z',
    sightings: [],
  },
];

jest.mock('../../stores/analysisStore', () => ({
  useAnalysisStore: jest.fn(),
}));

describe('DeviceDetailPanel', () => {
  beforeEach(() => {
    mockSetSelectedDevice.mockClear();
  });

  it('should not render when no device is selected', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: null,
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { container } = render(<DeviceDetailPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when selected device is not found', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'non-existent',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { container } = render(<DeviceDetailPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should display device details when device is selected', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'device-1',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { getByText } = render(<DeviceDetailPanel />);
    
    expect(getByText('Device Details')).toBeInTheDocument();
    expect(getByText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument();
    expect(getByText('device-1')).toBeInTheDocument();
    expect(getByText('85.0%')).toBeInTheDocument();
    expect(getByText('5')).toBeInTheDocument();
    expect(getByText('4 hours')).toBeInTheDocument();
  });

  it('should display correct threat level for critical score', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'device-1',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { getByText } = render(<DeviceDetailPanel />);
    const threatLevel = getByText('Critical');
    
    expect(threatLevel).toBeInTheDocument();
    expect(threatLevel).toHaveClass('text-red-600');
  });

  it('should display correct threat level for low score', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'device-2',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { getByText } = render(<DeviceDetailPanel />);
    const threatLevel = getByText('Low');
    
    expect(threatLevel).toBeInTheDocument();
    expect(threatLevel).toHaveClass('text-green-600');
  });

  it('should close panel when close button is clicked', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'device-1',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { getByLabelText } = render(<DeviceDetailPanel />);
    const closeButton = getByLabelText('Close panel');
    
    fireEvent.click(closeButton);
    
    expect(mockSetSelectedDevice).toHaveBeenCalledWith(null);
  });

  it('should display recent sightings', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'device-1',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { getByText } = render(<DeviceDetailPanel />);
    
    expect(getByText('Recent Sightings')).toBeInTheDocument();
    expect(getByText('-65 dBm')).toBeInTheDocument();
    expect(getByText('-70 dBm')).toBeInTheDocument();
    expect(getByText('40.712800, -74.006000')).toBeInTheDocument();
    expect(getByText('40.713000, -74.006200')).toBeInTheDocument();
  });

  it('should display analysis metadata', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'device-1',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { getByText } = render(<DeviceDetailPanel />);
    
    expect(getByText('Analysis Metadata')).toBeInTheDocument();
    expect(getByText('Analysis Timestamp:')).toBeInTheDocument();
    
    const analysisTime = new Date('2024-01-15T14:30:00Z').toLocaleString();
    expect(getByText(analysisTime)).toBeInTheDocument();
  });

  it('should handle device with no sightings gracefully', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      selectedDeviceId: 'device-2',
      analysisResults: mockAnalysisResults,
      setSelectedDevice: mockSetSelectedDevice,
    });

    const { queryByText, getByText } = render(<DeviceDetailPanel />);
    
    expect(queryByText('Recent Sightings')).not.toBeInTheDocument();
    expect(getByText('0')).toBeInTheDocument(); // Total Sightings count
  });
});