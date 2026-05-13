const PDFDocument = require('pdfkit');
const { uploadRawFile } = require('./cloudinaryService');

function money(value) {
  return `INR ${Number(value || 0).toFixed(2)}`;
}

function buildInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  const year = new Date(order.createdAt || Date.now()).getFullYear();
  const suffix = String(order._id).slice(-6).toUpperCase();
  return `INV-${year}-${suffix}`;
}

function row(doc, y, cols) {
  const [c1, c2, c3, c4] = cols;
  doc.fontSize(10).fillColor('#111827').text(c1, 40, y, { width: 210 });
  doc.text(c2, 255, y, { width: 80, align: 'right' });
  doc.text(c3, 340, y, { width: 90, align: 'right' });
  doc.text(c4, 435, y, { width: 120, align: 'right' });
}

function generateInvoicePdfBuffer(order, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).fillColor('#111827').text(process.env.NEXT_PUBLIC_SITE_NAME || 'KosmeticX');
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#6B7280').text('Tax Invoice');
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#111827');
    doc.text(`Invoice #: ${buildInvoiceNumber(order)}`);
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`);
    doc.text(`Payment: ${order.paymentMethod?.toUpperCase()} (${order.orderStatus})`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#111827').text('Bill To');
    doc.fontSize(10).fillColor('#374151');
    doc.text(user?.name || order.shippingAddress?.fullName || 'Customer');
    if (user?.email) doc.text(user.email);
    if (order.shippingAddress?.phone) doc.text(order.shippingAddress.phone);
    doc.moveDown(0.5);
    doc.text(order.shippingAddress?.addressLine1 || '');
    if (order.shippingAddress?.addressLine2) doc.text(order.shippingAddress.addressLine2);
    doc.text(`${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}`);
    doc.moveDown(1);

    doc.fontSize(11).fillColor('#111827').text('Items');
    doc.moveDown(0.4);
    row(doc, doc.y, ['Item', 'Qty', 'Unit Price', 'Amount']);
    doc.moveDown(0.2);
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    for (const item of order.orderItems || []) {
      const amount = Number(item.price || 0) * Number(item.quantity || 0);
      row(doc, doc.y, [item.name || 'Item', String(item.quantity || 0), money(item.price), money(amount)]);
      doc.moveDown(0.5);
      if (doc.y > 730) doc.addPage();
    }

    doc.moveDown(0.8);
    const summaryStartX = 350;
    doc.fontSize(10).fillColor('#374151');
    doc.text('Subtotal', summaryStartX, doc.y, { width: 100 });
    doc.text(money(order.itemsPrice), 455, doc.y, { width: 100, align: 'right' });
    doc.moveDown(0.5);
    doc.text('Shipping', summaryStartX, doc.y, { width: 100 });
    doc.text(order.shippingPrice === 0 ? 'FREE' : money(order.shippingPrice), 455, doc.y, { width: 100, align: 'right' });
    if (Number(order.discountAmount || 0) > 0) {
      doc.moveDown(0.5);
      doc.text('Discount', summaryStartX, doc.y, { width: 100 });
      doc.text(`- ${money(order.discountAmount)}`, 455, doc.y, { width: 100, align: 'right' });
    }
    if (Number(order.walletAmountUsed || 0) > 0) {
      doc.moveDown(0.5);
      doc.text('Wallet', summaryStartX, doc.y, { width: 100 });
      doc.text(`- ${money(order.walletAmountUsed)}`, 455, doc.y, { width: 100, align: 'right' });
    }
    doc.moveDown(0.6);
    doc.fontSize(12).fillColor('#111827').text('Total', summaryStartX, doc.y, { width: 100 });
    doc.text(money(order.totalPrice), 455, doc.y, { width: 100, align: 'right' });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#6B7280').text('This is a system generated invoice.', 40, doc.y, {
      width: 515,
      align: 'center',
    });

    doc.end();
  });
}

async function ensureOrderInvoice(order, user) {
  if (!order || !order.isPaid) return null;
  const pdfBuffer = await generateInvoicePdfBuffer(order, user);
  const invoiceNumber = buildInvoiceNumber(order);
  const upload = await uploadRawFile(pdfBuffer, {
    folder: 'cosmetic_web/invoices',
    publicId: `invoice_${order._id}`,
    format: 'pdf',
  });

  return {
    invoiceNumber,
    invoiceUrl: upload.url,
    invoicePublicId: upload.publicId,
    invoiceGeneratedAt: new Date(),
  };
}

module.exports = {
  ensureOrderInvoice,
};

