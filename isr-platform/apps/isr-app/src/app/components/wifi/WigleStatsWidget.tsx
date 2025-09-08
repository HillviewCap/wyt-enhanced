import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/ApiService';
import { Card } from '../ui/Card';

interface WigleStats {
  requestsToday: number;
  maxRequestsPerDay: number;
  cacheHits: number;
  apiCallsRemaining: number;
}

export const WigleStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<WigleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const wigleStats = await ApiService.getWigleStats();
        setStats(wigleStats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch Wigle stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-gray-300">
        <div className="text-center">
          <div className="text-gray-500 text-sm">Wigle API</div>
          <div className="text-red-600 text-xs">{error || 'No data'}</div>
        </div>
      </Card>
    );
  }

  const usagePercentage = (stats.requestsToday / stats.maxRequestsPerDay) * 100;
  const isLowUsage = usagePercentage < 25;
  const isHighUsage = usagePercentage > 75;

  return (
    <Card className={`border-2 transition-colors ${
      isHighUsage ? 'border-red-200 bg-red-50' : 
      isLowUsage ? 'border-green-200 bg-green-50' : 
      'border-yellow-200 bg-yellow-50'
    }`}>
      <div className="text-center">
        <div className="text-sm font-medium text-gray-700 mb-2">Wigle API Usage</div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="font-semibold">{stats.requestsToday}</div>
            <div className="text-gray-500">Used Today</div>
          </div>
          <div>
            <div className="font-semibold">{stats.apiCallsRemaining}</div>
            <div className="text-gray-500">Remaining</div>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>0</span>
            <span>{stats.maxRequestsPerDay}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                isHighUsage ? 'bg-red-500' : 
                isLowUsage ? 'bg-green-500' : 
                'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          {stats.cacheHits} cache hits today
        </div>
      </div>
    </Card>
  );
};