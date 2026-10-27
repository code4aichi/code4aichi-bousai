// Fit Japan’s main islands, Nansei islands and Ogasawara to the frame.
export const NATIONAL_BOUNDS=[[24,122.5],[46,147]];
export function fitHome(map){fitNation(map)}
export function fitNation(map){
 map.stop();map.invalidateSize({pan:true,animate:false});
 // Remote outlying islands lie outside this overview; users can pan to them.
 map.fitBounds(NATIONAL_BOUNDS,{padding:[8,8],maxZoom:5.5,animate:false});
 const viewport=map.getContainer?.().parentElement;
 if(viewport?.classList.contains('map-viewport'))viewport.scrollLeft=Math.max(0,(viewport.scrollWidth-viewport.clientWidth)/2);
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
