const { userModel } = require("../model/user");
require("dotenv").config();
const bcrypt = require("bcrypt");
const saltRounds = 12;
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;
const Joi = require("joi");
const inputValidation = Joi.object({
  firstName: Joi.string().min(3),
  lastName: Joi.string().min(3),
  email: Joi.string().email().min(6),
  password: Joi.string().min(3),
  user: [Joi.string().min(3), Joi.string().email().min(6)],
  otp: Joi.number().min(6),
});

// package and config for sending email
const nodemailer = require("nodemailer");
const fs = require("fs");
const mustache = require("mustache");
const template = fs.readFileSync(__dirname + "/template.html", "utf8");
const templateOTP = fs.readFileSync(__dirname + "/OTP.html", "utf8");
const transporter = nodemailer.createTransport({
  service: "hotmail",
  // service is depends on webserver, hotmail means i am using outlook
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const { error } = inputValidation.validate({
      firstName,
      lastName,
      email,
      password,
    });

    if (error) {
      return res.send({
        status: "Error",
        message: error.details[0].message,
      });
    }

    const isUserExist = await userModel.findOne({ email });
    !isUserExist &&
      bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
          const newUser = new userModel({
            firstName,
            lastName,
            email,
            password: hash,
            username: "",
          });

          const saveUser = await newUser.save();

          const options = {
            from: process.env.MAIL_USER,
            to: email,
            subject: "Success Registration",
            html: mustache.render(template, {
              firstName: firstName,
              lastName: lastName,
              link: `${process.env.HOST_URL}/activation?p=${saveUser.id}`,
            }),
          };

          transporter.sendMail(options, async (err, info) => {
            !err &&
              res.status(200).send({
                status: "Success",
                message:
                  "Successfully register. Check your mailbox to activate your account.",
              });

            err &&
              res.send({
                status: "Error",
                message: {
                  error: err,
                  solution:
                    "Failed to sending activation email. Contact your administrator for help.",
                },
              });
          });
        });
      });

    isUserExist &&
      res.status(400).send({
        status: "Error",
        message: "Email already registered!",
      });
  } catch (error) {
    res.status(400).send({ status: "Error", message: error.message });
  }
};

