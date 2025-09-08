import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import * as L from 'leaflet';

interface WifiClient {
  id: string;
  clientMac: string;
  vendor?: string;
  latitude: number;
  longitude: number;
  firstSeen?: string;
  lastSeen?: string;
  signalStrength?: number;
  network: {
    ssid?: string;
    bssid: string;
  };
}

interface WifiClientMarkerProps {
  client: WifiClient;
  onClick?: (client: WifiClient) => void;
}

// Create a custom client icon
const createClientIcon = (signalStrength?: number) => {
  // Color based on signal strength
  let color = '#6B7280'; // gray-500 default
  if (signalStrength) {
    if (signalStrength >= -50) color = '#10B981'; // green-500 (strong)
    else if (signalStrength >= -70) color = '#F59E0B'; // amber-500 (medium)
    else color = '#EF4444'; // red-500 (weak)
  }

  return new L.DivIcon({
    html: `
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        color: white;
        font-weight: bold;
      ">
        📱
      </div>
    `,
    className: 'wifi-client-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

export function WifiClientMarker({ client, onClick }: WifiClientMarkerProps) {
  const handleMarkerClick = () => {
    if (onClick) {
      onClick(client);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const formatSignalStrength = (strength?: number) => {
    if (!strength) return 'Unknown';
    return `${strength} dBm`;
  };

  const getSignalQuality = (strength?: number) => {
    if (!strength) return 'Unknown';
    if (strength >= -50) return 'Excellent';
    if (strength >= -60) return 'Good';
    if (strength >= -70) return 'Fair';
    if (strength >= -80) return 'Poor';
    return 'Very Poor';
  };

  return (
    <Marker
      position={[client.latitude, client.longitude]}
      icon={createClientIcon(client.signalStrength)}
      eventHandlers={{
        click: handleMarkerClick,
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
        <div className="text-xs">
          <div className="font-semibold">Client Device</div>
          <div>MAC: {client.clientMac}</div>
          {client.vendor && <div>Vendor: {client.vendor}</div>}
        </div>
      </Tooltip>

      <Popup maxWidth={300} className="wifi-client-popup">
        <div className="p-2">
          <div className="font-semibold text-lg mb-2 text-gray-800">
            📱 WiFi Client
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-gray-600">MAC Address:</span>
                <div className="font-mono text-xs break-all">{client.clientMac}</div>
              </div>
              {client.vendor && (
                <div>
                  <span className="font-medium text-gray-600">Vendor:</span>
                  <div>{client.vendor}</div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-2">
              <div className="font-medium text-gray-700 mb-1">Network Association</div>
              <div className="bg-gray-50 p-2 rounded">
                {client.network.ssid ? (
                  <div>
                    <span className="font-medium">SSID:</span> {client.network.ssid}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">Hidden Network</div>
                )}
                <div className="text-xs text-gray-600 font-mono">
                  BSSID: {client.network.bssid}
                </div>
              </div>
            </div>

            {client.signalStrength && (
              <div>
                <span className="font-medium text-gray-600">Signal Strength:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{formatSignalStrength(client.signalStrength)}</span>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${client.signalStrength >= -50 ? 'bg-green-100 text-green-800' :
                      client.signalStrength >= -70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }
                  `}>
                    {getSignalQuality(client.signalStrength)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium text-gray-600">First Seen:</span>
                <div>{formatDate(client.firstSeen)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Last Seen:</span>
                <div>{formatDate(client.lastSeen)}</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-2">
              <button
                onClick={() => onClick?.(client)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                View All Locations
              </button>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}