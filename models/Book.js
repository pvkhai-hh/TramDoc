const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    tacGia: { type: String, default: "Không có tác giả" },
    price: { type: Number, required: true },
    image: { type: String }, 
    description: { type: String },
    stock: { type: Number, required: true, default: 0 },
    importPrice: { type: Number, required: true, default: 0 },
    sold: { type: Number, default: 0 }
});

module.exports = mongoose.model('Book', bookSchema);