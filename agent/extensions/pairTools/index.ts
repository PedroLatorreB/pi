import { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerPerformanceReviewerTool } from "./performanceReviewerTool";
import { registerSecurityReviewerTool } from "./securityReviewerTool";
import { registerGrammarReviewerTool } from "./grammarReviewerTool";

export default function (pi: ExtensionAPI) {
  registerPerformanceReviewerTool(pi);
  registerSecurityReviewerTool(pi);
  registerGrammarReviewerTool(pi);
}
