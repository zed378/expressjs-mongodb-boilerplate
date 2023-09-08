const { userModel } = require("../model/user");
const { delImg } = require("../middleware/deleteImage");
const Joi = require("joi");
const inputValidation = Joi.object({
  id: Joi.string().min(3),
  username: Joi.string().min(3),
  picture: Joi.string().min(3),
});

exports.updateUserName = async (req, res) => {
  try {
    const { id, username } = req.body;

    const { error } = inputValidation.validate({
      id,
      username,
    });

    if (error) {
      return res.send({
        status: "Error",
        message: error.details[0].message,
      });
    }

    const isUserExist = await userModel.findById(id);
    const isUsernameExist = await userModel.findOne({ username });

    isUsernameExist &&
      res.status(400).send({
        status: "Error",
        message: "Username already taken. Choose another username.",
      });

    !isUserExist &&
      res.status(400).send({
        status: "Error",
        message: "Makesure you are registered",
      });

    isUserExist &&
      !isUsernameExist &&
      (await userModel
        .findByIdAndUpdate(id, {
          username,
        })
        .then(() => {
          res.status(200).send({
            status: "Success",
            data: "Success update username",
          });
        }));
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

    const { error } = inputValidation.validate({
      id,
      picture,
    });

    if (error) {
      return res.send({
        status: "Error",
        message: error.details[0].message,
      });
    }

    const isUserExist = await userModel.findById(id);
    !isUserExist &&
      res.status(400).send({
        status: "Error",
        message: "Makesure you are registered",
      });

    if (isUserExist) {
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
    }
  } catch (error) {
    res.status(400).send({
      status: "Error",
      message: "Failed to update profile",
    });
  }
};
