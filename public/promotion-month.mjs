const moscowDateTime=new Intl.DateTimeFormat('ru-RU',{
 timeZone:'Europe/Moscow',day:'numeric',month:'long',
 hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
});

// Including the day makes Intl use the genitive month required by «до конца».
export function promotionMonth(date=new Date()){
 const parts=Object.fromEntries(moscowDateTime.formatToParts(date).map(part=>[part.type,part.value]));
 const elapsed=((Number(parts.hour)*60+Number(parts.minute))*60+Number(parts.second))*1000+date.getUTCMilliseconds();
 return {month:parts.month,millisecondsUntilMidnight:86400000-elapsed};
}
