import React from 'react';
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

interface ClusterContentPanelProps {
  networks: WifiNetwork[];
  isOpen: boolean;
  onClose: () => void;
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

const formatSignalStrength = (strength?: number): string => {
  if (!strength) return 'Unknown';
  if (strength > -50) return `${strength} dBm (Excellent)`;
  if (strength > -60) return `${strength} dBm (Good)`;
  if (strength > -70) return `${strength} dBm (Fair)`;
  if (strength > -80) return `${strength} dBm (Poor)`;
  return `${strength} dBm (Very Poor)`;
};

export function ClusterContentPanel({ networks, isOpen, onClose }: ClusterContentPanelProps) {
  const { openNetworkDetailPanel } = useNetworkStore();

  if (!isOpen || networks.length === 0) {
    return null;
  }

  const handleNetworkSelect = (network: WifiNetwork) => {
    openNetworkDetailPanel(network);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1050] bg-white border-t-2 border-gray-200 shadow-2xl max-h-96 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-900">
            Cluster Contents ({networks.length} networks)
          </h3>
          <p className="text-sm text-gray-600">
            Click on a network to view detailed information
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          aria-label="Close cluster content panel"
        >
          ✕
        </button>
      </div>

      <div className="overflow-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Network</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Security</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Channel</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Signal</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Vendor</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Clients</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Times Seen</th>
            </tr>
          </thead>
          <tbody>
            {networks
              .sort((a, b) => (b.signalStrength || -100) - (a.signalStrength || -100))
              .map((network) => (
                <tr
                  key={network.id}
                  onClick={() => handleNetworkSelect(network)}
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {network.ssid || '[Hidden Network]'}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {network.bssid}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className="inline-block px-2 py-1 rounded text-xs text-white font-medium"
                      style={{ backgroundColor: getSecurityColor(network.securityType) }}
                    >
                      {network.securityType || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium">
                      {network.channel || 'N/A'}
                    </span>
                    {network.frequency && (
                      <div className="text-xs text-gray-500">
                        {network.frequency} MHz
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {formatSignalStrength(network.signalStrength)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">
                      {network.vendor || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {network.clientCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-600">
                      {network.timesSeen}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}