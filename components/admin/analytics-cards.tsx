'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  Utensils,
  Home,
  BookOpen,
  Heart,
  Gift
} from 'lucide-react';

interface AnalyticsData {
  totalAttendees: number;
  totalRevenue: number;
  revenueBreakdown: {
    convention: number;
    dinner: number;
    accommodation: number;
    brochure: number;
    goodwill: number;
    donations: number;
  };
  serviceStats: {
    conventionRegistrations: number;
    dinnerReservations: number;
    accommodationBookings: number;
    brochureOrders: number;
    goodwillMessages: number;
    totalDonations: number;
    badgesGenerated: number;
  };
  paymentTrends: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  topDonors: Array<{
    name: string;
    amount: number;
    donationCount: number;
  }>;
}

const COLORS = ['#16A34A', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981'];

export function AnalyticsCards() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/admin/analytics');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      setAnalytics(result.data);
    } catch (error: any) {
      console.error('Analytics fetch error:', error);
      setError(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert>
        <AlertDescription>No analytics data available</AlertDescription>
      </Alert>
    );
  }

  // Prepare data for charts
  const revenueData = [
    { name: 'Convention', value: analytics.revenueBreakdown.convention, icon: Calendar },
    { name: 'Dinner', value: analytics.revenueBreakdown.dinner, icon: Utensils },
    { name: 'Accommodation', value: analytics.revenueBreakdown.accommodation, icon: Home },
    { name: 'Brochure', value: analytics.revenueBreakdown.brochure, icon: BookOpen },
    { name: 'Goodwill', value: analytics.revenueBreakdown.goodwill, icon: Heart },
    { name: 'Donations', value: analytics.revenueBreakdown.donations, icon: Gift }
  ].filter(item => item.value > 0);

  const serviceData = [
    { name: 'Convention', count: analytics.serviceStats.conventionRegistrations },
    { name: 'Dinner', count: analytics.serviceStats.dinnerReservations },
    { name: 'Accommodation', count: analytics.serviceStats.accommodationBookings },
    { name: 'Brochure', count: analytics.serviceStats.brochureOrders },
    { name: 'Goodwill', count: analytics.serviceStats.goodwillMessages },
    { name: 'Donations', count: analytics.serviceStats.totalDonations }
  ];

  const trendData = analytics.paymentTrends.slice(-14); // Last 14 days

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Revenue Breakdown */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>Revenue distribution across services</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="value" fill="#16A34A" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Service Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Service Usage</CardTitle>
          <CardDescription>Number of bookings per service</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, count }) => `${name}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {serviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Trends */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Payment Trends</CardTitle>
          <CardDescription>Daily payment amounts over the last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#16A34A" 
                strokeWidth={2}
                dot={{ fill: '#16A34A' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Donors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Donors</CardTitle>
          <CardDescription>Highest contributing donors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topDonors.slice(0, 5).map((donor, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {donor.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {donor.donationCount} donations
                  </p>
                </div>
                <div className="text-sm font-medium">
                  ${donor.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalAttendees}</div>
          <p className="text-xs text-muted-foreground">
            Registered users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${analytics.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            All services combined
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Badges Generated</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.serviceStats.badgesGenerated}</div>
          <p className="text-xs text-muted-foreground">
            Convention badges created
          </p>
        </CardContent>
      </Card>
    </div>
  );
}