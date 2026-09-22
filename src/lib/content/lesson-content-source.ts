export interface LessonSourceRef {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
}

export interface LessonContentInspection {
  exists: boolean;
  isEmpty: boolean;
}

export interface LessonContentInspector {
  inspectLessonContent(
    source: LessonSourceRef,
  ): Promise<LessonContentInspection>;
}
