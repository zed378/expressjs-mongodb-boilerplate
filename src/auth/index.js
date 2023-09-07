const { userModel } = require("../model/user");
require("dotenv").config();
const bcrypt = require("bcrypt");
const saltRounds = 12;
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;

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

          const options = {
            from: process.env.MAIL_USER,
            to: email,
            subject: "Success Registration",
            html: mustache.render(template, {
              firstName: firstName,
              lastName: lastName,
              link: `${process.env.HOST_URL}/activation?p=${saveUSer.id}`,
            }),
          };

          transporter.sendMail(options, async (err, info) => {
            err &&
              res.send({
                status: "Error",
                message: {
                  error: err,
                  solution:
                    "Failed to sending email. Contact your administrator for help.",
                },
              });

            !err &&
              (await newUser.save().then(() =>
                res.status(200).send({
                  status: "Success",
                  message:
                    "Successfully register. Check your mailbox to activate your account.",
                })
              ));
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
    const isUserExist = await userModel.findOne({ username: user });
    const isUserEmailExist = await userModel.findOne({ email: user });

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

          if (result) {
            const token = jwt.sign(
              {
                id: isUserExist.id,
                firstName: isUserExist.firstName,
                lastName: isUserExist.lastName,
                email: isUserExist.email,
                role: isUserExist.role,
              },
              secret,
              {
                expiresIn: 60 * 60 * 24 * 2,
              }
            );

            await userModel.findByIdAndUpdate(isUserExist._id, {
              token: token,
            });

            res.status(200).send({
              status: "Success",
              data: {
                token,
                id: isUserExist._id,
                firstName: isUserExist.firstName,
                lastName: isUserExist.lastName,
                email: isUserExist.email,
                username: isUserExist.username,
                picture: isUserExist.picture,
                isActive: isUserExist.isActive,
              },
            });
          }
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

          if (result) {
            const token = jwt.sign(
              {
                id: isUserEmailExist.id,
                firstName: isUserEmailExist.firstName,
                lastName: isUserEmailExist.lastName,
                email: isUserEmailExist.email,
                role: isUserEmailExist.role,
              },
              secret,
              {
                expiresIn: 60 * 60 * 24 * 2,
              }
            );

            await userModel.findByIdAndUpdate(isUserEmailExist._id, {
              token,
            });

            res.status(200).send({
              status: "Success",
              data: {
                token,
                id: isUserEmailExist.id,
                firstName: isUserEmailExist.firstName,
                lastName: isUserEmailExist.lastName,
                email: isUserEmailExist.email,
                username: isUserEmailExist.username,
                picture: isUserEmailExist.picture,
              },
            });
          }
        }
      );

    isUserEmailExist &&
      isUserEmailExist.isActive == false &&
      res.status(400).send({
        status: "Error",
        message: "Activate your account first. Open your email to activate.",
      });

    !isUserEmailExist &&
      !isUserExist &&
      res.status(400).send({
        status: "Error",
        message: "You're not registered",
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

    const isUserExist = await userModel.findOne({ email });

    if (!isUserExist) {
      res.status(400).send({
        status: "Error",
        message: "Make sure you already registered",
      });
    } else {
      function getRandomInt() {
        return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
      }

      const otp = getRandomInt();

      await userModel.findOneAndUpdate(isUserExist._id, {
        otp,
      });

      const options = {
        from: process.env.MAIL_USER,
        to: email,
        subject: "OTP for reset password",
        html: mustache.render(templateOTP, {
          firstName: isUserExist.firstName,
          lastName: isUserExist.lastName,
          otp: otp,
        }),
      };

      transporter.sendMail(options, (err, info) => {
        if (err) {
          res.send({
            status: "Error",
            message: {
              error: err,
              solution:
                "Failed to sending email. Contact your administrator for help.",
            },
          });
        } else {
          res.status(200).send({
            status: "Success",
            message:
              "Yor OTP has been sent. Check your email. If not exist in inbox search on spam.",
          });
        }
      });
    }
  } catch (error) {
    res.status(400).send({ status: "Error", message: "Failed to send OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    const isUserExist = await userModel.findOne({ email });

    if (isUserExist) {
      if (otp !== isUserExist.otp) {
        await userModel.findByIdAndUpdate(isUserExist._id, {
          token: "",
          otp: 101010,
        });
        res.status(400).send({
          status: "Invalid",
          message: "Your OTP is expires. Try request new OTP.",
        });
      }

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
    const authHeader = req.header("Authorization");
    const token = authHeader && authHeader.split(" ")[1];
    const isUserExist = await userModel.findById(req.user.id);

    !isUserExist &&
      res.status(400).send({
        status: "Error",
        message: "Makesure you are registered",
      });

    if (token !== isUserExist.token) {
      await userModel.findByIdAndUpdate(req.user.id, {
        token: "",
      });
      res.status(500).send({
        status: "Error",
        message: "Your token is invalid. Relogin, please.",
      });
    } else {
      res.status(200).send({
        status: "Valid",
        message: "Your token still valid",
      });
    }
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: error.message,
    });
  }
};
