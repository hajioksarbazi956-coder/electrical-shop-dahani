export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8"
  };

  try {
    const order = await request.json();

    if (
      !order.name ||
      !order.contact ||
      !Array.isArray(order.items) ||
      order.items.length === 0
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: "اطلاعات سفارش ناقص است" }),
        { status: 400, headers }
      );
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return new Response(
        JSON.stringify({ ok: false, error: "تنظیمات تلگرام انجام نشده" }),
        { status: 500, headers }
      );
    }

    const clean = value =>
      String(value ?? "").replace(/[<>]/g, "").slice(0, 500);

    const lines = [
      "🛒 سفارش جدید — الکتریکی دهانی",
      "",
      "👤 نام مشتری: " + clean(order.name),
      "📞 راه ارتباطی: " + clean(order.contact),
      "🚚 نحوه دریافت: " + clean(order.delivery || "هماهنگی با فروشگاه"),
      "",
      "📦 محصولات:"
    ];

    for (const item of order.items.slice(0, 40)) {
      lines.push(
        "• " + clean(item.name) +
        " — تعداد: " + Math.max(1, parseInt(item.quantity, 10) || 1)
      );
    }

    if (order.address) {
      lines.push("", "📝 آدرس/توضیحات: " + clean(order.address));
    }

    lines.push("", "⚠️ قیمت و موجودی را با مشتری تأیید کنید.");

    const response = await fetch(
      "https://api.telegram.org/bot" +
      env.TELEGRAM_BOT_TOKEN +
      "/sendMessage",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: lines.join("\n")
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "ارسال تلگرام ناموفق بود" }),
        { status: 502, headers }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "خطا در پردازش سفارش" }),
      { status: 400, headers }
    );
  }
}
