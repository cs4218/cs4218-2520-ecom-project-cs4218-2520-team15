# Stress Tests - Tester Notes

## Setup on Local Machine

1. In your environment file, define the variable:

   ```
   MONGO_TEST_URL = mongodb+srv://<username>:<password>@<host>/<db>?<options>
   ```

   where `<db>` is different from your development/product database; default is "test" if unspecified ([source](https://www.mongodb.com/docs/manual/reference/connection-string-formats/#connection-string-database-options)).

2. Before running the test script, start the server with the following command:

   ```
   USE_TEST_DB=true node server.js
   ```

## Troubleshooting Test Scripts

- You may get an error when running the test scripts normally (i.e. `k6 run <file>`).
  - Some of the test scripts uses the `xk6-faker` extension.
  - The k6 documentation states that official extensions will be resolved on import
    ([source](https://grafana.com/docs/k6/latest/extensions/run)).
  - However, it does not seem to always work.
- If so, use the `k6` binary in the `__tests__/performance/stress` directory.
  - Assuming you are in the root directory.
  - Run the test script with:
    ```
    ./__tests__/performance/stress/k6 run <file>
    ```
