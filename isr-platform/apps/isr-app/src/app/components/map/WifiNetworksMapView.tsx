import React, { useRef, useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Map as LeafletMap } from 'leaflet';
import { useNetworkStore } from '../../stores/networkStore';
import { WifiNetworkMarker } from './WifiNetworkMarker';
import { DriveRouteOverlay } from './DriveRouteOverlay';
import { NetworkFilterPanel } from '../ui/NetworkFilterPanel';
import { DriveControlPanel } from '../ui/DriveControlPanel';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { GeospatialIntelligencePanel } from '../intelligence/GeospatialIntelligencePanel';
import { SignalHeatmapOverlay } from './SignalHeatmapOverlay';

interface WifiNetworksMapViewProps {
  center?: [number, number];
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // Center of USA
const DEFAULT_ZOOM = 4;

export function WifiNetworksMapView({ center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM }: WifiNetworksMapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  const {
    networks,
    networksLoading,
    networksError,
    networkFilters,
    driveSessions,
    drivesLoading,
    drivesError,
    driveFilters,
    selectedDriveSession,
    showDriveRoutes,
    enableClustering,
    setNetworks,
    setNetworksLoading,
    setNetworksError,
    setDriveSessions,
    setDrivesLoading,
    setDrivesError,
    setSelectedDriveSession,
    setEnableClustering,
    filteredNetworks,
    filteredDriveSessions,
  } = useNetworkStore();

  // Fetch WiFi networks
  const fetchNetworks = useCallback(async (bbox?: [number, number, number, number]) => {
    setNetworksLoading(true);
    setNetworksError(null);
    
    try {
      const url = new URL('/api/wifi/networks', window.location.origin);
      url.searchParams.set('limit', '1000');
      
      if (bbox) {
        url.searchParams.set('bbox', bbox.join(','));
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setNetworks(data.networks || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch WiFi networks';
      setNetworksError(errorMessage);
      console.error('Failed to fetch networks:', error);
    } finally {
      setNetworksLoading(false);
    }
  }, [setNetworks, setNetworksLoading, setNetworksError]);

  // Fetch drive sessions
  const fetchDriveSessions = useCallback(async () => {
    setDrivesLoading(true);
    setDrivesError(null);
    
    try {
      const url = new URL('/api/drives/sessions', window.location.origin);
      url.searchParams.set('limit', '100');
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDriveSessions(data.sessions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch drive sessions';
      setDrivesError(errorMessage);
      console.error('Failed to fetch drive sessions:', error);
    } finally {
      setDrivesLoading(false);
    }
  }, [setDriveSessions, setDrivesLoading, setDrivesError]);

  // Initial data fetch
  useEffect(() => {
    fetchNetworks();
    fetchDriveSessions();
  }, [fetchNetworks, fetchDriveSessions]);

  // Update map bounds (without fetching networks automatically)
  const updateMapBounds = useCallback(() => {
    if (!mapRef.current) return;
    
    const bounds = mapRef.current.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
    ];
    
    setMapBounds(bbox);
  }, []);

  // Component to handle map events (only track bounds, don't fetch networks)
  function MapBoundsHandler() {
    useMapEvents({
      moveend: updateMapBounds,
      zoomend: updateMapBounds,
      load: updateMapBounds
    });
    return null;
  }

  // Auto-fit map to data
  useEffect(() => {
    if (!mapRef.current) return;

    const allPoints: [number, number][] = [];
    
    // Add network locations
    networks.forEach(network => {
      if (network.latitude && network.longitude) {
        allPoints.push([network.latitude, network.longitude]);
      }
    });
    
    // Add drive route points
    if (showDriveRoutes) {
      driveSessions.forEach(session => {
        if (session.startLocation) {
          allPoints.push([session.startLocation.latitude, session.startLocation.longitude]);
        }
        if (session.endLocation) {
          allPoints.push([session.endLocation.latitude, session.endLocation.longitude]);
        }
      });
    }

    if (allPoints.length > 0) {
      const lats = allPoints.map(p => p[0]);
      const lngs = allPoints.map(p => p[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      ];
      
      try {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.warn('Failed to fit bounds:', error);
      }
    }
  }, [networks, driveSessions, showDriveRoutes]);

  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, []);

  // Get filtered data - these will automatically re-run when dependencies change
  const filteredNetworksList = React.useMemo(() => filteredNetworks(), [
    networks, 
    networkFilters, 
    selectedDriveSession
  ]);
  const filteredDriveSessionsList = React.useMemo(() => filteredDriveSessions(), [
    driveSessions, 
    driveFilters
  ]);

  // Custom cluster creation function
  const createClusterCustomIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
    const sizeMap = {
      small: 30,
      medium: 40,
      large: 50
    };
    
    return new (window as any).L.DivIcon({
      html: `<div class="cluster-marker cluster-marker-${size}">
        <div class="cluster-marker-inner">
          <span class="cluster-marker-text">${count}</span>
        </div>
      </div>`,
      className: 'marker-cluster-custom',
      iconSize: [sizeMap[size], sizeMap[size]],
      iconAnchor: [sizeMap[size] / 2, sizeMap[size] / 2]
    });
  };

  return (
    <div className="relative h-screen w-screen">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        minZoom={2}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" />
        <MapBoundsHandler />
        
        {/* WiFi Network Markers */}
        {enableClustering ? (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            disableClusteringAtZoom={18}
            iconCreateFunction={createClusterCustomIcon}
          >
            {filteredNetworksList
              .filter(network => network.latitude !== null && network.longitude !== null)
              .map((network) => (
                <WifiNetworkMarker key={network.id} network={network} />
              ))}
          </MarkerClusterGroup>
        ) : (
          filteredNetworksList
            .filter(network => network.latitude !== null && network.longitude !== null)
            .map((network) => (
              <WifiNetworkMarker key={network.id} network={network} />
            ))
        )}
        
        {/* Drive Route Overlays */}
        {showDriveRoutes && (selectedDriveSession ? 
          // Show only the selected drive route when one is selected
          [selectedDriveSession].map((session) => (
            <DriveRouteOverlay
              key={session.id}
              driveSession={session}
              isSelected={true}
              onSelect={setSelectedDriveSession}
            />
          )) :
          // Show all drive routes when none is selected
          filteredDriveSessionsList.map((session) => (
            <DriveRouteOverlay
              key={session.id}
              driveSession={session}
              isSelected={false}
              onSelect={setSelectedDriveSession}
            />
          ))
        )}

        {/* Signal Strength Heatmap Overlay */}
        {showHeatmap && <SignalHeatmapOverlay data={heatmapData} visible={showHeatmap} />}
      </MapContainer>
      
      {/* Map Controls */}
      <button
        onClick={handleResetView}
        className="absolute top-4 right-20 z-[1000] bg-white hover:bg-gray-100 shadow-lg rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
        aria-label="Reset map view"
      >
        Reset View
      </button>

      {/* Clustering Toggle */}
      <button
        onClick={() => setEnableClustering(!enableClustering)}
        className={`absolute top-4 right-64 z-[1000] shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          enableClustering 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
        aria-label={enableClustering ? "Disable clustering" : "Enable clustering"}
      >
        🔗 Clustering: {enableClustering ? 'ON' : 'OFF'}
      </button>

      {/* Heatmap Toggle */}
      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        className={`absolute top-4 right-44 z-[1000] shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          showHeatmap 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
        aria-label={showHeatmap ? "Hide heatmap" : "Show heatmap"}
      >
        🔥 Heatmap: {showHeatmap ? 'ON' : 'OFF'}
      </button>

      {/* Refresh Data Button */}
      <button
        onClick={() => {
          fetchNetworks(mapBounds || undefined);
          fetchDriveSessions();
        }}
        disabled={networksLoading || drivesLoading}
        className="absolute top-4 right-32 z-[1000] bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        aria-label="Refresh data"
      >
        {(networksLoading || drivesLoading) ? '⟳' : '🔄'} Refresh
      </button>
      
      {/* Loading Indicators */}
      {(networksLoading || drivesLoading) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <LoadingSpinner size="small" />
          <span>
            Loading {networksLoading && drivesLoading ? 'networks & drives' : networksLoading ? 'networks' : 'drives'}...
          </span>
        </div>
      )}
      
      {/* Error Messages */}
      {(networksError || drivesError) && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[1000] max-w-md">
          {networksError && (
            <ErrorMessage 
              message={`Networks: ${networksError}`}
              onDismiss={() => setNetworksError(null)}
            />
          )}
          {drivesError && (
            <ErrorMessage 
              message={`Drives: ${drivesError}`}
              onDismiss={() => setDrivesError(null)}
            />
          )}
        </div>
      )}

      {/* Stats Display */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-sm">
        <div className="space-y-1">
          <div>
            <span className="font-medium">Networks:</span> {filteredNetworksList.length}
            {networks.length !== filteredNetworksList.length && (
              <span className="text-gray-500"> / {networks.length} total</span>
            )}
          </div>
          {selectedDriveSession && (
            <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200 flex items-center justify-between">
              <span>🚗 Filtering by: {selectedDriveSession.sessionName || 'Selected Drive'}</span>
              <button
                onClick={() => setSelectedDriveSession(null)}
                className="ml-2 text-blue-800 hover:text-blue-900 font-bold"
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          )}
          {showDriveRoutes && (
            <div>
              <span className="font-medium">Drives:</span> {filteredDriveSessionsList.length}
              {driveSessions.length !== filteredDriveSessionsList.length && (
                <span className="text-gray-500"> / {driveSessions.length} total</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Control Panels */}
      <NetworkFilterPanel />
      <DriveControlPanel />
      
      {/* Geospatial Intelligence Panel */}
      <GeospatialIntelligencePanel 
        mapBounds={mapBounds}
        onDataUpdate={(data) => {
          if (data.heatmapPoints) {
            setHeatmapData(data.heatmapPoints);
          }
        }}
      />
    </div>
  );
}