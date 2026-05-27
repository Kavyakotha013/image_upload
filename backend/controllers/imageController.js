import fs from 'fs';
import path from 'path';
import Image from '../models/Image.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const newImage = new Image({
      fileName: req.file.originalname,
      imageUrl: imageUrl
    });

    const savedImage = await newImage.save();

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully!',
      image: savedImage
    });
  } catch (error) {
    console.error(`[Upload Controller Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Server upload error, please try again.' });
  }
};

export const getAllImages = async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: images.length,
      images
    });
  } catch (error) {
    console.error(`[GetImages Controller Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve images.' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ success: false, message: 'Image record not found.' });
    }

    const filename = image.imageUrl.split('/').pop();
    const filePath = path.join(process.cwd(), '../uploads', filename);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`[File System] File deleted successfully: ${filePath}`);
      } else {
        console.warn(`[File System Warning] File not found on disk, proceeding with DB removal: ${filePath}`);
      }
    } catch (fsErr) {
      console.error(`[File System Error] Failed to delete file: ${fsErr.message}`);
    }

    await Image.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully!'
    });
  } catch (error) {
    console.error(`[Delete Controller Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete image.' });
  }
};
