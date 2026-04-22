require('dotenv').config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const Book = require("../models/Book");
const User = require("../models/User");
const Order = require("../models/Order");

//Upload ảnh sách
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, uniqueSuffix);
  },
});
const upload = multer({ storage: storage });

router.get("/", async (req, res) => {
  try {
    const perPage = 8;
    const page = parseInt(req.query.page) || 1;
    const categoryFilter = req.query.category; // Lọc theo thể loại
    const sortPrice = req.query.sortPrice; // Sắp xếp giá

    //TÌM KIẾM
    let query = {};
    if (categoryFilter) {
      query.author = categoryFilter;
    }

    //SẮP XẾP GIÁ
    let sortObj = {};
    if (sortPrice === "asc") {
      sortObj.price = 1; //Tăng
    } else if (sortPrice === "desc") {
      sortObj.price = -1; //Giảm
    } else {
      sortObj._id = -1; //default
    }

    //TRUY VẤN
    const books = await Book.find(query)
      .sort(sortObj)
      .skip(perPage * page - perPage)
      .limit(perPage);

    const count = await Book.countDocuments(query);
    const topSelling = await Book.find().sort({ sold: -1 }).limit(5);

    res.render("index", {
      listBooks: books,
      topSelling: topSelling,
      current: page,
      totalPages: Math.ceil(count / perPage),
      session: req.session,
      currentCategory: categoryFilter,
      currentSort: sortPrice,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi tải trang chủ!");
  }
});

//Thêm sách
router.get("/add-book", (req, res) => {
  res.render("add-book");
});

router.post("/add-book", upload.single("imageFile"), async (req, res) => {
  try {
    // Thêm tacGia vào đây
    const { title, author, tacGia, price, importPrice, stock, description } =
      req.body;

    let duongDanAnh = "";
    if (req.file) {
      duongDanAnh = "/images/" + req.file.filename;
    }

    const sachMoi = new Book({
      title,
      author,
      tacGia: tacGia || "Không có tác giả",
      price,
      importPrice,
      stock,
      description,
      image: duongDanAnh,
    });

    await sachMoi.save();
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send("Lỗi trong quá trình lưu sách!");
  }
});

//Xem chi tiết
router.get("/book/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const bookInfo = await Book.findById(bookId);

    if (!bookInfo) {
      return res.send("Không tìm thấy sách này!");
    }

    // Truyền dữ liệu sách sang trang giao diện chi tiết
    res.render("book-detail", { book: bookInfo });
  } catch (error) {
    console.log(error);
    res.send("Lỗi khi tải chi tiết sách!");
  }
});

//Giỏ hang & Đặt hàng
router.post("/add-to-cart", async (req, res) => {
  if (!req.session || !req.session.userId) {
    req.session.error = "Bạn cần đăng nhập để thêm vào giỏ hàng hoặc mua hàng!";
    return res.redirect("/dangnhap");
  }

  try {
    const { bookId, quantity, action } = req.body;
    const book = await Book.findById(bookId);

    if (!book) return res.send("Sách không tồn tại!");

    if (!req.session.cart) {
      req.session.cart = [];
    }

    //Kiểm tra sách trong giỏ
    const existingItemIndex = req.session.cart.findIndex(
      (item) => item.bookId === bookId,
    );
    const addQty = parseInt(quantity) || 1;

    if (existingItemIndex > -1) {
      //Có rồi, cộng dồn
      req.session.cart[existingItemIndex].quantity += addQty;
    } else {
      //chưa có, thêm mới
      req.session.cart.push({
        bookId: book._id.toString(),
        title: book.title,
        price: book.price,
        image: book.image,
        quantity: addQty,
      });
    }

    //Mua hãy thêm
    if (action === "buy") {
      return res.redirect("/cart"); //Mua đến giỏ
    } else {
      req.session.success = "Đã thêm " + book.title + " vào giỏ hàng!";
      return res.redirect("/book/" + bookId); // Thêm ở lại
    }
  } catch (error) {
    console.log(error);
    res.send("Lỗi xử lý giỏ hàng!");
  }
});
// Giỏ hàng
router.get("/cart", (req, res) => {
  if (!req.session || !req.session.userId) {
    req.session.error = "Vui lòng đăng nhập để xem giỏ hàng!";
    return res.redirect("/dangnhap");
  }

  const cart = req.session.cart || [];
  // Tính tổng tiền
  let totalAmount = 0;
  cart.forEach((item) => {
    totalAmount += item.price * item.quantity;
  });

  res.render("cart", { cart: cart, totalAmount: totalAmount });
});

