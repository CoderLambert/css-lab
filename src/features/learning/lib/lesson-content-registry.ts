import FlexboxAlignmentLesson from "@content/courses/css-foundations/modules/flexbox/lessons/flexbox-alignment/lesson.mdx";

export function getLessonContentComponent(lessonId: string) {
  switch (lessonId) {
    case "css.flexbox.alignment":
      return FlexboxAlignmentLesson;
    default:
      return null;
  }
}
