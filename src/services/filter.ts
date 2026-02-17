import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Subject, Semester } from '@/types/api';

type SubjectsPayload = {
  subjects?: Subject[];
};

type SemestersPayload = {
  subject?: Subject;
  semesters?: Semester[];
  class_id?: number;
};

function unwrap<T>(payload: any): T {
  return payload?.data ?? payload;
}

function normalizeSubjects(payload: any): Subject[] {
  const data = unwrap<any>(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.subjects)) return data.subjects;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(payload?.subjects)) return payload.subjects;
  return [];
}

function normalizeSemesters(payload: any): { semesters: Semester[]; subject?: Subject; classId?: number } {
  const data = unwrap<any>(payload);
  const semesters =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.semesters) && data.semesters) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(payload?.semesters) && payload.semesters) ||
    [];

  const subject = data?.subject || payload?.subject;
  const classId = data?.class_id ?? payload?.class_id;

  return { semesters, subject, classId };
}

export const filterService = {
  async getSubjectsByClass(classId: number | string) {
    const response = await apiClient.get<SubjectsPayload | { data: SubjectsPayload }>(
      API_ENDPOINTS.FILTER.SUBJECTS_BY_CLASS(classId)
    );
    return normalizeSubjects(response);
  },
  async getSemestersBySubject(subjectId: number | string) {
    const response = await apiClient.get<SemestersPayload | { data: SemestersPayload }>(
      API_ENDPOINTS.FILTER.SEMESTERS_BY_SUBJECT(subjectId)
    );
    return normalizeSemesters(response);
  },
  async getFileTypesBySemester(semesterId: number | string) {
    return apiClient.get(API_ENDPOINTS.FILTER.FILE_TYPES_BY_SEMESTER(semesterId));
  }
};