import type { Project } from './mockData';
import type { Participant } from './mockParticipants';
import { resolveAcademicYearBE } from './cohortUtils';
import { academicYears } from './reportUtils';

// A person is counted once; a project is counted once even for multi-day attendance.
export function scopeParticipants(roster: Participant[], projects: Project[]): Participant[] {
  const ids = new Set(projects.map(project => project.id));
  return roster.map(person => {
    const registeredProjects = Array.from(new Set(person.registeredProjects.filter(id => ids.has(id))));
    const registered = new Set(registeredProjects);
    return { ...person, registeredProjects, attendedProjects: Array.from(new Set(person.attendedProjects.filter(id => registered.has(id)))) };
  }).filter(person => person.registeredProjects.length > 0);
}

// All-year history uses one explicitly labelled snapshot, never the wall-clock year.
// Projects without individual records must not advance that snapshot.
export function participantReferenceYear(projects: Project[], roster: Participant[], selectedYear = 'all'): number | null {
  if (selectedYear !== 'all') {
    const available = academicYears(projects);
    const fallback = available.length ? Math.max(...available) : 2568;
    return resolveAcademicYearBE(selectedYear, fallback);
  }
  const recordedIds = new Set(roster.flatMap(person => person.registeredProjects));
  const years = projects.filter(project => recordedIds.has(project.id)).map(project => project.academicYear)
    .filter((year): year is number => typeof year === 'number' && Number.isFinite(year) && year > 2500 && year < 2650);
  return years.length ? Math.max(...years) : null;
}

export function participantAttendanceRate(person: Participant): number | null {
  const registered = new Set(person.registeredProjects);
  if (!registered.size) return null;
  const attended = new Set(person.attendedProjects.filter(id => registered.has(id)));
  return attended.size / registered.size * 100;
}
