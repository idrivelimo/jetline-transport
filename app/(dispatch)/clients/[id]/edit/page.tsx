import { notFound } from "next/navigation";

import { getClient } from "@/app/lib/clients";
import { ClientForm } from "@/app/components/client-form";
import { DeleteClient } from "@/app/components/delete-client";

export default async function EditClientPage(props: PageProps<"/clients/[id]/edit">) {
  const { id } = await props.params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <>
      <h1 className="mb-6 font-serif text-[26px] leading-tight font-medium text-ink">
        {client.name}
      </h1>

      <ClientForm
        submitLabel="Save changes"
        initial={{
          id: client.id,
          name: client.name,
          email: client.email ?? "",
          phone: client.phone ?? "",
          address: client.address ?? "",
          logo: client.logo ?? "",
        }}
      />

      <div className="mt-10 max-w-2xl border-t border-rule pt-5">
        <DeleteClient id={client.id} name={client.name} />
      </div>
    </>
  );
}
