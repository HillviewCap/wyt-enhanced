import React from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import { Icon, divIcon, DivIcon } from 'leaflet';
import { useNetworkStore } from '../../stores/networkStore';

interface WifiNetwork {
  id: string;
  bssid: string;
  ssid?: string;
  securityType?: string;
  channel?: number;
  frequency?: number;
  signalStrength?: number;
  vendor?: string;
  latitude: number | null;
  longitude: number | null;
  firstSeen?: string;
  lastSeen?: string;
  timesSeen: number;
  clientCount: number;
}

interface WifiNetworkMarkerProps {
  network: WifiNetwork;
}

// Security type colors
const getSecurityColor = (securityType?: string): string => {
  switch (securityType) {
    case 'Open': return '#ff4444'; // Red for open networks
    case 'WEP': return '#ff8800'; // Orange for WEP (vulnerable)
    case 'WPA': return '#ffaa00'; // Light orange for WPA
    case 'WPA2': return '#88cc00'; // Light green for WPA2
    case 'WPA3': return '#00cc44'; // Green for WPA3
    case 'WPA2-Enterprise':
    case 'WPA3-Enterprise': return '#0088cc'; // Blue for enterprise
    default: return '#666666'; // Gray for unknown
  }
};

// Signal strength icon
const getSignalIcon = (network: WifiNetwork): DivIcon => {
  const strength = network.signalStrength || -100;
  const color = getSecurityColor(network.securityType);
  
  // Signal strength bars (1-4)
  let bars = 1;
  if (strength > -70) bars = 4;
  else if (strength > -80) bars = 3;
  else if (strength > -90) bars = 2;

  const isHidden = !network.ssid || network.ssid.trim() === '';
  
  return divIcon({
    className: 'wifi-network-marker',
    html: `
      <div style="
        background-color: ${color}; 
        border: 2px solid white; 
        border-radius: 50%; 
        width: ${12 + bars * 2}px; 
        height: ${12 + bars * 2}px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ${isHidden ? 'border-style: dashed;' : ''}
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          color: white; 
          font-size: ${8 + bars}px; 
          font-weight: bold;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
        ">📶</span>
      </div>
    `,
    iconSize: [16 + bars * 2, 16 + bars * 2],
    iconAnchor: [(16 + bars * 2) / 2, (16 + bars * 2) / 2],
    popupAnchor: [0, -(16 + bars * 2) / 2],
  });
};

// Signal strength circle (optional visual enhancement)
const getSignalRadius = (signalStrength?: number): number => {
  if (!signalStrength) return 50;
  
  // Convert dBm to approximate range in meters
  // This is a rough approximation
  const strength = Math.abs(signalStrength);
  if (strength < 50) return 200; // Very strong
  if (strength < 60) return 150; // Strong
  if (strength < 70) return 100; // Good
  if (strength < 80) return 75;  // Fair
  return 50; // Weak
};

export function WifiNetworkMarker({ network }: WifiNetworkMarkerProps) {
  const { selectedNetwork, setSelectedNetwork, showSignalRadius } = useNetworkStore();

  // Don't render if coordinates are null
  if (network.latitude === null || network.longitude === null) {
    return null;
  }

  const handleMarkerClick = () => {
    setSelectedNetwork(network);
  };

  const formatSignalStrength = (strength?: number): string => {
    if (!strength) return 'Unknown';
    if (strength > -50) return `${strength} dBm (Excellent)`;
    if (strength > -60) return `${strength} dBm (Good)`;
    if (strength > -70) return `${strength} dBm (Fair)`;
    if (strength > -80) return `${strength} dBm (Poor)`;
    return `${strength} dBm (Very Poor)`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <>
      <Marker
        position={[network.latitude, network.longitude]}
        icon={getSignalIcon(network)}
        eventHandlers={{
          click: handleMarkerClick,
        }}
      >
        <Popup>
          <div className="wifi-network-popup" style={{ minWidth: '250px' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: getSecurityColor(network.securityType) }}>
              {network.ssid || '[Hidden Network]'}
            </h3>
            
            <div className="space-y-1 text-sm">
              <div>
                <strong>BSSID:</strong> <code className="bg-gray-100 px-1 rounded">{network.bssid}</code>
              </div>
              
              <div>
                <strong>Security:</strong> 
                <span className="ml-1 px-2 py-1 rounded text-xs text-white" 
                      style={{ backgroundColor: getSecurityColor(network.securityType) }}>
                  {network.securityType || 'Unknown'}
                </span>
              </div>
              
              {network.channel && (
                <div>
                  <strong>Channel:</strong> {network.channel}
                  {network.frequency && <span className="text-gray-500"> ({network.frequency} MHz)</span>}
                </div>
              )}
              
              {network.signalStrength && (
                <div>
                  <strong>Signal:</strong> {formatSignalStrength(network.signalStrength)}
                </div>
              )}
              
              {network.vendor && (
                <div>
                  <strong>Vendor:</strong> {network.vendor}
                </div>
              )}
              
              <div>
                <strong>Clients:</strong> {network.clientCount}
              </div>
              
              <div>
                <strong>Times Seen:</strong> {network.timesSeen}
              </div>
              
              {network.firstSeen && (
                <div>
                  <strong>First Seen:</strong> {formatDate(network.firstSeen)}
                </div>
              )}
              
              {network.lastSeen && (
                <div>
                  <strong>Last Seen:</strong> {formatDate(network.lastSeen)}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-2">
                <strong>Coordinates:</strong> {network.latitude?.toFixed(6) || 'N/A'}, {network.longitude?.toFixed(6) || 'N/A'}
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-200">
              <button 
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                onClick={() => {
                  // TODO: Open detailed network view
                  console.log('View network details:', network.id);
                }}
              >
                View Details →
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
      
      {/* Optional signal radius circle */}
      {showSignalRadius && network.signalStrength && (
        <Circle
          center={[network.latitude, network.longitude]}
          radius={getSignalRadius(network.signalStrength)}
          pathOptions={{
            color: getSecurityColor(network.securityType),
            fillColor: getSecurityColor(network.securityType),
            fillOpacity: 0.1,
            weight: 1,
            dashArray: '5, 10',
          }}
        />
      )}
    </>
  );
}