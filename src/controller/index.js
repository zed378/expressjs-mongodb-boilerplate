exports.getMessage = async (req, res) => {
  try {
    res.send({
      status: "Success",
      message: "Message created successfully",
    });
  } catch (error) {
    res.send({
      status: "Failed",
      message: "Server Error, Can't Get The Data",
    });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const { message } = req.body;

    res.send({
      status: "Success",
      data: message,
      message: "Message success create",
    });
  } catch (error) {
    res.send({
      status: "Failed",
      message: "Server Error, Can't Add The Data",
    });
  }
};
