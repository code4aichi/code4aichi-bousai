// Includes the remote island extent; registration points are not affected areas.
export const NATIONAL_BOUNDS=[[20,122],[46,154]];
export function fitNation(map){
 map.stop();
 map.invalidateSize({pan:false});
 map.fitBounds(NATIONAL_BOUNDS,{padding:[12,12],animate:false});
}
export function observeMapSize(map,element,win=window){
 let frame,lastWidth=0,lastHeight=0;
 function resize(){
  const {width,height}=element.getBoundingClientRect();
  if(!width||!height||(width===lastWidth&&height===lastHeight))return;
  lastWidth=width;lastHeight=height;
  if(frame)win.cancelAnimationFrame(frame);
  frame=win.requestAnimationFrame(()=>{
   frame=null;
   // Keep the user's selected centre and zoom when controls wrap or rotate.
   const center=map.getCenter(),zoom=map.getZoom();
   map.invalidateSize({pan:false,debounceMoveend:true});
   map.setView(center,zoom,{animate:false});
  });
 }
 const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;
 observer?.observe(element);win.addEventListener('resize',resize);resize();
 return ()=>{observer?.disconnect();win.removeEventListener('resize',resize);if(frame)win.cancelAnimationFrame(frame)};
}
