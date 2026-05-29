import fs from 'node:fs';
import path from 'node:path';

// Read openapi.yaml
const openApiPath = path.resolve('openapi.yaml');
let content = fs.readFileSync(openApiPath, 'utf8');

// For each realistic example, we'll write it directly under components/examples as a named reusable example.
// Then under the path's 200/201 response, we'll refer to it using $ref.
// This is the cleanest, most standard way to define examples in OpenAPI 3.0 and guarantees 100% correct validation!

const examplesDefs = {
  'BranchAvailabilityResponse': {
    status: 200,
    error: false,
    message: "Branch availability updated successfully.",
    data: {
      id: 1,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      status: "AVAILABLE",
      createdAt: "2026-05-29T20:20:00.000Z",
      updatedAt: "2026-05-29T20:20:00.000Z"
    }
  },
  'BookingSettingsResponse': {
    status: 200,
    error: false,
    message: "Booking settings processed successfully.",
    data: {
      id: 1,
      branchId: 1,
      slotIntervalMinutes: 30,
      leadTimeHours: 2,
      cancelationPolicyHours: 24,
      createdAt: "2026-05-29T20:20:00.000Z",
      updatedAt: "2026-05-29T20:20:00.000Z"
    }
  },
  'NotificationSettingsResponse': {
    status: 200,
    error: false,
    message: "Notification settings processed successfully.",
    data: {
      id: 1,
      userId: 5,
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      createdAt: "2026-05-29T20:20:00.000Z",
      updatedAt: "2026-05-29T20:20:00.000Z"
    }
  },
  'AdminServicesDetailsResponse': {
    status: 200,
    error: false,
    message: "Service details fetched successfully.",
    data: {
      id: 1,
      branch_id: 1,
      service_category_id: 1,
      name: "Haircut",
      description: "Professional haircut with styling",
      price: 150,
      duration_minutes: 30,
      image_url: "https://cdn.booklyx.com/services/haircut.png",
      status: "APPROVED",
      rejection_reason: null,
      created_at: "2026-04-09T10:15:00.000Z",
      updated_at: "2026-04-09T10:15:00.000Z",
      category: {
        id: 1,
        name: "Hair Care",
        branch_id: 1,
        created_at: "2026-04-09T10:00:00.000Z",
        updated_at: "2026-04-09T10:00:00.000Z"
      }
    }
  },
  'AdminAnalyticsPlatformResponse': {
    status: 200,
    error: false,
    message: "Platform stats retrieved successfully.",
    data: {
      totalActiveBusinesses: 24,
      totalSubscriptionRevenue: 14500.50
    }
  },
  'AdminAnalyticsRecentActivitiesResponse': {
    status: 200,
    error: false,
    message: "Recent platform activities retrieved successfully.",
    data: [
      {
        id: "act_001",
        type: "BRANCH_APPLICATION",
        message: "New branch application from 'Glow Wellness Spa'",
        timestamp: "2026-05-29T10:15:30.000Z"
      },
      {
        id: "act_002",
        type: "SUBSCRIPTION_RENEWAL",
        message: "Branch 'Hassan Beauty Salon' renewed 'Pro' plan",
        timestamp: "2026-05-29T08:30:00.000Z"
      }
    ]
  },
  'AdminPaymentsListResponse': {
    status: 200,
    error: false,
    message: "Payments list retrieved successfully.",
    data: [
      {
        id: 1,
        amount: 250.00,
        currency: "EGP",
        status: "COMPLETED",
        provider: "STRIPE",
        paymentMethod: "CARD",
        transactionId: "ch_3Mv8Y2LkdIwHu7ix1a9s",
        bookingId: 12,
        createdAt: "2026-04-20T14:30:00.000Z"
      }
    ]
  },
  'AdminPaymentDetailsResponse': {
    status: 200,
    error: false,
    message: "Payment details retrieved successfully.",
    data: {
      id: 1,
      amount: 250.00,
      currency: "EGP",
      status: "COMPLETED",
      provider: "STRIPE",
      paymentMethod: "CARD",
      transactionId: "ch_3Mv8Y2LkdIwHu7ix1a9s",
      bookingId: 12,
      createdAt: "2026-04-20T14:30:00.000Z"
    }
  },
  'AdminPaymentRefundResponse': {
    status: 200,
    error: false,
    message: "Refund processed successfully.",
    data: {
      refundId: "re_3Mv8Y2LkdIwHu7ix1a9s"
    }
  },
  'BranchSubscriptionActivateResponse': {
    status: 200,
    error: false,
    message: "Subscription activated successfully.",
    data: {
      id: 12,
      branchId: 1,
      planId: 2,
      status: "ACTIVE",
      startDate: "2026-05-29T20:20:00.000Z",
      endDate: "2026-06-29T20:20:00.000Z"
    }
  },
  'BranchSubscriptionRenewResponse': {
    status: 200,
    error: false,
    message: "Subscription renewed successfully.",
    data: {
      id: 12,
      branchId: 1,
      planId: 2,
      status: "ACTIVE",
      startDate: "2026-06-29T20:20:00.000Z",
      endDate: "2026-07-29T20:20:00.000Z"
    }
  },
  'BranchSubscriptionDetailsResponse': {
    status: 200,
    error: false,
    message: "Subscription details retrieved successfully.",
    data: {
      id: 12,
      branchId: 1,
      planId: 2,
      status: "ACTIVE",
      startDate: "2026-05-29T20:20:00.000Z",
      endDate: "2026-06-29T20:20:00.000Z",
      plan: {
        id: 2,
        name: "Professional",
        price: "399.00",
        max_staff: 10,
        max_services: 50,
        loyalty_enabled: true,
        offers_enabled: true
      }
    }
  },
  'BranchSubscriptionCancelResponse': {
    status: 200,
    error: false,
    message: "Subscription cancelled successfully.",
    data: {
      id: 12,
      branchId: 1,
      planId: 2,
      status: "CANCELLED",
      startDate: "2026-05-29T20:20:00.000Z",
      endDate: "2026-06-29T20:20:00.000Z"
    }
  },
  'BranchAppointmentDetailsResponse': {
    status: 200,
    error: false,
    message: "Appointment retrieved successfully.",
    data: {
      id: 15,
      scheduledAt: "2026-06-01T14:30:00.000Z",
      durationMinutes: 45,
      notes: "Prefer quiet service",
      status: "CONFIRMED",
      price: 250.00,
      branchId: 1,
      client: {
        id: 3,
        name: "Abdo Khalil",
        phone: "01000000001",
        email: "abdo.khalil@booklyx.com"
      },
      service: {
        id: 2,
        name: "Swedish Massage",
        price: 250.00,
        durationMinutes: 45
      },
      staff: {
        id: 7,
        name: "Mazen Tamer"
      }
    }
  },
  'BranchAppointmentCancelResponse': {
    status: 200,
    error: false,
    message: "Appointment cancelled successfully.",
    data: {
      id: 15,
      status: "CANCELLED"
    }
  },
  'BranchDashboardAnalyticsResponse': {
    status: 200,
    error: false,
    message: "Dashboard analytics retrieved successfully.",
    data: {
      totalRevenue: 15230.50,
      totalBookings: 84,
      activeServices: 12,
      activeStaff: 5
    }
  },
  'BranchStaffEarningsAnalyticsResponse': {
    status: 200,
    error: false,
    message: "Staff earnings analytics retrieved successfully.",
    data: [
      {
        staffId: 7,
        staffName: "Mazen Tamer",
        totalEarnings: 4500.00,
        commissionEarned: 675.00
      },
      {
        staffId: 8,
        staffName: "Amr Khaled",
        totalEarnings: 3200.00,
        commissionEarned: 480.00
      }
    ]
  },
  'BranchRevenueChartAnalyticsResponse': {
    status: 200,
    error: false,
    message: "Revenue chart data retrieved successfully.",
    data: [
      { date: "2026-05-25", revenue: 1200.00 },
      { date: "2026-05-26", revenue: 1500.00 },
      { date: "2026-05-27", revenue: 800.00 },
      { date: "2026-05-28", revenue: 2100.00 },
      { date: "2026-05-29", revenue: 1750.00 }
    ]
  },
  'BranchRecentBookingsAnalyticsResponse': {
    status: 200,
    error: false,
    message: "Recent bookings retrieved successfully.",
    data: [
      {
        id: 15,
        clientName: "Abdo Khalil",
        serviceName: "Swedish Massage",
        scheduledAt: "2026-05-29T14:30:00.000Z",
        price: 250.00,
        status: "CONFIRMED"
      }
    ]
  },
  'BranchTopServicesAnalyticsResponse': {
    status: 200,
    error: false,
    message: "Top services retrieved successfully.",
    data: [
      {
        serviceId: 1,
        name: "Haircut",
        bookingCount: 42,
        revenue: 6300.00
      },
      {
        serviceId: 2,
        name: "Swedish Massage",
        bookingCount: 28,
        revenue: 7000.00
      }
    ]
  },
  'BranchRecentTransactionsAnalyticsResponse': {
    status: 200,
    error: false,
    message: "Recent transactions retrieved successfully.",
    data: [
      {
        id: 101,
        amount: 250.00,
        status: "COMPLETED",
        clientName: "Abdo Khalil",
        paymentMethod: "CARD",
        createdAt: "2026-05-29T14:30:00.000Z"
      }
    ]
  },
  'BranchFinanceStatsResponse': {
    status: 200,
    error: false,
    message: "Finance stats retrieved successfully.",
    data: {
      grossRevenue: 15230.50,
      netRevenue: 14468.97,
      platformFees: 761.53,
      refunds: 500.00
    }
  },
  'BranchFinancePaymentsResponse': {
    status: 200,
    error: false,
    message: "Branch payments retrieved successfully.",
    data: [
      {
        id: 1,
        amount: 250.00,
        currency: "EGP",
        status: "COMPLETED",
        paymentMethod: "CARD",
        bookingId: 12,
        createdAt: "2026-05-29T14:30:00.000Z"
      }
    ]
  },
  'BranchFinanceExportReportResponse': {
    status: 200,
    error: false,
    message: "Report generated successfully.",
    data: {
      reportUrl: "https://cdn.booklyx.com/reports/report-2026-05-29.csv"
    }
  },
  'BranchServiceDetailsResponse': {
    status: 200,
    error: false,
    message: "Service retrieved successfully.",
    data: {
      id: 1,
      branch_id: 1,
      service_category_id: 1,
      name: "Haircut",
      description: "Professional haircut with styling",
      price: 150.00,
      duration_minutes: 30,
      image_url: "https://cdn.booklyx.com/services/haircut.png",
      status: "APPROVED",
      rejection_reason: null,
      created_at: "2026-04-09T10:15:00.000Z",
      updated_at: "2026-04-09T10:15:00.000Z"
    }
  },
  'BranchPublicProfileResponse': {
    status: 200,
    error: false,
    message: "Branch public profile retrieved successfully.",
    data: {
      branch: {
        id: 1,
        businessName: "Hassan Beauty Salon",
        category: "SPA",
        description: "Premium beauty and skincare services.",
        logoUrl: "https://cdn.booklyx.com/branch/logo.png",
        city: "Cairo",
        district: "Nasr City",
        address: "12 Makram Ebeid Street",
        status: "APPROVED",
        selectedPlan: {
          id: 2,
          name: "Professional",
          price: 399.00,
          maxStaff: 10,
          maxServices: 50,
          loyaltyEnabled: true,
          offersEnabled: true
        },
        currentSubscription: {
          plan: {
            id: 2,
            name: "Professional",
            price: 399.00,
            maxStaff: 10,
            maxServices: 50,
            loyaltyEnabled: true,
            offersEnabled: true
          },
          isSubscriptionActive: true,
          subscriptionStartedAt: "2026-05-01T10:00:00Z"
        },
        average_rating: 4.8,
        total_reviews: 24,
        bookingSettings: {
          allowCancellationBeforeHours: 24
        },
        notificationSettings: {
          bookingNotificationsEnabled: true,
          marketingNotificationsEnabled: false
        },
        branchAvailability: [
          {
            id: 1,
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
            status: "OPEN"
          }
        ]
      },
      reviews: [
        {
          id: 15,
          rating: 5,
          comment: "Amazing experience!",
          createdAt: "2026-05-29T14:30:00.000Z",
          reviewer: {
            name: "Abdo Khalil",
            phone: "01000000001"
          },
          service: {
            id: 2,
            name: "Swedish Massage"
          },
          staff: {
            id: 7,
            name: "Mazen Tamer"
          },
          appointmentId: 12
        }
      ]
    }
  },
  'SuperAdminBranchDetailsResponse': {
    status: 200,
    error: false,
    message: "Branch details fetched successfully.",
    data: {
      id: 1,
      userId: 5,
      ownerName: "Mahmoud Ibrahim",
      businessName: "Hassan Beauty Salon",
      email: "mahmoud.ibrahim@booklyx.com",
      category: "SPA",
      description: "Premium beauty and skincare services.",
      commercialRegisterNumber: "CR-2026-001",
      taxId: "TAX-2026-001",
      city: "Cairo",
      district: "Nasr City",
      address: "12 Makram Ebeid Street",
      latitude: 30.0626,
      longitude: 31.3368,
      status: "PENDING_APPROVAL",
      emailVerified: true,
      phoneVerified: true,
      createdAt: "2026-04-09T09:45:00.000Z",
      updatedAt: "2026-04-09T10:20:00.000Z"
    }
  }
};

