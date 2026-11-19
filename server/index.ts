import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config({ path: "server/.env" });

const PORT = process.env.PORT || 5000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

