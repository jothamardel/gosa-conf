'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminWrapper from '@/components/admin/admin-wrapper';
import {
  Shield,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Key
} from 'lucide-react';

interface Official {
  id: string;
  name: string;
  role: string;
  pin: string;
}

// 1. Christabel: 07010
// 2. Retmun: 11291
// 3. Nankus: 20022
// 4. Nankusum: 82005
// 5. God's son: 72799
// 6. Bamnan: 72915
// 7. Fatihal: 09640
// 8. Ritshinen: 53205
// 9. Jirit: 25802
// 10. Nanbal: 20542
// 11. Mercy: 23232
// 12. Chelsea: 17200

// This would normally come from a database
const DEFAULT_OFFICIALS: Official[] = [
  { id: 'admin1', name: 'Admin User', role: 'Administrator', pin: '12341' },
  { id: 'staff1', name: 'Staff Member', role: 'Staff', pin: '56781' },
  { id: 'staff1', name: 'Christabel', role: 'Staff', pin: '07010' },
  { id: 'staff1', name: 'Retmun', role: 'Staff', pin: '11291' },
  { id: 'staff1', name: 'Nankus', role: 'Staff', pin: '20022' },
  { id: 'staff1', name: 'Nankusum', role: 'Staff', pin: '82005' },
  { id: 'staff1', name: "God's son", role: 'Staff', pin: '72799' },
  { id: 'staff1', name: "Bamnan", role: 'Staff', pin: '72915' },
  { id: 'staff1', name: "Fatihal", role: 'Staff', pin: '09640' },
  { id: 'staff1', name: "Ritshinen", role: 'Staff', pin: '53205' },
  { id: 'staff1', name: "Jirit", role: 'Staff', pin: '25802' },
  { id: 'staff1', name: "Nanbal", role: 'Staff', pin: '20542' },
  { id: 'staff1', name: "Mercy", role: 'Staff', pin: '23232' },
  { id: 'staff1', name: "Chelsea", role: 'Staff', pin: '17200' },
  { id: 'security1', name: 'Security Officer', role: 'Security', pin: '99991' },
];

function ScanOfficialsContent() {
  const [officials, setOfficials] = useState<Official[]>(DEFAULT_OFFICIALS);
  const [showPins, setShowPins] = useState<{ [key: string]: boolean }>({});
  const [newOfficial, setNewOfficial] = useState({
    name: '',
    role: 'Staff',
    pin: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleAddOfficial = () => {
    if (!newOfficial.name || !newOfficial.pin) {
      alert('Please fill in all required fields');
      return;
    }

    if (officials.some(o => o.pin === newOfficial.pin)) {
      alert('PIN already exists. Please use a different PIN.');
      return;
    }

    const official: Official = {
      id: `official_${Date.now()}`,
      name: newOfficial.name,
      role: newOfficial.role,
      pin: newOfficial.pin,
    };

    setOfficials([...officials, official]);
    setNewOfficial({ name: '', role: 'Staff', pin: '' });
    setIsAdding(false);
  };

  const handleRemoveOfficial = (id: string) => {
    if (confirm('Are you sure you want to remove this official?')) {
      setOfficials(officials.filter(o => o.id !== id));
    }
  };

  const togglePinVisibility = (id: string) => {
    setShowPins(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator': return 'destructive';
      case 'Security': return 'default';
      case 'Staff': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan Officials Management</h1>
          <p className="text-gray-600">Manage officials who can access the check-in system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Officials</p>
                  <p className="text-2xl font-bold text-gray-900">{officials.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Administrators</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {officials.filter(o => o.role === 'Administrator').length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Staff Members</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {officials.filter(o => o.role === 'Staff').length}
                  </p>
                </div>
                <Key className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Official */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Add New Official
              <Button
                onClick={() => setIsAdding(!isAdding)}
                variant={isAdding ? "outline" : "default"}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAdding ? 'Cancel' : 'Add Official'}
              </Button>
            </CardTitle>
          </CardHeader>

          {isAdding && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newOfficial.name}
                    onChange={(e) => setNewOfficial({ ...newOfficial, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newOfficial.role}
                    onChange={(e) => setNewOfficial({ ...newOfficial, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Security">Security</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIN *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOfficial.pin}
                      onChange={(e) => setNewOfficial({ ...newOfficial, pin: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="4-6 digits"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewOfficial({ ...newOfficial, pin: generateRandomPin() })}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAddOfficial} className="bg-green-600 hover:bg-green-700">
                  Add Official
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Officials List */}
        <Card>
          <CardHeader>
            <CardTitle>Current Officials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {officials.map((official) => (
                <div
                  key={official.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900">{official.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getRoleColor(official.role)}>
                          {official.role}
                        </Badge>
                        <span className="text-sm text-gray-500">ID: {official.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">PIN:</span>
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                        {showPins[official.id] ? official.pin : '••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePinVisibility(official.id)}
                      >
                        {showPins[official.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOfficial(official.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Note:</strong> PINs should be kept confidential and shared only with authorized personnel.
            Officials can use their PINs to access the check-in system at https://gosa.events/scan
          </AlertDescription>
        </Alert>

        {/* Code Generation for API */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Copy this configuration to your API auth route:
            </p>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              {`const OFFICIAL_PINS = {
${officials.map(o => `  '${o.pin}': { id: '${o.id}', name: '${o.name}', role: '${o.role}' },`).join('\n')}
};`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ScanOfficialsPage() {
  return (
    <AdminWrapper>
      <ScanOfficialsContent />
    </AdminWrapper>
  );
}