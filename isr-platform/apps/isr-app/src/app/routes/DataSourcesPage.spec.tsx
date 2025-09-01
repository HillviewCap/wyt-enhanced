import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataSourcesPage } from './DataSourcesPage';
import { ApiService } from '../services/ApiService';

jest.mock('../services/ApiService');
jest.mock('../components/datasources/DataSourceForm', () => ({
  DataSourceForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <div data-testid="data-source-form">
      <button onClick={onSuccess}>Create</button>
    </div>
  ),
}));
jest.mock('../components/datasources/DataSourcesList', () => ({
  DataSourcesList: ({ dataSources }: { dataSources: any[] }) => (
    <div data-testid="data-sources-list">
      {dataSources.map(ds => (
        <div key={ds.id}>{ds.name}</div>
      ))}
    </div>
  ),
}));
jest.mock('../components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));
jest.mock('../components/ui/ErrorMessage', () => ({
  ErrorMessage: ({ message }: { message: string }) => (
    <div data-testid="error-message">{message}</div>
  ),
}));

describe('DataSourcesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render page title and description', () => {
    (ApiService.fetchDataSources as jest.Mock).mockResolvedValue([]);
    
    render(<DataSourcesPage />);
    
    expect(screen.getByText('Data Sources')).toBeInTheDocument();
    expect(screen.getByText(/configure and manage your kismet data sources/i)).toBeInTheDocument();
  });

  it('should show loading spinner while fetching data', () => {
    (ApiService.fetchDataSources as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );
    
    render(<DataSourcesPage />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display data sources after loading', async () => {
    const mockDataSources = [
      { id: '1', name: 'Source 1', path: '/path1', status: 'active', createdAt: '2025-01-01' },
      { id: '2', name: 'Source 2', path: '/path2', status: 'inactive', createdAt: '2025-01-02' },
    ];
    (ApiService.fetchDataSources as jest.Mock).mockResolvedValue(mockDataSources);
    
    render(<DataSourcesPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('data-sources-list')).toBeInTheDocument();
      expect(screen.getByText('Source 1')).toBeInTheDocument();
      expect(screen.getByText('Source 2')).toBeInTheDocument();
    });
  });

  it('should display error message on fetch failure', async () => {
    const errorMessage = 'Failed to fetch';
    (ApiService.fetchDataSources as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(<DataSourcesPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should refresh data when new data source is created', async () => {
    const initialData = [
      { id: '1', name: 'Source 1', path: '/path1', status: 'active', createdAt: '2025-01-01' },
    ];
    const updatedData = [
      ...initialData,
      { id: '2', name: 'Source 2', path: '/path2', status: 'active', createdAt: '2025-01-02' },
    ];
    
    (ApiService.fetchDataSources as jest.Mock)
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(updatedData);
    
    const { rerender } = render(<DataSourcesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Source 1')).toBeInTheDocument();
    });
    
    const createButton = screen.getByRole('button', { name: /create/i });
    createButton.click();
    
    await waitFor(() => {
      expect(ApiService.fetchDataSources).toHaveBeenCalledTimes(2);
    });
    
    rerender(<DataSourcesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Source 2')).toBeInTheDocument();
    });
  });

  it('should have proper grid layout', () => {
    (ApiService.fetchDataSources as jest.Mock).mockResolvedValue([]);
    
    const { container } = render(<DataSourcesPage />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-3');
  });
});