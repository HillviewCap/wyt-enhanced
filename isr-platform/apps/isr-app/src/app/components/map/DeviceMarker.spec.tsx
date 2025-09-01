import React from 'react';
import { render } from '@testing-library/react';
import { DeviceMarker } from './DeviceMarker';
import { AnalysisResult } from '../../services/ApiService';

jest.mock('react-leaflet', () => ({
  Marker: ({ children, position, icon, eventHandlers }: any) => {
    const handleClick = () => {
      if (eventHandlers?.click) {
        eventHandlers.click();
      }
    };
    return (
      <div 
        data-testid="marker" 
        data-position={JSON.stringify(position)}
        data-icon={icon?.options?.html || ''}
        onClick={handleClick}
      >
        {children}
      </div>
    );
  },
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

jest.mock('leaflet', () => ({
  divIcon: jest.fn((options) => ({ options, type: 'divIcon' })),
}));

const mockSetSelectedDevice = jest.fn();
jest.mock('../../stores/analysisStore', () => ({
  useAnalysisStore: () => ({
    setSelectedDevice: mockSetSelectedDevice,
  }),
}));

describe('DeviceMarker', () => {
  const mockDevice: AnalysisResult = {
    deviceId: 'test-device-123',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    persistenceScore: 0.75,
    firstSeen: '2024-01-15T10:00:00Z',
    lastSeen: '2024-01-15T14:00:00Z',
    locationCount: 3,
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
  };

  beforeEach(() => {
    mockSetSelectedDevice.mockClear();
  });

  it('should render marker at latest sighting location', () => {
    const { getByTestId } = render(<DeviceMarker device={mockDevice} />);
    const marker = getByTestId('marker');
    const position = JSON.parse(marker.getAttribute('data-position') || '[]');
    
    expect(position[0]).toBe(40.7130);
    expect(position[1]).toBe(-74.0062);
  });

  it('should not render if device has no sightings', () => {
    const deviceWithoutSightings = { ...mockDevice, sightings: [] };
    const { container } = render(<DeviceMarker device={deviceWithoutSightings} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should use red color for critical threat (score >= 0.8)', () => {
    const criticalDevice = { ...mockDevice, persistenceScore: 0.85 };
    const { getByTestId } = render(<DeviceMarker device={criticalDevice} />);
    const marker = getByTestId('marker');
    const iconHtml = marker.getAttribute('data-icon') || '';
    
    expect(iconHtml).toContain('#ef4444');
  });

  it('should use orange color for high threat (score >= 0.6)', () => {
    const highThreatDevice = { ...mockDevice, persistenceScore: 0.65 };
    const { getByTestId } = render(<DeviceMarker device={highThreatDevice} />);
    const marker = getByTestId('marker');
    const iconHtml = marker.getAttribute('data-icon') || '';
    
    expect(iconHtml).toContain('#f97316');
  });

  it('should use yellow color for medium threat (score >= 0.3)', () => {
    const mediumThreatDevice = { ...mockDevice, persistenceScore: 0.45 };
    const { getByTestId } = render(<DeviceMarker device={mediumThreatDevice} />);
    const marker = getByTestId('marker');
    const iconHtml = marker.getAttribute('data-icon') || '';
    
    expect(iconHtml).toContain('#f59e0b');
  });

  it('should use green color for low threat (score < 0.3)', () => {
    const lowThreatDevice = { ...mockDevice, persistenceScore: 0.15 };
    const { getByTestId } = render(<DeviceMarker device={lowThreatDevice} />);
    const marker = getByTestId('marker');
    const iconHtml = marker.getAttribute('data-icon') || '';
    
    expect(iconHtml).toContain('#10b981');
  });

  it('should display device details in popup', () => {
    const { getByText } = render(<DeviceMarker device={mockDevice} />);
    
    expect(getByText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument();
    expect(getByText('75.0%')).toBeInTheDocument();
    expect(getByText('3')).toBeInTheDocument();
    expect(getByText('-70 dBm')).toBeInTheDocument();
  });

  it('should call setSelectedDevice when marker is clicked', () => {
    const { getByTestId } = render(<DeviceMarker device={mockDevice} />);
    const marker = getByTestId('marker');
    
    marker.click();
    
    expect(mockSetSelectedDevice).toHaveBeenCalledWith('test-device-123');
  });

  it('should format dates correctly in popup', () => {
    const { getByText } = render(<DeviceMarker device={mockDevice} />);
    
    const firstSeenText = new Date('2024-01-15T10:00:00Z').toLocaleString();
    const lastSeenText = new Date('2024-01-15T14:00:00Z').toLocaleString();
    
    expect(getByText(firstSeenText)).toBeInTheDocument();
    expect(getByText(lastSeenText)).toBeInTheDocument();
  });
});