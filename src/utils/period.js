import dayjs from "dayjs";

export const ALLOWED_PERIODS = ["today", "this_month", "this_year"];

export function resolvePeriod(period = "this_month") {
  if (period === "today") {
    return {
      period,
      startDate: dayjs().startOf("day").toDate(),
      endDate: dayjs().endOf("day").toDate(),
    };
  }

  if (period === "this_year") {
    return {
      period,
      startDate: dayjs().startOf("year").toDate(),
      endDate: dayjs().endOf("year").toDate(),
    };
  }

  return {
    period: "this_month",
    startDate: dayjs().startOf("month").toDate(),
    endDate: dayjs().endOf("month").toDate(),
  };
}

export function toRangeWhere(period, fieldName = "createdAt") {
  const { startDate, endDate } = resolvePeriod(period);

  return {
    [fieldName]: {
      gte: startDate,
      lte: endDate,
    },
  };
}
