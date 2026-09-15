import AppHeader from "@/components/site/AppHeader";
import styles from "@/components/test/test.module.css";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in — StockedBy",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES = {
  expired: "That sign-in link expired or was already used. Request a new one below.",
  unavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const errorMessage = typeof params?.error === "string" ? ERROR_MESSAGES[params.error] : null;

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <AppHeader />
        <div className={styles.mark}>Merchant sign-in</div>
        <h1 className={styles.title}>Sign in to StockedBy</h1>
        <p className={styles.sub}>
          Enter your email — we&rsquo;ll send you a one-time link. No password to remember.
        </p>
        {errorMessage && <div className={styles.errBanner}>{errorMessage}</div>}
        <LoginForm />
      </div>
    </div>
  );
}
