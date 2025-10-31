
export async function sendEmailResend({to,subject,html}){
  const key = process.env.RESEND_API_KEY;
  if(!key){ console.log('[email:resend] (stub) to=%s subj=%s', to, subject); return { ok:true, stub:true }; }
  console.log('[email:resend] sending (stub) to=%s subj=%s', to, subject);
  return { ok:true, id:'stub-resend' };
}
