import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMapEvents, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Card } from '../ui/Card';

// RFSENSOR device interface
interface RFSensorDevice {
  id: string;
  key: string;
  phyname: string;
  type: string;
  firstTime?: string;
  lastTime?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  frequency?: number;
  channel?: string;
  signalData?: any;
  sightingsCount: number;
  latestSightings: Array<{
    timestamp: string;
    latitude?: number;
    longitude?: number;
    signalStrength?: number;
  }>;
}

interface RFSensorStats {
  totalDevices: number;
  devicesWithLocation: number;
  devicesWithSightings: number;
  locationCoverage: number;
  sightingsCoverage: number;
  collectionPeriod: {
    startTime?: string;
    endTime?: string;
    durationDays: number;
  };
  signalData: {
    devicesWithSignalData: number;
    averageStrongestSignal?: number;
    minStrongestSignal?: number;
    maxStrongestSignal?: number;
  };
}

interface TemporalData {
  timeBucket: string;
  deviceCount: number;
  firstActivity?: string;
  lastActivity?: string;
}

interface GeographicCluster {
  deviceCount: number;
  centerLatitude: number;
  centerLongitude: number;
  deviceIds: string[];
  deviceKeys: string[];
  earliestActivity?: string;
  latestActivity?: string;
  bounds: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  };
}

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

// Custom icon for RFSENSOR devices
const rfSensorIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff6b6b">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 10v6m11-7h-6m-10 0H1"/>
      <circle cx="12" cy="12" r="8" fill="none" stroke="#ff6b6b" stroke-width="1"/>
      <circle cx="12" cy="12" r="12" fill="none" stroke="#ff6b6b" stroke-width="0.5"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Map component for handling map events
function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: [number, number, number, number]) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast(),
      ];
      onBoundsChange(bbox);
    },
  });
  return null;
}

