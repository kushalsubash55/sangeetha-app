import { NextResponse } from "next/server";

type PaymentNotificationBody = {
  notificationType?: "payment";
  billNumber: string;
  customerName: string;
  amountReceivedNow: number;
  paymentMode: "cash" | "upi";
  pendingAmountAfterPayment: number;
  upiRecipient?: string | null;
  employeeName: string;
  employeeId: string;
  timestamp: string;
};

type NewOrderNotificationBody = {
  notificationType: "new-order";
  billNumber: string;
  customerName: string;
  totalAmount: number;
  advancePaid: number;
  paymentMode: "cash" | "upi" | "none";
  upiRecipient?: string | null;
  employeeName: string;
  employeeId: string;
  timestamp: string;
};

type NotificationBody = PaymentNotificationBody | NewOrderNotificationBody;

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
  const telegramGroupChatId = process.env.TELEGRAM_GROUP_CHAT_ID ?? "";

  if (!telegramBotToken || !telegramGroupChatId) {
    return NextResponse.json(
      { error: "Telegram bot token or group chat id is missing." },
      { status: 500 }
    );
  }

  let body: NotificationBody;

  try {
    body = (await request.json()) as NotificationBody;
  } catch {
    return NextResponse.json({ error: "Invalid notification payload." }, { status: 400 });
  }

  const isNewOrderNotification = body.notificationType === "new-order";

  const messageLines = isNewOrderNotification
    ? (() => {
        const newOrderBody = body as NewOrderNotificationBody;

        return [
          "New Order Created",
          "",
          `Bill: ${newOrderBody.billNumber}`,
          `Customer: ${newOrderBody.customerName}`,
          `Total: ${formatCurrency(Number(newOrderBody.totalAmount || 0))}`,
          `Advance: ${formatCurrency(Number(newOrderBody.advancePaid || 0))}`,
          ...(newOrderBody.paymentMode !== "none"
            ? [`Mode: ${formatPaymentMode(newOrderBody.paymentMode as "cash" | "upi")}`]
            : []),
          ...(newOrderBody.paymentMode === "upi" && newOrderBody.upiRecipient
            ? [`UPI To: ${newOrderBody.upiRecipient}`]
            : []),
          `Date: ${newOrderBody.timestamp}`,
          "",
          `Employee: ${newOrderBody.employeeName}`,
          `Employee ID: ${newOrderBody.employeeId}`,
        ];
      })()
    : (() => {
        const paymentBody = body as PaymentNotificationBody;

        return [
          "Payment Received",
          "",
          `Bill: ${paymentBody.billNumber}`,
          `Customer: ${paymentBody.customerName}`,
          `Received: ${formatCurrency(Number(paymentBody.amountReceivedNow || 0))}`,
          `Mode: ${formatPaymentMode(paymentBody.paymentMode)}`,
          ...(paymentBody.paymentMode === "upi" && paymentBody.upiRecipient
            ? [`UPI To: ${paymentBody.upiRecipient}`]
            : []),
          `Pending: ${formatCurrency(Number(paymentBody.pendingAmountAfterPayment || 0))}`,
          `Time: ${paymentBody.timestamp}`,
          "",
          `Employee: ${paymentBody.employeeName}`,
          `Employee ID: ${paymentBody.employeeId}`,
        ];
      })();

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramGroupChatId,
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
