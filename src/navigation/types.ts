import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  Auth: { screen?: string } | undefined;
  ArticleDetails: { articleId: number };
  Download: {
    fileId: number;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl?: string;
    filePath?: string;
  };
  PostDetails: { postId: number };
  ClassDetails: { classId: number; className?: string };
  SubjectDetails: { subjectId: number; subjectName?: string };
  SemesterDetails: {
    semesterId: number;
    fileCategory: string;
    semesterName?: string;
    categoryLabel?: string;
  };
  CategoryDetails: {
    semesterId: number;
    fileCategory: string;
    semesterName?: string;
    categoryLabel?: string;
  };
  Settings: undefined;
  Legal: undefined;
  PolicyDetails: { slug: string; title?: string };
  Contact: undefined;
  Members: undefined;
  Notifications: undefined;
  Search: undefined;
  Classes: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