//Cập nhật giỏ hàng (tăng, giảm, xóa)
router.get("/update-cart/:action/:bookId", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/dangnhap");
  }

  const { action, bookId } = req.params;
  let cart = req.session.cart || [];

  // Tìm vị trí sách trong giỏ hàng
  const itemIndex = cart.findIndex((item) => item.bookId === bookId);

  if (itemIndex > -1) {
    if (action === "increase") {
      cart[itemIndex].quantity += 1;
    } else if (action === "decrease") {
      if (cart[itemIndex].quantity > 1) {
        cart[itemIndex].quantity -= 1;
      }
    } else if (action === "remove") {
      cart.splice(itemIndex, 1);
      req.session.success = "Đã xóa sách khỏi giỏ hàng!";
    }
  }

  req.session.cart = cart;
  res.redirect("/cart");
});

// Thông tin đơn hàng
router.get("/checkout", async (req, res) => {
  if (!req.session || !req.session.userId) {
    req.session.error = "Vui lòng đăng nhập để thanh toán!";
    return res.redirect("/dangnhap");
  }
  const cart = req.session.cart || [];
  if (cart.length === 0) {
    return res.redirect("/cart");
  }

  // Tính tổng tiền lại
  let totalAmount = 0;
  cart.forEach((item) => (totalAmount += item.price * item.quantity));

  try {
    // Điền sẳn tt
    const user = await User.findById(req.session.userId);

    res.render("checkout", {
      cart: cart,
      totalAmount: totalAmount,
      user: user,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi tải trang thanh toán!");
  }
});

// Xử lý đặt hàng
router.post("/checkout", async (req, res) => {
  if (!req.session || !req.session.userId) return res.redirect("/dangnhap");

  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect("/cart");

  try {
    const { customerName, phone, address } = req.body;
    let totalAmount = 0;

    //Kiểm tra tồn kho
    for (let item of cart) {
      const book = await Book.findById(item.bookId);
      if (!book || book.stock < item.quantity) {
        req.session.error = `Sách "${item.title}" hiện không đủ số lượng trong kho!`;
        return res.redirect("/cart");
      }
      totalAmount += item.price * item.quantity;
    }

    //Tạo đơn hàng mới -> Lưu db
    const newOrder = new Order({
      userId: req.session.userId,
      customerName: customerName,
      phone: phone,
      address: address,
      items: cart,
      totalAmount: totalAmount,
    });
    await newOrder.save();

    for (let item of cart) {
      await Book.findByIdAndUpdate(item.bookId, {
        $inc: {
          stock: -item.quantity, // Trừ đi số lượng khách mua
          sold: item.quantity, // Cộng vào số lượng đã bán
        },
      });
    }

    req.session.cart = [];
    req.session.success =
      "🎉 Đặt hàng thành công! Đơn hàng đang chờ Admin duyệt.";
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send("Có lỗi xảy ra trong quá trình đặt hàng!");
  }
});

//Đơn hàng của khách hàng
router.get("/orders", async (req, res) => {
  if (!req.session || !req.session.userId) {
    req.session.error = "Vui lòng đăng nhập để xem đơn hàng!";
    return res.redirect("/dangnhap");
  }
  try {
    // Sắp xếp đơn mới nhất lên đầu
    const orders = await Order.find({ userId: req.session.userId }).sort({
      orderDate: -1,
    });
    res.render("orders", { orders: orders });
  } catch (error) {
    console.log(error);
    res.send("Lỗi tải danh sách đơn hàng!");
  }
});

//Hóa đơn chi tiết
router.get("/invoice/:id", async (req, res) => {
  if (!req.session || !req.session.userId) return res.redirect("/dangnhap");

  try {
    const order = await Order.findById(req.params.id);

    if (!order || order.userId.toString() !== req.session.userId) {
      return res.send("Không tìm thấy hóa đơn hoặc bạn không có quyền xem!");
    }

    if (order.status === "Chờ duyệt") {
      return res.send("Đơn hàng đang chờ duyệt, chưa có hóa đơn chính thức!");
    }

    res.render("invoice", { order: order });
  } catch (error) {
    console.log(error);
    res.send("Lỗi tải hóa đơn!");
  }
});

//Profile
router.get("/profile", async (req, res) => {
  if (!req.session || !req.session.userId) {
    req.session.error = "Vui lòng đăng nhập để xem hồ sơ!";
    return res.redirect("/dangnhap");
  }
  try {
    const user = await User.findById(req.session.userId);
    const successMsg = req.session.success;
    req.session.success = null;
    res.render("profile", {
      user: user,
      successMsg: successMsg,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi khi tải trang hồ sơ!");
  }
});

//Update profile
router.post("/profile", async (req, res) => {
  if (!req.session || !req.session.userId) return res.redirect("/dangnhap");

  try {
    const { fullname, email, phone, address } = req.body;
    await User.findByIdAndUpdate(req.session.userId, {
      fullname: fullname,
      email: email,
      phone: phone,
      address: address,
    });
    req.session.fullname = fullname;
    req.session.success = "Cập nhật hồ sơ thành công!";
    res.redirect("/profile");
  } catch (error) {
    console.log(error);
    res.send("Có lỗi xảy ra khi cập nhật hồ sơ!");
  }
});

//Tìm kiếm
router.get("/api/search", async (req, res) => {
  try {
    const keyword = req.query.q || "";
    if (keyword.trim().length === 0) return res.json([]);
    //Tìm -> tiêu đề
    const books = await Book.find({
      title: { $regex: keyword, $options: "i" }, //ko phân biệt hoa thường
    }).limit(5);

    res.json(books);
  } catch (error) {
    console.log(error);
    res.status(500).json([]);
  }
});

//Khách tự hủy (Chờ duyệt)
router.post("/cancel-order/:id", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/dangnhap");
  }

  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order || order.userId.toString() !== req.session.userId) {
      req.session.error = "Bạn không có quyền hủy đơn hàng này!";
      return res.redirect("/orders");
    }

    if (order.status === "Chờ duyệt" || order.status === "Đang chờ duyệt") {
      for (let item of order.items) {
        await Book.findByIdAndUpdate(item.bookId, {
          $inc: {
            stock: item.quantity,
            sold: -item.quantity,
          },
        });
      }
      await Order.findByIdAndUpdate(orderId, { status: "Đã hủy" });
      req.session.success = "Đã hủy đơn hàng thành công và trả sách về kho!";
    } else {
      req.session.error = "Không thể hủy! Đơn hàng này đã được Admin xử lý.";
    }
    res.redirect("/orders");
  } catch (error) {
    console.log(error);
    req.session.error = "Lỗi trong quá trình hủy đơn hàng!";
    res.redirect("/orders");
  }
});

