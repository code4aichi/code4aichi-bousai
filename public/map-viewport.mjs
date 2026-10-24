// Use a compact overview on mobile; retain the established desktop view.
export const NATIONAL_BOUNDS=[[24,123],[46,146]];
export function fitNation(map,mobile=false){
 map.stop();
 map.invalidateSize({pan:true,animate:false});
 if(mobile)map.fitBounds(NATIONAL_BOUNDS,{padding:[12,12],animate:false});
 else map.setView([37.6,137.5],5,{animate:false});
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