export const RFSensorPage: React.FC = () => {
  const [devices, setDevices] = useState<RFSensorDevice[]>([]);
  const [stats, setStats] = useState<RFSensorStats | null>(null);
  const [temporalData, setTemporalData] = useState<TemporalData[]>([]);
  const [clusters, setClusters] = useState<GeographicCluster[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<RFSensorDevice | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'temporal' | 'geographic' | 'devices'>('overview');
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);

  // Fetch RFSENSOR data
  const fetchDevices = useCallback(async (bbox?: [number, number, number, number]) => {
    try {
      setLoading(true);
      const url = new URL('/api/rfsensor/devices', window.location.origin);
      url.searchParams.set('limit', '1000');
      
      if (bbox) {
        url.searchParams.set('bbox', bbox.join(','));
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch RFSENSOR devices: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDevices(data.devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/rfsensor/stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch temporal analysis
  const fetchTemporalData = useCallback(async (groupBy: 'hour' | 'day' | 'week' = 'day') => {
    try {
      const url = new URL('/api/rfsensor/temporal', window.location.origin);
      url.searchParams.set('group_by', groupBy);
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch temporal data: ${response.statusText}`);
      }
      const data = await response.json();
      setTemporalData(data.temporalData);
    } catch (err) {
      console.error('Failed to fetch temporal data:', err);
    }
  }, []);

  // Fetch geographic clusters
  const fetchClusters = useCallback(async () => {
    try {
      const url = new URL('/api/rfsensor/geographic', window.location.origin);
      url.searchParams.set('cluster_radius', '1');
      url.searchParams.set('min_devices', '2');
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch clusters: ${response.statusText}`);
      }
      const data = await response.json();
      setClusters(data.clusters);
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchStats();
    fetchTemporalData();
    fetchClusters();
  }, [fetchDevices, fetchStats, fetchTemporalData, fetchClusters]);

  const handleBoundsChange = useCallback((bounds: [number, number, number, number]) => {
    setMapBounds(bounds);
    fetchDevices(bounds);
  }, [fetchDevices]);

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  // Format duration
  const formatDuration = (days: number) => {
    if (days === 0) return 'Less than 1 day';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  if (loading && devices.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <LoadingSpinner message="Loading RFSENSOR data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] p-4">
        <ErrorMessage message={error} onRetry={() => fetchDevices()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#EAEAEA]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#121212] p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-[#00BFFF] mb-2">🎯 RFSENSOR Intelligence</h1>
          <p className="text-[#CCCCCC]">
            RF sensor analysis and signals intelligence dashboard
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-800 bg-[#121212]">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {(['overview', 'temporal', 'geographic', 'devices'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-3 font-medium transition-colors capitalize ${
                  activeView === view
                    ? 'text-[#00BFFF] border-b-2 border-[#00BFFF]'
                    : 'text-[#CCCCCC] hover:text-[#00BFFF]'
                }`}
              >
                {view === 'overview' && '📊 Overview'}
                {view === 'temporal' && '⏰ Temporal'}
                {view === 'geographic' && '🗺️ Geographic'}
                {view === 'devices' && '📡 Devices'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#1a1a1a] border-gray-700">
                  <div className="p-4">
                    <div className="text-2xl font-bold text-[#00BFFF]">
                      {stats.totalDevices.toLocaleString()}
                    </div>
                    <div className="text-sm text-[#CCCCCC]">Total RF Sensors</div>
                  </div>
                </Card>
                
                <Card className="bg-[#1a1a1a] border-gray-700">
                  <div className="p-4">
                    <div className="text-2xl font-bold text-[#10B981]">
                      {stats.locationCoverage}%
                    </div>
                    <div className="text-sm text-[#CCCCCC]">
                      Location Coverage ({stats.devicesWithLocation} devices)
                    </div>
                  </div>
                </Card>
                
                <Card className="bg-[#1a1a1a] border-gray-700">
                  <div className="p-4">
                    <div className="text-2xl font-bold text-[#F59E0B]">
                      {formatDuration(stats.collectionPeriod.durationDays)}
                    </div>
                    <div className="text-sm text-[#CCCCCC]">Collection Period</div>
                  </div>
                </Card>
                
                <Card className="bg-[#1a1a1a] border-gray-700">
                  <div className="p-4">
                    <div className="text-2xl font-bold text-[#8B5CF6]">
                      {clusters.length}
                    </div>
                    <div className="text-sm text-[#CCCCCC]">Geographic Clusters</div>
                  </div>
                </Card>
              </div>
            )}

            {/* Map Overview */}
            <Card className="bg-[#1a1a1a] border-gray-700">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4 text-[#EAEAEA]">Geographic Distribution</h2>
                <div className="h-96 rounded-lg overflow-hidden">
                  <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    className="h-full w-full"
                    zoomControl={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <ZoomControl position="topright" />
                    <MapEvents onBoundsChange={handleBoundsChange} />
                    
                    <MarkerClusterGroup>
                      {devices
                        .filter(device => device.latitude && device.longitude)
                        .map((device) => (
                          <Marker
                            key={device.id}
                            position={[device.latitude!, device.longitude!]}
                            icon={rfSensorIcon}
                          >
                            <Popup>
                              <div className="text-sm">
                                <div className="font-semibold">{device.key}</div>
                                <div>Type: {device.type}</div>
                                <div>First: {formatDate(device.firstTime)}</div>
                                <div>Last: {formatDate(device.lastTime)}</div>
                                {device.frequency && (
                                  <div>Frequency: {device.frequency} Hz</div>
                                )}
                                <div>Sightings: {device.sightingsCount}</div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                    </MarkerClusterGroup>
                  </MapContainer>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Temporal Tab */}
        {activeView === 'temporal' && (
          <div className="space-y-6">
            <Card className="bg-[#1a1a1a] border-gray-700">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4 text-[#EAEAEA]">Temporal Activity Analysis</h2>
                {temporalData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {temporalData.slice(0, 10).map((data, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-[#262626] rounded">
                          <div>
                            <div className="text-[#EAEAEA] font-medium">{data.timeBucket}</div>
                            <div className="text-sm text-[#CCCCCC]">
                              {formatDate(data.firstActivity)} - {formatDate(data.lastActivity)}
                            </div>
                          </div>
                          <div className="text-[#00BFFF] font-bold text-lg">
                            {data.deviceCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[#CCCCCC]">No temporal data available</div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Geographic Tab */}
        {activeView === 'geographic' && (
          <div className="space-y-6">
            <Card className="bg-[#1a1a1a] border-gray-700">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4 text-[#EAEAEA]">Geographic Clusters</h2>
                {clusters.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {clusters.map((cluster, index) => (
                      <div key={index} className="p-4 bg-[#262626] rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-[#00BFFF] font-semibold">
                            Cluster {index + 1}
                          </div>
                          <div className="text-[#EAEAEA] font-bold">
                            {cluster.deviceCount} devices
                          </div>
                        </div>
                        <div className="text-sm text-[#CCCCCC] space-y-1">
                          <div>
                            Center: {cluster.centerLatitude.toFixed(6)}, {cluster.centerLongitude.toFixed(6)}
                          </div>
                          {cluster.earliestActivity && (
                            <div>First Activity: {formatDate(cluster.earliestActivity)}</div>
                          )}
                          {cluster.latestActivity && (
                            <div>Last Activity: {formatDate(cluster.latestActivity)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#CCCCCC]">No geographic clusters found</div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Devices Tab */}
        {activeView === 'devices' && (
          <div className="space-y-6">
            <Card className="bg-[#1a1a1a] border-gray-700">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4 text-[#EAEAEA]">RFSENSOR Device List</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-700">
                      <tr className="text-left">
                        <th className="p-2 text-[#CCCCCC]">Device Key</th>
                        <th className="p-2 text-[#CCCCCC]">First Seen</th>
                        <th className="p-2 text-[#CCCCCC]">Last Seen</th>
                        <th className="p-2 text-[#CCCCCC]">Location</th>
                        <th className="p-2 text-[#CCCCCC]">Frequency</th>
                        <th className="p-2 text-[#CCCCCC]">Sightings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map((device) => (
                        <tr
                          key={device.id}
                          className="border-b border-gray-800 hover:bg-[#262626] cursor-pointer"
                          onClick={() => setSelectedDevice(device)}
                        >
                          <td className="p-2 text-[#00BFFF] font-mono text-xs">
                            {device.key}
                          </td>
                          <td className="p-2 text-[#EAEAEA]">
                            {formatDate(device.firstTime)}
                          </td>
                          <td className="p-2 text-[#EAEAEA]">
                            {formatDate(device.lastTime)}
                          </td>
                          <td className="p-2 text-[#EAEAEA]">
                            {device.latitude && device.longitude
                              ? `${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}`
                              : 'No location'}
                          </td>
                          <td className="p-2 text-[#EAEAEA]">
                            {device.frequency || 'Unknown'}
                          </td>
                          <td className="p-2 text-[#EAEAEA]">
                            {device.sightingsCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[#EAEAEA]">Device Details</h3>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-[#CCCCCC] hover:text-[#EAEAEA]"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[#CCCCCC]">Device Key:</div>
                  <div className="text-[#00BFFF] font-mono">{selectedDevice.key}</div>
                </div>
                <div>
                  <div className="text-[#CCCCCC]">Type:</div>
                  <div className="text-[#EAEAEA]">{selectedDevice.type}</div>
                </div>
                <div>
                  <div className="text-[#CCCCCC]">First Seen:</div>
                  <div className="text-[#EAEAEA]">{formatDate(selectedDevice.firstTime)}</div>
                </div>
                <div>
                  <div className="text-[#CCCCCC]">Last Seen:</div>
                  <div className="text-[#EAEAEA]">{formatDate(selectedDevice.lastTime)}</div>
                </div>
                <div>
                  <div className="text-[#CCCCCC]">Location:</div>
                  <div className="text-[#EAEAEA]">
                    {selectedDevice.latitude && selectedDevice.longitude
                      ? `${selectedDevice.latitude.toFixed(6)}, ${selectedDevice.longitude.toFixed(6)}`
                      : 'No location data'}
                  </div>
                </div>
                <div>
                  <div className="text-[#CCCCCC]">Frequency:</div>
                  <div className="text-[#EAEAEA]">{selectedDevice.frequency || 'Unknown'}</div>
                </div>
              </div>
              
              {selectedDevice.signalData && (
                <div>
                  <div className="text-[#CCCCCC] mb-2">Signal Data:</div>
                  <pre className="bg-[#262626] p-3 rounded text-xs text-[#EAEAEA] overflow-x-auto">
                    {JSON.stringify(selectedDevice.signalData, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedDevice.latestSightings.length > 0 && (
                <div>
                  <div className="text-[#CCCCCC] mb-2">Latest Sightings:</div>
                  <div className="space-y-2">
                    {selectedDevice.latestSightings.slice(0, 5).map((sighting, index) => (
                      <div key={index} className="bg-[#262626] p-2 rounded text-xs">
                        <div className="text-[#EAEAEA]">{formatDate(sighting.timestamp)}</div>
                        {sighting.latitude && sighting.longitude && (
                          <div className="text-[#CCCCCC]">
                            {sighting.latitude.toFixed(6)}, {sighting.longitude.toFixed(6)}
                          </div>
                        )}
                        {sighting.signalStrength && (
                          <div className="text-[#CCCCCC]">Signal: {sighting.signalStrength} dBm</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};