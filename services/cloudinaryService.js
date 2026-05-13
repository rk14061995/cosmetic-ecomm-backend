const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadImage = async (fileBuffer, folder = 'cosmetic_web') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

exports.uploadRawFile = async (fileBuffer, options = {}) => {
  const { folder = 'cosmetic_web/invoices', publicId, format = 'pdf' } = options;
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
        public_id: publicId,
        format,
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

exports.deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

exports.uploadMultipleImages = async (files, folder = 'cosmetic_web') => {
  return Promise.all(files.map((file) => exports.uploadImage(file.buffer, folder)));
};