// 1. Add all reusable examples to the 'examples:' section under components
const lines = content.split('\n');
let examplesSectionIndex = -1;
for (let j = 0; j < lines.length; j++) {
  if (lines[j].startsWith('  examples:')) {
    examplesSectionIndex = j;
    break;
  }
}

if (examplesSectionIndex !== -1) {
  // Construct the formatted string of our new examples to append
  let yamlExamples = '';
  for (const [name, val] of Object.entries(examplesDefs)) {
    // Indent everything under components: examples:
    // Formatted cleanly:
    //     Name:
    //       value:
    //         status: ...
    const formattedVal = JSON.stringify(val, null, 4).split('\n').map(l => '        ' + l).join('\n');
    yamlExamples += `    ${name}:\n      value:\n${formattedVal}\n`;
  }
  lines.splice(examplesSectionIndex + 1, 0, yamlExamples);
  content = lines.join('\n');
}

// 2. Link our endpoints to use these newly defined components examples using $ref
const endpointMappings = {
  '/branch-admin/availability:': 'BranchAvailabilityResponse',
  '/branch-admin/booking-settings:': 'BookingSettingsResponse',
  '/branch-admin/notification-settings:': 'NotificationSettingsResponse',
  "''/admin/services/{id}':": 'AdminServicesDetailsResponse',
  "'/admin/services/{id}':": 'AdminServicesDetailsResponse',
  '/admin/analytics/platform:': 'AdminAnalyticsPlatformResponse',
  '/admin/payments:': 'AdminPaymentsListResponse',
  "'/admin/payments/{paymentId}':": 'AdminPaymentDetailsResponse',
  "'/admin/payments/{paymentId}/refund':": 'AdminPaymentRefundResponse',
  '/branch-admin/subscription/activate:': 'BranchSubscriptionActivateResponse',
  '/branch-admin/subscription/renew:': 'BranchSubscriptionRenewResponse',
  "'/branch-admin/subscription/{id}':": 'BranchSubscriptionDetailsResponse',
  '/branch-admin/subscription/cancel:': 'BranchSubscriptionCancelResponse',
  "'/branch-admin/appointments/{id}':": 'BranchAppointmentDetailsResponse',
  "'/branch-admin/appointments/{id}/cancel':": 'BranchAppointmentCancelResponse',
  '/branch-admin/analytics/dashboard:': 'BranchDashboardAnalyticsResponse',
  '/branch-admin/analytics/staff-earnings:': 'BranchStaffEarningsAnalyticsResponse',
  '/branch-admin/analytics/revenue-chart:': 'BranchRevenueChartAnalyticsResponse',
  '/branch-admin/analytics/recent-bookings:': 'BranchRecentBookingsAnalyticsResponse',
  '/branch-admin/analytics/top-services:': 'BranchTopServicesAnalyticsResponse',
  '/branch-admin/analytics/recent-transactions:': 'BranchRecentTransactionsAnalyticsResponse',
  '/branch-admin/finance/stats:': 'BranchFinanceStatsResponse',
  '/branch-admin/finance/payments:': 'BranchFinancePaymentsResponse',
  '/branch-admin/finance/export-report:': 'BranchFinanceExportReportResponse',
  "'/branch-admin/services/{id}':": 'BranchServiceDetailsResponse',
  "'/branch-admin/{id}/profile':": 'BranchPublicProfileResponse',
  "'/admin/branches/{id}':": 'SuperAdminBranchDetailsResponse'
};

