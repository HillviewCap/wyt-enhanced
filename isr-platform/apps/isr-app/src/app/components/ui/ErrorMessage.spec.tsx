import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('should render error message', () => {
    const message = 'Something went wrong';
    render(<ErrorMessage message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('should have alert role', () => {
    render(<ErrorMessage message="Error" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ErrorMessage message="Error" className="custom-class" />);
    const alert = container.querySelector('.custom-class');
    expect(alert).toBeInTheDocument();
  });

  it('should have red styling', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('should render error icon', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-red-400');
  });

  it('should display long error messages', () => {
    const longMessage = 'This is a very long error message that provides detailed information about what went wrong';
    render(<ErrorMessage message={longMessage} />);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});