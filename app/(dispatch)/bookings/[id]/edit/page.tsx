import { notFound } from "next/navigation";

import { getBooking } from "@/app/lib/bookings";
import { BookingForm } from "@/app/components/booking-form";
import { DeleteBooking } from "@/app/components/delete-booking";
import { displayStatus, statusLabel } from "@/app/lib/booking-status";

export default async function EditBookingPage(props: PageProps<"/bookings/[id]/edit">) {
  const { id } = await props.params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  const status = displayStatus(booking.status, booking.pickupAt);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-[26px] leading-tight font-medium text-ink">
          {booking.customerName}
        </h1>
        <p className="mt-1 text-sm text-slate">{statusLabel(status)}</p>
      </div>

      <BookingForm
        submitLabel="Save changes"
        initial={{
          id: booking.id,
          customerName: booking.customerName,
          phone: booking.phone,
          email: booking.email ?? "",
          pickupDate: booking.pickupDate,
          pickupTime: booking.pickupTime.slice(0, 5),
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          vehicle: booking.vehicle,
          passengers: String(booking.passengers),
          price: booking.price,
          notes: booking.notes ?? "",
        }}
      />

      <div className="mt-10 max-w-2xl border-t border-rule pt-5">
        <DeleteBooking id={booking.id} customerName={booking.customerName} returnTo="/" />
      </div>
    </>
  );
}
