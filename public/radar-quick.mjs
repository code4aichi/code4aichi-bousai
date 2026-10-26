// The existing radar checkbox remains the single source of display state.
export function initRadarQuick(doc=document,win=window){
 const button=doc.getElementById('radar-quick-toggle'),control=doc.getElementById('show-radar');
 if(!button||!control)return;
 const sync=()=>{
  button.setAttribute('aria-pressed',String(control.checked));
  button.textContent=control.checked?'雨雲：表示':'雨雲：非表示';
  button.setAttribute('aria-label',control.checked?'雨雲（実況）を非表示にする':'雨雲（実況）を表示する');
 };
 button.addEventListener('click',()=>{
  control.checked=!control.checked;
  control.dispatchEvent(new win.Event('change',{bubbles:true}));
 });
 control.addEventListener('change',sync);
 sync();button.hidden=false;
}
if(typeof document!=='undefined')initRadarQuick();
