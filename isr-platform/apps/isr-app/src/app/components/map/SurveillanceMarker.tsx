import React from 'react';
import { Marker, Popup, CircleMarker } from 'react-leaflet';
import { DivIcon, LatLngExpression } from 'leaflet';

interface SuspiciousDevice {
  id: string;
  macAddress: string;
  persistenceScore: number;
  totalAppearances: number;
  locationCount: number;
  firstSeen: string;
  lastSeen: string;
  reasons: string[];
  locations: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    signalStrength?: number;
  }>;
  stalking_score?: number;
  stalking_reasons?: string[];
}

interface SurveillanceMarkerProps {
  device: SuspiciousDevice;
  isSelected: boolean;
  onClick: () => void;
}

export function SurveillanceMarker({ device, isSelected, onClick }: SurveillanceMarkerProps) {
  const getThreatLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  };

  const getThreatColor = (level: string): string => {
    switch (level) {
      case 'critical': return '#dc2626'; // Red-600
      case 'high': return '#ef4444'; // Red-500
      case 'medium': return '#f59e0b'; // Amber-500
      case 'low': return '#22c55e'; // Green-500
      default: return '#6b7280'; // Gray-500
    }
  };

  const getThreatIcon = (level: string): string => {
    switch (level) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '👁️';
      default: return '📡';
    }
  };

  const getDeviceIcon = (macAddress: string): string => {
    // Try to infer device type from MAC address patterns
    const mac = macAddress.toLowerCase();
    if (mac.startsWith('02:00:00') || mac.includes('random')) return '📱'; // Random/private MAC
    if (mac.startsWith('00:50:56') || mac.startsWith('00:0c:29')) return '💻'; // VMware
    if (mac.startsWith('08:00:27') || mac.startsWith('0a:00:27')) return '💻'; // VirtualBox
    if (mac.startsWith('b8:27:eb') || mac.startsWith('dc:a6:32')) return '🍓'; // Raspberry Pi
    return '📱'; // Default to mobile device
  };

  const score = device.stalking_score || device.persistenceScore;
  const threatLevel = getThreatLevel(score);
  const threatColor = getThreatColor(threatLevel);
  const threatIcon = getThreatIcon(threatLevel);
  const deviceIcon = getDeviceIcon(device.macAddress);

  // If device has multiple locations, show all of them
  if (device.locations.length > 1) {
    return (
      <>
        {device.locations.map((location, index) => {
          const position: LatLngExpression = [location.latitude, location.longitude];
          const isFirst = index === 0;
          const isLast = index === device.locations.length - 1;
          
          // Create custom icon for multi-location devices
          const customIcon = new DivIcon({
            html: `
              <div style="
                background-color: ${threatColor};
                border: 2px solid white;
                border-radius: 50%;
                width: ${isSelected ? '20px' : '16px'};
                height: ${isSelected ? '20px' : '16px'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${isSelected ? '10px' : '8px'};
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ${isFirst ? 'border-width: 3px; border-color: #00ff00;' : ''}
                ${isLast ? 'border-width: 3px; border-color: #ff0000;' : ''}
              ">
                ${index + 1}
              </div>
            `,
            className: 'surveillance-marker',
            iconSize: [isSelected ? 20 : 16, isSelected ? 20 : 16],
            iconAnchor: [isSelected ? 10 : 8, isSelected ? 10 : 8]
          });

          return (
            <Marker
              key={`${device.id}-${index}`}
              position={position}
              icon={customIcon}
              eventHandlers={{
                click: onClick
              }}
            >
              <Popup>
                <div className="p-2 min-w-64">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-800">
                      {threatIcon} Suspicious Device
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      threatLevel === 'critical' ? 'bg-red-100 text-red-800' :
                      threatLevel === 'high' ? 'bg-red-50 text-red-700' :
                      threatLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {threatLevel.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div><strong>MAC:</strong> {device.macAddress}</div>
                    <div><strong>Location {index + 1} of {device.locations.length}:</strong></div>
                    <div className="text-xs text-gray-600 ml-2">
                      <div>Lat: {location.latitude.toFixed(6)}</div>
                      <div>Lng: {location.longitude.toFixed(6)}</div>
                      <div>Time: {new Date(location.timestamp).toLocaleString()}</div>
                      {location.signalStrength && (
                        <div>Signal: {location.signalStrength} dBm</div>
                      )}
                    </div>
                    
                    {index === 0 && (
                      <>
                        <div><strong>Threat Score:</strong> {score.toFixed(3)}</div>
                        <div><strong>Appearances:</strong> {device.totalAppearances}</div>
                        <div><strong>Locations:</strong> {device.locationCount}</div>
                        <div><strong>Active:</strong> {new Date(device.firstSeen).toLocaleDateString()} - {new Date(device.lastSeen).toLocaleDateString()}</div>
                        
                        <div className="mt-2">
                          <strong>Threat Indicators:</strong>
                          <ul className="text-xs mt-1 space-y-1">
                            {device.reasons.slice(0, 3).map((reason, idx) => (
                              <li key={idx} className="text-red-600">• {reason}</li>
                            ))}
                          </ul>
                        </div>

                        {device.stalking_score && device.stalking_reasons && (
                          <div className="mt-2 p-2 bg-red-50 rounded">
                            <strong className="text-red-800">🚨 STALKING ALERT</strong>
                            <div className="text-xs text-red-700 mt-1">
                              Score: {device.stalking_score.toFixed(3)}
                            </div>
                            <ul className="text-xs mt-1 space-y-1">
                              {device.stalking_reasons.slice(0, 2).map((reason, idx) => (
                                <li key={idx} className="text-red-600">• {reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  }

  // Single location device
  const location = device.locations[0];
  if (!location) return null;

  const position: LatLngExpression = [location.latitude, location.longitude];
  
  const customIcon = new DivIcon({
    html: `
      <div style="
        background-color: ${threatColor};
        border: 3px solid white;
        border-radius: 50%;
        width: ${isSelected ? '24px' : '20px'};
        height: ${isSelected ? '24px' : '20px'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? '14px' : '12px'};
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        animation: ${threatLevel === 'critical' || threatLevel === 'high' ? 'pulse 2s infinite' : 'none'};
      ">
        ${deviceIcon}
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    `,
    className: 'surveillance-marker',
    iconSize: [isSelected ? 24 : 20, isSelected ? 24 : 20],
    iconAnchor: [isSelected ? 12 : 10, isSelected ? 12 : 10]
  });

  return (
    <Marker
      position={position}
      icon={customIcon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup>
        <div className="p-2 min-w-64">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-gray-800">
              {threatIcon} Suspicious Device
            </h4>
            <span className={`px-2 py-1 text-xs rounded font-medium ${
              threatLevel === 'critical' ? 'bg-red-100 text-red-800' :
              threatLevel === 'high' ? 'bg-red-50 text-red-700' :
              threatLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {threatLevel.toUpperCase()}
            </span>
          </div>
          
          <div className="space-y-1 text-sm">
            <div><strong>MAC:</strong> {device.macAddress}</div>
            <div><strong>Threat Score:</strong> {score.toFixed(3)}</div>
            <div><strong>Appearances:</strong> {device.totalAppearances}</div>
            <div><strong>Locations:</strong> {device.locationCount}</div>
            <div><strong>Active:</strong> {new Date(device.firstSeen).toLocaleDateString()} - {new Date(device.lastSeen).toLocaleDateString()}</div>
            
            <div className="text-xs text-gray-600 mt-2">
              <div>Lat: {location.latitude.toFixed(6)}</div>
              <div>Lng: {location.longitude.toFixed(6)}</div>
              <div>Last Seen: {new Date(location.timestamp).toLocaleString()}</div>
              {location.signalStrength && (
                <div>Signal: {location.signalStrength} dBm</div>
              )}
            </div>
            
            <div className="mt-2">
              <strong>Threat Indicators:</strong>
              <ul className="text-xs mt-1 space-y-1">
                {device.reasons.slice(0, 3).map((reason, idx) => (
                  <li key={idx} className="text-red-600">• {reason}</li>
                ))}
              </ul>
            </div>

            {device.stalking_score && device.stalking_reasons && (
              <div className="mt-2 p-2 bg-red-50 rounded">
                <strong className="text-red-800">🚨 STALKING ALERT</strong>
                <div className="text-xs text-red-700 mt-1">
                  Score: {device.stalking_score.toFixed(3)}
                </div>
                <ul className="text-xs mt-1 space-y-1">
                  {device.stalking_reasons.slice(0, 2).map((reason, idx) => (
                    <li key={idx} className="text-red-600">• {reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}