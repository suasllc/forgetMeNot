const express = require("express");
const router = express.Router();
const { Task, User, List } = require("../db/models");
const { asyncHandler } = require("../routes/utils");

router.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    console.log("HEY", req.body);
    const { name } = req.body;
    console.log(name);
    const userId = req.session.auth.userId;
    const list = await List.findOne({ where: { userId, name: "Inbox" } });
    const task = await Task.create({
      name,
      userId,
      listId: list.id,
      completed: false,
    });
    const tasks = await Task.findAll({ where: { userId, listId: list.id } });
    res.json({ tasks });
  })
);

module.exports = router;