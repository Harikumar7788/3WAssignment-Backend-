const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'detozhauq',
    api_key: '472579284442892',
    api_secret: 'AgLrClUG_1xLQL3FTtQ5H-vNPP0'
});

module.exports = cloudinary;
