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
const transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

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

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const isUserExist = await userModel.findOne({ email });
    if (!isUserExist) {
      bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
          const token = jwt.sign(
            { firstName, lastName, email, role: "Authenticated" },
            secret,
            {
              expiresIn: 60 * 60 * 24 * 2,
            }
          );

          const newUser = new userModel({
            firstName,
            lastName,
            email,
            password: hash,
            username: "",
            picture: "",
            token,
          });

          const saveUSer = await newUser.save();

          if (saveUSer) {
            const options = {
              from: process.env.MAIL_USER,
              to: email,
              subject: "Success Registration",
              html: mustache.render(template, {
                firstName: "Muhammad",
                lastName: "Zawawi",
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
              if (err) {
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
              if (err) {
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
