const Product = require('../models/Product');

exports.allocateProducts = async (mysteryBox) => {
  const { productPool, minProducts, maxProducts } = mysteryBox;

  if (!productPool || productPool.length === 0) {
    throw new Error('Mystery box has no product pool configured');
  }

  const count = Math.floor(Math.random() * (maxProducts - minProducts + 1)) + minProducts;
  const selected = [];
  const totalWeight = productPool.reduce((sum, p) => sum + p.weight, 0);

  while (selected.length < count && selected.length < productPool.length) {
    let random = Math.random() * totalWeight;
    for (const item of productPool) {
      random -= item.weight;
      if (random <= 0) {
        const alreadySelected = selected.find(
          (s) => s.product.toString() === item.product.toString()
        );
        if (!alreadySelected) {
          const product = await Product.findById(item.product).select('name price images stock');
          if (product && product.stock > 0) {
            selected.push({ product: item.product, productData: product });
          }
        }
        break;
      }
    }
  }

  return selected;
};

exports.deductInventory = async (allocatedProducts) => {
  for (const item of allocatedProducts) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -1 } });
  }
};
