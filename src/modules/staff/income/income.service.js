import dayjs from "dayjs";
import { AppointmentStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { IncomeRange } from "../../../utils/enums.js";
import { StaffNotFoundError } from "../errors.js";

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

  let startDate, endDate, groupByFormat;

  if (range === IncomeRange.WEEKLY) {
    startDate = dayjs().subtract(7, "day").startOf("day").toDate();
    endDate = dayjs().endOf("day").toDate();
    groupByFormat = "ddd";
  } else {
    startDate = dayjs().startOf("month").toDate();
    endDate = dayjs().endOf("month").toDate();
    groupByFormat = "DD";
  }

  const completedAppointments = await prisma.appointment.findMany({
    where: {
      staffId,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      service: {
        select: {
          price: true,
        },
      },
      scheduledAt: true,
    },
  });

  let totalEarnings = 0;
  const dailyStats = {};

  completedAppointments.forEach((apt) => {
    const earning = apt.service.price * (staff.commissionPercentage / 100);
    totalEarnings += earning;

    const dateKey = dayjs(apt.scheduledAt).format(groupByFormat);
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        date: dayjs(apt.scheduledAt).format("YYYY-MM-DD"),
        earnings: 0,
        serviceCount: 0,
      };
    }
    dailyStats[dateKey].earnings += earning;
    dailyStats[dateKey].serviceCount += 1;
  });

  const sortedDailyStats = Object.values(dailyStats).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    serviceCount: completedAppointments.length,
    range,
    dailyStats: sortedDailyStats,
  };
}
