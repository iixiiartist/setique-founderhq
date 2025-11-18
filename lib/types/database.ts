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
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          settings: Json | null
          gamification: Json | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          settings?: Json | null
          gamification?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          settings?: Json | null
          gamification?: Json | null
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          text: string
          status: 'Todo' | 'InProgress' | 'Done'
          priority: 'Low' | 'Medium' | 'High'
          due_date: string | null
          completed_at: string | null
          category: string
          crm_item_id: string | null
          contact_id: string | null
          notes: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          text: string
          status?: 'Todo' | 'InProgress' | 'Done'
          priority?: 'Low' | 'Medium' | 'High'
          due_date?: string | null
          completed_at?: string | null
          category: string
          crm_item_id?: string | null
          contact_id?: string | null
          notes?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          text?: string
          status?: 'Todo' | 'InProgress' | 'Done'
          priority?: 'Low' | 'Medium' | 'High'
          due_date?: string | null
          completed_at?: string | null
          category?: string
          crm_item_id?: string | null
          contact_id?: string | null
          notes?: Json | null
        }
      }
      crm_items: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          company: string
          type: 'investor' | 'customer' | 'partner'
          priority: 'Low' | 'Medium' | 'High'
          status: string
          next_action: string | null
          next_action_date: string | null
          check_size: number | null
          deal_value: number | null
          opportunity: string | null
          notes: Json | null
          assigned_to: string | null
          assigned_to_name: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          company: string
          type: 'investor' | 'customer' | 'partner'
          priority?: 'Low' | 'Medium' | 'High'
          status: string
          next_action?: string | null
          next_action_date?: string | null
          check_size?: number | null
          deal_value?: number | null
          opportunity?: string | null
          notes?: Json | null
          assigned_to?: string | null
          assigned_to_name?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          company?: string
          type?: 'investor' | 'customer' | 'partner'
          priority?: 'Low' | 'Medium' | 'High'
          status?: string
          next_action?: string | null
          next_action_date?: string | null
          check_size?: number | null
          deal_value?: number | null
          opportunity?: string | null
          notes?: Json | null
          assigned_to?: string | null
          assigned_to_name?: string | null
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          crm_item_id: string
          created_at: string
          updated_at: string
          name: string
          email: string
          linkedin: string
          notes: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          crm_item_id: string
          created_at?: string
          updated_at?: string
          name: string
          email: string
          linkedin: string
          notes?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          crm_item_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string
          linkedin?: string
          notes?: Json | null
        }
      }
      meetings: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          created_at: string
          updated_at: string
          timestamp: string
          title: string
          attendees: string
          summary: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id: string
          created_at?: string
          updated_at?: string
          timestamp: string
          title: string
          attendees: string
          summary: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string
          created_at?: string
          updated_at?: string
          timestamp?: string
          title?: string
          attendees?: string
          summary?: string
        }
      }
      marketing_items: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          title: string
          type: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Other'
          status: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled'
          due_date: string | null
          notes: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          title: string
          type: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Other'
          status?: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled'
          due_date?: string | null
          notes?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          title?: string
          type?: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Other'
          status?: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled'
          due_date?: string | null
          notes?: Json | null
        }
      }
      financial_logs: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          date: string
          mrr: number
          gmv: number
          signups: number
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          date: string
          mrr: number
          gmv: number
          signups: number
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          date?: string
          mrr?: number
          gmv?: number
          signups?: number
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          name: string
          mime_type: string
          content: string
          module: string
          company_id: string | null
          contact_id: string | null
          notes: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          name: string
          mime_type: string
          content: string
          module: string
          company_id?: string | null
          contact_id?: string | null
          notes?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          name?: string
          mime_type?: string
          content?: string
          module?: string
          company_id?: string | null
          contact_id?: string | null
          notes?: Json | null
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          created_at: string
          updated_at: string
          date: string
          category: string
          amount: number
          description: string
          vendor: string | null
          payment_method: string | null
          receipt_document_id: string | null
          notes: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          created_at?: string
          updated_at?: string
          date: string
          category: string
          amount: number
          description: string
          vendor?: string | null
          payment_method?: string | null
          receipt_document_id?: string | null
          notes?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          created_at?: string
          updated_at?: string
          date?: string
          category?: string
          amount?: number
          description?: string
          vendor?: string | null
          payment_method?: string | null
          receipt_document_id?: string | null
          notes?: Json | null
        }
      }
      workspaces: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          plan_type: string
          owner_id: string
          seat_count: number
          ai_usage_count: number
          ai_usage_reset_date: string
          storage_bytes_used: number
          file_count: number
          team_xp: number
          team_level: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          plan_type?: string
          owner_id: string
          seat_count?: number
          ai_usage_count?: number
          ai_usage_reset_date?: string
          storage_bytes_used?: number
          file_count?: number
          team_xp?: number
          team_level?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          plan_type?: string
          owner_id?: string
          seat_count?: number
          ai_usage_count?: number
          ai_usage_reset_date?: string
          storage_bytes_used?: number
          file_count?: number
          team_xp?: number
          team_level?: number
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          joined_at: string
          invited_by: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          joined_at?: string
          invited_by?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          invited_by?: string | null
        }
      }
      workspace_achievements: {
        Row: {
          id: string
          workspace_id: string
          achievement_id: string
          unlocked_at: string
          unlocked_by_user_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          workspace_id: string
          achievement_id: string
          unlocked_at?: string
          unlocked_by_user_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          workspace_id?: string
          achievement_id?: string
          unlocked_at?: string
          unlocked_by_user_id?: string | null
          metadata?: Json | null
        }
      }
      business_profile: {
        Row: {
          id: string
          workspace_id: string
          created_at: string
          updated_at: string
          company_name: string
          industry: string | null
          company_size: string | null
          founded_year: number | null
          website: string | null
          business_model: string | null
          description: string | null
          target_market: string | null
          value_proposition: string | null
          primary_goal: string | null
          key_challenges: string | null
          growth_stage: string | null
          current_mrr: number | null
          target_mrr: number | null
          current_arr: number | null
          customer_count: number | null
          team_size: number | null
          remote_policy: string | null
          company_values: string[] | null
          tech_stack: string[] | null
          competitors: string[] | null
          unique_differentiators: string | null
          is_complete: boolean
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          created_at?: string
          updated_at?: string
          company_name: string
          industry?: string | null
          company_size?: string | null
          founded_year?: number | null
          website?: string | null
          business_model?: string | null
          description?: string | null
          target_market?: string | null
          value_proposition?: string | null
          primary_goal?: string | null
          key_challenges?: string | null
          growth_stage?: string | null
          current_mrr?: number | null
          target_mrr?: number | null
          current_arr?: number | null
          customer_count?: number | null
          team_size?: number | null
          remote_policy?: string | null
          company_values?: string[] | null
          tech_stack?: string[] | null
          competitors?: string[] | null
          unique_differentiators?: string | null
          is_complete?: boolean
          completed_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          created_at?: string
          updated_at?: string
          company_name?: string
          industry?: string | null
          company_size?: string | null
          founded_year?: number | null
          website?: string | null
          business_model?: string | null
          description?: string | null
          target_market?: string | null
          value_proposition?: string | null
          primary_goal?: string | null
          key_challenges?: string | null
          growth_stage?: string | null
          current_mrr?: number | null
          target_mrr?: number | null
          current_arr?: number | null
          customer_count?: number | null
          team_size?: number | null
          remote_policy?: string | null
          company_values?: string[] | null
          tech_stack?: string[] | null
          competitors?: string[] | null
          unique_differentiators?: string | null
          is_complete?: boolean
          completed_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          workspace_id: string
          created_at: string
          updated_at: string
          plan_type: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          status: string
          seat_count: number
          used_seats: number
          current_period_start: string | null
          current_period_end: string | null
          trial_start: string | null
          trial_end: string | null
          canceled_at: string | null
          cancel_at_period_end: boolean
          ai_requests_used: number
          ai_requests_limit: number | null
          ai_requests_reset_at: string
          storage_bytes_used: number
          storage_bytes_limit: number | null
          file_count_used: number
          file_count_limit: number | null
          metadata: any
        }
        Insert: {
          id?: string
          workspace_id: string
          created_at?: string
          updated_at?: string
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: string
          seat_count?: number
          used_seats?: number
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          canceled_at?: string | null
          cancel_at_period_end?: boolean
          ai_requests_used?: number
          ai_requests_limit?: number | null
          ai_requests_reset_at?: string
          storage_bytes_used?: number
          storage_bytes_limit?: number | null
          file_count_used?: number
          file_count_limit?: number | null
          metadata?: any
        }
        Update: {
          id?: string
          workspace_id?: string
          created_at?: string
          updated_at?: string
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: string
          seat_count?: number
          used_seats?: number
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          canceled_at?: string | null
          cancel_at_period_end?: boolean
          ai_requests_used?: number
          ai_requests_limit?: number | null
          ai_requests_reset_at?: string
          storage_bytes_used?: number
          storage_bytes_limit?: number | null
          file_count_used?: number
          file_count_limit?: number | null
          metadata?: any
        }
      }
      revenue_transactions: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          transaction_date: string
          amount: number
          currency: string
          transaction_type: 'invoice' | 'payment' | 'refund' | 'recurring'
          status: 'pending' | 'paid' | 'overdue' | 'cancelled'
          crm_item_id: string | null
          contact_id: string | null
          deal_stage: string | null
          invoice_number: string | null
          payment_method: string | null
          payment_date: string | null
          due_date: string | null
          revenue_category: string | null
          product_line: string | null
          description: string | null
          notes: Json | null
          document_ids: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          transaction_date: string
          amount: number
          currency?: string
          transaction_type: 'invoice' | 'payment' | 'refund' | 'recurring'
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          crm_item_id?: string | null
          contact_id?: string | null
          deal_stage?: string | null
          invoice_number?: string | null
          payment_method?: string | null
          payment_date?: string | null
          due_date?: string | null
          revenue_category?: string | null
          product_line?: string | null
          description?: string | null
          notes?: Json | null
          document_ids?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          transaction_date?: string
          amount?: number
          currency?: string
          transaction_type?: 'invoice' | 'payment' | 'refund' | 'recurring'
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          crm_item_id?: string | null
          contact_id?: string | null
          deal_stage?: string | null
          invoice_number?: string | null
          payment_method?: string | null
          payment_date?: string | null
          due_date?: string | null
          revenue_category?: string | null
          product_line?: string | null
          description?: string | null
          notes?: Json | null
          document_ids?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      financial_forecasts: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          forecast_month: string
          forecast_type: 'revenue' | 'expense' | 'runway'
          forecasted_amount: number
          confidence_level: 'low' | 'medium' | 'high'
          based_on_deals: string[] | null
          assumptions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          forecast_month: string
          forecast_type: 'revenue' | 'expense' | 'runway'
          forecasted_amount: number
          confidence_level?: 'low' | 'medium' | 'high'
          based_on_deals?: string[] | null
          assumptions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          forecast_month?: string
          forecast_type?: 'revenue' | 'expense' | 'runway'
          forecasted_amount?: number
          confidence_level?: 'low' | 'medium' | 'high'
          based_on_deals?: string[] | null
          assumptions?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_plans: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          budget_name: string
          budget_period_start: string
          budget_period_end: string
          category: string
          allocated_amount: number
          spent_amount: number
          alert_threshold: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          budget_name: string
          budget_period_start: string
          budget_period_end: string
          category: string
          allocated_amount: number
          spent_amount?: number
          alert_threshold?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          budget_name?: string
          budget_period_start?: string
          budget_period_end?: string
          category?: string
          allocated_amount?: number
          spent_amount?: number
          alert_threshold?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaign_attribution: {
        Row: {
          id: string
          workspace_id: string
          marketing_item_id: string
          crm_item_id: string
          contact_id: string | null
          attribution_type: 'first_touch' | 'last_touch' | 'multi_touch'
          attribution_weight: number
          interaction_date: string
          conversion_date: string | null
          revenue_attributed: number
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          marketing_item_id: string
          crm_item_id: string
          contact_id?: string | null
          attribution_type: 'first_touch' | 'last_touch' | 'multi_touch'
          attribution_weight?: number
          interaction_date?: string
          conversion_date?: string | null
          revenue_attributed?: number
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          marketing_item_id?: string
          crm_item_id?: string
          contact_id?: string | null
          attribution_type?: 'first_touch' | 'last_touch' | 'multi_touch'
          attribution_weight?: number
          interaction_date?: string
          conversion_date?: string | null
          revenue_attributed?: number
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      marketing_calendar_links: {
        Row: {
          id: string
          workspace_id: string
          marketing_item_id: string
          linked_type: 'task' | 'calendar_event' | 'milestone'
          linked_id: string
          relationship_type: 'related' | 'deliverable' | 'milestone' | 'deadline'
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          marketing_item_id: string
          linked_type: 'task' | 'calendar_event' | 'milestone'
          linked_id: string
          relationship_type?: 'related' | 'deliverable' | 'milestone' | 'deadline'
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          marketing_item_id?: string
          linked_type?: 'task' | 'calendar_event' | 'milestone'
          linked_id?: string
          relationship_type?: 'related' | 'deliverable' | 'milestone' | 'deadline'
          created_at?: string
        }
      }
      marketing_analytics: {
        Row: {
          id: string
          workspace_id: string
          marketing_item_id: string
          analytics_date: string
          impressions: number
          clicks: number
          engagements: number
          conversions: number
          leads_generated: number
          revenue_generated: number
          ad_spend: number
          channel: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          marketing_item_id: string
          analytics_date: string
          impressions?: number
          clicks?: number
          engagements?: number
          conversions?: number
          leads_generated?: number
          revenue_generated?: number
          ad_spend?: number
          channel?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          marketing_item_id?: string
          analytics_date?: string
          impressions?: number
          clicks?: number
          engagements?: number
          conversions?: number
          leads_generated?: number
          revenue_generated?: number
          ad_spend?: number
          channel?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          workspace_id: string
          title: string
          crm_item_id: string | null
          contact_id: string | null
          value: number
          currency: string
          stage: string
          probability: number
          expected_close_date: string | null
          actual_close_date: string | null
          source: string | null
          category: string
          priority: string
          assigned_to: string | null
          assigned_to_name: string | null
          created_at: string
          updated_at: string
          notes: Json | null
          tags: string[] | null
          custom_fields: Json | null
          product_service_id: string | null
          product_service_name: string | null
          quantity: number | null
          unit_price: number | null
          discount_percent: number | null
          discount_amount: number | null
          tax_amount: number | null
          total_value: number | null
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          crm_item_id?: string | null
          contact_id?: string | null
          value: number
          currency?: string
          stage: string
          probability?: number
          expected_close_date?: string | null
          actual_close_date?: string | null
          source?: string | null
          category: string
          priority?: string
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          updated_at?: string
          notes?: Json | null
          tags?: string[] | null
          custom_fields?: Json | null
          product_service_id?: string | null
          product_service_name?: string | null
          quantity?: number | null
          unit_price?: number | null
          discount_percent?: number | null
          discount_amount?: number | null
          tax_amount?: number | null
          total_value?: number | null
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          crm_item_id?: string | null
          contact_id?: string | null
          value?: number
          currency?: string
          stage?: string
          probability?: number
          expected_close_date?: string | null
          actual_close_date?: string | null
          source?: string | null
          category?: string
          priority?: string
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          updated_at?: string
          notes?: Json | null
          tags?: string[] | null
          custom_fields?: Json | null
          product_service_id?: string | null
          product_service_name?: string | null
          quantity?: number | null
          unit_price?: number | null
          discount_percent?: number | null
          discount_amount?: number | null
          tax_amount?: number | null
          total_value?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}