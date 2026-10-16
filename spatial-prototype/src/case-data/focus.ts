export interface FocusTarget {readonly isConnected:boolean;focus(options?:FocusOptions):void}
/** Focus happens after the navigation state commits, never before it changes. */
export function createDetailFocus(){
 let pending=false;
 return {request(){pending=true;},commit(target:FocusTarget|null){if(!pending)return false;pending=false;if(!target?.isConnected)return false;target.focus({preventScroll:true});return true;}};
}
/** Restore once per opening, including when both native close and Cancel handlers run. */
export function createEvidenceFocus(){
 let opener:FocusTarget|null=null;
 return {capture(target:FocusTarget|null){opener=target;},restore(){const target=opener;opener=null;if(!target?.isConnected)return false;target.focus({preventScroll:true});return true;}};
}
