export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    organization: string;
    role: 'admin' | 'member' | 'guest';
    notification_prefs: { email: boolean; inapp: boolean; deadlines: boolean };
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    title: string;
    slug: string | null;
    owner_id: string;
    status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived';
    donor_name: string | null;
    donor_deadline: string | null;
    priority_area: string | null;
    project_locations: LocationItem[];
    total_budget_km: number | null;
    requested_budget_km: number | null;
    own_contribution_km: number | null;
    direct_beneficiaries: number | null;
    project_language: 'bs' | 'en';
    tags: string[];
    form_template_url: string | null;
    public_call_analysis: Record<string, unknown> | null;
    form_template_analysis: FormAnalysis | null;
    apa_state: APAState;
    rip_data: RIPData;
    apa_collected_data: APACollectedData;
    final_html: string | null;
    final_pdf_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectSection {
    id: string;
    project_id: string;
    section_key: string;
    section_title_bs: string;
    content_html: string | null;
    status: 'pending' | 'generating' | 'awaiting_approval' | 'approved' | 'revision_requested';
    version: number;
    is_optional: boolean;
    display_order: number;
    assigned_to: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface APACollectedData {
    project_title: string;
    applicant_name: string;
    partners: string;
    priority_area: string;
    target_group: string;
    direct_beneficiaries: number;
    project_locations: string;
    duration_months: number;
    start_date: string;
    end_date: string;
    total_budget: number;
    requested_amount: number;
    own_contribution: number;
    main_activities: string;
    strategic_goals: string;
    expected_results: string;
    methods: string;
    donor_name: string;
    donor_priorities: string;
    previous_experience: string;
    project_language: 'bs' | 'en';
}

export interface APAState {
    sections_status: Record<string, { status: string; version: number; approved_at?: string }>;
    change_log: ChangeLogEntry[];
    global_changes: string[];
    rip_complete: boolean;
}

export interface RIPData {
    legislative_framework: string;
    environmental_context: string;
    demographic_context: string;
    institutional_landscape: string;
    similar_projects: string;
    sector_data: string;
    data_gaps: string[];
    completeness: number;
}

export interface LocationItem {
    canton: string;
    municipality: string;
    city: string;
    microlocation?: string;
    coordinates?: string;
}

export interface FormTemplateField {
    field_name: string;
    field_type: string;
    required: boolean;
    label?: string;
    section?: string;
    page?: number;
    options?: string[];
}

export interface FormAnalysis {
    form_language: string;
    sections: Array<{ key: string; title_original: string; title_bs: string; order: number }>;
    color_scheme: { header_bg: string; header_text: string; accent: string };
    has_logo: boolean;
    fields?: FormTemplateField[];
    field_to_section_map?: Record<string, string>;
    field_count?: number;
    page_count?: number;
    detected_language?: string;
    form_type?: string;
    layout?: string;
    raw_summary?: string;
}

export interface ChangeLogEntry {
    id: string;
    project_id: string;
    requested_by: string;
    change_description: string;
    affected_sections: string[];
    apa_analysis: string | null;
    apa_elaboration: string | null;
    status: 'pending' | 'approved_by_user' | 'applied' | 'rejected';
    applied_at: string | null;
    created_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    project_id: string | null;
    type: string;
    title: string;
    message: string | null;
    is_read: boolean;
    action_url: string | null;
    created_at: string;
}

export interface CollaborationTask {
    id: string;
    project_id: string;
    section_id: string | null;
    assigned_to: string;
    assigned_by: string;
    task_type: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: 'open' | 'in_progress' | 'done' | 'overdue';
    priority: 'low' | 'normal' | 'high' | 'urgent';
}
