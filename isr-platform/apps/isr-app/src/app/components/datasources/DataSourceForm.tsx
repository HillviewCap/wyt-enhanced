import React, { useState } from 'react';
import { ApiService } from '../../services/ApiService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorMessage } from '../ui/ErrorMessage';

interface DataSourceFormProps {
  onSuccess: () => void;
}

export const DataSourceForm: React.FC<DataSourceFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePath = (filePath: string): boolean => {
    const sqliteRegex = /^(\/[\w.-]+)+\.(db|sqlite|sqlite3)$/i;
    return sqliteRegex.test(filePath);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!validatePath(path)) {
      setError('Please provide a valid path to a Kismet SQLite file (e.g., /path/to/kismet.db)');
      return;
    }

    setLoading(true);
    try {
      await ApiService.createDataSource({ name: name.trim(), path: path.trim() });
      setName('');
      setPath('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create data source');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Data Source</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Kismet Data"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="path" className="block text-sm font-medium text-gray-700 mb-1">
              File Path
            </label>
            <input
              type="text"
              id="path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/path/to/kismet.db"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the full path to your Kismet SQLite database file
            </p>
          </div>

          {error && <ErrorMessage message={error} />}

          <Button type="submit" disabled={loading} loading={loading}>
            {loading ? 'Creating...' : 'Create Data Source'}
          </Button>
        </form>
      </div>
    </Card>
  );
};