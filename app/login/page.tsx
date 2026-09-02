import { redirect } from "next/navigation";
import { readSession } from "@/app/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  // Someone already signed in has no business on this page.
  if (await readSession()) redirect("/");

  const { from } = await props.searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-ink px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-serif text-[28px] font-semibold tracking-tight text-card">
            Jetline
          </h1>
          <p className="mt-1 text-sm text-rule/70">Booking and dispatch</p>
        </div>

        <div className="rounded-sm bg-card p-6 shadow-[0_1px_0_var(--color-brass)]">
          <LoginForm from={typeof from === "string" ? from : "/"} />
        </div>
      </div>
    </main>
  );
}
