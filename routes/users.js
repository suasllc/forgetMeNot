const { decodeBase64 } = require("bcryptjs");
var express = require("express");

var router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db/models");
const { check, validationResult } = require("express-validator");
const { csrfProtection, asyncHandler } = require("./utils");
const { loginUser, logoutUser } = require("../auth");

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

router.get("/login", csrfProtection, (req, res) => {
  res.render("log-in", {
    title: "Login",
    csrfToken: req.csrfToken(),
  });
});

const userValidators = [
  check("firstName")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for First Name")
    .isLength({ max: 30 })
    .withMessage("First Name must not be more than 30 characters long"),
  check("lastName")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Last Name")
    .isLength({ max: 30 })
    .withMessage("Last Name must not be more than 30 characters long"),
  check("email")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Email Address")
    .isLength({ max: 50 })
    .withMessage("Email Address must not be more than 50 characters long")
    .isEmail()
    .withMessage("Email Address is not a valid email")
    .custom((value) => {
      return db.User.findOne({ where: { email: value } }).then((user) => {
        if (user) {
          return Promise.reject(
            "The provided Email Address is already in use by another account"
          );
        }
      });
    }),
  check("password")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Password")
    .isLength({ min: 6, max: 50 })
    .withMessage(
      "Password must not be more than 50 characters long and have at least 6 characters"
    ),
  check("confirmPassword")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a value for Confirm Password")
    .isLength({ min: 6, max: 50 })
    .withMessage(
      "Password must not be more than 50 characters long and have at least 6 characters"
    )
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Confirm Password does not match Password");
      }
      return true;
    }),
];

router.get("/signup", csrfProtection, (req, res) => {
  const user = db.User.build();
  res.render("sign-up", {
    title: "Sign Up",
    style: "./stylesheets/sign-up.css",
    user,
    csrfToken: req.csrfToken(),
  });
});

router.post(
  "/signup",
  csrfProtection,
  userValidators,
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName, password } = req.body;
    const user = db.User.build({
      email,
      firstName,
      lastName,
    });

    const validatorErrors = validationResult(req);

    if (validatorErrors.isEmpty()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.hashedPassword = hashedPassword;
      await user.save();
      await db.List.create({
        name: "Inbox",
        userId: user.id,
      });
      res.redirect("/");
    } else {
      const errors = validatorErrors.array().map((error) => error.msg);
      res.render("sign-up", {
        title: "Sign Up",
        style: "./stylesheets/sign-up.css",
        user,
        errors,
        csrfToken: req.csrfToken(),
      });
    }
  })
);

const loginValidators = [
  check("email")
    .exists({ checkFalsy: true })
    .withMessage("Please provide Email Address"),
  check("password")
    .exists({ checkFalsy: true })
    .withMessage("Please provide a valid Password"),
];

router.post(
  "/login",
  csrfProtection,
  loginValidators,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    let errors = [];
    const validationErrors = validationResult(req);

    if (validationErrors.isEmpty()) {
      const user = await db.User.findOne({ where: { email } });

      if (user !== null) {
        const passwordMatch = await bcrypt.compare(
          password,
          user.hashedPassword.toString()
        );

        if (passwordMatch) {
          loginUser(req, res, user);
          return res.redirect("/");
        }
      }

      errors.push(
        "Invalid credentials. Please doublecheck email address and password"
      );
    } else {
      errors = validationErrors.array().map((error) => error.msg);
    }

    res.render("log-in", {
      title: "Login",
      email,
      errors,
      csrfToken: req.csrfToken(),
    });
  })
);

module.exports = router;
