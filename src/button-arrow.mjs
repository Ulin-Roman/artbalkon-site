// A fixed viewBox keeps the visible arrow centered independently of font metrics.
const paths = {
 right: 'M2 12h20m-6-6 6 6-6 6',
 left: 'M22 12H2m6-6-6 6 6 6',
 down: 'M12 2v20m-6-6 6 6 6-6'
};
export const buttonArrow = (direction = 'right') => `<span class="button-arrow" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="${paths[direction]}"/></svg></span>`;
