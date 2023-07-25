const { userModel } = require("../model/user");
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET;
const fs = require("fs");
const path = require("path");

exports.updateUserName = async (req, res) => {
  try {
    const { id, username } = req.body;
    if (!id || !username) {
      res.status(400).send({
        status: "Error",
        message: "body must not be empty",
      });
    }

    const bearer = req.headers.authorization;
    const token = bearer.split(" ")[1];

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
            ? await userModel
                .findByIdAndUpdate(id, {
                  username,
                })
                .then(() => {
                  res.status(200).send({
                    status: "Success",
                    data: "Success update username",
                  });
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
      message: "Failed to update username",
    });
  }
};

exports.updatePict = async (req, res) => {
  try {
    const { id } = req.body;
    const picture = req.file.filename;

    const bearer = req.headers.authorization;
    const token = bearer.split(" ")[1];

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
        jwt.verify(token, secret, async (err, decoded) => {
          if (!err) {
            delImg(isUserExist.picture);
            await userModel
              .findByIdAndUpdate(id, {
                picture,
              })
              .then(() => {
                res.status(200).send({
                  status: "Success",
                  message: "Success update profile picture",
                });
              });
          } else {
            await userModel.findByIdAndUpdate(id, {
              token: "",
            });
            res.status(400).send({
              status: "Invalid",
              message: "Your token is invalid",
            });
          }
        });
      }
    }
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: "Failed to update username",
    });
  }
};

const delImg = (filePath) => {
  if (filePath !== "default.svg") {
    filePath = path.join(__dirname, "../../uploads/", filePath);

    fs.unlink(filePath, (err) => {
      if (err) throw err;
    });
  }
};
