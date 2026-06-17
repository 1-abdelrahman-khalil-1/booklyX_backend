import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { AppointmentStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { IncomeRange } from "../../../utils/enums.js";
import { StaffNotFoundError } from "../errors.js";

dayjs.extend(isoWeek);

export async function getIncomeStats(userId, range) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      commissionPercentage: true,
      branchId: true,
    },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }
  const staffId = staff.id;

  let currentStart, currentEnd, prevStart, prevEnd;

  if (range === IncomeRange.WEEKLY) {
    currentStart = dayjs().subtract(6, "day").startOf("day");
    currentEnd = dayjs().endOf("day");
    prevStart = dayjs().subtract(13, "day").startOf("day");
    prevEnd = dayjs().subtract(7, "day").endOf("day");
  } else {
    currentStart = dayjs().startOf("month");
    currentEnd = dayjs().endOf("month");
    prevStart = dayjs().subtract(1, "month").startOf("month");
    prevEnd = dayjs().subtract(1, "month").endOf("month");
  }

  // Fetch completed appointments from prevStart to currentEnd in a single query
  const allAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: {
        gte: prevStart.toDate(),
        lte: currentEnd.toDate(),
      },
    },
    select: {
      id: true,
      service: {
        select: {
          price: true,
          durationMinutes: true,
        },
      },
      scheduledAt: true,
    },
  });

  let currentEarnings = 0;
  let previousEarnings = 0;
  let currentServiceCount = 0;
  let totalMinutes = 0;

  const currentStartMs = currentStart.valueOf();
  const currentEndMs = currentEnd.valueOf();
  const prevStartMs = prevStart.valueOf();
  const prevEndMs = prevEnd.valueOf();

  allAppointments.forEach((apt) => {
    const scheduledTime = dayjs(apt.scheduledAt).valueOf();
    const earning = apt.service.price * (staff.commissionPercentage / 100);

    if (scheduledTime >= currentStartMs && scheduledTime <= currentEndMs) {
      currentEarnings += earning;
      currentServiceCount++;
      totalMinutes += apt.service.durationMinutes || 0;
    } else if (scheduledTime >= prevStartMs && scheduledTime <= prevEndMs) {
      previousEarnings += earning;
    }
  });

  const totalHours = Number((totalMinutes / 60).toFixed(1));

  // Calculate Growth Percentage
  let percentageChange = 0;
  let isIncrease = true;

  if (previousEarnings === 0) {
    if (currentEarnings > 0) {
      percentageChange = 100;
      isIncrease = true;
    } else {
      percentageChange = 0;
      isIncrease = true;
    }
  } else {
    const change = ((currentEarnings - previousEarnings) / previousEarnings) * 100;
    percentageChange = Number(change.toFixed(1));
    isIncrease = change >= 0;
  }

  // Generate Daily/Weekly Stats
  let dailyStats;
  let weeklyStats;

  if (range === IncomeRange.WEEKLY) {
    const dailyStatsMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      dailyStatsMap[d] = {
        date: d,
        earnings: 0,
        serviceCount: 0,
      };
    }

    allAppointments.forEach((apt) => {
      const scheduledTime = dayjs(apt.scheduledAt).valueOf();
      if (scheduledTime >= currentStartMs && scheduledTime <= currentEndMs) {
        const earning = apt.service.price * (staff.commissionPercentage / 100);
        const dateStr = dayjs(apt.scheduledAt).format("YYYY-MM-DD");
        if (dailyStatsMap[dateStr]) {
          dailyStatsMap[dateStr].earnings += earning;
          dailyStatsMap[dateStr].serviceCount += 1;
        }
      }
    });

    dailyStats = Object.values(dailyStatsMap).map((item) => ({
      ...item,
      earnings: Number(item.earnings.toFixed(2)),
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else {
    const weeks = [];
    let current = dayjs().startOf("month");
    const monthEnd = dayjs().endOf("month");
    while (current.isBefore(monthEnd) || current.isSame(monthEnd, "day")) {
      const isoWeekNum = current.isoWeek();
      if (!weeks.includes(isoWeekNum)) {
        weeks.push(isoWeekNum);
      }
      current = current.add(1, "day");
    }

    const weeklyStatsMap = {};
    weeks.forEach((isoWeekNum, index) => {
      weeklyStatsMap[isoWeekNum] = {
        week: `Week ${index + 1}`,
        earnings: 0,
        serviceCount: 0,
      };
    });

    allAppointments.forEach((apt) => {
      const scheduledTime = dayjs(apt.scheduledAt).valueOf();
      if (scheduledTime >= currentStartMs && scheduledTime <= currentEndMs) {
        const earning = apt.service.price * (staff.commissionPercentage / 100);
        const isoWeekNum = dayjs(apt.scheduledAt).isoWeek();
        if (weeklyStatsMap[isoWeekNum]) {
          weeklyStatsMap[isoWeekNum].earnings += earning;
          weeklyStatsMap[isoWeekNum].serviceCount += 1;
        }
      }
    });

    weeklyStats = Object.values(weeklyStatsMap).map((item) => ({
      ...item,
      earnings: Number(item.earnings.toFixed(2)),
    }));
  }

  // Fetch recent completed services
  const recentCompletedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: AppointmentStatus.COMPLETED,
    },
    orderBy: {
      scheduledAt: "desc",
    },
    select: {
      id: true,
      scheduledAt: true,
      service: {
        select: {
          name: true,
          price: true,
        },
      },
      client: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const recentServices = recentCompletedAppointments.map((apt) => {
    const price = apt.service.price;
    const commission = Number((price * (staff.commissionPercentage / 100)).toFixed(2));
    return {
      appointmentId: apt.id,
      clientName: apt.client.user.name,
      serviceName: apt.service.name,
      price,
      commission,
      time: apt.scheduledAt,
    };
  });

  return {
    totalEarnings: Number(currentEarnings.toFixed(2)),
    serviceCount: currentServiceCount,
    totalHours,
    range,
    growth: {
      percentageChange,
      isIncrease,
    },
    dailyStats,
    weeklyStats,
    recentServices,
  };
}

export async function getIncomeHistory(userId) {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    select: {
      id: true,
      commissionPercentage: true,
    },
  });

  if (!staff) {
    throw new StaffNotFoundError();
  }

  const completedAppointments = await prisma.appointment.findMany({
    where: {
      staffId: staff.id,
      status: AppointmentStatus.COMPLETED,
    },
    orderBy: {
      scheduledAt: "desc",
    },
    select: {
      scheduledAt: true,
      service: {
        select: {
          name: true,
          price: true,
        },
      },
      client: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return completedAppointments.map((apt) => {
    const rawPrice = apt.service.price;
    const profit = Number((rawPrice * (staff.commissionPercentage / 100)).toFixed(2));
    return {
      clientName: apt.client.user.name,
      serviceName: apt.service.name,
      price: profit,
      time: apt.scheduledAt,
    };
  });
}
