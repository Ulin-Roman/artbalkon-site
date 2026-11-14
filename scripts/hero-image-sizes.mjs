// Source width for landing hero cover crops. The three audited desktop heroes
// use the measured grid; other routes can retain their existing desktop hints.
// The portrait cover crop can need more pixels than the visible column width.
// Keep these bounds aligned with .landing-photo and .landing-grid in styles-extra.css.
export function heroImageSizes(aspectRatio,{insulation=false,preserveDesktop=false}={}){
 if(typeof aspectRatio!=='number'||!Number.isFinite(aspectRatio)||aspectRatio<=0)throw new TypeError('A positive image aspect ratio is required');
 const pixels=height=>Math.ceil(height*aspectRatio)+'px';
 const cover=(width,height)=>`max(${width}, ${height})`;
 const mobileHeight=insulation?`clamp(${pixels(360)}, ${Number((90*aspectRatio).toFixed(8))}vw, ${pixels(420)})`:pixels(620);
 const mobile=[];
 if(!insulation)mobile.push(`(max-width:370px) ${cover('calc(100vw - 32px)',pixels(590))}`);
 mobile.push(`(max-width:430px) ${cover('calc(100vw - 32px)',mobileHeight)}`);
 mobile.push(`(max-width:640px) ${cover('calc(100vw - 40px)',mobileHeight)}`);
 if(preserveDesktop)return [...mobile,'(max-width:1100px) 50vw','700px'].join(', ');
 // 580px is the maximum CSS minimum height across the desktop viewport rules.
 // It also leaves room for the current home copy, whose auto-height photo stretches.
 // A copy/layout change should recheck the actual cover width in the browser.
 const desktopHeight=pixels(580),gap='clamp(28px, 4vw, 64px)';
 const compactWidth=`calc((100vw - 64px - ${gap}) / 2.05)`;
 const wideWidth=`calc((min(calc(100vw - 96px), 1328px) - ${gap}) / 2.05)`;
 return [...mobile,`(max-width:1200px) ${cover(compactWidth,desktopHeight)}`,cover(wideWidth,desktopHeight)].join(', ');
}
