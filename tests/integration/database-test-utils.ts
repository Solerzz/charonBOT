export function assertDisposableDatabaseEnvironment(): void {
  const reject = (): never => { throw new Error('Disposable local test database required'); };
  const parse = (value: string | undefined): URL => {
    if (!value) return reject();
    let url: URL;
    try { url = new URL(value); } catch { return reject(); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.username || !url.password
      || !/^\/charon_v030_test[a-zA-Z0-9_]*$/.test(url.pathname)
      || (url.search && url.search !== '?schema=public') || url.hash) return reject();
    return url;
  };
  const url = parse(process.env.DATABASE_URL);
  const direct = parse(process.env.DIRECT_URL);
  if (url.hostname !== direct.hostname || (url.port || '5432') !== (direct.port || '5432')
    || url.pathname !== direct.pathname || url.username !== direct.username || url.password !== direct.password) reject();
}
