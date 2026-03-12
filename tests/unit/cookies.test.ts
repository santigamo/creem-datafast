import { parseCookieHeader, readTrackingFromCookieHeader } from "../../src/core/cookies.js";

describe("cookies", () => {
  it("parses cookie headers with spaces", () => {
    expect(parseCookieHeader("foo=bar; datafast_visitor_id= visitor-1 ; datafast_session_id=session-1")).toEqual({
      foo: "bar",
      datafast_session_id: "session-1",
      datafast_visitor_id: "visitor-1"
    });
  });

  it("returns empty tracking when cookies are missing", () => {
    expect(readTrackingFromCookieHeader("foo=bar")).toEqual({});
  });
});
