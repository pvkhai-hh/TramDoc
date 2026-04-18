const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Đăng ký
router.get("/dangky", (req, res) => {
  res.render("dangnhap", { active: "register" });
});

router.get("/dangnhap", (req, res) => {
  res.render("dangnhap", { active: "login" });
});

router.post("/dangky", async (req, res) => {
  try {
    const { HoVaTen, TenDangNhap, Email, MatKhau } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const newUser = new User({
      fullname: HoVaTen,
      username: TenDangNhap,
      email: Email,
      password: bcrypt.hashSync(MatKhau, salt),
    });

    await newUser.save();
    req.session.success = "Đăng ký tài khoản thành công! Vui lòng đăng nhập.";
    res.redirect("/dangnhap");
  } catch (error) {
    console.log(error);
    req.session.error = "Lỗi: Tên đăng nhập hoặc Email đã tồn tại!";
    res.redirect("/dangnhap");
  }
});

// Đăng nhập
router.post("/dangnhap", async (req, res) => {
  try {
    const { TenDangNhap, MatKhau } = req.body;
    const user = await User.findOne({ username: TenDangNhap });

    if (user && bcrypt.compareSync(MatKhau, user.password)) {
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.fullname = user.fullname; 
      req.session.role = user.role;

      req.session.success = "Chào mừng " + user.fullname + " đến Trạm Đọc!";
      return res.redirect("/");
    } else {
      req.session.error = "Sai tên đăng nhập hoặc mật khẩu!";
      res.redirect("/dangnhap");
    }
  } catch (error) {
    req.session.error = "Có lỗi xảy ra, vui lòng thử lại!";
    res.redirect("/dangnhap");
  }
});

//Đăng xuất
router.get("/dangxuat", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;
