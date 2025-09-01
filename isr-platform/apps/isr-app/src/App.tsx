import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app/AppRouter';
import { NavBar } from './app/components/ui/NavBar';
import { MapErrorBoundary } from './app/components/map/MapErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <div className="flex-1">
          <MapErrorBoundary>
            <AppRouter />
          </MapErrorBoundary>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;