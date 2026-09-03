import { BookingForm } from "@/app/components/booking-form";

export default function NewBookingPage() {
  return (
    <>
      <h1 className="mb-6 font-serif text-[26px] leading-tight font-medium text-ink">
        New booking
      </h1>
      <BookingForm submitLabel="Save booking" />
    </>
  );
}
