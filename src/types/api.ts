export type ApiResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type User = {
  id: number;
  name: string;
  email: string;
  profile_photo_url?: string;
  phone?: string;
  bio?: string;
  job_title?: string;
  gender?: string;
  country?: string;
  email_verified_at?: string;
};

export type AuthResponse = {
  status: boolean;
  message: string;
  token: string;
  user: User;
};

export type Category = {
  id: number;
  name: string;
  slug?: string;
  icon_url?: string;
  image_url?: string;
  children?: Category[];
};

export type SchoolClass = {
  id: number;
  grade_name: string;
  grade_level: number;
};

export type Subject = {
  id: number;
  subject_name: string;
  grade_level: number;
};

export type Semester = {
  id: number;
  semester_name: string;
  grade_level: number;
};

export type Article = {
  id: number;
  title: string;
  content?: string;
  meta_description?: string;
  image?: string;
  image_url?: string;
  file_category?: string;
  created_at?: string;
  views?: number;
  downloads?: number;
  files?: FileItem[];
};

export type Post = {
  id: number;
  title: string;
  content?: string;
  meta_description?: string;
  image?: string;
  image_url?: string;
  category?: Category;
  created_at?: string;
  views?: number;
  views_count?: number;
  attachments?: FileItem[] | { data: FileItem[] };
};

export type FileItem = {
  id: number;
  file_name: string;
  file_path?: string;
  file_url?: string;
  file_category?: string;
  file_type?: string;
  file_size?: number;
};

export type Comment = {
  id: number;
  body: string;
  user?: User;
  created_at?: string;
};

export type Notification = {
  id: string;
  type: string;
  data: {
    title?: string;
    message?: string;
    url?: string;
  };
  read_at?: string | null;
  created_at: string;
};

export type Settings = Record<string, unknown>;

export type Member = {
  id: number;
  name: string;
  role?: string;
  bio?: string;
  photo_url?: string;
};

export type ContactForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactRequestPayload = ContactForm & {
  phone?: string | null;
  hp_token?: string;
  form_start?: string;
  'g-recaptcha-response': string;
};

export type CalendarEvent = {
  id: number;
  title: string;
  description?: string;
  event_date: string;
};

