const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function indiaDay(date = new Date()) {
    return formatter.format(date);
}

export function isNseClosed(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: string) => parts.find(part => part.type === type)?.value || '';
    if (['Sat', 'Sun'].includes(value('weekday'))) return true;
    return Number(value('hour')) * 60 + Number(value('minute')) >= 15 * 60 + 35;
}

export function daysAgo(days: number, date = new Date()) {
    return indiaDay(new Date(date.getTime() - days * 86_400_000));
}
