import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelineControl } from './TimelineControl';
import { useAnalysisStore } from '../../stores/analysisStore';

// Mock the analysis store
jest.mock('../../stores/analysisStore');

const mockUseAnalysisStore = useAnalysisStore as unknown as jest.Mock;

describe('TimelineControl', () => {
  beforeEach(() => {
    // Reset mock before each test
    mockUseAnalysisStore.mockReturnValue({
      filteredResults: []
    });
  });

  it('should render without errors', () => {
    render(<TimelineControl />);
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('should display no data message when there are no results', () => {
    render(<TimelineControl />);
    expect(screen.getByText('No data available. Upload and analyze Kismet logs to see timeline.')).toBeInTheDocument();
  });

  it('should display device and sighting counts', () => {
    mockUseAnalysisStore.mockReturnValue({
      filteredResults: [
        {
          deviceId: '1',
          firstSeen: '2024-01-01T10:00:00Z',
          lastSeen: '2024-01-01T12:00:00Z',
          sightings: [{}, {}, {}]
        },
        {
          deviceId: '2',
          firstSeen: '2024-01-01T11:00:00Z',
          lastSeen: '2024-01-01T13:00:00Z',
          sightings: [{}, {}]
        }
      ]
    });

    render(<TimelineControl />);
    expect(screen.getByText('2 devices • 5 sightings')).toBeInTheDocument();
  });

  it('should display time range when data is available', () => {
    mockUseAnalysisStore.mockReturnValue({
      filteredResults: [
        {
          deviceId: '1',
          firstSeen: '2024-01-01T10:00:00Z',
          lastSeen: '2024-01-01T12:00:00Z',
          sightings: []
        }
      ]
    });

    render(<TimelineControl />);
    expect(screen.getByText('From:')).toBeInTheDocument();
    expect(screen.getByText('To:')).toBeInTheDocument();
  });

  it('should have correct positioning classes', () => {
    const { container } = render(<TimelineControl />);
    const control = container.firstChild as HTMLElement;
    expect(control).toHaveClass('absolute', 'bottom-4', 'left-4', 'right-4', 'z-[1000]');
  });

  it('should have correct styling classes', () => {
    const { container } = render(<TimelineControl />);
    const control = container.firstChild as HTMLElement;
    expect(control).toHaveClass('bg-white', 'shadow-lg', 'rounded-lg', 'p-4');
  });

  it('should have max width constraint', () => {
    const { container } = render(<TimelineControl />);
    const control = container.firstChild as HTMLElement;
    expect(control).toHaveClass('mx-auto', 'max-w-4xl');
  });
});