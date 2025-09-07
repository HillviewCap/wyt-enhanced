import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MapView } from './components/map/MapView';
import { WifiNetworksMapView } from './components/map/WifiNetworksMapView';
import { SurveillanceMapView } from './components/map/SurveillanceMapView';
import { DataSourcesPage } from './routes/DataSourcesPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/wifi-map" replace />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/wifi-map" element={<WifiNetworksMapView />} />
      <Route path="/surveillance" element={<SurveillanceMapView />} />
      <Route path="/datasources" element={<DataSourcesPage />} />
    </Routes>
  );
};