import React, { useState, useEffect } from 'react';
import { DataSourceForm } from '../components/datasources/DataSourceForm';
import { DataSourcesList } from '../components/datasources/DataSourcesList';
import { ApiService, KismetFile, AvailableFilesResponse } from '../services/ApiService';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export interface DataSource {
  id: string;
  name: string;
  path: string;
  status: 'active' | 'inactive' | 'ingesting';
  lastIngested?: string;
  createdAt: string;
}

export const DataSourcesPage: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [availableFiles, setAvailableFiles] = useState<KismetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<KismetFile | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch both data sources and available files
        const [sources, filesResponse] = await Promise.all([
          ApiService.fetchDataSources(),
          ApiService.fetchAvailableKismetFiles()
        ]);
        setDataSources(sources);
        setAvailableFiles(filesResponse.files);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  const handleDataSourceCreated = () => {
    setRefreshKey(prev => prev + 1);
    setSelectedFile(null);
  };

  const handleFileSelect = async (file: KismetFile) => {
    setSelectedFile(file);
    try {
      // Create data source with selected file
      await ApiService.createDataSource({
        name: file.name,
        path: file.path,
        type: 'kismet'
      });
      handleDataSourceCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create data source');
    }
  };

  const handleIngestionTriggered = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Sources</h1>
          <p className="text-gray-600">Configure and manage your Kismet data sources</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <div className="space-y-6">
            {/* Available Kismet Files Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Available Kismet Files</h2>
              {availableFiles.length === 0 ? (
                <p className="text-gray-500">No Kismet files found in /home/kali/kismet_logs/</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Modified
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableFiles.map((file) => (
                        <tr key={file.path}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {file.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.sizeFormatted}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(file.modifiedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleFileSelect(file)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              Select for Analysis
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Data Sources Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <DataSourceForm onSuccess={handleDataSourceCreated} />
              </div>

              <div className="lg:col-span-2">
                <DataSourcesList
                  dataSources={dataSources}
                  onIngestionTriggered={handleIngestionTriggered}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};