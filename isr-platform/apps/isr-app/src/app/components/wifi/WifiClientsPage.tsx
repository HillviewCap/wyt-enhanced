import React, { useEffect, useState, useCallback } from 'react';
import { ApiService, ProbeClient, ProbedNetwork, ProbeFilters } from '../../services/ApiService';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { WigleStatsWidget } from './WigleStatsWidget';

export const WifiClientsPage: React.FC = () => {
  const [clients, setClients] = useState<ProbeClient[]>([]);
  const [networks, setNetworks] = useState<ProbedNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ProbeClient | null>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'networks'>('clients');
  const [clientsTotal, setClientsTotal] = useState(0);
  const [networksTotal, setNetworksTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<ProbeFilters>({
    hoursBack: 168, // 1 week instead of 24 hours
    minProbes: 1,
    vendor: '',
    unknownOnly: false,
  });
  const [wigleLookupLoading, setWigleLookupLoading] = useState<string | null>(null);
  const [wigleResults, setWigleResults] = useState<{[ssid: string]: any}>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch large datasets or paginated data based on showAll flag
      const clientFilters = { 
        ...filters, 
        limit: showAll ? undefined : itemsPerPage,
        offset: showAll ? 0 : (currentPage - 1) * itemsPerPage
      };
      
      const networkFilters = { 
        ...filters, 
        limit: showAll ? undefined : itemsPerPage * 2, // Show more networks
        offset: 0
      };

      const [clientsResponse, networksResponse] = await Promise.all([
        ApiService.fetchProbeClients(clientFilters),
        ApiService.fetchProbedNetworks(networkFilters)
      ]);

      setClients(clientsResponse.clients);
      setNetworks(networksResponse.networks);
      setClientsTotal(clientsResponse.total);
      setNetworksTotal(networksResponse.total);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch probe data');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage, showAll]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: keyof ProbeFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleWigleLookup = useCallback(async (ssid: string) => {
    console.log(`Starting Wigle lookup for SSID: ${ssid}`);
    setWigleLookupLoading(ssid);
    
    try {
      const result = await ApiService.lookupSSIDInWigle(ssid);
      console.log(`Wigle lookup successful for ${ssid}:`, result);
      setWigleResults(prev => ({ ...prev, [ssid]: result }));
    } catch (error) {
      console.error(`Wigle lookup failed for ${ssid}:`, error);
      
      let errorMessage = 'Lookup failed';
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          errorMessage = 'Rate limit exceeded. Please wait before trying again.';
        } else if (error.message.includes('401')) {
          errorMessage = 'API authentication failed. Check Wigle credentials.';
        } else if (error.message.includes('404')) {
          errorMessage = 'No results found in Wigle database.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setWigleResults(prev => ({ ...prev, [ssid]: { error: errorMessage } }));
    } finally {
      setWigleLookupLoading(null);
    }
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const ClientCard: React.FC<{ client: ProbeClient }> = ({ client }) => (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedClient(client)}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 font-mono text-sm">{client.clientMac}</h3>
          <p className="text-sm text-gray-600">{client.vendor}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">{client.probeCount}</div>
          <div className="text-xs text-gray-500">probes</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Unique SSIDs</div>
          <div className="font-semibold">{client.uniqueSSIDs}</div>
        </div>
        <div>
          <div className="text-gray-500">Broadcast Probes</div>
          <div className="font-semibold">{client.broadcastProbes}</div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Last seen: {formatTimeAgo(client.lastSeen)}
      </div>
      
      {client.ssidsProbed.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Probing for:</div>
          <div className="flex flex-wrap gap-1">
            {client.ssidsProbed.slice(0, 3).map((ssid, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {ssid}
              </span>
            ))}
            {client.ssidsProbed.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{client.ssidsProbed.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );

  const NetworkCard: React.FC<{ network: ProbedNetwork }> = ({ network }) => {
    const wigleResult = wigleResults[network.ssid];
    const isLookingUp = wigleLookupLoading === network.ssid;
    const needsWigleLookup = network.networkSecurity === 'Unknown - Wigle lookup needed';
    const hasWigleData = network.networkSecurity === 'Wigle Data Available';

    return (
      <Card className={`${network.isUnknown ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{network.ssid}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {network.isUnknown ? (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  Unknown Network
                </span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  In Database
                </span>
              )}
              
              {hasWigleData ? (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full" title="Network data available from Wigle database">
                  🌐 Wigle Data
                </span>
              ) : network.networkSecurity && needsWigleLookup ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWigleLookup(network.ssid);
                  }}
                  disabled={isLookingUp}
                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Click to lookup this network in Wigle database"
                >
                  {isLookingUp ? '🔍 Looking up...' : '🔍 Wigle Lookup'}
                </button>
              ) : network.networkSecurity && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {network.networkSecurity}
                </span>
              )}
            </div>

            {/* Display Wigle Results */}
            {wigleResult && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                {wigleResult.error ? (
                  <div className="text-red-600">❌ {wigleResult.error}</div>
                ) : (
                  <div className="space-y-1">
                    <div className="font-semibold text-blue-800">
                      🌐 Wigle Results: {wigleResult.totalResults} networks found
                    </div>
                    {wigleResult.results.length > 0 && (
                      <div className="text-gray-600">
                        <div>First result: {wigleResult.results[0].country || 'Unknown'}</div>
                        {wigleResult.results[0].encryption && (
                          <div>Security: {wigleResult.results[0].encryption}</div>
                        )}
                        {wigleResult.results[0].lasttime && (
                          <div>Last seen: {new Date(wigleResult.results[0].lasttime).toLocaleDateString()}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-purple-600">{network.probeCount}</div>
            <div className="text-xs text-gray-500">probes</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Unique Clients</div>
            <div className="font-semibold">{network.uniqueClients}</div>
          </div>
          <div>
            <div className="text-gray-500">First Probed</div>
            <div className="font-semibold">{formatTimeAgo(network.firstProbed)}</div>
          </div>
        </div>
        
        {network.networkBSSID && (
          <div className="mt-3 text-xs text-gray-500 font-mono">
            BSSID: {network.networkBSSID}
          </div>
        )}
        
        <div className="mt-3 text-xs text-gray-500">
          Last probed: {formatTimeAgo(network.lastProbed)}
        </div>
      </Card>
    );
  };

  const ClientDetailModal: React.FC<{ client: ProbeClient; onClose: () => void }> = ({ client, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-mono">{client.clientMac}</h2>
              <p className="text-gray-600">{client.vendor}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{client.probeCount}</div>
              <div className="text-sm text-gray-500">Total Probes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{client.uniqueSSIDs}</div>
              <div className="text-sm text-gray-500">Unique SSIDs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{client.broadcastProbes}</div>
              <div className="text-sm text-gray-500">Broadcast Probes</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-900">{formatTimeAgo(client.lastSeen)}</div>
              <div className="text-sm text-gray-500">Last Seen</div>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Networks Being Probed</h3>
            {client.ssidsProbed.length === 0 ? (
              <p className="text-gray-500">No specific networks (only broadcast probes)</p>
            ) : (
              <div className="space-y-2">
                {client.ssidsProbed.map((ssid, idx) => {
                  const network = networks.find(n => n.ssid === ssid);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="font-medium">{ssid}</div>
                      <div className="flex items-center gap-2">
                        {network ? (
                          <>
                            {network.isUnknown ? (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                Unknown
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Known
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              {network.uniqueClients} client{network.uniqueClients !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            No data
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="border-t pt-4 mt-6 text-sm text-gray-500">
            <div>First seen: {new Date(client.firstSeen).toLocaleString()}</div>
            <div>Last seen: {new Date(client.lastSeen).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">WiFi Client Probe Analysis</h1>
        <p className="text-gray-600">
          Monitor WiFi clients and the networks they're actively searching for through probe requests
        </p>
      </div>

      {/* Filters and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-3">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select 
              value={filters.hoursBack} 
              onChange={(e) => handleFilterChange('hoursBack', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last week</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Probes</label>
            <select 
              value={filters.minProbes} 
              onChange={(e) => handleFilterChange('minProbes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1+</option>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
              <option value={25}>25+</option>
              <option value={50}>50+</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <input
              type="text"
              value={filters.vendor}
              onChange={(e) => handleFilterChange('vendor', e.target.value)}
              placeholder="Filter by vendor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Networks</label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.unknownOnly}
                onChange={(e) => handleFilterChange('unknownOnly', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Unknown only</span>
            </label>
          </div>
            </div>
          </Card>
        </div>
        
        <div className="space-y-4">
          <WigleStatsWidget />
          
          <Card className="border-blue-200 bg-blue-50">
            <div className="text-center">
              <div className="text-sm font-medium text-blue-800 mb-2">Network Analysis</div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <div className="font-semibold text-lg text-blue-900">{networks.filter(n => n.isUnknown).length}</div>
                  <div className="text-blue-700">Unknown Networks</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-blue-900">{networks.filter(n => !n.isUnknown).length}</div>
                  <div className="text-blue-700">Known Networks</div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="border-purple-200 bg-purple-50">
            <div className="text-center">
              <div className="text-sm font-medium text-purple-800 mb-2">Client Activity</div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <div className="font-semibold text-lg text-purple-900">{clients.reduce((sum, c) => sum + c.probeCount, 0)}</div>
                  <div className="text-purple-700">Total Probes</div>
                </div>
                <div>
                  <div className="font-semibold text-lg text-purple-900">{clients.reduce((sum, c) => sum + c.broadcastProbes, 0)}</div>
                  <div className="text-purple-700">Broadcast Probes</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('clients')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Clients ({showAll ? clientsTotal : clients.length}{!showAll && clientsTotal > clients.length && ` of ${clientsTotal}`})
          </button>
          <button
            onClick={() => setActiveTab('networks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'networks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Probed Networks ({showAll ? networksTotal : networks.length}{!showAll && networksTotal > networks.length && ` of ${networksTotal}`})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'clients' ? (
        <div>
          <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold">
              Active WiFi Clients ({showAll ? clientsTotal : clients.length}{!showAll && clientsTotal > clients.length && ` of ${clientsTotal}`})
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => {
                    setShowAll(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded"
                />
                <span className="text-sm font-medium">Show All ({clientsTotal})</span>
              </label>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {!showAll && clientsTotal > itemsPerPage && (
            <div className="mb-4 flex justify-center items-center gap-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(clientsTotal / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(clientsTotal / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(clientsTotal / itemsPerPage)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
              >
                Next
              </button>
            </div>
          )}
          
          {clients.length === 0 ? (
            <Card>
              <div className="text-center py-8 text-gray-500">
                No active clients found with the current filters
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <ClientCard key={client.clientMac} client={client} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold">
              Networks Being Probed ({showAll ? networksTotal : networks.length}{!showAll && networksTotal > networks.length && ` of ${networksTotal}`})
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {networks.filter(n => n.isUnknown).length} unknown networks
              </span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => {
                    setShowAll(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded"
                />
                <span className="text-sm font-medium">Show All ({networksTotal})</span>
              </label>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {networks.length === 0 ? (
            <Card>
              <div className="text-center py-8 text-gray-500">
                No probed networks found with the current filters
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {networks.map((network, idx) => (
                <NetworkCard key={`${network.ssid}-${idx}`} network={network} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
};