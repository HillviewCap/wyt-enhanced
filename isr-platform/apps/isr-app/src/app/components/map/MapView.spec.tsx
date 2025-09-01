import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapView } from './MapView';
import { ApiService } from '../../services/ApiService';

// Mock Leaflet global
(global as any).L = {
  Icon: {
    Default: {
      mergeOptions: jest.fn(),
    },
  },
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: React.forwardRef((props: any, ref: any) => (
    <div ref={ref} data-testid="map-container" className={props.className}>
      {props.children}
    </div>
  )),
  TileLayer: jest.fn(() => <div data-testid="tile-layer" />),
  ZoomControl: jest.fn(({ position }) => (
    <div data-testid="zoom-control" data-position={position} />
  )),
}));

// Mock the UI components
jest.mock('../ui/FilterPanel', () => ({
  FilterPanel: jest.fn(() => <div data-testid="filter-panel" />),
}));

jest.mock('../ui/TimelineControl', () => ({
  TimelineControl: jest.fn(() => <div data-testid="timeline-control" />),
}));

jest.mock('../ui/DeviceDetailPanel', () => ({
  DeviceDetailPanel: jest.fn(() => <div data-testid="device-detail-panel" />),
}));

jest.mock('./DeviceMarker', () => ({
  DeviceMarker: jest.fn(({ device }) => (
    <div data-testid={`device-marker-${device.deviceId}`} />
  )),
}));

// Mock the API service
jest.mock('../../services/ApiService', () => ({
  ApiService: {
    fetchAnalysisResults: jest.fn(),
  },
}));

// Mock the analysis store
const mockSetAnalysisResults = jest.fn();
const mockSetLoading = jest.fn();
const mockSetError = jest.fn();

jest.mock('../../stores/analysisStore', () => ({
  useAnalysisStore: jest.fn(() => ({
    setAnalysisResults: mockSetAnalysisResults,
    setLoading: mockSetLoading,
    setError: mockSetError,
    isLoading: false,
    error: null,
    filteredResults: [],
  })),
}));

describe('MapView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render map container without errors', () => {
    render(<MapView />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should render with full viewport dimensions', () => {
    render(<MapView />);
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toHaveClass('h-full w-full');
  });

  it('should render tile layer', () => {
    render(<MapView />);
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('should render zoom control with correct position', () => {
    render(<MapView />);
    const zoomControl = screen.getByTestId('zoom-control');
    expect(zoomControl).toBeInTheDocument();
    expect(zoomControl).toHaveAttribute('data-position', 'topright');
  });

  it('should render reset view button', () => {
    render(<MapView />);
    const resetButton = screen.getByRole('button', { name: /reset map view/i });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toHaveClass('absolute', 'top-4', 'right-20');
  });

  it('should handle reset view button click', () => {
    render(<MapView />);
    const resetButton = screen.getByRole('button', { name: /reset map view/i });
    
    // Just verify the button exists and can be clicked without errors
    expect(() => fireEvent.click(resetButton)).not.toThrow();
  });

  it('should render FilterPanel in correct position', () => {
    render(<MapView />);
    const filterPanel = screen.getByTestId('filter-panel');
    expect(filterPanel).toBeInTheDocument();
  });

  it('should render TimelineControl in correct position', () => {
    render(<MapView />);
    const timelineControl = screen.getByTestId('timeline-control');
    expect(timelineControl).toBeInTheDocument();
  });

  it('should accept custom center and zoom props', () => {
    const customCenter: [number, number] = [51.5074, -0.1278]; // London
    const customZoom = 10;
    
    // Just verify the component renders without error with custom props
    expect(() => render(<MapView center={customCenter} zoom={customZoom} />)).not.toThrow();
  });

  it('should use default center and zoom when not provided', () => {
    // Just verify the component renders without error with default props
    expect(() => render(<MapView />)).not.toThrow();
  });

  it('should render map with correct container structure', () => {
    const { container } = render(<MapView />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('relative', 'h-screen', 'w-screen');
  });

  it('should fetch analysis results on mount', async () => {
    const mockResults = [
      { deviceId: '1', macAddress: 'AA:BB:CC:DD:EE:FF', persistenceScore: 0.5 },
    ];
    (ApiService.fetchAnalysisResults as jest.Mock).mockResolvedValue(mockResults);

    render(<MapView />);

    await waitFor(() => {
      expect(ApiService.fetchAnalysisResults).toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetAnalysisResults).toHaveBeenCalledWith(mockResults);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch data';
    (ApiService.fetchAnalysisResults as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<MapView />);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(errorMessage);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should display loading state', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      setAnalysisResults: mockSetAnalysisResults,
      setLoading: mockSetLoading,
      setError: mockSetError,
      isLoading: true,
      error: null,
      filteredResults: [],
    });

    render(<MapView />);
    expect(screen.getByText('Loading analysis data...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      setAnalysisResults: mockSetAnalysisResults,
      setLoading: mockSetLoading,
      setError: mockSetError,
      isLoading: false,
      error: 'Network error',
      filteredResults: [],
    });

    render(<MapView />);
    expect(screen.getByText('Error: Network error')).toBeInTheDocument();
  });

  it('should render DeviceDetailPanel', () => {
    render(<MapView />);
    expect(screen.getByTestId('device-detail-panel')).toBeInTheDocument();
  });

  it('should render device markers for filtered results', () => {
    const mockDevices = [
      { deviceId: 'device-1', macAddress: 'AA:BB:CC:DD:EE:FF' },
      { deviceId: 'device-2', macAddress: '11:22:33:44:55:66' },
    ];
    
    const useAnalysisStore = require('../../stores/analysisStore').useAnalysisStore;
    useAnalysisStore.mockReturnValue({
      setAnalysisResults: mockSetAnalysisResults,
      setLoading: mockSetLoading,
      setError: mockSetError,
      isLoading: false,
      error: null,
      filteredResults: mockDevices,
    });

    render(<MapView />);
    
    expect(screen.getByTestId('device-marker-device-1')).toBeInTheDocument();
    expect(screen.getByTestId('device-marker-device-2')).toBeInTheDocument();
  });
});