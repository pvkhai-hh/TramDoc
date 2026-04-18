const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'tram_doc_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.session = req.session;

    res.locals.successMsg = req.session.success;
    res.locals.errorMsg = req.session.error;

    delete req.session.success;
    delete req.session.error;
    
    next();
});

const dbURI = 'mongodb://phanvankhai181005_db_user:pvkhai123@ac-ezetr1s-shard-00-00.ectrhc6.mongodb.net:27017,ac-ezetr1s-shard-00-01.ectrhc6.mongodb.net:27017,ac-ezetr1s-shard-00-02.ectrhc6.mongodb.net:27017/TramDoc?ssl=true&authSource=admin&retryWrites=true&w=majority';
mongoose.connect(dbURI)
    .then(() => console.log('Đã kết nối cơ sở dữ liệu Trạm Đọc!'))
    .catch(err => console.log('Lỗi kết nối DB: ', err));

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');

app.use('/', indexRouter);
app.use('/', authRouter);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Trạm Đọc đang mở cửa tại: http://localhost:${PORT}`);
});