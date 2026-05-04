export const createUuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `tracky-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export const parseVoiceFallback = (transcript, menu = []) => {
  const input = String(transcript || "").toLowerCase();
  const numberWords = {
    ek: 1,
    do: 2,
    teen: 3,
    char: 4,
    chaar: 4,
    paanch: 5,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5
  };

  return menu
    .map((item) => {
      const name = item.name.toLowerCase();
      if (!input.includes(name)) return null;

      const before = input.split(name)[0];
      const lastToken = before.trim().split(/\s+/).pop();
      const quantity = Number(lastToken) || numberWords[lastToken] || 1;
      return {
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        quantity
      };
    })
    .filter(Boolean);
};

export const playConfirmationTone = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.03;
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch {
    // Never block billing on audio errors.
  }
};

export const quickPrintReceipt = ({ dhabaName, order, customerName }) => {
  try {
    const receiptWindow = window.open("", "_blank", "width=360,height=640");
    if (!receiptWindow) return false;

    const lines = order.items
      .map(
        (item) =>
          `<div style="display:flex;justify-content:space-between;margin:6px 0;">
            <span>${item.name} x${item.quantity}</span>
            <span>Rs ${item.lineTotal || item.unitPrice * item.quantity}</span>
          </div>`
      )
      .join("");

    receiptWindow.document.write(`
      <html>
        <head>
          <title>${order.orderNumber}</title>
          <style>
            body { font-family: monospace; padding: 12px; width: 280px; }
            h1, p { margin: 0 0 6px; }
            .rule { border-top: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          <h1>${dhabaName || "Tracky"}</h1>
          <p>${order.orderNumber}</p>
          <p>${new Date(order.createdAt || Date.now()).toLocaleString("en-IN")}</p>
          ${customerName ? `<p>Customer: ${customerName}</p>` : ""}
          <div class="rule"></div>
          ${lines}
          <div class="rule"></div>
          <p>Total: Rs ${order.total}</p>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
    return true;
  } catch {
    return false;
  }
};
