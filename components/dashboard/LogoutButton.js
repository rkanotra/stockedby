"use client";

import { useRouter } from "next/navigation";
import styles from "../test/test.module.css";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <button type="button" className={styles.btnGhost} onClick={logout}>
      Sign out
    </button>
  );
}
