import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataSourcesList } from './DataSourcesList';
import { ApiService } from '../../services/ApiService';
import { DataSource } from '../../routes/DataSourcesPage';

jest.mock('../../services/ApiService');

describe('DataSourcesList', () => {
  const mockOnIngestionTriggered = jest.fn();

  const mockDataSources: DataSource[] = [
    {
      id: '1',
      name: 'Test Source 1',
      path: '/path/to/kismet1.db',
      status: 'active',
      lastIngested: '2025-01-15T10:00:00Z',
      createdAt: '2025-01-10T10:00:00Z',
    },
    {
      id: '2',
      name: 'Test Source 2',
      path: '/path/to/kismet2.db',
      status: 'inactive',
      createdAt: '2025-01-12T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no data sources', () => {
    render(<DataSourcesList dataSources={[]} onIngestionTriggered={mockOnIngestionTriggered} />);
    
    expect(screen.getByText(/no data sources configured yet/i)).toBeInTheDocument();
    expect(screen.getByText(/add your first data source/i)).toBeInTheDocument();
  });

  it('should render list of data sources', () => {
    render(
      <DataSourcesList 
        dataSources={mockDataSources} 
        onIngestionTriggered={mockOnIngestionTriggered}
      />
    );
    
    expect(screen.getByText('Test Source 1')).toBeInTheDocument();
    expect(screen.getByText('Test Source 2')).toBeInTheDocument();
    expect(screen.getByText('/path/to/kismet1.db')).toBeInTheDocument();
    expect(screen.getByText('/path/to/kismet2.db')).toBeInTheDocument();
  });

  it('should display correct status badges', () => {
    render(
      <DataSourcesList 
        dataSources={mockDataSources} 
        onIngestionTriggered={mockOnIngestionTriggered}
      />
    );
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('should display creation and last ingested dates', () => {
    render(
      <DataSourcesList 
        dataSources={mockDataSources} 
        onIngestionTriggered={mockOnIngestionTriggered}
      />
    );
    
    expect(screen.getByText(/created: 1\/10\/2025/i)).toBeInTheDocument();
    expect(screen.getByText(/last ingested: 1\/15\/2025/i)).toBeInTheDocument();
  });

  it('should trigger ingestion when button clicked', async () => {
    (ApiService.triggerIngestion as jest.Mock).mockResolvedValue({});
    
    render(
      <DataSourcesList 
        dataSources={mockDataSources} 
        onIngestionTriggered={mockOnIngestionTriggered}
      />
    );
    
    const triggerButtons = screen.getAllByRole('button', { name: /trigger ingestion/i });
    fireEvent.click(triggerButtons[0]);

    await waitFor(() => {
      expect(ApiService.triggerIngestion).toHaveBeenCalledWith('1');
      expect(mockOnIngestionTriggered).toHaveBeenCalled();
    });
  });

  it('should disable button during ingestion', async () => {
    (ApiService.triggerIngestion as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(
      <DataSourcesList 
        dataSources={mockDataSources} 
        onIngestionTriggered={mockOnIngestionTriggered}
      />
    );
    
    const triggerButtons = screen.getAllByRole('button', { name: /trigger ingestion/i });
    fireEvent.click(triggerButtons[0]);

    expect(triggerButtons[0]).toBeDisabled();
    expect(screen.getByText(/triggering.../i)).toBeInTheDocument();
  });

  it('should handle ingestion errors', async () => {
    const errorMessage = 'Ingestion failed';
    (ApiService.triggerIngestion as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(
      <DataSourcesList 
        dataSources={mockDataSources} 
        onIngestionTriggered={mockOnIngestionTriggered}
      />
    );
    
    const triggerButtons = screen.getAllByRole('button', { name: /trigger ingestion/i });
    fireEvent.click(triggerButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should disable button when status is ingesting', () => {
    const ingestingSource: DataSource = {
      ...mockDataSources[0],
      status: 'ingesting',
    };
    
    render(
      <DataSourcesList 
        dataSources={[ingestingSource]} 
        onIngestionTriggered={mockOnIngestionTriggered}
      />
    );
    
    const triggerButton = screen.getByRole('button', { name: /trigger ingestion/i });
    expect(triggerButton).toBeDisabled();
  });
});