import { NextResponse } from "next/server";

type NotificationBody = {
  billNumber: string;
  customerName: string;
  amountReceivedNow: number;
  paymentMode: "cash" | "upi";
  pendingAmountAfterPayment: number;
  employeeName: string;
  employeeId: string;
  timestamp: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPaymentMode(paymentMode: "cash" | "upi") {
  if (paymentMode === "upi") {
    return "UPI";
  }

  return "Cash";
}

export async function POST(request: Request) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const telegramOwnerChatId = process.env.TELEGRAM_OWNER_CHAT_ID ?? "";

  if (!telegramBotToken || !telegramOwnerChatId) {
    return NextResponse.json(
      { error: "Telegram bot token or owner chat id is missing." },
      { status: 500 }
    );
  }

  let body: NotificationBody;

  try {
    body = (await request.json()) as NotificationBody;
  } catch {
    return NextResponse.json({ error: "Invalid notification payload." }, { status: 400 });
  }

  const messageLines = [
    "Payment Received",
    "",
    `Bill: ${body.billNumber}`,
    `Customer: ${body.customerName}`,
    `Received: ${formatCurrency(Number(body.amountReceivedNow || 0))}`,
    `Mode: ${formatPaymentMode(body.paymentMode)}`,
    `Pending: ${formatCurrency(Number(body.pendingAmountAfterPayment || 0))}`,
    `Time: ${body.timestamp}`,
    "",
    `Employee: ${body.employeeName}`,
    `Employee ID: ${body.employeeId}`,
  ];

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramOwnerChatId,
        text: messageLines.join("\n"),
      }),
      cache: "no-store",
    }
  );

  if (!telegramResponse.ok) {
    const telegramErrorText = await telegramResponse.text();

    return NextResponse.json(
      { error: telegramErrorText || "Telegram notification failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