// ADMIN --------------------------------
router.get("/admin/admin_dashboard", async (req, res) => {
  if (!req.session || req.session.role !== "admin") {
    req.session.error = "Bạn không có quyền truy cập trang quản trị!";
    return res.redirect("/");
  }

  try {
    const books = await Book.find();
    let totalBooks = 0;
    books.forEach((book) => (totalBooks += book.stock));
    const allOrders = await Order.find();
    let countCompleted = 0;
    let countPending = 0;

    allOrders.forEach((order) => {
      if (order.status === "Hoàn thành" || order.status === "Đã hoàn thành") {
        countCompleted++;
      } else if (
        order.status === "Chờ duyệt" ||
        order.status === "Đang chờ duyệt"
      ) {
        countPending++;
      }
    });

    let { startDate, endDate } = req.query;
    if (!startDate && !endDate) {
      const today = new Date();
      // Format
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayString = `${yyyy}-${mm}-${dd}`;
      startDate = todayString;
      endDate = todayString;
    }
    let revenueQuery = { status: { $in: ["Hoàn thành", "Đã hoàn thành"] } };
    if (startDate || endDate) {
      revenueQuery.orderDate = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        revenueQuery.orderDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        revenueQuery.orderDate.$lte = end;
      }
    }

    const revenueOrders = await Order.find(revenueQuery).sort({
      orderDate: -1,
    });
    let totalRevenue = 0;
    revenueOrders.forEach((order) => {
      totalRevenue += order.totalAmount;
    });

    res.render("admin/admin_dashboard", {
      totalRevenue: totalRevenue,
      countCompleted: countCompleted,
      countPending: countPending,
      totalBooks: totalBooks,
      revenueOrders: revenueOrders,
      startDate: startDate,
      endDate: endDate,
      session: req.session,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi trong quá trình tải dữ liệu Dashboard!");
  }
});

router.get("/admin/admin_users", async (req, res) => {
  if (!req.session || req.session.role !== "admin") {
    req.session.error = "Bạn không có quyền truy cập!";
    return res.redirect("/");
  }

  try {
    const users = await User.find().sort({ _id: -1 });
    res.render("admin/admin_users", {
      users: users,
      session: req.session,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi khi tải danh sách người dùng!");
  }
});

router.get("/admin/admin_users/edit/:id", async (req, res) => {
  if (!req.session || req.session.role !== "admin") return res.redirect("/");

  try {
    const userEdit = await User.findById(req.params.id);
    if (!userEdit) {
      req.session.error = "Không tìm thấy người dùng!";
      return res.redirect("/admin/admin_users");
    }

    res.render("admin/admin_edit_user", {
      userEdit: userEdit,
      session: req.session,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi khi tải trang sửa người dùng!");
  }
});

router.post("/admin/admin_users/edit/:id", async (req, res) => {
  if (!req.session || req.session.role !== "admin") return res.redirect("/");

  try {
    const { role } = req.body;

    const userTarget = await User.findById(req.params.id);
    if (userTarget.username === req.session.username && role !== "admin") {
      req.session.error =
        "Bạn không thể tự tước quyền Quản trị viên của chính mình!";
      return res.redirect("/admin/admin_users");
    }
    await User.findByIdAndUpdate(req.params.id, { role: role });
    req.session.success = "Đã cập nhật quyền hạn thành công!";
    res.redirect("/admin/admin_users");
  } catch (error) {
    console.log(error);
    req.session.error = "Lỗi khi cập nhật người dùng!";
    res.redirect("/admin/admin_users");
  }
});

router.post("/admin/admin_users/delete/:id", async (req, res) => {
  if (!req.session || req.session.role !== "admin") return res.redirect("/");

  try {
    const userToDelete = await User.findById(req.params.id);
    if (userToDelete.username === req.session.username) {
      req.session.error = "Bạn không thể tự xóa tài khoản của chính mình!";
      return res.redirect("/admin/admin_users");
    }
    await User.findByIdAndDelete(req.params.id);
    req.session.success = "Đã xóa tài khoản thành công!";
    res.redirect("/admin/admin_users");
  } catch (error) {
    console.log(error);
    req.session.error = "Lỗi khi xóa tài khoản!";
    res.redirect("/admin/admin_users");
  }
});

router.get("/admin/admin_orders", async (req, res) => {
  if (!req.session || req.session.role !== "admin") {
    req.session.error = "Bạn không có quyền truy cập!";
    return res.redirect("/");
  }

  try {
    const orders = await Order.find().sort({ orderDate: -1 });
    res.render("admin/admin_orders", {
      orders: orders,
      session: req.session,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi tải trang quản lý đơn hàng!");
  }
});

router.post("/admin/admin_orders/update-status", async (req, res) => {
  if (!req.session || req.session.role !== "admin") {
    return res.redirect("/");
  }

  try {
    const { orderId, newStatus } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      req.session.error = "Không tìm thấy đơn hàng!";
      return res.redirect("/admin/admin_orders");
    }

    if (newStatus === "Đã hủy" && order.status !== "Đã hủy") {
      for (let item of order.items) {
        await Book.findByIdAndUpdate(item.bookId, {
          $inc: { stock: item.quantity, sold: -item.quantity },
        });
      }
    } else if (order.status === "Đã hủy" && newStatus !== "Đã hủy") {
      for (let item of order.items) {
        await Book.findByIdAndUpdate(item.bookId, {
          $inc: { stock: -item.quantity, sold: item.quantity },
        });
      }
    }
    await Order.findByIdAndUpdate(orderId, { status: newStatus });
    req.session.success = `Đã cập nhật trạng thái thành: ${newStatus}`;
    res.redirect("/admin/admin_orders");
  } catch (error) {
    console.log(error);
    req.session.error = "Lỗi khi cập nhật trạng thái!";
    res.redirect("/admin/admin_orders");
  }
});

router.get("/admin/admin_books", async (req, res) => {
  if (!req.session || req.session.role !== "admin") {
    req.session.error = "Bạn không có quyền truy cập!";
    return res.redirect("/");
  }

  try {
    const books = await Book.find().sort({ _id: -1 });
    res.render("admin/admin_books", {
      books: books,
      session: req.session,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi khi tải danh sách sách!");
  }
});

router.get("/admin/admin_books/edit/:id", async (req, res) => {
  if (!req.session || req.session.role !== "admin") return res.redirect("/");

  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      req.session.error = "Không tìm thấy sách!";
      return res.redirect("/admin/admin_books");
    }
    res.render("admin/admin_edit_book", {
      book: book,
      session: req.session,
    });
  } catch (error) {
    console.log(error);
    res.send("Lỗi khi tải trang sửa sách!");
  }
});

router.post(
  "/admin/admin_books/edit/:id",
  upload.single("imageFile"),
  async (req, res) => {
    if (!req.session || req.session.role !== "admin") return res.redirect("/");

    try {
      const { title, author, tacGia, price, importPrice, stock, description } =
        req.body;

      let updateData = {
        title: title,
        author: author,
        tacGia: tacGia,
        price: price,
        importPrice: importPrice,
        stock: stock,
        description: description,
      };
      if (req.file) {
        updateData.image = "/images/" + req.file.filename;
      }
      await Book.findByIdAndUpdate(req.params.id, updateData);
      req.session.success = "Cập nhật thông tin sách thành công!";
      res.redirect("/admin/admin_books");
    } catch (error) {
      console.log(error);
      req.session.error = "Lỗi khi cập nhật sách!";
      res.redirect("/admin/admin_books");
    }
  },
);

router.post("/admin/admin_books/delete/:id", async (req, res) => {
  if (!req.session || req.session.role !== "admin") {
    return res.redirect("/");
  }

  try {
    await Book.findByIdAndDelete(req.params.id);
    req.session.success = "Đã xóa sách thành công!";
    res.redirect("/admin/admin_books");
  } catch (error) {
    console.log(error);
    req.session.error = "Lỗi khi xóa sách!";
    res.redirect("/admin/admin_books");
  }
});

// ==========================================
// ROUTE: CHATBOT AI (GEMINI) TƯ VẤN SÁCH
// ==========================================
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Dán mã API Key của bạn vào trong ngoặc kép bên dưới:
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // Bơm ngữ cảnh: Lấy danh sách sách CÒN HÀNG
    const Book = require("../models/Book"); // Gọi model Book
    const availableBooks = await Book.find({ stock: { $gt: 0 } });
    let bookListText = "";
    availableBooks.forEach((book) => {
      bookListText += `- ${book.title} (Thể loại: ${book.author}, Giá: ${book.price} VNĐ)\n`;
    });

    // Tạo lời nhắc cho AI
    const prompt = `
        Bạn là nhân viên tư vấn của nhà sách "Trạm Đọc".
        QUY TẮC: Chỉ giới thiệu sách có trong danh sách dưới đây. Nếu khách hỏi sách khác, hãy xin lỗi và gợi ý sách trong danh sách.
        Danh sách sách hiện có:
        ${bookListText}

        Khách hàng nói: "${userMessage}"
        Trạm Đọc trả lời:
        `;

    // Gọi AI xử lý

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Trả kết quả về giao diện
    res.json({ reply: response.text() });
  } catch (error) {
    console.error("Lỗi Chatbot:", error);
    res.json({ reply: "Dạ hệ thống đang bận, anh/chị thử lại sau nhé!" });
  }
});

module.exports = router;
