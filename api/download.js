const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");
 
const EXPECTED_PRICE_CENTS = 799; // $7.99 - sanity check against the Stripe session amount
 
module.exports = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
 
    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).send("Missing session_id.");
      return;
    }
 
    if (!process.env.STRIPE_SECRET_KEY) {
      res.status(500).send("Server is not configured with a Stripe secret key yet.");
      return;
    }
 
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
 
    if (!session || session.payment_status !== "paid") {
      res.status(403).send("We could not verify your payment. If you believe this is a mistake, contact ourtentcity@gmail.com.");
      return;
    }
 
    // Optional extra safety check: confirm the amount paid matches the book price.
    if (
      typeof session.amount_total === "number" &&
      session.amount_total < EXPECTED_PRICE_CENTS
    ) {
      res.status(403).send("Payment amount did not match the expected price.");
      return;
    }
 
    // The illustrated book lives inside this same "api" folder as book.pdf.
    // Files here are bundled with this function but are NOT publicly routable,
    // since only recognized function files (like this one) become live URLs.
    const pdfPath = path.join(__dirname, "book.pdf");
    const pdfBuffer = fs.readFileSync(pdfPath);
 
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="The-Boy-The-Dog-and-the-Tomato-Volume-1.pdf"'
    );
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong verifying your payment. Please try again or contact ourtentcity@gmail.com.");
  }
};
 
