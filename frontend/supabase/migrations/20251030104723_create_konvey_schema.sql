/*
  # Konvey Procurement Planning Engine - Complete Schema

  ## Overview
  This migration creates the complete database schema for the Konvey dairy milk procurement planning system.
  The system manages milk collection from farmers through vehicles to chilling centers with optimization capabilities.

  ## New Tables

  ### 1. `chilling_centers`
  Main collection and storage facilities
  - `id` (uuid, primary key)
  - `name` (text) - Name of the chilling center
  - `location_lat` (numeric) - Latitude coordinate
  - `location_lng` (numeric) - Longitude coordinate
  - `address` (text) - Full address
  - `capacity_liters` (numeric) - Maximum capacity in liters
  - `current_utilization` (numeric) - Current usage in liters
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `vehicles`
  Fleet vehicles used for milk collection
  - `id` (uuid, primary key)
  - `chilling_center_id` (uuid, foreign key)
  - `vehicle_number` (text, unique) - Registration number
  - `capacity_liters` (numeric) - Vehicle capacity
  - `driver_name` (text)
  - `driver_contact` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `farmers`
  Milk suppliers/vendors
  - `id` (uuid, primary key)
  - `name` (text) - Farmer name
  - `contact` (text) - Contact number
  - `location_lat` (numeric) - Latitude
  - `location_lng` (numeric) - Longitude
  - `address` (text)
  - `daily_supply_capacity` (numeric) - Average daily supply in liters
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `routes`
  Planned routes for vehicles
  - `id` (uuid, primary key)
  - `vehicle_id` (uuid, foreign key)
  - `route_name` (text)
  - `total_distance_km` (numeric)
  - `total_time_minutes` (numeric)
  - `total_collection_liters` (numeric)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `route_stops`
  Individual stops on each route
  - `id` (uuid, primary key)
  - `route_id` (uuid, foreign key)
  - `farmer_id` (uuid, foreign key)
  - `stop_sequence` (integer) - Order of visit
  - `estimated_collection_liters` (numeric)
  - `distance_from_previous_km` (numeric)
  - `time_from_previous_minutes` (numeric)
  - `created_at` (timestamptz)

  ### 6. `optimization_runs`
  Historical record of optimization executions
  - `id` (uuid, primary key)
  - `trigger_type` (text) - What triggered optimization
  - `trigger_details` (jsonb) - Details about the trigger
  - `status` (text) - pending, running, completed, failed
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `results_summary` (jsonb) - Optimization results

  ### 7. `optimization_changes`
  Detailed changes from each optimization
  - `id` (uuid, primary key)
  - `optimization_run_id` (uuid, foreign key)
  - `change_type` (text) - vehicle_added, vehicle_removed, route_changed, etc.
  - `entity_type` (text) - vehicle, route, farmer
  - `entity_id` (uuid) - ID of affected entity
  - `before_state` (jsonb) - State before change
  - `after_state` (jsonb) - State after change
  - `impact_metrics` (jsonb) - Cost, distance, time savings
  - `created_at` (timestamptz)

  ### 8. `system_config`
  System-wide configuration and thresholds
  - `id` (uuid, primary key)
  - `config_key` (text, unique) - Configuration key
  - `config_value` (jsonb) - Configuration value
  - `description` (text)
  - `updated_at` (timestamptz)

  ### 9. `uploaded_files`
  Track Excel/CSV uploads
  - `id` (uuid, primary key)
  - `file_name` (text)
  - `file_type` (text)
  - `upload_status` (text) - pending, processing, completed, failed
  - `records_processed` (integer)
  - `error_log` (jsonb)
  - `uploaded_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage data
  - Restrictive by default - only authenticated users can access

  ## Indexes
  - Foreign key indexes for performance
  - Location indexes for geospatial queries
  - Timestamp indexes for historical queries
*/

