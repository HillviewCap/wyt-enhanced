import React from 'react';
import { Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import { Icon, divIcon, DivIcon } from 'leaflet';
import { DriveSession, useNetworkStore } from '../../stores/networkStore';

interface DriveRouteOverlayProps {
  driveSession: DriveSession;
  isSelected?: boolean;
  onSelect?: (session: DriveSession) => void;
}

// Drive route colors - cycling through different colors for multiple routes
const DRIVE_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red  
  '#16a34a', // Green
  '#ca8a04', // Yellow
  '#9333ea', // Purple
  '#c2410c', // Orange
  '#0891b2', // Cyan
  '#be123c', // Rose
];

const getRouteColor = (sessionId: string, isSelected: boolean = false): string => {
  if (isSelected) return '#000000'; // Black for selected route
  
  // Use session ID to consistently assign colors
  const hash = sessionId.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return DRIVE_COLORS[Math.abs(hash) % DRIVE_COLORS.length];
};

const getStartEndIcon = (type: 'start' | 'end', color: string, isSelected: boolean): DivIcon => {
  const isStart = type === 'start';
  const size = isSelected ? 20 : 16;
  
  return divIcon({
    className: 'drive-marker',
    html: `
      <div style="
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: ${size > 16 ? 12 : 10}px;
      ">
        ${isStart ? 'S' : 'E'}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const formatDistance = (meters?: number): string => {
  if (!meters) return 'Unknown';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

const formatDuration = (startTime: string, endTime: string): string => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes >= 60) {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
    return `${durationMinutes}m`;
  } catch {
    return 'Unknown';
  }
};

const formatTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return 'Invalid time';
  }
};

export function DriveRouteOverlay({ driveSession, isSelected = false, onSelect }: DriveRouteOverlayProps) {
  const routeColor = getRouteColor(driveSession.id, isSelected);
  
  // Extract route coordinates from GeoJSON
  const routeCoordinates: [number, number][] = React.useMemo(() => {
    if (!driveSession.routeGeojson || !driveSession.routeGeojson.coordinates) {
      return [];
    }
    
    try {
      // GeoJSON coordinates are [longitude, latitude], we need [latitude, longitude] for Leaflet
      return driveSession.routeGeojson.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    } catch (error) {
      console.warn('Failed to parse route coordinates:', error);
      return [];
    }
  }, [driveSession.routeGeojson]);

  // Fallback to start/end locations if no route coordinates
  const fallbackCoordinates: [number, number][] = React.useMemo(() => {
    if (routeCoordinates.length > 0) return [];
    
    const coords: [number, number][] = [];
    if (driveSession.startLocation) {
      coords.push([driveSession.startLocation.latitude, driveSession.startLocation.longitude]);
    }
    if (driveSession.endLocation) {
      coords.push([driveSession.endLocation.latitude, driveSession.endLocation.longitude]);
    }
    return coords;
  }, [routeCoordinates, driveSession.startLocation, driveSession.endLocation]);

  const displayCoordinates = routeCoordinates.length > 0 ? routeCoordinates : fallbackCoordinates;

  if (displayCoordinates.length < 2) {
    return null; // Can't draw a route with less than 2 points
  }

  const startCoord = displayCoordinates[0];
  const endCoord = displayCoordinates[displayCoordinates.length - 1];

  const handleRouteClick = () => {
    if (onSelect) {
      onSelect(driveSession);
    }
  };

  return (
    <>
      {/* Route polyline */}
      <Polyline
        positions={displayCoordinates}
        pathOptions={{
          color: routeColor,
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 1 : 0.7,
          dashArray: routeCoordinates.length === 0 ? '10, 10' : undefined, // Dashed for fallback routes
        }}
        eventHandlers={{
          click: handleRouteClick,
        }}
      >
        <Tooltip permanent={isSelected} direction="top" offset={[0, -10]}>
          <div className="text-xs">
            <strong>{driveSession.sessionName || `Drive ${driveSession.id.substring(0, 8)}`}</strong>
            <br />
            {formatDistance(driveSession.totalDistance)} • {driveSession.endTime ? formatDuration(driveSession.startTime, driveSession.endTime) : 'Ongoing'}
            {driveSession.areaCovered && (
              <>
                <br />
                Area: {(Number(driveSession.areaCovered) / 1000000).toFixed(1)} km²
              </>
            )}
          </div>
        </Tooltip>
      </Polyline>

      {/* Start marker */}
      <Marker
        position={startCoord}
        icon={getStartEndIcon('start', routeColor, isSelected)}
        eventHandlers={{ click: handleRouteClick }}
      >
        <Popup>
          <div className="drive-popup" style={{ minWidth: '200px' }}>
            <h3 className="font-bold text-green-600 mb-2">🚗 Drive Start</h3>
            
            <div className="space-y-1 text-sm">
              <div>
                <strong>Session:</strong> {driveSession.sessionName || 'Unnamed Drive'}
              </div>
              
              <div>
                <strong>Started:</strong> {formatTime(driveSession.startTime)}
              </div>
              
              {driveSession.totalDistance && (
                <div>
                  <strong>Total Distance:</strong> {formatDistance(driveSession.totalDistance)}
                </div>
              )}
              
              {driveSession.areaCovered && (
                <div>
                  <strong>Area Covered:</strong> {(Number(driveSession.areaCovered) / 1000000).toFixed(1)} km²
                </div>
              )}
              
              <div>
                <strong>Networks Found:</strong> {driveSession.networksDiscovered || 0}
              </div>
              
              <div>
                <strong>Devices Found:</strong> {driveSession.devicesDiscovered || 0}
              </div>
              
              <div className="text-xs text-gray-500 mt-2">
                <strong>Coordinates:</strong> {startCoord[0].toFixed(6)}, {startCoord[1].toFixed(6)}
              </div>
            </div>
          </div>
        </Popup>
      </Marker>

      {/* End marker */}
      <Marker
        position={endCoord}
        icon={getStartEndIcon('end', routeColor, isSelected)}
        eventHandlers={{ click: handleRouteClick }}
      >
        <Popup>
          <div className="drive-popup" style={{ minWidth: '200px' }}>
            <h3 className="font-bold text-red-600 mb-2">🏁 Drive End</h3>
            
            <div className="space-y-1 text-sm">
              <div>
                <strong>Session:</strong> {driveSession.sessionName || 'Unnamed Drive'}
              </div>
              
              <div>
                <strong>Ended:</strong> {driveSession.endTime ? formatTime(driveSession.endTime) : 'Ongoing'}
              </div>
              
              <div>
                <strong>Duration:</strong> {driveSession.endTime ? formatDuration(driveSession.startTime, driveSession.endTime) : 'Ongoing'}
              </div>
              
              {driveSession.areaCovered && (
                <div>
                  <strong>Area Covered:</strong> {(Number(driveSession.areaCovered) / 1000000).toFixed(1)} km²
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-2">
                <strong>Coordinates:</strong> {endCoord[0].toFixed(6)}, {endCoord[1].toFixed(6)}
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-200">
              <button 
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                onClick={() => {
                  // TODO: View drive session details
                  console.log('View drive details:', driveSession.id);
                }}
              >
                View Session Details →
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}