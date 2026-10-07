"use client";
import { Suspense } from "react";
import { PhoneLogin } from "@/components/PhoneLogin";

export default function CreatorLogin() {
  return (
    <Suspense>
      <PhoneLogin title="для креаторов" redirect="/creator" deniedText="Этот номер не подключён к партнёрской программе. Напишите менеджеру NABI, чтобы вас подключили." />
    </Suspense>
  );
}
