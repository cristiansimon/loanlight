import { app } from "./api/app";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Loan extractor listening on port ${port}`);
});
