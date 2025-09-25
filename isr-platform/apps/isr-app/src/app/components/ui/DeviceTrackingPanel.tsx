import React, { useState, useEffect } from 'react';
import { X, MapPin, Activity, Wifi, Clock, AlertTriangle, Navigation } from 'lucide-react';

interface DeviceTrackingData {
  device: {
    mac: string;
    signatureHash: string;
    confidenceScore: number;
    ssids: string[];
  };
  relatedMacs: Array<{
    mac: string;
    confidenceScore: number;
    firstSeen: string;
    lastSeen: string;
  }>;
  locationHistory: Array<{
    mac: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    ssidsProbed: string[];
    confidenceScore: number;
  }>;
  mobilityEvents: Array<{
    fromLocation: { latitude: number; longitude: number };
    toLocation: { latitude: number; longitude: number };
    distanceMeters: number;
    speedKmh: number;
    timestamp: string;
  }>;
  totalLocations: number;
  totalEvents: number;
}

interface DeviceTrackingPanelProps {
  clientMac: string;
  onClose: () => void;
  onLocationSelect?: (lat: number, lon: number) => void;
  onSignatureSelect?: (signatureHash: string) => void;
}

export function DeviceTrackingPanel({
  clientMac,
  onClose,
  onLocationSelect,
  onSignatureSelect,
}: DeviceTrackingPanelProps) {
  const [trackingData, setTrackingData] = useState<DeviceTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoursBack, setHoursBack] = useState(168); // Default to 1 week
  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'events' | 'macs'>('overview');

  useEffect(() => {
    fetchTrackingData();
  }, [clientMac, hoursBack]);

  const fetchTrackingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/mobility/tracking/${clientMac}?hours_back=${hoursBack}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }
      const data = await response.json();
      setTrackingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!trackingData) return null;

    const totalDistance = trackingData.mobilityEvents.reduce(
      (sum, event) => sum + event.distanceMeters,
      0
    );
    const avgSpeed = trackingData.mobilityEvents.length > 0
      ? trackingData.mobilityEvents.reduce((sum, event) => sum + event.speedKmh, 0) /
        trackingData.mobilityEvents.length
      : 0;

    return {
      totalDistance: (totalDistance / 1000).toFixed(2),
      avgSpeed: avgSpeed.toFixed(1),
      uniqueLocations: trackingData.totalLocations,
      mobilityEvents: trackingData.totalEvents,
    };
  };

  const stats = calculateStats();

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-[1000] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Device Tracking</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm text-gray-300 font-mono">{clientMac}</div>
      </div>

      {/* Time Range Selector */}
      <div className="p-4 border-b">
        <label className="text-sm font-medium text-gray-700">Time Range</label>
        <select
          value={hoursBack}
          onChange={(e) => setHoursBack(Number(e.target.value))}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={24}>Last 24 Hours</option>
          <option value={72}>Last 3 Days</option>
          <option value={168}>Last Week</option>
          <option value={336}>Last 2 Weeks</option>
          <option value={720}>Last Month</option>
        </select>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading tracking data...</div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {trackingData && !loading && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'locations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Locations ({trackingData.totalLocations})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'events'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Events ({trackingData.totalEvents})
            </button>
            <button
              onClick={() => setActiveTab('macs')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'macs'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              MACs ({trackingData.relatedMacs.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="p-4 space-y-4">
                {/* Device Signature */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Device Signature</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Signature Hash:</span>
                      <button
                        onClick={() => onSignatureSelect?.(trackingData.device.signatureHash)}
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {trackingData.device.signatureHash.substring(0, 12)}...
                      </button>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Confidence:</span>
                      <span className={`font-medium ${
                        trackingData.device.confidenceScore >= 0.8 ? 'text-green-600' :
                        trackingData.device.confidenceScore >= 0.6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(trackingData.device.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    {trackingData.relatedMacs.length > 1 && (
                      <div className="mt-2 p-2 bg-yellow-100 rounded">
                        <div className="flex items-center gap-2 text-sm text-yellow-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span>MAC Randomization Detected</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                {stats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs font-medium">Total Distance</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{stats.totalDistance} km</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <Activity className="h-4 w-4" />
                        <span className="text-xs font-medium">Avg Speed</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{stats.avgSpeed} km/h</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs font-medium">Locations</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{stats.uniqueLocations}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-orange-600 mb-1">
                        <Navigation className="h-4 w-4" />
                        <span className="text-xs font-medium">Movements</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{stats.mobilityEvents}</div>
                    </div>
                  </div>
                )}

                {/* SSIDs Probed */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    SSIDs Probed
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trackingData.device.ssids.map((ssid, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                      >
                        {ssid}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'locations' && (
              <div className="divide-y">
                {trackingData.locationHistory.map((location, idx) => (
                  <div
                    key={idx}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onLocationSelect?.(location.latitude, location.longitude)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(location.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(location.timestamp).toLocaleString()}</span>
                    </div>
                    {location.ssidsProbed && location.ssidsProbed.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {location.ssidsProbed.slice(0, 3).map((ssid, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {ssid}
                          </span>
                        ))}
                        {location.ssidsProbed.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{location.ssidsProbed.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="divide-y">
                {trackingData.mobilityEvents.map((event, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {(event.distanceMeters / 1000).toFixed(2)} km
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {event.speedKmh.toFixed(1)} km/h
                      </span>
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => onLocationSelect?.(
                          event.fromLocation.latitude,
                          event.fromLocation.longitude
                        )}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600"
                      >
                        <span>From:</span>
                        <span className="font-mono">
                          {event.fromLocation.latitude.toFixed(4)}, {event.fromLocation.longitude.toFixed(4)}
                        </span>
                      </button>
                      <button
                        onClick={() => onLocationSelect?.(
                          event.toLocation.latitude,
                          event.toLocation.longitude
                        )}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600"
                      >
                        <span>To:</span>
                        <span className="font-mono">
                          {event.toLocation.latitude.toFixed(4)}, {event.toLocation.longitude.toFixed(4)}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'macs' && (
              <div className="p-4">
                {trackingData.relatedMacs.length > 1 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">MAC Randomization Detected</span>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      Multiple MAC addresses share the same device signature
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {trackingData.relatedMacs.map((mac, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        mac.mac === clientMac
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="font-mono text-sm mb-2">{mac.mac}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <span className="ml-1 font-medium">
                            {(mac.confidenceScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">First:</span>
                          <span className="ml-1">
                            {new Date(mac.firstSeen).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Last:</span>
                          <span className="ml-1">
                            {new Date(mac.lastSeen).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}