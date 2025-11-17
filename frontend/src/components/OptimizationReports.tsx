import React, { useEffect, useState } from "react";
import { Clock, TrendingDown, MapPin, Calendar, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { OptimizationService } from "../services/optimization.service";

interface OptimizationRun {
  id: string;
  trigger_type: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  results_summary: {
    total_distance?: number;
    total_time?: number;
    total_violations?: number;
    total_clusters?: number;
    previous_distance?: number;
    new_distance?: number;
    distance_saved?: number;
    previous_time?: number;
    new_time?: number;
    time_saved?: number;
    timestamp?: string;
  };
}

export default function OptimizationReports() {
  const [machineRuns, setMachineRuns] = useState<OptimizationRun[]>([]);
  const [manualRuns, setManualRuns] = useState<OptimizationRun[]>([]);
  const [mergedRuns, setMergedRuns] = useState<OptimizationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOptimizationData();
  }, []);

  const fetchOptimizationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use your existing OptimizationService
      const machineData = await OptimizationService.getRuns();
      const manualData = await OptimizationService.getManualRuns();
      
      console.log('Machine Data:', machineData);
      console.log('Manual Data:', manualData);
      
      if (machineData.status === 'success' && manualData.status === 'success') {
        const machines = machineData.data || [];
        const manuals = manualData.data || [];
        
        setMachineRuns(machines);
        setManualRuns(manuals);
        
        // Merge and sort by created_at descending
        const merged = [...machines, ...manuals].sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        
        setMergedRuns(merged);
      } else {
        setError('Failed to fetch optimization data');
      }
    } catch (e) {
      setError(`Error loading optimization reports: ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const formatDistance = (run: OptimizationRun): string => {
    const rs = run.results_summary;
    
    if (run.trigger_type === "manual_update_optimization") {
      // For manual runs, show new distance or distance saved
      if (rs.new_distance && rs.new_distance > 0) {
        return `${rs.new_distance.toFixed(2)} km`;
      }
    }
    
    // For machine runs, show total distance
    if (rs.total_distance && rs.total_distance > 0) {
      return `${rs.total_distance.toFixed(2)} km`;
    }
    
    return "N/A";
  };

  const formatTime = (run: OptimizationRun): string => {
    const rs = run.results_summary;
    
    if (run.trigger_type === "manual_update_optimization") {
      // For manual runs, show new time
      if (rs.new_time && rs.new_time > 0) {
        return `${rs.new_time.toFixed(1)} min`;
      }
    }
    
    // For machine runs, show total time
    if (rs.total_time && rs.total_time > 0) {
      return `${rs.total_time.toFixed(1)} min`;
    }
    
    return "N/A";
  };

  const getChangesSummary = (run: OptimizationRun): string => {
    const rs = run.results_summary;
    
    if (run.trigger_type === "manual_update_optimization") {
      const changes: string[] = [];
      
      // Distance changes
      if (rs.distance_saved !== undefined && rs.distance_saved !== 0) {
        if (rs.distance_saved > 0) {
          changes.push(`Reduced distance by ${rs.distance_saved.toFixed(2)} km`);
        } else {
          changes.push(`Increased distance by ${Math.abs(rs.distance_saved).toFixed(2)} km`);
        }
      }
      
      // Time changes
      if (rs.time_saved !== undefined && rs.time_saved !== 0) {
        if (rs.time_saved > 0) {
          changes.push(`Saved ${rs.time_saved.toFixed(1)} minutes`);
        } else {
          changes.push(`Added ${Math.abs(rs.time_saved).toFixed(1)} minutes`);
        }
      }
      
      // If no specific changes, provide generic message
      if (changes.length === 0) {
        return "Manual adjustments to route assignments";
      }
      
      return changes.join(" • ");
    } else {
      // Machine-generated run
      const details: string[] = [];
      
      if (rs.total_clusters) {
        details.push(`${rs.total_clusters} clusters optimized`);
      }
      
      if (rs.total_violations !== undefined) {
        if (rs.total_violations === 0) {
          details.push("No constraint violations");
        } else {
          details.push(`${rs.total_violations} constraint violations`);
        }
      }
      
      return details.length > 0 ? details.join(" • ") : "Automated route optimization";
    }
  };

  const getImprovementBadge = (run: OptimizationRun) => {
    if (run.trigger_type !== "manual_update_optimization") return null;
    
    const rs = run.results_summary;
    const hasImprovement = (rs.distance_saved && rs.distance_saved > 0) || 
                          (rs.time_saved && rs.time_saved > 0);
    
    if (!hasImprovement) return null;
    
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        <TrendingDown className="w-3 h-3" />
        Improved
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading optimization reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">{error}</p>
          <button 
            onClick={fetchOptimizationData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Optimization Reports
              </h1>
              <p className="text-gray-600">
                Track machine-generated and manual optimization changes
              </p>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">Machine Generated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <span className="text-sm text-gray-700">Manual Override</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Runs</p>
                <p className="text-2xl font-bold text-gray-900">{mergedRuns.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Machine Optimizations</p>
                <p className="text-2xl font-bold text-gray-900">{machineRuns.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Manual Overrides</p>
                <p className="text-2xl font-bold text-gray-900">{manualRuns.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Run ID & Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Changes Made
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {mergedRuns.map((run) => {
                  const isMachine = run.trigger_type === "machine_generated_optimization";
                  const isExpanded = expandedIds.has(run.id);
                  
                  return (
                    <React.Fragment key={run.id}>
                      <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}>
                        {/* Run ID & Type */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isMachine ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {run.id.split('-')[0]}...
                              </p>
                              <p className="text-xs text-gray-500">
                                {isMachine ? 'Machine Generated' : 'Manual Override'}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Distance */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatDistance(run)}
                            </span>
                          </div>
                        </td>
                        
                        {/* Time */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatTime(run)}
                            </span>
                          </div>
                        </td>
                        
                        {/* Changes Made */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-700 max-w-xs truncate">
                              {getChangesSummary(run)}
                            </p>
                            {getImprovementBadge(run)}
                          </div>
                        </td>
                        
                        {/* Timestamp */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">
                            {run.created_at ? new Date(run.created_at).toLocaleString() : 'N/A'}
                          </p>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleExpand(run.id)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              isMachine 
                                ? 'text-blue-700 bg-blue-50 hover:bg-blue-100' 
                                : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                            }`}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                View Details
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr className={isMachine ? 'bg-blue-50' : 'bg-purple-50'}>
                          <td colSpan={6} className="px-6 py-6">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 mb-3">Performance Metrics</h4>
                                
                                {run.results_summary.total_distance !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Total Distance:</span>
                                    <span className="font-medium text-gray-900">
                                      {run.results_summary.total_distance.toFixed(2)} km
                                    </span>
                                  </div>
                                )}
                                
                                {run.results_summary.total_time !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Total Time:</span>
                                    <span className="font-medium text-gray-900">
                                      {run.results_summary.total_time.toFixed(1)} min
                                    </span>
                                  </div>
                                )}
                                
                                {run.results_summary.total_clusters !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Clusters:</span>
                                    <span className="font-medium text-gray-900">
                                      {run.results_summary.total_clusters}
                                    </span>
                                  </div>
                                )}
                                
                                {run.results_summary.total_violations !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Violations:</span>
                                    <span className={`font-medium ${run.results_summary.total_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {run.results_summary.total_violations}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {!isMachine && (
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 mb-3">Changes from Previous</h4>
                                  
                                  {run.results_summary.previous_distance !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Previous Distance:</span>
                                      <span className="font-medium text-gray-900">
                                        {run.results_summary.previous_distance.toFixed(2)} km
                                      </span>
                                    </div>
                                  )}
                                  
                                  {run.results_summary.distance_saved !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Distance Change:</span>
                                      <span className={`font-medium ${run.results_summary.distance_saved > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {run.results_summary.distance_saved > 0 ? '-' : '+'}
                                        {Math.abs(run.results_summary.distance_saved).toFixed(2)} km
                                      </span>
                                    </div>
                                  )}
                                  
                                  {run.results_summary.time_saved !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Time Change:</span>
                                      <span className={`font-medium ${run.results_summary.time_saved > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {run.results_summary.time_saved > 0 ? '-' : '+'}
                                        {Math.abs(run.results_summary.time_saved).toFixed(1)} min
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                Run ID: {run.id}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {mergedRuns.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No optimization runs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}