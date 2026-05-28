const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 120000,
});

async function compressBuffer(buffer) {
  return sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true })
    .toBuffer();
}

exports.uploadImage = async (fileBuffer, folder = 'cosmetic_web') => {
  const compressed = await compressBuffer(fileBuffer);
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', timeout: 120000 },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(compressed);
  });
};

exports.deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

exports.uploadMultipleImages = async (files, folder = 'cosmetic_web') => {
  const results = [];
  for (const file of files) {
    results.push(await exports.uploadImage(file.buffer, folder));
  }
  return results;
};
