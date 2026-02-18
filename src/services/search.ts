import { articleService } from './articles';
import type { Article } from '@/types/api';

export type SearchFilters = {
  classId?: number | string;
  subjectId?: number | string;
  semesterId?: number | string;
  fileCategory?: string;
  query?: string;
  countryCode?: string;
};

export type SearchResult = {
  id: string;
  title: string;
  type: 'post' | 'article' | 'lesson';
  description?: string;
  date?: string;
};

function mapCategoryToType(category?: string): 'post' | 'article' | 'lesson' {
  const map: Record<string, 'post' | 'article' | 'lesson'> = {
    study_plan: 'lesson',
    worksheet: 'lesson',
    exam: 'lesson',
    book: 'lesson',
    record: 'article',
    article: 'article',
    post: 'post'
  };
  if (!category) return 'article';
  return map[category] || 'article';
}

function extractExcerpt(text?: string): string | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/<[^>]+>/g, '');
  return cleaned.length > 160 ? `${cleaned.slice(0, 160)}...` : cleaned;
}

export async function searchLessons(filters: SearchFilters): Promise<SearchResult[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    class_id: filters.classId,
    subject_id: filters.subjectId,
    semester_id: filters.semesterId,
    file_category: filters.fileCategory,
    q: filters.query,
    country: filters.countryCode
  };

  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  ) as Record<string, string | number | boolean>;

  const response = await articleService.list(filteredParams);
  const data: Article[] = Array.isArray(response.data) ? response.data : [];

  return (data || []).map(article => ({
    id: String(article.id),
    title: article.title,
    type: mapCategoryToType(article.file_category),
    description: article.meta_description || extractExcerpt(article.content),
    date: article.created_at
  }));
}
