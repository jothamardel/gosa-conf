'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Keyboard,
  Search,
  User,
  Hash
} from 'lucide-react';

interface ManualEntryProps {
  onSubmit: (identifier: string, type: 'id' | 'reference' | 'email') => void;
  loading?: boolean;
}

export default function ManualEntry({ onSubmit, loading = false }: ManualEntryProps) {
  const [searchType, setSearchType] = useState<'id' | 'reference' | 'email'>('id');
  const [searchValue, setSearchValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSubmit(searchValue.trim(), searchType);
    }
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'id':
        return 'Enter ticket ID (e.g., 507f1f77bcf86cd799439011)';
      case 'reference':
        return 'Enter payment reference (e.g., conv_123456)';
      case 'email':
        return 'Enter user email (e.g., user@example.com)';
      default:
        return 'Enter search value';
    }
  };

  const getIcon = () => {
    switch (searchType) {
      case 'id':
        return <Hash className="h-4 w-4" />;
      case 'reference':
        return <Search className="h-4 w-4" />;
      case 'email':
        return <User className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Manual Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Use this option if QR code scanning is not working or if you need to search by other criteria.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSearchType('id')}
                className={`p-2 text-sm rounded-md border transition-colors ${searchType === 'id'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Hash className="h-4 w-4 mx-auto mb-1" />
                Ticket ID
              </button>
              <button
                type="button"
                onClick={() => setSearchType('reference')}
                className={`p-2 text-sm rounded-md border transition-colors ${searchType === 'reference'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Search className="h-4 w-4 mx-auto mb-1" />
                Reference
              </button>
              <button
                type="button"
                onClick={() => setSearchType('email')}
                className={`p-2 text-sm rounded-md border transition-colors ${searchType === 'email'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <User className="h-4 w-4 mx-auto mb-1" />
                Email
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {searchType === 'id' && 'Ticket ID'}
              {searchType === 'reference' && 'Payment Reference'}
              {searchType === 'email' && 'User Email'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {getIcon()}
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={getPlaceholder()}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !searchValue.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Ticket
              </>
            )}
          </Button>
        </form>

        {/* Quick Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Ticket ID:</strong> 24-character MongoDB ObjectId from QR code</p>
          <p><strong>Reference:</strong> Payment reference like conv_123456, dinner_789012</p>
          <p><strong>Email:</strong> User's registered email address</p>
        </div>
      </CardContent>
    </Card>
  );
}