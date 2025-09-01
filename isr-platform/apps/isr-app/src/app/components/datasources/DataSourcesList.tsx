import React, { useState } from 'react';
import { DataSource } from '../../routes/DataSourcesPage';
import { ApiService } from '../../services/ApiService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface DataSourcesListProps {
  dataSources: DataSource[];
  onIngestionTriggered: () => void;
}

export const DataSourcesList: React.FC<DataSourcesListProps> = ({
  dataSources,
  onIngestionTriggered,
}) => {
  const [ingestingIds, setIngestingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTriggerIngestion = async (id: string) => {
    setIngestingIds(prev => new Set(prev).add(id));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });

    try {
      await ApiService.triggerIngestion(id);
      onIngestionTriggered();
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Failed to trigger ingestion',
      }));
    } finally {
      setIngestingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: DataSource['status']) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      ingesting: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (dataSources.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <p className="text-gray-500">No data sources configured yet.</p>
          <p className="text-sm text-gray-400 mt-2">Add your first data source to get started.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Configured Data Sources</h2>
      {dataSources.map(source => (
        <Card key={source.id}>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{source.name}</h3>
                  {getStatusBadge(source.status)}
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Path:</span> {source.path}
                </p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Created: {new Date(source.createdAt).toLocaleDateString()}</span>
                  {source.lastIngested && (
                    <span>Last Ingested: {new Date(source.lastIngested).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <Button
                onClick={() => handleTriggerIngestion(source.id)}
                disabled={ingestingIds.has(source.id) || source.status === 'ingesting'}
                loading={ingestingIds.has(source.id)}
                variant="secondary"
                size="sm"
              >
                {ingestingIds.has(source.id) ? 'Triggering...' : 'Trigger Ingestion'}
              </Button>
            </div>
            {errors[source.id] && (
              <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
                {errors[source.id]}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};