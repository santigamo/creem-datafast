import * as browserModule from "creem-datafast/client";
import * as expressModule from "creem-datafast/express";
import * as nextModule from "creem-datafast/next";
import * as rootModule from "creem-datafast";

function assertFunction(moduleName, moduleValue, exportName) {
  if (typeof moduleValue[exportName] !== "function") {
    throw new Error(`${moduleName} is missing ${exportName}.`);
  }
}

assertFunction("creem-datafast", rootModule, "createCreemDataFast");
assertFunction("creem-datafast/next", nextModule, "createNextWebhookHandler");
assertFunction("creem-datafast/express", expressModule, "createExpressWebhookHandler");
assertFunction("creem-datafast/client", browserModule, "getDataFastTracking");
