const headers = {
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export async function onRequest({ request, env }) {
  if (!env.PRODUCTS) {
    return json({ error: "ذخیره‌سازی محصولات تنظیم نشده است" }, 500);
  }

  if (request.method === "GET") {
    try {
      const raw = await env.PRODUCTS.get("catalog");
      return json({ products: raw ? JSON.parse(raw) : [] });
    } catch {
      return json({ error: "خطا در خواندن محصولات" }, 500);
    }
  }

  if (!env.ADMIN_PASSWORD) {
    return json({ error: "رمز مدیریت تنظیم نشده است" }, 500);
  }

  if (request.headers.get("X-Admin-Password") !== env.ADMIN_PASSWORD) {
    return json({ error: "رمز مدیریت نادرست است" }, 401);
  }

  try {
    const body = await request.json();
    let list = JSON.parse(
      await env.PRODUCTS.get("catalog") || "[]"
    );

    if (request.method === "POST") {
      if (!body.name || !String(body.name).trim()) {
        return json({ error: "نام محصول الزامی است" }, 400);
      }

      const id = body.id || crypto.randomUUID();

      const product = {
        id,
        name: String(body.name).trim(),
        category: String(body.category || ""),
        price: Math.max(0, Number(body.price) || 0),
        stock: Number.isFinite(Number(body.stock))
          ? Number(body.stock)
          : -1,
        image: String(body.image || ""),
        description: String(body.description || "")
      };

      const index = list.findIndex(p => p.id === id);

      if (index >= 0) {
        list[index] = product;
      } else {
        list.unshift(product);
      }

      await env.PRODUCTS.put("catalog", JSON.stringify(list));

      return json({ ok: true, product });
    }

    if (request.method === "DELETE") {
      list = list.filter(p => p.id !== body.id);

      await env.PRODUCTS.put("catalog", JSON.stringify(list));

      return json({ ok: true });
    }

    return json({ error: "روش پشتیبانی نمی‌شود" }, 405);
  } catch {
    return json({ error: "خطا در پردازش اطلاعات" }, 400);
  }
}
