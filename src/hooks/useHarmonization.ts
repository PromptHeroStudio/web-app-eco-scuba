import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useProjectStore } from '@/store/projectStore';
import { APACollectedData, Project, ProjectSection } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useHarmonization(activeSectionId?: string) {
    const { currentProject, setCurrentProject, sections, updateSection } = useProjectStore();
    const previousProjectRef = useRef<Project | null>(null);

    const findApprovedSectionsContaining = useCallback(async (searchValue: string): Promise<{ ids: string[]; titles: string[] }> => {
        if (!currentProject?.id || !searchValue) {
            return { ids: [], titles: [] };
        }

        const { data, error } = await supabase
            .from<ProjectSection>('project_sections')
            .select('id, section_title_bs')
            .eq('project_id', currentProject.id)
            .eq('status', 'approved')
            .ilike('content_html', `%${searchValue}%`);

        if (error) {
            console.error('[useHarmonization] Search error:', error);
            return { ids: [], titles: [] };
        }

        const results = data || [];
        return {
            ids: results.map((section) => section.id),
            titles: results.map((section) => section.section_title_bs),
        };
    }, [currentProject]);

    const markSectionsForRevision = useCallback(async (sectionIds: string[], sectionTitles: string[]) => {
        if (!sectionIds.length) return;

        const filteredIds = sectionIds.filter((id) => id !== activeSectionId);
        if (!filteredIds.length) return;

        const { error } = await supabase
            .from('project_sections')
            .update({ status: 'revision_requested' })
            .in('id', filteredIds);

        if (error) {
            console.error('[useHarmonization] Update error:', error);
            return;
        }

        filteredIds.forEach((sectionId) => {
            updateSection(sectionId, { status: 'revision_requested' });
        });

        const uniqueTitles = Array.from(new Set(sectionTitles));
        toast.warning(`Promjena budžeta zahtijeva reviziju sekcija: ${uniqueTitles.join(', ')}`);
    }, [activeSectionId, updateSection]);

    const syncProjectData = useCallback(async (updatedProject: Project) => {
        setCurrentProject(updatedProject);

        const { error } = await supabase
            .from('projects')
            .update({
                apa_collected_data: updatedProject.apa_collected_data,
                total_budget_km: updatedProject.total_budget_km,
            })
            .eq('id', updatedProject.id);

        if (error) {
            console.error('[useHarmonization] Project sync failed:', error);
        }
    }, [setCurrentProject]);

    useEffect(() => {
        if (!currentProject) {
            previousProjectRef.current = null;
            return;
        }

        const previousProject = previousProjectRef.current;
        if (!previousProject) {
            previousProjectRef.current = currentProject;
            return;
        }

        const budgetChanged = previousProject.total_budget_km !== currentProject.total_budget_km;

        const apaKeysChanged = Object.keys(currentProject.apa_collected_data).filter((key) => {
            const currentValue = currentProject.apa_collected_data[key as keyof APACollectedData];
            const previousValue = previousProject.apa_collected_data[key as keyof APACollectedData];
            return JSON.stringify(currentValue) !== JSON.stringify(previousValue);
        });

        const handleUpdate = async () => {
            const searchValues: string[] = [];

            if (budgetChanged && previousProject.total_budget_km != null) {
                searchValues.push(String(previousProject.total_budget_km));
            }

            apaKeysChanged.forEach((key) => {
                const previousValue = previousProject.apa_collected_data[key as keyof APACollectedData];
                if (previousValue != null) {
                    searchValues.push(String(previousValue));
                }
            });

            const allSectionIds: string[] = [];
            const allSectionTitles: string[] = [];

            for (const value of searchValues) {
                const { ids, titles } = await findApprovedSectionsContaining(value);
                allSectionIds.push(...ids);
                allSectionTitles.push(...titles);
            }

            if (allSectionIds.length > 0) {
                await markSectionsForRevision(allSectionIds, allSectionTitles);
            }

            if (budgetChanged || apaKeysChanged.length > 0) {
                await syncProjectData(currentProject);
            }
        };

        handleUpdate();
        previousProjectRef.current = currentProject;
    }, [currentProject, findApprovedSectionsContaining, markSectionsForRevision, syncProjectData]);
}
