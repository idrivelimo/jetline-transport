import { ClientForm } from "@/app/components/client-form";

export default function NewClientPage() {
  return (
    <>
      <h1 className="mb-6 font-serif text-[26px] leading-tight font-medium text-ink">
        New client
      </h1>
      <ClientForm submitLabel="Save client" />
    </>
  );
}
