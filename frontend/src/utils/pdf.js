import { jsPDF } from "jspdf";
import { formatCurrency } from "./currency.js";

export const downloadBillPdf = ({ order, dhabaName, customerName }) => {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text(dhabaName || "Tracky Bill", 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Order: ${order.orderNumber || "Pending"}`, 14, y);
  y += 7;
  doc.text(`Payment: ${order.paymentMethod}`, 14, y);
  y += 7;
  if (customerName) {
    doc.text(`Customer: ${customerName}`, 14, y);
    y += 7;
  }

  doc.line(14, y, 190, y);
  y += 8;

  order.items.forEach((item) => {
    doc.text(`${item.name} x${item.quantity}`, 14, y);
    doc.text(formatCurrency(item.lineTotal || item.price * item.quantity), 150, y, { align: "right" });
    y += 7;
  });

  y += 4;
  doc.line(14, y, 190, y);
  y += 10;
  doc.text(`Total: ${formatCurrency(order.total)}`, 14, y);

  doc.save(`${order.orderNumber || "tracky-bill"}.pdf`);
};
