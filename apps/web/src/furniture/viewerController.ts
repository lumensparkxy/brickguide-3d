export type ViewerAction = 'toggle'|'play'|'pause'|'replay'|'reset'|'seek'|'speed';
export interface ViewerController {
  mode:'overview'|'closeup'|'full';
  available:boolean;
  animated:boolean;
  playing:boolean;
  progress:number;
  speed:number;
  dispatch:(action:ViewerAction,value?:number)=>void;
}
export interface ControlledViewerProps {onController?:(controller:ViewerController|null)=>void}
