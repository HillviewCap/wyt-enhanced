import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { WifiClientsPage } from './components/wifi/WifiClientsPage';
import { WifiNetworksMapView } from './components/map/WifiNetworksMapView';
import { SurveillanceMapView } from './components/map/SurveillanceMapView';
import { DataSourcesPage } from './routes/DataSourcesPage';
import { RFSensorPage } from './components/rfsensor/RFSensorPage';
import { DetectionsTableView } from './components/detections/DetectionsTableView';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/wifi-map" replace />} />
      <Route path="/map" element={<WifiClientsPage />} />
      <Route path="/wifi-map" element={<WifiNetworksMapView />} />
      <Route path="/surveillance" element={<SurveillanceMapView />} />
      <Route path="/datasources" element={<DataSourcesPage />} />
      <Route path="/rfsensor" element={<RFSensorPage />} />
      <Route path="/detections" element={<DetectionsTableView />} />
    </Routes>
  );
};