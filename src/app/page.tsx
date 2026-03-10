import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/auth";

export default function HomePage() {
  const email = getSessionEmail();
  redirect(email ? "/timeline" : "/login");
}
