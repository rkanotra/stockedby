export function generationFailure(error, stage) {
  const kinds = [error?.name, error?.constructor?.name];
  if (error?.status === 429) return { status: 429, code: 'provider_limit', message: 'AI generation reached its provider usage limit. Try again later. Your existing content is unchanged.' };
  if ([401, 403].includes(error?.status)) return { status: 503, code: 'provider_configuration', message: 'The AI service could not authenticate. StockedBy needs to check its AI configuration. Your existing content is unchanged.' };
  if (kinds.some(k => ['APIConnectionTimeoutError', 'AbortError', 'TimeoutError'].includes(k))) return { status: 504, code: 'generation_timeout', message: 'AI generation timed out. Retry this step with fewer sources or a shorter instruction. Your existing content is unchanged.' };
  if (kinds.includes('APIUserAbortError')) return { status: 499, code: 'generation_cancelled', message: 'Generation stopped. Your existing content is unchanged.' };
  if (kinds.includes('APIConnectionError') || error?.status >= 500) return { status: 502, code: 'provider_unavailable', message: 'The connection to the AI service failed. Retry this step; completed outputs are unchanged.' };
  if (stage === 'validation') return { status: 502, code: 'invalid_output', message: 'AI returned a draft that could not be validated. Retry this step. Your previous draft is unchanged.' };
  return { status: 502, code: 'generation_rejected', message: 'The AI service could not process this step. Retry once; if it repeats, share the reference below so we can investigate. Your existing content is unchanged.' };
}
