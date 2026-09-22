import type { ReactNode } from "react";

import FlexboxAlignmentLesson from "@content/courses/css-foundations/modules/flexbox/lessons/flexbox-alignment/lesson.mdx";

export function renderLessonContent(lessonId: string): ReactNode {
  switch (lessonId) {
    case "css.flexbox.alignment":
      return <FlexboxAlignmentLesson />;
    default:
      return null;
  }
}
