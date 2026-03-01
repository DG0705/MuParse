const { extractSem1 } = require("../utils/isolated/sem1Processor");
const { extractSem2 } = require("../utils/isolated/sem2Processor");

const handleIsolatedExtraction = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File required" });
    }

    const { semester } = req.body;
    let data = [];

    if (semester === "1") {
      data = await extractSem1(req.file.buffer);
    } else if (semester === "2") {
      data = await extractSem2(req.file.buffer);
    } else {
      return res.status(400).json({ error: "Invalid semester" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Extraction error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = { handleIsolatedExtraction };
