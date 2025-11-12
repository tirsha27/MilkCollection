/*
  # Add Configuration Options Table

  ## Overview
  This migration adds support for predefined configuration options/values.
  Users can add multiple preset values for each configuration parameter.

  ## New Tables

  ### `system_config_options`
  Stores predefined values for each configuration parameter
  - `id` (uuid, primary key)
  - `config_key` (text) - Links to system_config.config_key
  - `option_value` (text) - The preset value
  - `option_label` (text) - Display label for the option
  - `is_default` (boolean) - Whether this is the default selection
  - `display_order` (integer) - Sort order for display
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on the new table
  - Add policies for authenticated users

  ## Changes
  - Modify system_config to support multiple options per key
*/

-- Create config options table
CREATE TABLE IF NOT EXISTS system_config_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  option_value text NOT NULL,
  option_label text NOT NULL,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_config_options_key ON system_config_options(config_key);

-- Insert default options for existing config parameters
INSERT INTO system_config_options (config_key, option_value, option_label, is_default, display_order)
VALUES 
  ('max_distance_km', '50', '50 km', false, 1),
  ('max_distance_km', '100', '100 km', false, 2),
  ('max_distance_km', '150', '150 km', true, 3),
  ('max_distance_km', '200', '200 km', false, 4),
  ('max_distance_km', '250', '250 km', false, 5),
  
  ('max_time_minutes', '120', '2 hours', false, 1),
  ('max_time_minutes', '180', '3 hours', false, 2),
  ('max_time_minutes', '240', '4 hours', false, 3),
  ('max_time_minutes', '300', '5 hours', false, 4),
  ('max_time_minutes', '360', '6 hours', false, 5),
  ('max_time_minutes', '480', '8 hours', true, 6),
  
  ('grace_distance_km', '10', '10 km', false, 1),
  ('grace_distance_km', '20', '20 km', true, 2),
  ('grace_distance_km', '30', '30 km', false, 3),
  ('grace_distance_km', '50', '50 km', false, 4),
  
  ('grace_time_minutes', '30', '30 minutes', false, 1),
  ('grace_time_minutes', '60', '1 hour', true, 2),
  ('grace_time_minutes', '90', '1.5 hours', false, 3),
  ('grace_time_minutes', '120', '2 hours', false, 4),
  
  ('optimization_enabled', 'true', 'Enabled', true, 1),
  ('optimization_enabled', 'false', 'Disabled', false, 2)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE system_config_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_config_options
CREATE POLICY "Authenticated users can view config options"
  ON system_config_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert config options"
  ON system_config_options FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update config options"
  ON system_config_options FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete config options"
  ON system_config_options FOR DELETE
  TO authenticated
  USING (true);