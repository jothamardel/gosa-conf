'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  MessageSquare,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle
} from 'lucide-react';

interface MonitoringData {
  metrics: any;
  health: any;
  trends: any;
  alerts: any[];
  recentLogs: any[];
}

export function PDFMonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, alertsRes, logsRes] = await Promise.all([
        fetch('/api/v1/admin/pdf-performance?type=overview'),
        fetch('/api/v1/admin/pdf-performance?type=alerts&hours=24'),
        fetch('/api/v1/admin/pdf-monitoring?type=recent&limit=50')
      ]);

      const [metricsData, alertsData, logsData] = await Promise.all([
        metricsRes.json(),
        alertsRes.json(),
        logsRes.json()
      ]);

      setData({
        metrics: metricsData.data.metrics,
        health: metricsData.data.health,
        trends: metricsData.data.trends,
        alerts: alertsData.data.recentAlerts || [],
        recentLogs: logsData.data.recentLogs || []
      });
      setError(null);
    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Monitoring data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PDF System Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Badge className={getStatusColor(data.health.status)}>
              {data.health.status.toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.health.score}/100</div>
            <Progress value={data.health.score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.successRates.overall.toFixed(1)}%</div>
            <p className="text-xs text-gray-600 mt-1">Overall operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.errorRates.overall.toFixed(1)}%</div>
            <p className="text-xs text-gray-600 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.alerts.length}</div>
            <p className="text-xs text-gray-600 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PDF Generation</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.operationCounts.generation}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">Success Rate</span>
                  <span className="text-xs font-medium">{data.metrics.successRates.generation.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Avg Time</span>
                  <span className="text-xs font-medium">{data.metrics.averageResponseTimes.generation}ms</span>
                </div>
                <div className="flex items-center mt-2">
                  {getTrendIcon(data.trends.responseTimeTrend)}
                  <span className="text-xs ml-1">{data.trends.responseTimeTrend}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WhatsApp Delivery</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.operationCounts.delivery}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">Success Rate</span>
                  <span className="text-xs font-medium">{data.metrics.successRates.delivery.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Avg Time</span>
                  <span className="text-xs font-medium">{data.metrics.averageResponseTimes.delivery}ms</span>
                </div>
                <div className="flex items-center mt-2">
                  {getTrendIcon(data.trends.errorRateTrend)}
                  <span className="text-xs ml-1">{data.trends.errorRateTrend}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PDF Downloads</CardTitle>
                <Download className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.operationCounts.download}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">Success Rate</span>
                  <span className="text-xs font-medium">{data.metrics.successRates.download.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Avg Time</span>
                  <span className="text-xs font-medium">{data.metrics.averageResponseTimes.download}ms</span>
                </div>
                <div className="flex items-center mt-2">
                  {getTrendIcon(data.trends.volumeTrend)}
                  <span className="text-xs ml-1">{data.trends.volumeTrend}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>Response time categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.metrics.performanceDistribution).map(([operation, dist]: [string, any]) => (
                    <div key={operation}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{operation}</span>
                        <span className="text-xs text-gray-600">
                          {dist.fast + dist.normal + dist.slow} total
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <div
                          className="bg-green-500 h-2 rounded-l"
                          style={{ width: `${(dist.fast / (dist.fast + dist.normal + dist.slow)) * 100}%` }}
                          title={`Fast: ${dist.fast}`}
                        />
                        <div
                          className="bg-yellow-500 h-2"
                          style={{ width: `${(dist.normal / (dist.fast + dist.normal + dist.slow)) * 100}%` }}
                          title={`Normal: ${dist.normal}`}
                        />
                        <div
                          className="bg-red-500 h-2 rounded-r"
                          style={{ width: `${(dist.slow / (dist.fast + dist.normal + dist.slow)) * 100}%` }}
                          title={`Slow: ${dist.slow}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Range Analysis</CardTitle>
                <CardDescription>Performance over different periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.metrics.timeRanges).map(([period, stats]: [string, any]) => (
                    <div key={period} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{period.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Operations:</span>
                          <span className="ml-1 font-medium">{stats.totalOperations}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Success:</span>
                          <span className="ml-1 font-medium">{stats.successfulOperations}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Time:</span>
                          <span className="ml-1 font-medium">{Math.round(stats.averageResponseTime)}ms</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Error Rate:</span>
                          <span className="ml-1 font-medium">{stats.errorRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {data.alerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <CheckCircle className="h-8 w-8 text-green-600 mr-2" />
                <span className="text-lg">No active alerts - system is healthy!</span>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.alerts.map((alert: any, index: number) => (
                <Alert key={index} variant={getAlertSeverityColor(alert.severity) as any}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.type.replace(/_/g, ' ').toUpperCase()}</span>
                    <Badge variant={getAlertSeverityColor(alert.severity) as any}>
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <div>{alert.message}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                      {alert.operation && ` • Operation: ${alert.operation}`}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system operations and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.recentLogs.map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge variant={log.success ? 'default' : 'destructive'}>
                        {log.level}
                      </Badge>
                      <span className="font-medium">{log.operation}</span>
                      <span className="text-gray-600">{log.action}</span>
                      {log.serviceType && (
                        <Badge variant="outline">{log.serviceType}</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      {log.duration && <span>{log.duration}ms</span>}
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}