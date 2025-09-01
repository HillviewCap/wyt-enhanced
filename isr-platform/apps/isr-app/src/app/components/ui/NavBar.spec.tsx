import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from './NavBar';

describe('NavBar', () => {
  const renderNavBar = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <NavBar />
      </MemoryRouter>
    );
  };

  it('should render the ISR Platform title', () => {
    renderNavBar();
    expect(screen.getByText('ISR Platform')).toBeInTheDocument();
  });

  it('should render Map View link', () => {
    renderNavBar();
    const mapLink = screen.getByRole('link', { name: /map view/i });
    expect(mapLink).toBeInTheDocument();
    expect(mapLink).toHaveAttribute('href', '/map');
  });

  it('should render Data Sources link', () => {
    renderNavBar();
    const dataSourcesLink = screen.getByRole('link', { name: /data sources/i });
    expect(dataSourcesLink).toBeInTheDocument();
    expect(dataSourcesLink).toHaveAttribute('href', '/datasources');
  });

  it('should apply active styling to Map View when on /map route', () => {
    renderNavBar('/map');
    const mapLink = screen.getByRole('link', { name: /map view/i });
    expect(mapLink).toHaveClass('text-[#00BFFF]', 'font-semibold');
  });

  it('should apply active styling to Data Sources when on /datasources route', () => {
    renderNavBar('/datasources');
    const dataSourcesLink = screen.getByRole('link', { name: /data sources/i });
    expect(dataSourcesLink).toHaveClass('text-[#00BFFF]', 'font-semibold');
  });

  it('should have proper responsive classes', () => {
    const { container } = renderNavBar();
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('bg-[#121212]', 'border-b', 'border-gray-800');
  });
});