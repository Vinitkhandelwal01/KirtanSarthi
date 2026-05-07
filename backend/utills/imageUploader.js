const cloudinary = require('cloudinary').v2

exports.uploadImageToCloudinary = async (file , folder, height , quality) => {
    const options = {folder};
    if(height) {
        options.height = height;
        options.width = height;
        options.crop = "fill";
    }
    if(quality) {
        options.quality = quality;
    }
    options.format = "webp";
    options.resource_type = "auto";

    return await cloudinary.uploader.upload(file.tempFilePath,options);
}