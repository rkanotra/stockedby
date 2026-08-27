// Shared email-quality checks (spec items 9-12) used by every email capture
// point on the site — components/test/report/LeadGate.js,
// components/fix/FixLeadGate.js, and any future form. Pure, client-safe
// (no Supabase/Resend), so it can run on blur before a request ever fires.
// Deliberately does NOT implement OTP/verification codes — see item 13's
// explicit note: the added step costs more leads than it saves at current
// volume. Format + disposable-domain + typo-suggestion is the full set.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email) {
  return EMAIL_RE.test(String(email || "").trim());
}

function domainOf(email) {
  const s = String(email || "").trim().toLowerCase();
  const at = s.lastIndexOf("@");
  return at === -1 ? "" : s.slice(at + 1);
}

// Free consumer providers (item 12): NEVER blocked — most D2C founders in
// our markets (India/UAE/KSA) run their business off gmail.com. This list
// only powers the `is_free_provider` flag for later segmentation.
export const FREE_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.in",
  "outlook.com",
  "outlook.in",
  "icloud.com",
  "aol.com",
  "live.com",
  "msn.com",
  "rediffmail.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "zoho.com",
];

export function isFreeProvider(email) {
  return FREE_PROVIDERS.includes(domainOf(email));
}

// Disposable / throwaway providers (item 10) — never asked to verify, so a
// bounce is our only real signal (item 13); this list stops the obvious
// cases inline instead. Maintained here as a single source of truth.
export const DISPOSABLE_DOMAINS = [
  "mailinator.com","mailinater.com","mailinator.net","mailinator.org","mailinator2.com","mt2015.com","mt2014.com","mt2009.com",
  "guerrillamail.com","guerrillamail.org","guerrillamail.net","guerrillamail.biz","guerrillamail.de","guerrillamail.info",
  "guerrillamailblock.com","sharklasers.com","grr.la","spam4.me","pokemail.net","guerillamail.com","guerillamail.info",
  "guerillamail.biz","guerillamail.net","guerillamail.org","guerillamail.de",
  "yopmail.com","yopmail.fr","yopmail.net","cool.fr.nf","jetable.fr.nf","nospam.ze.tc","nomail.xl.cx","mega.zik.dj",
  "speed.1s.fr","courriel.fr.nf","moncourrier.fr.nf","monemail.fr.nf","monmail.fr.nf",
  "10minutemail.com","10minutemail.net","10minutemail.co.za","10minemail.com","10minmail.com",
  "temp-mail.org","temp-mail.io","temp-mail.ru","temp-mail.de","tempmail.com","tempmail.net","tempmail.eu",
  "tempmail.plus","tempmailo.com","tempmailer.com","tempmailer.de","tempomail.fr","tempinbox.com","tempinbox.co.uk",
  "tempsky.com","temporary-mail.net","tempthe.net","tempr.email","tempail.com","tmpmail.org","tmpmail.net",
  "tmpeml.com","tmpeml.info","gettempmail.com","mytemp.email",
  "throwawaymail.com","getnada.com","mail-temporaire.fr","mailnesia.com","mailcatch.com",
  "trashmail.com","trashmail.net","trashmail.me","trashmail.io","trash-mail.com","easytrashmail.com","mytrashmail.com",
  "dispostable.com","fakeinbox.com","fakemailgenerator.com","fakemail.net","fake-mail.net","fakebox.org","emailfake.com","emailfake.ml",
  "maildrop.cc","mintemail.com","mohmal.com","emailondeck.com",
  "spamgourmet.com","spambog.com","spambox.us","mailnull.com","discard.email","discardmail.com","discardmail.de",
  "incognitomail.com","incognitomail.net","anonbox.net","anonymbox.com",
  "spamfree24.org","spamfree24.de","spamfree24.com","tempemail.co","tempemail.net",
  "burnermail.io","tempmailaddress.com","tempail.com","luxusmail.org",
  "wegwerfemail.de","wegwerfemail.net","wegwerfemail.org","wegwerpmailadres.nl","spamdecoy.net",
  "dropmail.me","e4ward.com","fakebox.org","receivemail.org","spoofmail.de","tafmail.com","tafmail.net",
  "tmail.ws","tmailinator.com","mailexpire.com","mailsac.com","mailslurp.com","mail-filter.com","filzmail.com","byom.de",
  "deadaddress.com","deadfake.cf","deadfake.ga","deadfake.ml","deadfake.tk","freemail.ms","hidemail.de","imgof.com",
  "inboxbear.com","meltmail.com","no-spam.ws","objectmail.com","proxymail.eu","punkass.com","rcpt.at","recode.me",
  "safe-mail.net","sneakemail.com","sofimail.com","sogetthis.com","spam.la","spamavert.com","spambob.com","spambob.net",
  "spambob.org","spamcannon.com","spamcannon.net","spamcero.com","spamcon.org","spamcorptastic.com",
  "spamcowboy.com","spamcowboy.net","spamcowboy.org","spamday.com","spamex.com","spamherelots.com","spamhereplease.com",
  "spamhole.com","spamify.com","spaml.com","spaml.de","spammotel.com","spamobox.com","spamoff.de","spamsalad.in",
  "spamserver.click","spamserver2.com","spamslicer.com","spamspot.com","spamstack.net","spamthis.co.uk",
  "spamthisplease.com","spamtrail.com","spamtroll.net","thankyou2010.com","thc.st","thisisnotmyrealemail.com",
  "throam.com","tilien.com","toiea.com","tradermail.info","trbvm.com","trillianpro.com","tyldd.com",
  "veryrealemail.com","viditag.com","viewcastmedia.com","viewcastmedia.net","viewcastmedia.org","walala.org",
  "watchfull.net","webemail.me","weg-werf-email.de","wetrainbayarea.com","wetrainbayarea.org","wh4f.org",
  "whyspam.me","willselfdestruct.com","winemaven.info","wronghead.com","wuzup.net","wuzupmail.net",
  "xagloo.com","xemaps.com","xents.com","xmaily.com","xoxy.net","yogamaven.com","yuurok.com","zetmail.com",
  "zippymail.info","zoemail.org","moakt.com","moakt.cc","harakirimail.com","inboxkitten.com","disbox.net","disbox.org",
  "crazymailing.com","emltmp.com","mailtothis.com","boximail.com","moburl.com","mailmoat.com","kasmail.com","spikio.com",
];

export function isDisposableEmail(email) {
  return DISPOSABLE_DOMAINS.includes(domainOf(email));
}

// Typo correction (item 11): a small edit-distance check against the
// common providers merchants actually use. Never auto-changes anything —
// callers must render this as a dismissible suggestion.
const COMMON_DOMAINS = [
  "gmail.com","yahoo.com","yahoo.co.in","yahoo.co.uk","hotmail.com","hotmail.co.in",
  "outlook.com","outlook.in","icloud.com","aol.com","live.com","rediffmail.com",
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns a full corrected email string, or null when the domain already
// looks fine / no close-enough common provider exists.
export function suggestEmailCorrection(email) {
  const s = String(email || "").trim();
  const at = s.lastIndexOf("@");
  if (at === -1) return null;
  const domain = s.slice(at + 1).toLowerCase();
  if (!domain || domain.length < 4 || COMMON_DOMAINS.includes(domain)) return null;

  let best = null;
  let bestDist = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const dist = levenshtein(domain, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  if (best && bestDist > 0 && bestDist <= 2) {
    return s.slice(0, at + 1) + best;
  }
  return null;
}
