import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapErrorBoundary } from './MapErrorBoundary';

describe('MapErrorBoundary', () => {
  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Child content</div>;
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <MapErrorBoundary>
        <ThrowError shouldThrow={false} />
      </MapErrorBoundary>
    );
    
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <MapErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MapErrorBoundary>
    );
    
    expect(screen.getByText('Map Loading Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should display reload button when error occurs', () => {
    render(
      <MapErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MapErrorBoundary>
    );
    
    const reloadButton = screen.getByLabelText('Reload page');
    expect(reloadButton).toBeInTheDocument();
  });

  it('should have correct button attributes', () => {
    render(
      <MapErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MapErrorBoundary>
    );
    
    const reloadButton = screen.getByLabelText('Reload page');
    expect(reloadButton.tagName).toBe('BUTTON');
    expect(reloadButton).toHaveClass('px-4', 'py-2', 'bg-blue-500');
  });

  it('should log error to console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    render(
      <MapErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MapErrorBoundary>
    );
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Map component error:',
      expect.any(Error),
      expect.any(Object)
    );
  });
});