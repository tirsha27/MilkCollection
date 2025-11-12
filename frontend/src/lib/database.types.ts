export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chilling_centers: {
        Row: {
          id: string
          name: string
          location_lat: number | null
          location_lng: number | null
          address: string | null
          capacity_liters: number
          current_utilization: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          location_lat?: number | null
          location_lng?: number | null
          address?: string | null
          capacity_liters?: number
          current_utilization?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          location_lat?: number | null
          location_lng?: number | null
          address?: string | null
          capacity_liters?: number
          current_utilization?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      vehicles: {
        Row: {
          id: string
          chilling_center_id: string | null
          vehicle_number: string
          capacity_liters: number
          driver_name: string | null
          driver_contact: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          chilling_center_id?: string | null
          vehicle_number: string
          capacity_liters?: number
          driver_name?: string | null
          driver_contact?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          chilling_center_id?: string | null
          vehicle_number?: string
          capacity_liters?: number
          driver_name?: string | null
          driver_contact?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      farmers: {
        Row: {
          id: string
          name: string
          contact: string | null
          location_lat: number | null
          location_lng: number | null
          address: string | null
          daily_supply_capacity: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          contact?: string | null
          location_lat?: number | null
          location_lng?: number | null
          address?: string | null
          daily_supply_capacity?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact?: string | null
          location_lat?: number | null
          location_lng?: number | null
          address?: string | null
          daily_supply_capacity?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      routes: {
        Row: {
          id: string
          vehicle_id: string | null
          route_name: string
          total_distance_km: number | null
          total_time_minutes: number | null
          total_collection_liters: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          vehicle_id?: string | null
          route_name: string
          total_distance_km?: number | null
          total_time_minutes?: number | null
          total_collection_liters?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          vehicle_id?: string | null
          route_name?: string
          total_distance_km?: number | null
          total_time_minutes?: number | null
          total_collection_liters?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      route_stops: {
        Row: {
          id: string
          route_id: string | null
          farmer_id: string | null
          stop_sequence: number
          estimated_collection_liters: number | null
          distance_from_previous_km: number | null
          time_from_previous_minutes: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          route_id?: string | null
          farmer_id?: string | null
          stop_sequence: number
          estimated_collection_liters?: number | null
          distance_from_previous_km?: number | null
          time_from_previous_minutes?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          route_id?: string | null
          farmer_id?: string | null
          stop_sequence?: number
          estimated_collection_liters?: number | null
          distance_from_previous_km?: number | null
          time_from_previous_minutes?: number | null
          created_at?: string | null
        }
      }
      optimization_runs: {
        Row: {
          id: string
          trigger_type: string
          trigger_details: Json | null
          status: string | null
          started_at: string | null
          completed_at: string | null
          results_summary: Json | null
        }
        Insert: {
          id?: string
          trigger_type: string
          trigger_details?: Json | null
          status?: string | null
          started_at?: string | null
          completed_at?: string | null
          results_summary?: Json | null
        }
        Update: {
          id?: string
          trigger_type?: string
          trigger_details?: Json | null
          status?: string | null
          started_at?: string | null
          completed_at?: string | null
          results_summary?: Json | null
        }
      }
      optimization_changes: {
        Row: {
          id: string
          optimization_run_id: string | null
          change_type: string
          entity_type: string
          entity_id: string | null
          before_state: Json | null
          after_state: Json | null
          impact_metrics: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          optimization_run_id?: string | null
          change_type: string
          entity_type: string
          entity_id?: string | null
          before_state?: Json | null
          after_state?: Json | null
          impact_metrics?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          optimization_run_id?: string | null
          change_type?: string
          entity_type?: string
          entity_id?: string | null
          before_state?: Json | null
          after_state?: Json | null
          impact_metrics?: Json | null
          created_at?: string | null
        }
      }
      system_config: {
        Row: {
          id: string
          config_key: string
          config_value: Json
          description: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          config_key: string
          config_value: Json
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          updated_at?: string | null
        }
      }
      uploaded_files: {
        Row: {
          id: string
          file_name: string
          file_type: string | null
          upload_status: string | null
          records_processed: number | null
          error_log: Json | null
          uploaded_at: string | null
        }
        Insert: {
          id?: string
          file_name: string
          file_type?: string | null
          upload_status?: string | null
          records_processed?: number | null
          error_log?: Json | null
          uploaded_at?: string | null
        }
        Update: {
          id?: string
          file_name?: string
          file_type?: string | null
          upload_status?: string | null
          records_processed?: number | null
          error_log?: Json | null
          uploaded_at?: string | null
        }
      }
      system_config_options: {
        Row: {
          id: string
          config_key: string
          option_value: string
          option_label: string
          is_default: boolean | null
          display_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          config_key: string
          option_value: string
          option_label: string
          is_default?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          config_key?: string
          option_value?: string
          option_label?: string
          is_default?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
      }
    }
  }
}
