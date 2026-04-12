import { redirect } from "next/navigation";

/** Совместимость: старый URL ведёт на список броней. */
export default function AccountRedirectPage() {
  redirect("/moi-broni");
}