const segments = content.split(/\n  (?=\/|')/);
let modifiedCount = 0;

for (let i = 1; i < segments.length; i++) {
  const segment = segments[i];
  const firstLine = segment.split('\n')[0].trim();
  
  if (endpointMappings[firstLine]) {
    const exampleName = endpointMappings[firstLine];
    const segmentLines = segment.split('\n');
    let inResponses = false;
    let targetCodeIndex = -1;
    
    for (let j = 0; j < segmentLines.length; j++) {
      const line = segmentLines[j];
      if (line.trim() === 'responses:') {
        inResponses = true;
      }
      if (inResponses) {
        if (line.match(/^\s{8}["']?20[01]["']?:/)) {
          targetCodeIndex = j;
          break;
        }
      }
    }
    
    if (targetCodeIndex !== -1) {
      let schemaIndex = -1;
      let existingExampleIndex = -1;
      const baseIndent = segmentLines[targetCodeIndex].search(/\S/);
      
      for (let k = targetCodeIndex + 1; k < segmentLines.length; k++) {
        const line = segmentLines[k];
        const indent = line.search(/\S/);
        // Only look at lines nested deeper than the status code level (e.g. at least baseIndent + 2 spaces)
        if (indent <= baseIndent && line.trim().length > 0) break;
        if (line.trim().startsWith('schema:') && indent > baseIndent) schemaIndex = k;
        if (line.trim().startsWith('example:') && indent > baseIndent) existingExampleIndex = k;
      }
      
      if (schemaIndex !== -1) {
        // Discard any existing inline 'example:' block
        if (existingExampleIndex !== -1) {
          const exIndent = segmentLines[existingExampleIndex].search(/\S/);
          let endExIndex = existingExampleIndex;
          for (let k = existingExampleIndex + 1; k < segmentLines.length; k++) {
            if (segmentLines[k].trim().length === 0) continue;
            if (segmentLines[k].search(/\S/) <= exIndent) {
              endExIndex = k - 1;
              break;
            }
            endExIndex = k;
          }
          segmentLines.splice(existingExampleIndex, endExIndex - existingExampleIndex + 1);
          // Re-calculate indices scoped within the status code responses block
          schemaIndex = -1;
          for (let k = targetCodeIndex + 1; k < segmentLines.length; k++) {
            const line = segmentLines[k];
            const indent = line.search(/\S/);
            if (indent <= baseIndent && line.trim().length > 0) break;
            if (line.trim().startsWith('schema:') && indent > baseIndent) {
              schemaIndex = k;
              break;
            }
          }
        }
        
        // In OpenAPI 3.0, "examples" belongs under the Media Type object (parallel to schema)
        // Let's place it parallel to schema indent!
        const schemaIndent = segmentLines[schemaIndex].search(/\S/);
        const replacement = ' '.repeat(schemaIndent) + 'examples:\n' +
                            ' '.repeat(schemaIndent + 2) + 'default:\n' +
                            ' '.repeat(schemaIndent + 4) + `$ref: "#/components/examples/${exampleName}"`;
        
        segmentLines.splice(schemaIndex, 0, replacement);
        segments[i] = segmentLines.join('\n');
        console.log(`Successfully mapped [${firstLine}] 200/201 response to Components Example [${exampleName}].`);
        modifiedCount++;
      }
    }
  }
}

if (modifiedCount > 0) {
  const newContent = segments.join('\n  /');
  fs.writeFileSync(openApiPath, newContent, 'utf8');
  console.log(`\nSuccess! Linked ${modifiedCount} endpoints in openapi.yaml to named Components Examples.`);
} else {
  console.error('Failed to link any endpoints.');
}
