import { APPOINTMENT_STATUS_PLAN } from "../config/constants.js";
import { appointmentDate } from "../helpers/dates.js";
import { validateAppointmentSeed } from "../factories/appointment.factory.js";

export function buildAppointmentSeeds(clients, staffMembers, getServiceForStaff) {
  const appointmentClients = clients.slice(0, 5);
  const appointmentStaff = staffMembers.slice(0, 5);
  const seeds = [];

  for (let i = 0; i < appointmentClients.length; i++) {
    const client = appointmentClients[i];
    const staff = appointmentStaff[i % appointmentStaff.length];
    const staffService = getServiceForStaff(staff);

    if (!staffService) {
      continue;
    }

    for (let statusIndex = 0; statusIndex < APPOINTMENT_STATUS_PLAN.length; statusIndex++) {
      const status = APPOINTMENT_STATUS_PLAN[statusIndex];
      const scheduledDate = appointmentDate(
        i + statusIndex - 4,
        9 + statusIndex * 2,
      );

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
