import dayjs from "dayjs";

export function daysAgo(days) {
  return dayjs().subtract(days, "day").startOf("day").toDate();
}

export function monthsAgo(months) {
  return dayjs().subtract(months, "month").startOf("day").toDate();
}

export function monthsFromNow(months) {
  return dayjs().add(months, "month").startOf("day").toDate();
}

export function appointmentDate(dayOffset, hour, minute = 0) {
  return dayjs()
    .add(dayOffset, "day")
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0)
    .toDate();
}
