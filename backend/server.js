const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Jewellery Virtual Try-On API is running"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        application: "Jewellery Virtual Try-On"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});