exports.activation = async (req, res) => {
  try {
    const { p } = req.query;

    const isUserExist = await userModel.findByIdAndUpdate(p, {
      isActive: true,
    });

    isUserExist && res.status(200).redirect(process.env.FE_URL);
    !isUserExist &&
      res.status(400).send({
        status: "Error",
        message: "Your account failed to activate",
      });
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { user, password } = req.body;

    const { error } = await inputValidation.validate({ user, password });

    if (error) {
      return res.send({
        status: "Error",
        message: error.details[0].message.includes("types")
          ? "username length must be at least 3 characters long or email must be valid email."
          : error.details[0].message,
      });
    }

    const isUserExist = await userModel.findOne({ username: user });
    const isUserEmailExist = await userModel.findOne({ email: user });

    if (!isUserEmailExist && !isUserExist) {
      return res.status(400).send({
        status: "Error",
        message: "You're not registered",
      });
    }

    const token = jwt.sign(
      {
        id: isUserExist ? isUserExist.id : isUserEmailExist.id,
        firstName: isUserExist
          ? isUserExist.firstName
          : isUserEmailExist.firstName,
        lastName: isUserExist
          ? isUserExist.lastName
          : isUserEmailExist.lastName,
        email: isUserExist ? isUserExist.email : isUserEmailExist.email,
        role: isUserExist ? isUserExist.role : isUserEmailExist.role,
      },
      secret,
      {
        expiresIn: 60 * 60 * 24 * 2,
      }
    );

    const data = {
      token,
      id: isUserExist ? isUserExist.id : isUserEmailExist.id,
      firstName: isUserExist
        ? isUserExist.firstName
        : isUserEmailExist.firstName,
      lastName: isUserExist ? isUserExist.lastName : isUserEmailExist.lastName,
      email: isUserExist ? isUserExist.email : isUserEmailExist.email,
      role: isUserExist ? isUserExist.role : isUserEmailExist.role,
      username: isUserExist ? isUserExist.username : isUserEmailExist.username,
      picture: isUserExist ? isUserExist.picture : isUserEmailExist.picture,
      isActive: isUserExist ? isUserExist.isActive : isUserEmailExist.isActive,
    };

    isUserExist &&
      isUserExist.isActive == true &&
      bcrypt.compare(
        password,
        isUserExist.password,
        async function (err, result) {
          (!result || err) &&
            res.status(400).send({
              status: "Error",
              message: "Email or Username or Password incorrect",
            });

          result &&
            (await userModel.findByIdAndUpdate(isUserExist._id, {
              token: token,
            })) &&
            res.status(200).send({
              status: "Success",
              data,
            });
        }
      );
    isUserExist &&
      isUserExist.isActive == false &&
      res.status(400).send({
        status: "Error",
        message: "Activate your account first. Open your email to activate.",
      });

    isUserEmailExist &&
      isUserEmailExist.isActive == true &&
      bcrypt.compare(
        password,
        isUserEmailExist.password,
        async function (err, result) {
          (err || !result) &&
            res.status(400).send({
              status: "Error",
              message: "Email or Username or Password incorrect",
            });

          result &&
            (await userModel.findByIdAndUpdate(isUserEmailExist._id, {
              token,
            })) &&
            res.status(200).send({
              status: "Success",
              data,
            });
        }
      );

    isUserEmailExist &&
      isUserEmailExist.isActive == false &&
      res.status(400).send({
        status: "Error",
        message: "Activate your account first. Open your email to activate.",
      });
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: "Login failed",
      error: error.message,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { id } = req.body;

    await userModel
      .findByIdAndUpdate(id, {
        token: "",
      })
      .then(() => {
        res
          .status(200)
          .send({ status: "Success", message: "Successfully logout" });
      });
  } catch (error) {
    res.status(400).send({ status: "Error", message: "Failed to logout" });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = inputValidation.validate({
      email,
    });

    if (error) {
      return res.send({
        status: "Error",
        message: error.details[0].message,
      });
    }
    function getRandomInt() {
      return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    }

    const otp = getRandomInt();

    const isUserExist = await userModel.findOne({ email });

    !isUserExist &&
      res.status(400).send({
        status: "Error",
        message: "Make sure you already registered",
      });

    const options = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "OTP for reset password",
      html: mustache.render(templateOTP, {
        firstName: isUserExist?.firstName,
        lastName: isUserExist?.lastName,
        otp: otp,
      }),
    };

    isUserExist &&
      (await userModel.findByIdAndUpdate(isUserExist?.id, {
        otp,
      })) &&
      transporter.sendMail(options, (err, info) => {
        err &&
          res.status(400).send({
            status: "Error",
            message: {
              error: err,
              solution:
                "Failed to sending email. Contact your administrator for help.",
            },
          });

        !err &&
          res.status(200).send({
            status: "Success",
            message:
              "Yor OTP has been sent. Check your email. If not exist in inbox search on spam.",
          });
      });
  } catch (error) {
    res.status(400).send({ status: "Error", message: "Failed to send OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const { error } = inputValidation.validate({
      email,
    });

    if (error) {
      return res.send({
        status: "Error",
        message: error.details[0].message,
      });
    }

    const isUserExist = await userModel.findOne({ email });

    if (isUserExist) {
      otp !== isUserExist.otp &&
        (await userModel.findByIdAndUpdate(isUserExist.id, {
          token: "",
          otp: 101010,
        })) &&
        res.status(400).send({
          status: "Invalid",
          message: "Your OTP is expires. Try request new OTP.",
        });

      otp === 101010 &&
        res.status(400).send({
          status: "Error",
          message: "Make sure you succeed request OTP",
        });

      if (otp === isUserExist.otp) {
        const updateOTP = await userModel.findByIdAndUpdate(isUserExist.id, {
          otp: 101010,
          token: "",
        });

        updateOTP &&
          bcrypt.genSalt(saltRounds, function (err, salt) {
            bcrypt.hash(password, salt, async function (err, hash) {
              const updatePass = await userModel.findByIdAndUpdate(
                isUserExist._id,
                {
                  password: hash,
                }
              );
              updatePass &&
                res.status(200).send({
                  status: "Success",
                  message:
                    "Your password successfully updated. Now you can login with your new password.",
                });

              !updatePass &&
                res.status(400).send({
                  status: "Error",
                  message: "Failed to reset password",
                });
            });
          });
      }
    }
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: "Failed to reset password",
    });
  }
};

exports.verify = async (req, res) => {
  try {
    const { token } = req.body;

    jwt.verify(token, secret, async (err, decoded) => {
      err &&
        res.status(400).send({
          message: "Invalid Token. Relogin, please!",
        });

      if (!err) {
        const isUserExist = await userModel.findById(decoded.id);

        !isUserExist &&
          res.status(400).send({
            status: "Error",
            message: "Makesure you are registered",
          });

        token === isUserExist.token &&
          res.status(200).send({
            status: "Valid",
            message: "Your token still valid",
          });

        token !== isUserExist.token &&
          (await userModel.findByIdAndUpdate(decoded.id, {
            token: "",
          })) &&
          res.status(500).send({
            status: "Error",
            message: "Your token is invalid. Relogin, please.",
          });
      }
    });
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: error.message,
    });
  }
};
