// Popup appearance is delivered atomically with its HTML, independently of cached CSS.
export const retentionPopupStyles=String.raw`/* Kept with popup HTML so cached external styles cannot break this form. */
#retention-modal,#retention-modal *{box-sizing:border-box}
.retention-modal{font-family:Manrope,Arial,sans-serif;font-size:16px;line-height:1.6;text-align:left;outline:0}
.retention-modal:not([open]){display:none}
.retention-copy h2,.retention-description,.retention-direct-call{margin:0}
.retention-modal button,.retention-modal input{font-family:inherit}
.retention-modal button{cursor:pointer}
.retention-submit{display:flex;align-items:center;justify-content:center;padding:16px 24px;border:1px solid #00777e;background:#00777e;color:#fff;font-weight:600;line-height:1.25;text-align:center}
.retention-submit:hover{background:var(--teal-dark,#00585e);border-color:var(--teal-dark,#00585e)}
.retention-form .consent{display:flex;text-align:left}
.retention-form .consent input{accent-color:#00777e}
.retention-form .consent a{color:inherit}
.retention-form .honeypot{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.retention-form .form-error{color:#b7292d}
.retention-direct-call a{font-weight:600;text-decoration:none}
.retention-close:focus-visible{outline:2px solid #00777e;outline-offset:2px}
@keyframes retention-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
/* A single callback invitation per visit, shared by every page. */
.retention-modal{width:calc(100% - 32px);max-width:880px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);padding:0;border:0;border-radius:24px;background:#fff;color:var(--ink,#222727);box-shadow:0 30px 100px rgba(0,34,36,.3);overflow:auto;overscroll-behavior:contain}
.retention-modal[open]{position:fixed;inset:0;height:fit-content;margin:auto;animation:retention-enter .25s ease both}
.retention-modal::backdrop{background:rgba(3,20,20,.64);backdrop-filter:blur(4px)}
.retention-shell{position:relative;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);min-height:550px}
.retention-copy{min-width:0;padding:40px 34px 34px 40px}
.retention-copy h2{font-size:34px;line-height:1.12;letter-spacing:-.05em;font-weight:650}
.retention-description{margin-top:20px;color:var(--muted,#6e7474);font-size:17px;line-height:1.6}
.retention-description strong{color:var(--ink,#222727);font-weight:550}
.retention-form{min-width:0;margin-top:26px}
.retention-phone-field{display:flex;align-items:center;gap:12px;padding:0 16px;border:1px solid #cddad8;border-radius:12px;background:#fff;min-height:56px}
.retention-phone-field:focus-within{border-color:var(--teal,#00777e);box-shadow:0 0 0 3px rgba(0,119,126,.09)}
.retention-phone-field .ui-icon{width:21px;height:21px;flex:0 0 21px;color:var(--muted,#6e7474)}
.retention-phone-field input{width:100%;min-width:0;padding:14px 0;border:0;border-radius:0;background:transparent;color:var(--ink,#222727);font-size:16px;outline:0}
.retention-form .form-error:empty{display:none}
.retention-form .form-error:not(:empty){margin-top:9px;font-size:12px}
.retention-submit{width:100%;margin-top:12px;gap:11px;border-radius:12px;min-height:54px;font-size:16px}
.retention-submit .ui-icon{width:20px;height:20px}
.retention-form .consent{margin-top:14px;font-size:10px;line-height:1.5;color:var(--muted,#6e7474);align-items:flex-start;gap:8px}
.retention-form .consent input{flex:0 0 16px;width:16px;height:16px;margin:1px 0 0}
.retention-form .consent span{min-width:0}
.retention-form .consent a{text-decoration:underline;text-underline-offset:2px}
.retention-direct-call{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 6px;margin-top:24px;color:var(--muted,#6e7474);font-size:13px}
.retention-direct-call .phone{font-size:17px!important;letter-spacing:-.35px;color:var(--teal,#00777e);white-space:nowrap}
.retention-phone:hover{text-decoration:underline;text-underline-offset:3px}
.retention-photo{position:absolute;inset:0 0 0 calc(100% * 1.15 / 2.15);min-width:0;border-radius:0 24px 24px 0;background:#eef2ef;overflow:hidden}
.retention-photo>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 40%}
.retention-close{position:absolute;z-index:2;top:12px;right:12px;display:grid;place-items:center;width:40px;height:40px;padding:0;border:1px solid rgba(0,119,126,.12);border-radius:50%;color:var(--teal-dark,#00585e);background:#fff;box-shadow:0 3px 14px rgba(0,34,36,.08)}
.retention-close:hover{background:var(--teal-soft,#eaf5f4)}
.retention-form .thank-you{text-align:left;padding:12px 0}
.retention-form .thank-you h3{font-size:25px}
.retention-form .thank-you p{font-size:14px}
@media(max-width:641px){
 .retention-modal{width:calc(100% - 24px);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);border-radius:20px}
 .retention-shell{display:block;min-height:0}
 .retention-copy{padding:26px 22px 24px}
 .retention-copy h2{min-height:0;padding-right:26px;font-size:clamp(22px,6.4vw,26px);line-height:1.18;max-width:none}
 .retention-photo{position:static;inset:auto;display:block;width:clamp(90px,25vw,112px);height:auto;margin:20px auto 0;border-radius:0;background:transparent;overflow:visible}
 .retention-photo>img{position:static;inset:auto;width:100%;height:auto;aspect-ratio:1;object-position:50% 28%;border-radius:16px}
 .retention-description{margin-top:22px;font-size:15px;line-height:1.65}
 .retention-description strong{display:block;margin-top:16px;font-weight:650}
 .retention-form{margin-top:20px}
 .retention-form .consent{font-size:11px}
 .retention-direct-call{display:block;margin-top:24px;padding-top:20px;border-top:1px solid #e2e5e4;font-size:13px;text-align:center}
 .retention-direct-call .phone{display:block;margin-top:7px;font-size:clamp(20px,6vw,26px)!important;font-weight:700;line-height:1.4}
 .retention-close{position:sticky;float:right;width:32px;height:32px;top:10px;right:auto;margin:10px 10px -42px 0}
}
@media(prefers-reduced-motion:reduce){.retention-modal[open]{animation:none}}

.retention-phone-field>.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
