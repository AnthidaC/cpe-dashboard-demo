// Browser-facing API for Pure Static / Mock Deployment (e.g. GitHub Pages)
import { mockProjectsDB, type Project } from '@/lib/mockData';
import { mockDimStrategy } from '@/lib/mockDb';
import { mapPoliciesToPloDefinitions, type PLODefinition } from '@/lib/ploLabels';
import type { PolicyRow } from '@/lib/db/types';
import { getParticipants, type Participant } from '@/lib/mockParticipants';

export async function getProjects(): Promise<{
  projects: Project[];
  isLive: boolean;
  policies?: PolicyRow[];
  ploDefinitions?: Record<number, PLODefinition>;
}> {
  return {
    projects: [...mockProjectsDB],
    isLive: false,
    policies: mockDimStrategy as any,
    ploDefinitions: mapPoliciesToPloDefinitions(mockDimStrategy as any),
  };
}

export async function getParticipantRoster(projects: Project[]): Promise<Participant[]> {
  if (!projects.length) return [];
  return getParticipants(projects);
}

export { quarterlyData, softSkillData, yearParticipation, identityTargeting } from '@/lib/mockData';
