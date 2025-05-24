const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // accessible dans les routes suivantes
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
};
