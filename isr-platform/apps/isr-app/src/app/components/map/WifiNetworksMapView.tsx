import React, { useRef, useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { useNetworkStore } from '../../stores/networkStore';
import { WifiNetworkMarker } from './WifiNetworkMarker';
import { DriveRouteOverlay } from './DriveRouteOverlay';
import { NetworkFilterPanel } from '../ui/NetworkFilterPanel';
import { NetworkDetailPanel } from '../ui/NetworkDetailPanel';
import { ClusterContentPanel } from '../ui/ClusterContentPanel';
import { DriveControlPanel } from '../ui/DriveControlPanel';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { GeospatialIntelligencePanel } from '../intelligence/GeospatialIntelligencePanel';
import { SignalHeatmapOverlay } from './SignalHeatmapOverlay';
import { MobilityMapView } from './MobilityMapView';
import { DeviceTrackingPanel } from '../ui/DeviceTrackingPanel';

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
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [showMobilityLayer, setShowMobilityLayer] = useState(false);
  const [showMobilityHotspots, setShowMobilityHotspots] = useState(false);
  const [trackingClientMac, setTrackingClientMac] = useState<string | null>(null);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  
  const {
    networks,
    networksLoading,
    networksError,
    networkFilters,
    driveSessions,
    driveSessionNetworks,
    drivesLoading,
    drivesError,
    driveFilters,
    selectedDriveSession,
    showDriveRoutes,
    enableClustering,
    showNetworkDetailPanel,
    networkDetailPanelNetwork,
    showClusterContentPanel,
    clusterContentNetworks,
    closeNetworkDetailPanel,
    openClusterContentPanel,
    closeClusterContentPanel,
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

  // Handle device tracking event from GeospatialIntelligencePanel
  useEffect(() => {
    const handleTrackDevice = (event: CustomEvent) => {
      const { mac } = event.detail;
      setTrackingClientMac(mac);
      setShowMobilityLayer(true);
    };

    const element = document.querySelector('[data-tracking-mac-setter]');
    if (element) {
      element.addEventListener('track-device', handleTrackDevice as EventListener);
      return () => {
        element.removeEventListener('track-device', handleTrackDevice as EventListener);
      };
    }
  }, []);

  // Fetch WiFi networks with zoom-based limits
  const fetchNetworks = useCallback(async (bbox?: [number, number, number, number]) => {
    // Prevent concurrent fetches
    if (isFetching) {
      console.log('Skipping fetch - already in progress');
      return;
    }

    // Check minimum zoom level (don't fetch data when zoomed out too far)
    if (mapRef.current && mapRef.current.getZoom() < 6) {
      console.log('Zoom level too low for data fetching');
      setNetworks([]); // Clear networks when zoomed out
      return;
    }

    setIsFetching(true);
    setNetworksLoading(true);
    setNetworksError(null);

    try {
      const url = new URL('/api/wifi/networks', window.location.origin);

      // Determine limit based on zoom level if map is available
      let limit = 10000;
      if (mapRef.current) {
        const zoom = mapRef.current.getZoom();
        if (zoom < 8) {
          limit = 300; // Very low data at low zoom
        } else if (zoom < 10) {
          limit = 1000; // Medium zoom
        } else if (zoom < 12) {
          limit = 2000; // Higher zoom
        } else {
          limit = 3000; // High zoom: more detail but still controlled
        }
      }

      url.searchParams.set('limit', limit.toString());

      if (bbox) {
        url.searchParams.set('bbox', bbox.join(','));
      }
      
      // Add client filtering parameters
      if (networkFilters.hasClients !== undefined) {
        url.searchParams.set('has_clients', networkFilters.hasClients.toString());
      }
      
      if (networkFilters.minClients) {
        url.searchParams.set('min_clients', networkFilters.minClients.toString());
      }
      
      // Add other existing filters
      if (networkFilters.securityType) {
        url.searchParams.set('security_type', networkFilters.securityType);
      }
      
      if (networkFilters.minSignalStrength) {
        url.searchParams.set('min_signal_strength', networkFilters.minSignalStrength.toString());
      }
      
      if (networkFilters.maxSignalStrength) {
        url.searchParams.set('max_signal_strength', networkFilters.maxSignalStrength.toString());
      }
      
      if (networkFilters.channel) {
        url.searchParams.set('channel', networkFilters.channel.toString());
      }
      
      if (networkFilters.vendor) {
        url.searchParams.set('vendor', networkFilters.vendor);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setNetworks(data.networks || []);
      setHasInitialLoad(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch WiFi networks';
      setNetworksError(errorMessage);
      console.error('Failed to fetch networks:', error);
    } finally {
      setNetworksLoading(false);
      setIsFetching(false);
    }
  }, [isFetching, setNetworks, setNetworksLoading, setNetworksError, networkFilters]);

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

  // Initial data fetch - only fetch drive sessions on mount
  useEffect(() => {
    fetchDriveSessions();

    // Cleanup function to clear any pending timeouts
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchDriveSessions]);

  // Debounced fetch function for viewport-based loading
  const debouncedFetchNetworks = useCallback((bbox: [number, number, number, number]) => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set a new timeout for debounced fetching
    fetchTimeoutRef.current = setTimeout(() => {
      fetchNetworks(bbox);
    }, 1500); // Increased to 1.5 second debounce delay to prevent rapid fetching
  }, [fetchNetworks]);

  // Update map bounds and trigger debounced network fetch
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

    // Trigger debounced network fetch with current viewport
    debouncedFetchNetworks(bbox);
  }, [debouncedFetchNetworks]);

  // Component to handle map events and trigger viewport-based fetching
  function MapBoundsHandler() {
    const map = useMapEvents({
      moveend: updateMapBounds,
      zoomend: updateMapBounds
    });

    // Trigger initial fetch when component mounts and map is ready
    useEffect(() => {
      // Only fetch if we haven't done initial load and zoom is sufficient
      if (!hasInitialLoad && map && map.getZoom() >= 6) {
        updateMapBounds();
      }
    }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

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
    selectedDriveSession,
    driveSessionNetworks
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

  // Handle cluster click to show bottom panel with cluster contents
  const handleClusterClick = useCallback((event: any) => {
    const cluster = event.layer || event.target;
    if (!cluster || !cluster.getAllChildMarkers) return;
    
    const clusterMarkers = cluster.getAllChildMarkers();
    const clusterNetworks: any[] = [];
    
    // Extract networks from markers
    clusterMarkers.forEach((marker: any) => {
      // Try different ways to get the network ID
      const markerId = marker.options?.alt || 
                      marker.options?.title || 
                      marker._myIcon?.options?.alt ||
                      marker._myIcon?.options?.title;
      
      if (markerId) {
        const network = filteredNetworksList.find(n => n.id === markerId);
        if (network) {
          clusterNetworks.push(network);
        }
      }
    });
    
    // Fallback: if we can't match markers to networks, use position-based matching
    if (clusterNetworks.length === 0) {
      const clusterBounds = cluster.getBounds();
      const networksInBounds = filteredNetworksList.filter(network => {
        if (network.latitude === null || network.longitude === null) return false;
        return clusterBounds.contains([network.latitude, network.longitude]);
      });
      clusterNetworks.push(...networksInBounds);
    }
    
    if (clusterNetworks.length > 0) {
      openClusterContentPanel(clusterNetworks);
    }
  }, [filteredNetworksList, openClusterContentPanel]);

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
        preferCanvas={true}
        renderer={L.canvas({ padding: 0.5 })}
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
            chunkInterval={200}
            chunkDelay={50}
            maxClusterRadius={80}
            disableClusteringAtZoom={18}
            iconCreateFunction={createClusterCustomIcon}
            spiderfyOnMaxZoom={false}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={false}
            spiderfyDistanceMultiplier={2}
            removeOutsideVisibleBounds={true}
            eventHandlers={{
              clusterclick: handleClusterClick,
            }}
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

        {/* Mobility Layer */}
        {showMobilityLayer && (
          <MobilityMapView
            selectedSignature={selectedSignature}
            selectedMac={trackingClientMac}
            showPaths={true}
            showHotspots={showMobilityHotspots}
            hoursBack={168}
          />
        )}
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

      {/* Mobility Layer Toggle */}
      <button
        onClick={() => setShowMobilityLayer(!showMobilityLayer)}
        className={`absolute top-16 right-64 z-[1000] shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          showMobilityLayer
            ? 'bg-purple-500 hover:bg-purple-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
        aria-label={showMobilityLayer ? "Hide mobility tracking" : "Show mobility tracking"}
      >
        📍 Mobility: {showMobilityLayer ? 'ON' : 'OFF'}
      </button>

      {/* Mobility Hotspots Toggle (only shown when mobility layer is active) */}
      {showMobilityLayer && (
        <button
          onClick={() => setShowMobilityHotspots(!showMobilityHotspots)}
          className={`absolute top-16 right-44 z-[1000] shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showMobilityHotspots
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          aria-label={showMobilityHotspots ? "Hide hotspots" : "Show hotspots"}
        >
          🎯 Hotspots: {showMobilityHotspots ? 'ON' : 'OFF'}
        </button>
      )}


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
          {mapRef.current && mapRef.current.getZoom() < 6 && (
            <div className="text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
              ⚠️ Zoom in to load network data
            </div>
          )}
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
      <div data-tracking-mac-setter>
        <GeospatialIntelligencePanel
          mapBounds={mapBounds}
          onDataUpdate={(data) => {
            if (data.heatmapPoints) {
              setHeatmapData(data.heatmapPoints);
            }
          }}
        />
      </div>

      {/* Network Detail Panel */}
      <NetworkDetailPanel
        network={networkDetailPanelNetwork}
        isOpen={showNetworkDetailPanel}
        onClose={closeNetworkDetailPanel}
      />

      {/* Cluster Content Panel */}
      <ClusterContentPanel
        networks={clusterContentNetworks}
        isOpen={showClusterContentPanel}
        onClose={closeClusterContentPanel}
      />

      {/* Device Tracking Panel */}
      {trackingClientMac && (
        <DeviceTrackingPanel
          clientMac={trackingClientMac}
          onClose={() => setTrackingClientMac(null)}
          onLocationSelect={(lat, lon) => {
            if (mapRef.current) {
              mapRef.current.setView([lat, lon], 16);
            }
          }}
          onSignatureSelect={(signatureHash) => {
            setSelectedSignature(signatureHash);
            setShowMobilityLayer(true);
          }}
        />
      )}
    </div>
  );
}