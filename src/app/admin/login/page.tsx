"use client";
import { Suspense } from "react";
import { PhoneLogin } from "@/components/PhoneLogin";

export default function LoginPage() {
  return <Suspense><PhoneLogin title="админка" redirect="/admin" deniedText="У этого номера нет доступа к админке. Номер нужно добавить в ADMIN_PHONES." /></Suspense>;
}
