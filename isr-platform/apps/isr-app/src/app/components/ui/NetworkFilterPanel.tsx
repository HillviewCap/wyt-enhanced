import React, { useState } from 'react';
import { useNetworkStore } from '../../stores/networkStore';

export function NetworkFilterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    networkFilters,
    showSignalRadius,
    setNetworkFilters,
    clearNetworkFilters,
    setShowSignalRadius,
  } = useNetworkStore();

  const securityTypes = [
    'Open',
    'WEP', 
    'WPA',
    'WPA2',
    'WPA3',
    'WPA2-Enterprise',
    'WPA3-Enterprise',
  ];

  const channels = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, // 2.4GHz
    36, 40, 44, 48, 52, 56, 60, 64, // 5GHz lower
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, // 5GHz upper
    149, 153, 157, 161, 165, 169, 173, // 5GHz UNII-3
  ];

  const handleFilterChange = (key: string, value: any) => {
    setNetworkFilters({ [key]: value === '' ? undefined : value });
  };

  const activeFilterCount = Object.values(networkFilters).filter(v => v !== undefined && v !== '').length;

  return (
    <div className="absolute top-4 left-4 z-[1000]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          bg-white hover:bg-gray-50 shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors
          ${activeFilterCount > 0 ? 'border-2 border-blue-500 text-blue-700' : 'text-gray-700'}
        `}
      >
        📶 WiFi Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
      </button>

      {isOpen && (
        <div className="mt-2 bg-white rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Network Filters</h3>
            <button
              onClick={() => {
                clearNetworkFilters();
                setShowSignalRadius(false);
              }}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            {/* Security Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Type
              </label>
              <select
                value={networkFilters.securityType || ''}
                onChange={(e) => handleFilterChange('securityType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Security Types</option>
                {securityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Signal Strength Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Signal Strength (dBm)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min (e.g. -80)"
                  value={networkFilters.minSignalStrength || ''}
                  onChange={(e) => handleFilterChange('minSignalStrength', parseInt(e.target.value) || undefined)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max (e.g. -30)"
                  value={networkFilters.maxSignalStrength || ''}
                  onChange={(e) => handleFilterChange('maxSignalStrength', parseInt(e.target.value) || undefined)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Stronger signals are closer to 0 (e.g., -30 is stronger than -80)
              </div>
            </div>

            {/* Channel Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel
              </label>
              <select
                value={networkFilters.channel || ''}
                onChange={(e) => handleFilterChange('channel', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Channels</option>
                <optgroup label="2.4GHz">
                  {channels.filter(c => c <= 14).map(channel => (
                    <option key={channel} value={channel}>{channel}</option>
                  ))}
                </optgroup>
                <optgroup label="5GHz">
                  {channels.filter(c => c > 14).map(channel => (
                    <option key={channel} value={channel}>{channel}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Vendor Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <input
                type="text"
                placeholder="Enter vendor name..."
                value={networkFilters.vendor || ''}
                onChange={(e) => handleFilterChange('vendor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Client Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Associated Clients
              </label>
              <select
                value={networkFilters.hasClients === undefined ? '' : networkFilters.hasClients.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange('hasClients', value === '' ? undefined : value === 'true');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Networks</option>
                <option value="true">Networks with Clients</option>
                <option value="false">Networks without Clients</option>
              </select>
            </div>

            {/* Minimum Clients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Clients
              </label>
              <input
                type="number"
                placeholder="e.g. 1"
                min="0"
                value={networkFilters.minClients || ''}
                onChange={(e) => handleFilterChange('minClients', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                Only show networks with at least this many clients
              </div>
            </div>

            {/* Special Filters */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={networkFilters.showOpenOnly || false}
                  onChange={(e) => handleFilterChange('showOpenOnly', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Open networks only</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={networkFilters.showHidden === false}
                  onChange={(e) => handleFilterChange('showHidden', e.target.checked ? undefined : false)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Hide hidden networks</span>
              </label>
            </div>

            {/* Display Options */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Display Options</h4>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showSignalRadius}
                  onChange={(e) => setShowSignalRadius(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show signal radius circles</span>
              </label>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}