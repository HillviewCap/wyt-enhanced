import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MapView } from './components/map/MapView';
import { DataSourcesPage } from './routes/DataSourcesPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/map" replace />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/datasources" element={<DataSourcesPage />} />
    </Routes>
  );
};