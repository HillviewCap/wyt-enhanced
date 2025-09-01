import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from './AppRouter';

jest.mock('./components/map/MapView', () => ({
  MapView: () => <div data-testid="map-view">Map View</div>,
}));

jest.mock('./routes/DataSourcesPage', () => ({
  DataSourcesPage: () => <div data-testid="datasources-page">Data Sources Page</div>,
}));

describe('AppRouter', () => {
  it('should render MapView when navigating to /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('should render MapView when navigating to /map', () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('should render DataSourcesPage when navigating to /datasources', () => {
    render(
      <MemoryRouter initialEntries={['/datasources']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(screen.getByTestId('datasources-page')).toBeInTheDocument();
  });

  it('should redirect from root to /map', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });
});