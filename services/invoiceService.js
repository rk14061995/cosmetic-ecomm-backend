/** Human-readable invoice number (no PDF / file upload). */
function buildInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  const year = new Date(order.createdAt || Date.now()).getFullYear();
  if (order.orderNumber) {
    const tail = String(order.orderNumber).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-12);
    return `INV-${year}-${tail}`;
  }
  const suffix = String(order._id).slice(-6).toUpperCase();
  return `INV-${year}-${suffix}`;
}

module.exports = { buildInvoiceNumber };
