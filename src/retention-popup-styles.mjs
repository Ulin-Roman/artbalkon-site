// Popup appearance is delivered atomically with its HTML, independently of cached CSS.
export const retentionPopupStyles=String.raw`/* Kept with popup HTML so cached external styles cannot break this form. */
#retention-modal,#retention-modal *{box-sizing:border-box}
.retention-modal{font-family:Manrope,Arial,sans-serif;font-size:16px;line-height:1.6;text-align:left;outline:0}
.retention-modal:not([open]){display:none}
.retention-copy h2,.retention-description,.retention-direct-call{margin:0}
.retention-modal button,.retention-modal input{font-family:inherit}
.retention-modal button{cursor:pointer}
.retention-submit{display:flex;align-items:center;justify-content:center;padding:16px 24px;border:1px solid #00777e;background:var(--primary-button-background,linear-gradient(180deg,#19979e 0%,#008088 32%,#00777e 68%,#00656c 100%));color:#fff;box-shadow:var(--primary-button-shadow,0 7px 16px rgba(0,105,112,.24),inset 0 1px 1px rgba(255,255,255,.32),inset 0 -2px 3px rgba(0,55,60,.18));font-weight:600;line-height:1.25;text-align:center;transition:var(--primary-button-transition,background .18s ease,box-shadow .18s ease,transform .18s ease)}
.retention-submit:hover:not(:disabled){background:var(--primary-button-hover-background,linear-gradient(180deg,#20a0a6 0%,#00838b 32%,#00777e 68%,#005e65 100%));border-color:#006a71;box-shadow:var(--primary-button-hover-shadow,0 9px 20px rgba(0,105,112,.3),inset 0 1px 1px rgba(255,255,255,.38),inset 0 -2px 3px rgba(0,55,60,.18));transform:var(--primary-button-hover-transform,translateY(-1px))}
.retention-submit:active:not(:disabled){background:var(--primary-button-active-background,linear-gradient(180deg,#00636a 0%,#00777e 100%));box-shadow:var(--primary-button-active-shadow,0 3px 8px rgba(0,105,112,.2),inset 0 2px 4px rgba(0,45,50,.25));transform:translateY(0)}
.retention-submit:focus-visible{outline:2px solid #00777e;outline-offset:3px}
.retention-submit:disabled{cursor:wait;opacity:.6}
.retention-form .consent{display:flex;text-align:left}
.retention-form .consent input{accent-color:#00777e}
.retention-form .consent a{color:inherit}
.retention-form .honeypot{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.retention-form .form-error{color:#b7292d}
.retention-direct-call a{font-weight:600;text-decoration:none}
.retention-close:focus-visible{outline:2px solid #00777e;outline-offset:2px}
.retention-modal[data-retention-initial-focus] .retention-close:focus-visible{outline:none}
@keyframes retention-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
/* A single callback invitation per visit, shared by every page. */
.retention-modal{width:calc(100% - 32px);max-width:880px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);padding:0;border:0;border-radius:24px;background:#fff;color:var(--ink,#222727);box-shadow:0 30px 100px rgba(0,34,36,.3);overflow:auto;overscroll-behavior:contain}
.retention-modal[open]{position:fixed;inset:0;height:fit-content;margin:auto;animation:retention-enter .25s ease both}
.retention-modal::backdrop{background:rgba(3,20,20,.64);backdrop-filter:blur(4px)}
.retention-shell{position:relative;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);min-height:550px}
.retention-copy{min-width:0;padding:40px 34px 34px 40px}
.retention-copy h2{font-size:34px;line-height:1.12;letter-spacing:-.05em;font-weight:650}
.retention-description{margin-top:20px;color:var(--muted,#435954);font-size:18px;font-weight:500;line-height:1.6}
.retention-description strong{color:var(--ink,#222727);font-weight:550}
.retention-form{min-width:0;margin-top:26px}
.retention-phone-field{display:flex;align-items:center;gap:12px;padding:0 16px;border:1px solid #cddad8;border-radius:12px;background:#fff;min-height:56px}
.retention-phone-field:focus-within{border-color:var(--teal,#00777e);box-shadow:0 0 0 3px rgba(0,119,126,.09)}
.retention-phone-field .ui-icon{width:21px;height:21px;flex:0 0 21px;color:var(--muted,#6e7474)}
.retention-phone-field input{width:100%;min-width:0;padding:14px 0;border:0;border-radius:0;background:transparent;color:var(--ink,#222727);font-size:16px;outline:0}
.retention-form .form-error:empty{display:none}
.retention-form .form-error:not(:empty){margin-top:9px;font-size:14px}
.retention-submit{width:100%;margin-top:12px;gap:11px;border-radius:999px;min-height:54px;font-size:16px}
.retention-submit .ui-icon{width:20px;height:20px}
.retention-form .consent{margin-top:14px;font-size:14px;font-weight:500;line-height:1.5;color:var(--muted,#435954);align-items:flex-start;gap:8px}
.retention-form .consent input{flex:0 0 16px;width:16px;height:16px;margin:1px 0 0}
.retention-form .consent span{min-width:0}
.retention-form .consent a{text-decoration:underline;text-underline-offset:2px}
.retention-direct-call{display:flex;flex-wrap:wrap;align-items:baseline;gap:3px 6px;margin-top:24px;color:var(--muted,#435954);font-size:15px}
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
 .retention-modal{width:calc(100% - 24px);max-width:420px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);border-radius:24px}
 .retention-shell{display:block;min-height:0}
 .retention-copy{display:flex;flex-direction:column;min-width:0;padding:0 22px 22px;isolation:isolate}
 .retention-photo{position:relative;inset:auto;order:-1;flex:none;display:block;width:calc(100% + 44px);height:clamp(230px,75vw,295px);margin:0 -22px;border-radius:24px 24px 0 0;background:#eef2ef;overflow:hidden}
 .retention-photo>img{position:absolute;inset:0;width:100%;height:100%;aspect-ratio:auto;object-fit:cover;object-position:50% 16%;border-radius:0}
 .retention-photo::after{content:"";position:absolute;inset:52% 0 0;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 95%);pointer-events:none}
 .retention-copy h2{position:relative;z-index:1;min-height:0;margin-top:-28px;padding:0;font-size:clamp(32px,9vw,40px);font-weight:750;line-height:1.06;letter-spacing:-.045em;text-align:center}
 .retention-title-accent{display:block;color:var(--teal,#00777e)}
 .retention-description{min-width:0;margin-top:14px;color:#42545a;font-size:16px;line-height:1.5;text-align:center}
 .retention-description strong{display:block;margin-top:10px;font-weight:650;color:var(--ink,#222727)}
 .retention-form{margin-top:18px}
 .retention-phone-field{min-height:54px;border-radius:16px}
 .retention-submit{min-height:54px;margin-top:10px;font-size:18px}
 .retention-form .consent{margin-top:12px;font-size:13px;line-height:1.5}
 .retention-direct-call{display:flex;justify-content:center;align-items:baseline;gap:4px 6px;margin-top:16px;padding-top:14px;border-top:1px solid #e2e5e4;font-size:14px;text-align:center}
 .retention-direct-call .phone{display:inline;margin:0;font-size:16px!important;font-weight:700;line-height:1.4}
 .retention-close{position:sticky;float:right;z-index:3;width:36px;height:36px;top:10px;right:auto;margin:10px 10px -46px 0;border-color:transparent;color:#263c45;box-shadow:0 3px 14px rgba(0,34,36,.12)}
}
@media(max-width:641px) and (max-height:700px){
 .retention-photo{height:clamp(190px,36vh,240px);height:clamp(190px,36dvh,240px)}
}
@media(prefers-reduced-motion:reduce){.retention-modal[open]{animation:none}.retention-submit{--primary-button-transition:none;--primary-button-hover-transform:none}}

.retention-phone-field>.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;
