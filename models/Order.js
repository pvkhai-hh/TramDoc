const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    customerName: { type: String, required: true }, 
    phone: { type: String, required: true },      
    address: { type: String, required: true },   
    items: [
        {
            bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }, 
            title: String,   
            image: String,    
            quantity: Number,
            price: Number
        }
    ],
    totalAmount: { type: Number, required: true }, // Tổng tiền đơn hàng
    status: { 
        type: String, 
        enum: ['Chờ duyệt', 'Đã duyệt', 'Đang giao', 'Hoàn thành', 'Đã hủy'], 
        default: 'Chờ duyệt'
    },
    orderDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);