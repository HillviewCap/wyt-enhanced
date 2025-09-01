import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataSourceForm } from './DataSourceForm';
import { ApiService } from '../../services/ApiService';

jest.mock('../../services/ApiService');

describe('DataSourceForm', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<DataSourceForm onSuccess={mockOnSuccess} />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/file path/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create data source/i })).toBeInTheDocument();
  });

  it('should validate name is required', async () => {
    render(<DataSourceForm onSuccess={mockOnSuccess} />);
    
    const submitButton = screen.getByRole('button', { name: /create data source/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('should validate file path format', async () => {
    render(<DataSourceForm onSuccess={mockOnSuccess} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const pathInput = screen.getByLabelText(/file path/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Source' } });
    fireEvent.change(pathInput, { target: { value: 'invalid-path' } });
    
    const submitButton = screen.getByRole('button', { name: /create data source/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please provide a valid path/i)).toBeInTheDocument();
    });
  });

  it('should accept valid SQLite file paths', async () => {
    (ApiService.createDataSource as jest.Mock).mockResolvedValue({ id: '123' });
    
    render(<DataSourceForm onSuccess={mockOnSuccess} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const pathInput = screen.getByLabelText(/file path/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Source' } });
    fireEvent.change(pathInput, { target: { value: '/path/to/kismet.db' } });
    
    const submitButton = screen.getByRole('button', { name: /create data source/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(ApiService.createDataSource).toHaveBeenCalledWith({
        name: 'Test Source',
        path: '/path/to/kismet.db',
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should clear form after successful submission', async () => {
    (ApiService.createDataSource as jest.Mock).mockResolvedValue({ id: '123' });
    
    render(<DataSourceForm onSuccess={mockOnSuccess} />);
    
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const pathInput = screen.getByLabelText(/file path/i) as HTMLInputElement;
    
    fireEvent.change(nameInput, { target: { value: 'Test Source' } });
    fireEvent.change(pathInput, { target: { value: '/path/to/kismet.sqlite3' } });
    
    const submitButton = screen.getByRole('button', { name: /create data source/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(nameInput.value).toBe('');
      expect(pathInput.value).toBe('');
    });
  });

  it('should handle API errors', async () => {
    const errorMessage = 'API Error';
    (ApiService.createDataSource as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(<DataSourceForm onSuccess={mockOnSuccess} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const pathInput = screen.getByLabelText(/file path/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Source' } });
    fireEvent.change(pathInput, { target: { value: '/path/to/kismet.db' } });
    
    const submitButton = screen.getByRole('button', { name: /create data source/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('should disable form during submission', async () => {
    (ApiService.createDataSource as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<DataSourceForm onSuccess={mockOnSuccess} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const pathInput = screen.getByLabelText(/file path/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Source' } });
    fireEvent.change(pathInput, { target: { value: '/path/to/kismet.db' } });
    
    const submitButton = screen.getByRole('button', { name: /create data source/i });
    fireEvent.click(submitButton);

    expect(nameInput).toBeDisabled();
    expect(pathInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/creating.../i)).toBeInTheDocument();
  });
});