const { userModel } = require("../model/user");
const { delImg } = require("../middleware/deleteImage");

exports.updateUserName = async (req, res) => {
  try {
    const { id, username } = req.body;
    if (!id || !username) {
      res.status(400).send({
        status: "Error",
        message: "Body must not be empty. Need your id to update username.",
      });
    }

    const isUserExist = await userModel.findById(id);
    const isUsernameExist = await userModel.findOne({ username });

    if (isUsernameExist) {
      res.status(400).send({
        status: "Error",
        message: "Username already taken. Choose another username.",
      });
    }

    if (!isUserExist) {
      res.status(400).send({
        status: "Error",
        message: "Makesure you are registered",
      });
    }

    if (isUserExist && !isUsernameExist) {
      await userModel
        .findByIdAndUpdate(id, {
          username,
        })
        .then(() => {
          res.status(200).send({
            status: "Success",
            data: "Success update username",
          });
        });
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

    const isUserExist = await userModel.findById(id);

    if (!isUserExist) {
      res.status(400).send({
        status: "Error",
        message: "Makesure you are registered",
      });
    } else {
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
      message: "Failed to update username",
    });
  }
};
