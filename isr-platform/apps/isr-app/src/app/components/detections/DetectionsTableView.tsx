import React, { useState, useEffect, useMemo } from 'react';
import { ApiService } from '../../services/ApiService';

// Unified Detection Interface
export interface UnifiedDetection {
  id: string;
  type: 'wifi_network' | 'wifi_client' | 'rf_sensor' | 'probe_request';
  identifier: string; // BSSID, client MAC, device key, etc.
  name?: string; // SSID, device name, etc.
  vendor?: string;
  signalStrength?: number;
  channel?: string | number;
  frequency?: number;
  latitude?: number;
  longitude?: number;
  firstSeen: string;
  lastSeen: string;
  timesSeen?: number;
  security?: string;
  clientCount?: number;
  metadata?: Record<string, any>;
}

export interface DetectionFilters {
  search: string;
  type: string;
  dateFrom?: string;
  dateTo?: string;
  minSignal?: number;
  maxSignal?: number;
  hasLocation?: string;
  vendor?: string;
}

const DETECTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'wifi_network', label: 'WiFi Networks' },
  { value: 'wifi_client', label: 'WiFi Clients' },
  { value: 'rf_sensor', label: 'RF Sensors' },
  { value: 'probe_request', label: 'Probe Requests' },
];

export const DetectionsTableView: React.FC = () => {
  const [detections, setDetections] = useState<UnifiedDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DetectionFilters>({
    search: '',
    type: '',
    hasLocation: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState<keyof UnifiedDetection>('lastSeen');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Fetch all detection data
  const fetchAllDetections = async (): Promise<UnifiedDetection[]> => {
    const allDetections: UnifiedDetection[] = [];
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

    try {
      // Fetch WiFi Networks
      if (!filters.type || filters.type === 'wifi_network') {
        const wifiNetworksResponse = await fetch(`${baseUrl}/wifi/networks?limit=5000`);
        if (wifiNetworksResponse.ok) {
          const wifiData = await wifiNetworksResponse.json();
          const wifiNetworks: UnifiedDetection[] = wifiData.networks.map((network: any) => ({
            id: network.id,
            type: 'wifi_network' as const,
            identifier: network.bssid,
            name: network.ssid || 'Hidden Network',
            vendor: network.vendor,
            signalStrength: network.signalStrength,
            channel: network.channel,
            frequency: network.frequency,
            latitude: network.latitude,
            longitude: network.longitude,
            firstSeen: network.firstSeen,
            lastSeen: network.lastSeen,
            timesSeen: network.timesSeen,
            security: network.securityType,
            clientCount: network.clientCount,
            metadata: {
              encryption: network.encryption,
            },
          }));
          allDetections.push(...wifiNetworks);
        }
      }

      // Fetch WiFi Clients
      if (!filters.type || filters.type === 'wifi_client') {
        const wifiClientsResponse = await fetch(`${baseUrl}/wifi/clients?limit=5000`);
        if (wifiClientsResponse.ok) {
          const clientData = await wifiClientsResponse.json();
          const wifiClients: UnifiedDetection[] = clientData.clients.map((client: any) => ({
            id: client.id,
            type: 'wifi_client' as const,
            identifier: client.clientMac,
            vendor: client.vendor,
            latitude: client.latitude,
            longitude: client.longitude,
            firstSeen: client.firstSeen,
            lastSeen: client.lastSeen,
            metadata: {
              clientType: client.clientType,
              packetsTotal: client.packetsTotal,
              dataBytes: client.dataBytes,
              network: client.network,
            },
          }));
          allDetections.push(...wifiClients);
        }
      }

      // Fetch RF Sensors
      if (!filters.type || filters.type === 'rf_sensor') {
        const rfSensorResponse = await fetch(`${baseUrl}/rfsensor/devices?limit=5000`);
        if (rfSensorResponse.ok) {
          const sensorData = await rfSensorResponse.json();
          const rfSensors: UnifiedDetection[] = sensorData.devices.map((device: any) => ({
            id: device.id,
            type: 'rf_sensor' as const,
            identifier: device.key,
            name: `${device.type} - ${device.basicType}`,
            channel: device.channel,
            frequency: device.frequency,
            latitude: device.latitude,
            longitude: device.longitude,
            firstSeen: device.firstTime,
            lastSeen: device.lastTime,
            metadata: {
              phyname: device.phyname,
              signalData: device.signalData,
              sightingsCount: device.sightingsCount,
            },
          }));
          allDetections.push(...rfSensors);
        }
      }

      // Fetch Probe Requests
      if (!filters.type || filters.type === 'probe_request') {
        const probeResponse = await fetch(`${baseUrl}/wifi/probes?limit=1000`);
        if (probeResponse.ok) {
          const probeData = await probeResponse.json();
          const probeRequests: UnifiedDetection[] = probeData.probes.map((probe: any) => ({
            id: probe.id,
            type: 'probe_request' as const,
            identifier: probe.clientMac,
            name: probe.ssid || 'Broadcast Probe',
            vendor: probe.vendor,
            signalStrength: probe.signalStrength,
            channel: probe.channel,
            latitude: probe.latitude,
            longitude: probe.longitude,
            firstSeen: probe.timestamp,
            lastSeen: probe.timestamp,
            metadata: {
              isBroadcast: probe.isBroadcast,
              dot11Info: probe.dot11Info,
            },
          }));
          allDetections.push(...probeRequests);
        }
      }

      return allDetections;
    } catch (err) {
      console.error('Error fetching detections:', err);
      throw err;
    }
  };

  const loadDetections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllDetections();
      setDetections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetections();
  }, [filters.type]);

  // Apply client-side filtering and sorting
  const filteredAndSortedDetections = useMemo(() => {
    let filtered = detections;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(detection => 
        detection.identifier.toLowerCase().includes(searchLower) ||
        detection.name?.toLowerCase().includes(searchLower) ||
        detection.vendor?.toLowerCase().includes(searchLower)
      );
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(detection => 
        new Date(detection.firstSeen) >= new Date(filters.dateFrom!)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(detection => 
        new Date(detection.lastSeen) <= new Date(filters.dateTo!)
      );
    }

    // Signal strength filters
    if (filters.minSignal !== undefined) {
      filtered = filtered.filter(detection => 
        detection.signalStrength !== undefined && detection.signalStrength >= filters.minSignal!
      );
    }
    if (filters.maxSignal !== undefined) {
      filtered = filtered.filter(detection => 
        detection.signalStrength !== undefined && detection.signalStrength <= filters.maxSignal!
      );
    }

    // Location filter
    if (filters.hasLocation === 'true') {
      filtered = filtered.filter(detection => 
        detection.latitude !== undefined && detection.longitude !== undefined &&
        detection.latitude !== null && detection.longitude !== null
      );
    } else if (filters.hasLocation === 'false') {
      filtered = filtered.filter(detection => 
        detection.latitude === undefined || detection.longitude === undefined ||
        detection.latitude === null || detection.longitude === null
      );
    }

    // Vendor filter
    if (filters.vendor) {
      const vendorLower = filters.vendor.toLowerCase();
      filtered = filtered.filter(detection => 
        detection.vendor?.toLowerCase().includes(vendorLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      if (sortColumn === 'firstSeen' || sortColumn === 'lastSeen') {
        const aTime = new Date(aVal as string).getTime();
        const bTime = new Date(bVal as string).getTime();
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [detections, filters, sortColumn, sortDirection]);

  // Pagination
  const paginatedDetections = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedDetections.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedDetections, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedDetections.length / pageSize);

  const handleSort = (column: keyof UnifiedDetection) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wifi_network': return '📶';
      case 'wifi_client': return '📱';
      case 'rf_sensor': return '🎯';
      case 'probe_request': return '🔍';
      default: return '📡';
    }
  };

  const getTypeLabel = (type: string) => {
    const typeObj = DETECTION_TYPES.find(t => t.value === type);
    return typeObj?.label || type;
  };

  if (loading) {
    return (
      <div className="bg-[#121212] text-[#EAEAEA] p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl">Loading detections...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#121212] text-[#EAEAEA] p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400 text-xl">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] text-[#EAEAEA] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">All Detections</h1>
        
        {/* Search and Quick Filters */}
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Search detections..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
          />
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
          >
            {DETECTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            {showFilters ? 'Hide Filters' : 'More Filters'}
          </button>
          
          <button
            onClick={loadDetections}
            className="px-4 py-2 bg-[#00BFFF] hover:bg-[#0099CC] text-white rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-gray-800 p-4 rounded-md mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <input
                type="datetime-local"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <input
                type="datetime-local"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Has Location</label>
              <select
                value={filters.hasLocation || 'all'}
                onChange={(e) => setFilters({ ...filters, hasLocation: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
              >
                <option value="all">All</option>
                <option value="true">With Location</option>
                <option value="false">Without Location</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Signal (dBm)</label>
              <input
                type="number"
                value={filters.minSignal || ''}
                onChange={(e) => setFilters({ ...filters, minSignal: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Signal (dBm)</label>
              <input
                type="number"
                value={filters.maxSignal || ''}
                onChange={(e) => setFilters({ ...filters, maxSignal: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <input
                type="text"
                placeholder="Filter by vendor..."
                value={filters.vendor || ''}
                onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="text-sm text-gray-400 mb-4">
          Showing {paginatedDetections.length} of {filteredAndSortedDetections.length} detections
          {filteredAndSortedDetections.length !== detections.length && ` (filtered from ${detections.length} total)`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('type')}
              >
                Type {sortColumn === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('identifier')}
              >
                Identifier {sortColumn === 'identifier' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('name')}
              >
                Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('vendor')}
              >
                Vendor {sortColumn === 'vendor' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('signalStrength')}
              >
                Signal {sortColumn === 'signalStrength' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('channel')}
              >
                Channel {sortColumn === 'channel' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left">Location</th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('firstSeen')}
              >
                First Seen {sortColumn === 'firstSeen' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                onClick={() => handleSort('lastSeen')}
              >
                Last Seen {sortColumn === 'lastSeen' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDetections.map((detection, index) => (
              <tr key={detection.id} className={`border-t border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {getTypeIcon(detection.type)}
                    <span className="text-sm">{getTypeLabel(detection.type)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-sm">{detection.identifier}</td>
                <td className="px-4 py-3">
                  {detection.name || '-'}
                  {detection.security && (
                    <span className="ml-2 px-2 py-1 bg-gray-600 text-xs rounded">{detection.security}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">{detection.vendor || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {detection.signalStrength !== undefined ? `${detection.signalStrength} dBm` : '-'}
                </td>
                <td className="px-4 py-3 text-sm">{detection.channel || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {detection.latitude !== undefined && detection.longitude !== undefined && 
                   detection.latitude !== null && detection.longitude !== null
                    ? `${detection.latitude.toFixed(6)}, ${detection.longitude.toFixed(6)}`
                    : '-'
                  }
                </td>
                <td className="px-4 py-3 text-sm">{formatTimestamp(detection.firstSeen)}</td>
                <td className="px-4 py-3 text-sm">{formatTimestamp(detection.lastSeen)}</td>
                <td className="px-4 py-3 text-sm">
                  {detection.timesSeen && (
                    <span className="mr-2">Seen: {detection.timesSeen}</span>
                  )}
                  {detection.clientCount !== undefined && (
                    <span className="mr-2">Clients: {detection.clientCount}</span>
                  )}
                  {detection.frequency && (
                    <span className="mr-2">{detection.frequency} MHz</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-md transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};