import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import * as L from 'leaflet';
import { useNetworkStore, WifiNetwork } from '../../stores/networkStore';

interface NetworkClient {
  id: string;
  clientMac: string;
  vendor?: string;
  lastSeen?: string;
  packetsTotal?: number;
}

interface NetworkDetailPanelProps {
  network: WifiNetwork | null;
  isOpen: boolean;
  onClose: () => void;
}

// Create icons for mini-map
const createAPIcon = () => {
  return new L.DivIcon({
    html: `
      <div style="
        background-color: #3B82F6;
        border: 2px solid white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <span style="color: white; font-size: 8px;">📶</span>
      </div>
    `,
    className: 'ap-mini-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const createClientIcon = () => {
  return new L.DivIcon({
    html: `
      <div style="
        background-color: #10B981;
        border: 2px solid white;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      ">
        <span style="color: white; font-size: 6px;">📱</span>
      </div>
    `,
    className: 'client-mini-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

export function NetworkDetailPanel({ network, isOpen, onClose }: NetworkDetailPanelProps) {
  const [clients, setClients] = useState<NetworkClient[]>([]);
  const [clientLocations, setClientLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch network details and clients when network changes
  useEffect(() => {
    if (network && isOpen) {
      fetchNetworkDetails(network.id);
    }
  }, [network?.id, isOpen]);

  const fetchNetworkDetails = async (networkId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch network details with clients
      const response = await fetch(`/api/wifi/networks/${networkId}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        
        // Fetch client locations for the mini-map
        if (data.clients && data.clients.length > 0) {
          const locationPromises = data.clients.map(async (client: NetworkClient) => {
            try {
              const locResponse = await fetch(`/api/wifi/clients/${client.id}/locations`);
              if (locResponse.ok) {
                const locData = await locResponse.json();
                return locData.locations || [];
              }
              return [];
            } catch (error) {
              console.warn(`Failed to fetch locations for client ${client.id}:`, error);
              return [];
            }
          });
          
          const allLocations = await Promise.all(locationPromises);
          setClientLocations(allLocations.flat());
        }
      } else {
        throw new Error(`Failed to fetch network details: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch network details';
      setError(errorMessage);
      console.error('Failed to fetch network details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const getSecurityColor = (securityType?: string): string => {
    switch (securityType) {
      case 'Open': return 'text-red-600 bg-red-50';
      case 'WEP': return 'text-orange-600 bg-orange-50';
      case 'WPA': return 'text-yellow-600 bg-yellow-50';
      case 'WPA2': return 'text-green-600 bg-green-50';
      case 'WPA3': return 'text-blue-600 bg-blue-50';
      case 'WPA2-Enterprise':
      case 'WPA3-Enterprise': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen || !network) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-[1001] w-96 bg-white shadow-xl border-l border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold truncate">
            {network.ssid || '[Hidden Network]'}
          </h2>
          <div className="text-blue-100 text-sm font-mono">{network.bssid}</div>
        </div>
        <button
          onClick={onClose}
          className="text-blue-100 hover:text-white transition-colors"
          aria-label="Close panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Network Information */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Network Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Security:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSecurityColor(network.securityType)}`}>
                {network.securityType || 'Unknown'}
              </span>
            </div>
            {network.channel && (
              <div className="flex justify-between">
                <span className="text-gray-600">Channel:</span>
                <span>{network.channel} ({network.frequency ? `${network.frequency} MHz` : 'Unknown frequency'})</span>
              </div>
            )}
            {network.signalStrength && (
              <div className="flex justify-between">
                <span className="text-gray-600">Signal Strength:</span>
                <span className="font-mono">{network.signalStrength} dBm</span>
              </div>
            )}
            {network.vendor && (
              <div className="flex justify-between">
                <span className="text-gray-600">Vendor:</span>
                <span className="text-right max-w-48 truncate">{network.vendor}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Times Seen:</span>
              <span>{network.timesSeen}</span>
            </div>
            {network.firstSeen && (
              <div className="flex justify-between">
                <span className="text-gray-600">First Seen:</span>
                <span className="text-right text-xs">{formatDate(network.firstSeen)}</span>
              </div>
            )}
            {network.lastSeen && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Seen:</span>
                <span className="text-right text-xs">{formatDate(network.lastSeen)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mini Map */}
        {(network.latitude !== null && network.longitude !== null) && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Location & Clients</h3>
            <div className="h-48 rounded-lg overflow-hidden border border-gray-300">
              <MapContainer
                center={[network.latitude, network.longitude]}
                zoom={16}
                className="h-full w-full"
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* AP Marker */}
                <Marker
                  position={[network.latitude, network.longitude]}
                  icon={createAPIcon()}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-semibold">{network.ssid || 'Hidden Network'}</div>
                      <div>Access Point</div>
                    </div>
                  </Popup>
                </Marker>

                {/* Client Location Markers */}
                {clientLocations.map((location, index) => (
                  <Marker
                    key={`client-${index}`}
                    position={[location.latitude, location.longitude]}
                    icon={createClientIcon()}
                  >
                    <Popup>
                      <div className="text-xs">
                        <div className="font-semibold">Client Device</div>
                        <div>Network: {location.network.ssid || 'Hidden'}</div>
                        {location.signalStrength && (
                          <div>Signal: {location.signalStrength} dBm</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
              <span>📶 Access Point • 📱 Clients ({clientLocations.length})</span>
            </div>
          </div>
        )}

        {/* Associated Clients */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Associated Clients</h3>
            <span className="text-sm text-gray-500">{clients.length} clients</span>
          </div>

          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Loading client details...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {!loading && !error && clients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📱</div>
              <div>No clients detected</div>
              <div className="text-xs">This network has no associated client devices</div>
            </div>
          )}

          {!loading && clients.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-3">
              {clients.map((client, index) => (
                <div key={client.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-mono text-sm text-gray-900">{client.clientMac}</div>
                      {client.vendor && (
                        <div className="text-xs text-gray-600 mt-1">{client.vendor}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">#{index + 1}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Last Seen:</span>
                      <div className="text-gray-900">{formatDate(client.lastSeen)}</div>
                    </div>
                    {client.packetsTotal && (
                      <div>
                        <span className="text-gray-600">Packets:</span>
                        <div className="text-gray-900">{client.packetsTotal.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}