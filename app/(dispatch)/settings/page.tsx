import { getSettings, supportedTimezones } from "@/app/lib/settings";
import { SettingsForm } from "@/app/components/settings-form";

export default async function SettingsPage() {
  const current = await getSettings();

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-[26px] leading-tight font-medium text-ink">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate">
          These details head every invoice you send.
        </p>
      </div>

      <SettingsForm
        timezones={supportedTimezones()}
        initial={{
          companyName: current.companyName,
          phone: current.phone,
          email: current.email,
          address: current.address,
          timezone: current.timezone,
        }}
      />
    </>
  );
}
