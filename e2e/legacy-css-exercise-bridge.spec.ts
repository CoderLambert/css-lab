import { expect, test } from "@playwright/test";
import { deriveLegacyCssExerciseInputs } from "../src/features/learning/lib/legacy-css-exercise-bridge";
import type { Exercise } from "../src/lib/content/types";

function exercise(): Exercise {
  return {
    schemaVersion:2,id:"e",revision:1,slug:"e",title:"E",prompt:"x",order:1,status:"published",
    hints:[],checks:[],courseId:"c",moduleId:"m",lessonId:"l",
    workspace:{definition:{files:[
      {path:"index.html",language:"html",editable:false},
      {path:"base.css",language:"css",editable:false},
      {path:"style.css",language:"css",editable:true},
    ]},starter:{files:{"index.html":"<div/>","base.css":"body{}","style.css":".x{}"}}},
    runtime:{type:"browser",entry:"index.html"},
  };
}
test("temporary CSS bridge derives current topology and fails closed",()=>{
  expect(deriveLegacyCssExerciseInputs(exercise())).toEqual({html:"<div/>",baseCss:"body{}",starterCss:".x{}"});
  const bad=exercise();
  bad.workspace.definition.files[2]={path:"other.css",language:"css",editable:true};
  expect(()=>deriveLegacyCssExerciseInputs(bad)).toThrow(/compatibility topology/);
});
