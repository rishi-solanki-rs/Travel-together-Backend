import DestinationPackage from '../../shared/models/DestinationPackage.model.js';
import PackageInquiry from '../../shared/models/PackageInquiry.model.js';
import PassengerManifest from '../../shared/models/PassengerManifest.model.js';
import QuoteProposal from '../../shared/models/QuoteProposal.model.js';
import PaymentMilestone from '../../shared/models/PaymentMilestone.model.js';
import ItineraryConfirmation from '../../shared/models/ItineraryConfirmation.model.js';
import ApiError from '../../utils/ApiError.js';
import withTransaction from '../../shared/utils/withTransaction.js';
import { recordAuditEvent, recordFinancialLedgerEvent } from '../../operations/audit/audit.service.js';
import { appendPaymentLedger } from '../../operations/finance/reconciliation.service.js';
import { enqueueJob } from '../../operations/queue/queue.service.js';
import { incrementCounter } from '../../operations/metrics/metrics.service.js';

const buildInquiryRef = () => `PKG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const buildQuoteRef = () => `QTE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const sameUtcDate = (a, b) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return d1.getUTCFullYear() === d2.getUTCFullYear()
    && d1.getUTCMonth() === d2.getUTCMonth()
    && d1.getUTCDate() === d2.getUTCDate();
};

const computeDepartureSeatStatus = (seatsAvailable) => {
  if (seatsAvailable <= 0) return 'full';
  if (seatsAvailable <= 5) return 'limited';
  return 'open';
};

const computeReturnDate = ({ departureDate, durationDays = 0 }) => {
  const departure = new Date(departureDate);
  if (Number(durationDays) <= 0) return null;
  const out = new Date(departure);
  out.setUTCDate(out.getUTCDate() + Number(durationDays));
  return out;
};

const computeMilestoneSummary = (milestones = []) => {
  return milestones.reduce((acc, milestone) => {
    acc.total += 1;
    if (milestone.status === 'paid') {
      acc.paid += 1;
      acc.amountPaid += Number(milestone.amount || 0);
    } else {
      acc.amountPending += Number(milestone.amount || 0);
    }
    return acc;
  }, { total: 0, paid: 0, amountPaid: 0, amountPending: 0 });
};

const createInquiry = async ({
  listingId,
  packageId,
  vendorId,
  inquirerUserId = null,
  departureDate = null,
  travelersCount = 1,
  notes = null,
  passengers = [],
}) => withTransaction(async ({ session }) => {
  const destinationPackage = await DestinationPackage.findOne({ _id: packageId, listingId, vendorId, isActive: true }).session(session);
  if (!destinationPackage) throw ApiError.notFound('Destination package not found');

  if (departureDate) {
    const departure = (destinationPackage.departureDates || []).find((row) => sameUtcDate(row.date, departureDate));
    if (!departure) throw ApiError.badRequest('Requested departure is not available');
    if (!['open', 'limited'].includes(departure.status) || (departure.seatsAvailable || 0) < travelersCount) {
      throw ApiError.badRequest('Requested departure does not have enough seats');
    }
  }

  const [inquiry] = await PackageInquiry.create([{
    listingId,
    packageId,
    vendorId,
    inquirerUserId,
    inquiryRef: buildInquiryRef(),
    status: 'new',
    departureDate,
    travelersCount,
    notes,
  }], { session });

  if (Array.isArray(passengers) && passengers.length) {
    await PassengerManifest.insertMany(
      passengers.map((passenger, index) => ({
        inquiryId: inquiry._id,
        fullName: passenger.fullName,
        age: passenger.age ?? null,
        gender: passenger.gender ?? null,
        passportNumber: passenger.passportNumber ?? null,
        isPrimary: index === 0,
      })),
      { session }
    );
  }

  incrementCounter('tii_booking_funnel_total', 1, { module: 'destinations', stage: 'inquiry' });
  await recordAuditEvent({
    eventType: 'bookings.package.inquiry_created',
    module: 'destinations',
    entityType: 'PackageInquiry',
    entityId: inquiry._id,
    action: 'create-inquiry',
    actor: { actorType: inquirerUserId ? 'user' : 'system', actorId: inquirerUserId, vendorId },
    afterSnapshot: { status: inquiry.status, travelersCount: inquiry.travelersCount },
  });

  return inquiry;
});

