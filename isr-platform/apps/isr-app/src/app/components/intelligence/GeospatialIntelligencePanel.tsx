import React, { useState, useCallback, useEffect } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface GeospatialIntelligencePanelProps {
  mapBounds?: [number, number, number, number]; // [south, west, north, east]
  onDataUpdate?: (data: any) => void;
}

interface SignalZone {
  signal_zone: string;
  network_count: number;
  avg_signal: number;
  min_signal: number;
  max_signal: number;
}

interface DensityCell {
  lat_grid: number;
  lon_grid: number;
  wifi_devices: number;
  bluetooth_devices: number;
  total_devices: number;
}

interface WigleStats {
  requestsToday: number;
  maxRequestsPerDay: number;
  cacheHits: number;
  apiCallsRemaining: number;
}

export function GeospatialIntelligencePanel({ mapBounds, onDataUpdate }: GeospatialIntelligencePanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'coverage' | 'density' | 'wigle' | 'heatmap' | 'mobility'>('coverage');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [signalZones, setSignalZones] = useState<SignalZone[]>([]);
  const [densityGrid, setDensityGrid] = useState<DensityCell[]>([]);
  const [wigleStats, setWigleStats] = useState<WigleStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [mobilityStats, setMobilityStats] = useState<any>(null);
  const [trackingMac, setTrackingMac] = useState<string>('');

  // Track if data has been fetched for each tab to prevent refetching
  const [fetchedTabs, setFetchedTabs] = useState<Set<string>>(new Set());

  // Fetch signal coverage analysis
  const fetchSignalCoverage = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/intelligence/geospatial/coverage/signal-zones');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSignalZones(data.signalZones || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch signal coverage data';
      setError(errorMsg);
      console.error('Failed to fetch signal coverage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch device density grid
  const fetchDensityGrid = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        precision: '3',
        minDevices: '5'
      });
      
      const response = await fetch(`/api/intelligence/geospatial/density/grid?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDensityGrid(data.gridCells || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch density grid data';
      setError(errorMsg);
      console.error('Failed to fetch density grid:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Wigle stats
  const fetchWigleStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/intelligence/wigle/stats');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setWigleStats(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch Wigle stats';
      setError(errorMsg);
      console.error('Failed to fetch Wigle stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch heatmap data
  const fetchHeatmapData = useCallback(async () => {
    if (!mapBounds) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const bounds = {
        minLat: mapBounds[0],
        minLng: mapBounds[1], 
        maxLat: mapBounds[2],
        maxLng: mapBounds[3]
      };
      
      const params = new URLSearchParams({
        bounds: JSON.stringify(bounds),
        gridSize: '0.001'
      });
      
      const response = await fetch(`/api/intelligence/geospatial/heatmap/signal?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setHeatmapData(data.heatmapPoints || []);
      
      if (onDataUpdate) {
        onDataUpdate(data);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch heatmap data';
      setError(errorMsg);
      console.error('Failed to fetch heatmap data:', err);
    } finally {
      setLoading(false);
    }
  }, [mapBounds, onDataUpdate]);

  // Fetch mobility statistics
  const fetchMobilityStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mobility/analysis?type=summary&hours_back=168');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMobilityStats(data.summary);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch mobility stats';
      setError(errorMsg);
      console.error('Failed to fetch mobility stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Track a specific device
  const handleTrackDevice = useCallback(() => {
    if (!trackingMac || trackingMac.trim() === '') {
      setError('Please enter a MAC address to track');
      return;
    }

    // Open the device tracking panel by setting the tracking MAC in the parent
    const parentElement = document.querySelector('[data-tracking-mac-setter]');
    if (parentElement) {
      const event = new CustomEvent('track-device', { detail: { mac: trackingMac } });
      parentElement.dispatchEvent(event);
    }

    // For now, just show an alert that tracking has started
    alert(`Tracking initiated for device: ${trackingMac}`);
    setTrackingMac('');
  }, [trackingMac]);

  // Enrich local networks with Wigle data
  const enrichWithWigle = useCallback(async () => {
    if (!mapBounds) {
      setError('Map bounds required for Wigle enrichment');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const boundingBox = {
        minLat: mapBounds[0],
        minLng: mapBounds[1],
        maxLat: mapBounds[2], 
        maxLng: mapBounds[3]
      };

      const response = await fetch('/api/intelligence/wigle/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boundingBox })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      alert(`Enrichment completed: ${data.enriched} networks enriched, ${data.errors} errors`);
      
      // Refresh Wigle stats after enrichment
      fetchWigleStats();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to enrich with Wigle data';
      setError(errorMsg);
      console.error('Failed to enrich with Wigle:', err);
    } finally {
      setLoading(false);
    }
  }, [mapBounds, fetchWigleStats]);

  // Load initial data based on active tab (only fetch once per tab)
  useEffect(() => {
    if (!isVisible) return;

    // Check if we've already fetched this tab's data
    if (fetchedTabs.has(activeTab)) return;

    // Mark this tab as fetched
    setFetchedTabs(prev => new Set([...prev, activeTab]));

    switch (activeTab) {
      case 'coverage':
        fetchSignalCoverage();
        break;
      case 'density':
        fetchDensityGrid();
        break;
      case 'wigle':
        fetchWigleStats();
        break;
      case 'heatmap':
        fetchHeatmapData();
        break;
      case 'mobility':
        fetchMobilityStats();
        break;
    }
    // Intentionally exclude fetch functions from deps to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isVisible]);

  const getSignalZoneColor = (zone: string) => {
    if (zone.includes('Excellent')) return 'bg-green-500';
    if (zone.includes('Good')) return 'bg-blue-500';
    if (zone.includes('Fair')) return 'bg-yellow-500';
    if (zone.includes('Poor')) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`fixed top-20 left-4 z-[1000] px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${
          isVisible 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
        }`}
        title="Geospatial Intelligence"
      >
        🗺️ Intel
      </button>

      {/* Panel */}
      {isVisible && (
        <div className="fixed top-32 left-4 z-[1000] w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-purple-600 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold">Geospatial Intelligence</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:bg-purple-700 rounded px-2 py-1 text-sm"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'coverage', label: '📶 Coverage' },
              { key: 'density', label: '📍 Density' },
              { key: 'wigle', label: '🌐 Wigle' },
              { key: 'heatmap', label: '🔥 Heatmap' },
              { key: 'mobility', label: '🚶 Mobility' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 px-3 py-2 text-xs font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="small" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            )}

            {error && (
              <ErrorMessage 
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {!loading && !error && (
              <>
                {/* Coverage Analysis Tab */}
                {activeTab === 'coverage' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Signal Coverage Zones</h4>
                    <div className="space-y-2">
                      {signalZones.map((zone, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getSignalZoneColor(zone.signal_zone)}`}></div>
                              <span className="text-sm font-medium">{zone.signal_zone}</span>
                            </div>
                            <span className="text-sm text-gray-600">{zone.network_count} networks</span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Avg: {zone.avg_signal} dBm | Range: {zone.min_signal} to {zone.max_signal} dBm
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Density Grid Tab */}
                {activeTab === 'density' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Device Density Grid</h4>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                      {densityGrid.slice(0, 20).map((cell, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">
                              {cell.lat_grid.toFixed(3)}, {cell.lon_grid.toFixed(3)}
                            </span>
                            <span className="text-purple-600 font-semibold">
                              {cell.total_devices} total
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            WiFi: {cell.wifi_devices} | BT: {cell.bluetooth_devices}
                          </div>
                        </div>
                      ))}
                    </div>
                    {densityGrid.length > 20 && (
                      <div className="text-xs text-gray-500 text-center">
                        Showing top 20 of {densityGrid.length} grid cells
                      </div>
                    )}
                  </div>
                )}

                {/* Wigle Integration Tab */}
                {activeTab === 'wigle' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Wigle API Integration</h4>
                    
                    {wigleStats && (
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Requests Today:</span>
                              <span className="font-medium">
                                {wigleStats.requestsToday}/{wigleStats.maxRequestsPerDay}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cache Hits:</span>
                              <span className="font-medium text-green-600">{wigleStats.cacheHits}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Remaining:</span>
                              <span className={`font-medium ${
                                wigleStats.apiCallsRemaining > 5 ? 'text-green-600' : 
                                wigleStats.apiCallsRemaining > 0 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {wigleStats.apiCallsRemaining}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={enrichWithWigle}
                          disabled={loading || wigleStats.apiCallsRemaining === 0}
                          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                        >
                          {loading ? 'Enriching...' : 'Enrich with Wigle Data'}
                        </button>

                        {wigleStats.apiCallsRemaining === 0 && (
                          <div className="text-xs text-red-600 text-center">
                            Daily API limit reached. Using cached data only.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Heatmap Tab */}
                {activeTab === 'heatmap' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Signal Strength Heatmap</h4>
                    
                    <button
                      onClick={fetchHeatmapData}
                      disabled={loading || !mapBounds}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {loading ? 'Generating...' : 'Generate Heatmap'}
                    </button>

                    {!mapBounds && (
                      <div className="text-xs text-gray-500 text-center">
                        Move the map to set bounds for heatmap generation
                      </div>
                    )}

                    {heatmapData.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm">
                          <div className="font-medium">Heatmap Data Points: {heatmapData.length}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Signal range: {Math.min(...heatmapData.map(p => p.min_signal))} to{' '}
                            {Math.max(...heatmapData.map(p => p.max_signal))} dBm
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobility Tab */}
                {activeTab === 'mobility' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Client Mobility Tracking</h4>

                    {mobilityStats && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xs text-blue-600 font-medium">Signatures</div>
                          <div className="text-xl font-bold text-gray-900">{mobilityStats.totalSignatures}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-green-600 font-medium">Active Devices</div>
                          <div className="text-xl font-bold text-gray-900">{mobilityStats.activeDevices}</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-xs text-purple-600 font-medium">Mobility Events</div>
                          <div className="text-xl font-bold text-gray-900">{mobilityStats.totalMobilityEvents}</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                          <div className="text-xs text-orange-600 font-medium">Randomized</div>
                          <div className="text-xl font-bold text-gray-900">{mobilityStats.randomizedDevices}</div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Track Device by MAC</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={trackingMac}
                          onChange={(e) => setTrackingMac(e.target.value)}
                          placeholder="AA:BB:CC:DD:EE:FF"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={handleTrackDevice}
                          disabled={!trackingMac.trim()}
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Track
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Tracks device movement across locations</p>
                      <p>• Detects MAC address randomization</p>
                      <p>• Analyzes movement patterns and speed</p>
                      <p>• Identifies frequently visited hotspots</p>
                    </div>

                    <button
                      onClick={fetchMobilityStats}
                      disabled={loading}
                      className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {loading ? 'Refreshing...' : 'Refresh Stats'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}