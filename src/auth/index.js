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
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const isUserExist = await userModel.findOne({ email });
    if (!isUserExist) {
      bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
          const newUser = new userModel({
            firstName,
            lastName,
            email,
            password: hash,
            username: "",
            picture: "",
          });

          const saveUSer = await newUser.save();

          if (saveUSer) {
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

            transporter.sendMail(options, (err, info) => {
              if (err) {
                res.send({
                  status: "Error",
                  message: {
                    error: err,
                    solution: "Contact your administrator for help",
                  },
                });
              } else {
                res.status(200).send({
                  status: "Success",
                  message:
                    "Successfully register. Check your mailbox to activate your account.",
                });
              }
            });
          }
        });
      });
    } else {
      res.status(400).send({
        status: "Error",
        message: "Email already registered!",
      });
    }
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

    if (isUserExist) {
      res.status(200).redirect(process.env.FE_URL);
    } else {
      res.status(400).send({
        status: "Error",
        message: "Your account failed to activate",
      });
    }
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

    if (isUserExist) {
      isUserExist.isActive === true
        ? bcrypt.compare(
            password,
            isUserExist.password,
            async function (err, result) {
              if (!result || err) {
                res.status(400).send({
                  status: "Error",
                  message: "Email or Username or Password incorrect",
                });
              }

              if (result) {
                const token = jwt.sign(
                  {
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

                await userModel.findByIdAndUpdate(isUserExist.id, {
                  token,
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
          )
        : res.status(400).send({
            status: "Error",
            message:
              "Activate your account first. Open your email to activate.",
          });
    } else if (isUserEmailExist) {
      isUserEmailExist.isActive === true
        ? bcrypt.compare(
            password,
            isUserEmailExist.password,
            async function (err, result) {
              if (err || !result) {
                res.status(400).send({
                  status: "Error",
                  message: "Email or Username or Password incorrect",
                });
              }

              if (result) {
                const token = jwt.sign(
                  {
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

                await userModel.findByIdAndUpdate(isUserExist?._id, {
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
          )
        : res.status(400).send({
            status: "Error",
            message:
              "Activate your account first. Open your email to activate.",
          });
    } else if (!isUserEmailExist || !isUserExist) {
      res.status(400).send({
        status: "Error",
        message: "You're not registered",
      });
    }
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
      const token = jwt.sign(
        {
          firstName: isUserExist.firstName,
          lastName: isUserExist.lastName,
          email: isUserExist.email,
          role: isUserExist.role,
        },
        secret,
        {
          expiresIn: 60 * 5,
        }
      );

      function getRandomInt() {
        return Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
      }

      const otp = getRandomInt();

      await userModel.findOneAndUpdate(isUserExist._id, {
        token,
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
              solution: "Contact your administrator for help",
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
      jwt.verify(isUserExist.token, secret, async (err, decoded) => {
        if (!err) {
          if (otp === 101010) {
            res.status(400).send({
              status: "Error",
              message: "Make sure you succeed request OTP",
            });
          } else if (otp === isUserExist.otp) {
            const updateOTP = await userModel.findByIdAndUpdate(
              isUserExist._id,
              {
                otp: 101010,
                token: "",
              }
            );

            if (updateOTP) {
              bcrypt.genSalt(saltRounds, function (err, salt) {
                bcrypt.hash(password, salt, async function (err, hash) {
                  const updatePass = await userModel.findByIdAndUpdate(
                    isUserExist._id,
                    {
                      password: hash,
                    }
                  );

                  if (updatePass) {
                    res.status(200).send({
                      status: "Success",
                      message:
                        "Your password successfully updated. Now you can login with your new password.",
                    });
                  } else {
                    res.status(400).send({
                      status: "Error",
                      message: "Failed to reset password",
                    });
                  }
                });
              });
            } else {
              res.status(400).send({
                status: "Error",
                message: "Failed to reset token and otp",
              });
            }
          }
        } else if (otp !== isUserExist.otp) {
          await userModel.findByIdAndUpdate(isUserExist._id, {
            token: "",
            otp: 101010,
          });
          res.status(400).send({
            status: "Invalid",
            message: "Your OTP is expires. Try request new OTP.",
          });
        }
      });
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
    const { token, id } = req.body;
    const isUserExist = await userModel.findById(id);

    if (!isUserExist) {
      res.status(400).send({
        status: "Error",
        message: "Makesure you are registered",
      });
    } else {
      if (token != isUserExist.token) {
        await userModel.findByIdAndUpdate(id, {
          token: "",
        });
        res.status(500).send({
          status: "Error",
          message: "Your token is invalid",
        });
      } else {
        jwt.verify(token, secret, async function (err, decoded) {
          !err
            ? res.status(200).send({
                status: "Valid",
                message: "Your token still valid",
                decoded,
              })
            : res.status(400).send({
                status: "Invalid",
                message: "Your token is invalid",
              });

          err &&
            (await userModel.findByIdAndUpdate(id, {
              token: "",
            }));
        });
      }
    }
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: error.message,
    });
  }
};