const createQuote = async ({ inquiryId, vendorId, amount, validUntil = null, notes = null, milestones = [] }) => withTransaction(async ({ session }) => {
  const inquiry = await PackageInquiry.findOne({ _id: inquiryId, vendorId }).session(session);
  if (!inquiry) throw ApiError.notFound('Inquiry not found');
  if (inquiry.status === 'booked') throw ApiError.badRequest('Inquiry is already booked');

  const [quote] = await QuoteProposal.create([{
    inquiryId,
    vendorId,
    quoteRef: buildQuoteRef(),
    status: 'sent',
    amount: {
      subtotal: amount?.subtotal || 0,
      taxes: amount?.taxes || 0,
      total: amount?.total || 0,
      currency: amount?.currency || 'INR',
    },
    validUntil,
    notes,
  }], { session });

  if (Array.isArray(milestones) && milestones.length) {
    await PaymentMilestone.insertMany(
      milestones.map((milestone) => ({
        inquiryId,
        quoteId: quote._id,
        label: milestone.label,
        amount: milestone.amount,
        dueDate: milestone.dueDate,
        status: milestone.status || 'pending',
      })),
      { session }
    );
  }

  inquiry.status = 'quoted';
  await inquiry.save({ session });
  await recordAuditEvent({
    eventType: 'bookings.package.quote_created',
    module: 'destinations',
    entityType: 'QuoteProposal',
    entityId: quote._id,
    action: 'create-quote',
    actor: { actorType: 'vendor_admin', actorId: vendorId, vendorId },
    afterSnapshot: { status: quote.status, total: quote.amount.total },
  });
  return quote;
});

const acceptQuoteAndBook = async ({ inquiryId, quoteId, vendorId }) => withTransaction(async ({ session }) => {
  const [inquiry, quote] = await Promise.all([
    PackageInquiry.findOne({ _id: inquiryId, vendorId }).session(session),
    QuoteProposal.findOne({ _id: quoteId, inquiryId, vendorId }).session(session),
  ]);

  if (!inquiry) throw ApiError.notFound('Inquiry not found');
  if (!quote) throw ApiError.notFound('Quote not found');
  if (!['sent', 'accepted'].includes(quote.status)) throw ApiError.badRequest('Quote is not in an acceptable state');

  const destinationPackage = await DestinationPackage.findOne({ _id: inquiry.packageId, vendorId, isActive: true }).session(session);
  if (!destinationPackage) throw ApiError.notFound('Destination package not found');

  if (inquiry.departureDate) {
    const departureIndex = (destinationPackage.departureDates || []).findIndex((row) => sameUtcDate(row.date, inquiry.departureDate));
    if (departureIndex === -1) throw ApiError.badRequest('Requested departure is no longer available');

    const departure = destinationPackage.departureDates[departureIndex];
    if ((departure.seatsAvailable || 0) < inquiry.travelersCount) {
      throw ApiError.badRequest('Requested departure is sold out');
    }

    departure.seatsAvailable -= inquiry.travelersCount;
    departure.status = computeDepartureSeatStatus(departure.seatsAvailable);
    destinationPackage.departureDates[departureIndex] = departure;
    await destinationPackage.save({ session });
  }

  quote.status = 'accepted';
  inquiry.status = 'booked';
  await Promise.all([quote.save({ session }), inquiry.save({ session })]);

  const [itinerary] = await ItineraryConfirmation.create([{
    inquiryId: inquiry._id,
    quoteId: quote._id,
    packageId: inquiry.packageId,
    status: 'confirmed',
    departureDate: inquiry.departureDate,
    returnDate: computeReturnDate({
      departureDate: inquiry.departureDate,
      durationDays: destinationPackage.duration?.days || 0,
    }),
    notes: quote.notes || null,
  }], { session });

  await PaymentMilestone.updateOne(
    { inquiryId: inquiry._id, quoteId: quote._id, status: 'pending' },
    { $set: { status: 'paid', paidAt: new Date() } },
    { session }
  );

  await appendPaymentLedger({
    sourceType: 'destination-package',
    sourceId: inquiry._id,
    paymentReference: quote.quoteRef,
    entries: [
      { account: 'cash', direction: 'debit', amount: quote.amount.total },
      { account: 'package_revenue', direction: 'credit', amount: quote.amount.total },
    ],
    metadata: { inquiryId: inquiry._id, quoteId: quote._id, vendorId },
  });

  incrementCounter('tii_booking_funnel_total', 1, { module: 'destinations', stage: 'booked' });
  incrementCounter('tii_payment_success_total', 1, { module: 'destinations' });
  await recordAuditEvent({
    eventType: 'bookings.package.booked',
    module: 'destinations',
    entityType: 'ItineraryConfirmation',
    entityId: itinerary._id,
    action: 'accept-quote-book',
    actor: { actorType: 'vendor_admin', actorId: vendorId, vendorId },
    afterSnapshot: { status: itinerary.status, departureDate: itinerary.departureDate },
  });
  await recordFinancialLedgerEvent({
    domain: 'bookings',
    entityType: 'ItineraryConfirmation',
    entityId: itinerary._id,
    eventType: 'destination-booking-confirmed',
    amount: quote.amount.total,
    metadata: { inquiryId: inquiry._id, quoteRef: quote.quoteRef },
  });
  await enqueueJob('booking-confirmations', 'destination-package-booked', { itineraryId: String(itinerary._id), inquiryId: String(inquiry._id) });
  await enqueueJob('emails', 'destination-package-booking-email', { itineraryId: String(itinerary._id), inquiryId: String(inquiry._id) });

  return itinerary;
});

