/** Persistent semantic owner, safe on the complete reader route without graphics imports. */
import type { CaseFile } from './contract';
import { createCaseSceneModel, presentCaseScene } from './layout';
import { initialSceneState, reduceCaseScene, sampleCamera } from './state';
import type { CaseSceneState, SceneAction } from './state';

export class ActiveClock {
  private value=0;private last:number|null=null;private visible=true;
  advance(wallMs:number):number {if(!Number.isFinite(wallMs))throw new Error('Finite clock required');if(this.visible&&this.last!==null)this.value+=Math.max(0,Math.min(100,wallMs-this.last));this.last=this.visible?wallMs:null;return this.value;}
  setVisible(visible:boolean,wallMs:number):number {this.advance(wallMs);this.visible=visible;this.last=null;return this.value;}
  get now():number {return this.value;}
}
/** Keep this above MapBoundary. A renderer can be removed/recreated without resetting
 * node/edge/fact selection, reveal state, navigation history or evidence modal ownership. */
export class CaseController {
  readonly model;readonly clock=new ActiveClock();private current:CaseSceneState;
  readonly file:CaseFile;
  constructor(input:CaseFile,reducedMotion=false){this.model=createCaseSceneModel(input);this.file=this.model.caseFile;this.current=initialSceneState(this.file,this.model,reducedMotion);}
  get state():CaseSceneState{return this.current;}
  dispatch(action:SceneAction,wallMs:number):CaseSceneState {this.current=reduceCaseScene(this.file,this.model,this.current,action,this.clock.advance(wallMs));return this.current;}
  tick(wallMs:number):CaseSceneState {const time=this.clock.advance(wallMs);if(this.current.motion)this.current=reduceCaseScene(this.file,this.model,this.current,{type:'tick',token:this.current.motion.token},time);return this.current;}
  get presentation(){return presentCaseScene(this.model,this.current.navigation,sampleCamera(this.current,this.clock.now).zoom);}
}
