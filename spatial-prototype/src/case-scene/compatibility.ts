/** Separate compatibility result. Never rewrite accepted source/admission/legacy-hold fields. */
import { getSceneCase } from './catalog-bridge';
import { createCaseSceneModel } from './layout';
import type { CaseSceneModel } from './layout';
import type { CaseFile } from './contract';
export type SceneCompatibility =
  | {mode:'reviewed_scene_model';caseFile:CaseFile;model:CaseSceneModel}
  | {mode:'held_complete_v2_reader';caseFile:CaseFile;reason:string};
export function getSceneCompatibility(input:unknown):SceneCompatibility {
  // Invalid content never enters a scene or produces caller-owned reader text.
  const caseFile=getSceneCase(input);
  try {return {mode:'reviewed_scene_model',caseFile,model:createCaseSceneModel(caseFile)};}
  catch {return {mode:'held_complete_v2_reader',caseFile,reason:'No complete bounded layout for this exact case. Keep the complete v2 reader.'};}
}