const updateItineraryStatus = async ({ itineraryId, status, vendorId }) => {
  const itinerary = await ItineraryConfirmation.findById(itineraryId).lean();
  if (!itinerary) throw ApiError.notFound('Itinerary not found');

  const inquiry = await PackageInquiry.findOne({ _id: itinerary.inquiryId, vendorId }).lean();
  if (!inquiry) throw ApiError.notFound('Inquiry not found');

  const updated = await ItineraryConfirmation.findByIdAndUpdate(
    itineraryId,
    { status },
    { new: true }
  );
  await recordAuditEvent({
    eventType: 'bookings.package.itinerary_status_updated',
    module: 'destinations',
    entityType: 'ItineraryConfirmation',
    entityId: itineraryId,
    action: 'update-itinerary-status',
    actor: { actorType: 'vendor_admin', actorId: vendorId, vendorId },
    afterSnapshot: { status },
  });
  return updated;
};

const getVendorPackageCommerceDashboard = async (vendorId) => {
  const [inquiryStatus, quoteStatus, itineraryStatus, milestones] = await Promise.all([
    PackageInquiry.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    QuoteProposal.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ItineraryConfirmation.aggregate([
      {
        $lookup: {
          from: 'packageinquiries',
          localField: 'inquiryId',
          foreignField: '_id',
          as: 'inquiry',
        },
      },
      { $unwind: '$inquiry' },
      { $match: { 'inquiry.vendorId': vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PaymentMilestone.aggregate([
      {
        $lookup: {
          from: 'packageinquiries',
          localField: 'inquiryId',
          foreignField: '_id',
          as: 'inquiry',
        },
      },
      { $unwind: '$inquiry' },
      { $match: { 'inquiry.vendorId': vendorId } },
      { $project: { status: 1, amount: 1 } },
    ]),
  ]);

  return {
    inquiryStatus,
    quoteStatus,
    itineraryStatus,
    milestoneSummary: computeMilestoneSummary(milestones),
  };
};

export {
  sameUtcDate,
  computeDepartureSeatStatus,
  computeReturnDate,
  computeMilestoneSummary,
  createInquiry,
  createQuote,
  acceptQuoteAndBook,
  updateItineraryStatus,
  getVendorPackageCommerceDashboard,
};
