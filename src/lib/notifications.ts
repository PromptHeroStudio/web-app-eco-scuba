import { supabase } from "@/integrations/supabase/client";

export interface CreateNotificationParams {
  user_id: string;
  project_id?: string | null;
  type: "section_approved" | "change_requested" | "collaborator_invited" | "project_update";
  title: string;
  message?: string | null;
  action_url?: string | null;
}

/**
 * Create a notification in Supabase
 * Triggered when: section approved, change requested, collaborator invited
 */
interface NotificationEntry {
  user_id: string;
  project_id: string | null;
  type: "section_approved" | "change_requested" | "collaborator_invited" | "project_update";
  title: string;
  message: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const { error } = await supabase
      .from<NotificationEntry>("notifications")
      .insert([
        {
          user_id: params.user_id,
          project_id: params.project_id || null,
          type: params.type,
          title: params.title,
          message: params.message || null,
          action_url: params.action_url || null,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error("Error creating notification:", error);
      // Silently fail if notifications table doesn't exist yet
    }
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}

/**
 * Notify a user that their section was approved
 */
export async function notifyApprovedSection(
  user_id: string,
  project_id: string,
  section_title: string
): Promise<void> {
  await createNotification({
    user_id,
    project_id,
    type: "section_approved",
    title: `Sekcija "${section_title}" odobrena`,
    message: `Vaša sekcija je odobrena. Možete nastaviti na sljedeću.`,
    action_url: `/projects/${project_id}/edit`,
  });
}

/**
 * Notify a user that changes were requested on their section
 */
export async function notifyChangeRequest(
  user_id: string,
  project_id: string,
  section_title: string,
  reason: string
): Promise<void> {
  await createNotification({
    user_id,
    project_id,
    type: "change_requested",
    title: `Izmjena zatražena: "${section_title}"`,
    message: `Razlog: ${reason}`,
    action_url: `/projects/${project_id}/edit`,
  });
}

/**
 * Notify a user about a new collaborator invitation
 */
export async function notifyCollaboratorInvite(
  user_id: string,
  project_id: string,
  project_title: string,
  invited_by: string
): Promise<void> {
  await createNotification({
    user_id,
    project_id,
    type: "collaborator_invited",
    title: `Pozivnica za projekt "${project_title}"`,
    message: `${invited_by} vas je pozvao/la kao saradnika na ovom projektu.`,
    action_url: `/projects/${project_id}/edit`,
  });
}
