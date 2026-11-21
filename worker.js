export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sync' && request.method === 'POST') {
      const headers = { 'Content-Type': 'application/json' };
      try {
        if (!env.EDUBOARD_KV) {
          return new Response(
            JSON.stringify({ ok: false, error: 'База EDUBOARD_KV не привязана в настройках Worker' }),
            { status: 500, headers }
          );
        }

        const body = await request.json();
        const { action, login, passHash, data } = body || {};
        const cleanLogin = String(login || '').trim().toLowerCase();

        if (!cleanLogin || !passHash) {
          return new Response(JSON.stringify({ ok: false, error: 'Укажите логин и пароль' }), { status: 400, headers });
        }

        const key = 'user:' + cleanLogin;
        const existingRaw = await env.EDUBOARD_KV.get(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : null;

        if (existing && existing.passHash !== passHash) {
          return new Response(JSON.stringify({ ok: false, error: 'Неверный пароль для этого логина' }), { status: 403, headers });
        }

        if (action === 'load') {
          return new Response(JSON.stringify({ ok: true, data: existing ? existing.data : null }), { status: 200, headers });
        }

        if (action === 'save') {
          await env.EDUBOARD_KV.put(key, JSON.stringify({ passHash, data, updatedAt: Date.now() }));
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
        }

        return new Response(JSON.stringify({ ok: false, error: 'Неизвестное действие' }), { status: 400, headers });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: 'Ошибка сервера: ' + err.message }), { status: 500, headers });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
