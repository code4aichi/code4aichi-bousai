// The enlarged frame keeps the national overview at the established zoom.
export const NATIONAL_BOUNDS=[[20,122],[46,154]];
export function fitHome(map){
 map.stop();map.invalidateSize({pan:true,animate:false});map.setView([35.1,137],5,{animate:false});
}
export function fitNation(map){
 map.stop();
 map.invalidateSize({pan:true,animate:false});
 // Enlarge the frame instead of zooming out; centre the north/south extent.
 map.setView([34.05,138],5,{animate:false});
 const viewport=map.getContainer?.().parentElement;
 if(viewport?.classList.contains("map-viewport"))viewport.scrollLeft=Math.max(0,(viewport.scrollWidth-viewport.clientWidth)/2);
}
export function observeMapSize(map,element,win=window){
 let frame;
 let {width:lastWidth,height:lastHeight}=element.getBoundingClientRect();
 function resize(){
  const {width,height}=element.getBoundingClientRect();
  if(!width||!height||(width===lastWidth&&height===lastHeight))return;
  lastWidth=width;lastHeight=height;
  if(frame)win.cancelAnimationFrame(frame);
  frame=win.requestAnimationFrame(()=>{
   frame=null;
   // Leaflet's pan adjustment preserves the geographic centre without setView.
   map.invalidateSize({pan:true,animate:false,debounceMoveend:true});
  });
 }
 const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;
 observer?.observe(element);win.addEventListener('resize',resize);
 return ()=>{observer?.disconnect();win.removeEventListener('resize',resize);if(frame)win.cancelAnimationFrame(frame)};
}
