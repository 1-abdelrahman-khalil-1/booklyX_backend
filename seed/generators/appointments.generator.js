import dayjs from "dayjs";
import { AppointmentStatus } from "../../src/generated/prisma/client.js";
import { validateAppointmentSeed } from "../factories/appointment.factory.js";

export function buildAppointmentSeeds(clients, staffMembers, getServicesForStaff) {
  const seeds = [];

  // Seed appointments from 30 days ago to 7 days in the future
  const startDayOffset = -30;
  const endDayOffset = 7;

  // 5 different times of the day
  const hours = [9, 11, 13, 15, 17];

  let appointmentIndex = 0;

  for (let dayOffset = startDayOffset; dayOffset <= endDayOffset; dayOffset++) {
    for (let h = 0; h < hours.length; h++) {
      const hour = hours[h];

      // Round-robin selection of staff and clients
      const staff = staffMembers[appointmentIndex % staffMembers.length];
      const client = clients[appointmentIndex % clients.length];
      appointmentIndex++;

      const staffServices = getServicesForStaff(staff);
      if (!staffServices || staffServices.length === 0) {
        continue;
      }

      // Rotate services round-robin per appointment
      const serviceIndex = (dayOffset - startDayOffset + h) % staffServices.length;
      const staffService = staffServices[serviceIndex];

      const scheduledDate = dayjs()
        .add(dayOffset, "day")
        .hour(hour)
        .minute(0)
        .second(0)
        .millisecond(0)
        .toDate();

      let status;
      if (dayOffset < 0) {
        // Past appointments: COMPLETED or CANCELED (e.g., 80% completed, 20% canceled)
        status = h % 5 === 4 ? AppointmentStatus.CANCELED : AppointmentStatus.COMPLETED;
      } else if (dayOffset === 0) {
        // Today's appointments: mix of IN_PROGRESS, CONFIRMED, PENDING
        if (h === 0 || h === 1) {
          status = AppointmentStatus.IN_PROGRESS;
        } else if (h === 2 || h === 3) {
          status = AppointmentStatus.CONFIRMED;
        } else {
          status = AppointmentStatus.PENDING;
        }
      } else {
        // Future appointments: CONFIRMED or PENDING
        status = h % 2 === 0 ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING;
      }

      seeds.push(
        validateAppointmentSeed({
          clientId: client.id,
          staffId: staff.id,
          serviceId: staffService.serviceId,
          branchId: staffService.branchId,
          scheduledAt: scheduledDate,
          status,
        }),
      );
    }
  }

  return seeds;
}
