import { BranchStatus, PaymentStatus, ServiceApprovalStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";

export async function getRecentActivities() {
  const [branches, services, payments] = await Promise.all([
    prisma.branchAdmin.findMany({ take: 10, orderBy: { updatedAt: "desc" }, select: { id: true, businessName: true, status: true, createdAt: true, updatedAt: true } }),
    prisma.service.findMany({ take: 10, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, status: true, approvedAt: true, updatedAt: true, branch: { select: { businessName: true } } } }),
    prisma.subscriptionPayment.findMany({ take: 10, where: { status: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] } }, orderBy: { paidAt: "desc" }, select: { id: true, amount: true, status: true, paidAt: true, branch: { select: { businessName: true } } } }),
  ]);

  const activities = [];
  branches.forEach((b) => {
    activities.push({ id: `branch_apply_${b.id}`, type: "new_branch_application", messageKey: "ACTIVITY_NEW_BRANCH_APPLICATION", entityName: b.businessName, timestamp: b.createdAt });
    if (b.status === BranchStatus.APPROVED) activities.push({ id: `branch_approve_${b.id}`, type: "branch_approved", messageKey: "ACTIVITY_BRANCH_APPROVED", entityName: b.businessName, timestamp: b.updatedAt });
    else if (b.status === BranchStatus.REJECTED) activities.push({ id: `branch_reject_${b.id}`, type: "branch_rejected", messageKey: "ACTIVITY_BRANCH_REJECTED", entityName: b.businessName, timestamp: b.updatedAt });
  });

  services.forEach((s) => {
    if (s.status === ServiceApprovalStatus.APPROVED) activities.push({ id: `service_approve_${s.id}`, type: "service_approved", messageKey: "ACTIVITY_SERVICE_APPROVED", entityName: s.name, timestamp: s.approvedAt || s.updatedAt });
    else if (s.status === ServiceApprovalStatus.REJECTED) activities.push({ id: `service_reject_${s.id}`, type: "service_rejected", messageKey: "ACTIVITY_SERVICE_REJECTED", entityName: s.name, timestamp: s.updatedAt });
    else activities.push({ id: `service_pending_${s.id}`, type: "service_pending", messageKey: "ACTIVITY_SERVICE_PENDING", entityName: s.name, timestamp: s.updatedAt });
  });

  payments.forEach((p) => {
    if (p.status === PaymentStatus.REFUNDED) activities.push({ id: `subscription_canceled_${p.id}`, type: "subscription_canceled", messageKey: "ACTIVITY_SUBSCRIPTION_CANCELED_REFUNDED", entityName: p.branch.businessName, timestamp: p.paidAt });
    else if (p.status === PaymentStatus.PAID) activities.push({ id: `subscription_renewed_${p.id}`, type: "subscription_renewed", messageKey: "ACTIVITY_SUBSCRIPTION_RENEWED", entityName: p.branch.businessName, timestamp: p.paidAt });
  });

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
}
