Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          board_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          item_id: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          board_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          board_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          item_id?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          automation_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          item_id: string | null
          status: string
        }
        Insert: {
          automation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          item_id?: string | null
          status: string
        }
        Update: {
          automation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          item_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_recipes: {
        Row: {
          actions: Json
          category: string | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          trigger_config: Json
          trigger_type: string
        }
        Insert: {
          actions?: Json
          category?: string | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          trigger_config?: Json
          trigger_type: string
        }
        Update: {
          actions?: Json
          category?: string | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          action_config: Json
          action_type: string
          actions: Json | null
          board_id: string | null
          condition_config: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          recurrence: Json | null
          run_count: number | null
          trigger_config: Json
          trigger_type: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          actions?: Json | null
          board_id?: string | null
          condition_config?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          recurrence?: Json | null
          run_count?: number | null
          trigger_config?: Json
          trigger_type: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          actions?: Json | null
          board_id?: string | null
          condition_config?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          recurrence?: Json | null
          run_count?: number | null
          trigger_config?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_forms: {
        Row: {
          board_id: string | null
          column_ids: string[]
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          settings: Json | null
          slug: string | null
          target_group_id: string | null
          title: string
        }
        Insert: {
          board_id?: string | null
          column_ids?: string[]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          settings?: Json | null
          slug?: string | null
          target_group_id?: string | null
          title: string
        }
        Update: {
          board_id?: string | null
          column_ids?: string[]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          settings?: Json | null
          slug?: string | null
          target_group_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_forms_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_forms_target_group_id_fkey"
            columns: ["target_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      board_permissions: {
        Row: {
          board_id: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          board_id?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          board_id?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_permissions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_shares: {
        Row: {
          board_id: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          password_hash: string | null
          permission: string | null
          token: string
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          password_hash?: string | null
          permission?: string | null
          token?: string
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          password_hash?: string | null
          permission?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_shares_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_templates: {
        Row: {
          category: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      board_views: {
        Row: {
          board_id: string | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          is_private: boolean | null
          name: string
          position: number | null
          view_type: string
        }
        Insert: {
          board_id?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          is_private?: boolean | null
          name: string
          position?: number | null
          view_type: string
        }
        Update: {
          board_id?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          is_private?: boolean | null
          name?: string
          position?: number | null
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_views_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          folder_id: string | null
          icon: string | null
          id: string
          name: string
          owner_id: string | null
          position: number | null
          settings: Json | null
          state: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          name: string
          owner_id?: string | null
          position?: number | null
          settings?: Json | null
          state?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          position?: number | null
          settings?: Json | null
          state?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boards_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      column_values: {
        Row: {
          column_id: string | null
          id: string
          item_id: string | null
          text_representation: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          column_id?: string | null
          id?: string
          item_id?: string | null
          text_representation?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          column_id?: string | null
          id?: string
          item_id?: string | null
          text_representation?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "column_values_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "column_values_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      columns: {
        Row: {
          board_id: string | null
          column_type: string
          created_at: string | null
          edit_permission: string | null
          id: string
          position: number
          settings: Json | null
          title: string
          width: number | null
        }
        Insert: {
          board_id?: string | null
          column_type: string
          created_at?: string | null
          edit_permission?: string | null
          id?: string
          position?: number
          settings?: Json | null
          title: string
          width?: number | null
        }
        Update: {
          board_id?: string | null
          column_type?: string
          created_at?: string | null
          edit_permission?: string | null
          id?: string
          position?: number
          settings?: Json | null
          title?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          permissions: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          permissions?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          permissions?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          board_id: string | null
          config: Json
          created_at: string | null
          dashboard_id: string | null
          id: string
          position: Json
          user_id: string | null
          widget_type: string
        }
        Insert: {
          board_id?: string | null
          config?: Json
          created_at?: string | null
          dashboard_id?: string | null
          id?: string
          position?: Json
          user_id?: string | null
          widget_type: string
        }
        Update: {
          board_id?: string | null
          config?: Json
          created_at?: string | null
          dashboard_id?: string | null
          id?: string
          position?: Json
          user_id?: string | null
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          board_id: string | null
          id: string
          position: number | null
          user_id: string | null
        }
        Insert: {
          board_id?: string | null
          id?: string
          position?: number | null
          user_id?: string | null
        }
        Update: {
          board_id?: string | null
          id?: string
          position?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          board_id: string | null
          color: string | null
          created_at: string | null
          id: string
          is_collapsed: boolean | null
          position: number
          title: string
        }
        Insert: {
          board_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          position?: number
          title: string
        }
        Update: {
          board_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_collapsed?: boolean | null
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          integration_id: string | null
          metadata: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          status: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          type: string
          workspace_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          type: string
          workspace_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      item_connections: {
        Row: {
          column_id: string
          connected_item_id: string
          created_at: string | null
          id: string
          item_id: string
        }
        Insert: {
          column_id: string
          connected_item_id: string
          created_at?: string | null
          id?: string
          item_id: string
        }
        Update: {
          column_id?: string
          connected_item_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_connections_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_connections_connected_item_id_fkey"
            columns: ["connected_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_connections_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_dependencies: {
        Row: {
          created_at: string | null
          id: string
          source_item_id: string | null
          target_item_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_item_id?: string | null
          target_item_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_item_id?: string | null
          target_item_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_dependencies_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_dependencies_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_files: {
        Row: {
          column_id: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          item_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          column_id?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          item_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          column_id?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          item_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_files_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_files_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          board_id: string | null
          created_at: string | null
          created_by: string | null
          group_id: string | null
          id: string
          name: string
          parent_item_id: string | null
          position: number
          state: string | null
          updated_at: string | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_id?: string | null
          id?: string
          name: string
          parent_item_id?: string | null
          position?: number
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          board_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_id?: string | null
          id?: string
          name?: string
          parent_item_id?: string | null
          position?: number
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          board_id: string | null
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          item_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          board_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          item_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          board_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          item_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          location: string | null
          name: string
          notification_settings: Json | null
          onboarding_completed: boolean | null
          phone: string | null
          preferences: Json | null
          timezone: string | null
          title: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          location?: string | null
          name: string
          notification_settings?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferences?: Json | null
          timezone?: string | null
          title?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          location?: string | null
          name?: string
          notification_settings?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferences?: Json | null
          timezone?: string | null
          title?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
        }
        Insert: {
          team_id: string
          user_id: string
        }
        Update: {
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      update_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_reactions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          author_id: string | null
          body: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          item_id: string | null
          parent_update_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          item_id?: string | null
          parent_update_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          item_id?: string | null
          parent_update_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "updates_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "updates_parent_update_id_fkey"
            columns: ["parent_update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          animations_enabled: boolean | null
          created_at: string | null
          date_format: string | null
          id: string
          number_format: string | null
          sidebar_auto_collapse: boolean | null
          sidebar_position: string | null
          updated_at: string | null
          user_id: string | null
          week_start: string | null
        }
        Insert: {
          animations_enabled?: boolean | null
          created_at?: string | null
          date_format?: string | null
          id?: string
          number_format?: string | null
          sidebar_auto_collapse?: boolean | null
          sidebar_position?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_start?: string | null
        }
        Update: {
          animations_enabled?: boolean | null
          created_at?: string | null
          date_format?: string | null
          id?: string
          number_format?: string | null
          sidebar_auto_collapse?: boolean | null
          sidebar_position?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          position: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          role: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          role?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          role?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          color: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          privacy: string | null
          settings: Json | null
        }
        Insert: {
          color?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          privacy?: string | null
          settings?: Json | null
        }
        Update: {
          color?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          privacy?: string | null
          settings?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_item: {
        Args: { _item_id: string; _user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_max_requests?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      delete_workspace_cascade: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      duplicate_board_full: { Args: { p_board_id: string }; Returns: string }
      duplicate_item_full: { Args: { p_item_id: string }; Returns: string }
      enforce_rate_limit: {
        Args: {
          p_action: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: undefined
      }
      get_my_work_items: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_board_admin: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      search_all: {
        Args: { _query: string }
        Returns: {
          result_board_id: string
          result_board_name: string
          result_id: string
          result_name: string
          result_type: string
          result_workspace_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer" | "guest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "member", "viewer", "guest"],
    },
  },
} as const
