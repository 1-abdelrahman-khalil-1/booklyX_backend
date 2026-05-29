import fs from 'node:fs';
import path from 'node:path';

const openApiPath = path.resolve('openapi.yaml');
let content = fs.readFileSync(openApiPath, 'utf8');

// 1. First, we will insert the Client endpoints block.
// We will insert it right before "/auth/register:" (which starts at line 3200).
const targetRegister = '  /auth/register:';
const clientEndpointsBlock = `  /client/home/dashboard:
    get:
      tags: [Client/Home]
      summary: Get client home feeds
      description: Returns active offers, business categories list, and nearby providers (within 5km max radius).
      operationId: getClientHomeDashboard
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
        - name: lat
          in: query
          required: false
          schema:
            type: number
            example: 30.0444
        - name: lng
          in: query
          required: false
          schema:
            type: number
            example: 31.2357
        - name: radius
          in: query
          required: false
          schema:
            type: number
            minimum: 1
            maximum: 50
            default: 5
            example: 5
      responses:
        "200":
          description: Dashboard feeds retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
              example:
                status: 200
                error: false
                message: "Dashboard retrieved successfully."
                data:
                  categories:
                    - SPA
                    - CLINIC
                    - BARBER
                  offers:
                    - id: 7
                      title: "Weekend Offer"
                      discountValue: 20
                      discountType: "PERCENTAGE"
                  nearbyBranches:
                    - id: 1
                      businessName: "Hassan Beauty Salon"
                      logoUrl: "https://cdn.booklyx.com/branch/logo.png"
                      distance: 2.5
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /client/discovery/search:
    get:
      tags: [Client/Discovery]
      summary: Search branches on map
      description: Geolocation map search engine filtered strictly by category and ordered by distance and rating.
      operationId: getClientDiscoverySearch
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
        - name: lat
          in: query
          required: true
          schema:
            type: number
            example: 30.0444
        - name: lng
          in: query
          required: true
          schema:
            type: number
            example: 31.2357
        - name: radius
          in: query
          required: false
          schema:
            type: number
            minimum: 1
            maximum: 50
            default: 5
            example: 5
        - name: search
          in: query
          required: false
          schema:
            type: string
            example: "Salon"
        - name: category
          in: query
          required: false
          schema:
            type: string
            enum: [SPA, CLINIC, BARBER]
            example: "SPA"
      responses:
        "200":
          description: Map search completed successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Search completed successfully."
                data:
                  - id: 1
                    businessName: "Hassan Beauty Salon"
                    category: "SPA"
                    logoUrl: "https://cdn.booklyx.com/branch/logo.png"
                    latitude: 30.0626
                    longitude: 31.3368
                    distance: 1.8
                    rating: 4.8
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  '/client/branches/{id}/profile':
    get:
      tags: [Client/Discovery]
      summary: Fetch public branch profile
      description: Returns branch public profile data and reviews.
      operationId: getClientBranchesByIdProfile
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Public profile fetched successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Branch profile retrieved successfully."
                data:
                  id: 1
                  businessName: "Hassan Beauty Salon"
                  category: "SPA"
                  description: "Premium beauty and skincare services."
                  logoUrl: "https://cdn.booklyx.com/branch/logo.png"
                  address: "12 Makram Ebeid Street"
                  rating: 4.8
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/branches/{id}/services':
    get:
      tags: [Client/Discovery]
      summary: List branch services
      description: Get active services catalog under this branch.
      operationId: getClientBranchesByIdServices
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Branch services fetched successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Branch services retrieved successfully."
                data:
                  - id: 1
                    name: "Haircut"
                    price: 150.00
                    durationMinutes: 30
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/services/{id}/staff':
    get:
      tags: [Client/Discovery]
      summary: List staff by service
      description: Returns active staff members assigned to this service category.
      operationId: getClientServicesByIdStaff
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Service staff fetched successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Staff retrieved successfully."
                data:
                  - id: 7
                    name: "Mazen Tamer"
                    profileImageUrl: "https://cdn.booklyx.com/staff/mazen-tamer.png"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/staff/{id}/profile':
    get:
      tags: [Client/Discovery]
      summary: Get staff public profile
      description: Returns staff biography, photos, rating, and reviews.
      operationId: getClientStaffByIdProfile
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Staff profile loaded successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Profile retrieved successfully."
                data:
                  id: 7
                  name: "Mazen Tamer"
                  profileImageUrl: "https://cdn.booklyx.com/staff/mazen-tamer.png"
                  rating: 4.9
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/staff/{id}/availability/days':
    get:
      tags: [Client/Discovery]
      summary: Calculate available days for staff
      description: Chronological list of next 30 days showing open availability status.
      operationId: getClientStaffByIdAvailabilityDays
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 7
        - name: serviceId
          in: query
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Available days fetched successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Staff availability retrieved successfully."
                data:
                  - date: "2026-06-01"
                    available: true
                  - date: "2026-06-02"
                    available: false
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/staff/{id}/availability/slots':
    get:
      tags: [Client/Discovery]
      summary: Calculate available time slots for staff on Date
      description: Returns array of time slots (e.g. 09:00, 09:30) for selected date and service.
      operationId: getClientStaffByIdAvailabilitySlots
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 7
        - name: serviceId
          in: query
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - name: date
          in: query
          required: true
          schema:
            type: string
            format: date
            example: "2026-06-01"
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Available slots loaded successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Slots retrieved successfully."
                data:
                  - time: "09:00"
                    available: true
                  - time: "09:30"
                    available: false
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  /client/appointments/reserve:
    post:
      tags: [Client/Booking]
      summary: Reserve appointment slot (PENDING)
      description: Lock a booking slot, returns pending appointment.
      operationId: postClientAppointmentsReserve
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [serviceId, staffId, scheduledAt]
              properties:
                serviceId:
                  type: integer
                  example: 1
                staffId:
                  type: integer
                  example: 7
                scheduledAt:
                  type: string
                  format: date-time
                  example: "2026-06-01T10:00:00.000Z"
      responses:
        "201":
          description: Booking slot locked successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 201
                error: false
                message: "Appointment reserved successfully."
                data:
                  id: 15
                  status: "PENDING"
                  scheduledAt: "2026-06-01T10:00:00.000Z"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  '/client/appointments/{id}/confirm-payment':
    post:
      tags: [Client/Booking]
      summary: Process Fake Payment and Confirm Booking
      description: Process mock checkout logic to transition booking to CONFIRMED.
      operationId: postClientAppointmentsByIdConfirmPayment
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 15
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [success]
              properties:
                success:
                  type: boolean
                  example: true
      responses:
        "200":
          description: Booking confirmed successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Appointment payment confirmed and booking active."
                data:
                  appointment:
                    id: 15
                    status: "CONFIRMED"
                  payment:
                    id: 1
                    amount: 150.00
                    status: "PAID"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  /client/appointments:
    get:
      tags: [Client/Booking]
      summary: List Appointments (Historical and Upcoming)
      description: Returns historical client booking lists.
      operationId: getClientAppointments
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Bookings list loaded successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Appointments retrieved successfully."
                data:
                  - id: 15
                    status: "CONFIRMED"
                    scheduledAt: "2026-06-01T10:00:00.000Z"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  '/client/appointments/{id}':
    get:
      tags: [Client/Booking]
      summary: Fetch Booking Details
      description: Returns full appointment details by ID.
      operationId: getClientAppointmentsById
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 15
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Booking details fetched successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Appointment details retrieved successfully."
                data:
                  id: 15
                  status: "CONFIRMED"
                  scheduledAt: "2026-06-01T10:00:00.000Z"
                  price: 150.00
                  service:
                    id: 1
                    name: "Haircut"
                  staff:
                    id: 7
                    name: "Mazen Tamer"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/appointments/{id}/cancel':
    post:
      tags: [Client/Booking]
      summary: Cancel Appointment
      description: Cancel a booking with rules check.
      operationId: postClientAppointmentsByIdCancel
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 15
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Booking cancelled successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Appointment cancelled successfully."
                data:
                  appointment:
                    id: 15
                    status: "CANCELED"
                  payment:
                    id: 1
                    status: "REFUNDED"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/favourites/branches/{id}':
    post:
      tags: [Client/Favourites]
      summary: Add Favorite Branch
      description: Adds a branch to client favorites.
      operationId: postClientFavouritesBranchesById
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "201":
          description: Branch added to favorites
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 201
                error: false
                message: "Branch added to favourites successfully."
                data: null
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
    delete:
      tags: [Client/Favourites]
      summary: Remove Favorite Branch
      description: Removes a branch from client favorites.
      operationId: deleteClientFavouritesBranchesById
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Branch removed from favorites
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Branch removed from favourites successfully."
                data: null
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  '/client/favourites/staff/{id}':
    post:
      tags: [Client/Favourites]
      summary: Add Favorite Staff
      description: Adds a staff member to client favorites.
      operationId: postClientFavouritesStaffById
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 7
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "201":
          description: Staff added to favorites
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 201
                error: false
                message: "Staff added to favourites successfully."
                data: null
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
    delete:
      tags: [Client/Favourites]
      summary: Remove Favorite Staff
      description: Removes a staff member from client favorites.
      operationId: deleteClientFavouritesStaffById
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 7
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Staff removed from favorites
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Staff removed from favourites successfully."
                data: null
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"

  /client/favourites:
    get:
      tags: [Client/Favourites]
      summary: List Favorites
      description: Returns list of favorited branches and staff.
      operationId: getClientFavourites
      security:
        - bearerAuth: []
      parameters:
        - name: type
          in: query
          required: false
          schema:
            type: string
            enum: [branch_admin, staff]
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeader"
      responses:
        "200":
          description: Favorites list loaded
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
              example:
                status: 200
                error: false
                message: "Favourites retrieved successfully."
                data:
                  branches:
                    - id: 1
                      businessName: "Hassan Beauty Salon"
                      logoUrl: "https://cdn.booklyx.com/branch/logo.png"
                  staff:
                    - id: 7
                      name: "Mazen Tamer"
                      profileImageUrl: "https://cdn.booklyx.com/staff/mazen-tamer.png"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
`;

