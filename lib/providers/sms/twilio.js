
export async function sendSmsTwilio({to,body}){
  const sid=process.env.TWILIO_SID, token=process.env.TWILIO_TOKEN, from=process.env.TWILIO_FROM;
  if(!(sid&&token&&from)){ console.log('[sms:twilio] (stub) to=%s body=%s', to, body); return { ok:true, stub:true }; }
  console.log('[sms:twilio] sending (stub) to=%s', to);
  return { ok:true, sid:'stub-twilio' };
}
