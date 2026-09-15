export function hasOwnershipMeta(html, token) {
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  return (markup.match(/<meta\s[^>]*>/gi) || []).some((tag) => {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map((m) => [
        m[1].toLowerCase(),
        m[3],
      ]),
    );
    return (
      attributes.name === "stockedby-verification" &&
      attributes.content === token
    );
  });
}