// Insert the Client block before /auth/register:
content = content.replace(targetRegister, `${clientEndpointsBlock}\n${targetRegister}`);

// 2. Second, we will append the 8 missing branch admin Overview and Finance endpoints.
// We will insert them right after "/branch-admin/analytics/staff-earnings:" block (which ends right before "/admin/branches:").
// Let's find "/admin/branches:" in the code.
const targetAdminBranches = '  /admin/branches:';
const branchAdminAnalyticsBlock = `  /branch-admin/analytics/revenue-chart:
    get:
      tags: [Branch_admin/Overview]
      summary: Get revenue chart data
      description: Returns date-grouped revenue data for the chart based on selected period.
      operationId: getBranchAdminAnalyticsRevenueChart
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
        - name: period
          in: query
          required: false
          schema:
            type: string
            default: this_month
            enum: [today, this_month, this_year]
      responses:
        "200":
          description: Revenue chart data fetched
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          type: object
              example:
                status: 200
                error: false
                message: "Revenue chart data retrieved successfully."
                data:
                  - date: "2026-05-25"
                    revenue: 1200.00
                  - date: "2026-05-26"
                    revenue: 1500.00
                  - date: "2026-05-27"
                    revenue: 800.00
                  - date: "2026-05-28"
                    revenue: 2100.00
                  - date: "2026-05-29"
                    revenue: 1750.00
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /branch-admin/analytics/recent-bookings:
    get:
      tags: [Branch_admin/Overview]
      summary: Get recent branch bookings
      description: Lightweight overview of last bookings for quick activity feed.
      operationId: getBranchAdminAnalyticsRecentBookings
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
      responses:
        "200":
          description: Recent bookings fetched
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          type: object
              example:
                status: 200
                error: false
                message: "Recent bookings retrieved successfully."
                data:
                  - id: 15
                    clientName: "Abdo Khalil"
                    serviceName: "Swedish Massage"
                    scheduledAt: "2026-05-29T14:30:00.000Z"
                    price: 250.00
                    status: "CONFIRMED"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /branch-admin/analytics/top-services:
    get:
      tags: [Branch_admin/Overview]
      summary: Get top services
      description: Returns service catalog items sorted by appointment volume.
      operationId: getBranchAdminAnalyticsTopServices
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
        - name: period
          in: query
          required: false
          schema:
            type: string
            default: this_month
            enum: [today, this_month, this_year]
      responses:
        "200":
          description: Top services list generated
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          type: object
              example:
                status: 200
                error: false
                message: "Top services retrieved successfully."
                data:
                  - serviceId: 1
                    name: "Haircut"
                    bookingCount: 42
                    revenue: 6300.00
                  - serviceId: 2
                    name: "Swedish Massage"
                    bookingCount: 28
                    revenue: 7000.00
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /branch-admin/analytics/recent-transactions:
    get:
      tags: [Branch_admin/Overview]
      summary: Get recent transactions
      description: Get quick summary list of recent branch business payments.
      operationId: getBranchAdminAnalyticsRecentTransactions
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
      responses:
        "200":
          description: Financial transactions fetched
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          type: object
              example:
                status: 200
                error: false
                message: "Recent transactions retrieved successfully."
                data:
                  - id: 101
                    amount: 250.00
                    status: "COMPLETED"
                    clientName: "Abdo Khalil"
                    paymentMethod: "CARD"
                    createdAt: "2026-05-29T14:30:00.000Z"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /branch-admin/finance/stats:
    get:
      tags: [Branch_admin/Finance]
      summary: Get branch finance dashboard metrics
      description: Returns gross, platform fee deduction and payout projections.
      operationId: getBranchAdminFinanceStats
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
      responses:
        "200":
          description: Financial stats dashboard fetched
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
              example:
                status: 200
                error: false
                message: "Finance stats retrieved successfully."
                data:
                  grossRevenue: 15230.50
                  netRevenue: 14468.97
                  platformFees: 761.53
                  refunds: 500.00
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /branch-admin/finance/payments:
    get:
      tags: [Branch_admin/Finance]
      summary: Get branch payout payments
      description: Chronological list of branch incoming payout ledger.
      operationId: getBranchAdminFinancePayments
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
      responses:
        "200":
          description: Branch incoming ledger payouts loaded
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          type: object
                          properties:
                            id:
                              type: integer
                            amount:
                              type: number
                            currency:
                              type: string
                            status:
                              type: string
                            paymentMethod:
                              type: string
                            bookingId:
                              type: integer
                            createdAt:
                              type: string
              example:
                status: 200
                error: false
                message: "Branch payments retrieved successfully."
                data:
                  - id: 1
                    amount: 250.00
                    currency: "EGP"
                    status: "COMPLETED"
                    paymentMethod: "CARD"
                    bookingId: 12
                    createdAt: "2026-05-29T14:30:00.000Z"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  '/branch-admin/finance/payments/{id}/refund':
    post:
      tags: [Branch_admin/Finance]
      summary: Refund booking payment
      description: Transition payment from PAID to REFUNDED.
      operationId: postBranchAdminFinancePaymentsByIdRefund
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
            example: 1
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
      responses:
        "200":
          description: Payout refunded successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
              example:
                status: 200
                error: false
                message: "Payment refunded successfully."
                data:
                  id: 1
                  amount: 250.00
                  status: "REFUNDED"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /branch-admin/finance/export-report:
    get:
      tags: [Branch_admin/Finance]
      summary: Export financial report
      description: Exports CSV file link for branch tax bookkeeping audits.
      operationId: getBranchAdminFinanceExportReport
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/AcceptLanguageHeader"
        - $ref: "#/components/parameters/PlatformHeaderWebOnly"
      responses:
        "200":
          description: CSV download link prepared
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ApiSuccess"
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          reportUrl:
                            type: string
              example:
                status: 200
                error: false
                message: "Report generated successfully."
                data:
                  reportUrl: "https://cdn.booklyx.com/reports/report-2026-05-29.csv"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"
`;

// Insert the Branch Admin block before /admin/branches:
content = content.replace(targetAdminBranches, `${branchAdminAnalyticsBlock}\n${targetAdminBranches}`);

// Save content
fs.writeFileSync(openApiPath, content, 'utf8');
console.log('Successfully fully restored all endpoints in openapi.yaml!');
