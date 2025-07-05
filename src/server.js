require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 3099;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Unofficial API!" });
});

app.use("/api", routes);

app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
