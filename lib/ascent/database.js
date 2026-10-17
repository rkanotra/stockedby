export async function action(db, name, args) {
  const { data, error } = await db.rpc("ascent_action", { action: name, args });
  if (error)
    throw Object.assign(Error(error.message), {
      status: /limit|processing/.test(error.message) ? 429 : 400,
    });
  return data;
}
