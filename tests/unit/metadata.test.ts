import { mergeTrackingIntoMetadata, readTrackingFromMetadata } from "../../src/core/metadata.js";

describe("metadata", () => {
  it("reads tracking keys from metadata", () => {
    expect(
      readTrackingFromMetadata({
        datafast_session_id: "session-1",
        datafast_visitor_id: "visitor-1"
      })
    ).toEqual({
      sessionId: "session-1",
      visitorId: "visitor-1"
    });
  });

  it("preserves existing merchant metadata by default", () => {
    expect(
      mergeTrackingIntoMetadata(
        {
          datafast_visitor_id: "existing",
          merchant_key: "keep-me"
        },
        {
          visitorId: "from-cookie"
        }
      )
    ).toEqual({
      datafast_visitor_id: "existing",
      merchant_key: "keep-me"
    });
  });

  it("allows explicit tracking to override metadata keys", () => {
    expect(
      mergeTrackingIntoMetadata(
        {
          datafast_visitor_id: "from-metadata"
        },
        {
          visitorId: "from-explicit",
          sessionId: "session-explicit"
        },
        {
          preferTracking: true
        }
      )
    ).toEqual({
      datafast_session_id: "session-explicit",
      datafast_visitor_id: "from-explicit"
    });
  });
});
