import { getPendingWork, getSetting, getStats, getTopTests, listActivity, listMessages, listNotifications, listOrders, listPatients, listRecentEvents, listTests, publicSettings, unreadNotificationCount } from '@/lib/store'

/**
 * The one payload the UI renders. Every field is read from SQLite at the
 * moment of the request, so nothing here is invented client-side.
 */
export function buildSnapshot() {
  const settings = publicSettings()
  const tests = listTests().map((test) => ({
    id: test.id,
    name: test.name,
    category: test.category,
    description: test.description,
    price: test.price,
    finalPrice: test.finalPrice,
    discountType: test.discountType,
    discountValue: test.discountValue,
    discountLabel: test.discountLabel,
    sampleType: test.sampleType,
    reportHours: test.reportHours,
    prep: test.prep,
  }))

  return {
    ...settings,
    tests,
    orders: listOrders().map((order) => ({
      id: order.id,
      orderId: order.order_id,
      patientName: order.patient_name,
      phone: order.phone,
      testName: order.test_name,
      type: order.type,
      slot: order.slot,
      amount: order.amount,
      status: order.status,
      hasReport: order.hasReport,
      reportReadyAt: order.reportReadyAt,
      whatsappSentAt: order.whatsappSentAt,
      reportFilename: order.report_filename,
      reportSize: order.report_size,
      reportUploadedAt: order.report_uploaded_at,
      reportNotes: order.report_notes,
      staffNote: order.staff_note,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      pincode: order.pincode,
      cancelledAt: order.cancelled_at,
      createdAt: order.created_at,
    })),
    patients: listPatients(),
    pending: getPendingWork(),
    topTests: getTopTests(),
    recentEvents: listRecentEvents(60),
    activity: listActivity(),
    messages: listMessages(),
    notifications: listNotifications(40),
    unreadNotifications: unreadNotificationCount(),
    notifyWhatsAppEnabled: Boolean(getSetting('admin_whatsapp')),
    whatsappAutoSend: Boolean(getSetting('whatsapp_phone_number_id') && getSetting('whatsapp_access_token')),
    stats: getStats(),
    updatedAt: Date.now(),
    brandCustomised: Boolean(getSetting('logo_data_url')),
  }
}

export type Snapshot = ReturnType<typeof buildSnapshot>
