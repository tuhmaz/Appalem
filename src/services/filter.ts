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

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function unwrap<T>(payload: unknown): T {
  if (isObject(payload) && 'data' in payload) {
    const data = payload.data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

function normalizeSubjects(payload: unknown): Subject[] {
  const data = unwrap<unknown>(payload);
  if (Array.isArray(data)) return data as Subject[];
  if (isObject(data) && Array.isArray(data.subjects)) return data.subjects as Subject[];
  if (isObject(data) && Array.isArray(data.data)) return data.data as Subject[];
  if (isObject(payload) && Array.isArray(payload.subjects)) return payload.subjects as Subject[];
  return [];
}

function normalizeSemesters(payload: unknown): { semesters: Semester[]; subject?: Subject; classId?: number } {
  const data = unwrap<unknown>(payload);

  let semesters: Semester[] = [];
  if (Array.isArray(data)) {
    semesters = data as Semester[];
  } else if (isObject(data)) {
    if (Array.isArray(data.semesters)) {
      semesters = data.semesters as Semester[];
    } else if (Array.isArray(data.data)) {
      semesters = data.data as Semester[];
    }
  }

  if (semesters.length === 0 && isObject(payload) && Array.isArray(payload.semesters)) {
    semesters = payload.semesters as Semester[];
  }

  let subject: Subject | undefined;
  if (isObject(data) && isObject(data.subject)) {
    subject = data.subject as Subject;
  } else if (isObject(payload) && isObject(payload.subject)) {
    subject = payload.subject as Subject;
  }

  let classId: number | undefined;
  if (isObject(data) && typeof data.class_id === 'number') {
    classId = data.class_id;
  } else if (isObject(payload) && typeof payload.class_id === 'number') {
    classId = payload.class_id;
  }

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
