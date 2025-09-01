import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { AnalysisResult } from '../../services/ApiService';
import { useAnalysisStore } from '../../stores/analysisStore';

interface DeviceMarkerProps {
  device: AnalysisResult;
}

const getMarkerColor = (persistenceScore: number): string => {
  if (persistenceScore >= 0.8) return '#ef4444'; // Red - Critical threat
  if (persistenceScore >= 0.6) return '#f97316'; // Orange - High threat
  if (persistenceScore >= 0.3) return '#f59e0b'; // Yellow - Medium threat
  return '#10b981'; // Green - Low threat
};

const createCustomIcon = (color: string): L.DivIcon => {
  return L.divIcon({
    html: `
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="8" fill="white"/>
      </svg>
    `,
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -41],
    className: 'custom-div-icon',
  });
};

const getLatestSighting = (device: AnalysisResult) => {
  if (!device.sightings || device.sightings.length === 0) {
    return null;
  }
  
  // Filter out invalid coordinates (0,0 or out of bounds)
  const validSightings = device.sightings.filter(s => 
    s.latitude !== 0 && 
    s.longitude !== 0 && 
    Math.abs(s.latitude) <= 90 && 
    Math.abs(s.longitude) <= 180
  );
  
  if (validSightings.length === 0) {
    return null;
  }
  
  return validSightings.reduce((latest, current) => {
    return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
  });
};

export function DeviceMarker({ device }: DeviceMarkerProps) {
  const { setSelectedDevice } = useAnalysisStore();
  const latestSighting = getLatestSighting(device);

  if (!latestSighting) {
    return null;
  }

  const markerColor = getMarkerColor(device.persistenceScore);
  const icon = createCustomIcon(markerColor);

  const handleMarkerClick = () => {
    setSelectedDevice(device.deviceId);
  };

  return (
    <Marker
      position={[latestSighting.latitude, latestSighting.longitude]}
      icon={icon}
      eventHandlers={{
        click: handleMarkerClick,
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-sm mb-2">Device Details</h3>
          <div className="text-xs space-y-1">
            <p><strong>MAC:</strong> {device.macAddress}</p>
            <p><strong>Persistence Score:</strong> {(device.persistenceScore * 100).toFixed(1)}%</p>
            <p><strong>First Seen:</strong> {new Date(device.firstSeen).toLocaleString()}</p>
            <p><strong>Last Seen:</strong> {new Date(device.lastSeen).toLocaleString()}</p>
            <p><strong>Location Count:</strong> {device.locationCount}</p>
            <p><strong>Signal Strength:</strong> {latestSighting.signalStrength} dBm</p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}