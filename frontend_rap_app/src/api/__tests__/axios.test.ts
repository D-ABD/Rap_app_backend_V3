import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it } from "vitest";

describe("Axios 1.13.1 basic behavior", () => {
  const mock = new AxiosMockAdapter(axios);

  afterEach(() => {
    mock.reset();
  });

  it("should perform a successful GET request", async () => {
    mock.onGet("/api/test").reply(200, { message: "ok" });

    const res = await axios.get("/api/test");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: "ok" });
  });

  it("should handle an error response correctly", async () => {
    mock.onGet("/api/error").reply(404, { error: "not found" });

    try {
      await axios.get("/api/error");
      throw new Error("Request should have failed");
    } catch (err: any) {
      expect(err.response.status).toBe(404);
      expect(err.response.data).toEqual({ error: "not found" });
    }
  });
});