-- Chilling Centers Table
CREATE TABLE IF NOT EXISTS chilling_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_lat numeric(10, 7),
  location_lng numeric(10, 7),
  address text,
  capacity_liters numeric(10, 2) NOT NULL DEFAULT 0,
  current_utilization numeric(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chilling_center_id uuid REFERENCES chilling_centers(id) ON DELETE SET NULL,
  vehicle_number text UNIQUE NOT NULL,
  capacity_liters numeric(10, 2) NOT NULL DEFAULT 0,
  driver_name text,
  driver_contact text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Farmers Table
CREATE TABLE IF NOT EXISTS farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  location_lat numeric(10, 7),
  location_lng numeric(10, 7),
  address text,
  daily_supply_capacity numeric(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Routes Table
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  route_name text NOT NULL,
  total_distance_km numeric(10, 2) DEFAULT 0,
  total_time_minutes numeric(10, 2) DEFAULT 0,
  total_collection_liters numeric(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Route Stops Table
CREATE TABLE IF NOT EXISTS route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE,
  farmer_id uuid REFERENCES farmers(id) ON DELETE CASCADE,
  stop_sequence integer NOT NULL,
  estimated_collection_liters numeric(10, 2) DEFAULT 0,
  distance_from_previous_km numeric(10, 2) DEFAULT 0,
  time_from_previous_minutes numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Optimization Runs Table
CREATE TABLE IF NOT EXISTS optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL,
  trigger_details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  results_summary jsonb DEFAULT '{}'::jsonb
);

-- Optimization Changes Table
CREATE TABLE IF NOT EXISTS optimization_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_run_id uuid REFERENCES optimization_runs(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb DEFAULT '{}'::jsonb,
  after_state jsonb DEFAULT '{}'::jsonb,
  impact_metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- System Config Table
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Uploaded Files Table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text,
  upload_status text DEFAULT 'pending',
  records_processed integer DEFAULT 0,
  error_log jsonb DEFAULT '{}'::jsonb,
  uploaded_at timestamptz DEFAULT now()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_chilling_center ON vehicles(chilling_center_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_farmer ON route_stops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_optimization_changes_run ON optimization_changes(optimization_run_id);
CREATE INDEX IF NOT EXISTS idx_chilling_centers_location ON chilling_centers(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_farmers_location ON farmers(location_lat, location_lng);

-- Insert Default System Configuration
INSERT INTO system_config (config_key, config_value, description)
VALUES 
  ('max_distance_km', '150', 'Maximum distance threshold for a vehicle route in kilometers'),
  ('max_time_minutes', '480', 'Maximum time threshold for a vehicle route in minutes'),
  ('grace_distance_km', '20', 'Grace distance beyond threshold if operationally beneficial'),
  ('grace_time_minutes', '60', 'Grace time beyond threshold if operationally beneficial'),
  ('optimization_enabled', 'true', 'Enable automatic optimization triggers')
ON CONFLICT (config_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE chilling_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chilling_centers
CREATE POLICY "Authenticated users can view chilling centers"
  ON chilling_centers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert chilling centers"
  ON chilling_centers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update chilling centers"
  ON chilling_centers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete chilling centers"
  ON chilling_centers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for vehicles
CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for farmers
CREATE POLICY "Authenticated users can view farmers"
  ON farmers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert farmers"
  ON farmers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update farmers"
  ON farmers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete farmers"
  ON farmers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for routes
CREATE POLICY "Authenticated users can view routes"
  ON routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert routes"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update routes"
  ON routes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete routes"
  ON routes FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for route_stops
CREATE POLICY "Authenticated users can view route stops"
  ON route_stops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert route stops"
  ON route_stops FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update route stops"
  ON route_stops FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete route stops"
  ON route_stops FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for optimization_runs
CREATE POLICY "Authenticated users can view optimization runs"
  ON optimization_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert optimization runs"
  ON optimization_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update optimization runs"
  ON optimization_runs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for optimization_changes
CREATE POLICY "Authenticated users can view optimization changes"
  ON optimization_changes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert optimization changes"
  ON optimization_changes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for system_config
CREATE POLICY "Authenticated users can view system config"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update system config"
  ON system_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for uploaded_files
CREATE POLICY "Authenticated users can view uploaded files"
  ON uploaded_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert uploaded files"
  ON uploaded_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update uploaded files"
  ON uploaded_files FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);