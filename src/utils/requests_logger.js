export function requestLogger(req, res, next) {
  console.log("====================================");
  console.log(`${req.method} ${req.originalUrl}`);
  console.log("Headers:");
  console.log(req.headers);
  console.log("====================================");

  next();
}